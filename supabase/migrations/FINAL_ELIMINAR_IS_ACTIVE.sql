-- ============================================
-- EJECUTAR EN SUPABASE DASHBOARD → SQL EDITOR
-- ============================================
-- Proyecto: PQNC_AI (glsmifhkoaifvaegsozd)
-- Fecha: 2026-01-30
-- 
-- IMPORTANTE: Ejecutar TODO este script de una vez
-- ============================================

-- 1. Eliminar columna is_active
ALTER TABLE coordinaciones DROP COLUMN IF EXISTS is_active;

-- 2. Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_coordinaciones_archivado 
  ON coordinaciones(archivado) WHERE NOT archivado;

CREATE INDEX IF NOT EXISTS idx_coordinaciones_operativo 
  ON coordinaciones(is_operativo) WHERE is_operativo;

-- 3. Comentarios descriptivos
COMMENT ON COLUMN coordinaciones.archivado IS 
  'Borrado lógico: true = archivada (no aparece), false = existe';

COMMENT ON COLUMN coordinaciones.is_operativo IS 
  'Estado operativo: true = recibe asignaciones, false = pausada';

-- 4. Eliminar TODAS las versiones previas de la función
DROP FUNCTION IF EXISTS update_coordinacion_safe(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS update_coordinacion_safe(UUID);
DROP FUNCTION IF EXISTS update_coordinacion_safe CASCADE;

-- 5. Crear función RPC limpia
CREATE FUNCTION update_coordinacion_safe(
  p_id UUID,
  p_codigo TEXT DEFAULT NULL,
  p_nombre TEXT DEFAULT NULL,
  p_descripcion TEXT DEFAULT NULL,
  p_archivado BOOLEAN DEFAULT NULL,
  p_is_operativo BOOLEAN DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  codigo TEXT,
  nombre TEXT,
  descripcion TEXT,
  is_operativo BOOLEAN,
  archivado BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  id_dynamics TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_record RECORD;
BEGIN
  UPDATE coordinaciones
  SET
    codigo = COALESCE(p_codigo, coordinaciones.codigo),
    nombre = COALESCE(p_nombre, coordinaciones.nombre),
    descripcion = CASE 
      WHEN p_descripcion IS NOT NULL THEN p_descripcion 
      ELSE coordinaciones.descripcion 
    END,
    archivado = COALESCE(p_archivado, coordinaciones.archivado),
    is_operativo = COALESCE(p_is_operativo, coordinaciones.is_operativo),
    updated_at = NOW()
  WHERE coordinaciones.id = p_id
  RETURNING 
    coordinaciones.id,
    coordinaciones.codigo,
    coordinaciones.nombre,
    coordinaciones.descripcion,
    coordinaciones.is_operativo,
    coordinaciones.archivado,
    coordinaciones.created_at,
    coordinaciones.updated_at,
    coordinaciones.id_dynamics
  INTO v_updated_record;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coordinación no encontrada';
  END IF;

  RETURN QUERY SELECT 
    v_updated_record.id,
    v_updated_record.codigo,
    v_updated_record.nombre,
    v_updated_record.descripcion,
    v_updated_record.is_operativo,
    v_updated_record.archivado,
    v_updated_record.created_at,
    v_updated_record.updated_at,
    v_updated_record.id_dynamics;
END;
$$;

COMMENT ON FUNCTION update_coordinacion_safe IS 
  'Actualiza coordinación de forma segura. Usar archivado (borrado lógico) e is_operativo (estado operativo).';

-- 6. Permisos (especificando la firma completa)
GRANT EXECUTE ON FUNCTION update_coordinacion_safe(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION update_coordinacion_safe(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION update_coordinacion_safe(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) TO service_role;

-- 7. Verificación final
SELECT 
  'Total coordinaciones' as metrica, 
  COUNT(*) as valor 
FROM coordinaciones

UNION ALL

SELECT 
  'Activas (no archivadas)', 
  COUNT(*) 
FROM coordinaciones 
WHERE NOT archivado

UNION ALL

SELECT 
  'Operativas', 
  COUNT(*) 
FROM coordinaciones 
WHERE is_operativo AND NOT archivado

UNION ALL

SELECT 
  'Pausadas', 
  COUNT(*) 
FROM coordinaciones 
WHERE NOT is_operativo AND NOT archivado

UNION ALL

SELECT 
  'Archivadas', 
  COUNT(*) 
FROM coordinaciones 
WHERE archivado;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- ✅ Columna is_active eliminada
-- ✅ Índices creados para mejor performance
-- ✅ Función RPC update_coordinacion_safe disponible
-- ✅ Permisos configurados correctamente
-- ✅ Tabla de métricas mostrada
-- ============================================
