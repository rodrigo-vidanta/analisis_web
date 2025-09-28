-- ============================================
-- CREAR ROL PRODUCTOR Y SISTEMA DE TOKENS
-- Base de datos: hmmfuhqgvsehkizlfzga.supabase.co (PQNC)
-- ============================================

-- 1. Crear rol Productor (estructura correcta sin is_active)
INSERT INTO auth_roles (name, display_name, description)
VALUES (
  'productor',
  'Productor',
  'Productor de contenido con acceso a AI Models Manager'
) ON CONFLICT (name) DO NOTHING;

-- 2. Crear permisos específicos para AI Models
INSERT INTO auth_permissions (name, module, sub_module, description) VALUES
-- Permisos base
('ai_models.view', 'ai_models', null, 'Acceso base al módulo AI Models Manager'),
('ai_models.library.view', 'ai_models', 'library', 'Ver biblioteca de voces'),
('ai_models.library.play', 'ai_models', 'library', 'Reproducir previews de voces'),

-- Text to Speech
('ai_models.tts.view', 'ai_models', 'text_to_speech', 'Ver pestaña Text to Speech'),
('ai_models.tts.generate', 'ai_models', 'text_to_speech', 'Generar audio con Text to Speech'),
('ai_models.tts.advanced', 'ai_models', 'text_to_speech', 'Usar configuración avanzada TTS'),

-- Speech to Text
('ai_models.stt.view', 'ai_models', 'speech_to_text', 'Ver pestaña Speech to Text'),
('ai_models.stt.transcribe', 'ai_models', 'speech_to_text', 'Transcribir archivos de audio'),

-- Sound Effects
('ai_models.effects.view', 'ai_models', 'sound_effects', 'Ver pestaña Efectos de Sonido'),
('ai_models.effects.generate', 'ai_models', 'sound_effects', 'Generar efectos de sonido'),

-- Voice Management
('ai_models.voices.create', 'ai_models', 'voices', 'Crear voces personalizadas'),
('ai_models.voices.clone', 'ai_models', 'voices', 'Clonar voces existentes'),
('ai_models.voices.delete', 'ai_models', 'voices', 'Eliminar voces personalizadas'),

-- Advanced Features
('ai_models.dubbing.view', 'ai_models', 'dubbing', 'Acceso a proyectos de dubbing'),
('ai_models.dubbing.create', 'ai_models', 'dubbing', 'Crear proyectos de dubbing'),
('ai_models.music.generate', 'ai_models', 'music', 'Generar música con IA'),
('ai_models.isolation.use', 'ai_models', 'isolation', 'Usar aislamiento de audio'),

-- Administration
('ai_models.admin.view', 'ai_models', 'admin', 'Ver panel de administración de tokens'),
('ai_models.admin.manage_limits', 'ai_models', 'admin', 'Gestionar límites de tokens por usuario'),
('ai_models.admin.view_usage', 'ai_models', 'admin', 'Ver estadísticas de uso de todos los usuarios')

ON CONFLICT (name) DO NOTHING;

