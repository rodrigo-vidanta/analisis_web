-- ============================================
-- FUNCIÓN MEJORADA CON LOGGING PARA DEBUG
-- ============================================
-- Esta versión incluye manejo de errores y logging

CREATE OR REPLACE FUNCTION create_message_notifications_batch(
  p_user_ids UUID[],
  p_message_id UUID,
  p_conversation_id UUID,
  p_prospect_id UUID,
  p_customer_name VARCHAR,
  p_customer_phone VARCHAR,
  p_message_preview TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_inserted_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Validar que el array no esté vacío
  IF array_length(p_user_ids, 1) IS NULL OR array_length(p_user_ids, 1) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Array de user_ids vacío',
      'inserted', 0
    );
  END IF;

  -- Crear notificación para cada usuario en el array
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    BEGIN
      INSERT INTO user_notifications (
        user_id,
        notification_type,
        module,
        message_id,
        conversation_id,
        prospect_id,
        customer_name,
        customer_phone,
        message_preview,
        is_read,
        is_muted
      ) VALUES (
        v_user_id,
        'new_message',
        'live-chat',
        p_message_id,
        p_conversation_id,
        p_prospect_id,
        p_customer_name,
        p_customer_phone,
        p_message_preview,
        false,
        false
      );
      
      v_inserted_count := v_inserted_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_errors := array_append(v_errors, format('Usuario %s: %s', v_user_id, SQLERRM));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'inserted', v_inserted_count,
    'errors', v_error_count,
    'error_details', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON FUNCTION create_message_notifications_batch IS 'Crea notificaciones de mensaje nuevo para una lista de usuarios (versión con logging para debug)';

