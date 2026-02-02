-- ============================================
-- FIX: get_conversations_ordered CON FILTROS DE PERMISOS
-- ============================================
-- Versión: v6.5.0
-- Fecha: 2 de Febrero 2026
-- Problema: Función RPC trae TODAS las conversaciones sin filtrar por coordinaciones
-- Caso: Mayra González (VEN) veía conversaciones de BOOM
-- Solución: Filtrar en la BD según permisos del usuario autenticado

-- ============================================
-- FUNCIÓN HELPER (mantener de versión anterior)
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
-- FUNCIÓN PRINCIPAL CON FILTROS DE PERMISOS
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
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_role_name text;
  v_coordinacion_id uuid;
  v_coordinaciones_ids uuid[];
  v_is_admin boolean;
  v_is_calidad boolean;
BEGIN
  -- Obtener usuario autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- Obtener rol y coordinación del usuario
  SELECT 
    r.name,
    (u.raw_user_meta_data->>'coordinacion_id')::uuid
  INTO v_role_name, v_coordinacion_id
  FROM auth.users u
  LEFT JOIN auth_roles r ON (u.raw_user_meta_data->>'role_id')::uuid = r.id
  WHERE u.id = v_user_id;
  
  -- Verificar si es admin o administrador operativo (acceso completo)
  v_is_admin := v_role_name IN ('admin', 'administrador_operativo');
  
  -- Verificar si es coordinador de CALIDAD (acceso completo)
  v_is_calidad := FALSE;
  IF v_role_name = 'coordinador' THEN
    SELECT EXISTS(
      SELECT 1 
      FROM auth_user_coordinaciones uc
      JOIN coordinaciones c ON uc.coordinacion_id = c.id
      WHERE uc.user_id = v_user_id
      AND UPPER(c.codigo) = 'CALIDAD'
    ) INTO v_is_calidad;
  END IF;
  
  -- Si es coordinador o supervisor (no de Calidad), obtener todas sus coordinaciones
  IF v_role_name IN ('coordinador', 'supervisor') AND NOT v_is_calidad THEN
    SELECT ARRAY_AGG(coordinacion_id)
    INTO v_coordinaciones_ids
    FROM auth_user_coordinaciones
    WHERE user_id = v_user_id;
    
    -- Si no tiene coordinaciones en la tabla intermedia, usar coordinacion_id del metadata
    IF v_coordinaciones_ids IS NULL OR array_length(v_coordinaciones_ids, 1) = 0 THEN
      IF v_coordinacion_id IS NOT NULL THEN
        v_coordinaciones_ids := ARRAY[v_coordinacion_id];
      END IF;
    END IF;
  END IF;
  
  -- Si es ejecutivo, usar solo su coordinación
  IF v_role_name = 'ejecutivo' THEN
    IF v_coordinacion_id IS NOT NULL THEN
      v_coordinaciones_ids := ARRAY[v_coordinacion_id];
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
    FROM mensajes_whatsapp m
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
    FROM prospectos p
  ),
  prospectos_filtrados AS (
    SELECT p.*
    FROM prospectos p
    WHERE 
      -- Admin, Administrador Operativo y Coordinadores de Calidad ven todo
      (v_is_admin OR v_is_calidad)
      OR
      -- Coordinadores/Supervisores ven prospectos de sus coordinaciones
      (
        v_role_name IN ('coordinador', 'supervisor') 
        AND v_coordinaciones_ids IS NOT NULL
        AND p.coordinacion_id = ANY(v_coordinaciones_ids)
      )
      OR
      -- Ejecutivos ven solo sus prospectos asignados de su coordinación
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
-- PERMISOS
-- ============================================
GRANT EXECUTE ON FUNCTION get_conversations_ordered(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversations_ordered(integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION is_valid_whatsapp_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_whatsapp_name(text) TO anon;

-- ============================================
-- COMENTARIO
-- ============================================
COMMENT ON FUNCTION get_conversations_ordered IS 'Obtiene conversaciones de WhatsApp ordenadas por fecha, filtrando según permisos del usuario autenticado. v6.5.0 - Fix: Filtrar por coordinaciones';

-- ============================================
-- TESTING
-- ============================================
-- 1. Como ejecutivo de VEN (Mayra González)
-- Esperado: Solo conversaciones de VEN
/*
SELECT COUNT(*) as total_conversaciones,
       COUNT(DISTINCT CASE WHEN prospecto_id IN (
         SELECT id FROM prospectos WHERE coordinacion_id = '3f41a10b-60b1-4c2b-b097-a83968353af5'
       ) THEN prospecto_id END) as conversaciones_ven,
       COUNT(DISTINCT CASE WHEN prospecto_id IN (
         SELECT id FROM prospectos WHERE coordinacion_id = 'e590fed1-6d65-43e0-80ab-ff819ce63eee'
       ) THEN prospecto_id END) as conversaciones_boom
FROM get_conversations_ordered(200, 0);
-- Esperado: conversaciones_boom = 0
*/

-- 2. Como admin
-- Esperado: TODAS las conversaciones
/*
SELECT COUNT(*) as total_conversaciones
FROM get_conversations_ordered(200, 0);
*/

-- 3. Verificar que Adriana Baeza (BOOM) NO aparece para ejecutivos VEN
/*
SELECT *
FROM get_conversations_ordered(200, 0)
WHERE numero_telefono = '4111573556';
-- Esperado: 0 resultados para ejecutivos de VEN
*/
