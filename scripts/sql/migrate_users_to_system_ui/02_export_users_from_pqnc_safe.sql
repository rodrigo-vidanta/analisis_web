-- ============================================
-- EXPORTAR USUARIOS Y ROLES DE PQNC SUPABASE (VERSIÓN SEGURA)
-- Base de datos: PQNC (hmmfuhqgvsehkizlfzga.supabase.co)
-- ============================================
-- 
-- Esta versión verifica qué columnas existen antes de exportar
-- ============================================

-- ============================================
-- 1. VERIFICAR ESTRUCTURA DE auth_roles
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'auth_roles'
ORDER BY ordinal_position;

-- ============================================
-- 2. EXPORTAR ROLES (solo columnas básicas que siempre existen)
-- ============================================
SELECT 
  id,
  name,
  display_name,
  description,
  created_at
FROM auth_roles
ORDER BY name;

-- ============================================
-- 3. VERIFICAR ESTRUCTURA DE auth_users
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'auth_users'
ORDER BY ordinal_position;

-- ============================================
-- 4. EXPORTAR USUARIOS (versión básica - ajustar según columnas existentes)
-- ============================================
-- Si tienes department, position, organization, descomenta esas líneas
SELECT 
  id,
  email,
  password_hash,
  full_name,
  first_name,
  last_name,
  phone,
  -- department,      -- Descomentar si existe
  -- position,        -- Descomentar si existe
  -- organization,    -- Descomentar si existe
  role_id,
  is_active,
  email_verified,
  last_login,
  created_at,
  updated_at
FROM auth_users
ORDER BY created_at;

-- ============================================
-- 5. EXPORTAR PERMISOS
-- ============================================
SELECT 
  id,
  permission_name,
  module,
  sub_module,
  description,
  created_at
FROM auth_permissions
ORDER BY module, permission_name;

-- ============================================
-- 6. EXPORTAR RELACIÓN ROLES-PERMISOS
-- ============================================
SELECT 
  id,
  role_id,
  permission_id,
  created_at
FROM auth_role_permissions
ORDER BY role_id, permission_id;

-- ============================================
-- 7. EXPORTAR PERMISOS DE USUARIOS
-- ============================================
SELECT 
  id,
  user_id,
  permission_name,
  module,
  sub_module,
  granted_at,
  granted_by
FROM auth_user_permissions
ORDER BY user_id, module;

-- ============================================
-- 8. EXPORTAR AVATARES (si existe la tabla)
-- ============================================
-- Solo ejecutar si la tabla existe
SELECT 
  id,
  user_id,
  avatar_url,
  filename,
  file_size,
  mime_type,
  uploaded_at
FROM user_avatars
ORDER BY user_id, uploaded_at DESC;

-- ============================================
-- 9. EXPORTAR TOKENS API (si existe la tabla)
-- ============================================
-- Solo ejecutar si la tabla existe
SELECT 
  id,
  user_id,
  token_name,
  token_hash,
  monthly_limit,
  current_usage,
  last_used,
  expires_at,
  is_active,
  created_at
FROM api_tokens
ORDER BY user_id, created_at;

