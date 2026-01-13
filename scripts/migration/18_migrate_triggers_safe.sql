-- ============================================
-- MIGRACIÓN SEGURA DE TRIGGERS
-- System_UI → PQNC_AI
-- Fecha: 2025-01-13
-- ============================================
-- 
-- Este script migra los triggers críticos de system_ui a pqnc_ai
-- con verificaciones de seguridad para evitar conflictos
--
-- ⚠️ IMPORTANTE: Ejecutar con permisos de SUPERUSER o service_role
-- ============================================

-- ============================================
-- 1. TRIGGER: update_user_warning_counter
-- ============================================
-- Actualiza contador de advertencias cuando se inserta un warning

-- Paso 1: Verificar si la función ya existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'update_user_warning_counter'
  ) THEN
    -- Crear función
    CREATE OR REPLACE FUNCTION update_user_warning_counter()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Actualizar contador cuando se inserta un warning
      INSERT INTO user_warning_counters (
        user_id, 
        total_warnings, 
        warnings_last_30_days, 
        warnings_last_7_days, 
        last_warning_at, 
        is_blocked, 
        updated_at
      )
      VALUES (
        NEW.user_id,
        1,
        CASE WHEN NEW.created_at > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END,
        CASE WHEN NEW.created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END,
        NEW.created_at,
        false,
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE
      SET
        total_warnings = user_warning_counters.total_warnings + 1,
        warnings_last_30_days = (
          SELECT COUNT(*) FROM content_moderation_warnings 
          WHERE user_id = NEW.user_id 
          AND created_at > NOW() - INTERVAL '30 days'
        ),
        warnings_last_7_days = (
          SELECT COUNT(*) FROM content_moderation_warnings 
          WHERE user_id = NEW.user_id 
          AND created_at > NOW() - INTERVAL '7 days'
        ),
        last_warning_at = NEW.created_at,
        is_blocked = (user_warning_counters.total_warnings + 1) >= 3,
        updated_at = NOW();
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    RAISE NOTICE '✅ Función update_user_warning_counter() creada';
  ELSE
    RAISE NOTICE '⚠️ Función update_user_warning_counter() ya existe, omitiendo creación';
  END IF;
END $$;

-- Paso 2: Crear trigger si no existe
DROP TRIGGER IF EXISTS trigger_update_warning_counter ON content_moderation_warnings;
CREATE TRIGGER trigger_update_warning_counter
  AFTER INSERT ON content_moderation_warnings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_warning_counter();

-- Verificación
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trigger_update_warning_counter'
    AND event_object_table = 'content_moderation_warnings'
  ) THEN
    RAISE NOTICE '✅ Trigger trigger_update_warning_counter creado correctamente';
  ELSE
    RAISE WARNING '❌ Error al crear trigger trigger_update_warning_counter';
  END IF;
END $$;

-- ============================================
-- 2. TRIGGER: check_conflicting_labels
-- ============================================
-- Valida que no se asignen etiquetas conflictivas (positive vs negative)

-- Paso 1: Crear función
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'check_conflicting_labels'
  ) THEN
    CREATE OR REPLACE FUNCTION check_conflicting_labels()
    RETURNS TRIGGER AS $$
    DECLARE
      new_label_rule VARCHAR(50);
    BEGIN
      -- Solo validar si es etiqueta preset
      IF NEW.label_type = 'preset' THEN
        SELECT business_rule INTO new_label_rule
        FROM whatsapp_labels_preset
        WHERE id = NEW.label_id;
        
        -- Verificar conflictos positive vs negative
        IF new_label_rule = 'positive' THEN
          IF EXISTS (
            SELECT 1 FROM whatsapp_conversation_labels wcl
            JOIN whatsapp_labels_preset wlp ON wcl.label_id = wlp.id
            WHERE wcl.prospecto_id = NEW.prospecto_id
            AND wcl.label_type = 'preset'
            AND wlp.business_rule = 'negative'
          ) THEN
            RAISE EXCEPTION 'No puedes agregar una etiqueta positiva si ya existe una negativa';
          END IF;
        ELSIF new_label_rule = 'negative' THEN
          IF EXISTS (
            SELECT 1 FROM whatsapp_conversation_labels wcl
            JOIN whatsapp_labels_preset wlp ON wcl.label_id = wlp.id
            WHERE wcl.prospecto_id = NEW.prospecto_id
            AND wcl.label_type = 'preset'
            AND wlp.business_rule = 'positive'
          ) THEN
            RAISE EXCEPTION 'No puedes agregar una etiqueta negativa si ya existe una positiva';
          END IF;
        END IF;
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    RAISE NOTICE '✅ Función check_conflicting_labels() creada';
  ELSE
    RAISE NOTICE '⚠️ Función check_conflicting_labels() ya existe, omitiendo creación';
  END IF;
