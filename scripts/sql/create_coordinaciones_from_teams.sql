-- ============================================
-- CREAR COORDINACIONES DESDE EQUIPOS
-- Base de datos: zbylezfyagwrxoecioup.supabase.co (SystemUI)
-- Propósito: Crear coordinaciones para VEN, COB ACA, I360, MVP, BOOM
-- ============================================

-- Crear coordinaciones si no existen
INSERT INTO coordinaciones (codigo, nombre, descripcion, is_active)
VALUES
  ('VEN', 'VEN', 'Coordinación VEN', true),
  ('COBACA', 'COB ACA', 'Coordinación COB ACA', true),
  ('I360', 'I360', 'Coordinación I360', true),
  ('MVP', 'MVP', 'Coordinación MVP', true),
  ('BOOM', 'BOOM', 'Coordinación BOOM', true)
ON CONFLICT (codigo) DO UPDATE
SET 
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

