-- ============================================
-- SCRIPT DE MIGRACION A SUPABASE AUTH NATIVO
-- ============================================
-- 
-- Fecha: 16 Enero 2026
-- Proyecto: PQNC QA AI Platform
-- Version: 1.0.0
--
-- INSTRUCCIONES:
-- 1. Ejecutar en Supabase SQL Editor (glsmifhkoaifvaegsozd)
-- 2. Ejecutar las secciones en orden
-- 3. Verificar cada paso antes de continuar
-- 4. BACKUP OBLIGATORIO antes de ejecutar
--
-- ============================================

-- ============================================
-- SECCION 1: FUNCIONES DE MIGRACION
-- ============================================

-- 1.1 Funcion para migrar un usuario individual a auth.users
CREATE OR REPLACE FUNCTION public.migrate_user_to_supabase_auth(
  p_email TEXT,
  p_password_hash TEXT,
  p_user_metadata JSONB DEFAULT '{}'::JSONB,
  p_preserve_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_instance_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Usar ID proporcionado o generar uno nuevo
  v_user_id := COALESCE(p_preserve_id, gen_random_uuid());
  
  -- Verificar si el email ya existe en auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = LOWER(p_email)) THEN
    RAISE NOTICE 'Usuario ya existe en auth.users: %', p_email;
    RETURN NULL;
  END IF;
  
  -- Insertar en auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    aud,
    role,
    is_super_admin,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    is_sso_user,
    deleted_at
  ) VALUES (
    v_user_id,
    v_instance_id,
    LOWER(p_email),
    p_password_hash,
    NOW(), -- email confirmado
    p_user_metadata,
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    'authenticated',
    'authenticated',
    false,
    (p_user_metadata->>'phone')::TEXT,
    NULL,
    '',
    '',
    '',
    0,
    NULL,
    '',
    false,
    NULL
  );
  
  -- Insertar identidad en auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    LOWER(p_email),
    'email',
    jsonb_build_object(
      'sub', v_user_id::TEXT,
      'email', LOWER(p_email),
      'email_verified', true,
      'phone_verified', false
    ),
    NOW(),
    NOW(),
    NOW()
  );
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECCION 2: MIGRACION DE USUARIOS
-- ============================================

-- 2.1 Funcion para migrar todos los usuarios activos
CREATE OR REPLACE FUNCTION public.migrate_all_users_to_supabase_auth()
RETURNS TABLE(
  email TEXT,
  old_id UUID,
  new_id UUID,
  status TEXT
) AS $$
DECLARE
  r RECORD;
  v_new_id UUID;
  v_metadata JSONB;
BEGIN
  FOR r IN 
    SELECT * FROM public.auth_users 
    WHERE is_active = true
    ORDER BY created_at ASC
  LOOP
    BEGIN
      -- Construir metadata con todos los campos necesarios
      v_metadata := jsonb_build_object(
        'full_name', COALESCE(r.full_name, ''),
        'first_name', COALESCE(r.first_name, ''),
        'last_name', COALESCE(r.last_name, ''),
        'phone', COALESCE(r.phone, ''),
        'department', COALESCE(r.department, ''),
        'position', COALESCE(r.position, ''),
        'organization', COALESCE(r.organization, 'PQNC'),
        'role_id', r.role_id,
        'coordinacion_id', r.coordinacion_id,
        'is_active', COALESCE(r.is_active, true),
        'is_operativo', COALESCE(r.is_operativo, true),
        'has_backup', COALESCE(r.has_backup, false),
        'backup_id', r.backup_id,
        'backup_phone', r.backup_phone,
        'original_phone', r.original_phone,
        'id_colaborador', r.id_colaborador,
        'id_dynamics', r.id_dynamics,
        'must_change_password', COALESCE(r.must_change_password, false),
        'email_verified', COALESCE(r.email_verified, true),
        'failed_login_attempts', COALESCE(r.failed_login_attempts, 0),
        'locked_until', r.locked_until,
        'legacy_id', r.id,
        'legacy_created_at', r.created_at
      );
      
      -- Migrar usuario preservando el ID original si es posible
      v_new_id := public.migrate_user_to_supabase_auth(
        r.email, 
        r.password_hash, 
        v_metadata,
        r.id -- Preservar ID original
      );
      
      IF v_new_id IS NOT NULL THEN
        email := r.email;
        old_id := r.id;
        new_id := v_new_id;
        status := 'MIGRADO';
        RETURN NEXT;
      ELSE
        email := r.email;
        old_id := r.id;
        new_id := NULL;
        status := 'YA_EXISTE';
        RETURN NEXT;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      email := r.email;
      old_id := r.id;
      new_id := NULL;
      status := 'ERROR: ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECCION 3: VISTA user_profiles
