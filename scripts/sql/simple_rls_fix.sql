-- Habilitar RLS y crear política simple
ALTER TABLE ai_audio_generations ENABLE ROW LEVEL SECURITY;

-- Política simple: usuarios pueden hacer todo con sus propios registros
DROP POLICY IF EXISTS "ai_audio_generations_policy" ON ai_audio_generations;
CREATE POLICY "ai_audio_generations_policy" ON ai_audio_generations
    FOR ALL USING (auth.uid() = user_id);

-- Verificar
SELECT 'RLS habilitado correctamente' as status;
