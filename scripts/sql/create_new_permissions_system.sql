-- ============================================
-- SISTEMA DE PERMISOS GRANULARES Y LOGS DE SESIÓN
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- Fecha: Enero 2025
-- ============================================

-- ============================================
-- 1. TABLA DE LOGS DE INICIO DE SESIÓN
-- ============================================

CREATE TABLE IF NOT EXISTS auth_login_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  session_token VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
  browser VARCHAR(100),
  browser_version VARCHAR(50),
  os VARCHAR(100),
  os_version VARCHAR(50),
  login_status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'blocked', 'expired'
  failure_reason TEXT, -- Razón del fallo si login_status = 'failed'
  login_method VARCHAR(50) DEFAULT 'password', -- 'password', 'session', 'oauth'
  location_country VARCHAR(100),
  location_city VARCHAR(100),
  is_suspicious BOOLEAN DEFAULT false, -- Detección de actividad sospechosa
  suspicious_reasons TEXT[], -- Array de razones si es sospechoso
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Para sesiones exitosas
  last_activity TIMESTAMP WITH TIME ZONE -- Última actividad en la sesión
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON auth_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_email ON auth_login_logs(email);
CREATE INDEX IF NOT EXISTS idx_login_logs_session_token ON auth_login_logs(session_token);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON auth_login_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_status ON auth_login_logs(login_status);
CREATE INDEX IF NOT EXISTS idx_login_logs_suspicious ON auth_login_logs(is_suspicious) WHERE is_suspicious = true;

-- Comentarios
COMMENT ON TABLE auth_login_logs IS 'Registro detallado de todos los intentos de inicio de sesión';
COMMENT ON COLUMN auth_login_logs.is_suspicious IS 'Indica si el login tiene características sospechosas (IP diferente, ubicación inusual, etc.)';
COMMENT ON COLUMN auth_login_logs.suspicious_reasons IS 'Array de razones por las que el login fue marcado como sospechoso';

-- ============================================
-- 2. TABLA DE AUDITORÍA DE CAMBIOS DE ASIGNACIÓN
-- ============================================

CREATE TABLE IF NOT EXISTS prospect_assignment_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL, -- Referencia a prospecto (puede estar en otra BD)
  old_coordinacion_id UUID, -- Coordinación anterior
  new_coordinacion_id UUID, -- Coordinación nueva
  old_ejecutivo_id UUID, -- Ejecutivo anterior
  new_ejecutivo_id UUID, -- Ejecutivo nuevo
  change_type VARCHAR(50) NOT NULL, -- 'coordinacion_change', 'ejecutivo_change', 'both'
  reason TEXT NOT NULL, -- Razón documentada del cambio
  changed_by UUID REFERENCES auth_users(id) ON DELETE SET NULL, -- Usuario que hizo el cambio
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}' -- Información adicional del cambio
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_assignment_logs_prospect ON prospect_assignment_logs(prospect_id);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_changed_by ON prospect_assignment_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_changed_at ON prospect_assignment_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_coordinacion ON prospect_assignment_logs(new_coordinacion_id);

COMMENT ON TABLE prospect_assignment_logs IS 'Registro de todos los cambios de asignación de prospectos con razón documentada';

-- ============================================
-- 3. ACTUALIZAR Y CREAR ROLES
-- ============================================

-- Actualizar rol admin existente (si existe)
UPDATE auth_roles 
SET display_name = 'Administrador',
    description = 'Acceso completo al sistema - Full Access'
WHERE name = 'admin';

