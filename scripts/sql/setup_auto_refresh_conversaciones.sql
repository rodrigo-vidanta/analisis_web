-- ============================================
-- SOLUCIÓN DEFINITIVA: Auto-actualización de mv_conversaciones_dashboard
-- Fecha: 2026-02-04
-- Problema: Vista materializada se desactualiza al cambiar datos
-- 
-- ✅ APLICADO EN PRODUCCIÓN: 2026-02-04
-- OPCIÓN ELEGIDA: OPCIÓN B - Cron Job (pg_cron)
-- JOB ID: 3
-- FRECUENCIA: Cada 5 minutos (*/5 * * * *)
-- ESTADO: Activo
-- ============================================

-- PASO 1: Ver definición actual de la vista
SELECT definition 
FROM pg_matviews 
WHERE matviewname = 'mv_conversaciones_dashboard';

-- ============================================
-- PASO 2: Crear función para refresh automático
-- ============================================
CREATE OR REPLACE FUNCTION refresh_conversaciones_dashboard()
RETURNS trigger AS $$
BEGIN
  -- Usar REFRESH CONCURRENTLY para no bloquear lecturas
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversaciones_dashboard;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PASO 3: Crear triggers en tablas relevantes
-- ============================================

-- Trigger 1: Al cambiar prospectos (coordinacion_id, ejecutivo_id)
DROP TRIGGER IF EXISTS refresh_conversaciones_on_prospecto ON prospectos;
CREATE TRIGGER refresh_conversaciones_on_prospecto
  AFTER INSERT OR UPDATE OR DELETE ON prospectos
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_conversaciones_dashboard();

-- Trigger 2: Al cambiar conversaciones_whatsapp
DROP TRIGGER IF EXISTS refresh_conversaciones_on_conv ON conversaciones_whatsapp;
CREATE TRIGGER refresh_conversaciones_on_conv
  AFTER INSERT OR UPDATE OR DELETE ON conversaciones_whatsapp
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_conversaciones_dashboard();

-- Trigger 3: Al cambiar mensajes_whatsapp (afecta contadores)
DROP TRIGGER IF EXISTS refresh_conversaciones_on_mensajes ON mensajes_whatsapp;
CREATE TRIGGER refresh_conversaciones_on_mensajes
  AFTER INSERT OR UPDATE OR DELETE ON mensajes_whatsapp
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_conversaciones_dashboard();

-- ============================================
-- ALTERNATIVA: Cron Job (si triggers causan lentitud)
-- ============================================
-- Descomentar si prefieres actualización cada 5 minutos:

/*
-- Requiere extensión pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programar refresh cada 5 minutos
SELECT cron.schedule(
  'refresh-conversaciones-dashboard',
  '*/5 * * * *', -- Cada 5 minutos
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversaciones_dashboard$$
);

-- Ver cron jobs activos
SELECT * FROM cron.job;

-- Eliminar cron job si es necesario
-- SELECT cron.unschedule('refresh-conversaciones-dashboard');
*/

-- ============================================
-- PASO 4: Verificar que los triggers funcionan
-- ============================================

-- Listar triggers creados
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger 
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgname LIKE 'refresh_conversaciones%';

-- ============================================
-- PASO 5: Test manual (opcional)
-- ============================================

-- 1. Ver conteo actual para Osmara
SELECT COUNT(*) FROM mv_conversaciones_dashboard 
WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531';

-- 2. Hacer un cambio dummy
UPDATE prospectos 
SET updated_at = NOW() 
WHERE id = (
  SELECT id FROM prospectos 
  WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531' 
  LIMIT 1
);

-- 3. Esperar 1-2 segundos para que el trigger se ejecute

-- 4. Verificar que vista_actualizada_at cambió
SELECT 
  MAX(vista_actualizada_at) as ultima_actualizacion,
  COUNT(*) as total
FROM mv_conversaciones_dashboard 
WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531';

-- ============================================
-- ROLLBACK (si algo sale mal)
-- ============================================
/*
DROP TRIGGER IF EXISTS refresh_conversaciones_on_prospecto ON prospectos;
DROP TRIGGER IF EXISTS refresh_conversaciones_on_conv ON conversaciones_whatsapp;
DROP TRIGGER IF EXISTS refresh_conversaciones_on_mensajes ON mensajes_whatsapp;
DROP FUNCTION IF EXISTS refresh_conversaciones_dashboard();
*/

-- ============================================
-- CONSIDERACIONES DE PERFORMANCE
-- ============================================
/*
TRIGGERS:
- ✅ Ventaja: Vista siempre actualizada en tiempo real
- ❌ Desventaja: Refresh en CADA cambio (puede ser lento en bulk updates)

CRON JOB:
- ✅ Ventaja: No impacta performance de escrituras
- ❌ Desventaja: Vista puede estar desactualizada hasta 5 minutos

RECOMENDACIÓN:
- Usar TRIGGERS si hay <100 cambios/minuto
- Usar CRON JOB si hay bulk updates frecuentes
*/
