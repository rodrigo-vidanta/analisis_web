-- ============================================
-- HABILITAR REALTIME EN LA VISTA LIVE MONITOR - VERSIÓN SEGURA
-- Base: glsmifhkoaifvaegsozd.supabase.co (Natalia)
-- Maneja casos donde las tablas ya tienen realtime habilitado
-- ============================================

-- 1. VERIFICAR ESTADO ACTUAL DE REALTIME
SELECT 
  schemaname,
  tablename,
  'realtime_enabled' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('llamadas_ventas', 'prospectos');

-- 2. HABILITAR REALTIME SOLO SI NO ESTÁ YA HABILITADO
-- Nota: Si aparece error "already member", es normal - significa que ya está habilitado

-- Para llamadas_ventas (si no está ya)
DO $$
BEGIN
  BEGIN
    ALTER publication supabase_realtime ADD TABLE llamadas_ventas;
    RAISE NOTICE 'Realtime habilitado en llamadas_ventas';
  EXCEPTION 
    WHEN duplicate_object THEN
      RAISE NOTICE 'llamadas_ventas ya tiene realtime habilitado';
  END;
END $$;

-- Para prospectos (si no está ya)
DO $$
BEGIN
  BEGIN
    ALTER publication supabase_realtime ADD TABLE prospectos;
    RAISE NOTICE 'Realtime habilitado en prospectos';
  EXCEPTION 
    WHEN duplicate_object THEN
      RAISE NOTICE 'prospectos ya tiene realtime habilitado';
  END;
END $$;

-- 3. CREAR FUNCIÓN PARA NOTIFICACIONES DE LA VISTA
CREATE OR REPLACE FUNCTION notify_live_monitor_change()
RETURNS trigger AS $$
BEGIN
  -- Notificar cambio en la vista usando NOTIFY
  PERFORM pg_notify(
    'live_monitor_change',
    json_build_object(
      'table', 'live_monitor_view',
      'type', TG_OP,
      'call_id', COALESCE(NEW.call_id, OLD.call_id),
      'prospecto_id', COALESCE(NEW.prospecto, OLD.prospecto),
      'checkpoint', COALESCE(NEW.checkpoint_venta_actual, OLD.checkpoint_venta_actual),
      'call_status', COALESCE(NEW.call_status, OLD.call_status),
      'call_status_inteligente', clasificar_estado_llamada(
        COALESCE(NEW.call_status, OLD.call_status),
        COALESCE(NEW.datos_llamada, OLD.datos_llamada),
        COALESCE(NEW.duracion_segundos, OLD.duracion_segundos),
        COALESCE(NEW.fecha_llamada, OLD.fecha_llamada),
        COALESCE(NEW.audio_ruta_bucket, OLD.audio_ruta_bucket)::text
      ),
      'timestamp', NOW()
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. CREAR TRIGGERS EN TABLAS BASE
DROP TRIGGER IF EXISTS live_monitor_llamadas_trigger ON llamadas_ventas;
CREATE TRIGGER live_monitor_llamadas_trigger
  AFTER INSERT OR UPDATE OR DELETE ON llamadas_ventas
  FOR EACH ROW EXECUTE FUNCTION notify_live_monitor_change();

DROP TRIGGER IF EXISTS live_monitor_prospectos_trigger ON prospectos;  
CREATE TRIGGER live_monitor_prospectos_trigger
  AFTER INSERT OR UPDATE OR DELETE ON prospectos
  FOR EACH ROW EXECUTE FUNCTION notify_live_monitor_change();

-- 5. VERIFICAR QUE TODO SE CONFIGURÓ CORRECTAMENTE
SELECT 
  '=== ESTADO DE REALTIME ===' as seccion,
  NULL as trigger_name,
  NULL as event_object_table,
  NULL as action_timing,
  NULL as event_manipulation

UNION ALL

SELECT 
  'TRIGGERS' as seccion,
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_name LIKE 'live_monitor%'

UNION ALL

SELECT 
  'PUBLICACIONES' as seccion,
  tablename as trigger_name,
  schemaname as event_object_table,
  'REALTIME' as action_timing,
  'ENABLED' as event_manipulation
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('llamadas_ventas', 'prospectos');

-- 6. PRUEBA DE FUNCIONAMIENTO
-- Ejecutar esto para probar las notificaciones (OPCIONAL):
/*
LISTEN live_monitor_change;

-- Luego ejecuta esto en otra pestaña:
UPDATE llamadas_ventas 
SET checkpoint_venta_actual = CASE 
  WHEN checkpoint_venta_actual = 'checkpoint #1' THEN 'checkpoint #2'
  ELSE 'checkpoint #1'
END
WHERE call_id = (SELECT call_id FROM llamadas_ventas LIMIT 1);

-- Deberías ver una notificación JSON
*/

-- 7. ESTADÍSTICAS DE LA VISTA (para verificar que funciona)
SELECT 
  '=== ESTADÍSTICAS VISTA LIVE MONITOR ===' as info,
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE call_status_inteligente = 'activa') as activas_reales,
  COUNT(*) FILTER (WHERE call_status_inteligente = 'perdida') as perdidas,
  COUNT(*) FILTER (WHERE call_status_inteligente = 'transferida') as transferidas,
  COUNT(*) FILTER (WHERE call_status_inteligente = 'finalizada') as finalizadas,
  COUNT(*) FILTER (WHERE call_status_bd != call_status_inteligente) as reclasificadas
FROM live_monitor_view;
