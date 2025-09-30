-- ============================================
-- CORREGIR CONSTRAINT DE generation_type
-- Agregar 'sound_effect' a los valores permitidos
-- ============================================

-- Eliminar constraint actual
ALTER TABLE ai_audio_generations DROP CONSTRAINT IF EXISTS ai_audio_generations_generation_type_check;

-- Crear nuevo constraint que incluya sound_effect
ALTER TABLE ai_audio_generations 
ADD CONSTRAINT ai_audio_generations_generation_type_check 
CHECK (generation_type IN ('text_to_speech', 'speech_to_speech', 'sound_effect'));

-- Verificar que funciona
SELECT 'Constraint actualizado exitosamente' as status;
