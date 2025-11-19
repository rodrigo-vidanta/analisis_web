-- ============================================
-- TABLA DE CONFIGURACIÓN DEL SERVIDOR DE LOGS
-- ============================================
-- Esta tabla almacena la configuración del sistema de logging de errores críticos
-- Solo debe haber un registro activo (el más reciente)

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS log_server_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url TEXT NOT NULL DEFAULT 'https://primary-dev-d75a.up.railway.app/webhook/error-log',
  enabled BOOLEAN NOT NULL DEFAULT true,
  rate_limit INTEGER NOT NULL DEFAULT 300 CHECK (rate_limit > 0 AND rate_limit <= 10000),
  rate_limit_window INTEGER NOT NULL DEFAULT 1 CHECK (rate_limit_window > 0 AND rate_limit_window <= 60),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas por fecha
CREATE INDEX IF NOT EXISTS idx_log_server_config_updated_at ON log_server_config(updated_at DESC);

-- Comentarios en la tabla
COMMENT ON TABLE log_server_config IS 'Configuración del sistema de logging de errores críticos';
COMMENT ON COLUMN log_server_config.webhook_url IS 'URL del webhook donde se enviarán los errores';
COMMENT ON COLUMN log_server_config.enabled IS 'Indica si el sistema de logging está activo';
COMMENT ON COLUMN log_server_config.rate_limit IS 'Número máximo de errores antes de pausar el envío (1-10000)';
COMMENT ON COLUMN log_server_config.rate_limit_window IS 'Ventana de tiempo en minutos para contar errores (1-60)';
COMMENT ON COLUMN log_server_config.updated_by IS 'ID del usuario que actualizó la configuración';

-- Política RLS: Solo administradores pueden leer y escribir
ALTER TABLE log_server_config ENABLE ROW LEVEL SECURITY;

-- Política para lectura: Solo administradores
CREATE POLICY "Solo administradores pueden leer configuración de logs"
  ON log_server_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth_users u
      JOIN auth_roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Política para inserción: Solo administradores
CREATE POLICY "Solo administradores pueden crear configuración de logs"
  ON log_server_config
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth_users u
      JOIN auth_roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Política para actualización: Solo administradores
CREATE POLICY "Solo administradores pueden actualizar configuración de logs"
  ON log_server_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth_users u
      JOIN auth_roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth_users u
      JOIN auth_roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Política para eliminación: Solo administradores
CREATE POLICY "Solo administradores pueden eliminar configuración de logs"
  ON log_server_config
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth_users u
      JOIN auth_roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_log_server_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_log_server_config_updated_at ON log_server_config;
CREATE TRIGGER trigger_update_log_server_config_updated_at
  BEFORE UPDATE ON log_server_config
  FOR EACH ROW
  EXECUTE FUNCTION update_log_server_config_updated_at();

-- Insertar configuración por defecto si no existe
INSERT INTO log_server_config (webhook_url, enabled, rate_limit, rate_limit_window)
SELECT 
  'https://primary-dev-d75a.up.railway.app/webhook/error-log',
  true,
  300,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM log_server_config
);

