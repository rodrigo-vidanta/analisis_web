/**
 * ============================================
 * UTILIDAD: Obtener Token de Autenticación
 * ============================================
 * 
 * Función centralizada para obtener el JWT del usuario autenticado.
 * 
 * ⚠️ IMPORTANTE (Migración 2026-01-13 + Auth Nativo 2026-01-16):
 * - La autenticación usa Supabase Auth nativo en PQNC_AI
 * - supabaseSystemUI apunta a PQNC_AI (glsmifhkoaifvaegsozd)
 * - analysisSupabase también apunta a PQNC_AI
 * - Pero la SESIÓN solo existe en supabaseSystemUI (donde se hace login)
 * - analysisSupabase NO tiene sesión porque no maneja auth
 * 
 * Fecha: 29 Enero 2026
 */

import { supabaseSystemUI } from '../config/supabaseSystemUI';

/**
 * Obtiene el JWT del usuario autenticado desde Supabase Auth nativo.
 * Si no hay sesión activa, retorna null (NO el anon_key).
 * 
 * Las Edge Functions REQUIEREN un JWT de usuario válido para verificar permisos.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabaseSystemUI.auth.getSession();
    
    if (error) {
      console.error('❌ Error obteniendo sesión:', error);
      return null;
    }
    
    if (!session?.access_token) {
      console.warn('⚠️ No hay sesión activa. El usuario debe iniciar sesión.');
      return null;
    }
    
    return session.access_token;
  } catch (error) {
    console.error('❌ Error inesperado obteniendo token:', error);
    return null;
  }
}

/**
 * Obtiene el JWT del usuario autenticado o lanza error si no está autenticado.
 * Usar cuando el token es OBLIGATORIO (Edge Functions).
 */
export async function getAuthTokenOrThrow(): Promise<string> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('Usuario no autenticado. Por favor recarga la página e inicia sesión.');
  }
  
  return token;
}
