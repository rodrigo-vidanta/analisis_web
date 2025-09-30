-- ============================================
-- VERIFICAR QUÉ TABLAS DE AI EXISTEN REALMENTE
-- ============================================

-- Listar todas las tablas que empiecen con 'ai_'
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'ai_%'
ORDER BY table_name;

-- Verificar estructura de ai_audio_generations
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'ai_audio_generations' 
ORDER BY ordinal_position;

-- Verificar constraint de generation_type
SELECT constraint_name, check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%generation_type%';

-- Contar registros por tipo
SELECT generation_type, COUNT(*) as count
FROM ai_audio_generations 
GROUP BY generation_type;
