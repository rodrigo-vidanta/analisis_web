-- ============================================
-- FUNCIÓN RPC: update_coordinacion_safe
-- ============================================
-- Permite actualizar coordinaciones de forma segura
-- SECURITY DEFINER permite ejecutar con permisos elevados
-- 
-- Fecha de creación: 2026-01-30
-- Autor: Sistema PQNC QA Platform
-- ============================================

CREATE OR REPLACE FUNCTION update_coordinacion_safe(
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
  is_active BOOLEAN,
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
  -- Construir el UPDATE dinámicamente solo con campos no-null
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
    -- Sincronizar is_active: si se archiva, desactivar; si se activa operativamente, activar
    is_active = CASE
      WHEN p_archivado IS NOT NULL AND p_archivado = TRUE THEN FALSE
      WHEN p_is_operativo IS NOT NULL THEN p_is_operativo
      ELSE coordinaciones.is_active
    END,
    updated_at = NOW()
  WHERE coordinaciones.id = p_id
  RETURNING 
    coordinaciones.id,
    coordinaciones.codigo,
    coordinaciones.nombre,
    coordinaciones.descripcion,
    coordinaciones.is_active,
    coordinaciones.is_operativo,
    coordinaciones.archivado,
    coordinaciones.created_at,
    coordinaciones.updated_at,
    coordinaciones.id_dynamics
  INTO v_updated_record;

  -- Verificar que se actualizó algo
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coordinación no encontrada: %', p_id;
  END IF;

  -- Retornar el registro actualizado
  RETURN QUERY SELECT 
    v_updated_record.id,
    v_updated_record.codigo,
    v_updated_record.nombre,
    v_updated_record.descripcion,
    v_updated_record.is_active,
    v_updated_record.is_operativo,
    v_updated_record.archivado,
    v_updated_record.created_at,
    v_updated_record.updated_at,
    v_updated_record.id_dynamics;
END;
$$;

-- Comentario descriptivo
COMMENT ON FUNCTION update_coordinacion_safe IS 
'Actualiza una coordinación de forma segura. Sincroniza is_active con is_operativo y archivado automáticamente. SECURITY DEFINER permite ejecutar con permisos elevados.';

-- Grant de ejecución a usuarios autenticados y anon
GRANT EXECUTE ON FUNCTION update_coordinacion_safe TO authenticated;
GRANT EXECUTE ON FUNCTION update_coordinacion_safe TO anon;
GRANT EXECUTE ON FUNCTION update_coordinacion_safe TO service_role;
