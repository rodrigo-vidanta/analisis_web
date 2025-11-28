-- ============================================
-- CREAR FUNCIÓN RPC create_admin_message
-- Base: zbylezfyagwrxoecioup.supabase.co (SystemUI)
-- Ejecutar en SQL Editor de Supabase SystemUI
-- ============================================

-- Eliminar función existente si existe
DROP FUNCTION IF EXISTS create_admin_message CASCADE;
DROP FUNCTION IF EXISTS insert_admin_message CASCADE;

-- Crear función create_admin_message que retorna JSONB
CREATE OR REPLACE FUNCTION create_admin_message(
  p_category VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT,
  p_sender_id UUID DEFAULT NULL,
  p_sender_email VARCHAR(255) DEFAULT NULL,
  p_recipient_role VARCHAR(50) DEFAULT 'admin',
  p_priority VARCHAR(20) DEFAULT 'normal',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_result admin_messages;
BEGIN
  INSERT INTO admin_messages (
    category, title, message, sender_id, sender_email,
    recipient_role, priority, metadata, status
  ) VALUES (
    p_category, p_title, p_message, p_sender_id, p_sender_email,
    p_recipient_role, p_priority, p_metadata, 'pending'
  ) RETURNING * INTO v_result;
  
  RETURN row_to_json(v_result)::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear función insert_admin_message con parámetros TEXT (para evitar problemas de cache)
CREATE OR REPLACE FUNCTION insert_admin_message(
  p_category TEXT,
  p_title TEXT,
  p_message TEXT,
  p_sender_id TEXT DEFAULT NULL,
  p_sender_email TEXT DEFAULT NULL,
  p_recipient_role TEXT DEFAULT 'admin',
  p_priority TEXT DEFAULT 'normal',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_result admin_messages;
BEGIN
  INSERT INTO admin_messages (
    category, title, message, sender_id, sender_email,
    recipient_role, priority, metadata, status
  ) VALUES (
    p_category, p_title, p_message, 
    CASE WHEN p_sender_id = '' OR p_sender_id IS NULL THEN NULL ELSE p_sender_id::UUID END,
    CASE WHEN p_sender_email = '' THEN NULL ELSE p_sender_email END,
    p_recipient_role, p_priority, p_metadata, 'pending'
  ) RETURNING * INTO v_result;
  
  RETURN row_to_json(v_result)::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION create_admin_message IS 'Crea un mensaje de administrador y retorna el mensaje creado como JSONB';
COMMENT ON FUNCTION insert_admin_message IS 'Crea un mensaje de administrador con parámetros TEXT (alternativa para evitar problemas de cache)';

-- Verificar que las funciones existen
SELECT 
    '✅ Funciones creadas' as resultado,
    proname as funcion,
    pg_get_function_arguments(oid) as argumentos
FROM pg_proc 
WHERE proname IN ('create_admin_message', 'insert_admin_message')
ORDER BY proname;

