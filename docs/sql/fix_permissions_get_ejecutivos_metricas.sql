-- ============================================
-- FIX: Permisos para get_ejecutivos_metricas
-- ============================================
-- Fecha: 27 de Enero 2026
-- Problema: El RPC existe pero tiene "permission denied"
-- Solución: Otorgar permisos a anon y authenticated
-- ============================================

-- Verificar que la función existe
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_ejecutivos_metricas';

-- Otorgar permisos de ejecución SOLO a usuarios autenticados
-- ⚠️ SEGURIDAD: NO otorgar a 'anon' - las métricas son información sensible
GRANT EXECUTE ON FUNCTION get_ejecutivos_metricas(TIMESTAMPTZ, TIMESTAMPTZ, UUID[]) 
TO authenticated;

-- Verificar permisos
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'get_ejecutivos_metricas';

-- Comentario
COMMENT ON FUNCTION get_ejecutivos_metricas IS 
'Obtiene métricas de rendimiento de ejecutivos para el dashboard. 
⚠️ SEGURIDAD: Solo accesible por usuarios autenticados (JWT requerido).
Permisos: authenticated ONLY (NO anon)
Actualizado: 2026-01-27';
