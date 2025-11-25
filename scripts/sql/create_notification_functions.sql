-- ============================================
-- FUNCIONES PARA CREAR NOTIFICACIONES
-- ============================================
-- Estas funciones se crean en SYSTEM_UI (donde está user_notifications)
-- Se llaman desde el frontend cuando detecta eventos en tiempo real

-- Función para obtener usuarios que deben recibir notificación de un prospecto
-- NOTA: Esta función necesita acceso a prospectos en analysisSupabase
-- Por ahora, el frontend determinará los usuarios con permisos
CREATE OR REPLACE FUNCTION get_users_for_prospect_notification(p_prospect_id UUID)
RETURNS TABLE(user_id UUID, role_name VARCHAR) AS $$
BEGIN
  RETURN QUERY
  -- Administradores: todos
  SELECT u.id, u.role_name
  FROM auth_users u
  WHERE u.role_name = 'admin'
  
  UNION
  
  -- Ejecutivos: solo si el prospecto está asignado a ellos
  -- NOTA: Esto requiere acceso a prospectos en otra base de datos
  -- Por ahora retornamos vacío, el frontend manejará esto
  SELECT u.id, u.role_name
  FROM auth_users u
  WHERE u.role_name = 'ejecutivo'
  AND EXISTS (
    -- Esta query necesitaría acceso a analysisSupabase.prospectos
    -- Por ahora retornamos todos los ejecutivos, el frontend filtrará
    SELECT 1
  )
  
  UNION
  
  -- Coordinadores: si el prospecto está en su coordinación
  SELECT u.id, u.role_name
  FROM auth_users u
  WHERE u.role_name = 'coordinador'
  AND EXISTS (
    -- Esta query necesitaría acceso a analysisSupabase.prospectos
    -- Por ahora retornamos todos los coordinadores, el frontend filtrará
    SELECT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Función para marcar notificaciones como leídas cuando se marca un mensaje como leído
CREATE OR REPLACE FUNCTION mark_message_notifications_as_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE user_notifications
  SET is_read = true,
      read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
    AND notification_type = 'new_message'
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar notificaciones de llamada como leídas
CREATE OR REPLACE FUNCTION mark_call_notifications_as_read(
  p_call_id VARCHAR,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE user_notifications
  SET is_read = true,
      read_at = NOW()
  WHERE call_id = p_call_id
    AND user_id = p_user_id
    AND notification_type = 'new_call'
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION create_message_notifications_batch IS 'Crea notificaciones de mensaje nuevo para una lista de usuarios (llamada desde frontend)';
COMMENT ON FUNCTION create_call_notifications_batch IS 'Crea notificaciones de llamada nueva para una lista de usuarios (llamada desde frontend)';
COMMENT ON FUNCTION mark_message_notifications_as_read IS 'Marca notificaciones de mensaje como leídas para un usuario específico';
COMMENT ON FUNCTION mark_call_notifications_as_read IS 'Marca notificaciones de llamada como leídas para un usuario específico';
