-- ============================================
-- ALTERNATIVA: Añadir configuración de logs a prompt_module_config existente
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================
-- Esta es una alternativa si prefieres usar la tabla existente prompt_module_config
-- en lugar de crear una nueva tabla específica

-- Insertar configuración del log server en prompt_module_config
INSERT INTO prompt_module_config (config_key, config_value, description) VALUES
(
  'log_server_webhook_url',
  '"https://primary-dev-d75a.up.railway.app/webhook/error-log"',
  'URL del webhook donde se enviarán los errores críticos del sistema'
),
(
  'log_server_enabled',
  'true',
  'Indica si el sistema de logging de errores está activo'
),
(
  'log_server_rate_limit',
  '300',
  'Número máximo de errores antes de pausar el envío (1-10000)'
),
(
  'log_server_rate_limit_window',
  '1',
  'Ventana de tiempo en minutos para contar errores (1-60)'
)
ON CONFLICT (config_key) DO UPDATE
SET 
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

