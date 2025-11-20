-- ============================================
-- CORREGIR RLS PARA TIMELINE ACTIVITIES
-- Base de datos: system_ui (glsmifhkoaifvaegsozd.supabase.co)
-- ============================================
-- El sistema usa autenticación personalizada con sesiones,
-- por lo que auth.uid() no funciona. 
-- 
-- OPCIÓN 1: Deshabilitar RLS (más simple)
-- OPCIÓN 2: Crear función RPC con SECURITY DEFINER (más seguro)
--
-- Ejecutar este script en el SQL Editor de Supabase

-- ============================================
-- OPCIÓN 1: DESHABILITAR RLS
-- ============================================
-- Deshabilitar RLS temporalmente
ALTER TABLE timeline_activities DISABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes que usan auth.uid()
DROP POLICY IF EXISTS "Users can view own activities" ON timeline_activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON timeline_activities;
DROP POLICY IF EXISTS "Users can update own activities" ON timeline_activities;
DROP POLICY IF EXISTS "Users can delete own activities" ON timeline_activities;

-- Verificar que RLS está deshabilitado
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'timeline_activities';

