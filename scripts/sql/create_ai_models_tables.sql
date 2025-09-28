-- ============================================
-- TABLAS PARA AI MODELS MANAGER
-- Base de datos: hmmfuhqgvsehkizlfzga.supabase.co (PQNC)
-- ============================================

-- Tabla para preferencias de usuario en AI Models
CREATE TABLE IF NOT EXISTS ai_user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  
  -- Preferencias de voz
  favorite_voices JSONB DEFAULT '[]'::jsonb, -- Array de voice_ids favoritos
  recent_voices JSONB DEFAULT '[]'::jsonb, -- Array de voice_ids usados recientemente (máx 10)
  default_voice_settings JSONB DEFAULT '{
    "stability": 0.5,
    "similarity_boost": 0.5,
    "style": 0.0,
    "use_speaker_boost": true
  }'::jsonb,
  preferred_model VARCHAR(100) DEFAULT 'eleven_multilingual_v2',
  
  -- Preferencias de idioma y traducción
  auto_translate_enabled BOOLEAN DEFAULT true,
  source_language VARCHAR(10) DEFAULT 'es', -- Idioma de entrada
  target_language VARCHAR(10) DEFAULT 'en', -- Idioma para efectos (inglés)
  
  -- Configuración de historial
  max_audio_history INTEGER DEFAULT 20, -- Máximo de audios en historial visible
  max_effects_history INTEGER DEFAULT 20, -- Máximo de efectos en historial visible
  auto_cleanup_enabled BOOLEAN DEFAULT true, -- Limpieza automática después de límites
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para historial de generaciones de audio (TTS)
CREATE TABLE IF NOT EXISTS ai_audio_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  
  -- Información de la generación
  generation_type VARCHAR(50) NOT NULL CHECK (generation_type IN ('text_to_speech', 'speech_to_speech')),
  original_text TEXT NOT NULL,
  translated_text TEXT, -- Texto traducido si se usó traducción
  
  -- Configuración de voz usada
  voice_id VARCHAR(100) NOT NULL,
  voice_name VARCHAR(255) NOT NULL,
  model_id VARCHAR(100) NOT NULL,
  voice_settings JSONB NOT NULL,
  seed INTEGER, -- Para reproducibilidad
  
  -- Archivos y URLs
  audio_file_path VARCHAR(500), -- Ruta en el bucket
  audio_file_url VARCHAR(500), -- URL pública del archivo
  original_file_path VARCHAR(500), -- Para speech-to-speech
  
  -- Metadatos
  character_count INTEGER NOT NULL,
  duration_seconds NUMERIC(8,2),
  file_size_bytes BIGINT,
  cost_credits NUMERIC(10,2),
  
  -- Estado y timestamps
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para búsqueda rápida
  CONSTRAINT unique_user_generation UNIQUE(user_id, id)
);

-- Tabla para historial de efectos de sonido
CREATE TABLE IF NOT EXISTS ai_sound_effects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  
  -- Información del efecto
  prompt_text TEXT NOT NULL,
  translated_prompt TEXT, -- Prompt traducido al inglés
  duration_seconds INTEGER NOT NULL DEFAULT 10,
  prompt_influence NUMERIC(3,2) NOT NULL DEFAULT 0.3,
  
  -- Archivos
  audio_file_path VARCHAR(500), -- Ruta en el bucket
  audio_file_url VARCHAR(500), -- URL pública del archivo
  
  -- Metadatos
  file_size_bytes BIGINT,
  cost_credits NUMERIC(10,2),
  
  -- Estado y timestamps
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para búsqueda rápida
  CONSTRAINT unique_user_effect UNIQUE(user_id, id)
);

