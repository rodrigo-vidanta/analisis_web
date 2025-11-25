-- ============================================
-- CREAR FUNCIONES FALTANTES DE NOTIFICACIONES
-- ============================================
-- Este script crea solo las funciones que faltan:
-- - create_message_notifications_batch
-- - create_call_notifications_batch

-- Función para crear notificaciones de mensaje nuevo
-- Esta función se llama desde el frontend con los user_ids ya determinados
CREATE OR REPLACE FUNCTION create_message_notifications_batch(
  p_user_ids UUID[],
  p_message_id UUID,
  p_conversation_id UUID,
  p_prospect_id UUID,
  p_customer_name VARCHAR,
  p_customer_phone VARCHAR,
  p_message_preview TEXT
)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Validar que el array no esté vacío
  IF array_length(p_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Crear notificación para cada usuario en el array
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
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
    )
    ON CONFLICT DO NOTHING; -- Evitar duplicados
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear notificaciones de llamada nueva
CREATE OR REPLACE FUNCTION create_call_notifications_batch(
  p_user_ids UUID[],
  p_call_id VARCHAR,
  p_prospect_id UUID,
  p_call_status VARCHAR,
  p_customer_name VARCHAR,
  p_customer_phone VARCHAR
)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Solo crear notificaciones para llamadas activas
  IF p_call_status != 'activa' THEN
    RETURN;
  END IF;

  -- Validar que el array no esté vacío
  IF array_length(p_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  
  -- Crear notificación para cada usuario en el array
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    INSERT INTO user_notifications (
      user_id,
      notification_type,
      module,
      call_id,
      prospect_id,
      customer_name,
      customer_phone,
      call_status,
      is_read,
      is_muted
    ) VALUES (
      v_user_id,
      'new_call',
      'live-monitor',
      p_call_id,
      p_prospect_id,
      p_customer_name,
      p_customer_phone,
      p_call_status,
      false,
      false
    )
    ON CONFLICT DO NOTHING; -- Evitar duplicados
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION create_message_notifications_batch IS 'Crea notificaciones de mensaje nuevo para una lista de usuarios (llamada desde frontend)';
COMMENT ON FUNCTION create_call_notifications_batch IS 'Crea notificaciones de llamada nueva para una lista de usuarios (llamada desde frontend)';

-- Verificar que las funciones se crearon correctamente
SELECT 
  '✅ Función creada: create_message_notifications_batch' as status
WHERE EXISTS (
  SELECT 1 FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name = 'create_message_notifications_batch'
);

SELECT 
  '✅ Función creada: create_call_notifications_batch' as status
WHERE EXISTS (
  SELECT 1 FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name = 'create_call_notifications_batch'
);

