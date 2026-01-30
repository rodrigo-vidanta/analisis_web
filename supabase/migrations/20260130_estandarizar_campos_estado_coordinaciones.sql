-- ============================================
-- MIGRACIÓN: Estandarización de Campos de Estado
-- ============================================
-- Elimina la confusión entre is_active, is_operativo y archivado
-- 
-- PROBLEMA:
--   - is_active es legacy y causa confusión
--   - archivado e is_operativo son los campos correctos
--   - Muchos registros tienen is_active sin valores en archivado/is_operativo
--
-- SOLUCIÓN:
--   - Sincronizar archivado con is_active (si NULL)
--   - Asegurar que is_operativo tenga valores
--   - Hacer NOT NULL los campos importantes
--
-- Fecha: 2026-01-30
-- Autor: Sistema PQNC QA Platform
-- ============================================

BEGIN;

-- ============================================
-- PASO 1: Actualizar coordinaciones
-- ============================================

-- 1.1. Sincronizar archivado con is_active (donde archivado es NULL)
UPDATE coordinaciones 
SET archivado = NOT is_active
WHERE archivado IS NULL;

-- 1.2. Asegurar que is_operativo tenga valor (default true para activos)
UPDATE coordinaciones 
SET is_operativo = is_active
WHERE is_operativo IS NULL;

-- 1.3. Hacer NOT NULL y agregar defaults
ALTER TABLE coordinaciones 
  ALTER COLUMN archivado SET DEFAULT false,
  ALTER COLUMN archivado SET NOT NULL,
  ALTER COLUMN is_operativo SET DEFAULT true,
  ALTER COLUMN is_operativo SET NOT NULL;

-- 1.4. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_coordinaciones_archivado 
  ON coordinaciones(archivado) 
  WHERE NOT archivado;

CREATE INDEX IF NOT EXISTS idx_coordinaciones_operativo 
  ON coordinaciones(is_operativo) 
  WHERE is_operativo;

-- 1.5. Comentarios descriptivos
COMMENT ON COLUMN coordinaciones.is_active IS 
'DEPRECATED: Usar archivado (borrado lógico) e is_operativo (estado operativo) en su lugar. Se mantiene solo por compatibilidad.';

COMMENT ON COLUMN coordinaciones.archivado IS 
'Borrado lógico: true = archivada (no aparece en selecciones), false = existe. Reemplaza a is_active.';

COMMENT ON COLUMN coordinaciones.is_operativo IS 
'Estado operativo: true = recibe asignaciones de prospectos, false = pausada temporalmente. Independiente de archivado.';

-- ============================================
-- PASO 2: Verificación de consistencia
-- ============================================

-- Verificar que no hay inconsistencias
DO $$
DECLARE
  v_inconsistent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_inconsistent_count
  FROM coordinaciones
  WHERE (archivado = true AND is_active = true)
     OR (archivado = false AND is_active = false);
  
  IF v_inconsistent_count > 0 THEN
    RAISE WARNING 'Encontradas % coordinaciones con inconsistencias entre archivado e is_active', v_inconsistent_count;
    
    -- Sincronizar: archivado tiene prioridad
    UPDATE coordinaciones
    SET is_active = NOT archivado
    WHERE (archivado = true AND is_active = true)
       OR (archivado = false AND is_active = false);
    
    RAISE NOTICE 'Inconsistencias corregidas: is_active sincronizado con archivado';
  ELSE
    RAISE NOTICE 'No se encontraron inconsistencias';
  END IF;
END $$;

-- ============================================
-- PASO 3: Actualizar función RPC
-- ============================================

-- Recrear función update_coordinacion_safe para usar solo archivado e is_operativo
DROP FUNCTION IF EXISTS update_coordinacion_safe(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN);

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
  -- Actualizar coordinación
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
    -- Sincronizar is_active con archivado (para compatibilidad legacy)
    is_active = NOT COALESCE(p_archivado, coordinaciones.archivado),
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

  -- Verificar que se actualizó
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coordinación no encontrada: %', p_id;
  END IF;

  -- Retornar registro actualizado
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