-- Crear nuevo rol: Administrador Operativo
INSERT INTO auth_roles (name, display_name, description, is_active)
VALUES (
  'administrador_operativo',
  'Administrador Operativo',
  'Administrador operativo con acceso limitado a módulos específicos',
  true
) ON CONFLICT (name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

-- Crear rol: Coordinador
INSERT INTO auth_roles (name, display_name, description, is_active)
VALUES (
  'coordinador',
  'Coordinador',
  'Coordinador con acceso a prospectos y análisis de su coordinación',
  true
) ON CONFLICT (name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

-- Crear rol: Ejecutivo
INSERT INTO auth_roles (name, display_name, description, is_active)
VALUES (
  'ejecutivo',
  'Ejecutivo',
  'Ejecutivo con acceso solo a sus prospectos asignados',
  true
) ON CONFLICT (name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

-- Mantener rol: Productor (sin cambios)
INSERT INTO auth_roles (name, display_name, description, is_active)
VALUES (
  'productor',
  'Productor',
  'Productor de contenido con acceso a AI Models Manager',
  true
) ON CONFLICT (name) DO NOTHING;

-- Mantener rol: Dirección (sin cambios)
INSERT INTO auth_roles (name, display_name, description, is_active)
VALUES (
  'direccion',
  'Dirección',
  'Rol para usuarios de dirección con acceso al módulo de timeline',
  true
) ON CONFLICT (name) DO NOTHING;

-- Eliminar rol: Vendedor (si existe, migrar usuarios primero)
-- NOTA: Ejecutar migración de usuarios antes de eliminar
-- DELETE FROM auth_roles WHERE name = 'vendedor';

-- ============================================
-- 4. CREAR TABLA DE COORDINACIONES (si no existe)
-- ============================================

CREATE TABLE IF NOT EXISTS coordinaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  archivado BOOLEAN DEFAULT false,
  is_operativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_coordinaciones_codigo ON coordinaciones(codigo);
CREATE INDEX IF NOT EXISTS idx_coordinaciones_archivado ON coordinaciones(archivado) WHERE archivado = false;
CREATE INDEX IF NOT EXISTS idx_coordinaciones_operativo ON coordinaciones(is_operativo) WHERE is_operativo = true;

COMMENT ON TABLE coordinaciones IS 'Coordinaciones organizacionales para asignación de prospectos';

-- ============================================
-- 5. ACTUALIZAR TABLA auth_users PARA SOPORTAR COORDINACIONES
-- ============================================

-- Agregar campos de coordinación si no existen
DO $$ 
BEGIN
  -- Campo para ejecutivos (una coordinación)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auth_users' AND column_name = 'coordinacion_id'
  ) THEN
    ALTER TABLE auth_users ADD COLUMN coordinacion_id UUID REFERENCES coordinaciones(id);
  END IF;

  -- Campo para coordinadores (múltiples coordinaciones se manejan en tabla separada)
  -- Los coordinadores pueden tener múltiples coordinaciones asignadas
END $$;

-- Crear tabla de relación muchos-a-muchos para coordinadores y coordinaciones
CREATE TABLE IF NOT EXISTS auth_user_coordinaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  coordinacion_id UUID REFERENCES coordinaciones(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth_users(id),
  UNIQUE(user_id, coordinacion_id)
);

CREATE INDEX IF NOT EXISTS idx_user_coordinaciones_user ON auth_user_coordinaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coordinaciones_coord ON auth_user_coordinaciones(coordinacion_id);

COMMENT ON TABLE auth_user_coordinaciones IS 'Relación muchos-a-muchos entre usuarios coordinadores y coordinaciones';

-- ============================================
-- 6. FUNCIÓN PARA REGISTRAR LOGIN
-- ============================================

CREATE OR REPLACE FUNCTION log_user_login(
  p_user_id UUID,
  p_email VARCHAR(255),
  p_session_token VARCHAR(255),
  p_ip_address VARCHAR(45),
  p_user_agent TEXT,
  p_login_status VARCHAR(20),
  p_failure_reason TEXT DEFAULT NULL,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_device_type VARCHAR(50);
  v_browser VARCHAR(100);
  v_browser_version VARCHAR(50);
  v_os VARCHAR(100);
  v_os_version VARCHAR(50);
  v_is_suspicious BOOLEAN := false;
  v_suspicious_reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Parsear user agent (simplificado)
  -- En producción, usar una librería más robusta
  IF p_user_agent LIKE '%Mobile%' OR p_user_agent LIKE '%Android%' OR p_user_agent LIKE '%iPhone%' THEN
    v_device_type := 'mobile';
  ELSIF p_user_agent LIKE '%Tablet%' OR p_user_agent LIKE '%iPad%' THEN
    v_device_type := 'tablet';
  ELSE
    v_device_type := 'desktop';
  END IF;

  -- Extraer información básica del navegador
  IF p_user_agent LIKE '%Chrome%' THEN
    v_browser := 'Chrome';
  ELSIF p_user_agent LIKE '%Firefox%' THEN
    v_browser := 'Firefox';
  ELSIF p_user_agent LIKE '%Safari%' THEN
    v_browser := 'Safari';
  ELSIF p_user_agent LIKE '%Edge%' THEN
    v_browser := 'Edge';
  ELSE
    v_browser := 'Unknown';
  END IF;

  -- Detectar actividad sospechosa (ejemplo básico)
  -- En producción, implementar lógica más sofisticada
  IF p_login_status = 'success' THEN
    -- Verificar si hay múltiples logins desde IPs diferentes en las últimas horas
    SELECT COUNT(DISTINCT ip_address) INTO v_is_suspicious
    FROM auth_login_logs
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '2 hours'
      AND login_status = 'success'
      AND ip_address != p_ip_address;
    
    IF v_is_suspicious > 0 THEN
      v_is_suspicious := true;
      v_suspicious_reasons := ARRAY['Multiple IP addresses in short time'];
    END IF;
  END IF;

  -- Insertar log
  INSERT INTO auth_login_logs (
    user_id, email, session_token, ip_address, user_agent,
    device_type, browser, browser_version, os, os_version,
    login_status, failure_reason, expires_at, is_suspicious, suspicious_reasons
  ) VALUES (
    p_user_id, p_email, p_session_token, p_ip_address, p_user_agent,
    v_device_type, v_browser, v_browser_version, 'Unknown', 'Unknown',
    p_login_status, p_failure_reason, p_expires_at, v_is_suspicious, v_suspicious_reasons
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_user_login IS 'Registra un intento de login con información detallada';

-- ============================================
-- 7. FUNCIÓN PARA REGISTRAR CAMBIO DE ASIGNACIÓN
-- ============================================

CREATE OR REPLACE FUNCTION log_prospect_assignment_change(
  p_prospect_id UUID,
  p_old_coordinacion_id UUID,
  p_new_coordinacion_id UUID,
  p_old_ejecutivo_id UUID,
  p_new_ejecutivo_id UUID,
  p_reason TEXT,
  p_changed_by UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_change_type VARCHAR(50);
BEGIN
  -- Determinar tipo de cambio
  IF p_old_coordinacion_id IS DISTINCT FROM p_new_coordinacion_id AND 
     p_old_ejecutivo_id IS DISTINCT FROM p_new_ejecutivo_id THEN
    v_change_type := 'both';
  ELSIF p_old_coordinacion_id IS DISTINCT FROM p_new_coordinacion_id THEN
    v_change_type := 'coordinacion_change';
  ELSIF p_old_ejecutivo_id IS DISTINCT FROM p_new_ejecutivo_id THEN
    v_change_type := 'ejecutivo_change';
  ELSE
    RAISE EXCEPTION 'No hay cambios detectados en la asignación';
  END IF;

  -- Validar que se proporcionó una razón
  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'Se requiere una razón para el cambio de asignación';
  END IF;

  -- Insertar log
  INSERT INTO prospect_assignment_logs (
    prospect_id, old_coordinacion_id, new_coordinacion_id,
    old_ejecutivo_id, new_ejecutivo_id, change_type,
    reason, changed_by, metadata
  ) VALUES (
    p_prospect_id, p_old_coordinacion_id, p_new_coordinacion_id,
    p_old_ejecutivo_id, p_new_ejecutivo_id, v_change_type,
    p_reason, p_changed_by, p_metadata
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_prospect_assignment_change IS 'Registra un cambio de asignación de prospecto con razón documentada';

-- ============================================
-- 8. VISTA PARA RESUMEN DE LOGINS POR USUARIO
-- ============================================

CREATE OR REPLACE VIEW v_user_login_summary AS
SELECT 
  u.id AS user_id,
  u.email,
  u.full_name,
  COUNT(DISTINCT CASE WHEN l.login_status = 'success' THEN l.id END) AS successful_logins,
  COUNT(DISTINCT CASE WHEN l.login_status = 'failed' THEN l.id END) AS failed_logins,
  MAX(CASE WHEN l.login_status = 'success' THEN l.created_at END) AS last_successful_login,
  MAX(CASE WHEN l.login_status = 'failed' THEN l.created_at END) AS last_failed_login,
  COUNT(DISTINCT CASE WHEN l.is_suspicious = true THEN l.id END) AS suspicious_logins,
  COUNT(DISTINCT l.ip_address) AS unique_ip_addresses,
  COUNT(DISTINCT l.device_type) AS unique_devices
FROM auth_users u
LEFT JOIN auth_login_logs l ON u.id = l.user_id
GROUP BY u.id, u.email, u.full_name;

COMMENT ON VIEW v_user_login_summary IS 'Resumen de actividad de login por usuario';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

