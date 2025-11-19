-- ============================================
-- EXPORTAR USUARIOS Y ROLES DE PQNC SUPABASE
-- Base de datos: PQNC_QA (hmmfuhqgvsehkizlfzga.supabase.co)
-- ============================================
-- 
-- ⚠️ IMPORTANTE: 
-- 1. PRIMERO ejecutar: 02_export_users_from_pqnc_verify.sql para ver qué columnas existen
-- 2. Luego ejecutar este script, descomentando las versiones correctas según las columnas encontradas
-- 
-- Este script exporta todos los datos de usuarios, roles y permisos
-- de pqncSupabase para migrarlos a System_UI
-- ============================================

-- ============================================
-- 1. EXPORTAR ROLES
-- ============================================
-- Estructura real en pqnc_qa: id, name, display_name, description, created_at
-- NO tiene is_active, se agregará como true en la importación
SELECT 
  id,
  name,
  display_name,
  description,
  created_at
FROM auth_roles
ORDER BY name;

-- ============================================
-- 2. EXPORTAR USUARIOS
-- ============================================
-- Estructura real en pqnc_qa: todas las columnas existen
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
-- 3. EXPORTAR PERMISOS
-- ============================================
-- Estructura real en pqnc_qa: id, name, module, sub_module, description, created_at
-- Usar "name" y renombrarlo a "permission_name" para compatibilidad con System_UI
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
-- 4. EXPORTAR RELACIÓN ROLES-PERMISOS
-- ============================================
SELECT 
  id,
  role_id,
  permission_id,
  created_at
FROM auth_role_permissions
ORDER BY role_id, permission_id;

-- ============================================
-- 5. EXPORTAR PERMISOS DE USUARIOS
-- ============================================
-- NOTA: En pqnc_qa NO existe auth_user_permissions
-- Existe user_specific_permissions que es diferente (usa permission_id en lugar de permission_name)
-- Esta tabla relaciona usuarios con permisos mediante IDs, no nombres
-- Si necesitas migrar estos permisos, necesitarás hacer un JOIN con auth_permissions

-- Opción 1: Exportar user_specific_permissions (estructura diferente)
SELECT 
  usp.id,
  usp.user_id,
  ap.name as permission_name,  -- JOIN con auth_permissions para obtener el nombre
  ap.module,
  ap.sub_module,
  usp.created_at as granted_at,
  usp.created_by as granted_by
FROM user_specific_permissions usp
LEFT JOIN auth_permissions ap ON usp.permission_id = ap.id
WHERE usp.granted = true
ORDER BY usp.user_id, ap.module;

-- ============================================
-- 6. EXPORTAR SESIONES (opcional - solo activas)
-- ============================================
-- Estructura real en pqnc_qa: id, user_id, session_token, expires_at, ip_address, user_agent, created_at, last_activity
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
-- 7. EXPORTAR AVATARES
-- ============================================
-- Estructura real en pqnc_qa: id, user_id, avatar_url, original_filename, file_size, mime_type, uploaded_at, updated_at
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
-- 8. EXPORTAR TOKENS API (si existe)
-- ============================================
-- NOTA: En pqnc_qa NO existe api_tokens
-- Existen ai_token_limits y ai_token_usage pero son para otro propósito
-- Si necesitas migrar límites de tokens, puedes usar ai_token_limits:
-- SELECT 
--   id,
--   user_id,
--   monthly_limit,
--   current_month_usage,
--   daily_limit,
--   current_day_usage,
--   created_at,
--   updated_at
-- FROM ai_token_limits
-- ORDER BY user_id;
--
-- Por ahora, esta sección se deja vacía ya que api_tokens no existe en pqnc_qa
-- SELECT NULL WHERE false; -- Query que no devuelve resultados

-- ============================================
-- NOTA: Ejecutar este script y guardar los resultados en archivos JSON
-- o CSV para luego importarlos a System_UI
-- ============================================

