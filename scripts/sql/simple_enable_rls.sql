-- ============================================
-- HABILITAR RLS SIMPLE (sin crear políticas duplicadas)
-- Ejecutar en Supabase Dashboard
-- ============================================

-- Solo habilitar RLS si no está habilitado
ALTER TABLE ai_token_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_preferences ENABLE ROW LEVEL SECURITY;

-- Verificar estado de RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('ai_token_limits', 'ai_user_preferences')
ORDER BY tablename;

-- Verificar políticas existentes
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('ai_token_limits', 'ai_user_preferences')
ORDER BY tablename, policyname;
