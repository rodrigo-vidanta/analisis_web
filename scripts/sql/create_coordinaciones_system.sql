-- ============================================
-- SISTEMA DE COORDINACIONES Y PERMISOS
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- Módulo: Roles, Permisos y Asignación de Prospectos
-- ============================================
--
-- ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
--
-- 1. Este script crea TODO el sistema de coordinaciones en System_UI
-- 2. Los permisos se gestionan completamente desde System_UI
-- 3. Las asignaciones se rastrean en System_UI pero referencian prospectos de la base de análisis
-- 4. Cualquier cambio debe documentarse en docs/ROLES_PERMISOS_README.md
-- ============================================

-- ============================================
-- 1. TABLA: coordinaciones
-- ============================================
CREATE TABLE IF NOT EXISTS coordinaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(10) UNIQUE NOT NULL, -- VEN, I360, MVP, COBACA, BOOM
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para coordinaciones
CREATE INDEX IF NOT EXISTS idx_coordinaciones_codigo ON coordinaciones(codigo);
CREATE INDEX IF NOT EXISTS idx_coordinaciones_active ON coordinaciones(is_active);

-- Comentarios
COMMENT ON TABLE coordinaciones IS 'Coordinaciones de la empresa (VEN, I360, MVP, COBACA, BOOM)';
COMMENT ON COLUMN coordinaciones.codigo IS 'Código único de la coordinación (VEN, I360, etc.)';

-- ============================================
-- 2. TABLA: auth_roles (si no existe)
-- ============================================
CREATE TABLE IF NOT EXISTS auth_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL, -- coordinador, ejecutivo
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para auth_roles
CREATE INDEX IF NOT EXISTS idx_auth_roles_name ON auth_roles(name);
CREATE INDEX IF NOT EXISTS idx_auth_roles_active ON auth_roles(is_active);

-- Comentarios
COMMENT ON TABLE auth_roles IS 'Roles del sistema (coordinador, ejecutivo, admin, etc.)';

-- ============================================
-- 3. TABLA: auth_users (si no existe)
-- ============================================
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  role_id UUID REFERENCES auth_roles(id),
  coordinacion_id UUID REFERENCES coordinaciones(id),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para auth_users
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users(role_id);
CREATE INDEX IF NOT EXISTS idx_auth_users_coordinacion ON auth_users(coordinacion_id);
CREATE INDEX IF NOT EXISTS idx_auth_users_active ON auth_users(is_active);

-- Comentarios
COMMENT ON TABLE auth_users IS 'Usuarios del sistema con asignación a coordinaciones';
COMMENT ON COLUMN auth_users.coordinacion_id IS 'Coordinación a la que pertenece el usuario (NULL para admin)';

-- ============================================
-- 4. TABLA: prospect_assignments
-- ============================================
CREATE TABLE IF NOT EXISTS prospect_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL, -- ID del prospecto en base de análisis (NO FK por ser otra BD)
  coordinacion_id UUID REFERENCES coordinaciones(id),
  ejecutivo_id UUID REFERENCES auth_users(id), -- NULL hasta que tenga ID CRM
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth_users(id), -- NULL si es automático
  assignment_type VARCHAR(50) DEFAULT 'automatic', -- automatic, manual
  assignment_reason TEXT,
  unassigned_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para prospect_assignments
