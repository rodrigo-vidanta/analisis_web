-- ============================================
-- CREAR ESTRUCTURA DE TABLAS EN SYSTEM_UI
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================
-- 
-- Este script crea todas las tablas necesarias para usuarios y roles
-- en System_UI, asegurando compatibilidad con la estructura existente
-- y agregando campos necesarios para coordinaciones
-- ============================================

-- ============================================
-- 1. TABLA: auth_roles
-- ============================================
CREATE TABLE IF NOT EXISTS auth_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para auth_roles
CREATE INDEX IF NOT EXISTS idx_auth_roles_name ON auth_roles(name);
CREATE INDEX IF NOT EXISTS idx_auth_roles_is_active ON auth_roles(is_active);

-- ============================================
-- 2. TABLA: auth_users (con campos de coordinaciones)
-- ============================================
-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  department VARCHAR(100),
  position VARCHAR(100),
  organization VARCHAR(255) DEFAULT 'Grupo Vidanta',
  role_id UUID REFERENCES auth_roles(id),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar campos de coordinaciones si no existen
DO $$
BEGIN
  -- Agregar coordinacion_id si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auth_users' AND column_name = 'coordinacion_id'
  ) THEN
    ALTER TABLE auth_users 
    ADD COLUMN coordinacion_id UUID REFERENCES coordinaciones(id);
    RAISE NOTICE '✅ Columna coordinacion_id agregada a auth_users';
  END IF;

  -- Agregar is_coordinator si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auth_users' AND column_name = 'is_coordinator'
  ) THEN
    ALTER TABLE auth_users 
    ADD COLUMN is_coordinator BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Columna is_coordinator agregada a auth_users';
  END IF;

  -- Agregar is_ejecutivo si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auth_users' AND column_name = 'is_ejecutivo'
  ) THEN
    ALTER TABLE auth_users 
    ADD COLUMN is_ejecutivo BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Columna is_ejecutivo agregada a auth_users';
  END IF;

  -- Agregar failed_login_attempts si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auth_users' AND column_name = 'failed_login_attempts'
  ) THEN
    ALTER TABLE auth_users 
    ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Columna failed_login_attempts agregada a auth_users';
  END IF;

  -- Agregar locked_until si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auth_users' AND column_name = 'locked_until'
  ) THEN
    ALTER TABLE auth_users 
    ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Columna locked_until agregada a auth_users';
  END IF;
END $$;

-- Índices para auth_users (crear solo si las columnas existen)
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_role_id ON auth_users(role_id);
CREATE INDEX IF NOT EXISTS idx_auth_users_is_active ON auth_users(is_active);

-- Crear índices de coordinaciones solo si las columnas existen
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auth_users' AND column_name = 'coordinacion_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_auth_users_coordinacion_id ON auth_users(coordinacion_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auth_users' AND column_name = 'is_coordinator'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_auth_users_is_coordinator ON auth_users(is_coordinator);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auth_users' AND column_name = 'is_ejecutivo'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_auth_users_is_ejecutivo ON auth_users(is_ejecutivo);
  END IF;
END $$;

-- ============================================
-- 3. TABLA: auth_permissions
-- ============================================
CREATE TABLE IF NOT EXISTS auth_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  permission_name VARCHAR(100) UNIQUE NOT NULL,
  module VARCHAR(50) NOT NULL,
  sub_module VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para auth_permissions
CREATE INDEX IF NOT EXISTS idx_auth_permissions_name ON auth_permissions(permission_name);
CREATE INDEX IF NOT EXISTS idx_auth_permissions_module ON auth_permissions(module);

-- ============================================
-- 4. TABLA: auth_role_permissions
-- ============================================
CREATE TABLE IF NOT EXISTS auth_role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID REFERENCES auth_roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES auth_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Índices para auth_role_permissions
CREATE INDEX IF NOT EXISTS idx_auth_role_permissions_role_id ON auth_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_auth_role_permissions_permission_id ON auth_role_permissions(permission_id);

-- ============================================
-- 5. TABLA: auth_user_permissions
-- ============================================
CREATE TABLE IF NOT EXISTS auth_user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  permission_name VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  sub_module VARCHAR(50),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES auth_users(id)
);

