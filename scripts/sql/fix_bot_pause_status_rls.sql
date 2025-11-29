-- ============================================
-- CORREGIR POLÍTICAS RLS PARA bot_pause_status
-- Base: zbylezfyagwrxoecioup.supabase.co (SystemUI)
-- Ejecutar en SQL Editor de Supabase SystemUI
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view bot pause status" ON bot_pause_status;
DROP POLICY IF EXISTS "Users can create bot pause status" ON bot_pause_status;
DROP POLICY IF EXISTS "Users can update bot pause status" ON bot_pause_status;
DROP POLICY IF EXISTS "Users can delete bot pause status" ON bot_pause_status;

-- Política para SELECT: Permitir acceso con service_role o authenticated
CREATE POLICY "Allow service role and authenticated users to view bot pause status" ON bot_pause_status
  FOR SELECT USING (
    auth.role() = 'service_role' OR 
    auth.role() = 'authenticated'
  );

-- Política para INSERT: Permitir acceso con service_role o authenticated
CREATE POLICY "Allow service role and authenticated users to create bot pause status" ON bot_pause_status
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR 
    auth.role() = 'authenticated'
  );

-- Política para UPDATE: Permitir acceso con service_role o authenticated
CREATE POLICY "Allow service role and authenticated users to update bot pause status" ON bot_pause_status
  FOR UPDATE USING (
    auth.role() = 'service_role' OR 
    auth.role() = 'authenticated'
  );

-- Política para DELETE: Permitir acceso con service_role o authenticated
CREATE POLICY "Allow service role and authenticated users to delete bot pause status" ON bot_pause_status
  FOR DELETE USING (
    auth.role() = 'service_role' OR 
    auth.role() = 'authenticated'
  );

-- Verificar políticas creadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'bot_pause_status'
ORDER BY policyname;

