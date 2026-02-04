-- =============================================================================
-- VERIFICACIÓN RÁPIDA: Auto-Refresh Conversaciones Dashboard
-- =============================================================================
-- Fecha: 2026-02-04
-- Descripción: Script rápido para verificar que el cron job está funcionando
-- =============================================================================

-- ========================================
-- 1. VERIFICAR CRON JOB ACTIVO
-- ========================================
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  database
FROM cron.job 
WHERE jobname = 'refresh-conversaciones-dashboard';

-- Resultado esperado:
-- jobid: 3
-- jobname: refresh-conversaciones-dashboard
-- schedule: */5 * * * *
-- active: true
-- database: postgres

-- ========================================
-- 2. ÚLTIMAS EJECUCIONES DEL CRON
-- ========================================
SELECT 
  jobid,
  runid,
  start_time,
  end_time,
  status,
  return_message,
  EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds
FROM cron.job_run_details 
WHERE jobid = 3 
ORDER BY start_time DESC 
LIMIT 10;

-- Resultado esperado:
-- status: 'succeeded' en todas las ejecuciones
-- duration_seconds: ~1-3 segundos
-- return_message: 'REFRESH MATERIALIZED VIEW'

-- ========================================
-- 3. VERIFICAR EJECUCIONES CON ERROR
-- ========================================
SELECT 
  jobid,
  runid,
  start_time,
  status,
  return_message
FROM cron.job_run_details 
WHERE jobid = 3 
  AND status != 'succeeded'
ORDER BY start_time DESC 
LIMIT 5;

-- Resultado esperado: 0 filas (sin errores)

-- ========================================
-- 4. ESTADO DE LA VISTA MATERIALIZADA
-- ========================================
-- Total de conversaciones
SELECT 
  'Total Conversaciones' as metrica,
  COUNT(*) as valor
FROM mv_conversaciones_dashboard

UNION ALL

-- Conversaciones por coordinación
SELECT 
  'Conversaciones ' || coordinacion_codigo as metrica,
  COUNT(*) as valor
FROM mv_conversaciones_dashboard
GROUP BY coordinacion_codigo
ORDER BY metrica;

-- ========================================
-- 5. VERIFICACIÓN DE CASO ESPECÍFICO: OSMARA
-- ========================================
-- Usuario de prueba: Osmara Partida (BOOM)
-- ejecutivo_id: d7847ffa-0758-4eb2-a97b-f80e54886531
SELECT 
  COUNT(*) as conversaciones_osmara,
  MIN(fecha_ultimo_mensaje) as mensaje_mas_antiguo,
  MAX(fecha_ultimo_mensaje) as mensaje_mas_reciente
FROM mv_conversaciones_dashboard 
WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531';

-- Resultado esperado: 29 conversaciones

-- ========================================
-- 6. ÚLTIMA ACTUALIZACIÓN DE LA VISTA
-- ========================================
SELECT 
  MAX(vista_actualizada_at) as ultima_actualizacion,
  NOW() - MAX(vista_actualizada_at) as hace_cuanto
FROM mv_conversaciones_dashboard;

-- Resultado esperado: 
-- hace_cuanto < 5 minutos (si el cron está funcionando)

-- ========================================
-- 7. PRÓXIMA EJECUCIÓN ESTIMADA
-- ========================================
SELECT 
  'Próxima ejecución estimada' as info,
  DATE_TRUNC('minute', NOW()) + INTERVAL '5 minutes' - 
    (EXTRACT(MINUTE FROM NOW())::int % 5) * INTERVAL '1 minute' as proxima_ejecucion;

-- ========================================
-- 8. RESUMEN DE SALUD DEL SISTEMA
-- ========================================
WITH cron_stats AS (
  SELECT 
    COUNT(*) as total_ejecuciones,
    COUNT(*) FILTER (WHERE status = 'succeeded') as ejecuciones_exitosas,
    COUNT(*) FILTER (WHERE status != 'succeeded') as ejecuciones_fallidas,
    MAX(start_time) as ultima_ejecucion
  FROM cron.job_run_details 
  WHERE jobid = 3
    AND start_time > NOW() - INTERVAL '24 hours'
),
vista_stats AS (
  SELECT 
    COUNT(*) as total_conversaciones,
    COUNT(DISTINCT ejecutivo_id) as ejecutivos_unicos,
    COUNT(DISTINCT coordinacion_id) as coordinaciones_unicas,
    MAX(vista_actualizada_at) as ultima_actualizacion_vista
  FROM mv_conversaciones_dashboard
)
SELECT 
  'SALUD SISTEMA' as componente,
  json_build_object(
    'cron_job_activo', (SELECT active FROM cron.job WHERE jobid = 3),
    'total_ejecuciones_24h', total_ejecuciones,
    'tasa_exito', ROUND(100.0 * ejecuciones_exitosas / NULLIF(total_ejecuciones, 0), 2) || '%',
    'ultima_ejecucion_cron', ultima_ejecucion,
    'total_conversaciones', total_conversaciones,
    'ejecutivos_activos', ejecutivos_unicos,
    'coordinaciones_activas', coordinaciones_unicas,
    'vista_actualizada_hace', AGE(NOW(), ultima_actualizacion_vista)
  ) as metricas
FROM cron_stats, vista_stats;

-- Resultado esperado:
-- {
--   "cron_job_activo": true,
--   "total_ejecuciones_24h": 288 (12 por hora),
--   "tasa_exito": "100.00%",
--   "total_conversaciones": 3230,
--   "vista_actualizada_hace": "00:03:25" (< 5 min)
-- }
