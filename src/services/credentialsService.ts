/**
 * ============================================
 * SERVICIO DE CREDENCIALES DEL SISTEMA
 * ============================================
 * 
 * Obtiene credenciales almacenadas en la tabla api_auth_tokens
 * de Supabase PQNC_AI de forma SEGURA.
 * 
 * 📋 Tabla: api_auth_tokens (PQNC_AI)
 * 📍 Ubicación: glsmifhkoaifvaegsozd.supabase.co
 * 
 * ⚠️ ARQUITECTURA DE SEGURIDAD (2026-01-16):
 * - Tabla `api_auth_tokens` tiene RLS restrictivo (solo service_role)
 * - Vista `api_auth_tokens_safe` para listar metadatos (sin token_value)
 * - Función RPC `get_credential_value(module, key)` para obtener tokens
 * - RPC requiere usuario autenticado (JWT válido)
 * 
 * 🔗 Usado por:
 * - src/components/admin/ApiAuthTokensManager.tsx
 * - src/services/apiTokensService.ts
 * - src/services/n8nService.ts
 * - src/services/dynamicsLeadService.ts
 * - src/services/elevenLabsService.ts
 */

import { supabaseSystemUI } from '../config/supabaseSystemUI';

// ============================================
// INTERFACES
// ============================================

export interface ApiAuthToken {
  id: string;
  module_name: string;
  service_name?: string;
  token_key: string;
  token_type?: string;
  token_value: string;
  description?: string;
  endpoint_url?: string;
  is_active: boolean;
  version?: number;
  created_at: string;
  updated_at: string;
}

export interface ApiAuthTokenSafe {
  id: string;
  module_name: string;
  token_key: string;
  description?: string;
  is_active: boolean;
  has_value: boolean;
  token_length: number;
  created_at: string;
  updated_at: string;
}

export interface CredentialCache {
  [key: string]: string;
}

// ============================================
// SERVICIO DE CREDENCIALES
// ============================================

class CredentialsService {
  private cache: CredentialCache = {};
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Limpia el cache de credenciales (útil cuando se actualizan)
   */
  clearCache(): void {
    this.cache = {};
    this.cacheExpiry = 0;
    console.log('🔄 [CredentialsService] Cache limpiado');
  }

  /**
   * Obtiene el cliente Supabase disponible
   */
  private getClient() {
    if (!supabaseSystemUI) {
      console.error('❌ [CredentialsService] No hay cliente Supabase disponible');
      return null;
    }
    return supabaseSystemUI;
  }

  /**
   * Obtiene una credencial usando la función RPC segura
   * ⚠️ REQUIERE usuario autenticado (JWT válido)
   */
  async getCredentialByModule(
    moduleName: string,
    tokenKey: string
  ): Promise<string | null> {
    const cacheKey = `${moduleName}:${tokenKey}`;
    
    // Verificar cache
    if (this.cache[cacheKey] && Date.now() < this.cacheExpiry) {
      return this.cache[cacheKey];
    }

    const client = this.getClient();
    if (!client) return null;

    try {
      // Usar función RPC segura (requiere autenticación)
      const { data, error } = await client.rpc('get_credential_value', {
        p_module_name: moduleName,
        p_token_key: tokenKey
      });

      if (error) {
        // Si el error es de autenticación, log silencioso
        if (error.message?.includes('auth') || error.code === 'PGRST301') {
          console.warn(`⚠️ [CredentialsService] Usuario no autenticado, credencial ${moduleName}.${tokenKey} no disponible`);
        } else {
          console.warn(`⚠️ Credencial no encontrada: ${moduleName}.${tokenKey}`, error.message);
        }
        return null;
      }

      if (!data) {
        // No logear warning si es null (usuario no autenticado o credencial no existe)
        return null;
      }

      // Guardar en cache
      this.cache[cacheKey] = data;
      this.cacheExpiry = Date.now() + this.CACHE_TTL;

      return data;
    } catch (err) {
      console.error(`❌ Error obteniendo credencial ${moduleName}.${tokenKey}:`, err);
      return null;
    }
  }

