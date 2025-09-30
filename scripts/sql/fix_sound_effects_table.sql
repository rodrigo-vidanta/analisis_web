-- ============================================
-- CORREGIR TABLA ai_sound_effects
-- Problema: Constraint redundante causa error de subquery
-- ============================================

-- Eliminar constraint problemático
ALTER TABLE ai_sound_effects DROP CONSTRAINT IF EXISTS unique_user_effect;

-- Verificar estructura
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'ai_sound_effects' 
ORDER BY ordinal_position;

-- Verificar que no hay registros duplicados
SELECT user_id, COUNT(*) as count
FROM ai_sound_effects 
GROUP BY user_id 
HAVING COUNT(*) > 1;

-- Mensaje de confirmación
SELECT 'Tabla ai_sound_effects corregida exitosamente' as status;