CREATE INDEX IF NOT EXISTS idx_prospect_assignments_prospect ON prospect_assignments(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_assignments_coordinacion ON prospect_assignments(coordinacion_id);
CREATE INDEX IF NOT EXISTS idx_prospect_assignments_ejecutivo ON prospect_assignments(ejecutivo_id);
CREATE INDEX IF NOT EXISTS idx_prospect_assignments_active ON prospect_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_prospect_assignments_assigned_at ON prospect_assignments(assigned_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prospect_assignments_unique_active 
  ON prospect_assignments(prospect_id) 
  WHERE is_active = true;

-- Comentarios
COMMENT ON TABLE prospect_assignments IS 'Asignaciones de prospectos a coordinaciones y ejecutivos';
COMMENT ON COLUMN prospect_assignments.prospect_id IS 'ID del prospecto en la base de análisis (glsmifhkoaifvaegsozd)';
COMMENT ON COLUMN prospect_assignments.ejecutivo_id IS 'NULL hasta que el prospecto tenga ID CRM';
COMMENT ON COLUMN prospect_assignments.assignment_type IS 'automatic: asignación automática, manual: asignación manual por coordinador';

-- ============================================
-- 5. TABLA: assignment_logs
-- ============================================
CREATE TABLE IF NOT EXISTS assignment_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL,
  coordinacion_id UUID REFERENCES coordinaciones(id),
  ejecutivo_id UUID REFERENCES auth_users(id),
  action VARCHAR(50) NOT NULL, -- assigned, reassigned, unassigned
  assigned_by UUID REFERENCES auth_users(id),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para assignment_logs
CREATE INDEX IF NOT EXISTS idx_assignment_logs_prospect ON assignment_logs(prospect_id);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_coordinacion ON assignment_logs(coordinacion_id);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_ejecutivo ON assignment_logs(ejecutivo_id);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_action ON assignment_logs(action);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_created_at ON assignment_logs(created_at DESC);

-- Comentarios
COMMENT ON TABLE assignment_logs IS 'Auditoría de todas las asignaciones de prospectos';
COMMENT ON COLUMN assignment_logs.action IS 'Tipo de acción: assigned, reassigned, unassigned';

-- ============================================
-- 6. TABLA: coordinacion_statistics
-- ============================================
CREATE TABLE IF NOT EXISTS coordinacion_statistics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coordinacion_id UUID REFERENCES coordinaciones(id),
  ejecutivo_id UUID REFERENCES auth_users(id), -- NULL para estadísticas de coordinación
  stat_date DATE NOT NULL, -- Fecha del día (0:00)
  prospects_assigned_count INTEGER DEFAULT 0,
  calls_assigned_count INTEGER DEFAULT 0,
  conversations_assigned_count INTEGER DEFAULT 0,
  last_assignment_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coordinacion_id, ejecutivo_id, stat_date)
);

-- Índices para coordinacion_statistics
CREATE INDEX IF NOT EXISTS idx_coordinacion_stats_coordinacion ON coordinacion_statistics(coordinacion_id);
CREATE INDEX IF NOT EXISTS idx_coordinacion_stats_ejecutivo ON coordinacion_statistics(ejecutivo_id);
CREATE INDEX IF NOT EXISTS idx_coordinacion_stats_date ON coordinacion_statistics(stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_coordinacion_stats_coord_date ON coordinacion_statistics(coordinacion_id, stat_date);

-- Comentarios
COMMENT ON TABLE coordinacion_statistics IS 'Estadísticas diarias de asignaciones por coordinación y ejecutivo';
COMMENT ON COLUMN coordinacion_statistics.stat_date IS 'Fecha del día (0:00) para conteo de 24 horas';
COMMENT ON COLUMN coordinacion_statistics.ejecutivo_id IS 'NULL para estadísticas de coordinación completa';

-- ============================================
-- 7. TABLA: permissions
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID REFERENCES auth_roles(id),
  module VARCHAR(50) NOT NULL, -- prospectos, livechat, livemonitor
  permission_type VARCHAR(50) NOT NULL, -- view, create, update, delete, assign
  is_granted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, module, permission_type)
);

-- Índices para permissions
CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_type ON permissions(permission_type);

-- Comentarios
COMMENT ON TABLE permissions IS 'Permisos granulares por rol y módulo';
COMMENT ON COLUMN permissions.module IS 'Módulo del sistema: prospectos, livechat, livemonitor';
COMMENT ON COLUMN permissions.permission_type IS 'Tipo de permiso: view, create, update, delete, assign';

-- ============================================
-- 8. FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_coordinaciones_updated_at ON coordinaciones;
CREATE TRIGGER update_coordinaciones_updated_at
  BEFORE UPDATE ON coordinaciones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_auth_users_updated_at ON auth_users;
