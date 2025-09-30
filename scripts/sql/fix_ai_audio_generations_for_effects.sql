-- ============================================
-- ACTUALIZAR ai_audio_generations PARA INCLUIR EFECTOS
-- ============================================

-- Eliminar constraint actual
ALTER TABLE ai_audio_generations 
DROP CONSTRAINT IF EXISTS ai_audio_generations_generation_type_check;

-- Crear nuevo constraint que incluya sound_effect
ALTER TABLE ai_audio_generations 
ADD CONSTRAINT ai_audio_generations_generation_type_check 
CHECK (generation_type IN ('text_to_speech', 'speech_to_speech', 'sound_effect'));

-- Verificar que funciona con un INSERT de prueba
INSERT INTO ai_audio_generations (
  user_id,
  generation_type,
  original_text,
  voice_id,
  voice_name,
  model_id,
  voice_settings,
  character_count,
  cost_credits,
  status
) VALUES (
  (SELECT id FROM auth_users LIMIT 1),
  'sound_effect',
  'test sound effect',
  'sound_effect',
  'Efecto de Sonido',
  'eleven_sound_effects',
  '{"duration": 10}',
  17,
  10,
  'completed'
);

-- Eliminar el registro de prueba
DELETE FROM ai_audio_generations 
WHERE original_text = 'test sound effect' 
AND generation_type = 'sound_effect';

SELECT 'ai_audio_generations actualizada para efectos de sonido' as status;
