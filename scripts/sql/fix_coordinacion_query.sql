-- ============================================
-- CONSULTA CORREGIDA PARA OBTENER USUARIOS DE COORDINACIÓN
-- Base: zbylezfyagwrxoecioup.supabase.co (SystemUI)
-- Problema: Los comentarios "-calidad" causaban error de sintaxis
-- ============================================

-- VERSIÓN CORREGIDA (sin comentarios problemáticos)
-- Obtiene ejecutivos y coordinadores de una coordinación específica

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
    u.coordinacion_id,
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
-- ALTERNATIVA SI LA TABLA coordinador_coordinaciones NO EXISTE
-- ============================================
-- Si la tabla coordinador_coordinaciones no existe, usar esta versión simplificada:

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
-- VERIFICAR SI EXISTE LA TABLA coordinador_coordinaciones
-- ============================================
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'coordinador_coordinaciones'
) AS tabla_existe;

