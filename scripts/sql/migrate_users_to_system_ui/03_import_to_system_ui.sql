-- ============================================
-- IMPORTAR DATOS A SYSTEM_UI
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================
-- 
-- Este script importa los datos exportados de pqncSupabase a System_UI
-- IMPORTANTE: Reemplazar los valores entre {{ }} con los datos reales exportados
-- ============================================

-- ============================================
-- PASO 1: IMPORTAR ROLES
-- ============================================
-- Insertar roles desde pqncSupabase, evitando duplicados
-- Si el rol ya existe (por nombre), se actualiza

-- NOTA: Los roles de pqnc_qa NO tienen is_active, se agregará como true por defecto
-- Usar el script Node.js (04_migration_script_node.js) para importación automática
-- O ejecutar manualmente con los datos exportados:

-- INSERT INTO auth_roles (id, name, display_name, description, is_active, created_at)
-- VALUES
--   -- Reemplazar con datos exportados de pqnc_qa
--   -- Ejemplo:
--   -- ('uuid-del-rol-admin', 'admin', 'Administrador', 'Acceso completo al sistema', true, NOW())
-- ON CONFLICT (name) 
-- DO UPDATE SET
--   display_name = EXCLUDED.display_name,
--   description = EXCLUDED.description,
--   is_active = COALESCE(EXCLUDED.is_active, true), -- Si no viene is_active, usar true
--   updated_at = NOW();

-- ============================================
-- PASO 2: IMPORTAR USUARIOS
-- ============================================
-- Insertar usuarios desde pqncSupabase
-- Si el usuario ya existe (por email), se actualiza

-- NOTA: Usar el script Node.js (04_migration_script_node.js) para importación automática
-- O ejecutar manualmente con los datos exportados:

-- INSERT INTO auth_users (
--   id,
--   email,
--   password_hash,
--   full_name,
--   first_name,
--   last_name,
--   phone,
--   department,
--   position,
--   organization,
--   role_id,
--   is_active,
--   email_verified,
--   last_login,
--   failed_login_attempts,
--   locked_until,
--   created_at,
--   updated_at
-- )
-- VALUES
--   -- Reemplazar con datos exportados de pqnc_qa
-- ON CONFLICT (email)
-- DO UPDATE SET
--   full_name = EXCLUDED.full_name,
--   first_name = EXCLUDED.first_name,
--   last_name = EXCLUDED.last_name,
--   phone = EXCLUDED.phone,
--   department = EXCLUDED.department,
--   position = EXCLUDED.position,
--   organization = EXCLUDED.organization,
--   role_id = EXCLUDED.role_id,
--   is_active = EXCLUDED.is_active,
--   email_verified = EXCLUDED.email_verified,
--   last_login = EXCLUDED.last_login,
--   failed_login_attempts = EXCLUDED.failed_login_attempts,
--   locked_until = EXCLUDED.locked_until,
--   updated_at = NOW();

-- ============================================
-- PASO 3: IMPORTAR PERMISOS
-- ============================================
-- NOTA: Los datos exportados de pqnc_qa tienen 'name' que se renombra a 'permission_name'
-- Usar el script Node.js para importación automática o ejecutar manualmente:

-- INSERT INTO auth_permissions (id, permission_name, module, sub_module, description, created_at)
-- VALUES
--   -- Reemplazar con datos exportados (ya tienen permission_name gracias al SELECT ... name as permission_name)
-- ON CONFLICT (permission_name)
-- DO UPDATE SET
--   module = EXCLUDED.module,
--   sub_module = EXCLUDED.sub_module,
--   description = EXCLUDED.description;

-- ============================================
-- PASO 4: IMPORTAR RELACIÓN ROLES-PERMISOS
-- ============================================
INSERT INTO auth_role_permissions (id, role_id, permission_id, created_at)
VALUES
  -- Reemplazar con datos exportados
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- PASO 5: IMPORTAR PERMISOS DE USUARIOS
-- ============================================
-- NOTA: En pqnc_qa se exporta desde user_specific_permissions con JOIN a auth_permissions
-- Los datos exportados ya tienen permission_name, module, sub_module
-- Usar el script Node.js para importación automática o ejecutar manualmente:

-- INSERT INTO auth_user_permissions (id, user_id, permission_name, module, sub_module, granted_at, granted_by)
-- VALUES
--   -- Reemplazar con datos exportados (ya transformados con permission_name)
-- ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 6: IMPORTAR AVATARES
-- ============================================
-- NOTA: Los datos exportados de pqnc_qa tienen 'filename' (que viene de original_filename)
-- Usar el script Node.js para importación automática o ejecutar manualmente:

-- INSERT INTO user_avatars (id, user_id, avatar_url, filename, file_size, mime_type, uploaded_at)
-- VALUES
--   -- Reemplazar con datos exportados (ya tienen filename transformado)
-- ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 7: IMPORTAR TOKENS API (si aplica)
-- ============================================
-- NOTA: En pqnc_qa NO existe api_tokens, esta sección se omite
-- Si necesitas migrar límites de tokens, usa ai_token_limits (estructura diferente)

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
DO $$
DECLARE
  roles_count INTEGER;
  users_count INTEGER;
  permissions_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO roles_count FROM auth_roles;
  SELECT COUNT(*) INTO users_count FROM auth_users;
  SELECT COUNT(*) INTO permissions_count FROM auth_permissions;
  
  RAISE NOTICE '✅ Migración completada';
  RAISE NOTICE '📊 Roles migrados: %', roles_count;
  RAISE NOTICE '👥 Usuarios migrados: %', users_count;
  RAISE NOTICE '🔐 Permisos migrados: %', permissions_count;
END $$;

