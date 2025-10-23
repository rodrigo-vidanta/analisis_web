-- ============================================
-- ACTUALIZACIÓN: get_conversations_ordered
-- Fecha: 2025-10-22
-- Motivo: Incluir id_uchat para permitir envío de mensajes desde Live Chat
-- ============================================

-- Primero eliminar la función existente
DROP FUNCTION IF EXISTS get_conversations_ordered();

-- Ahora crear la función con el nuevo campo
CREATE OR REPLACE FUNCTION get_conversations_ordered()
RETURNS TABLE (
  prospecto_id UUID,
  nombre_contacto TEXT,
  numero_telefono TEXT,
  estado_prospecto TEXT,
  id_uchat TEXT,  -- ✅ AGREGADO: Necesario para enviar mensajes
  ultimo_mensaje TEXT,
  fecha_ultimo_mensaje TIMESTAMPTZ,
  mensajes_totales BIGINT,
  mensajes_no_leidos BIGINT,
  fecha_creacion_prospecto TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS prospecto_id,
    p.nombre_completo AS nombre_contacto,
    p.whatsapp AS numero_telefono,
    p.etapa AS estado_prospecto,
    p.id_uchat AS id_uchat,  -- ✅ AGREGADO
    MAX(m.mensaje) AS ultimo_mensaje,
    MAX(m.fecha_hora) AS fecha_ultimo_mensaje,
    COUNT(m.id) AS mensajes_totales,
    -- ✅ CORREGIDO: Solo contar mensajes NO leídos del PROSPECTO (rol = 'Prospecto')
    COUNT(m.id) FILTER (
      WHERE (m.leido IS FALSE OR m.leido IS NULL) 
      AND m.rol = 'Prospecto'
    ) AS mensajes_no_leidos,
    p.created_at AS fecha_creacion_prospecto
  FROM prospectos p
  LEFT JOIN mensajes_whatsapp m ON m.prospecto_id = p.id
  WHERE p.whatsapp IS NOT NULL  -- Solo prospectos con WhatsApp
  GROUP BY p.id, p.nombre_completo, p.whatsapp, p.etapa, p.id_uchat, p.created_at
  ORDER BY fecha_ultimo_mensaje DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta esta query para verificar que ahora incluye id_uchat:
-- SELECT * FROM get_conversations_ordered() LIMIT 3;