CREATE TRIGGER update_auth_users_updated_at
  BEFORE UPDATE ON auth_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_prospect_assignments_updated_at ON prospect_assignments;
CREATE TRIGGER update_prospect_assignments_updated_at
  BEFORE UPDATE ON prospect_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_coordinacion_statistics_updated_at ON coordinacion_statistics;
CREATE TRIGGER update_coordinacion_statistics_updated_at
  BEFORE UPDATE ON coordinacion_statistics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 9. DATOS INICIALES: Coordinaciones
-- ============================================
INSERT INTO coordinaciones (codigo, nombre, descripcion) VALUES
('VEN', 'Coordinación VEN', 'Coordinación VEN'),
('I360', 'Coordinación I360', 'Coordinación I360'),
('MVP', 'Coordinación MVP', 'Coordinación MVP'),
('COBACA', 'Coordinación COBACA', 'Coordinación COBACA'),
('BOOM', 'Coordinación BOOM', 'Coordinación BOOM')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- 10. DATOS INICIALES: Roles
-- ============================================
INSERT INTO auth_roles (name, display_name, description) VALUES
('coordinador', 'Coordinador', 'Coordinador de una coordinación específica. Puede ver todas las conversaciones y llamadas de su coordinación, y asignar prospectos a ejecutivos.'),
('ejecutivo', 'Ejecutivo', 'Ejecutivo/vendedor asignado a una coordinación. Solo puede ver sus prospectos asignados.')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 11. DATOS INICIALES: Permisos por Rol
-- ============================================

-- Permisos para Coordinador
INSERT INTO permissions (role_id, module, permission_type, is_granted)
SELECT 
  r.id,
  'prospectos',
  permission_type,
  true
FROM auth_roles r
CROSS JOIN (VALUES ('view'), ('assign')) AS p(permission_type)
WHERE r.name = 'coordinador'
ON CONFLICT (role_id, module, permission_type) DO NOTHING;

INSERT INTO permissions (role_id, module, permission_type, is_granted)
SELECT 
  r.id,
  'livechat',
  permission_type,
  true
FROM auth_roles r
CROSS JOIN (VALUES ('view'), ('assign')) AS p(permission_type)
WHERE r.name = 'coordinador'
ON CONFLICT (role_id, module, permission_type) DO NOTHING;

INSERT INTO permissions (role_id, module, permission_type, is_granted)
SELECT 
  r.id,
  'livemonitor',
  permission_type,
  true
FROM auth_roles r
CROSS JOIN (VALUES ('view')) AS p(permission_type)
WHERE r.name = 'coordinador'
ON CONFLICT (role_id, module, permission_type) DO NOTHING;

-- Permisos para Ejecutivo
INSERT INTO permissions (role_id, module, permission_type, is_granted)
SELECT 
  r.id,
  'prospectos',
  permission_type,
  true
FROM auth_roles r
CROSS JOIN (VALUES ('view')) AS p(permission_type)
WHERE r.name = 'ejecutivo'
ON CONFLICT (role_id, module, permission_type) DO NOTHING;

INSERT INTO permissions (role_id, module, permission_type, is_granted)
SELECT 
  r.id,
  'livechat',
  permission_type,
  true
FROM auth_roles r
CROSS JOIN (VALUES ('view')) AS p(permission_type)
WHERE r.name = 'ejecutivo'
ON CONFLICT (role_id, module, permission_type) DO NOTHING;

INSERT INTO permissions (role_id, module, permission_type, is_granted)
SELECT 
  r.id,
  'livemonitor',
  permission_type,
  true
FROM auth_roles r
CROSS JOIN (VALUES ('view')) AS p(permission_type)
WHERE r.name = 'ejecutivo'
ON CONFLICT (role_id, module, permission_type) DO NOTHING;

-- ============================================
-- 12. FUNCIÓN: Crear usuarios de prueba
-- ============================================
-- NOTA: Esta función requiere que exista una función de hash de contraseñas
-- Por ahora, crearemos los usuarios con password_hash temporal
-- Se debe actualizar después con el hash correcto de 'Admin$2025'

