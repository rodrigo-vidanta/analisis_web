-- ============================================
-- CONFIGURAR RLS PARA AI_USER_PREFERENCES
-- Ejecutar en Supabase Dashboard
-- ============================================

-- 1. Habilitar RLS en ai_user_preferences
ALTER TABLE ai_user_preferences ENABLE ROW LEVEL SECURITY;

-- 2. Crear política para que usuarios accedan solo a sus preferencias
DROP POLICY IF EXISTS "Users can manage own preferences" ON ai_user_preferences;
CREATE POLICY "Users can manage own preferences" ON ai_user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- 3. Verificar que la política se creó
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'ai_user_preferences';

-- 4. Probar inserción (reemplaza con tu user_id real)
-- INSERT INTO ai_user_preferences (
--   user_id, preferred_model, default_voice_settings, auto_translate_enabled
-- ) VALUES (
--   '97e0637a-78c0-4d9c-9522-a8f66097e2fb', 
--   'eleven_v3', 
--   '{"stability": 0.5, "similarity_boost": 0.5}', 
--   true
-- ) ON CONFLICT (user_id) DO UPDATE SET
--   preferred_model = EXCLUDED.preferred_model,
--   default_voice_settings = EXCLUDED.default_voice_settings,
--   updated_at = NOW();

-- 5. Verificar estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ai_user_preferences' 
AND table_schema = 'public'
ORDER BY ordinal_position;
