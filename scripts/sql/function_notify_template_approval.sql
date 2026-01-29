-- Función para notificar aprobación de plantilla
-- Esta función se ejecuta con el trigger y tiene acceso SECURITY DEFINER
CREATE OR REPLACE FUNCTION notify_template_approval()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suggestion whatsapp_template_suggestions%ROWTYPE;
BEGIN
  -- Solo actuar cuando cambia de cualquier estado a APPROVED
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    
    -- Buscar la sugerencia relacionada con esta plantilla
    SELECT * INTO v_suggestion
    FROM whatsapp_template_suggestions
    WHERE imported_to_template_id = NEW.id
    LIMIT 1;
    
    -- Si existe una sugerencia relacionada, crear notificación
    IF FOUND AND v_suggestion.suggested_by IS NOT NULL THEN
      
      -- Insertar notificación (el trigger tiene permisos de service_role)
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
        'campaigns',
        NEW.name,
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

COMMENT ON FUNCTION notify_template_approval IS 
  'Crea notificación cuando una plantilla vinculada a una sugerencia es aprobada en uChat';