-- ============================================

-- 3.1 Crear vista que extrae datos de auth.users con metadata
CREATE OR REPLACE VIEW public.user_profiles_v2 AS
SELECT 
  au.id,
  au.email,
  COALESCE((au.raw_user_meta_data->>'full_name')::TEXT, '') as full_name,
  COALESCE((au.raw_user_meta_data->>'first_name')::TEXT, '') as first_name,
  COALESCE((au.raw_user_meta_data->>'last_name')::TEXT, '') as last_name,
  COALESCE((au.raw_user_meta_data->>'phone')::TEXT, '') as phone,
  COALESCE((au.raw_user_meta_data->>'department')::TEXT, '') as department,
  COALESCE((au.raw_user_meta_data->>'position')::TEXT, '') as position,
  COALESCE((au.raw_user_meta_data->>'organization')::TEXT, 'PQNC') as organization,
  (au.raw_user_meta_data->>'role_id')::UUID as role_id,
  ar.name as role_name,
  ar.display_name as role_display_name,
  (au.raw_user_meta_data->>'coordinacion_id')::UUID as coordinacion_id,
  COALESCE((au.raw_user_meta_data->>'is_active')::BOOLEAN, true) as is_active,
  COALESCE((au.raw_user_meta_data->>'is_operativo')::BOOLEAN, true) as is_operativo,
  COALESCE((au.raw_user_meta_data->>'has_backup')::BOOLEAN, false) as has_backup,
  (au.raw_user_meta_data->>'backup_id')::UUID as backup_id,
  (au.raw_user_meta_data->>'backup_phone')::TEXT as backup_phone,
  (au.raw_user_meta_data->>'original_phone')::TEXT as original_phone,
  (au.raw_user_meta_data->>'id_colaborador')::TEXT as id_colaborador,
  (au.raw_user_meta_data->>'id_dynamics')::TEXT as id_dynamics,
  COALESCE((au.raw_user_meta_data->>'must_change_password')::BOOLEAN, false) as must_change_password,
  COALESCE((au.raw_user_meta_data->>'email_verified')::BOOLEAN, true) as email_verified,
  COALESCE((au.raw_user_meta_data->>'failed_login_attempts')::INTEGER, 0) as failed_login_attempts,
  (au.raw_user_meta_data->>'locked_until')::TIMESTAMPTZ as locked_until,
  (au.raw_user_meta_data->>'legacy_id')::UUID as legacy_id,
  au.created_at,
  au.updated_at,
  au.last_sign_in_at as last_login
FROM auth.users au
LEFT JOIN public.auth_roles ar ON ar.id = (au.raw_user_meta_data->>'role_id')::UUID
WHERE au.deleted_at IS NULL;

-- ============================================
-- SECCION 4: FUNCIONES HELPER
-- ============================================

-- 4.1 Funcion para obtener el usuario actual desde JWT
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role_id UUID;
  v_role_name TEXT;
BEGIN
  -- Obtener role_id desde el JWT metadata
  v_role_id := (auth.jwt()->'user_metadata'->>'role_id')::UUID;
  
  IF v_role_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Obtener nombre del rol
  SELECT name INTO v_role_name
  FROM public.auth_roles
  WHERE id = v_role_id;
  
  RETURN v_role_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4.2 Funcion para verificar si el usuario actual es admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_current_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4.3 Funcion para obtener coordinacion_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_current_user_coordinacion()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt()->'user_metadata'->>'coordinacion_id')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4.4 Funcion para verificar si el usuario tiene acceso a un prospecto
