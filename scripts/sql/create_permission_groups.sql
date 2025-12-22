-- ============================================
-- SCRIPT DE CREACIÓN: SISTEMA DE GRUPOS DE PERMISOS
-- ============================================
-- 
-- Este script crea las tablas necesarias para el nuevo sistema
-- de permisos basado en grupos, similar a Active Directory.
-- 
-- Características:
-- - Grupos de permisos reutilizables
-- - Usuarios pueden pertenecer a múltiples grupos (permisos acumulativos)
-- - Historial de auditoría de cambios
-- - Migración automática de permisos actuales
-- 
-- Ejecutar en: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- Fecha: Diciembre 2024
-- ============================================

-- ============================================
-- 1. TABLA: permission_groups
-- ============================================
-- Almacena los grupos de permisos

CREATE TABLE IF NOT EXISTS permission_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  color VARCHAR(100) DEFAULT 'from-blue-500 to-indigo-600',
  icon VARCHAR(50) DEFAULT 'Users',
  base_role VARCHAR(50), -- Rol base opcional para heredar permisos por defecto
  priority INTEGER DEFAULT 0, -- Para resolver conflictos (mayor prioridad gana)
  is_system BOOLEAN DEFAULT false, -- Grupos del sistema no se pueden eliminar
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth_users(id),
  updated_by UUID REFERENCES auth_users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_permission_groups_name ON permission_groups(name);
CREATE INDEX IF NOT EXISTS idx_permission_groups_active ON permission_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_permission_groups_base_role ON permission_groups(base_role);

-- Comentarios
COMMENT ON TABLE permission_groups IS 'Grupos de permisos reutilizables tipo Active Directory';
COMMENT ON COLUMN permission_groups.base_role IS 'Rol base del cual hereda permisos por defecto (admin, coordinador, etc.)';
COMMENT ON COLUMN permission_groups.priority IS 'Prioridad para resolver conflictos de permisos (mayor número = mayor prioridad)';
COMMENT ON COLUMN permission_groups.is_system IS 'Grupos del sistema no se pueden eliminar ni modificar ciertos campos';

-- ============================================
-- 2. TABLA: group_permissions
-- ============================================
-- Define los permisos específicos de cada grupo

CREATE TABLE IF NOT EXISTS group_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
  module VARCHAR(100) NOT NULL, -- ID del módulo (prospectos, live-chat, admin.usuarios, etc.)
  action VARCHAR(100) NOT NULL, -- Acción específica (view, create, edit, delete, etc.)
  is_granted BOOLEAN DEFAULT true, -- Si el permiso está concedido
  scope_restriction VARCHAR(50) DEFAULT 'none', -- none, own, coordination, all
  custom_rules JSONB, -- Reglas personalizadas adicionales
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, module, action)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_group_permissions_group ON group_permissions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_permissions_module ON group_permissions(module);
CREATE INDEX IF NOT EXISTS idx_group_permissions_module_action ON group_permissions(module, action);

-- Comentarios
COMMENT ON TABLE group_permissions IS 'Permisos específicos asignados a cada grupo';
COMMENT ON COLUMN group_permissions.module IS 'Identificador del módulo (ej: prospectos, live-chat, admin.usuarios)';
COMMENT ON COLUMN group_permissions.action IS 'Acción permitida (ej: view, create, edit, delete)';
COMMENT ON COLUMN group_permissions.scope_restriction IS 'Restricción de alcance: none=sin restricción, own=solo propios, coordination=su coordinación, all=todo';

-- ============================================
-- 3. TABLA: user_permission_groups
-- ============================================
-- Relación N:N entre usuarios y grupos

