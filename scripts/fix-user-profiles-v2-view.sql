-- ============================================
-- FIX: Crear/Actualizar vista user_profiles_v2
-- ============================================
-- 
-- Propósito: Asegurar que la vista user_profiles_v2 existe
-- y tiene los permisos correctos para funcionar con anon_key
--
-- Fecha: 2026-01-22
-- Razón: Módulo de programación no mostraba llamadas después
--        de la migración a auth.users nativo del 2026-01-20
--
-- ============================================

-- 1. Verificar si la vista existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles_v2'
  ) THEN
    RAISE NOTICE 'Vista user_profiles_v2 NO existe - Se creará';
  ELSE
    RAISE NOTICE 'Vista user_profiles_v2 existe - Se actualizará';
  END IF;
END $$;

-- 2. Crear o reemplazar la vista
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
  COALESCE((au.raw_user_meta_data->>'is_operativo')::BOOLEAN, false) as is_operativo,
  -- Flags de conveniencia derivados del rol o metadata
  COALESCE((au.raw_user_meta_data->>'is_coordinator')::BOOLEAN, ar.name = 'coordinador') as is_coordinator,
  COALESCE((au.raw_user_meta_data->>'is_ejecutivo')::BOOLEAN, ar.name = 'ejecutivo') as is_ejecutivo,
  COALESCE((au.raw_user_meta_data->>'has_backup')::BOOLEAN, false) as has_backup,
  (au.raw_user_meta_data->>'backup_id')::UUID as backup_id,
  COALESCE((au.raw_user_meta_data->>'telefono_original')::TEXT, '') as telefono_original,
  COALESCE((au.raw_user_meta_data->>'id_colaborador')::TEXT, '') as id_colaborador,
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

-- 3. Otorgar permisos
-- IMPORTANTE: La vista necesita acceso de anon para que el frontend pueda consultarla
GRANT SELECT ON public.user_profiles_v2 TO anon;
GRANT SELECT ON public.user_profiles_v2 TO authenticated;
GRANT SELECT ON public.user_profiles_v2 TO service_role;

-- 4. Comentario de documentación
COMMENT ON VIEW public.user_profiles_v2 IS 
  'Vista segura de perfiles de usuario - Lee de auth.users + auth_roles. ' ||
  'NO incluye password_hash. Usada por scheduledCallsService y otros servicios. ' ||
  'Campos incluidos: email, full_name, first_name, last_name, phone, department, position, ' ||
  'role_id, coordinacion_id, is_active, is_operativo, id_dynamics, etc. ' ||
  'Creada: 2026-01-20. Actualizada: 2026-01-22 (fix permisos + department/position).';

-- 5. Verificación
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.user_profiles_v2;
  RAISE NOTICE '✅ Vista user_profiles_v2 creada/actualizada exitosamente';
  RAISE NOTICE '📊 Total de usuarios en la vista: %', v_count;
END $$;

-- 6. Test de consulta (para verificar que funciona)
SELECT 
  id,
  email,
  full_name,
  phone,
  department,
  position,
  role_name,
  is_active
FROM public.user_profiles_v2
WHERE is_active = true
LIMIT 5;
