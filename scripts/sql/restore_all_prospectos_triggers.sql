-- ============================================
-- RESTAURAR TODOS LOS TRIGGERS DE PROSPECTOS (VERSIÓN SEGURA)
-- Base: glsmifhkoaifvaegsozd.supabase.co (análisis)
-- Este script restaura triggers SOLO si no existen
-- NO duplica ni borra triggers existentes
-- ============================================

-- ============================================
-- TRIGGER 1: Actualizar updated_at automáticamente
-- ============================================
-- Verificar si la función existe, si no crearla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_prospectos_updated_at' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        CREATE FUNCTION update_prospectos_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        RAISE NOTICE '✅ Función update_prospectos_updated_at creada';
    ELSE
        RAISE NOTICE 'ℹ️ Función update_prospectos_updated_at ya existe';
    END IF;
END $$;

-- Crear trigger solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_update_prospectos_updated_at' 
        AND event_object_table = 'prospectos'
    ) THEN
        CREATE TRIGGER trigger_update_prospectos_updated_at
        BEFORE UPDATE ON prospectos
        FOR EACH ROW
        EXECUTE FUNCTION update_prospectos_updated_at();
        RAISE NOTICE '✅ Trigger trigger_update_prospectos_updated_at creado';
    ELSE
        RAISE NOTICE 'ℹ️ Trigger trigger_update_prospectos_updated_at ya existe';
    END IF;
END $$;

-- ============================================
-- TRIGGER 2: Notificaciones Live Monitor (CORREGIDO)
-- ============================================
-- La función debe detectar en qué tabla se ejecuta y solo acceder a campos que existen
-- IMPORTANTE: Usar CREATE OR REPLACE para corregir el bug del call_id
-- Esta función se reemplaza siempre porque tiene un bug crítico que necesita corrección
CREATE OR REPLACE FUNCTION notify_live_monitor_change()
RETURNS trigger AS $$
DECLARE
    v_call_id TEXT;
    v_prospecto_id UUID;
    v_checkpoint TEXT;
    v_call_status TEXT;
BEGIN
    -- Detectar tabla y obtener campos según corresponda
    IF TG_TABLE_NAME = 'llamadas_ventas' THEN
        -- Si es llamadas_ventas, usar campos de llamadas
        v_call_id := COALESCE(NEW.call_id::TEXT, OLD.call_id::TEXT);
        v_prospecto_id := COALESCE(NEW.prospecto, OLD.prospecto);
        v_checkpoint := COALESCE(NEW.checkpoint_venta_actual::TEXT, OLD.checkpoint_venta_actual::TEXT);
        v_call_status := COALESCE(NEW.call_status::TEXT, OLD.call_status::TEXT);
    ELSIF TG_TABLE_NAME = 'prospectos' THEN
        -- Si es prospectos, solo usar id (no tiene call_id, checkpoint, etc.)
        v_call_id := NULL;
        v_prospecto_id := COALESCE(NEW.id, OLD.id);
        v_checkpoint := NULL;
        v_call_status := NULL;
    ELSE
        -- Para otras tablas, intentar obtener prospecto_id si existe
        v_call_id := NULL;
        v_prospecto_id := COALESCE(NEW.prospecto, OLD.prospecto, NEW.id, OLD.id);
        v_checkpoint := NULL;
        v_call_status := NULL;
    END IF;
    
    PERFORM pg_notify(
        'live_monitor_change',
        json_build_object(
            'table', TG_TABLE_NAME,
            'type', TG_OP,
            'call_id', v_call_id,
            'prospecto_id', v_prospecto_id,
            'checkpoint', v_checkpoint,
            'call_status', v_call_status,
            'timestamp', NOW()
        )::text
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Solo crear trigger si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'live_monitor_prospectos_trigger' 
        AND event_object_table = 'prospectos'
    ) THEN
        CREATE TRIGGER live_monitor_prospectos_trigger
        AFTER INSERT OR UPDATE OR DELETE ON prospectos
        FOR EACH ROW 
        EXECUTE FUNCTION notify_live_monitor_change();
        RAISE NOTICE '✅ Trigger live_monitor_prospectos_trigger creado';
    ELSE
        RAISE NOTICE 'ℹ️ Trigger live_monitor_prospectos_trigger ya existe - usando existente';
    END IF;
END $$;

-- ============================================
-- TRIGGER 3: Asignación automática de nuevos prospectos
-- ============================================
-- Crear función solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'auto_assign_new_prospect' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        CREATE FUNCTION auto_assign_new_prospect()
        RETURNS TRIGGER AS $$
        DECLARE
          v_coordinacion_id UUID;
        BEGIN
          -- Solo asignar si no tiene coordinacion_id
          IF NEW.coordinacion_id IS NULL THEN
            -- Marcar para asignación (se procesará por servicio externo)
            RAISE NOTICE 'Nuevo prospecto creado: % - Requiere asignación automática', NEW.id;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        RAISE NOTICE '✅ Función auto_assign_new_prospect creada';
    ELSE
        RAISE NOTICE 'ℹ️ Función auto_assign_new_prospect ya existe';
    END IF;
