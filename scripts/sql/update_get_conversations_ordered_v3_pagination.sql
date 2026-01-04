-- =========================================================
-- RPC: get_conversations_ordered (V3 CON PAGINACIÓN)
-- =========================================================
-- CAMBIO: Agregar soporte para paginación mediante LIMIT y OFFSET
-- Permite infinite scroll para manejar >1000 conversaciones
-- Versión: v6.2.0
-- Fecha: Enero 2025
-- =========================================================

DROP FUNCTION IF EXISTS get_conversations_ordered(integer, integer);
DROP FUNCTION IF EXISTS get_conversations_ordered();

-- Función helper para validar nombre_whatsapp (mantener de v2)
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

-- Función principal CON PAGINACIÓN
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
BEGIN
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
  )
  SELECT
    p.id AS prospecto_id,
    -- Priorización de nombres (mantener de v2)
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
    prospectos p ON p.id = m.prospecto_id
  LEFT JOIN
    telefonos_formateados t ON t.id = p.id
  ORDER BY
    m.fecha_ultimo_mensaje DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;  -- ✅ PAGINACIÓN AGREGADA
END;
$$;

-- =========================================================
-- FUNCIÓN HELPER: Obtener conteo total de conversaciones
-- =========================================================
CREATE OR REPLACE FUNCTION get_conversations_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_count bigint;
BEGIN
  SELECT COUNT(DISTINCT m.prospecto_id)
  INTO total_count
  FROM mensajes_whatsapp m
  INNER JOIN prospectos p ON p.id = m.prospecto_id
  WHERE p.whatsapp IS NOT NULL AND p.whatsapp != '';
  
  RETURN total_count;
END;
$$;

-- =========================================================
-- PERMISOS
-- =========================================================
GRANT EXECUTE ON FUNCTION get_conversations_ordered(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversations_ordered(integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_conversations_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversations_count() TO anon;
GRANT EXECUTE ON FUNCTION is_valid_whatsapp_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_whatsapp_name(text) TO anon;

-- =========================================================
-- TESTING
-- =========================================================
-- 1. Obtener conteo total
SELECT get_conversations_count() AS total_conversaciones;

-- 2. Primera página (200)
SELECT * FROM get_conversations_ordered(200, 0) LIMIT 5;

-- 3. Segunda página (200)
SELECT * FROM get_conversations_ordered(200, 200) LIMIT 5;

-- 4. Verificar que ORDER BY funciona correctamente
SELECT prospecto_id, nombre_contacto, fecha_ultimo_mensaje 
FROM get_conversations_ordered(10, 0);

-- =========================================================
-- NOTAS
-- =========================================================
-- 1. Mantiene compatibilidad con v2 (sin parámetros = primera página)
-- 2. Límite por defecto: 200 (optimizado para performance)
-- 3. Offset permite saltar páginas para infinite scroll
-- 4. ORDER BY preservado para consistencia
-- =========================================================

