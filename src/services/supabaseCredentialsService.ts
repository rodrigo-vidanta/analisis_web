/**
 * ============================================
 * SERVICIO PARA CREDENCIALES DE BASES DE DATOS
 * ============================================
 * 
 * Obtiene credenciales de BD externas (PQNC_QA, LogMonitor)
 * de forma segura desde api_auth_tokens.
 * 
 * ⚠️ Las credenciales DEBEN ser configuradas en:
 *    Administración > Credenciales API
 * 
 * Módulos disponibles:
 * - Supabase PQNC_QA: Para feedback, bookmarks, PQNC Dashboard
 * - Supabase LOGMONITOR: Para logs de backend/frontend
 * - ElevenLabs: Para TTS
 * 
 * 📍 Las credenciales se obtienen bajo demanda y se cachean
 */

import { credentialsService } from './credentialsService';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cache para clientes Supabase
const clientCache: Map<string, SupabaseClient | null> = new Map();

export interface DatabaseCredentials {
  url: string;
  anonKey: string;
  serviceKey?: string;
}

/**
 * Obtiene credenciales de una base de datos desde api_auth_tokens
 */
export async function getDatabaseCredentials(moduleName: string): Promise<DatabaseCredentials | null> {
  try {
    const creds = await credentialsService.getModuleCredentials(moduleName);
    
    if (!creds['URL'] || !creds['ANON_KEY']) {
      return null;
    }
    
    // Normalizar URL
    let url = creds['URL'];
    if (!url.startsWith('https://')) {
      url = `https://${url}`;
    }
    
    return {
      url,
      anonKey: creds['ANON_KEY'],
      serviceKey: creds['SERVICE_KEY'] || undefined
    };
  } catch (err) {
    console.error(`❌ Error obteniendo credenciales de ${moduleName}:`, err);
    return null;
  }
}

/**
 * Crea un cliente Supabase usando credenciales de la BD
 */
export async function createSecureSupabaseClient(
  moduleName: string,
  useServiceKey: boolean = false
): Promise<SupabaseClient | null> {
  const cacheKey = `${moduleName}:${useServiceKey ? 'admin' : 'anon'}`;
  
  // Verificar cache
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey) || null;
  }
  
  const creds = await getDatabaseCredentials(moduleName);
  
  if (!creds) {
    console.warn(`⚠️ No hay credenciales configuradas para ${moduleName}`);
    clientCache.set(cacheKey, null);
    return null;
  }
  
  // Verificar que no son placeholders
  if (creds.anonKey.startsWith('PLACEHOLDER_')) {
    console.warn(`⚠️ Credenciales de ${moduleName} son placeholders - configurar en Administración > Credenciales`);
    clientCache.set(cacheKey, null);
    return null;
  }
  
  const key = useServiceKey && creds.serviceKey ? creds.serviceKey : creds.anonKey;
  
  try {
    const client = createClient(creds.url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    
    clientCache.set(cacheKey, client);
    return client;
  } catch (err) {
    console.error(`❌ Error creando cliente Supabase para ${moduleName}:`, err);
    clientCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Obtiene cliente PQNC_QA (para feedback, bookmarks)
 */
export async function getPqncQaClient(): Promise<SupabaseClient | null> {
  return createSecureSupabaseClient('Supabase PQNC_QA');
}

/**
 * Obtiene cliente LogMonitor (para logs)
 */
export async function getLogMonitorClient(): Promise<SupabaseClient | null> {
  return createSecureSupabaseClient('Supabase LOGMONITOR');
}

/**
 * Limpia el cache de clientes (útil cuando se actualizan credenciales)
 */
export function clearClientCache(): void {
  clientCache.clear();
  console.log('🔄 [SupabaseCredentialsService] Cache de clientes limpiado');
}

export const supabaseCredentialsService = {
  getDatabaseCredentials,
  createSecureSupabaseClient,
  getPqncQaClient,
  getLogMonitorClient,
  clearClientCache
};

export default supabaseCredentialsService;
