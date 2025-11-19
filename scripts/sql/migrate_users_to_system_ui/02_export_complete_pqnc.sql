-- ============================================
-- EXPORTACIÓN COMPLETA DE DATOS DE AUTENTICACIÓN
-- Base de datos: PQNC_QA (hmmfuhqgvsehkizlfzga.supabase.co)
-- ============================================
-- 
-- ⚠️ EJECUTAR CADA CONSULTA POR SEPARADO
-- Guardar cada resultado antes de continuar con la siguiente
-- ============================================

-- ============================================
-- CONSULTA 1: ROLES (ejecutar primero)
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
-- CONSULTA 2: USUARIOS (ejecutar segundo)
-- ============================================
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
-- CONSULTA 3: PERMISOS (ejecutar tercero)
-- ============================================
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
-- CONSULTA 4: RELACIÓN ROLES-PERMISOS (ejecutar cuarto)
-- ============================================
SELECT 
  id,
  role_id,
  permission_id,
  created_at
FROM auth_role_permissions
ORDER BY role_id, permission_id;

-- ============================================
-- CONSULTA 5: PERMISOS DE USUARIOS (ejecutar quinto)
-- ============================================
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
-- CONSULTA 6: SESIONES ACTIVAS (opcional)
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
-- CONSULTA 7: AVATARES (ya ejecutada - 5 registros)
-- ============================================
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

