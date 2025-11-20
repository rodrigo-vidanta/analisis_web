-- ============================================
-- ACTUALIZAR ESQUEMA DE COORDINACIONES
-- Base: zbylezfyagwrxoecioup.supabase.co (SystemUI)
-- 
-- Cambios:
-- 1. Agregar campo is_operativo (boolean) para control de asignación de prospectos
-- 2. Renombrar is_active a archivado (borrado lógico)
-- 3. Crear función RPC para archivar y reasignar usuarios
-- ============================================

-- ============================================
-- PASO 1: Agregar campo is_operativo
-- ============================================
ALTER TABLE coordinaciones 
ADD COLUMN IF NOT EXISTS is_operativo BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN coordinaciones.is_operativo IS 'Indica si la coordinación está operativa para asignación de prospectos. No afecta otras funcionalidades.';

-- ============================================
-- PASO 2: Renombrar is_active a archivado (borrado lógico)
-- ============================================
-- Primero agregar la nueva columna
ALTER TABLE coordinaciones 
ADD COLUMN IF NOT EXISTS archivado BOOLEAN DEFAULT FALSE;

-- Migrar datos existentes (si is_active = false, entonces archivado = true)
UPDATE coordinaciones 
SET archivado = NOT is_active
WHERE archivado IS NULL OR archivado = FALSE;

-- Agregar comentario
COMMENT ON COLUMN coordinaciones.archivado IS 'Indica si la coordinación está archivada (borrado lógico). Cuando se archiva, se debe reasignar ejecutivos y coordinadores.';

-- ============================================
-- PASO 3: Crear función RPC para archivar coordinación y reasignar usuarios
-- ============================================
CREATE OR REPLACE FUNCTION archivar_coordinacion_y_reasignar(
    p_coordinacion_id UUID,
    p_nueva_coordinacion_id UUID,
    p_usuario_id UUID  -- Usuario que realiza la acción (para auditoría)
)
RETURNS JSONB AS $$
DECLARE
    v_ejecutivos_reasignados INTEGER := 0;
    v_coordinadores_reasignados INTEGER := 0;
    v_resultado JSONB;
BEGIN
    -- Validar que la coordinación existe y no está ya archivada
    IF NOT EXISTS (SELECT 1 FROM coordinaciones WHERE id = p_coordinacion_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'La coordinación no existe'
        );
    END IF;
    
    IF EXISTS (SELECT 1 FROM coordinaciones WHERE id = p_coordinacion_id AND archivado = TRUE) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'La coordinación ya está archivada'
        );
    END IF;
    
    -- Validar que la nueva coordinación existe y no está archivada
    IF NOT EXISTS (SELECT 1 FROM coordinaciones WHERE id = p_nueva_coordinacion_id AND archivado = FALSE) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'La coordinación destino no existe o está archivada'
        );
    END IF;
    
    -- Reasignar ejecutivos (usuarios con coordinacion_id directo)
    UPDATE auth_users
    SET coordinacion_id = p_nueva_coordinacion_id,
        updated_at = NOW()
    WHERE coordinacion_id = p_coordinacion_id
    AND is_ejecutivo = TRUE
    AND is_active = TRUE;
    
    GET DIAGNOSTICS v_ejecutivos_reasignados = ROW_COUNT;
    
    -- Reasignar coordinadores (actualizar tabla coordinador_coordinaciones)
    UPDATE coordinador_coordinaciones
    SET coordinacion_id = p_nueva_coordinacion_id,
        updated_at = NOW()
    WHERE coordinacion_id = p_coordinacion_id;
    
    GET DIAGNOSTICS v_coordinadores_reasignados = ROW_COUNT;
    
    -- Archivar la coordinación
    UPDATE coordinaciones
    SET archivado = TRUE,
        updated_at = NOW()
    WHERE id = p_coordinacion_id;
    
    -- Construir resultado
    v_resultado := jsonb_build_object(
        'success', true,
        'coordinacion_id', p_coordinacion_id,
        'nueva_coordinacion_id', p_nueva_coordinacion_id,
        'ejecutivos_reasignados', v_ejecutivos_reasignados,
        'coordinadores_reasignados', v_coordinadores_reasignados,
        'archivado_at', NOW()
    );
    
    RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION archivar_coordinacion_y_reasignar IS 'Archiva una coordinación y reasigna todos sus ejecutivos y coordinadores a otra coordinación. Operación irreversible.';

-- ============================================
-- PASO 4: Crear función para obtener coordinaciones operativas
-- ============================================
CREATE OR REPLACE FUNCTION get_coordinaciones_operativas()
RETURNS TABLE (
    id UUID,
    codigo VARCHAR,
    nombre VARCHAR,
    descripcion TEXT,
    is_operativo BOOLEAN,
    archivado BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.codigo,
        c.nombre,
        c.descripcion,
        c.is_operativo,
        c.archivado,
        c.created_at,
        c.updated_at
    FROM coordinaciones c
    WHERE c.archivado = FALSE
    ORDER BY c.nombre;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_coordinaciones_operativas IS 'Obtiene todas las coordinaciones no archivadas, ordenadas por nombre.';

-- ============================================
-- PASO 5: Crear función para obtener coordinaciones para asignación de prospectos
-- ============================================
CREATE OR REPLACE FUNCTION get_coordinaciones_para_asignacion()
RETURNS TABLE (
    id UUID,
    codigo VARCHAR,
    nombre VARCHAR,
    descripcion TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.codigo,
        c.nombre,
        c.descripcion
    FROM coordinaciones c
    WHERE c.archivado = FALSE
    AND c.is_operativo = TRUE
    ORDER BY c.nombre;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_coordinaciones_para_asignacion IS 'Obtiene solo las coordinaciones operativas y no archivadas, para asignación de prospectos.';

-- ============================================
-- PASO 6: Crear índices para optimizar consultas
-- ============================================
CREATE INDEX IF NOT EXISTS idx_coordinaciones_archivado ON coordinaciones(archivado) WHERE archivado = FALSE;
CREATE INDEX IF NOT EXISTS idx_coordinaciones_is_operativo ON coordinaciones(is_operativo) WHERE is_operativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_coordinaciones_archivado_operativo ON coordinaciones(archivado, is_operativo);

-- ============================================
-- PASO 7: Actualizar datos existentes
-- ============================================
-- Asegurar que todas las coordinaciones activas tengan is_operativo = TRUE por defecto
UPDATE coordinaciones 
SET is_operativo = TRUE
WHERE is_operativo IS NULL;

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
    '=== ESTRUCTURA ACTUALIZADA ===' as seccion,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'coordinaciones'
ORDER BY ordinal_position;

SELECT 
    '✅ Esquema de coordinaciones actualizado correctamente' as resultado;

