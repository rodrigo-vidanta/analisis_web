-- ============================================
-- RESTAURAR TRIGGERS DE PROSPECTOS
-- Base: glsmifhkoaifvaegsozd.supabase.co (análisis)
-- Este script restaura todos los triggers que tenía la tabla prospectos
-- ============================================

-- ============================================
-- TRIGGER 1: Actualizar updated_at automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_prospectos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_prospectos_updated_at ON prospectos;
CREATE TRIGGER trigger_update_prospectos_updated_at
    BEFORE UPDATE ON prospectos
    FOR EACH ROW
    EXECUTE FUNCTION update_prospectos_updated_at();

-- ============================================
-- TRIGGER 2: Notificaciones Live Monitor
-- ============================================
-- Este trigger ya debería existir si ejecutaste recreate_all_prospectos_related_tables.sql
-- Pero lo incluimos por si acaso

-- Verificar si la función existe, si no crearla
CREATE OR REPLACE FUNCTION notify_live_monitor_change()
RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify(
        'live_monitor_change',
        json_build_object(
            'table', 'live_monitor_view',
            'type', TG_OP,
            'call_id', COALESCE(NEW.call_id, OLD.call_id),
            'prospecto_id', COALESCE(NEW.prospecto, OLD.prospecto, NEW.id, OLD.id),
            'checkpoint', COALESCE(NEW.checkpoint_venta_actual, OLD.checkpoint_venta_actual),
            'call_status', COALESCE(NEW.call_status, OLD.call_status),
            'timestamp', NOW()
        )::text
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear trigger solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'live_monitor_prospectos_trigger' 
        AND event_object_table = 'prospectos'
    ) THEN
        CREATE TRIGGER live_monitor_prospectos_trigger
        AFTER INSERT OR UPDATE OR DELETE ON prospectos
        FOR EACH ROW EXECUTE FUNCTION notify_live_monitor_change();
        RAISE NOTICE '✅ Trigger live_monitor_prospectos_trigger creado';
    ELSE
        RAISE NOTICE 'ℹ️ Trigger live_monitor_prospectos_trigger ya existe';
    END IF;
END $$;

-- ============================================
-- TRIGGER 3: Automatización de asignación (si existía)
-- ============================================
-- Este trigger puede haber existido para asignar automáticamente prospectos
-- Revisa create_automation_triggers.sql para ver si necesitas este trigger

-- Verificar si hay más triggers documentados en otros scripts
SELECT 
    '✅ Triggers restaurados' as resultado,
    COUNT(*)::text as total_triggers
FROM information_schema.triggers 
WHERE event_object_table = 'prospectos';