END $$;

-- Crear trigger solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_auto_assign_new_prospect' 
        AND event_object_table = 'prospectos'
    ) THEN
        CREATE TRIGGER trigger_auto_assign_new_prospect
        AFTER INSERT ON prospectos
        FOR EACH ROW
        EXECUTE FUNCTION auto_assign_new_prospect();
        RAISE NOTICE '✅ Trigger trigger_auto_assign_new_prospect creado';
    ELSE
        RAISE NOTICE 'ℹ️ Trigger trigger_auto_assign_new_prospect ya existe';
    END IF;
END $$;

-- ============================================
-- TRIGGER 4: Asignar ejecutivo cuando obtiene ID CRM
-- ============================================
-- Crear función solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'auto_assign_prospect_with_crm' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        CREATE FUNCTION auto_assign_prospect_with_crm()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Verificar si ahora tiene id_dynamics y antes no lo tenía
          IF NEW.id_dynamics IS NOT NULL AND NEW.id_dynamics != '' AND 
             (OLD.id_dynamics IS NULL OR OLD.id_dynamics = '') THEN
            
            -- Verificar que tenga coordinacion_id pero no ejecutivo_id
            IF NEW.coordinacion_id IS NOT NULL AND NEW.ejecutivo_id IS NULL THEN
              RAISE NOTICE 'Prospecto % obtuvo ID CRM: % - Requiere asignación a ejecutivo', NEW.id, NEW.id_dynamics;
            END IF;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        RAISE NOTICE '✅ Función auto_assign_prospect_with_crm creada';
    ELSE
        RAISE NOTICE 'ℹ️ Función auto_assign_prospect_with_crm ya existe';
    END IF;
END $$;

-- Crear trigger solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_auto_assign_prospect_with_crm' 
        AND event_object_table = 'prospectos'
    ) THEN
        CREATE TRIGGER trigger_auto_assign_prospect_with_crm
        AFTER UPDATE OF id_dynamics ON prospectos
        FOR EACH ROW
        WHEN (NEW.id_dynamics IS DISTINCT FROM OLD.id_dynamics)
        EXECUTE FUNCTION auto_assign_prospect_with_crm();
        RAISE NOTICE '✅ Trigger trigger_auto_assign_prospect_with_crm creado';
    ELSE
        RAISE NOTICE 'ℹ️ Trigger trigger_auto_assign_prospect_with_crm ya existe';
    END IF;
END $$;

-- ============================================
-- TRIGGER 5: Generar nombre_completo automáticamente
-- ============================================
-- Este trigger genera nombre_completo a partir de nombre, apellido_paterno y apellido_materno
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'generar_nombre_completo' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        CREATE FUNCTION generar_nombre_completo()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Generar nombre_completo concatenando nombre + apellido_paterno + apellido_materno
            NEW.nombre_completo := TRIM(
                COALESCE(NEW.nombre, '') || ' ' ||
                COALESCE(NEW.apellido_paterno, '') || ' ' ||
                COALESCE(NEW.apellido_materno, '')
            );
            
            -- Si quedó vacío o solo espacios, usar nombre_whatsapp como fallback
            IF NEW.nombre_completo IS NULL OR TRIM(NEW.nombre_completo) = '' THEN
                NEW.nombre_completo := COALESCE(NEW.nombre_whatsapp, NEW.whatsapp);
            END IF;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        RAISE NOTICE '✅ Función generar_nombre_completo creada';
    ELSE
        RAISE NOTICE 'ℹ️ Función generar_nombre_completo ya existe';
    END IF;
END $$;

-- Crear trigger solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_generar_nombre_completo' 
        AND event_object_table = 'prospectos'
    ) THEN
        CREATE TRIGGER trigger_generar_nombre_completo
        BEFORE INSERT OR UPDATE OF nombre, apellido_paterno, apellido_materno, nombre_whatsapp ON prospectos
        FOR EACH ROW
        EXECUTE FUNCTION generar_nombre_completo();
        RAISE NOTICE '✅ Trigger trigger_generar_nombre_completo creado';
    ELSE
        RAISE NOTICE 'ℹ️ Trigger trigger_generar_nombre_completo ya existe';
    END IF;
END $$;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
SELECT 
    '=== TRIGGERS EN PROSPECTOS ===' as seccion,
    trigger_name as nombre,
    event_object_table as tabla,
    action_timing as timing,
    event_manipulation as evento
FROM information_schema.triggers 
WHERE event_object_table = 'prospectos'
ORDER BY trigger_name;

SELECT 
    '✅ Script ejecutado - Todos los triggers fueron verificados/restaurados' as resultado;

