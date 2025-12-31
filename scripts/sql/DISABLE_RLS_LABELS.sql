-- ============================================
-- DESHABILITAR RLS en Tablas de Etiquetas
-- Base: SYSTEM_UI (zbylezfyagwrxoecioup)
-- ============================================
-- 
-- RAZÓN: El sistema usa auth custom (no Supabase Auth)
-- Por lo tanto auth.uid() NO EXISTE y las políticas RLS siempre fallan
-- 
-- SEGURIDAD: Las funciones RPC tienen SECURITY DEFINER y validan permisos
-- ============================================

-- Deshabilitar RLS (la seguridad se maneja en funciones RPC)
ALTER TABLE whatsapp_labels_preset DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_labels_custom DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversation_labels DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS esté deshabilitado
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename LIKE 'whatsapp_labels%'
ORDER BY tablename;

