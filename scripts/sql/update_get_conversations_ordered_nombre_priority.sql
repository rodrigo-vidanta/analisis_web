-- =========================================================
-- RPC: get_conversations_ordered (ACTUALIZADO)
-- =========================================================
-- CAMBIO: Priorizar "nombre" sobre "nombre_whatsapp" 
-- para mostrar el nombre real del cliente si está disponible
-- =========================================================

DROP FUNCTION IF EXISTS get_conversations_ordered();

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
  )
  SELECT
    p.id AS prospecto_id,
    -- ✅ PRIORIDAD: nombre > nombre_whatsapp > whatsapp
    COALESCE(
      NULLIF(TRIM(p.nombre), ''),           -- 1. Intentar con "nombre" (nombre real del cliente)
      NULLIF(TRIM(p.nombre_whatsapp), ''),  -- 2. Fallback a "nombre_whatsapp" (nombre de WhatsApp)
      p.whatsapp                             -- 3. Fallback final al número de teléfono
    ) AS nombre_contacto,
    p.nombre_whatsapp AS nombre_whatsapp,
    p.whatsapp AS numero_telefono,
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
  ORDER BY
    m.fecha_ultimo_mensaje DESC NULLS LAST;
END;
$$;

-- =========================================================
-- COMENTARIOS:
-- =========================================================
-- 1. COALESCE prioriza en orden:
--    a. p.nombre (nombre real del cliente)
--    b. p.nombre_whatsapp (nombre de WhatsApp)
--    c. p.whatsapp (número de teléfono como último recurso)
--
-- 2. NULLIF(TRIM(...), '') asegura que nombres vacíos o con
--    solo espacios sean tratados como NULL y se use el siguiente
--
-- 3. nombre_whatsapp también se retorna por separado para
--    referencia, pero nombre_contacto es lo que se muestra
--
-- 4. Esta función se ejecuta cada vez que se carga la lista
--    de conversaciones Y cada vez que hay un UPDATE en prospectos
--
-- 5. SECURITY DEFINER permite bypass de RLS para lectura
-- =========================================================

-- GRANT de ejecución para usuarios autenticados
GRANT EXECUTE ON FUNCTION get_conversations_ordered() TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversations_ordered() TO anon;

