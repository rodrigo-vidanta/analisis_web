-- ============================================
-- CREAR ROL DIRECCIÓN Y TABLA TIMELINE
-- Base de datos: system_ui (glsmifhkoaifvaegsozd.supabase.co)
-- ============================================

-- 1. Crear rol "direccion" en auth_roles
INSERT INTO auth_roles (name, display_name, description, is_active)
VALUES ('direccion', 'Dirección', 'Rol para usuarios de dirección con acceso al módulo de timeline', true)
ON CONFLICT (name) DO UPDATE 
SET display_name = 'Dirección', 
    description = 'Rol para usuarios de dirección con acceso al módulo de timeline',
    is_active = true;

-- 2. Crear permiso para el módulo dirección
INSERT INTO auth_permissions (permission_name, module, sub_module, description)
VALUES ('direccion.view', 'direccion', NULL, 'Acceso al módulo de timeline de dirección')
ON CONFLICT (permission_name) DO NOTHING;

-- 3. Asignar permiso al rol direccion
INSERT INTO auth_role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM auth_roles r
CROSS JOIN auth_permissions p
WHERE r.name = 'direccion' 
  AND p.permission_name = 'direccion.view'
ON CONFLICT DO NOTHING;

-- 4. Crear tabla timeline_activities
CREATE TABLE IF NOT EXISTS timeline_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_timeline_user_id ON timeline_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_due_date ON timeline_activities(due_date);
CREATE INDEX IF NOT EXISTS idx_timeline_status ON timeline_activities(status);
CREATE INDEX IF NOT EXISTS idx_timeline_user_due_date ON timeline_activities(user_id, due_date);

-- 6. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_timeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger para updated_at
DROP TRIGGER IF EXISTS trigger_update_timeline_updated_at ON timeline_activities;
CREATE TRIGGER trigger_update_timeline_updated_at
  BEFORE UPDATE ON timeline_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_updated_at();

-- 8. Habilitar RLS (Row Level Security)
ALTER TABLE timeline_activities ENABLE ROW LEVEL SECURITY;

-- 9. Crear políticas RLS
-- Política: Los usuarios solo pueden ver sus propias actividades
DROP POLICY IF EXISTS "Users can view own activities" ON timeline_activities;
CREATE POLICY "Users can view own activities"
  ON timeline_activities
  FOR SELECT
  USING (
    (auth.uid()::uuid = user_id) OR 
    EXISTS (
      SELECT 1 FROM auth_users u
      JOIN auth_roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()::uuid
      AND r.name = 'admin'
    )
  );

-- Política: Los usuarios solo pueden insertar sus propias actividades
DROP POLICY IF EXISTS "Users can insert own activities" ON timeline_activities;
CREATE POLICY "Users can insert own activities"
  ON timeline_activities
  FOR INSERT
  WITH CHECK (
    (auth.uid()::uuid = user_id) OR 
    EXISTS (
      SELECT 1 FROM auth_users u
      JOIN auth_roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()::uuid
      AND r.name = 'admin'
    )
  );

-- Política: Los usuarios solo pueden actualizar sus propias actividades
DROP POLICY IF EXISTS "Users can update own activities" ON timeline_activities;
CREATE POLICY "Users can update own activities"
  ON timeline_activities
  FOR UPDATE
  USING (
    (auth.uid()::uuid = user_id) OR 
    EXISTS (
      SELECT 1 FROM auth_users u
      JOIN auth_roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()::uuid
      AND r.name = 'admin'
    )
  );

-- Política: Los usuarios solo pueden eliminar sus propias actividades
DROP POLICY IF EXISTS "Users can delete own activities" ON timeline_activities;
CREATE POLICY "Users can delete own activities"
  ON timeline_activities
  FOR DELETE
  USING (
    (auth.uid()::uuid = user_id) OR 
    EXISTS (
      SELECT 1 FROM auth_users u
      JOIN auth_roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()::uuid
      AND r.name = 'admin'
    )
  );

-- 10. Comentarios en la tabla
COMMENT ON TABLE timeline_activities IS 'Actividades y pendientes del módulo de timeline de dirección';
COMMENT ON COLUMN timeline_activities.user_id IS 'Usuario propietario de la actividad';
COMMENT ON COLUMN timeline_activities.due_date IS 'Fecha compromiso de realización';
COMMENT ON COLUMN timeline_activities.status IS 'Estado: pending, in_progress, completed, cancelled';
COMMENT ON COLUMN timeline_activities.priority IS 'Prioridad: low, medium, high, urgent';
COMMENT ON COLUMN timeline_activities.metadata IS 'Metadatos adicionales en formato JSON';

