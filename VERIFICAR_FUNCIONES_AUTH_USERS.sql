-- ============================================
-- ANÁLISIS DE FUNCIONES CON REFERENCIAS A auth.users
-- ============================================
-- Fecha: 27 Enero 2026
-- Propósito: Revisar funciones que podrían usar auth.users incorrectamente
-- ============================================

-- 1. Ver código fuente de increment_failed_login
SELECT '=== INCREMENT_FAILED_LOGIN ===' as section;
SELECT pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'increment_failed_login';

-- 2. Ver código fuente de reset_failed_login
SELECT '=== RESET_FAILED_LOGIN ===' as section;
SELECT pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'reset_failed_login';

-- 3. Ver código fuente de update_user_metadata
SELECT '=== UPDATE_USER_METADATA ===' as section;
SELECT pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'update_user_metadata';

-- ============================================
-- VERIFICACIÓN: ¿Qué tabla usan estas funciones?
-- ============================================

-- Buscar referencias en el código
SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%auth.users%' THEN '🔴 USA auth.users (Supabase Auth)'
    WHEN pg_get_functiondef(p.oid) LIKE '%auth_users%' THEN '✅ USA auth_users (Correcto)'
    ELSE '⚠️ No usa ninguna tabla de auth'
  END as tabla_usada,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%auth.users%' THEN 'ACTUALIZAR A auth_users'
    WHEN pg_get_functiondef(p.oid) LIKE '%auth_users%' THEN 'OK - No requiere cambios'
    ELSE 'REVISAR MANUALMENTE'
  END as accion_recomendada
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('increment_failed_login', 'reset_failed_login', 'update_user_metadata')
ORDER BY p.proname;

-- ============================================
-- REFERENCIAS EN OTRAS FUNCIONES
-- ============================================

-- Ver TODAS las funciones que mencionan "auth.users"
SELECT 
  p.proname as function_name,
  'auth.users' as tabla_referenciada,
  'VERIFICAR Y ACTUALIZAR' as estado
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public'
  AND l.lanname = 'plpgsql'
  AND pg_get_functiondef(p.oid) LIKE '%auth.users%'
  AND p.proname NOT LIKE '%audit%' -- Excluir función de auditoría
ORDER BY p.proname;
