-- ============================================
-- CONSULTA CORREGIDA PARA OBTENER USUARIOS DE COORDINACIÓN
-- Base: zbylezfyagwrxoecioup.supabase.co (SystemUI)
-- Problemas identificados:
-- 1. Los comentarios "-calidad" causaban error de sintaxis SQL
-- 2. La tabla coordinador_coordinaciones puede no existir
-- ============================================

-- ============================================
-- VERSIÓN 1: CONSULTA ORIGINAL CORREGIDA
-- (Sin comentarios problemáticos)
-- ============================================
SELECT
    id,
    email,
    full_name,
    first_name,
    last_name,
    coordinacion_id,
    is_ejecutivo,
    is_coordinator
FROM
    auth_users
WHERE
    coordinacion_id = 'eea1c2ff-b50c-48ba-a694-0dc4c96706ca'
    AND is_active = TRUE
    AND is_ejecutivo = TRUE

UNION

SELECT
    u.id,
    u.email,
    u.full_name,
    u.first_name,
    u.last_name,
    cc.coordinacion_id,
    u.is_ejecutivo,
    u.is_coordinator
FROM
    auth_users u
    JOIN coordinador_coordinaciones cc ON cc.coordinador_id = u.id
WHERE
    cc.coordinacion_id = 'eea1c2ff-b50c-48ba-a694-0dc4c96706ca'
    AND u.is_active = TRUE
    AND u.is_coordinator = TRUE

ORDER BY
    full_name;

-- ============================================
-- VERSIÓN 2: SIMPLIFICADA (SI coordinador_coordinaciones NO EXISTE)
-- Obtiene ejecutivos y coordinadores directamente de auth_users
-- ============================================
/*
SELECT
    id,
    email,
    full_name,
    first_name,
    last_name,
    coordinacion_id,
    is_ejecutivo,
    is_coordinator
FROM
    auth_users
WHERE
    coordinacion_id = 'eea1c2ff-b50c-48ba-a694-0dc4c96706ca'
    AND is_active = TRUE
    AND (is_ejecutivo = TRUE OR is_coordinator = TRUE)
ORDER BY
    full_name;
*/

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Los comentarios en SQL deben usar -- no -
-- 2. Si la tabla coordinador_coordinaciones no existe, usar VERSIÓN 2
-- 3. Para verificar si existe la tabla, ejecutar:
--    SELECT EXISTS (
--        SELECT 1 FROM information_schema.tables 
--        WHERE table_schema = 'public' 
--        AND table_name = 'coordinador_coordinaciones'
--    );

