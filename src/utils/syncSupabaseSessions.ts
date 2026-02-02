// ============================================
// FIX: Sincronización de Sesión entre Clientes Supabase
// ============================================
// Fecha: 2 de Febrero 2026
// Problema: analysisSupabase no tiene acceso al JWT de supabaseSystemUI
// Causa del 404: El usuario está autenticado en supabaseSystemUI pero NO en analysisSupabase

import { analysisSupabase } from '../config/analysisSupabase';
import { supabaseSystemUI } from '../config/supabaseSystemUI';

/**
 * Sincroniza la sesión de supabaseSystemUI hacia analysisSupabase
 * Debe llamarse después de login exitoso o al inicializar la app
 */
export async function syncSupabaseSessions() {
  try {
    // 1. Obtener sesión actual de supabaseSystemUI (donde el usuario se autenticó)
    const { data: { session: systemSession }, error: systemError } = await supabaseSystemUI!.auth.getSession();
    
    if (systemError) {
      console.error('❌ Error obteniendo sesión de supabaseSystemUI:', systemError);
      return false;
    }
    
    if (!systemSession) {
      console.warn('⚠️ No hay sesión activa en supabaseSystemUI');
      return false;
    }
    
    // 2. Verificar si analysisSupabase ya tiene la misma sesión
    const { data: { session: analysisSession } } = await analysisSupabase!.auth.getSession();
    
    if (analysisSession?.access_token === systemSession.access_token) {
      console.log('✅ Sesiones ya sincronizadas');
      return true;
    }
    
    // 3. Copiar la sesión a analysisSupabase
    const { error: setError } = await analysisSupabase!.auth.setSession({
      access_token: systemSession.access_token,
      refresh_token: systemSession.refresh_token
    });
    
    if (setError) {
      console.error('❌ Error sincronizando sesión a analysisSupabase:', setError);
      return false;
    }
    
    console.log('✅ Sesión sincronizada exitosamente entre clientes Supabase');
    return true;
    
  } catch (error) {
    console.error('❌ Error en syncSupabaseSessions:', error);
    return false;
  }
}

/**
 * Limpia la sesión de analysisSupabase cuando el usuario cierra sesión
 */
export async function clearAnalysisSupabaseSession() {
  try {
    await analysisSupabase!.auth.signOut();
    console.log('✅ Sesión de analysisSupabase limpiada');
  } catch (error) {
    console.error('❌ Error limpiando sesión de analysisSupabase:', error);
  }
}
