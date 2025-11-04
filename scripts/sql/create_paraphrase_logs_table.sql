-- ============================================
-- TABLA DE LOGS DE PARÁFRASIS (TODOS LOS INPUTS/OUTPUTS)
-- Base de datos: system_ui (zbylezfyagwrxoecioup.supabase.co)
-- ============================================
-- NOTA: user_id hace referencia a usuarios en PQNC_AI (sin FK porque está en otra BD)

-- Tabla principal para almacenar TODOS los inputs y outputs de parafraseo
CREATE TABLE IF NOT EXISTS paraphrase_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Usuario (referencia a PQNC_AI, sin FK)
  user_id UUID NOT NULL,
  user_email VARCHAR(255),
  
  -- Input original del usuario
  input_text TEXT NOT NULL,
  
  -- Dos opciones generadas por la IA
  option1 TEXT NOT NULL, -- Opción 1: Corrección Simple
  option2 TEXT NOT NULL, -- Opción 2: Versión Elaborada
  
  -- Output seleccionado por el usuario (puede ser option1, option2, o el input original si cancela)
  output_selected TEXT,
  selected_option_number INTEGER, -- 1 o 2, o NULL si no seleccionó ninguna
  
  -- Estado de moderación
  has_moderation_warning BOOLEAN DEFAULT false,
  warning_id UUID, -- Referencia al warning si hubo uno
  
  -- Contexto de la conversación
  conversation_id UUID, -- ID de la conversación de WhatsApp/UChat
  prospect_id UUID, -- ID del prospecto si aplica
  
  -- Metadatos
  model_used VARCHAR(100) DEFAULT 'claude-3-haiku-20240307',
  processing_time_ms INTEGER, -- Tiempo de procesamiento en milisegundos
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_paraphrase_logs_user_id ON paraphrase_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_paraphrase_logs_created_at ON paraphrase_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paraphrase_logs_has_warning ON paraphrase_logs(has_moderation_warning);
CREATE INDEX IF NOT EXISTS idx_paraphrase_logs_user_date ON paraphrase_logs(user_id, created_at DESC);

-- Tabla de warnings (ya existe, pero actualizamos para referencia)
-- Mantenemos la tabla content_moderation_warnings separada