  /**
   * Obtiene una credencial específica por su token_key (busca en todos los módulos)
   */
  async getCredential(tokenKey: string): Promise<string | null> {
    // Primero verificar en cache por cualquier módulo
    for (const key of Object.keys(this.cache)) {
      if (key.endsWith(`:${tokenKey}`) && Date.now() < this.cacheExpiry) {
        return this.cache[key];
      }
    }

    // Buscar el módulo en la vista segura
    const client = this.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('api_auth_tokens_safe')
        .select('module_name')
        .eq('token_key', tokenKey)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      // Ahora obtener el valor usando RPC
      return await this.getCredentialByModule(data.module_name, tokenKey);
    } catch (err) {
      console.error(`❌ Error obteniendo credencial ${tokenKey}:`, err);
      return null;
    }
  }

  /**
   * Obtiene todas las credenciales de un módulo
   * ⚠️ REQUIERE usuario autenticado
   */
  async getModuleCredentials(moduleName: string): Promise<Record<string, string>> {
    const client = this.getClient();
    if (!client) {
      console.error(`❌ [CredentialsService] No hay cliente Supabase disponible`);
      return {};
    }

    try {
      // Primero obtener las keys del módulo desde la vista segura
      const { data: keysData, error: keysError } = await client
        .from('api_auth_tokens_safe')
        .select('token_key')
        .eq('module_name', moduleName)
        .eq('is_active', true);

      if (keysError || !keysData || keysData.length === 0) {
        return {};
      }

      // Obtener cada credencial usando RPC
      const result: Record<string, string> = {};
      for (const { token_key } of keysData) {
        const value = await this.getCredentialByModule(moduleName, token_key);
        if (value) {
          result[token_key] = value;
        }
      }

      return result;
    } catch (err) {
      console.error(`❌ [CredentialsService] Error obteniendo credenciales:`, err);
      return {};
    }
  }

  /**
   * Obtiene las credenciales de N8N
   */
  async getN8NCredentials(): Promise<{
    apiKey: string;
    baseUrl: string;
    mcpApiKey: string;
  }> {
    const creds = await this.getModuleCredentials('N8N');
    return {
      apiKey: creds['API_KEY'] || '',
      baseUrl: creds['BASE_URL'] || 'https://primary-dev-d75a.up.railway.app',
      mcpApiKey: creds['MCP_API_KEY'] || '',
    };
  }

  /**
   * Obtiene las credenciales de Dynamics CRM
   */
  async getDynamicsWebhookCredentials(): Promise<{
    token: string;
    getLeadUrl: string;
    reasignarUrl: string;
  }> {
    const creds = await this.getModuleCredentials('Dynamics');
    
    return {
      token: creds['TOKEN'] || '',
      getLeadUrl: creds['GET_LEAD_URL'] || 'https://primary-dev-d75a.up.railway.app/webhook/lead-info',
      reasignarUrl: creds['REASIGNAR_URL'] || 'https://primary-dev-d75a.up.railway.app/webhook/reasignar-prospecto',
    };
  }

  /**
   * Lista todos los módulos con credenciales configuradas
   * (Usa vista segura - accesible sin autenticación)
   */
  async listModules(): Promise<string[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('api_auth_tokens_safe')
        .select('module_name')
        .eq('is_active', true);

      if (error || !data) return [];

      // Obtener valores únicos
      return [...new Set(data.map((d) => d.module_name))];
    } catch (err) {
      console.error('❌ Error listando módulos:', err);
      return [];
    }
  }

  /**
   * Lista todas las credenciales (solo metadata, sin valores)
   * (Usa vista segura - accesible sin autenticación)
   */
  async listAllCredentials(): Promise<ApiAuthTokenSafe[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('api_auth_tokens_safe')
        .select('*')
        .order('module_name');

      if (error || !data) return [];
      return data as ApiAuthTokenSafe[];
    } catch (err) {
      console.error('❌ Error listando credenciales:', err);
      return [];
    }
  }

  /**
   * Verifica si un módulo tiene credenciales configuradas
   * (Usa vista segura)
   */
  async hasCredentials(moduleName: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const { data, error } = await client
        .from('api_auth_tokens_safe')
        .select('id')
        .eq('module_name', moduleName)
        .eq('is_active', true)
        .eq('has_value', true)
        .limit(1);

      if (error) return false;
      return data !== null && data.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Verifica si una credencial específica tiene valor
   * (Usa vista segura)
   */
  async credentialHasValue(moduleName: string, tokenKey: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const { data, error } = await client
        .from('api_auth_tokens_safe')
        .select('has_value')
        .eq('module_name', moduleName)
        .eq('token_key', tokenKey)
        .eq('is_active', true)
        .single();

      if (error || !data) return false;
      return data.has_value === true;
    } catch {
      return false;
    }
  }
}

// Exportar instancia singleton
export const credentialsService = new CredentialsService();
export default credentialsService;