CREATE OR REPLACE FUNCTION public.user_can_access_prospect(p_prospect_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_user_id UUID;
  v_coordinacion_id UUID;
  v_prospect_coordinacion UUID;
  v_prospect_ejecutivo UUID;
BEGIN
  v_user_id := auth.uid();
  v_role := public.get_current_user_role();
  v_coordinacion_id := public.get_current_user_coordinacion();
  
  -- Admin y administrador_operativo ven todo
  IF v_role IN ('admin', 'administrador_operativo') THEN
    RETURN TRUE;
  END IF;
  
  -- Obtener datos del prospecto
  SELECT coordinacion_id, ejecutivo_id 
  INTO v_prospect_coordinacion, v_prospect_ejecutivo
  FROM public.prospectos
  WHERE id = p_prospect_id;
  
  -- Ejecutivo solo ve sus prospectos
  IF v_role = 'ejecutivo' THEN
    RETURN v_prospect_ejecutivo = v_user_id;
  END IF;
  
  -- Coordinador y supervisor ven prospectos de su coordinacion
  IF v_role IN ('coordinador', 'supervisor') THEN
    RETURN v_prospect_coordinacion = v_coordinacion_id;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4.5 Funcion para actualizar metadata del usuario (usada por Edge Functions)
CREATE OR REPLACE FUNCTION public.update_user_metadata(
  p_user_id UUID,
  p_updates JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_metadata JSONB;
  v_new_metadata JSONB;
BEGIN
  -- Obtener metadata actual
  SELECT raw_user_meta_data INTO v_current_metadata
  FROM auth.users
  WHERE id = p_user_id;
  
  IF v_current_metadata IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Merge con nuevos valores
  v_new_metadata := v_current_metadata || p_updates;
  
  -- Actualizar
  UPDATE auth.users
  SET 
    raw_user_meta_data = v_new_metadata,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.6 Funcion para verificar bloqueo de cuenta
CREATE OR REPLACE FUNCTION public.check_account_locked(p_email TEXT)
RETURNS TABLE(is_locked BOOLEAN, locked_until TIMESTAMPTZ, failed_attempts INTEGER) AS $$
DECLARE
  v_metadata JSONB;
  v_locked_until TIMESTAMPTZ;
  v_failed_attempts INTEGER;
BEGIN
  SELECT raw_user_meta_data INTO v_metadata
  FROM auth.users
  WHERE email = LOWER(p_email);
  
  IF v_metadata IS NULL THEN
    is_locked := FALSE;
    locked_until := NULL;
    failed_attempts := 0;
    RETURN NEXT;
    RETURN;
  END IF;
  
  v_locked_until := (v_metadata->>'locked_until')::TIMESTAMPTZ;
  v_failed_attempts := COALESCE((v_metadata->>'failed_login_attempts')::INTEGER, 0);
  
  is_locked := v_locked_until IS NOT NULL AND v_locked_until > NOW();
  locked_until := v_locked_until;
  failed_attempts := v_failed_attempts;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.7 Funcion para incrementar intentos fallidos
CREATE OR REPLACE FUNCTION public.increment_failed_login(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_current_attempts INTEGER;
  v_updates JSONB;
BEGIN
  SELECT id, COALESCE((raw_user_meta_data->>'failed_login_attempts')::INTEGER, 0)
  INTO v_user_id, v_current_attempts
  FROM auth.users
  WHERE email = LOWER(p_email);
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  v_current_attempts := v_current_attempts + 1;
  
  -- Bloquear despues de 5 intentos
  IF v_current_attempts >= 5 THEN
    v_updates := jsonb_build_object(
      'failed_login_attempts', v_current_attempts,
      'locked_until', (NOW() + INTERVAL '30 minutes')::TEXT
    );
  ELSE
    v_updates := jsonb_build_object(
      'failed_login_attempts', v_current_attempts
    );
  END IF;
  
  RETURN public.update_user_metadata(v_user_id, v_updates);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.8 Funcion para resetear intentos fallidos
CREATE OR REPLACE FUNCTION public.reset_failed_login(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = LOWER(p_email);
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN public.update_user_metadata(v_user_id, jsonb_build_object(
    'failed_login_attempts', 0,
    'locked_until', NULL
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECCION 5: GRANTS Y PERMISOS
-- ============================================

-- Grants para funciones publicas
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_coordinacion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_prospect(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_account_locked(TEXT) TO anon, authenticated;

-- Grants para vista user_profiles_v2
GRANT SELECT ON public.user_profiles_v2 TO authenticated;

-- ============================================
-- SECCION 6: COMANDOS DE EJECUCION
-- ============================================

-- PASO 1: Verificar usuarios a migrar
-- SELECT id, email, full_name, is_active FROM public.auth_users WHERE is_active = true;

-- PASO 2: Ejecutar migracion (DESCOMENTAR CUANDO ESTE LISTO)
-- SELECT * FROM public.migrate_all_users_to_supabase_auth();

-- PASO 3: Verificar migracion
-- SELECT id, email, raw_user_meta_data->>'full_name' as full_name 
-- FROM auth.users 
-- ORDER BY created_at DESC;

-- PASO 4: Probar login con un usuario
-- (Hacer login desde la app)

-- ============================================
-- ROLLBACK (EN CASO DE EMERGENCIA)
-- ============================================

-- Para eliminar usuarios migrados:
-- DELETE FROM auth.identities WHERE provider = 'email';
-- DELETE FROM auth.users WHERE aud = 'authenticated';

-- Para eliminar funciones:
-- DROP FUNCTION IF EXISTS public.migrate_user_to_supabase_auth(TEXT, TEXT, JSONB, UUID);
-- DROP FUNCTION IF EXISTS public.migrate_all_users_to_supabase_auth();
-- DROP VIEW IF EXISTS public.user_profiles_v2;
