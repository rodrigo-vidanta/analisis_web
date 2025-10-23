-- ============================================
-- HABILITAR REALTIME EN LA VISTA LIVE MONITOR
-- Base: glsmifhkoaifvaegsozd.supabase.co (Natalia)
-- EJECUTAR DESPUÉS de crear la vista
-- ============================================

-- IMPORTANTE: Estas queries deben ejecutarse con privilegios de SUPERUSER
-- Normalmente se ejecutan desde el panel de Supabase o con service_role key

-- 1. HABILITAR REALTIME EN LAS TABLAS BASE (si no está habilitado)
ALTER publication supabase_realtime ADD TABLE llamadas_ventas;
ALTER publication supabase_realtime ADD TABLE prospectos;

-- 2. INTENTAR HABILITAR REALTIME EN LA VISTA
-- Nota: Supabase tiene limitaciones con vistas en realtime
-- Puede requerir configuración adicional o usar triggers

-- 3. CREAR TRIGGER PARA SIMULAR REALTIME EN LA VISTA
-- Cuando cambie llamadas_ventas, notificar cambio en vista

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

-- 5. VERIFICAR TRIGGERS
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_name LIKE 'live_monitor%';

-- 6. PRUEBA DE NOTIFICACIÓN
-- Ejecutar esto para probar si funcionan las notificaciones:
-- LISTEN live_monitor_change;
-- UPDATE llamadas_ventas SET checkpoint_venta_actual = 'checkpoint #2' WHERE call_id = (SELECT call_id FROM llamadas_ventas LIMIT 1);

-- 7. CONFIGURACIÓN ADICIONAL PARA SUPABASE REALTIME
-- Si Supabase no soporta realtime en vistas, usar esta aproximación:

-- Crear tabla materializada en lugar de vista (opcional)
/*
DROP MATERIALIZED VIEW IF EXISTS live_monitor_materialized;
CREATE MATERIALIZED VIEW live_monitor_materialized AS 
SELECT * FROM live_monitor_view;

-- Crear índice único para realtime
CREATE UNIQUE INDEX live_monitor_materialized_pkey ON live_monitor_materialized(call_id);

-- Habilitar realtime en la materializada
ALTER publication supabase_realtime ADD TABLE live_monitor_materialized;

-- Función para refrescar la vista materializada
CREATE OR REPLACE FUNCTION refresh_live_monitor_materialized()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY live_monitor_materialized;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-refrescar
CREATE TRIGGER refresh_live_monitor_trigger
  AFTER INSERT OR UPDATE OR DELETE ON llamadas_ventas
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_live_monitor_materialized();
*/
