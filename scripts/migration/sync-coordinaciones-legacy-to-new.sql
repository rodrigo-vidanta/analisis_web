-- ============================================
-- SCRIPT DE SINCRONIZACIÓN: coordinador_coordinaciones → auth_user_coordinaciones
-- ============================================
-- Fecha: 29 Diciembre 2025
-- Propósito: Migrar datos faltantes de tabla legacy a tabla nueva
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- Criticidad: ALTA - Ejecutar ANTES de migrar código
-- ============================================

-- PASO 1: Verificar estado actual
-- ============================================

-- Contar registros en tabla LEGACY
SELECT 'LEGACY: coordinador_coordinaciones' as tabla, COUNT(*) as total
FROM coordinador_coordinaciones;

-- Contar registros en tabla NUEVA
SELECT 'NUEVA: auth_user_coordinaciones' as tabla, COUNT(*) as total
FROM auth_user_coordinaciones;

-- Identificar registros SOLO en legacy (faltantes en nueva)
SELECT 
    'FALTANTES EN NUEVA TABLA' as status,
    cc.coordinador_id,
    cc.coordinacion_id,
    cc.created_at,
    u.email,
    u.full_name,
    c.nombre as coordinacion_nombre,
    c.codigo as coordinacion_codigo
FROM coordinador_coordinaciones cc
LEFT JOIN auth_user_coordinaciones auc 
    ON auc.user_id = cc.coordinador_id 
    AND auc.coordinacion_id = cc.coordinacion_id
INNER JOIN auth_users u ON u.id = cc.coordinador_id
INNER JOIN coordinaciones c ON c.id = cc.coordinacion_id
WHERE auc.id IS NULL
ORDER BY u.full_name, c.codigo;

-- Identificar registros SOLO en nueva (no están en legacy)
SELECT 
    'SOLO EN NUEVA TABLA' as status,
    auc.user_id,
    auc.coordinacion_id,
    auc.assigned_at,
    u.email,
    u.full_name,
    c.nombre as coordinacion_nombre,
    c.codigo as coordinacion_codigo
FROM auth_user_coordinaciones auc
LEFT JOIN coordinador_coordinaciones cc 
    ON cc.coordinador_id = auc.user_id 
    AND cc.coordinacion_id = auc.coordinacion_id
INNER JOIN auth_users u ON u.id = auc.user_id
INNER JOIN coordinaciones c ON c.id = auc.coordinacion_id
WHERE cc.id IS NULL
ORDER BY u.full_name, c.codigo;


-- PASO 2: BACKUP de tabla legacy (por seguridad)
-- ============================================

-- Crear tabla de backup con timestamp
CREATE TABLE IF NOT EXISTS coordinador_coordinaciones_backup_20251229 AS
SELECT * FROM coordinador_coordinaciones;

COMMENT ON TABLE coordinador_coordinaciones_backup_20251229 
IS 'Backup de coordinador_coordinaciones antes de migración a auth_user_coordinaciones. Fecha: 2025-12-29';


-- PASO 3: Migración de datos faltantes
-- ============================================

-- Insertar registros que existen en legacy pero NO en nueva tabla
INSERT INTO auth_user_coordinaciones (
    user_id,
    coordinacion_id,
    assigned_at,
    assigned_by
)
SELECT 
    cc.coordinador_id as user_id,
    cc.coordinacion_id,
    cc.created_at as assigned_at,
    NULL as assigned_by  -- No tenemos dato histórico de quién asignó
FROM coordinador_coordinaciones cc
LEFT JOIN auth_user_coordinaciones auc 
    ON auc.user_id = cc.coordinador_id 
    AND auc.coordinacion_id = cc.coordinacion_id
WHERE auc.id IS NULL;  -- Solo los que NO existen en nueva tabla


-- PASO 4: Verificación POST-migración
-- ============================================

-- Contar registros después de migración
SELECT 'POST-MIGRACIÓN: coordinador_coordinaciones' as tabla, COUNT(*) as total
FROM coordinador_coordinaciones;

SELECT 'POST-MIGRACIÓN: auth_user_coordinaciones' as tabla, COUNT(*) as total
FROM auth_user_coordinaciones;

-- Verificar que no haya registros faltantes
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SINCRONIZACIÓN COMPLETA - No hay registros faltantes'
        ELSE '⚠️ AÚN HAY REGISTROS FALTANTES'
    END as resultado,
    COUNT(*) as registros_faltantes
FROM coordinador_coordinaciones cc
LEFT JOIN auth_user_coordinaciones auc 
    ON auc.user_id = cc.coordinador_id 
    AND auc.coordinacion_id = cc.coordinacion_id
WHERE auc.id IS NULL;


-- PASO 5: Análisis de integridad de datos
-- ============================================

-- Verificar que todos los user_id existen en auth_users
SELECT 
    'Verificación de user_id' as check_name,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Todos los user_id son válidos'
        ELSE '⚠️ Hay user_id huérfanos: ' || COUNT(*)::text
    END as resultado
FROM auth_user_coordinaciones auc
LEFT JOIN auth_users u ON u.id = auc.user_id
WHERE u.id IS NULL;

-- Verificar que todos los coordinacion_id existen en coordinaciones
SELECT 
    'Verificación de coordinacion_id' as check_name,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Todos los coordinacion_id son válidos'
        ELSE '⚠️ Hay coordinacion_id huérfanos: ' || COUNT(*)::text
    END as resultado
FROM auth_user_coordinaciones auc
LEFT JOIN coordinaciones c ON c.id = auc.coordinacion_id
WHERE c.id IS NULL;

-- Ver resumen por coordinación
SELECT 
    c.codigo,
    c.nombre,
    COUNT(auc.id) as total_coordinadores_supervisores
FROM coordinaciones c
LEFT JOIN auth_user_coordinaciones auc ON auc.coordinacion_id = c.id
WHERE c.is_active = true
GROUP BY c.id, c.codigo, c.nombre
ORDER BY c.codigo;


-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 
-- 1. Este script NO elimina la tabla legacy
-- 2. Crea un backup automático antes de migrar
-- 3. Solo inserta registros faltantes (no duplica)
-- 4. Usa ON CONFLICT para evitar errores si se ejecuta múltiples veces
-- 5. Validar resultados antes de migrar código
-- 
-- ============================================
-- ROLLBACK (si es necesario)
-- ============================================
-- 
-- Si algo sale mal, restaurar desde backup:
-- 
-- DELETE FROM auth_user_coordinaciones 
-- WHERE assigned_at IN (
--     SELECT assigned_at 
--     FROM coordinador_coordinaciones_backup_20251229
-- );
-- 
-- DROP TABLE coordinador_coordinaciones_backup_20251229;
-- 
-- ============================================

