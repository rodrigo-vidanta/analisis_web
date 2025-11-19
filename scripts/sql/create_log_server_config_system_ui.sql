-- ============================================
-- TABLA DE CONFIGURACIÓN DEL SERVIDOR DE LOGS
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================
-- Esta tabla almacena la configuración del sistema de logging de errores críticos
-- Solo debe haber un registro activo (el más reciente)

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS log_server_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url TEXT NOT NULL DEFAULT 'https://primary-dev-d75a.up.railway.app/webhook/error-log',
  webhook_auth_token TEXT, -- Token de autenticación Bearer para el webhook
  enabled BOOLEAN NOT NULL DEFAULT true,
  rate_limit INTEGER NOT NULL DEFAULT 300 CHECK (rate_limit > 0 AND rate_limit <= 10000),
  rate_limit_window INTEGER NOT NULL DEFAULT 1 CHECK (rate_limit_window > 0 AND rate_limit_window <= 60),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES public.auth_users(id), -- Referencia a usuarios
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas por fecha
CREATE INDEX IF NOT EXISTS idx_log_server_config_updated_at ON log_server_config(updated_at DESC);

-- Comentarios en la tabla
COMMENT ON TABLE log_server_config IS 'Configuración del sistema de logging de errores críticos';
COMMENT ON COLUMN log_server_config.webhook_url IS 'URL del webhook donde se enviarán los errores';
COMMENT ON COLUMN log_server_config.webhook_auth_token IS 'Token de autenticación Bearer para el webhook (opcional)';
COMMENT ON COLUMN log_server_config.enabled IS 'Indica si el sistema de logging está activo';
COMMENT ON COLUMN log_server_config.rate_limit IS 'Número máximo de errores antes de pausar el envío (1-10000)';
COMMENT ON COLUMN log_server_config.rate_limit_window IS 'Ventana de tiempo en minutos para contar errores (1-60)';
COMMENT ON COLUMN log_server_config.updated_by IS 'ID del usuario que actualizó la configuración';

-- Política RLS: Solo administradores pueden leer y escribir
ALTER TABLE log_server_config ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para evitar errores al re-ejecutar)
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Solo service_role puede crear configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Solo service_role puede actualizar configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Solo service_role puede eliminar configuración de logs" ON log_server_config;

-- Política para lectura: Permitir lectura a usuarios autenticados (ajustar según necesidad)
-- Nota: Si tienes una tabla de roles en System_UI, ajusta esta política
CREATE POLICY "Usuarios autenticados pueden leer configuración de logs"
  ON log_server_config
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política para inserción: Solo service_role (admin) puede insertar
CREATE POLICY "Solo service_role puede crear configuración de logs"
  ON log_server_config
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Política para actualización: Solo service_role (admin) puede actualizar
CREATE POLICY "Solo service_role puede actualizar configuración de logs"
  ON log_server_config
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Política para eliminación: Solo service_role (admin) puede eliminar
CREATE POLICY "Solo service_role puede eliminar configuración de logs"
  ON log_server_config
  FOR DELETE
  USING (auth.role() = 'service_role');

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
INSERT INTO log_server_config (webhook_url, webhook_auth_token, enabled, rate_limit, rate_limit_window)
SELECT 
  'https://primary-dev-d75a.up.railway.app/webhook/error-log',
  '4@Lt''\o93BSkgA59MH[TSC"gERa+)jlgf|BWIR-7fAmM9o59}3.|W2k-JiRu(oeb',
  true,
  300,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM log_server_config
);

