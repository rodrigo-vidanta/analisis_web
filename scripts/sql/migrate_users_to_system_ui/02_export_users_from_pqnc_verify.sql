-- ============================================
-- VERIFICAR ESTRUCTURA DE TABLAS EN PQNC_QA
-- Base de datos: PQNC_QA (hmmfuhqgvsehkizlfzga.supabase.co)
-- ============================================
-- 
-- Este script primero verifica qué columnas existen en cada tabla
-- antes de intentar exportar los datos
-- ============================================

-- ============================================
-- PASO 1: VERIFICAR ESTRUCTURA DE auth_roles
-- ============================================
SELECT 
  'auth_roles' as tabla,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'auth_roles'
ORDER BY ordinal_position;

-- ============================================
-- PASO 2: VERIFICAR ESTRUCTURA DE auth_users
-- ============================================
SELECT 
  'auth_users' as tabla,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'auth_users'
ORDER BY ordinal_position;

-- ============================================
-- PASO 3: VERIFICAR ESTRUCTURA DE auth_permissions
-- ============================================
SELECT 
  'auth_permissions' as tabla,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'auth_permissions'
ORDER BY ordinal_position;

-- ============================================
-- PASO 4: VERIFICAR ESTRUCTURA DE auth_user_permissions
-- ============================================
SELECT 
  'auth_user_permissions' as tabla,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'auth_user_permissions'
ORDER BY ordinal_position;

-- ============================================
-- PASO 5: VERIFICAR ESTRUCTURA DE auth_role_permissions
-- ============================================
SELECT 
  'auth_role_permissions' as tabla,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'auth_role_permissions'
ORDER BY ordinal_position;

-- ============================================
-- PASO 6: VERIFICAR SI EXISTEN OTRAS TABLAS RELACIONADAS
-- ============================================
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND (
    table_name LIKE '%user%' 
    OR table_name LIKE '%auth%' 
    OR table_name LIKE '%role%'
    OR table_name LIKE '%permission%'
    OR table_name LIKE '%avatar%'
    OR table_name LIKE '%token%'
    OR table_name LIKE '%session%'
  )
ORDER BY table_name;

