/**
 * ============================================
 * SERVICIO DE CREDENCIALES DEL SISTEMA
 * ============================================
 * 
 * Obtiene credenciales almacenadas en la tabla api_auth_tokens
 * de Supabase SystemUI para evitar hardcodear API keys.
 * 
 * 📋 Tabla: api_auth_tokens (SystemUI)
 * 📍 Ubicación: zbylezfyagwrxoecioup.supabase.co
 * 
 * ⚠️ REGLAS DE SEGURIDAD:
 * - Las credenciales se obtienen solo cuando se necesitan
 * - Se cachean en memoria por sesión (no localStorage)
 * - Nunca se exponen en logs ni consola
 * 
 * 🔗 Usado por:
 * - src/components/admin/ApiAuthTokensManager.tsx
 * - src/services/apiTokensService.ts
 * - src/services/n8nService.ts
 * - src/services/dynamicsLeadService.ts
 * - src/services/dynamicsReasignacionService.ts
 */

import { createClient } from '@supabase/supabase-js';

// ============================================
// CLIENTE SUPABASE FRESCO (sin cache)
// ============================================
// Creamos un cliente nuevo cada vez para evitar problemas de cache

// ⚠️ MIGRACIÓN 2025-01-13: Ahora usa las mismas variables que analysisSupabase (PQNC_AI)
// Las credenciales están en la tabla api_auth_tokens que fue migrada a PQNC_AI
const SUPABASE_URL = import.meta.env.VITE_ANALYSIS_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = import.meta.env.VITE_ANALYSIS_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_SERVICE_KEY || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const getSupabaseClient = () => {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) {
    return null;
  }
  
  return createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};

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
    const client = getSupabaseClient();
    if (!client) {
      console.error('❌ [CredentialsService] No hay cliente Supabase disponible');
      console.error('⚠️ Verifica VITE_SYSTEM_UI_SUPABASE_URL y VITE_SYSTEM_UI_SUPABASE_ANON_KEY en .env');
    }
    return client;
  }

  /**
   * Obtiene una credencial específica por su token_key
   */
  async getCredential(tokenKey: string): Promise<string | null> {
    // Verificar cache
    if (this.cache[tokenKey] && Date.now() < this.cacheExpiry) {
      return this.cache[tokenKey];
    }

    const client = this.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('api_auth_tokens')
        .select('token_value')
        .eq('token_key', tokenKey)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.warn(`⚠️ Credencial no encontrada: ${tokenKey}`);
        return null;
      }

      // Guardar en cache
      this.cache[tokenKey] = data.token_value;
      this.cacheExpiry = Date.now() + this.CACHE_TTL;

      return data.token_value;
    } catch (err) {
      console.error(`❌ Error obteniendo credencial ${tokenKey}:`, err);
      return null;
    }
  }

  /**
   * Obtiene una credencial por módulo y key
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
      const { data, error } = await client
        .from('api_auth_tokens')
        .select('token_value')
        .eq('module_name', moduleName)
        .eq('token_key', tokenKey)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.warn(`⚠️ Credencial no encontrada: ${moduleName}.${tokenKey}`);
        return null;
      }

      // Guardar en cache
      this.cache[cacheKey] = data.token_value;
      this.cacheExpiry = Date.now() + this.CACHE_TTL;

      return data.token_value;
    } catch (err) {
      console.error(`❌ Error obteniendo credencial ${moduleName}.${tokenKey}:`, err);
      return null;
    }
  }

  /**
   * Obtiene todas las credenciales de un módulo
   */
  async getModuleCredentials(moduleName: string): Promise<Record<string, string>> {
    const client = this.getClient();
    if (!client) {
      console.error(`❌ [CredentialsService] No hay cliente Supabase disponible`);
      return {};
    }

    try {
      const { data, error } = await client
        .from('api_auth_tokens')
        .select('token_key, token_value')
        .eq('module_name', moduleName)
        .eq('is_active', true);

      if (error) {
        console.error(`❌ [CredentialsService] Error consultando "${moduleName}":`, error.message);
        return {};
      }

      if (!data || data.length === 0) {
        return {};
      }

      const result: Record<string, string> = {};
      data.forEach((cred) => {
        if (cred.token_value && cred.token_value.trim() !== '') {
          result[cred.token_key] = cred.token_value;
          this.cache[`${moduleName}:${cred.token_key}`] = cred.token_value;
        }
      });

      this.cacheExpiry = Date.now() + this.CACHE_TTL;
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
   */
  async listModules(): Promise<string[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('api_auth_tokens')
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
   */
  async listAllCredentials(): Promise<Array<{
    id: string;
    module_name: string;
    token_key: string;
    description?: string;
    is_active: boolean;
  }>> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('api_auth_tokens')
        .select('id, module_name, token_key, description, is_active')
        .order('module_name');

      if (error || !data) return [];
      return data;
    } catch (err) {
      console.error('❌ Error listando credenciales:', err);
      return [];
    }
  }

  /**
   * Verifica si un módulo tiene credenciales configuradas
   */
  async hasCredentials(moduleName: string): Promise<boolean> {
    const modules = await this.listModules();
    return modules.includes(moduleName);
  }
}

// Exportar instancia singleton
export const credentialsService = new CredentialsService();
export default credentialsService;
