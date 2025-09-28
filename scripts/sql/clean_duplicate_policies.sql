-- ============================================
-- LIMPIAR POLÍTICAS DUPLICADAS
-- Ejecutar en Supabase Dashboard
-- ============================================

-- Limpiar políticas duplicadas de ai_token_limits
DROP POLICY IF EXISTS "Users can view own token limits" ON ai_token_limits;
DROP POLICY IF EXISTS "Users can update own token limits" ON ai_token_limits;
DROP POLICY IF EXISTS "Users can insert own token limits" ON ai_token_limits;

-- Limpiar políticas duplicadas de ai_user_preferences  
DROP POLICY IF EXISTS "Users can manage own preferences" ON ai_user_preferences;

-- Crear políticas simples
CREATE POLICY "ai_token_limits_policy" ON ai_token_limits
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "ai_user_preferences_policy" ON ai_user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Verificar que se crearon
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('ai_token_limits', 'ai_user_preferences')
ORDER BY tablename, policyname;