END $$;

-- Paso 2: Crear trigger
DROP TRIGGER IF EXISTS trigger_check_conflicting_labels ON whatsapp_conversation_labels;
CREATE TRIGGER trigger_check_conflicting_labels
  BEFORE INSERT ON whatsapp_conversation_labels
  FOR EACH ROW
  EXECUTE FUNCTION check_conflicting_labels();

-- Verificación
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trigger_check_conflicting_labels'
    AND event_object_table = 'whatsapp_conversation_labels'
  ) THEN
    RAISE NOTICE '✅ Trigger trigger_check_conflicting_labels creado correctamente';
  ELSE
    RAISE WARNING '❌ Error al crear trigger trigger_check_conflicting_labels';
  END IF;
END $$;

-- ============================================
-- 3. TRIGGER: check_max_labels_per_prospecto
-- ============================================
-- Limita el número máximo de etiquetas por prospecto (3)

-- Paso 1: Crear función
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'check_max_labels_per_prospecto'
  ) THEN
    CREATE OR REPLACE FUNCTION check_max_labels_per_prospecto()
    RETURNS TRIGGER AS $$
    BEGIN
      IF (SELECT COUNT(*) FROM whatsapp_conversation_labels 
          WHERE prospecto_id = NEW.prospecto_id) >= 3 THEN
        RAISE EXCEPTION 'No puedes agregar más de 3 etiquetas a una conversación';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    RAISE NOTICE '✅ Función check_max_labels_per_prospecto() creada';
  ELSE
    RAISE NOTICE '⚠️ Función check_max_labels_per_prospecto() ya existe, omitiendo creación';
  END IF;
END $$;

-- Paso 2: Crear trigger
DROP TRIGGER IF EXISTS trigger_max_labels_per_prospecto ON whatsapp_conversation_labels;
CREATE TRIGGER trigger_max_labels_per_prospecto
  BEFORE INSERT ON whatsapp_conversation_labels
  FOR EACH ROW
  EXECUTE FUNCTION check_max_labels_per_prospecto();

-- Verificación
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trigger_max_labels_per_prospecto'
    AND event_object_table = 'whatsapp_conversation_labels'
  ) THEN
    RAISE NOTICE '✅ Trigger trigger_max_labels_per_prospecto creado correctamente';
  ELSE
    RAISE WARNING '❌ Error al crear trigger trigger_max_labels_per_prospecto';
  END IF;
END $$;

-- ============================================
-- 4. TRIGGER: check_max_custom_labels
-- ============================================
-- Limita el número máximo de etiquetas personalizadas por usuario (6)

-- Paso 1: Crear función
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'check_max_custom_labels'
  ) THEN
    CREATE OR REPLACE FUNCTION check_max_custom_labels()
    RETURNS TRIGGER AS $$
    BEGIN
      IF (SELECT COUNT(*) FROM whatsapp_labels_custom 
          WHERE user_id = NEW.user_id AND is_active = true) >= 6 THEN
        RAISE EXCEPTION 'No puedes crear más de 6 etiquetas personalizadas';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    RAISE NOTICE '✅ Función check_max_custom_labels() creada';
  ELSE
    RAISE NOTICE '⚠️ Función check_max_custom_labels() ya existe, omitiendo creación';
  END IF;
END $$;

-- Paso 2: Crear trigger
DROP TRIGGER IF EXISTS trigger_max_custom_labels ON whatsapp_labels_custom;
CREATE TRIGGER trigger_max_custom_labels
  BEFORE INSERT ON whatsapp_labels_custom
  FOR EACH ROW
  EXECUTE FUNCTION check_max_custom_labels();

-- Verificación
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trigger_max_custom_labels'
    AND event_object_table = 'whatsapp_labels_custom'
  ) THEN
    RAISE NOTICE '✅ Trigger trigger_max_custom_labels creado correctamente';
  ELSE
    RAISE WARNING '❌ Error al crear trigger trigger_max_custom_labels';
  END IF;
END $$;

-- ============================================
-- RESUMEN FINAL
-- ============================================
SELECT 
    'Triggers migrados' as resumen,
    COUNT(*) as total
FROM information_schema.triggers
WHERE trigger_name IN (
    'trigger_update_warning_counter',
    'trigger_check_conflicting_labels',
    'trigger_max_labels_per_prospecto',
    'trigger_max_custom_labels'
);
