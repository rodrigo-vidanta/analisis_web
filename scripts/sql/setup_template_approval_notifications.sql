-- ============================================
-- NOTIFICACIONES DE APROBACIÓN DE PLANTILLAS
-- ============================================
-- Script para agregar soporte de notificaciones cuando se aprueban plantillas sugeridas
-- Ejecutar en: PQNC_AI (glsmifhkoaifvaegsozd)

-- 1. Actualizar el constraint de notification_type para incluir 'template_approved'
ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_notification_type_check;
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_notification_type_check 
  CHECK (notification_type IN ('new_message', 'new_call', 'template_approved'));

-- 2. Crear función para notificar aprobación de plantilla
CREATE OR REPLACE FUNCTION notify_template_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_suggestion whatsapp_template_suggestions%ROWTYPE;
  v_user_name TEXT;
BEGIN
  -- Solo actuar cuando cambia de cualquier estado a APPROVED
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    
    -- Buscar la sugerencia relacionada con esta plantilla
    SELECT * INTO v_suggestion
    FROM whatsapp_template_suggestions
    WHERE imported_to_template_id = NEW.id
    LIMIT 1;
    
    -- Si existe una sugerencia relacionada, crear notificación para el usuario que la sugirió
    IF FOUND AND v_suggestion.suggested_by IS NOT NULL THEN
      
      -- Obtener el nombre del usuario (opcional, para el mensaje)
      SELECT COALESCE(full_name, email, 'Usuario')
      INTO v_user_name
      FROM auth_users
      WHERE id = v_suggestion.suggested_by;
      
      -- Insertar notificación
      INSERT INTO user_notifications (
        user_id,
        notification_type,
        module,
        customer_name,
        message_preview,
        metadata,
        is_read,
        created_at
      ) VALUES (
        v_suggestion.suggested_by,
        'template_approved',
        'campaigns', -- Nuevo módulo para campañas
        NEW.name, -- Nombre de la plantilla aprobada
        'Tu plantilla "' || NEW.name || '" fue aprobada y ya está disponible para usar',
        jsonb_build_object(
          'template_id', NEW.id,
          'template_name', NEW.name,
          'suggestion_id', v_suggestion.id,
          'approved_at', NOW(),
          'uchat_status', NEW.status
        ),
        false,
        NOW()
      );
      
      RAISE NOTICE 'Notificación creada para usuario % sobre plantilla %', v_suggestion.suggested_by, NEW.name;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear trigger en whatsapp_templates
DROP TRIGGER IF EXISTS trigger_notify_template_approval ON whatsapp_templates;
CREATE TRIGGER trigger_notify_template_approval
  AFTER UPDATE OF status ON whatsapp_templates
  FOR EACH ROW
  WHEN (NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED'))
  EXECUTE FUNCTION notify_template_approval();

-- 4. Actualizar el constraint de module para incluir 'campaigns'
ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_module_check;
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_module_check 
  CHECK (module IN ('live-chat', 'live-monitor', 'campaigns'));

-- 5. Comentarios
COMMENT ON CONSTRAINT user_notifications_notification_type_check ON user_notifications IS 
  'Tipos de notificación: new_message, new_call, template_approved';
COMMENT ON CONSTRAINT user_notifications_module_check ON user_notifications IS 
  'Módulos: live-chat, live-monitor, campaigns';

-- ============================================
-- FUNCIÓN PARA DISPARAR NOTIFICACIONES MANUALES
-- ============================================
-- Crea notificaciones para todas las plantillas aprobadas hoy que tienen sugerencias

CREATE OR REPLACE FUNCTION create_manual_template_notifications(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  user_id UUID,
  notification_created BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO user_notifications (
    user_id,
    notification_type,
    module,
    customer_name,
    message_preview,
    metadata,
    is_read,
    created_at
  )
  SELECT 
    wts.suggested_by AS user_id,
    'template_approved'::VARCHAR(50) AS notification_type,
    'campaigns'::VARCHAR(50) AS module,
    wt.name AS customer_name,
    'Tu plantilla "' || wt.name || '" fue aprobada y ya está disponible para usar' AS message_preview,
    jsonb_build_object(
      'template_id', wt.id,
      'template_name', wt.name,
      'suggestion_id', wts.id,
      'approved_at', wt.updated_at,
      'uchat_status', wt.status,
      'manual_notification', true
    ) AS metadata,
    false AS is_read,
    NOW() AS created_at
  FROM whatsapp_templates wt
  INNER JOIN whatsapp_template_suggestions wts 
    ON wts.imported_to_template_id = wt.id
  WHERE wt.status = 'APPROVED'
    AND wt.created_at >= p_start_date
    AND wts.suggested_by IS NOT NULL
    -- Evitar duplicados: solo si no existe notificación previa
    AND NOT EXISTS (
      SELECT 1 
      FROM user_notifications un 
      WHERE un.user_id = wts.suggested_by
        AND un.notification_type = 'template_approved'
        AND un.metadata->>'template_id' = wt.id::text
    )
  RETURNING 
    (metadata->>'template_id')::UUID AS template_id,
    customer_name AS template_name,
    user_id,
    true AS notification_created;
END;
$$ LANGUAGE plpgsql;

-- Comentario
COMMENT ON FUNCTION create_manual_template_notifications IS 
  'Crea notificaciones para plantillas aprobadas. Uso: SELECT * FROM create_manual_template_notifications(CURRENT_DATE);';

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver notificaciones de plantillas aprobadas
SELECT 
  un.id,
  un.user_id,
  au.full_name AS usuario,
  un.customer_name AS plantilla,
  un.message_preview,
  un.is_read,
  un.created_at,
  un.metadata
FROM user_notifications un
LEFT JOIN auth_users au ON au.id = un.user_id
WHERE un.notification_type = 'template_approved'
ORDER BY un.created_at DESC;

-- Ver plantillas aprobadas hoy con sugerencias
SELECT 
  wt.id,
  wt.name,
  wt.status,
  wt.created_at,
  wts.id AS suggestion_id,
  wts.suggested_by,
  au.full_name AS usuario_sugerente
FROM whatsapp_templates wt
INNER JOIN whatsapp_template_suggestions wts 
  ON wts.imported_to_template_id = wt.id
LEFT JOIN auth_users au ON au.id = wts.suggested_by
WHERE wt.status = 'APPROVED'
  AND wt.created_at >= CURRENT_DATE
ORDER BY wt.created_at DESC;
