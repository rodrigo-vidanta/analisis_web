-- ============================================
-- SCRIPT DE PRUEBA PARA MIGRACION A SUPABASE AUTH
-- ============================================
-- 
-- Fecha: 16 Enero 2026
-- Proyecto: PQNC QA AI Platform
--
-- INSTRUCCIONES:
-- 1. Ejecutar ANTES de la migración real
-- 2. Verificar que todas las pruebas pasen
-- 3. Si alguna prueba falla, revisar y corregir
--
-- ============================================

-- ============================================
-- TEST 1: Verificar estructura de auth_users
-- ============================================
DO $$
DECLARE
  v_count INT;
BEGIN
  -- Verificar que auth_users existe y tiene datos
  SELECT COUNT(*) INTO v_count FROM public.auth_users WHERE is_active = true;
  
  IF v_count = 0 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: No hay usuarios activos en auth_users';
  END IF;
  
  RAISE NOTICE 'TEST 1 PASSED: % usuarios activos encontrados', v_count;
END $$;

-- ============================================
-- TEST 2: Verificar que todos los usuarios tienen password_hash
-- ============================================
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.auth_users 
  WHERE is_active = true 
    AND (password_hash IS NULL OR password_hash = '');
  
  IF v_count > 0 THEN
    RAISE WARNING 'TEST 2 WARNING: % usuarios activos sin password_hash', v_count;
  ELSE
    RAISE NOTICE 'TEST 2 PASSED: Todos los usuarios activos tienen password_hash';
  END IF;
END $$;

-- ============================================
-- TEST 3: Verificar que todos los usuarios tienen email único
-- ============================================
DO $$
DECLARE
  v_duplicates INT;
BEGIN
  SELECT COUNT(*) INTO v_duplicates
  FROM (
    SELECT LOWER(email), COUNT(*) as cnt
    FROM public.auth_users
    WHERE is_active = true
    GROUP BY LOWER(email)
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF v_duplicates > 0 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: % emails duplicados encontrados', v_duplicates;
  END IF;
  
  RAISE NOTICE 'TEST 3 PASSED: No hay emails duplicados';
END $$;

-- ============================================
-- TEST 4: Verificar que auth_roles existe y tiene datos
-- ============================================
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.auth_roles;
  
  IF v_count = 0 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: No hay roles en auth_roles';
  END IF;
  
  RAISE NOTICE 'TEST 4 PASSED: % roles encontrados', v_count;
END $$;

-- ============================================
-- TEST 5: Verificar que todos los usuarios tienen role_id válido
-- ============================================
DO $$
DECLARE
  v_invalid INT;
BEGIN
  SELECT COUNT(*) INTO v_invalid
  FROM public.auth_users u
  LEFT JOIN public.auth_roles r ON u.role_id = r.id
  WHERE u.is_active = true AND r.id IS NULL;
  
  IF v_invalid > 0 THEN
    RAISE EXCEPTION 'TEST 5 FAILED: % usuarios con role_id inválido', v_invalid;
  END IF;
  
  RAISE NOTICE 'TEST 5 PASSED: Todos los usuarios tienen role_id válido';
END $$;

-- ============================================
-- TEST 6: Verificar formato de password_hash (bcrypt)
-- ============================================
DO $$
DECLARE
  v_invalid INT;
BEGIN
  SELECT COUNT(*) INTO v_invalid
  FROM public.auth_users
  WHERE is_active = true
    AND password_hash IS NOT NULL
    AND password_hash != ''
    AND password_hash NOT LIKE '$2%'; -- bcrypt hashes empiezan con $2a$, $2b$, etc.
  
  IF v_invalid > 0 THEN
    RAISE WARNING 'TEST 6 WARNING: % usuarios con password_hash que no parece bcrypt', v_invalid;
  ELSE
    RAISE NOTICE 'TEST 6 PASSED: Todos los password_hash parecen ser bcrypt válido';
  END IF;
END $$;

-- ============================================
-- TEST 7: Verificar que auth.users no tiene colisión de emails
-- ============================================
DO $$
DECLARE
  v_existing INT;
BEGIN
  SELECT COUNT(*) INTO v_existing
  FROM auth.users au
  JOIN public.auth_users pu ON LOWER(au.email) = LOWER(pu.email)
  WHERE pu.is_active = true;
  
  IF v_existing > 0 THEN
    RAISE WARNING 'TEST 7 WARNING: % usuarios ya existen en auth.users (seran omitidos en migracion)', v_existing;
  ELSE
    RAISE NOTICE 'TEST 7 PASSED: No hay colision de emails con auth.users existente';
  END IF;
END $$;

-- ============================================
-- TEST 8: Mostrar resumen de usuarios a migrar
-- ============================================
DO $$
DECLARE
  v_total INT;
  v_by_role RECORD;
BEGIN
  SELECT COUNT(*) INTO v_total 
  FROM public.auth_users 
  WHERE is_active = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN DE MIGRACION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total usuarios a migrar: %', v_total;
  RAISE NOTICE '';
  
  RAISE NOTICE 'Usuarios por rol:';
  FOR v_by_role IN
    SELECT r.name as role_name, COUNT(*) as count
    FROM public.auth_users u
    JOIN public.auth_roles r ON u.role_id = r.id
    WHERE u.is_active = true
    GROUP BY r.name
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  - %: %', v_by_role.role_name, v_by_role.count;
  END LOOP;
  
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- QUERIES DE VERIFICACIÓN MANUAL
-- ============================================

-- Ver usuarios que serán migrados
-- SELECT id, email, full_name, role_id, is_active 
-- FROM public.auth_users 
-- WHERE is_active = true 
-- ORDER BY full_name;

-- Ver roles disponibles
-- SELECT id, name, display_name FROM public.auth_roles ORDER BY name;

-- Verificar si hay usuarios en auth.users
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;