-- Tabla para transcripciones (Speech to Text)
CREATE TABLE IF NOT EXISTS ai_transcriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  
  -- Archivo original
  original_filename VARCHAR(255) NOT NULL,
  original_file_path VARCHAR(500), -- Ruta en el bucket
  file_size_bytes BIGINT,
  file_duration_seconds NUMERIC(8,2),
  
  -- Resultado de transcripción
  transcribed_text TEXT NOT NULL,
  model_used VARCHAR(100) NOT NULL,
  confidence_score NUMERIC(3,2), -- Si la API lo proporciona
  
  -- Metadatos
  language_detected VARCHAR(10),
  cost_credits NUMERIC(10,2),
  processing_time_seconds NUMERIC(6,2),
  
  -- Estado y timestamps
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para voces personalizadas del usuario
CREATE TABLE IF NOT EXISTS ai_custom_voices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  
  -- Información de la voz
  elevenlabs_voice_id VARCHAR(100) UNIQUE NOT NULL,
  voice_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Configuración y metadatos
  voice_category VARCHAR(50) DEFAULT 'custom',
  labels JSONB DEFAULT '{}'::jsonb, -- género, edad, acento, etc.
  sample_files JSONB DEFAULT '[]'::jsonb, -- Rutas de archivos de muestra
  
  -- Configuración recomendada
  recommended_settings JSONB DEFAULT '{
    "stability": 0.5,
    "similarity_boost": 0.5,
    "style": 0.0,
    "use_speaker_boost": true
  }'::jsonb,
  
  -- Estadísticas de uso
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false, -- Si otros usuarios pueden usarla
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para estadísticas y analytics
CREATE TABLE IF NOT EXISTS ai_usage_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  
  -- Estadísticas por período (diario)
  date_period DATE NOT NULL,
  
  -- Contadores de uso
  tts_generations_count INTEGER DEFAULT 0,
  sound_effects_count INTEGER DEFAULT 0,
  transcriptions_count INTEGER DEFAULT 0,
  
  -- Costos y créditos
  total_credits_used NUMERIC(10,2) DEFAULT 0,
  total_characters_processed INTEGER DEFAULT 0,
  total_audio_duration_seconds NUMERIC(10,2) DEFAULT 0,
  
  -- Voces más usadas
  top_voices_used JSONB DEFAULT '[]'::jsonb, -- Array de {voice_id, count}
  top_models_used JSONB DEFAULT '[]'::jsonb, -- Array de {model_id, count}
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint para evitar duplicados por usuario/fecha
  CONSTRAINT unique_user_date_analytics UNIQUE(user_id, date_period)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_ai_audio_generations_user_created ON ai_audio_generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_sound_effects_user_created ON ai_sound_effects(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_transcriptions_user_created ON ai_transcriptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_custom_voices_user_active ON ai_custom_voices(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_user_date ON ai_usage_analytics(user_id, date_period DESC);

-- Función para limpiar historial automáticamente
CREATE OR REPLACE FUNCTION cleanup_ai_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Limpiar audio generations si excede el límite del usuario
  WITH user_prefs AS (
    SELECT max_audio_history FROM ai_user_preferences WHERE user_id = NEW.user_id
  ),
  excess_records AS (
    SELECT id FROM ai_audio_generations 
    WHERE user_id = NEW.user_id 
    ORDER BY created_at DESC 
    OFFSET (SELECT COALESCE(max_audio_history, 20) FROM user_prefs)
  )
  DELETE FROM ai_audio_generations WHERE id IN (SELECT id FROM excess_records);
  
  -- Limpiar sound effects si excede el límite del usuario
  WITH user_prefs AS (
    SELECT max_effects_history FROM ai_user_preferences WHERE user_id = NEW.user_id
  ),
  excess_effects AS (
    SELECT id FROM ai_sound_effects 
    WHERE user_id = NEW.user_id 
    ORDER BY created_at DESC 
    OFFSET (SELECT COALESCE(max_effects_history, 20) FROM user_prefs)
  )
  DELETE FROM ai_sound_effects WHERE id IN (SELECT id FROM excess_effects);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para limpieza automática
CREATE TRIGGER trigger_cleanup_audio_history
  AFTER INSERT ON ai_audio_generations
  FOR EACH ROW EXECUTE FUNCTION cleanup_ai_history();

CREATE TRIGGER trigger_cleanup_effects_history
  AFTER INSERT ON ai_sound_effects
  FOR EACH ROW EXECUTE FUNCTION cleanup_ai_history();

-- Función para actualizar estadísticas diarias
CREATE OR REPLACE FUNCTION update_daily_analytics(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_credits NUMERIC DEFAULT 0,
  p_characters INTEGER DEFAULT 0,
  p_duration NUMERIC DEFAULT 0,
  p_voice_id VARCHAR DEFAULT NULL,
  p_model_id VARCHAR DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_usage_analytics (
    user_id, date_period, 
    tts_generations_count, sound_effects_count, transcriptions_count,
    total_credits_used, total_characters_processed, total_audio_duration_seconds
  )
  VALUES (
    p_user_id, CURRENT_DATE,
    CASE WHEN p_type = 'text_to_speech' THEN 1 ELSE 0 END,
    CASE WHEN p_type = 'sound_effect' THEN 1 ELSE 0 END,
    CASE WHEN p_type = 'transcription' THEN 1 ELSE 0 END,
    p_credits, p_characters, p_duration
  )
  ON CONFLICT (user_id, date_period) 
  DO UPDATE SET
    tts_generations_count = ai_usage_analytics.tts_generations_count + 
      CASE WHEN p_type = 'text_to_speech' THEN 1 ELSE 0 END,
    sound_effects_count = ai_usage_analytics.sound_effects_count + 
      CASE WHEN p_type = 'sound_effect' THEN 1 ELSE 0 END,
    transcriptions_count = ai_usage_analytics.transcriptions_count + 
      CASE WHEN p_type = 'transcription' THEN 1 ELSE 0 END,
    total_credits_used = ai_usage_analytics.total_credits_used + p_credits,
    total_characters_processed = ai_usage_analytics.total_characters_processed + p_characters,
    total_audio_duration_seconds = ai_usage_analytics.total_audio_duration_seconds + p_duration,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Insertar preferencias por defecto para usuarios existentes
INSERT INTO ai_user_preferences (user_id)
SELECT id FROM auth_users 
WHERE id NOT IN (SELECT user_id FROM ai_user_preferences)
ON CONFLICT DO NOTHING;

-- Comentarios para documentar las tablas
COMMENT ON TABLE ai_user_preferences IS 'Preferencias personalizadas de cada usuario para AI Models Manager';
COMMENT ON TABLE ai_audio_generations IS 'Historial de generaciones de audio (TTS y Speech-to-Speech)';
COMMENT ON TABLE ai_sound_effects IS 'Historial de efectos de sonido generados';
COMMENT ON TABLE ai_transcriptions IS 'Historial de transcripciones (Speech-to-Text)';
COMMENT ON TABLE ai_custom_voices IS 'Voces personalizadas creadas por usuarios';
COMMENT ON TABLE ai_usage_analytics IS 'Estadísticas diarias de uso por usuario';

COMMENT ON COLUMN ai_user_preferences.recent_voices IS 'Array de voice_ids ordenados por uso reciente (máximo 10)';
COMMENT ON COLUMN ai_user_preferences.max_audio_history IS 'Número máximo de audios en historial visible (default: 20)';
COMMENT ON COLUMN ai_user_preferences.max_effects_history IS 'Número máximo de efectos en historial visible (default: 20)';
COMMENT ON COLUMN ai_audio_generations.voice_settings IS 'Configuración JSON: {stability, similarity_boost, style, use_speaker_boost}';
COMMENT ON COLUMN ai_sound_effects.prompt_influence IS 'Influencia del prompt en la generación (0.0-1.0)';
COMMENT ON COLUMN ai_custom_voices.labels IS 'Metadatos JSON: {gender, age, accent, language, etc.}';
COMMENT ON COLUMN ai_usage_analytics.top_voices_used IS 'Array JSON de voces más usadas: [{voice_id, count, voice_name}]';

-- Crear políticas RLS (Row Level Security)
ALTER TABLE ai_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audio_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sound_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_custom_voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_analytics ENABLE ROW LEVEL SECURITY;

-- Políticas: Los usuarios solo pueden ver sus propios datos
CREATE POLICY "Users can view own AI preferences" ON ai_user_preferences
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own audio generations" ON ai_audio_generations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own sound effects" ON ai_sound_effects
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own transcriptions" ON ai_transcriptions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own custom voices" ON ai_custom_voices
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own analytics" ON ai_usage_analytics
  FOR ALL USING (user_id = auth.uid());

-- Políticas para admins (pueden ver todo)
CREATE POLICY "Admins can view all AI data" ON ai_user_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth_users u 
      JOIN auth_roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can view all audio generations" ON ai_audio_generations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth_users u 
      JOIN auth_roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can view all sound effects" ON ai_sound_effects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth_users u 
      JOIN auth_roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can view all transcriptions" ON ai_transcriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth_users u 
      JOIN auth_roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can view all custom voices" ON ai_custom_voices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth_users u 
      JOIN auth_roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can view all analytics" ON ai_usage_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth_users u 
      JOIN auth_roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );
