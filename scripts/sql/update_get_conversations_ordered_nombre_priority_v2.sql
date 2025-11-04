-- =========================================================
-- RPC: get_conversations_ordered (ACTUALIZADO V2)
-- =========================================================
-- CAMBIO: Priorización mejorada de nombres con validación
-- 1. nombre_completo (si existe)
-- 2. nombre_whatsapp (si existe Y cumple criterios: tiene caracteres válidos, no demasiados emojis)
-- 3. Número de teléfono a 10 dígitos
-- =========================================================

DROP FUNCTION IF EXISTS get_conversations_ordered();

-- Función helper para validar nombre_whatsapp
CREATE OR REPLACE FUNCTION is_valid_whatsapp_name(name_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  emoji_count integer;
  valid_char_count integer;
BEGIN
  -- Si está vacío o es null, no es válido
  IF name_text IS NULL OR TRIM(name_text) = '' THEN
    RETURN false;
  END IF;
  
  -- Contar emojis (aproximación: caracteres fuera del rango ASCII básico)
  -- Los emojis suelen estar en rangos Unicode específicos
  emoji_count := length(name_text) - length(regexp_replace(name_text, '[[:ascii:]]', '', 'g'));
  
  -- Contar caracteres válidos (letras, números, espacios, acentos básicos)
  valid_char_count := length(regexp_replace(name_text, '[^[:alnum:] [:space:]áéíóúÁÉÍÓÚñÑ]', '', 'g'));
  
  -- Validar: debe tener al menos 2 caracteres válidos y no más del 50% de emojis
  IF valid_char_count < 2 THEN
    RETURN false;
  END IF;
  
  -- Si tiene más emojis que caracteres válidos, no es válido
  IF emoji_count > valid_char_count THEN
    RETURN false;
  END IF;
  
  -- Si tiene más de 5 emojis, no es válido
  IF emoji_count > 5 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION get_conversations_ordered()
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
      -- Extraer solo los últimos 10 dígitos del número
      CASE 
        WHEN p.whatsapp IS NOT NULL THEN
          RIGHT(REGEXP_REPLACE(p.whatsapp, '[^0-9]', '', 'g'), 10)
        ELSE NULL
      END AS telefono_10_digitos
    FROM prospectos p
  )
  SELECT
    p.id AS prospecto_id,
    -- ✅ PRIORIDAD MEJORADA:
    -- 1. nombre_completo (si existe y no está vacío)
    -- 2. nombre_whatsapp (si existe Y es válido según criterios)
    -- 3. Número de teléfono a 10 dígitos
    COALESCE(
      NULLIF(TRIM(p.nombre_completo), ''),                    -- 1. nombre_completo
      CASE 
        WHEN is_valid_whatsapp_name(p.nombre_whatsapp) THEN  -- 2. nombre_whatsapp válido
          TRIM(p.nombre_whatsapp)
        ELSE NULL
      END,
      t.telefono_10_digitos                                    -- 3. teléfono 10 dígitos
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
    m.fecha_ultimo_mensaje DESC NULLS LAST;
END;
$$;

-- =========================================================
-- COMENTARIOS:
-- =========================================================
-- 1. Función helper is_valid_whatsapp_name valida:
--    - Tiene al menos 2 caracteres válidos
--    - No tiene más emojis que caracteres válidos
--    - No tiene más de 5 emojis
--
-- 2. COALESCE prioriza en orden:
--    a. nombre_completo (nombre registrado en prospecto)
--    b. nombre_whatsapp (si es válido según criterios)
--    c. teléfono a 10 dígitos (formato limpio)
--
-- 3. El número de teléfono se formatea a 10 dígitos
--    extrayendo solo los últimos 10 dígitos numéricos
--
-- 4. Esta función se ejecuta cada vez que se carga la lista
--    de conversaciones Y cada vez que hay un UPDATE en prospectos
-- =========================================================

-- GRANT de ejecución para usuarios autenticados
GRANT EXECUTE ON FUNCTION get_conversations_ordered() TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversations_ordered() TO anon;
GRANT EXECUTE ON FUNCTION is_valid_whatsapp_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_whatsapp_name(text) TO anon;

