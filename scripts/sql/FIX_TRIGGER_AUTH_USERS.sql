-- ============================================
-- FIX DEFINITIVO: Reemplazar auth_users → user_profiles_v2 
-- en funciones de soporte de tickets
-- ============================================
-- Fecha: 02-02-2026
-- Razón: Tabla auth_users fue eliminada en migración de BD unificada
-- Reemplazo: Usar user_profiles_v2 (tiene role_name en lugar de role_id)
-- ============================================

-- PASO 1: Corregir is_support_admin()
-- Problema: Usaba auth_users.role_id
-- Solución: Usar user_profiles_v2.role_name
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

COMMENT ON FUNCTION is_support_admin(UUID) IS 'Verifica si un usuario es admin de soporte - FIXED: usa user_profiles_v2';

-- PASO 2: Corregir get_support_admin_ids()
-- Problema: Usaba auth_users.role_id
-- Solución: Usar user_profiles_v2.role_name
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

COMMENT ON FUNCTION get_support_admin_ids() IS 'Retorna IDs de usuarios admin de soporte - FIXED: usa user_profiles_v2';

-- PASO 3: Verificar que las funciones existen y funcionan
DO $$
DECLARE
  test_result BOOLEAN;
  admin_count INT;
BEGIN
  -- Test 1: is_support_admin con usuario admin conocido (Samuel)
  SELECT is_support_admin('e8ced62c-3fd0-4328-b61a-a59ebea2e877'::uuid) INTO test_result;
  
  IF test_result THEN
    RAISE NOTICE '✅ Función is_support_admin() funciona correctamente';
  ELSE
    RAISE WARNING '⚠️ Función is_support_admin() retornó FALSE para usuario admin (verificar datos)';
  END IF;

  -- Test 2: get_support_admin_ids retorna al menos un admin
  SELECT COUNT(*) INTO admin_count FROM get_support_admin_ids();
  
  IF admin_count > 0 THEN
    RAISE NOTICE '✅ Función get_support_admin_ids() retorna % admins', admin_count;
  ELSE
    RAISE WARNING '⚠️ Función get_support_admin_ids() no retorna ningún admin';
  END IF;
END $$;

-- PASO 4: Verificar triggers que usan estas funciones
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE (action_statement LIKE '%is_support_admin%' 
   OR action_statement LIKE '%get_support_admin_ids%')
  AND trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

