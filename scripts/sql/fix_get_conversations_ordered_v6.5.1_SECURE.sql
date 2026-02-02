-- ============================================
-- FIX CRÍTICO: get_conversations_ordered SIN SECURITY DEFINER
-- ============================================
-- Versión: v6.5.1 (SEGURA - SIN DEFINER)
-- Fecha: 2 de Febrero 2026
-- Problema: SECURITY DEFINER expone vulnerabilidad
-- Solución: SECURITY INVOKER + filtros basados en auth.uid()

-- ============================================
-- PASO 1: Drop función existente
-- ============================================
DROP FUNCTION IF EXISTS get_conversations_ordered(integer, integer);
DROP FUNCTION IF EXISTS get_conversations_ordered();

-- ============================================
-- PASO 2: Recrear función helper (sin cambios)
-- ============================================
CREATE OR REPLACE FUNCTION is_valid_whatsapp_name(name_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  emoji_count integer;
  valid_char_count integer;
BEGIN
  IF name_text IS NULL OR TRIM(name_text) = '' THEN
    RETURN false;
  END IF;
  
  emoji_count := length(name_text) - length(regexp_replace(name_text, '[[:ascii:]]', '', 'g'));
  valid_char_count := length(regexp_replace(name_text, '[^[:alnum:] [:space:]áéíóúÁÉÍÓÚñÑ]', '', 'g'));
  
  IF valid_char_count < 2 THEN
    RETURN false;
  END IF;
  
  IF emoji_count > valid_char_count THEN
    RETURN false;
  END IF;
  
  IF emoji_count > 5 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- ============================================
-- PASO 3: Nueva función SIN SECURITY DEFINER
-- ============================================
CREATE OR REPLACE FUNCTION get_conversations_ordered(
  p_limit INTEGER DEFAULT 200,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  prospecto_id uuid,
  nombre_contacto text,
  nombre_whatsapp text,
  numero_telefono text,
  estado_prospecto text,
  fecha_ultimo_mensaje timestamptz,
  fecha_creacion_prospecto timestamptz,
  mensajes_totales bigint,
  mensajes_no_leidos bigint,
  ultimo_mensaje text,
  id_uchat text
) 
LANGUAGE plpgsql
SECURITY INVOKER  -- ✅ CRÍTICO: Ejecuta con permisos del usuario actual
AS $$
DECLARE
  v_user_id uuid;
  v_role_name text;
  v_coordinacion_id uuid;
  v_coordinaciones_ids uuid[];
  v_is_admin boolean;
  v_is_calidad boolean;
BEGIN
  -- ============================================
  -- AUTENTICACIÓN: Verificar usuario
  -- ============================================
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- ============================================
  -- PERMISOS: Obtener rol y coordinación
  -- ============================================
  -- Usar user_profiles_v2 (vista pública accesible)
  SELECT 
    role_name,
    coordinacion_id,
    role_name IN ('admin', 'administrador_operativo') as is_admin_user
  INTO v_role_name, v_coordinacion_id, v_is_admin
  FROM public.user_profiles_v2
  WHERE id = v_user_id;
  
  IF v_role_name IS NULL THEN
    RAISE EXCEPTION 'Usuario sin rol asignado: %', v_user_id;
  END IF;
  
  -- ============================================
  -- COORDINADORES CALIDAD: Acceso completo
  -- ============================================
  v_is_calidad := FALSE;
  IF v_role_name = 'coordinador' THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.auth_user_coordinaciones uc
      JOIN public.coordinaciones c ON uc.coordinacion_id = c.id
      WHERE uc.user_id = v_user_id
      AND UPPER(c.codigo) = 'CALIDAD'
    ) INTO v_is_calidad;
  END IF;
  
  -- ============================================
  -- COORDINADORES/SUPERVISORES: Múltiples coordinaciones
  -- ============================================
  IF v_role_name IN ('coordinador', 'supervisor') AND NOT v_is_calidad THEN
    SELECT ARRAY_AGG(coordinacion_id)
    INTO v_coordinaciones_ids
    FROM public.auth_user_coordinaciones
    WHERE user_id = v_user_id;
    
    -- Fallback: coordinacion_id del metadata
    IF v_coordinaciones_ids IS NULL OR array_length(v_coordinaciones_ids, 1) = 0 THEN
      IF v_coordinacion_id IS NOT NULL THEN
        v_coordinaciones_ids := ARRAY[v_coordinacion_id];
      ELSE
        RAISE EXCEPTION 'Coordinador sin coordinaciones asignadas: %', v_user_id;
      END IF;
    END IF;
  END IF;
  
  -- ============================================
  -- EJECUTIVOS: Solo su coordinación
  -- ============================================
  IF v_role_name = 'ejecutivo' THEN
    IF v_coordinacion_id IS NOT NULL THEN
      v_coordinaciones_ids := ARRAY[v_coordinacion_id];
    ELSE
      RAISE EXCEPTION 'Ejecutivo sin coordinación asignada: %', v_user_id;
    END IF;
  END IF;
  
  -- ============================================
  -- QUERY PRINCIPAL CON FILTROS
  -- ============================================
  RETURN QUERY
  WITH mensajes_agrupados AS (
    SELECT
      m.prospecto_id,
      MAX(m.fecha_hora) AS fecha_ultimo_mensaje,
      COUNT(*) AS mensajes_totales,
      COUNT(*) FILTER (WHERE m.rol = 'Prospecto' AND (m.leido IS FALSE OR m.leido IS NULL)) AS mensajes_no_leidos,
      (ARRAY_AGG(m.mensaje ORDER BY m.fecha_hora DESC))[1] AS ultimo_mensaje
    FROM public.mensajes_whatsapp m
    WHERE m.prospecto_id IS NOT NULL
    GROUP BY m.prospecto_id
  ),
  telefonos_formateados AS (
    SELECT
      p.id,
      p.whatsapp,
      CASE 
        WHEN p.whatsapp IS NOT NULL THEN
          RIGHT(REGEXP_REPLACE(p.whatsapp, '[^0-9]', '', 'g'), 10)
        ELSE NULL
      END AS telefono_10_digitos
    FROM public.prospectos p
  ),
  prospectos_filtrados AS (
    SELECT p.*
    FROM public.prospectos p
    WHERE 
      -- ✅ Admin/Calidad: sin filtros
      (v_is_admin OR v_is_calidad)
      OR
      -- ✅ Coordinadores/Supervisores: sus coordinaciones
      (
        v_role_name IN ('coordinador', 'supervisor') 
        AND v_coordinaciones_ids IS NOT NULL
        AND p.coordinacion_id = ANY(v_coordinaciones_ids)
      )
      OR
      -- ✅ Ejecutivos: solo sus prospectos asignados de su coordinación
      (
        v_role_name = 'ejecutivo'
        AND p.ejecutivo_id = v_user_id
        AND v_coordinaciones_ids IS NOT NULL
        AND p.coordinacion_id = ANY(v_coordinaciones_ids)
      )
  )
  SELECT
    p.id AS prospecto_id,
    COALESCE(
      NULLIF(TRIM(p.nombre_completo), ''),
      CASE 
        WHEN is_valid_whatsapp_name(p.nombre_whatsapp) THEN
          TRIM(p.nombre_whatsapp)
        ELSE NULL
      END,
      t.telefono_10_digitos
    ) AS nombre_contacto,
    p.nombre_whatsapp AS nombre_whatsapp,
    t.telefono_10_digitos AS numero_telefono,
    p.etapa AS estado_prospecto,
    m.fecha_ultimo_mensaje,
    p.created_at AS fecha_creacion_prospecto,
    m.mensajes_totales,
    m.mensajes_no_leidos,
    m.ultimo_mensaje,
    p.id_uchat
  FROM
    mensajes_agrupados m
  INNER JOIN
    prospectos_filtrados p ON p.id = m.prospecto_id
  LEFT JOIN
    telefonos_formateados t ON t.id = p.id
  ORDER BY
    m.fecha_ultimo_mensaje DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ============================================
