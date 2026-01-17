/**
 * ============================================
 * HELPERS DE AUTENTICACIÓN
 * ============================================
 * 
 * Utilidades para obtener tokens de autenticación
 * para llamadas a Edge Functions de Supabase.
 * 
 * NOTA: Las Edge Functions "proxy" (transfer-request-proxy, tools-proxy, etc.)
 * no validan el JWT del usuario porque el acceso a la app ya está protegido
 * por login. Estas funciones solo actúan como proxies para ocultar webhooks.
 * 
 * Autor: Darig Samuel Rosales Robledo
 * Fecha: 17 Enero 2026
 */

import { supabaseSystemUI } from '../config/supabaseSystemUI';

const EDGE_FUNCTIONS_ANON_KEY = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;

/**
 * Obtener token para llamar Edge Functions.
 * Intenta usar el JWT del usuario autenticado, con fallback a anon_key.
 * 
 * Las Edge Functions de tipo "proxy" aceptan cualquier token válido
 * ya que no validan JWT (la app ya está protegida por login).
 * 
 * @returns Token JWT de la sesión activa o anon_key como fallback
 */
export async function getAuthToken(): Promise<string> {
  try {
    if (supabaseSystemUI) {
      const { data: { session } } = await supabaseSystemUI.auth.getSession();
      if (session?.access_token) {
        return session.access_token;
      }
    }
  } catch (error) {
    console.warn('⚠️ [AuthHelpers] Error obteniendo sesión:', error);
  }
  
  // Fallback a anon_key (válido para Edge Functions tipo proxy)
  return EDGE_FUNCTIONS_ANON_KEY || '';
}

/**
 * Construir headers de autenticación para Edge Functions
 * @returns Headers con Authorization Bearer token
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Construir headers de autenticación para Edge Functions que SÍ requieren JWT de usuario.
 * Lanza error si no hay sesión activa.
 * 
 * Usar para: multi-db-proxy, auth-admin-proxy, secure-query
 * NO usar para: transfer-request-proxy, tools-proxy, send-message-proxy
 * 
 * @returns Headers con Authorization Bearer token (JWT de usuario)
 * @throws Error si no hay sesión activa
 */
export async function getAuthHeadersStrict(): Promise<HeadersInit> {
  try {
    if (supabaseSystemUI) {
      const { data: { session } } = await supabaseSystemUI.auth.getSession();
      if (session?.access_token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        };
      }
    }
  } catch (error) {
    console.error('❌ [AuthHelpers] Error obteniendo sesión:', error);
  }
  
  throw new Error('Sesión no activa. Por favor, inicia sesión.');
}
