-- ============================================
-- FUNCIÓN PARA CAMBIAR CONTRASEÑA DE USUARIO
-- Base de datos: zbylezfyagwrxoecioup.supabase.co (SystemUI)
-- Propósito: Permitir cambio de contraseña con hash seguro
-- ============================================

-- Eliminar función si existe
DROP FUNCTION IF EXISTS change_user_password(UUID, TEXT);

-- Función para cambiar contraseña de usuario
CREATE FUNCTION change_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS JSON AS $$
DECLARE
  v_password_hash TEXT;
BEGIN
  -- Generar hash de la contraseña usando crypt (bcrypt)
  -- Nota: Asegúrate de que la extensión pgcrypto esté habilitada
  v_password_hash := crypt(p_new_password, gen_salt('bf', 10));

  -- Actualizar contraseña del usuario
  UPDATE auth_users
  SET 
    password_hash = v_password_hash,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Verificar si se actualizó correctamente
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuario no encontrado'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Contraseña actualizada exitosamente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario para documentación
COMMENT ON FUNCTION change_user_password(UUID, TEXT) IS 
'Cambia la contraseña de un usuario. Requiere extensión pgcrypto habilitada.';