-- Tabla para contador de warnings por usuario (optimizada para consultas rápidas)
CREATE TABLE IF NOT EXISTS user_warning_counters (
  user_id UUID PRIMARY KEY,
  total_warnings INTEGER DEFAULT 0,
  warnings_last_30_days INTEGER DEFAULT 0,
  warnings_last_7_days INTEGER DEFAULT 0,
  last_warning_at TIMESTAMP WITH TIME ZONE,
  is_blocked BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_warning_counters_is_blocked ON user_warning_counters(is_blocked);
CREATE INDEX IF NOT EXISTS idx_user_warning_counters_total ON user_warning_counters(total_warnings DESC);

-- Función para actualizar el contador de warnings automáticamente
CREATE OR REPLACE FUNCTION update_user_warning_counter()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar contador cuando se inserta un warning
  INSERT INTO user_warning_counters (user_id, total_warnings, warnings_last_30_days, warnings_last_7_days, last_warning_at, is_blocked, updated_at)
  VALUES (
    NEW.user_id,
    1,
    CASE WHEN NEW.created_at > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END,
    CASE WHEN NEW.created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END,
    NEW.created_at,
    false,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_warnings = user_warning_counters.total_warnings + 1,
    warnings_last_30_days = (
      SELECT COUNT(*) FROM content_moderation_warnings 
      WHERE user_id = NEW.user_id 
      AND created_at > NOW() - INTERVAL '30 days'
    ),
    warnings_last_7_days = (
      SELECT COUNT(*) FROM content_moderation_warnings 
      WHERE user_id = NEW.user_id 
      AND created_at > NOW() - INTERVAL '7 days'
    ),
    last_warning_at = NEW.created_at,
    is_blocked = (user_warning_counters.total_warnings + 1) >= 3,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar contador automáticamente
DROP TRIGGER IF EXISTS trigger_update_warning_counter ON content_moderation_warnings;
CREATE TRIGGER trigger_update_warning_counter
  AFTER INSERT ON content_moderation_warnings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_warning_counter();

-- Función para obtener contador de warnings (optimizada)
CREATE OR REPLACE FUNCTION get_user_warning_counter(p_user_id UUID)
RETURNS TABLE (
  total_warnings INTEGER,
  warnings_last_30_days INTEGER,
  warnings_last_7_days INTEGER,
  last_warning_at TIMESTAMP WITH TIME ZONE,
  is_blocked BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(uwc.total_warnings, 0)::INTEGER,
    COALESCE(uwc.warnings_last_30_days, 0)::INTEGER,
    COALESCE(uwc.warnings_last_7_days, 0)::INTEGER,
    uwc.last_warning_at,
    COALESCE(uwc.is_blocked, false)::BOOLEAN
  FROM user_warning_counters uwc
  WHERE uwc.user_id = p_user_id;
  
  -- Si no existe, retornar ceros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, 0::INTEGER, NULL::TIMESTAMP WITH TIME ZONE, false::BOOLEAN;
  END IF;
END;
$$;

-- Función para registrar un log de parafraseo
CREATE OR REPLACE FUNCTION register_paraphrase_log(
  p_user_id UUID,
  p_user_email VARCHAR,
  p_input_text TEXT,
  p_option1 TEXT,
  p_option2 TEXT,
  p_output_selected TEXT DEFAULT NULL,
  p_selected_option_number INTEGER DEFAULT NULL,
  p_has_moderation_warning BOOLEAN DEFAULT false,
  p_warning_id UUID DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_prospect_id UUID DEFAULT NULL,
  p_processing_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO paraphrase_logs (
    user_id,
    user_email,
    input_text,
    option1,
    option2,
    output_selected,
    selected_option_number,
    has_moderation_warning,
    warning_id,
    conversation_id,
    prospect_id,
    processing_time_ms
  ) VALUES (
    p_user_id,
    p_user_email,
    p_input_text,
    p_option1,
    p_option2,
    p_output_selected,
    p_selected_option_number,
    p_has_moderation_warning,
    p_warning_id,
    p_conversation_id,
    p_prospect_id,
    p_processing_time_ms
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Vista para obtener estadísticas de parafraseo por usuario
CREATE OR REPLACE VIEW user_paraphrase_stats AS
SELECT 
  user_id,
  COUNT(*) as total_paraphrases,
  COUNT(*) FILTER (WHERE output_selected IS NOT NULL) as paraphrases_used,
  COUNT(*) FILTER (WHERE has_moderation_warning = true) as paraphrases_with_warnings,
  COUNT(*) FILTER (WHERE selected_option_number = 1) as option1_selections,
  COUNT(*) FILTER (WHERE selected_option_number = 2) as option2_selections,
  AVG(processing_time_ms) as avg_processing_time_ms,
  MAX(created_at) as last_paraphrase_at
FROM paraphrase_logs
GROUP BY user_id;

-- Políticas RLS
ALTER TABLE paraphrase_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_warning_counters ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver sus propios logs
DROP POLICY IF EXISTS "Users can view their own paraphrase logs" ON paraphrase_logs;
CREATE POLICY "Users can view their own paraphrase logs"
  ON paraphrase_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuarios pueden ver su propio contador
DROP POLICY IF EXISTS "Users can view their own warning counter" ON user_warning_counters;
CREATE POLICY "Users can view their own warning counter"
  ON user_warning_counters
  FOR SELECT
  USING (auth.uid() = user_id);

-- Comentarios
COMMENT ON TABLE paraphrase_logs IS 'Logs completos de todos los inputs y outputs de parafraseo con IA';
COMMENT ON TABLE user_warning_counters IS 'Contador optimizado de warnings por usuario para consultas rápidas';
COMMENT ON FUNCTION register_paraphrase_log IS 'Registra un log completo de parafraseo con input y ambas opciones';
COMMENT ON FUNCTION get_user_warning_counter IS 'Obtiene el contador de warnings de un usuario (optimizado)';

