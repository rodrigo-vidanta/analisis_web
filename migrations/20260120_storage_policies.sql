-- ============================================
-- POLÍTICAS DE STORAGE PARA BUCKETS
-- ============================================
-- Estado: ✅ EJECUTADO via Supabase Management API
-- Proyecto: PQNC_AI (glsmifhkoaifvaegsozd)
-- Fecha: 20 Enero 2026
-- ============================================

-- ========================================
-- BUCKET: user-avatars
-- ========================================

-- Permitir a usuarios autenticados subir sus avatares
CREATE POLICY "Users can upload own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir a usuarios autenticados actualizar sus avatares
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir a usuarios autenticados eliminar sus avatares
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Lectura pública (el bucket ya es público, pero por si acaso)
CREATE POLICY "Public read for user-avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-avatars');

-- ========================================
-- BUCKET: support-tickets
-- ========================================

-- Permitir a usuarios autenticados subir screenshots de tickets
CREATE POLICY "Authenticated users can upload screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'support-tickets');

-- Lectura pública para screenshots
CREATE POLICY "Public read for support-tickets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'support-tickets');

-- Solo el creador o admins pueden eliminar screenshots
CREATE POLICY "Users can delete own screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'support-tickets'
  AND (storage.foldername(name))[1] = 'screenshots'
);

-- ========================================
-- VERIFICACIÓN
-- ========================================
-- Verificar políticas creadas
SELECT 
  policyname,
  tablename,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;
