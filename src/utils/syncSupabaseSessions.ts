// ============================================
// DEPRECADO: Sincronización de Sesión entre Clientes Supabase
// ============================================
// 
// Fecha de deprecación: 5 de Febrero 2026
// 
// ANTES: Existían dos clientes independientes (supabaseSystemUI y analysisSupabase)
// que necesitaban sincronizar sus sesiones manualmente.
// 
// AHORA: analysisSupabase re-exporta supabaseSystemUI (cliente único).
// No hay necesidad de sincronizar porque son la misma instancia.
// 
// Estas funciones se mantienen como no-ops para compatibilidad con código
// que pudiera importarlas, pero no hacen nada.

/**
 * @deprecated No necesario con cliente único. analysisSupabase = supabaseSystemUI.
 * Se mantiene como no-op para compatibilidad.
 */
export async function syncSupabaseSessions(): Promise<boolean> {
  // No-op: ambos clientes son la misma instancia
  return true;
}

/**
 * @deprecated No necesario con cliente único. El logout de supabaseSystemUI
 * automáticamente afecta a analysisSupabase (misma instancia).
 */
export async function clearAnalysisSupabaseSession(): Promise<void> {
  // No-op: logout se maneja centralmente en authService.logout()
}
