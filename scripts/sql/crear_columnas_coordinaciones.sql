-- ============================================
-- CREAR COLUMNAS NUEVAS EN COORDINACIONES
-- Base: zbylezfyagwrxoecioup.supabase.co (SystemUI)
-- 
-- IMPORTANTE: Ejecutar este script en Supabase Dashboard SQL Editor
-- para asegurar que las columnas se creen correctamente
-- ============================================

-- Paso 1: Agregar columna archivado
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_attribute 
        WHERE attrelid = 'coordinaciones'::regclass 
        AND attname = 'archivado'
    ) THEN
        ALTER TABLE coordinaciones ADD COLUMN archivado BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN coordinaciones.archivado IS 'Indica si la coordinación está archivada (borrado lógico). Cuando se archiva, se debe reasignar ejecutivos y coordinadores.';
        RAISE NOTICE 'Columna archivado creada exitosamente';
    ELSE
        RAISE NOTICE 'Columna archivado ya existe';
    END IF;
END $$;

-- Paso 2: Agregar columna is_operativo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_attribute 
        WHERE attrelid = 'coordinaciones'::regclass 
        AND attname = 'is_operativo'
    ) THEN
        ALTER TABLE coordinaciones ADD COLUMN is_operativo BOOLEAN DEFAULT TRUE;
        COMMENT ON COLUMN coordinaciones.is_operativo IS 'Indica si la coordinación está operativa para asignación de prospectos. No afecta otras funcionalidades.';
        RAISE NOTICE 'Columna is_operativo creada exitosamente';
    ELSE
        RAISE NOTICE 'Columna is_operativo ya existe';
    END IF;
END $$;

-- Paso 3: Actualizar todas las coordinaciones para que estén activas y operativas
UPDATE coordinaciones
SET 
    archivado = FALSE,
    is_operativo = TRUE,
    is_active = TRUE,
    updated_at = NOW()
WHERE TRUE;

-- Paso 4: Verificar resultado
SELECT 
    id,
    codigo,
    nombre,
    archivado,
    is_operativo,
    is_active,
    updated_at
FROM coordinaciones
ORDER BY codigo;

-- Paso 5: Verificar estructura
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'coordinaciones'
ORDER BY ordinal_position;

