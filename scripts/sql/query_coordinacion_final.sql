-- ============================================
-- CONSULTA CORREGIDA PARA OBTENER USUARIOS DE COORDINACIÓN
-- Base: zbylezfyagwrxoecioup.supabase.co (SystemUI)
-- 
-- PROBLEMA IDENTIFICADO:
-- Los comentarios "-calidad" causaban error de sintaxis SQL
-- En SQL, los comentarios deben usar -- no -
-- 
-- SOLUCIÓN:
-- Eliminar los comentarios problemáticos o usar formato correcto
-- ============================================

-- ============================================
-- VERSIÓN CORREGIDA (SIN COMENTARIOS PROBLEMÁTICOS)
-- PROBLEMA: Los comentarios "-calidad" causaban error de sintaxis
-- SOLUCIÓN: Eliminar comentarios o usar formato correcto (-- en lugar de -)
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
-- VERSIÓN CON COMENTARIOS CORRECTOS (si necesitas documentar)
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
    coordinacion_id = 'eea1c2ff-b50c-48ba-a694-0dc4c96706ca'  -- Calidad
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
    cc.coordinacion_id = 'eea1c2ff-b50c-48ba-a694-0dc4c96706ca'  -- Calidad
    AND u.is_active = TRUE
    AND u.is_coordinator = TRUE

ORDER BY
    full_name;
*/

