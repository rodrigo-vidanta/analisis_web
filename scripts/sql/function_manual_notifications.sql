-- Función para crear notificaciones manualmente (para plantillas históricas)
CREATE OR REPLACE FUNCTION create_manual_template_notifications(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  user_id UUID,
  notification_created BOOLEAN
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO user_notifications (
    user_id,
    notification_type,
    module,
    customer_name,
    message_preview,
    metadata,
    is_read,
    created_at
  )
  SELECT 
    wts.suggested_by AS user_id,
    'template_approved'::VARCHAR(50) AS notification_type,
    'campaigns'::VARCHAR(50) AS module,
    wt.name AS customer_name,
    'Tu plantilla "' || wt.name || '" fue aprobada y ya está disponible para usar' AS message_preview,
    jsonb_build_object(
      'template_id', wt.id,
      'template_name', wt.name,
      'suggestion_id', wts.id,
      'approved_at', wt.updated_at,
      'uchat_status', wt.status,
      'manual_notification', true
    ) AS metadata,
    false AS is_read,
    NOW() AS created_at
  FROM whatsapp_templates wt
  INNER JOIN whatsapp_template_suggestions wts 
    ON wts.imported_to_template_id = wt.id
  WHERE wt.status = 'APPROVED'
    AND wt.created_at >= p_start_date
    AND wts.suggested_by IS NOT NULL
    -- Evitar duplicados
    AND NOT EXISTS (
      SELECT 1 
      FROM user_notifications un 
      WHERE un.user_id = wts.suggested_by
        AND un.notification_type = 'template_approved'
        AND un.metadata->>'template_id' = wt.id::text
    )
  RETURNING 
    (metadata->>'template_id')::UUID AS template_id,
    customer_name AS template_name,
    user_id,
    true AS notification_created;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_manual_template_notifications IS 
  'Crea notificaciones para plantillas aprobadas desde una fecha. Uso: SELECT * FROM create_manual_template_notifications(CURRENT_DATE);';
