-- ============================================
-- EXPORTAR TODOS LOS DATOS DE AUTENTICACIÓN DE PQNC_QA
-- Base de datos: PQNC_QA (hmmfuhqgvsehkizlfzga.supabase.co)
-- ============================================
-- 
-- Este script exporta TODOS los datos de usuarios, roles y permisos
-- en el orden correcto según el esquema real de pqnc_qa
-- 
-- ⚠️ IMPORTANTE: Ejecutar cada sección por separado o usar el script Node.js
-- ============================================

-- ============================================
-- SECCIÓN 1: EXPORTAR ROLES
-- ============================================
-- Estructura: id, name, display_name, description, created_at
-- NO tiene is_active (se agregará como true en System_UI)
SELECT 
  id,
  name,
  display_name,
  description,
  created_at
FROM auth_roles
ORDER BY name;

-- ============================================
-- SECCIÓN 2: EXPORTAR USUARIOS
-- ============================================
-- Estructura completa según esquema real
SELECT 
  id,
  email,
  password_hash,
  full_name,
  first_name,
  last_name,
  phone,
  department,
  position,
  organization,
  role_id,
  is_active,
  email_verified,
  last_login,
  failed_login_attempts,
  locked_until,
  created_at,
  updated_at
FROM auth_users
ORDER BY created_at;

-- ============================================
-- SECCIÓN 3: EXPORTAR PERMISOS
-- ============================================
-- Estructura: id, name (se renombra a permission_name), module, sub_module, description, created_at
SELECT 
  id,
  name as permission_name,
  module,
  sub_module,
  description,
  created_at
FROM auth_permissions
ORDER BY module, name;

-- ============================================
-- SECCIÓN 4: EXPORTAR RELACIÓN ROLES-PERMISOS
-- ============================================
SELECT 
  id,
  role_id,
  permission_id,
  created_at
FROM auth_role_permissions
ORDER BY role_id, permission_id;

-- ============================================
-- SECCIÓN 5: EXPORTAR PERMISOS DE USUARIOS
-- ============================================
-- En pqnc_qa es user_specific_permissions, necesita JOIN con auth_permissions
SELECT 
  usp.id,
  usp.user_id,
  ap.name as permission_name,
  ap.module,
  ap.sub_module,
  usp.created_at as granted_at,
  usp.created_by as granted_by
FROM user_specific_permissions usp
LEFT JOIN auth_permissions ap ON usp.permission_id = ap.id
WHERE usp.granted = true
ORDER BY usp.user_id, ap.module;

-- ============================================
-- SECCIÓN 6: EXPORTAR SESIONES ACTIVAS (opcional)
-- ============================================
SELECT 
  id,
  user_id,
  session_token,
  expires_at,
  ip_address,
  user_agent,
  created_at,
  last_activity
FROM auth_sessions
WHERE expires_at > NOW()
ORDER BY created_at DESC;

-- ============================================
-- SECCIÓN 7: EXPORTAR AVATARES
-- ============================================
-- Estructura: original_filename se renombra a filename
SELECT 
  id,
  user_id,
  avatar_url,
  original_filename as filename,
  file_size,
  mime_type,
  uploaded_at
FROM user_avatars
ORDER BY user_id, uploaded_at DESC;

-- ============================================
-- NOTAS FINALES
-- ============================================
-- 1. Guardar cada resultado en archivos JSON o CSV
-- 2. O usar el script Node.js (04_migration_script_node.js) para migración automática
-- 3. Los datos ya están transformados para compatibilidad con System_UI:
--    - permission_name (desde name)
--    - filename (desde original_filename)
--    - is_active se agregará como true para roles