-- Índices para auth_user_permissions
CREATE INDEX IF NOT EXISTS idx_auth_user_permissions_user_id ON auth_user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_user_permissions_permission_name ON auth_user_permissions(permission_name);

-- ============================================
-- 6. TABLA: auth_sessions
-- ============================================
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para auth_sessions
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

-- ============================================
-- 7. TABLA: user_avatars
-- ============================================
CREATE TABLE IF NOT EXISTS user_avatars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  avatar_url TEXT NOT NULL,
  filename VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para user_avatars
CREATE INDEX IF NOT EXISTS idx_user_avatars_user_id ON user_avatars(user_id);

-- ============================================
-- 8. TABLA: api_tokens (si se usa)
-- ============================================
CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  token_name VARCHAR(100) NOT NULL,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  monthly_limit INTEGER DEFAULT 1000,
  current_usage INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para api_tokens
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_token_hash ON api_tokens(token_hash);

-- ============================================
-- 9. VISTA: auth_user_profiles (para compatibilidad)
-- ============================================
-- Crear vista dinámicamente basándose en las columnas que existen
DO $$
DECLARE
  v_sql TEXT;
  v_columns TEXT;
BEGIN
  -- Construir lista de columnas disponibles dinámicamente
  SELECT string_agg(
    CASE 
      WHEN column_name = 'department' THEN 'u.department'
      WHEN column_name = 'position' THEN 'u.position'
      WHEN column_name = 'organization' THEN 'u.organization'
      WHEN column_name = 'coordinacion_id' THEN 'u.coordinacion_id'
      WHEN column_name = 'is_coordinator' THEN 'u.is_coordinator'
      WHEN column_name = 'is_ejecutivo' THEN 'u.is_ejecutivo'
      WHEN column_name = 'failed_login_attempts' THEN 'u.failed_login_attempts'
      WHEN column_name = 'locked_until' THEN 'u.locked_until'
      ELSE 'u.' || column_name
    END,
    E',\n  '
    ORDER BY ordinal_position
  )
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'auth_users'
    AND column_name NOT IN ('password_hash'); -- Excluir password_hash de la vista por seguridad

  -- Construir SQL para crear la vista
  v_sql := format('
CREATE OR REPLACE VIEW auth_user_profiles AS
SELECT 
  %s,
  r.name AS role_name,
  r.display_name AS role_display_name,
  r.description AS role_description,
  (SELECT avatar_url FROM user_avatars WHERE user_id = u.id ORDER BY uploaded_at DESC LIMIT 1) AS avatar_url
FROM auth_users u
LEFT JOIN auth_roles r ON u.role_id = r.id', v_columns);

  -- Ejecutar SQL
  EXECUTE v_sql;
  
  RAISE NOTICE '✅ Vista auth_user_profiles creada/actualizada';
END $$;

-- ============================================
-- COMENTARIOS EN TABLAS
-- ============================================
COMMENT ON TABLE auth_roles IS 'Roles del sistema (admin, developer, evaluator, coordinador, ejecutivo)';
COMMENT ON TABLE auth_users IS 'Usuarios del sistema con información de coordinaciones';
COMMENT ON TABLE auth_permissions IS 'Permisos granulares del sistema';
COMMENT ON TABLE auth_role_permissions IS 'Relación muchos a muchos entre roles y permisos';
COMMENT ON TABLE auth_user_permissions IS 'Permisos específicos asignados a usuarios individuales';
COMMENT ON TABLE auth_sessions IS 'Sesiones activas de usuarios';
COMMENT ON TABLE user_avatars IS 'Avatares de usuarios';
COMMENT ON TABLE api_tokens IS 'Tokens API para usuarios productores';
COMMENT ON VIEW auth_user_profiles IS 'Vista combinada de usuarios con información de roles y avatares';

-- ============================================
-- VERIFICACIÓN
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Estructura de tablas creada en System_UI';
  RAISE NOTICE '📊 Tablas creadas: auth_roles, auth_users, auth_permissions, auth_role_permissions, auth_user_permissions, auth_sessions, user_avatars, api_tokens';
  RAISE NOTICE '👁️ Vista creada: auth_user_profiles';
END $$;

