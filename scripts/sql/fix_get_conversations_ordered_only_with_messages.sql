-- ============================================
-- CORREGIR get_conversations_ordered PARA SOLO MOSTRAR PROSPECTOS CON MENSAJES
-- Base: glsmifhkoaifvaegsozd.supabase.co (análisis)
-- Problema: La función devuelve todos los prospectos con WhatsApp, incluso sin mensajes
-- Solución: Agregar filtro HAVING COUNT(m.id) > 0
-- ============================================

DROP FUNCTION IF EXISTS get_conversations_ordered();

CREATE OR REPLACE FUNCTION get_conversations_ordered()
RETURNS TABLE (
  prospecto_id UUID,
  nombre_contacto TEXT,
  nombre_whatsapp TEXT,
  numero_telefono TEXT,
  estado_prospecto TEXT,
  fecha_ultimo_mensaje TIMESTAMPTZ,
  fecha_creacion_prospecto TIMESTAMPTZ,
  mensajes_totales BIGINT,
  mensajes_no_leidos BIGINT,
  ultimo_mensaje TEXT,
  id_uchat TEXT
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
      NULLIF(TRIM(p.nombre), ''),
      NULLIF(TRIM(p.nombre_whatsapp), ''),
      p.whatsapp
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
  WHERE
    p.whatsapp IS NOT NULL 
    AND p.whatsapp != ''
  ORDER BY
    m.fecha_ultimo_mensaje DESC NULLS LAST;
END;
$$;

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION get_conversations_ordered() TO anon, authenticated, service_role;

-- Verificar que funciona correctamente
SELECT 
    '✅ Función actualizada' as status,
    COUNT(*)::text as conversaciones_con_mensajes
FROM get_conversations_ordered();

