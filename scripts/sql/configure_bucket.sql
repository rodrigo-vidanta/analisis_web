-- ============================================
-- CONFIGURAR BUCKET AI_MANAGER
-- Ejecutar en Supabase Dashboard
-- ============================================

-- 1. Crear bucket si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai_manager',
  'ai_manager', 
  true, -- Público para reproducción
  52428800, -- 50MB límite
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  allowed_mime_types = ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm'];

-- 2. Crear política para subir archivos
DROP POLICY IF EXISTS "Users can upload audio files" ON storage.objects;
CREATE POLICY "Users can upload audio files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ai_manager' AND
    auth.role() = 'service_role'
  );

-- 3. Crear política para leer archivos (público)
DROP POLICY IF EXISTS "Public can view audio files" ON storage.objects;
CREATE POLICY "Public can view audio files" ON storage.objects
  FOR SELECT USING (bucket_id = 'ai_manager');

-- 4. Verificar configuración
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'ai_manager';

-- 5. Verificar políticas
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%audio%';
