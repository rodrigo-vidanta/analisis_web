-- ============================================
-- FUNCIÓN RPC: Batch Loading de Etiquetas
-- Base: SYSTEM_UI (zbylezfyagwrxoecioup)
-- ============================================

CREATE OR REPLACE FUNCTION get_batch_prospecto_labels(p_prospecto_ids UUID[])
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Ensamblar todas las etiquetas de los prospectos en un solo JSON
  SELECT json_object_agg(
    prospecto_id::text,
    labels
  ) INTO result
  FROM (
    SELECT 
      wcl.prospecto_id,
      json_agg(
        json_build_object(
          'id', wcl.label_id::text,
          'label_id', wcl.label_id::text,
          'label_type', wcl.label_type,
          'shadow_cell', wcl.shadow_cell,
          'name', COALESCE(wlp.name, wlc.name, 'Etiqueta eliminada'),
          'color', COALESCE(wlp.color, wlc.color, '#6B7280'),
          'icon', wlp.icon,
          'business_rule', wlp.business_rule
        )
      ) as labels
    FROM whatsapp_conversation_labels wcl
    LEFT JOIN whatsapp_labels_preset wlp 
      ON wcl.label_type = 'preset' AND wcl.label_id = wlp.id
    LEFT JOIN whatsapp_labels_custom wlc 
      ON wcl.label_type = 'custom' AND wcl.label_id = wlc.id
    WHERE wcl.prospecto_id = ANY(p_prospecto_ids)
    GROUP BY wcl.prospecto_id
  ) sub;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_batch_prospecto_labels IS 'Obtiene etiquetas de múltiples prospectos en una sola llamada (optimizado para LiveChatCanvas)';

