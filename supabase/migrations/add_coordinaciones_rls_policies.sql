-- ============================================
-- POLÍTICA RLS TEMPORAL PARA COORDINACIONES
-- ============================================
-- Permite UPDATE a usuarios autenticados
-- Esta es una solución temporal mientras se implementa
-- la función RPC update_coordinacion_safe
-- ============================================

-- Habilitar RLS si no está habilitado
ALTER TABLE coordinaciones ENABLE ROW LEVEL SECURITY;

-- Crear política de UPDATE para usuarios autenticados
CREATE POLICY "Allow authenticated users to update coordinaciones"
ON coordinaciones
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Crear política de SELECT para usuarios autenticados
CREATE POLICY "Allow authenticated users to select coordinaciones"
ON coordinaciones
FOR SELECT
TO authenticated
USING (true);

-- Comentario
COMMENT ON POLICY "Allow authenticated users to update coordinaciones" ON coordinaciones IS
'Política temporal que permite a usuarios autenticados actualizar coordinaciones. Debe refinarse para verificar roles de admin.';
