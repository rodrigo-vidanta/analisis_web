-- ============================================
-- CONFIGURAR BUCKET USER-AVATARS
-- Ejecutar en Supabase Dashboard (System UI)
-- Base de datos: zbylezfyagwrxoecioup.supabase.co
-- ============================================

-- 1. Crear bucket si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars', 
  true, -- Público para que las imágenes se puedan ver
  5242880, -- 5MB límite
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- 2. Crear política para que usuarios autenticados puedan subir sus propios avatares
-- El nombre del archivo contiene el user_id: avatar-{userId}-{timestamp}.{ext}
DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
CREATE POLICY "Users can upload own avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-avatars' AND
    auth.role() = 'authenticated'
  );

-- 3. Crear política para que usuarios autenticados puedan actualizar sus propios avatares
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-avatars' AND
    auth.role() = 'authenticated'
  );

-- 4. Crear política para que usuarios autenticados puedan eliminar sus propios avatares
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-avatars' AND
    auth.role() = 'authenticated'
  );

-- 5. Crear política para que todos puedan leer avatares (público)
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-avatars');

-- 6. Política adicional para service_role (admin) - puede hacer todo
DROP POLICY IF EXISTS "Service role can manage all avatars" ON storage.objects;
CREATE POLICY "Service role can manage all avatars" ON storage.objects
  FOR ALL USING (
    bucket_id = 'user-avatars' AND
    auth.role() = 'service_role'
  );

-- 7. Verificar configuración
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'user-avatars';

-- 8. Verificar políticas
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%avatar%';