-- 3. Asignar permisos por defecto al rol Productor
INSERT INTO auth_role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM auth_roles r, auth_permissions p
WHERE r.name = 'productor' 
  AND p.name IN (
    'ai_models.view',
    'ai_models.library.view',
    'ai_models.library.play',
    'ai_models.stt.view',
    'ai_models.stt.transcribe'
  )
  AND NOT EXISTS (
    SELECT 1 FROM auth_role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 4. Asignar todos los permisos a Admin
INSERT INTO auth_role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM auth_roles r, auth_permissions p
WHERE r.name = 'admin' 
  AND p.module = 'ai_models'
  AND NOT EXISTS (
    SELECT 1 FROM auth_role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 5. Crear tabla para límites de tokens por usuario
CREATE TABLE IF NOT EXISTS ai_token_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  
  -- Límites mensuales
  monthly_limit INTEGER NOT NULL DEFAULT 10000, -- Tokens por mes
  current_month_usage INTEGER DEFAULT 0,
  current_month DATE DEFAULT CURRENT_DATE,
  
  -- Límites diarios (opcional)
  daily_limit INTEGER DEFAULT 500, -- Tokens por día
  current_day_usage INTEGER DEFAULT 0,
  current_day DATE DEFAULT CURRENT_DATE,
  
  -- Configuración
  auto_reset_monthly BOOLEAN DEFAULT true,
  auto_reset_daily BOOLEAN DEFAULT true,
  notifications_enabled BOOLEAN DEFAULT true,
  warning_threshold NUMERIC(3,2) DEFAULT 0.8, -- Avisar al 80%
  
  -- Metadatos
  created_by UUID REFERENCES auth_users(id), -- Admin que configuró el límite
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint único por usuario
  CONSTRAINT unique_user_token_limit UNIQUE(user_id)
);

-- 6. Crear tabla para permisos específicos de AI Models por usuario
CREATE TABLE IF NOT EXISTS ai_user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  
  -- Permisos específicos (checkboxes en admin)
  can_use_tts BOOLEAN DEFAULT false,
  can_use_advanced_tts BOOLEAN DEFAULT false,
  can_use_sound_effects BOOLEAN DEFAULT false,
  can_create_voices BOOLEAN DEFAULT false,
  can_use_dubbing BOOLEAN DEFAULT false,
  can_use_music_generation BOOLEAN DEFAULT false,
  can_use_audio_isolation BOOLEAN DEFAULT false,
  
  -- Configuración adicional
  max_audio_length_seconds INTEGER DEFAULT 300, -- 5 minutos por defecto
  max_file_size_mb INTEGER DEFAULT 25,
  allowed_models TEXT[] DEFAULT ARRAY['eleven_multilingual_v2'], -- Modelos permitidos
  
  -- Metadatos
  configured_by UUID REFERENCES auth_users(id), -- Admin que configuró los permisos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint único por usuario
  CONSTRAINT unique_user_ai_permissions UNIQUE(user_id)
);

-- 7. Crear tabla para tracking de uso de tokens
CREATE TABLE IF NOT EXISTS ai_token_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  
  -- Información de la operación
  operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN (
    'text_to_speech', 'speech_to_text', 'sound_effects', 'voice_cloning', 
    'dubbing', 'music_generation', 'audio_isolation'
  )),
  
  -- Detalles del uso
  tokens_used INTEGER NOT NULL,
  characters_processed INTEGER DEFAULT 0,
  audio_duration_seconds NUMERIC(8,2) DEFAULT 0,
  
  -- Configuración usada
  voice_id VARCHAR(100),
  voice_name VARCHAR(255),
  model_id VARCHAR(100),
  voice_settings JSONB,
  
  -- Archivos relacionados
  input_text TEXT,
  output_file_path VARCHAR(500),
  input_file_path VARCHAR(500),
  
  -- Metadatos
  ip_address INET,
  user_agent TEXT,
  session_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para consultas rápidas
  CONSTRAINT valid_tokens_used CHECK (tokens_used > 0)
);