-- Función auxiliar para obtener el hash de una contraseña
-- NOTA: En producción, usar crypt() de pgcrypto o bcrypt
CREATE OR REPLACE FUNCTION create_test_users()
RETURNS void AS $$
DECLARE
  coord_role_id UUID;
  ejec_role_id UUID;
  ven_coord_id UUID;
  i360_coord_id UUID;
  mvp_coord_id UUID;
  cobaca_coord_id UUID;
  boom_coord_id UUID;
  ven_ejec1_id UUID;
  ven_ejec2_id UUID;
  i360_ejec1_id UUID;
  i360_ejec2_id UUID;
  mvp_ejec1_id UUID;
  mvp_ejec2_id UUID;
  cobaca_ejec1_id UUID;
  cobaca_ejec2_id UUID;
  boom_ejec1_id UUID;
  boom_ejec2_id UUID;
BEGIN
  -- Obtener IDs de roles
  SELECT id INTO coord_role_id FROM auth_roles WHERE name = 'coordinador';
  SELECT id INTO ejec_role_id FROM auth_roles WHERE name = 'ejecutivo';
  
  -- Obtener IDs de coordinaciones
  SELECT id INTO ven_coord_id FROM coordinaciones WHERE codigo = 'VEN';
  SELECT id INTO i360_coord_id FROM coordinaciones WHERE codigo = 'I360';
  SELECT id INTO mvp_coord_id FROM coordinaciones WHERE codigo = 'MVP';
  SELECT id INTO cobaca_coord_id FROM coordinaciones WHERE codigo = 'COBACA';
  SELECT id INTO boom_coord_id FROM coordinaciones WHERE codigo = 'BOOM';
  
  -- Crear coordinadores
  INSERT INTO auth_users (email, password_hash, full_name, first_name, last_name, role_id, coordinacion_id, is_active, email_verified)
  VALUES
    ('coordinador_ven@grupovidanta.com', '$2a$10$placeholder_hash', 'Coordinador VEN', 'Coordinador', 'VEN', coord_role_id, ven_coord_id, true, true),
    ('coordinador_i360@grupovidanta.com', '$2a$10$placeholder_hash', 'Coordinador I360', 'Coordinador', 'I360', coord_role_id, i360_coord_id, true, true),
    ('coordinador_mvp@grupovidanta.com', '$2a$10$placeholder_hash', 'Coordinador MVP', 'Coordinador', 'MVP', coord_role_id, mvp_coord_id, true, true),
    ('coordinador_cobaca@grupovidanta.com', '$2a$10$placeholder_hash', 'Coordinador COBACA', 'Coordinador', 'COBACA', coord_role_id, cobaca_coord_id, true, true),
    ('coordinador_boom@grupovidanta.com', '$2a$10$placeholder_hash', 'Coordinador BOOM', 'Coordinador', 'BOOM', coord_role_id, boom_coord_id, true, true)
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO ven_coord_id;
  
  -- Crear ejecutivos VEN
  INSERT INTO auth_users (email, password_hash, full_name, first_name, last_name, role_id, coordinacion_id, is_active, email_verified)
  VALUES
    ('ejecutivo1_ven@grupovidanta.com', '$2a$10$placeholder_hash', 'Ejecutivo 1 VEN', 'Ejecutivo1', 'VEN', ejec_role_id, ven_coord_id, true, true),
    ('ejecutivo2_ven@grupovidanta.com', '$2a$10$placeholder_hash', 'Ejecutivo 2 VEN', 'Ejecutivo2', 'VEN', ejec_role_id, ven_coord_id, true, true)
  ON CONFLICT (email) DO NOTHING;
  
  -- Crear ejecutivos I360
  INSERT INTO auth_users (email, password_hash, full_name, first_name, last_name, role_id, coordinacion_id, is_active, email_verified)
  VALUES
    ('ejecutivo1_i360@grupovidanta.com', '$2a$10$placeholder_hash', 'Ejecutivo 1 I360', 'Ejecutivo1', 'I360', ejec_role_id, i360_coord_id, true, true),
    ('ejecutivo2_i360@grupovidanta.com', '$2a$10$placeholder_hash', 'Ejecutivo 2 I360', 'Ejecutivo2', 'I360', ejec_role_id, i360_coord_id, true, true)
  ON CONFLICT (email) DO NOTHING;
  
  -- Crear ejecutivos MVP
  INSERT INTO auth_users (email, password_hash, full_name, first_name, last_name, role_id, coordinacion_id, is_active, email_verified)
  VALUES
    ('ejecutivo1_mvp@grupovidanta.com', '$2a$10$placeholder_hash', 'Ejecutivo 1 MVP', 'Ejecutivo1', 'MVP', ejec_role_id, mvp_coord_id, true, true),
    ('ejecutivo2_mvp@grupovidanta.com', '$2a$10$placeholder_hash', 'Ejecutivo 2 MVP', 'Ejecutivo2', 'MVP', ejec_role_id, mvp_coord_id, true, true)
  ON CONFLICT (email) DO NOTHING;
  
  -- Crear ejecutivos COBACA
  INSERT INTO auth_users (email, password_hash, full_name, first_name, last_name, role_id, coordinacion_id, is_active, email_verified)
  VALUES
    ('ejecutivo1_cobaca@grupovidanta.com', '$2a$10$placeholder_hash', 'Ejecutivo 1 COBACA', 'Ejecutivo1', 'COBACA', ejec_role_id, cobaca_coord_id, true, true),
    ('ejecutivo2_cobaca@grupovidanta.com', '$2a$10$placeholder_hash', 'Ejecutivo 2 COBACA', 'Ejecutivo2', 'COBACA', ejec_role_id, cobaca_coord_id, true, true)
  ON CONFLICT (email) DO NOTHING;
  
  -- Crear ejecutivos BOOM
  INSERT INTO auth_users (email, password_hash, full_name, first_name, last_name, role_id, coordinacion_id, is_active, email_verified)
  VALUES
    ('ejecutivo1_boom@grupovidanta.com', '$2a$10$placeholder_hash', 'Ejecutivo 1 BOOM', 'Ejecutivo1', 'BOOM', ejec_role_id, boom_coord_id, true, true),
    ('ejecutivo2_boom@grupovidanta.com', '$2a$10$placeholder_hash', 'Ejecutivo 2 BOOM', 'Ejecutivo2', 'BOOM', ejec_role_id, boom_coord_id, true, true)
  ON CONFLICT (email) DO NOTHING;
  
  RAISE NOTICE 'Usuarios de prueba creados. NOTA: Actualizar password_hash con hash real de Admin$2025';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 13. POLÍTICAS RLS (Row Level Security)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE coordinaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinacion_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (se ajustarán según necesidades)
-- Por ahora, permitir acceso a usuarios autenticados
-- Las políticas específicas se crearán en el siguiente script

CREATE POLICY "Usuarios autenticados pueden ver coordinaciones" ON coordinaciones
  FOR SELECT USING (true); -- Temporal, se ajustará

CREATE POLICY "Usuarios autenticados pueden ver roles" ON auth_roles
  FOR SELECT USING (true); -- Temporal, se ajustará

CREATE POLICY "Usuarios pueden ver su propia información" ON auth_users
  FOR SELECT USING (true); -- Temporal, se ajustará según rol

CREATE POLICY "Usuarios pueden ver asignaciones según su rol" ON prospect_assignments
  FOR SELECT USING (true); -- Temporal, se ajustará según rol y coordinación

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

-- NOTAS IMPORTANTES:
-- 1. Los usuarios se crean con password_hash temporal. 
--    Se debe actualizar con el hash real de 'Admin$2025' usando bcrypt o crypt()
-- 2. Las políticas RLS son temporales y se ajustarán en el siguiente script
-- 3. Este script crea la estructura base. Las funciones RPC se crearán en el siguiente script
-- 4. Ejecutar este script en System_UI (zbylezfyagwrxoecioup.supabase.co)

