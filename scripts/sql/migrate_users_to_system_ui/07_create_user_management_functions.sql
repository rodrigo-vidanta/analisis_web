-- ============================================
-- CREAR FUNCIONES RPC DE GESTIÓN DE USUARIOS EN SYSTEM_UI
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================
-- 
-- Este script crea las funciones RPC necesarias para gestión de usuarios
-- que son usadas por UserManagement.tsx
-- ============================================

-- ============================================
-- FUNCIÓN 1: create_user_with_role
-- ============================================
CREATE OR REPLACE FUNCTION create_user_with_role(
  user_email TEXT,
  user_password TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  user_role_id UUID,
  user_phone TEXT DEFAULT NULL,
  user_department TEXT DEFAULT NULL,
  user_position TEXT DEFAULT NULL,
  user_is_active BOOLEAN DEFAULT true
)
RETURNS TABLE(user_id UUID, email TEXT, full_name TEXT) AS $$
DECLARE
  v_user_id UUID;
  v_password_hash TEXT;
  v_full_name TEXT;
BEGIN
  -- Verificar que el email no existe (usar alias de tabla para evitar ambigüedad)
  IF EXISTS (SELECT 1 FROM auth_users au WHERE au.email = create_user_with_role.user_email) THEN
    RAISE EXCEPTION 'El email % ya está registrado', user_email;
  END IF;

  -- Verificar que el rol existe
  IF NOT EXISTS (SELECT 1 FROM auth_roles ar WHERE ar.id = create_user_with_role.user_role_id) THEN
    RAISE EXCEPTION 'El rol especificado no existe';
  END IF;

  -- Hash de la contraseña usando pgcrypto
  v_password_hash := crypt(create_user_with_role.user_password, gen_salt('bf'));

  -- Construir nombre completo
  v_full_name := TRIM(create_user_with_role.user_first_name || ' ' || COALESCE(create_user_with_role.user_last_name, ''));

  -- Crear usuario
  INSERT INTO auth_users (
    email,
    password_hash,
    full_name,
    first_name,
    last_name,
    phone,
    role_id,
    is_active,
    email_verified,
    created_at,
    updated_at
  )
  VALUES (
    create_user_with_role.user_email,
    v_password_hash,
    v_full_name,
    create_user_with_role.user_first_name,
    create_user_with_role.user_last_name,
    create_user_with_role.user_phone,
    create_user_with_role.user_role_id,
    create_user_with_role.user_is_active,
    false, -- email_verified por defecto false
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;

  -- Retornar datos del usuario creado
  RETURN QUERY SELECT v_user_id, create_user_with_role.user_email, v_full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN 2: change_user_password
-- ============================================
CREATE OR REPLACE FUNCTION change_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_password_hash TEXT;
BEGIN
  -- Verificar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM auth_users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  -- Hash de la nueva contraseña
  v_password_hash := crypt(p_new_password, gen_salt('bf'));

  -- Actualizar contraseña
  UPDATE auth_users
  SET 
    password_hash = v_password_hash,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN 3: upload_user_avatar
-- ============================================
CREATE OR REPLACE FUNCTION upload_user_avatar(
  p_user_id UUID,
  p_avatar_url TEXT,
  p_filename TEXT DEFAULT NULL,
  p_file_size INTEGER DEFAULT NULL,
  p_mime_type TEXT DEFAULT NULL,
  p_file_name TEXT DEFAULT NULL  -- Alias para compatibilidad
)
RETURNS BOOLEAN AS $$
DECLARE
  v_filename TEXT;
BEGIN
  -- Verificar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM auth_users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  -- Usar p_file_name si está disponible, sino p_filename
  v_filename := COALESCE(p_file_name, p_filename);

  -- Si p_avatar_url es NULL, eliminar avatar existente
  IF p_avatar_url IS NULL THEN
    DELETE FROM user_avatars WHERE user_id = p_user_id;
    RETURN TRUE;
  END IF;

  -- Eliminar avatar existente primero (puede haber múltiples)
  DELETE FROM user_avatars WHERE user_id = p_user_id;

  -- Insertar nuevo avatar
  INSERT INTO user_avatars (
    user_id,
    avatar_url,
    filename,
    file_size,
    mime_type,
    uploaded_at
  )
  VALUES (
    p_user_id,
    p_avatar_url,
    v_filename,
    p_file_size,
    p_mime_type,
    NOW()
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN 4: delete_user_complete
-- ============================================
CREATE OR REPLACE FUNCTION delete_user_complete(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM auth_users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  -- Eliminar relaciones primero (en orden de dependencias)
  DELETE FROM auth_user_permissions WHERE user_id = p_user_id;
  DELETE FROM auth_sessions WHERE user_id = p_user_id;
  DELETE FROM user_avatars WHERE user_id = p_user_id;
  
  -- Eliminar usuario (esto debería eliminar cascada si hay otras relaciones)
  DELETE FROM auth_users WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN 5: configure_evaluator_analysis_permissions
-- ============================================
CREATE OR REPLACE FUNCTION configure_evaluator_analysis_permissions(
  p_target_user_id UUID,
  p_natalia_access BOOLEAN DEFAULT false,
  p_pqnc_access BOOLEAN DEFAULT false,
  p_live_monitor_access BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verificar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM auth_users WHERE id = p_target_user_id) THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  -- Eliminar permisos de análisis existentes para este usuario
  DELETE FROM auth_user_permissions
  WHERE user_id = p_target_user_id
    AND module = 'analisis'
    AND sub_module IN ('natalia', 'pqnc', 'live_monitor');

  -- Insertar nuevos permisos según los parámetros
  IF p_natalia_access THEN
    INSERT INTO auth_user_permissions (user_id, permission_name, module, sub_module)
    VALUES (p_target_user_id, 'analisis.natalia.view', 'analisis', 'natalia')
    ON CONFLICT DO NOTHING;
  END IF;

  IF p_pqnc_access THEN
    INSERT INTO auth_user_permissions (user_id, permission_name, module, sub_module)
    VALUES (p_target_user_id, 'analisis.pqnc.view', 'analisis', 'pqnc')
    ON CONFLICT DO NOTHING;
  END IF;

  IF p_live_monitor_access THEN
    INSERT INTO auth_user_permissions (user_id, permission_name, module, sub_module)
    VALUES (p_target_user_id, 'analisis.live_monitor.view', 'analisis', 'live_monitor')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'user_id', p_target_user_id,
    'permissions', jsonb_build_object(
      'natalia', p_natalia_access,
      'pqnc', p_pqnc_access,
      'live_monitor', p_live_monitor_access
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICACIÓN
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Funciones de gestión de usuarios creadas en System_UI';
  RAISE NOTICE '   - create_user_with_role';
  RAISE NOTICE '   - change_user_password';
  RAISE NOTICE '   - upload_user_avatar';
  RAISE NOTICE '   - delete_user_complete';
  RAISE NOTICE '   - configure_evaluator_analysis_permissions';
END $$;