CREATE TABLE IF NOT EXISTS user_permission_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- Grupo principal del usuario (para UI)
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth_users(id),
  notes TEXT, -- Notas sobre la asignación
  UNIQUE(user_id, group_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_permission_groups_user ON user_permission_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_groups_group ON user_permission_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_groups_primary ON user_permission_groups(is_primary) WHERE is_primary = true;

-- Comentarios
COMMENT ON TABLE user_permission_groups IS 'Asignación de usuarios a grupos de permisos';
COMMENT ON COLUMN user_permission_groups.is_primary IS 'Indica si es el grupo principal del usuario (para mostrar en UI)';

-- ============================================
-- 4. TABLA: group_audit_log
-- ============================================
-- Historial de cambios en grupos y asignaciones

CREATE TABLE IF NOT EXISTS group_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL, -- 'group', 'permission', 'assignment'
  entity_id UUID, -- ID del grupo o asignación afectada
  user_id UUID REFERENCES auth_users(id), -- Usuario afectado (para asignaciones)
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'assigned', 'unassigned'
  changes JSONB, -- Detalles del cambio
  performed_by UUID REFERENCES auth_users(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_group_audit_entity ON group_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_group_audit_user ON group_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_group_audit_performed_at ON group_audit_log(performed_at DESC);

-- Comentarios
COMMENT ON TABLE group_audit_log IS 'Historial de auditoría de cambios en grupos y permisos';

-- ============================================
-- 5. TRIGGER: Actualizar updated_at en permission_groups
-- ============================================

CREATE OR REPLACE FUNCTION update_permission_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_permission_groups_updated_at ON permission_groups;
CREATE TRIGGER trigger_update_permission_groups_updated_at
  BEFORE UPDATE ON permission_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_permission_groups_updated_at();

-- ============================================
-- 6. INSERTAR GRUPOS DEL SISTEMA (basados en roles actuales)
-- ============================================

INSERT INTO permission_groups (name, display_name, description, color, icon, base_role, priority, is_system)
VALUES
  -- Administradores (prioridad máxima)
  ('system_admin', 'Administradores', 'Control total del sistema. Acceso a todos los módulos y funcionalidades.', '#EF4444', 'Shield', 'admin', 100, true),
  
  -- Administradores Operativos
  ('system_admin_operativo', 'Administradores Operativos', 'Gestión operativa diaria. Usuarios, coordinaciones y prospectos.', '#8B5CF6', 'Settings', 'administrador_operativo', 90, true),
  
  -- Coordinadores
  ('system_coordinador', 'Coordinadores', 'Gestión de equipos. Acceso a su coordinación y ejecutivos.', '#3B82F6', 'Users', 'coordinador', 70, true),
  
  -- Ejecutivos
  ('system_ejecutivo', 'Ejecutivos', 'Operaciones de campo. Acceso a sus prospectos y comunicaciones.', '#10B981', 'Briefcase', 'ejecutivo', 50, true),
  
  -- Evaluadores
  ('system_evaluador', 'Evaluadores', 'Análisis de calidad. Acceso a módulos de análisis configurables.', '#F59E0B', 'ClipboardCheck', 'evaluador', 60, true),
  
  -- Desarrolladores
  ('system_developer', 'Desarrolladores', 'Acceso técnico. Constructor, AWS y documentación.', '#6B7280', 'Code', 'developer', 80, true),
  
  -- Dirección
  ('system_direccion', 'Dirección', 'Timeline y gestión de actividades de dirección.', '#1F2937', 'Briefcase', 'direccion', 40, true)

ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 7. INSERTAR PERMISOS POR DEFECTO PARA GRUPOS DEL SISTEMA
-- ============================================

-- Esta es una inserción masiva basada en la configuración de permissionModules.ts
-- Los permisos se definen según el rol base del grupo

-- Función para insertar permisos de un grupo basado en su rol base
CREATE OR REPLACE FUNCTION populate_group_default_permissions(p_group_name VARCHAR, p_base_role VARCHAR)
RETURNS VOID AS $$
DECLARE
  v_group_id UUID;
BEGIN
  -- Obtener ID del grupo
  SELECT id INTO v_group_id FROM permission_groups WHERE name = p_group_name;
  
  IF v_group_id IS NULL THEN
    RAISE NOTICE 'Grupo no encontrado: %', p_group_name;
    RETURN;
  END IF;

  -- Limpiar permisos existentes del grupo (solo si es sistema)
  DELETE FROM group_permissions WHERE group_id = v_group_id;

  -- Insertar permisos según el rol base
  CASE p_base_role
    -- ========== ADMIN: Acceso completo ==========
    WHEN 'admin' THEN
      INSERT INTO group_permissions (group_id, module, action, scope_restriction) VALUES
        -- Dashboard
        (v_group_id, 'operative-dashboard', 'view', 'all'),
        (v_group_id, 'operative-dashboard', 'view_all', 'all'),
        -- Prospectos
        (v_group_id, 'prospectos', 'view', 'all'),
        (v_group_id, 'prospectos', 'view_details', 'all'),
        (v_group_id, 'prospectos', 'view_all', 'all'),
        (v_group_id, 'prospectos', 'create', 'all'),
        (v_group_id, 'prospectos', 'edit', 'all'),
        (v_group_id, 'prospectos', 'delete', 'all'),
        (v_group_id, 'prospectos', 'assign', 'all'),
        (v_group_id, 'prospectos', 'bulk_assign', 'all'),
        (v_group_id, 'prospectos', 'export', 'all'),
        (v_group_id, 'prospectos', 'change_stage', 'all'),
        (v_group_id, 'prospectos', 'view_history', 'all'),
        -- Live Chat
        (v_group_id, 'live-chat', 'view', 'all'),
        (v_group_id, 'live-chat', 'view_all', 'all'),
        (v_group_id, 'live-chat', 'send_messages', 'all'),
        (v_group_id, 'live-chat', 'send_images', 'all'),
        (v_group_id, 'live-chat', 'send_voice', 'all'),
        (v_group_id, 'live-chat', 'schedule_call', 'all'),
        (v_group_id, 'live-chat', 'use_paraphrase', 'all'),
        (v_group_id, 'live-chat', 'view_analytics', 'all'),
        (v_group_id, 'live-chat', 'manage_quick_replies', 'all'),
        (v_group_id, 'live-chat', 'assign_conversation', 'all'),
        -- Live Monitor
        (v_group_id, 'live-monitor', 'view', 'all'),
        (v_group_id, 'live-monitor', 'view_all', 'all'),
        (v_group_id, 'live-monitor', 'listen_live', 'all'),
        (v_group_id, 'live-monitor', 'view_transcription', 'all'),
        (v_group_id, 'live-monitor', 'send_whisper', 'all'),
        (v_group_id, 'live-monitor', 'take_over', 'all'),
        (v_group_id, 'live-monitor', 'view_metrics', 'all'),
        (v_group_id, 'live-monitor', 'export_report', 'all'),
        -- Análisis
        (v_group_id, 'analisis', 'view', 'all'),
        (v_group_id, 'analisis', 'view_natalia', 'all'),
        (v_group_id, 'analisis', 'view_pqnc', 'all'),
        (v_group_id, 'analisis', 'view_details', 'all'),
        (v_group_id, 'analisis', 'play_audio', 'all'),
        (v_group_id, 'analisis', 'download_audio', 'all'),
        (v_group_id, 'analisis', 'export_analysis', 'all'),
        (v_group_id, 'analisis', 'view_agent_performance', 'all'),
        -- Llamadas Programadas
        (v_group_id, 'scheduled-calls', 'view', 'all'),
        (v_group_id, 'scheduled-calls', 'view_all', 'all'),
        (v_group_id, 'scheduled-calls', 'create', 'all'),
        (v_group_id, 'scheduled-calls', 'edit', 'all'),
        (v_group_id, 'scheduled-calls', 'delete', 'all'),
        -- Dirección
        (v_group_id, 'direccion', 'view', 'all'),
        (v_group_id, 'direccion', 'create_activity', 'all'),
        (v_group_id, 'direccion', 'edit_activity', 'all'),
        (v_group_id, 'direccion', 'delete_activity', 'all'),
        (v_group_id, 'direccion', 'archive_activity', 'all'),
        (v_group_id, 'direccion', 'add_subtask', 'all'),
        (v_group_id, 'direccion', 'process_with_ai', 'all'),
        -- Admin
        (v_group_id, 'admin', 'view', 'all'),
        (v_group_id, 'admin.usuarios', 'view', 'all'),
        (v_group_id, 'admin.usuarios', 'create', 'all'),
        (v_group_id, 'admin.usuarios', 'edit', 'all'),
        (v_group_id, 'admin.usuarios', 'delete', 'all'),
        (v_group_id, 'admin.usuarios', 'archive', 'all'),
        (v_group_id, 'admin.usuarios', 'block', 'all'),
        (v_group_id, 'admin.usuarios', 'unblock', 'all'),
        (v_group_id, 'admin.usuarios', 'toggle_operativo', 'all'),
        (v_group_id, 'admin.usuarios', 'manage_permissions', 'all'),
        (v_group_id, 'admin.usuarios', 'reset_password', 'all'),
        (v_group_id, 'admin.grupos', 'view', 'all'),
        (v_group_id, 'admin.grupos', 'create', 'all'),
        (v_group_id, 'admin.grupos', 'edit', 'all'),
        (v_group_id, 'admin.grupos', 'delete', 'all'),
        (v_group_id, 'admin.grupos', 'assign', 'all'),
        (v_group_id, 'admin.ejecutivos', 'view', 'all'),
        (v_group_id, 'admin.ejecutivos', 'assign_backup', 'all'),
        (v_group_id, 'admin.ejecutivos', 'change_status', 'all'),
        (v_group_id, 'admin.coordinaciones', 'view', 'all'),
        (v_group_id, 'admin.coordinaciones', 'create', 'all'),
        (v_group_id, 'admin.coordinaciones', 'edit', 'all'),
        (v_group_id, 'admin.coordinaciones', 'delete', 'all'),
        (v_group_id, 'admin.coordinaciones', 'assign_coordinador', 'all'),
        (v_group_id, 'admin.tokens', 'view', 'all'),
        (v_group_id, 'admin.tokens', 'create', 'all'),
        (v_group_id, 'admin.tokens', 'edit', 'all'),
        (v_group_id, 'admin.tokens', 'revoke', 'all'),
        (v_group_id, 'admin.horarios', 'view', 'all'),
        (v_group_id, 'admin.horarios', 'edit', 'all'),
        (v_group_id, 'admin.preferencias', 'view', 'all'),
        (v_group_id, 'admin.preferencias', 'edit', 'all'),
        (v_group_id, 'admin.configuracion-db', 'view', 'all'),
        (v_group_id, 'admin.configuracion-db', 'edit', 'all'),
        -- Logs
        (v_group_id, 'logs', 'view', 'all'),
        (v_group_id, 'logs', 'filter', 'all'),
        (v_group_id, 'logs', 'export', 'all'),
        (v_group_id, 'logs', 'clear', 'all'),
        -- AWS
        (v_group_id, 'aws-manager', 'view', 'all'),
        (v_group_id, 'aws-manager', 'start_service', 'all'),
        (v_group_id, 'aws-manager', 'stop_service', 'all'),
        (v_group_id, 'aws-manager', 'scale_service', 'all'),
        (v_group_id, 'aws-manager', 'view_metrics', 'all'),
        (v_group_id, 'aws-manager', 'view_costs', 'all'),
        -- Documentación
        (v_group_id, 'documentacion', 'view', 'all'),
        (v_group_id, 'documentacion', 'download', 'all');
        -- NOTA: Constructor y Plantillas fueron eliminados del sistema

    -- ========== ADMINISTRADOR OPERATIVO ==========
    WHEN 'administrador_operativo' THEN
      INSERT INTO group_permissions (group_id, module, action, scope_restriction) VALUES
        -- Dashboard
        (v_group_id, 'operative-dashboard', 'view', 'all'),
        (v_group_id, 'operative-dashboard', 'view_all', 'all'),
        -- Prospectos
        (v_group_id, 'prospectos', 'view', 'all'),
        (v_group_id, 'prospectos', 'view_details', 'all'),
        (v_group_id, 'prospectos', 'view_all', 'all'),
        (v_group_id, 'prospectos', 'create', 'all'),
        (v_group_id, 'prospectos', 'edit', 'all'),
        (v_group_id, 'prospectos', 'assign', 'all'),
        (v_group_id, 'prospectos', 'bulk_assign', 'all'),
        (v_group_id, 'prospectos', 'export', 'all'),
        (v_group_id, 'prospectos', 'change_stage', 'all'),
        (v_group_id, 'prospectos', 'view_history', 'all'),
        -- Live Chat (solo lectura)
        (v_group_id, 'live-chat', 'view', 'all'),
        (v_group_id, 'live-chat', 'view_all', 'all'),
        (v_group_id, 'live-chat', 'view_analytics', 'all'),
        -- Live Monitor
        (v_group_id, 'live-monitor', 'view', 'all'),
        (v_group_id, 'live-monitor', 'view_all', 'all'),
        (v_group_id, 'live-monitor', 'listen_live', 'all'),
        (v_group_id, 'live-monitor', 'view_transcription', 'all'),
        (v_group_id, 'live-monitor', 'view_metrics', 'all'),
        (v_group_id, 'live-monitor', 'export_report', 'all'),
        -- Llamadas Programadas
        (v_group_id, 'scheduled-calls', 'view', 'all'),
        (v_group_id, 'scheduled-calls', 'view_all', 'all'),
        -- Admin
        (v_group_id, 'admin', 'view', 'all'),
        (v_group_id, 'admin.usuarios', 'view', 'all'),
        (v_group_id, 'admin.usuarios', 'create', 'all'),
        (v_group_id, 'admin.usuarios', 'edit', 'all'),
        (v_group_id, 'admin.usuarios', 'archive', 'all'),
        (v_group_id, 'admin.usuarios', 'block', 'all'),
        (v_group_id, 'admin.usuarios', 'unblock', 'all'),
        (v_group_id, 'admin.usuarios', 'toggle_operativo', 'all'),
        (v_group_id, 'admin.usuarios', 'reset_password', 'all'),
        (v_group_id, 'admin.grupos', 'view', 'all'),
        (v_group_id, 'admin.grupos', 'assign', 'all'),
        (v_group_id, 'admin.ejecutivos', 'view', 'all'),
        (v_group_id, 'admin.ejecutivos', 'assign_backup', 'all'),
        (v_group_id, 'admin.ejecutivos', 'change_status', 'all'),
        (v_group_id, 'admin.coordinaciones', 'view', 'all'),
        (v_group_id, 'admin.coordinaciones', 'edit', 'all'),
        (v_group_id, 'admin.coordinaciones', 'assign_coordinador', 'all');

    -- ========== COORDINADOR ==========
    WHEN 'coordinador' THEN
      INSERT INTO group_permissions (group_id, module, action, scope_restriction) VALUES
        -- Dashboard
        (v_group_id, 'operative-dashboard', 'view', 'coordination'),
        -- Prospectos
        (v_group_id, 'prospectos', 'view', 'coordination'),
        (v_group_id, 'prospectos', 'view_details', 'coordination'),
        (v_group_id, 'prospectos', 'create', 'coordination'),
        (v_group_id, 'prospectos', 'edit', 'coordination'),
        (v_group_id, 'prospectos', 'assign', 'coordination'),
        (v_group_id, 'prospectos', 'bulk_assign', 'coordination'),
        (v_group_id, 'prospectos', 'export', 'coordination'),
        (v_group_id, 'prospectos', 'change_stage', 'coordination'),
        (v_group_id, 'prospectos', 'view_history', 'coordination'),
        -- Live Chat
        (v_group_id, 'live-chat', 'view', 'coordination'),
        (v_group_id, 'live-chat', 'send_messages', 'coordination'),
        (v_group_id, 'live-chat', 'send_images', 'coordination'),
        (v_group_id, 'live-chat', 'send_voice', 'coordination'),
        (v_group_id, 'live-chat', 'schedule_call', 'coordination'),
        (v_group_id, 'live-chat', 'use_paraphrase', 'coordination'),
        (v_group_id, 'live-chat', 'view_analytics', 'coordination'),
        (v_group_id, 'live-chat', 'assign_conversation', 'coordination'),
        -- Live Monitor
        (v_group_id, 'live-monitor', 'view', 'coordination'),
        (v_group_id, 'live-monitor', 'listen_live', 'coordination'),
        (v_group_id, 'live-monitor', 'view_transcription', 'coordination'),
        (v_group_id, 'live-monitor', 'send_whisper', 'coordination'),
        (v_group_id, 'live-monitor', 'take_over', 'coordination'),
        (v_group_id, 'live-monitor', 'view_metrics', 'coordination'),
        (v_group_id, 'live-monitor', 'export_report', 'coordination'),
        -- Análisis
        (v_group_id, 'analisis', 'view', 'coordination'),
        (v_group_id, 'analisis', 'view_natalia', 'coordination'),
        (v_group_id, 'analisis', 'view_pqnc', 'coordination'),
        (v_group_id, 'analisis', 'view_details', 'coordination'),
        (v_group_id, 'analisis', 'play_audio', 'coordination'),
        (v_group_id, 'analisis', 'download_audio', 'coordination'),
        (v_group_id, 'analisis', 'export_analysis', 'coordination'),
        (v_group_id, 'analisis', 'view_agent_performance', 'coordination'),
        -- Llamadas Programadas
        (v_group_id, 'scheduled-calls', 'view', 'coordination'),
        (v_group_id, 'scheduled-calls', 'create', 'coordination'),
        (v_group_id, 'scheduled-calls', 'edit', 'coordination'),
        (v_group_id, 'scheduled-calls', 'delete', 'coordination'),
        -- Admin
        (v_group_id, 'admin', 'view', 'coordination'),
        (v_group_id, 'admin.usuarios', 'view', 'coordination'),
        (v_group_id, 'admin.ejecutivos', 'view', 'coordination'),
        (v_group_id, 'admin.ejecutivos', 'assign_backup', 'coordination'),
        (v_group_id, 'admin.ejecutivos', 'change_status', 'coordination');

    -- ========== EJECUTIVO ==========
    WHEN 'ejecutivo' THEN
      INSERT INTO group_permissions (group_id, module, action, scope_restriction) VALUES
        -- Dashboard
        (v_group_id, 'operative-dashboard', 'view', 'own'),
        -- Prospectos
        (v_group_id, 'prospectos', 'view', 'own'),
        (v_group_id, 'prospectos', 'view_details', 'own'),
        (v_group_id, 'prospectos', 'edit', 'own'),
        (v_group_id, 'prospectos', 'change_stage', 'own'),
        (v_group_id, 'prospectos', 'view_history', 'own'),
        -- Live Chat
        (v_group_id, 'live-chat', 'view', 'own'),
        (v_group_id, 'live-chat', 'send_messages', 'own'),
        (v_group_id, 'live-chat', 'send_images', 'own'),
        (v_group_id, 'live-chat', 'send_voice', 'own'),
        (v_group_id, 'live-chat', 'schedule_call', 'own'),
        (v_group_id, 'live-chat', 'use_paraphrase', 'own'),
        -- Live Monitor
        (v_group_id, 'live-monitor', 'view', 'own'),
        (v_group_id, 'live-monitor', 'listen_live', 'own'),
        (v_group_id, 'live-monitor', 'view_transcription', 'own'),
        -- Análisis
        (v_group_id, 'analisis', 'view', 'own'),
        (v_group_id, 'analisis', 'view_natalia', 'own'),
        (v_group_id, 'analisis', 'view_pqnc', 'own'),
        (v_group_id, 'analisis', 'view_details', 'own'),
        (v_group_id, 'analisis', 'play_audio', 'own'),
        -- Llamadas Programadas
        (v_group_id, 'scheduled-calls', 'view', 'own'),
        (v_group_id, 'scheduled-calls', 'create', 'own'),
        (v_group_id, 'scheduled-calls', 'edit', 'own'),
        (v_group_id, 'scheduled-calls', 'delete', 'own');

    -- ========== EVALUADOR ==========
    WHEN 'evaluador' THEN
      INSERT INTO group_permissions (group_id, module, action, scope_restriction) VALUES
        -- Live Monitor
        (v_group_id, 'live-monitor', 'view', 'all'),
        (v_group_id, 'live-monitor', 'view_all', 'all'),
        (v_group_id, 'live-monitor', 'listen_live', 'all'),
        (v_group_id, 'live-monitor', 'view_transcription', 'all'),
        (v_group_id, 'live-monitor', 'view_metrics', 'all'),
        -- Análisis (configurable por usuario)
        (v_group_id, 'analisis', 'view', 'all'),
        (v_group_id, 'analisis', 'view_natalia', 'all'),
        (v_group_id, 'analisis', 'view_pqnc', 'all'),
        (v_group_id, 'analisis', 'view_details', 'all'),
        (v_group_id, 'analisis', 'play_audio', 'all'),
        (v_group_id, 'analisis', 'export_analysis', 'all'),
        (v_group_id, 'analisis', 'view_agent_performance', 'all');

    -- ========== DEVELOPER ==========
    WHEN 'developer' THEN
      INSERT INTO group_permissions (group_id, module, action, scope_restriction) VALUES
        -- Dashboard
        (v_group_id, 'operative-dashboard', 'view', 'all'),
        -- Prospectos (lectura)
        (v_group_id, 'prospectos', 'view', 'all'),
        (v_group_id, 'prospectos', 'view_details', 'all'),
        -- Live Chat (lectura)
        (v_group_id, 'live-chat', 'view', 'all'),
        -- Live Monitor
        (v_group_id, 'live-monitor', 'view', 'all'),
        (v_group_id, 'live-monitor', 'listen_live', 'all'),
        (v_group_id, 'live-monitor', 'view_transcription', 'all'),
        -- Análisis
        (v_group_id, 'analisis', 'view', 'all'),
        (v_group_id, 'analisis', 'view_natalia', 'all'),
        (v_group_id, 'analisis', 'view_pqnc', 'all'),
        (v_group_id, 'analisis', 'view_details', 'all'),
        (v_group_id, 'analisis', 'play_audio', 'all'),
        -- AWS
        (v_group_id, 'aws-manager', 'view', 'all'),
        (v_group_id, 'aws-manager', 'view_metrics', 'all'),
        (v_group_id, 'aws-manager', 'view_costs', 'all'),
        -- Documentación
        (v_group_id, 'documentacion', 'view', 'all'),
        (v_group_id, 'documentacion', 'download', 'all');

    -- ========== DIRECCIÓN ==========
    WHEN 'direccion' THEN
      INSERT INTO group_permissions (group_id, module, action, scope_restriction) VALUES
        (v_group_id, 'direccion', 'view', 'own'),
        (v_group_id, 'direccion', 'create_activity', 'own'),
        (v_group_id, 'direccion', 'edit_activity', 'own'),
        (v_group_id, 'direccion', 'delete_activity', 'own'),
        (v_group_id, 'direccion', 'archive_activity', 'own'),
        (v_group_id, 'direccion', 'add_subtask', 'own'),
        (v_group_id, 'direccion', 'process_with_ai', 'own');

    ELSE
      RAISE NOTICE 'Rol base no reconocido: %', p_base_role;
  END CASE;
  
END;
$$ LANGUAGE plpgsql;

-- Ejecutar para cada grupo del sistema
SELECT populate_group_default_permissions('system_admin', 'admin');
SELECT populate_group_default_permissions('system_admin_operativo', 'administrador_operativo');
SELECT populate_group_default_permissions('system_coordinador', 'coordinador');
SELECT populate_group_default_permissions('system_ejecutivo', 'ejecutivo');
SELECT populate_group_default_permissions('system_evaluador', 'evaluador');
SELECT populate_group_default_permissions('system_developer', 'developer');
SELECT populate_group_default_permissions('system_direccion', 'direccion');

-- ============================================
-- 8. MIGRACIÓN: Asignar usuarios a grupos según su rol actual
-- ============================================

-- Asignar usuarios a grupos basados en su rol actual
INSERT INTO user_permission_groups (user_id, group_id, is_primary, notes)
SELECT 
  au.id as user_id,
  pg.id as group_id,
  true as is_primary,
  'Migración automática desde rol: ' || ar.name as notes
FROM auth_users au
JOIN auth_roles ar ON au.role_id = ar.id
JOIN permission_groups pg ON pg.base_role = ar.name
WHERE au.is_active = true
  AND pg.is_system = true
ON CONFLICT (user_id, group_id) DO NOTHING;

-- ============================================
-- 9. RPC: Obtener permisos efectivos de un usuario
-- ============================================

CREATE OR REPLACE FUNCTION get_user_effective_permissions(p_user_id UUID)
RETURNS TABLE (
  module VARCHAR,
  action VARCHAR,
  is_granted BOOLEAN,
  scope_restriction VARCHAR,
  source_group VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (gp.module, gp.action)
    gp.module,
    gp.action,
    gp.is_granted,
    gp.scope_restriction,
    pg.display_name as source_group
  FROM user_permission_groups upg
  JOIN permission_groups pg ON upg.group_id = pg.id
  JOIN group_permissions gp ON gp.group_id = pg.id
  WHERE upg.user_id = p_user_id
    AND pg.is_active = true
    AND gp.is_granted = true
  ORDER BY gp.module, gp.action, pg.priority DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. RPC: Verificar si usuario tiene permiso específico
-- ============================================

CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_module VARCHAR,
  p_action VARCHAR
)
RETURNS TABLE (
  has_permission BOOLEAN,
  scope_restriction VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(bool_or(gp.is_granted), false) as has_permission,
    COALESCE(
      (SELECT gp2.scope_restriction 
       FROM group_permissions gp2 
       JOIN user_permission_groups upg2 ON gp2.group_id = upg2.group_id
       JOIN permission_groups pg2 ON upg2.group_id = pg2.id
       WHERE upg2.user_id = p_user_id 
         AND gp2.module = p_module 
         AND gp2.action = p_action
         AND gp2.is_granted = true
         AND pg2.is_active = true
       ORDER BY pg2.priority DESC
       LIMIT 1),
      'none'
    ) as scope_restriction
  FROM user_permission_groups upg
  JOIN permission_groups pg ON upg.group_id = pg.id
  JOIN group_permissions gp ON gp.group_id = pg.id
  WHERE upg.user_id = p_user_id
    AND pg.is_active = true
    AND gp.module = p_module
    AND gp.action = p_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. RPC: Obtener grupos de un usuario
-- ============================================

CREATE OR REPLACE FUNCTION get_user_groups(p_user_id UUID)
RETURNS TABLE (
  group_id UUID,
  group_name VARCHAR,
  display_name VARCHAR,
  description TEXT,
  color VARCHAR,
  icon VARCHAR,
  is_primary BOOLEAN,
  assigned_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg.id as group_id,
    pg.name as group_name,
    pg.display_name,
    pg.description,
    pg.color,
    pg.icon,
    upg.is_primary,
    upg.assigned_at
  FROM user_permission_groups upg
  JOIN permission_groups pg ON upg.group_id = pg.id
  WHERE upg.user_id = p_user_id
    AND pg.is_active = true
  ORDER BY upg.is_primary DESC, pg.priority DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FINALIZACIÓN
-- ============================================

-- Notificar completado
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SISTEMA DE GRUPOS DE PERMISOS CREADO';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tablas creadas: permission_groups, group_permissions, user_permission_groups, group_audit_log';
  RAISE NOTICE 'Grupos del sistema insertados: 7';
  RAISE NOTICE 'Usuarios migrados a grupos según rol actual';
  RAISE NOTICE 'RPCs creados: get_user_effective_permissions, user_has_permission, get_user_groups';
  RAISE NOTICE '============================================';
END
$$;

