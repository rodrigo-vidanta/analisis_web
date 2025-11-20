-- ============================================
-- CREAR COLUMNAS is_operativo y archivado
-- Base de datos: SystemUI (zbylezfyagwrxoecioup.supabase.co)
-- Tabla: public.coordinaciones
-- 
-- IMPORTANTE: Ejecutar este script en Supabase Dashboard SQL Editor
-- para asegurar que las columnas se creen correctamente
-- ============================================

-- Paso 1: Verificar estructura actual
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'coordinaciones'
ORDER BY ordinal_position;

-- Paso 2: Crear columna is_operativo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_attribute 
        WHERE attrelid = 'coordinaciones'::regclass 
        AND attname = 'is_operativo'
    ) THEN
        ALTER TABLE coordinaciones ADD COLUMN is_operativo BOOLEAN DEFAULT TRUE;
        COMMENT ON COLUMN coordinaciones.is_operativo IS 'Indica si la coordinación está operativa para asignación de prospectos. No afecta otras funcionalidades.';
        RAISE NOTICE '✅ Columna is_operativo creada exitosamente';
    ELSE
        RAISE NOTICE '⚠️ Columna is_operativo ya existe';
    END IF;
END $$;

-- Paso 3: Crear columna archivado
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_attribute 
        WHERE attrelid = 'coordinaciones'::regclass 
        AND attname = 'archivado'
    ) THEN
        ALTER TABLE coordinaciones ADD COLUMN archivado BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN coordinaciones.archivado IS 'Indica si la coordinación está archivada (borrado lógico). Cuando se archiva, se debe reasignar ejecutivos y coordinadores.';
        RAISE NOTICE '✅ Columna archivado creada exitosamente';
    ELSE
        RAISE NOTICE '⚠️ Columna archivado ya existe';
    END IF;
END $$;

-- Paso 4: Actualizar todas las coordinaciones para que estén activas y operativas
UPDATE coordinaciones
SET 
    is_operativo = TRUE,
    archivado = FALSE,
    is_active = TRUE,
    updated_at = NOW()
WHERE TRUE;

-- Paso 5: Verificar que las columnas existen
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'coordinaciones'
AND column_name IN ('is_operativo', 'archivado', 'is_active')
ORDER BY column_name;

-- Paso 6: Verificar datos de ejemplo
SELECT 
    id,
    codigo,
    nombre,
    is_operativo,
    archivado,
    is_active,
    updated_at
FROM coordinaciones
ORDER BY codigo
LIMIT 5;

-- Paso 7: Crear función RPC para actualizar is_operativo
CREATE OR REPLACE FUNCTION update_coordinacion_is_operativo(
    p_id UUID,
    p_is_operativo BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Actualizar is_operativo directamente
    UPDATE coordinaciones
    SET 
        is_operativo = p_is_operativo,
        updated_at = NOW()
    WHERE id = p_id;
    
    -- Retornar datos actualizados
    SELECT row_to_json(c) INTO v_result
    FROM (
        SELECT 
            id,
            codigo,
            nombre,
            descripcion,
            COALESCE(archivado, NOT is_active) as archivado,
            COALESCE(is_operativo, true) as is_operativo,
            is_active,
            created_at,
            updated_at
        FROM coordinaciones
        WHERE id = p_id
    ) c;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Paso 8: Verificar que la función existe
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'update_coordinacion_is_operativo';

-- ============================================
-- NOTA IMPORTANTE:
-- Después de ejecutar este script, PostgREST puede tardar 1-2 minutos
-- en actualizar su schema cache. Si el botón Power sigue sin funcionar,
-- espera unos minutos y recarga la página.
-- ============================================