COMMENT ON FUNCTION update_coordinacion_safe IS 
'Actualiza coordinación de forma segura. Sincroniza is_active con archivado automáticamente. Usar archivado e is_operativo como campos principales.';

-- Grant de ejecución
GRANT EXECUTE ON FUNCTION update_coordinacion_safe TO authenticated;
GRANT EXECUTE ON FUNCTION update_coordinacion_safe TO anon;
GRANT EXECUTE ON FUNCTION update_coordinacion_safe TO service_role;

-- ============================================
-- PASO 4: Trigger para mantener sincronización
-- ============================================

-- Trigger para sincronizar is_active con archivado automáticamente
CREATE OR REPLACE FUNCTION sync_coordinaciones_is_active()
RETURNS TRIGGER AS $$
BEGIN
  -- Sincronizar is_active = NOT archivado
  NEW.is_active := NOT NEW.archivado;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_coordinaciones_is_active_trigger ON coordinaciones;

CREATE TRIGGER sync_coordinaciones_is_active_trigger
  BEFORE INSERT OR UPDATE OF archivado ON coordinaciones
  FOR EACH ROW
  EXECUTE FUNCTION sync_coordinaciones_is_active();

COMMENT ON TRIGGER sync_coordinaciones_is_active_trigger ON coordinaciones IS
'Trigger que mantiene is_active sincronizado con archivado automáticamente. is_active = NOT archivado.';

COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================

SELECT 
  'Coordinaciones totales' as metrica,
  COUNT(*) as valor
FROM coordinaciones
UNION ALL
SELECT 
  'Coordinaciones activas (no archivadas)',
  COUNT(*)
FROM coordinaciones WHERE NOT archivado
UNION ALL
SELECT 
  'Coordinaciones operativas',
  COUNT(*)
FROM coordinaciones WHERE is_operativo AND NOT archivado
UNION ALL
SELECT 
  'Coordinaciones pausadas',
  COUNT(*)
FROM coordinaciones WHERE NOT is_operativo AND NOT archivado
UNION ALL
SELECT 
  'Coordinaciones archivadas',
  COUNT(*)
FROM coordinaciones WHERE archivado;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
CAMPOS DESPUÉS DE ESTA MIGRACIÓN:

┌─────────────────┬──────────────────────────────────────────────────┐
│ Campo           │ Uso                                              │
├─────────────────┼──────────────────────────────────────────────────┤
│ is_active       │ DEPRECATED - Sincronizado automáticamente        │
│                 │ con archivado (is_active = NOT archivado)        │
├─────────────────┼──────────────────────────────────────────────────┤
│ archivado       │ USAR ESTE - Borrado lógico                       │
│                 │ true = archivada, false = existe                 │
├─────────────────┼──────────────────────────────────────────────────┤
│ is_operativo    │ USAR ESTE - Estado operativo                     │
│                 │ true = recibe asignaciones, false = pausada      │
└─────────────────┴──────────────────────────────────────────────────┘

LÓGICA RECOMENDADA EN CÓDIGO:

// ✅ CORRECTO - Coordinación disponible para asignaciones
if (!coord.archivado && coord.is_operativo) {
  // Asignar prospectos
}

// ✅ CORRECTO - Coordinación visible (no archivada)
if (!coord.archivado) {
  // Mostrar en lista
}

// ❌ EVITAR - No usar is_active directamente
if (coord.is_active) { ... }

PRÓXIMOS PASOS:
1. Actualizar código TypeScript para usar archivado e is_operativo
2. Eliminar fallbacks a is_active en servicios
3. Marcar is_active como @deprecated en interfaces
4. (Futuro) Eliminar columna is_active completamente
*/
