-- ============================================
-- FIX FORZADO: Eliminar y recrear is_support_admin
-- ============================================
-- Razón: Existe función duplicada con mismo nombre
-- Solución: DROP explícito y recreación

-- PASO 1: Eliminar AMBAS funciones is_support_admin
DROP FUNCTION IF EXISTS is_support_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_support_admin() CASCADE;

-- PASO 2: Recrear solo la versión CON parámetro (la que usa el trigger)
CREATE OR REPLACE FUNCTION is_support_admin(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles_v2
    WHERE id = user_id_param
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
    AND is_active = true
  );
END;
$$;

COMMENT ON FUNCTION is_support_admin(UUID) IS 'Verifica si un usuario es admin de soporte - FIXED v2: DROP CASCADE + recreación';

-- PASO 3: Recrear get_support_admin_ids (por si usa la función anterior)
CREATE OR REPLACE FUNCTION get_support_admin_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY 
  SELECT id FROM user_profiles_v2
  WHERE role_name IN ('admin', 'administrador_operativo', 'developer')
  AND is_active = true;
END;
$$;

COMMENT ON FUNCTION get_support_admin_ids() IS 'Retorna IDs de usuarios admin de soporte - usa user_profiles_v2';

-- PASO 4: Tests de validación
DO $$
DECLARE
  test_result BOOLEAN;
  admin_count INT;
BEGIN
  -- Test 1: is_support_admin con usuario admin (Samuel)
  SELECT is_support_admin('e8ced62c-3fd0-4328-b61a-a59ebea2e877'::uuid) INTO test_result;
  
  IF test_result THEN
    RAISE NOTICE '✅ is_support_admin(UUID) funciona correctamente';
  ELSE
    RAISE WARNING '⚠️ is_support_admin(UUID) retornó FALSE para Samuel (verificar)';
  END IF;

  -- Test 2: get_support_admin_ids
  SELECT COUNT(*) INTO admin_count FROM get_support_admin_ids();
  RAISE NOTICE '✅ get_support_admin_ids() retorna % admins', admin_count;
END $$;

-- PASO 5: Verificar que solo existe UNA función is_support_admin
SELECT 
  p.proname,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) LIKE '%auth_users%' as usa_auth_users_roto
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'is_support_admin';