-- PASO 4: Permisos (solo authenticated)
-- ============================================
REVOKE ALL ON FUNCTION get_conversations_ordered(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_conversations_ordered(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION get_conversations_ordered(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_whatsapp_name(text) TO authenticated;

-- ============================================
-- PASO 5: Comentario
-- ============================================
COMMENT ON FUNCTION get_conversations_ordered IS 'Obtiene conversaciones de WhatsApp ordenadas por fecha, filtrando según coordinaciones del usuario autenticado. v6.5.1 - SECURITY INVOKER (sin vulnerabilidad DEFINER)';

-- ============================================
-- TESTING
-- ============================================
-- 1. Como ejecutivo de VEN (Mayra González - f09d601d-5950-4093-857e-a9b6a7efeb73)
-- Esperado: Solo conversaciones de VEN

/*
-- Ejecutar con JWT de Mayra
SELECT 
  COUNT(*) as total,
  COUNT(DISTINCT CASE 
    WHEN prospecto_id IN (
      SELECT id FROM prospectos 
      WHERE coordinacion_id = '3f41a10b-60b1-4c2b-b097-a83968353af5'  -- VEN
    ) THEN prospecto_id 
  END) as de_ven,
  COUNT(DISTINCT CASE 
    WHEN prospecto_id IN (
      SELECT id FROM prospectos 
      WHERE coordinacion_id = 'e590fed1-6d65-43e0-80ab-ff819ce63eee'  -- BOOM
    ) THEN prospecto_id 
  END) as de_boom
FROM get_conversations_ordered(200, 0);

-- Esperado: total > 0, de_ven > 0, de_boom = 0
*/

-- 2. Verificar que Adriana Baeza (BOOM) NO aparece
/*
SELECT *
FROM get_conversations_ordered(200, 0)
WHERE numero_telefono = '4111573556';

-- Esperado con JWT de Mayra: 0 resultados
-- Esperado con JWT de admin: 1 resultado
*/

-- 3. Testing de errores
/*
-- Sin JWT (debería fallar)
SELECT * FROM get_conversations_ordered(1, 0);
-- Esperado: ERROR: Usuario no autenticado

-- Con JWT pero sin rol (debería fallar)
-- Esperado: ERROR: Usuario sin rol asignado
*/

-- ============================================
-- VALIDACIÓN DE SEGURIDAD
-- ============================================
-- ✅ SECURITY INVOKER: Ejecuta con permisos del usuario
-- ✅ auth.uid(): Obtiene usuario del JWT (seguro)
-- ✅ user_profiles_v2: Vista pública (con grants apropiados)
-- ✅ Validaciones estrictas: role, coordinacion_id
-- ✅ Sin GRANT a anon: Solo authenticated pueden ejecutar
-- ✅ Sin acceso a auth.users directamente (solo via vista)

-- ============================================
-- ROLLBACK (en caso de problemas)
-- ============================================
/*
-- Restaurar versión anterior con SECURITY DEFINER
\i scripts/sql/update_get_conversations_ordered_v3_pagination.sql
*/