-- 8. Función para actualizar uso de tokens
CREATE OR REPLACE FUNCTION update_token_usage(
  p_user_id UUID,
  p_tokens_used INTEGER,
  p_operation_type VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
  current_month_start DATE;
  current_day DATE;
  monthly_limit INTEGER;
  daily_limit INTEGER;
  current_monthly_usage INTEGER;
  current_daily_usage INTEGER;
BEGIN
  -- Obtener límites del usuario
  SELECT 
    monthly_limit, daily_limit, current_month_usage, current_day_usage,
    current_month, current_day
  INTO 
    monthly_limit, daily_limit, current_monthly_usage, current_daily_usage,
    current_month_start, current_day
  FROM ai_token_limits 
  WHERE user_id = p_user_id;
  
  -- Si no existe configuración, crear una por defecto
  IF NOT FOUND THEN
    INSERT INTO ai_token_limits (user_id, monthly_limit, daily_limit)
    VALUES (p_user_id, 10000, 500);
    
    monthly_limit := 10000;
    daily_limit := 500;
    current_monthly_usage := 0;
    current_daily_usage := 0;
    current_month_start := CURRENT_DATE;
    current_day := CURRENT_DATE;
  END IF;
  
  -- Verificar si es un nuevo mes
  IF DATE_TRUNC('month', CURRENT_DATE) > DATE_TRUNC('month', current_month_start) THEN
    current_monthly_usage := 0;
    current_month_start := CURRENT_DATE;
  END IF;
  
  -- Verificar si es un nuevo día
  IF CURRENT_DATE > current_day THEN
    current_daily_usage := 0;
    current_day := CURRENT_DATE;
  END IF;
  
  -- Verificar límites antes de actualizar
  IF (current_monthly_usage + p_tokens_used) > monthly_limit THEN
    RAISE EXCEPTION 'Límite mensual de tokens excedido: % + % > %', 
      current_monthly_usage, p_tokens_used, monthly_limit;
  END IF;
  
  IF (current_daily_usage + p_tokens_used) > daily_limit THEN
    RAISE EXCEPTION 'Límite diario de tokens excedido: % + % > %', 
      current_daily_usage, p_tokens_used, daily_limit;
  END IF;
  
  -- Actualizar uso
  UPDATE ai_token_limits 
  SET 
    current_month_usage = current_monthly_usage + p_tokens_used,
    current_day_usage = current_daily_usage + p_tokens_used,
    current_month = current_month_start,
    current_day = current_day,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger para actualizar automáticamente el uso de tokens
CREATE OR REPLACE FUNCTION trigger_update_token_usage()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_token_usage(NEW.user_id, NEW.tokens_used, NEW.operation_type);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_token_usage_update
  BEFORE INSERT ON ai_token_usage
  FOR EACH ROW EXECUTE FUNCTION trigger_update_token_usage();

-- 10. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_user_date ON ai_token_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_operation ON ai_token_usage(operation_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_token_limits_user ON ai_token_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_permissions_user ON ai_user_permissions(user_id);

-- 11. Crear políticas RLS
ALTER TABLE ai_token_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_token_usage ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver sus propios datos
CREATE POLICY "Users can view own token limits" ON ai_token_limits
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own AI permissions" ON ai_user_permissions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own token usage" ON ai_token_usage
  FOR ALL USING (user_id = auth.uid());

-- Admins pueden ver y modificar todo
CREATE POLICY "Admins can manage all token limits" ON ai_token_limits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth_users u 
      JOIN auth_roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can manage all AI permissions" ON ai_user_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth_users u 
      JOIN auth_roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can view all token usage" ON ai_token_usage
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth_users u 
      JOIN auth_roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- 12. Insertar configuración por defecto para usuarios Productores existentes
INSERT INTO ai_token_limits (user_id, monthly_limit, daily_limit)
SELECT u.id, 10000, 500
FROM auth_users u
JOIN auth_roles r ON u.role_id = r.id
WHERE r.name = 'productor'
  AND u.id NOT IN (SELECT user_id FROM ai_token_limits)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO ai_user_permissions (
  user_id, can_use_tts, can_use_advanced_tts, can_use_sound_effects,
  can_create_voices, can_use_dubbing, can_use_music_generation, can_use_audio_isolation
)
SELECT 
  u.id, 
  false, -- TTS básico deshabilitado por defecto
  false, -- TTS avanzado deshabilitado por defecto
  false, -- Efectos deshabilitados por defecto
  false, -- Creación de voces deshabilitada por defecto
  false, -- Dubbing deshabilitado por defecto
  false, -- Música deshabilitada por defecto
  false  -- Aislamiento deshabilitado por defecto
FROM auth_users u
JOIN auth_roles r ON u.role_id = r.id
WHERE r.name = 'productor'
  AND u.id NOT IN (SELECT user_id FROM ai_user_permissions)
ON CONFLICT (user_id) DO NOTHING;

-- 13. Vista para obtener información completa de tokens por usuario
CREATE OR REPLACE VIEW ai_user_token_info AS
SELECT 
  u.id as user_id,
  u.full_name,
  u.email,
  r.name as role_name,
  
  -- Límites
  COALESCE(tl.monthly_limit, 0) as monthly_limit,
  COALESCE(tl.daily_limit, 0) as daily_limit,
  
  -- Uso actual
  COALESCE(tl.current_month_usage, 0) as current_month_usage,
  COALESCE(tl.current_day_usage, 0) as current_day_usage,
  
  -- Porcentajes
  CASE 
    WHEN tl.monthly_limit > 0 THEN 
      ROUND((tl.current_month_usage::NUMERIC / tl.monthly_limit::NUMERIC) * 100, 2)
    ELSE 0 
  END as monthly_usage_percentage,
  
  CASE 
    WHEN tl.daily_limit > 0 THEN 
      ROUND((tl.current_day_usage::NUMERIC / tl.daily_limit::NUMERIC) * 100, 2)
    ELSE 0 
  END as daily_usage_percentage,
  
  -- Permisos
  COALESCE(up.can_use_tts, false) as can_use_tts,
  COALESCE(up.can_use_advanced_tts, false) as can_use_advanced_tts,
  COALESCE(up.can_use_sound_effects, false) as can_use_sound_effects,
  COALESCE(up.can_create_voices, false) as can_create_voices,
  COALESCE(up.can_use_dubbing, false) as can_use_dubbing,
  COALESCE(up.can_use_music_generation, false) as can_use_music_generation,
  COALESCE(up.can_use_audio_isolation, false) as can_use_audio_isolation,
  
  -- Timestamps
  tl.updated_at as limits_updated_at
  
FROM auth_users u
JOIN auth_roles r ON u.role_id = r.id
LEFT JOIN ai_token_limits tl ON u.id = tl.user_id
LEFT JOIN ai_user_permissions up ON u.id = up.user_id
WHERE r.name IN ('admin', 'productor');

-- 14. Función para obtener estadísticas de uso por período
CREATE OR REPLACE FUNCTION get_user_token_stats(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  date DATE,
  total_tokens INTEGER,
  tts_tokens INTEGER,
  effects_tokens INTEGER,
  stt_tokens INTEGER,
  operations_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(tu.created_at) as date,
    SUM(tu.tokens_used)::INTEGER as total_tokens,
    SUM(CASE WHEN tu.operation_type = 'text_to_speech' THEN tu.tokens_used ELSE 0 END)::INTEGER as tts_tokens,
    SUM(CASE WHEN tu.operation_type = 'sound_effects' THEN tu.tokens_used ELSE 0 END)::INTEGER as effects_tokens,
    SUM(CASE WHEN tu.operation_type = 'speech_to_text' THEN tu.tokens_used ELSE 0 END)::INTEGER as stt_tokens,
    COUNT(*)::INTEGER as operations_count
  FROM ai_token_usage tu
  WHERE tu.user_id = p_user_id
    AND tu.created_at >= CURRENT_DATE - INTERVAL '%s days' % p_days
  GROUP BY DATE(tu.created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- 15. Comentarios para documentar
COMMENT ON TABLE ai_token_limits IS 'Límites de tokens mensuales y diarios por usuario';
COMMENT ON TABLE ai_user_permissions IS 'Permisos específicos de AI Models por usuario (checkboxes en admin)';
COMMENT ON TABLE ai_token_usage IS 'Tracking detallado de uso de tokens por operación';
COMMENT ON VIEW ai_user_token_info IS 'Vista completa de información de tokens y permisos por usuario';

COMMENT ON COLUMN ai_token_limits.warning_threshold IS 'Porcentaje para mostrar advertencia (0.8 = 80%)';
COMMENT ON COLUMN ai_user_permissions.allowed_models IS 'Array de model_ids que el usuario puede usar';
COMMENT ON COLUMN ai_token_usage.tokens_used IS 'Número de tokens consumidos en esta operación';

-- 16. Insertar configuración por defecto para admins existentes
INSERT INTO ai_token_limits (user_id, monthly_limit, daily_limit)
SELECT u.id, 999999, 99999 -- Límites muy altos para admins
FROM auth_users u
JOIN auth_roles r ON u.role_id = r.id
WHERE r.name = 'admin'
  AND u.id NOT IN (SELECT user_id FROM ai_token_limits)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO ai_user_permissions (
  user_id, can_use_tts, can_use_advanced_tts, can_use_sound_effects,
  can_create_voices, can_use_dubbing, can_use_music_generation, can_use_audio_isolation,
  max_audio_length_seconds, max_file_size_mb
)
SELECT 
  u.id, 
  true, true, true, true, true, true, true, -- Todos los permisos para admins
  3600, 100 -- Límites altos para admins
FROM auth_users u
JOIN auth_roles r ON u.role_id = r.id
WHERE r.name = 'admin'
  AND u.id NOT IN (SELECT user_id FROM ai_user_permissions)
ON CONFLICT (user_id) DO NOTHING;
