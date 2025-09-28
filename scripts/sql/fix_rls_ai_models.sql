-- ============================================
-- CORREGIR RLS PARA AI MODELS
-- Base de datos: hmmfuhqgvsehkizlfzga.supabase.co (PQNC)
-- ============================================

-- Habilitar RLS en las tablas de AI Models
ALTER TABLE ai_audio_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_preferences ENABLE ROW LEVEL SECURITY;

-- Política para ai_audio_generations: usuarios solo ven sus propios registros
DROP POLICY IF EXISTS "Users can view own audio generations" ON ai_audio_generations;
CREATE POLICY "Users can view own audio generations" ON ai_audio_generations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own audio generations" ON ai_audio_generations;
CREATE POLICY "Users can insert own audio generations" ON ai_audio_generations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own audio generations" ON ai_audio_generations;
CREATE POLICY "Users can update own audio generations" ON ai_audio_generations
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own audio generations" ON ai_audio_generations;
CREATE POLICY "Users can delete own audio generations" ON ai_audio_generations
    FOR DELETE USING (auth.uid() = user_id);

-- Política para ai_user_preferences: usuarios solo ven sus propias preferencias
DROP POLICY IF EXISTS "Users can manage own preferences" ON ai_user_preferences;
CREATE POLICY "Users can manage own preferences" ON ai_user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('ai_audio_generations', 'ai_user_preferences')
ORDER BY tablename, policyname;
