-- ============================================
-- ACTUALIZACIÓN: mark_messages_as_read para marcar TODOS los mensajes
-- Fecha: 2025-11-25
-- Motivo: Marcar TODOS los mensajes (Prospecto, AI, Vendedor) como leídos al abrir conversación
-- ============================================

CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_prospecto_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_message_ids UUID[];
  v_updated_count INTEGER;
BEGIN
  -- ✅ CAMBIO: Obtener IDs de TODOS los mensajes (Prospecto, AI, Vendedor) que NO están leídos
  -- ✅ REMOVIDO: Filtro por rol = 'Prospecto' para incluir todos los roles
  SELECT ARRAY_AGG(id)
  INTO v_message_ids
  FROM mensajes_whatsapp
  WHERE prospecto_id = p_prospecto_id
    AND (leido IS NULL OR leido = FALSE);
  
  -- 2. Si no hay mensajes por marcar, retornar 0
  IF v_message_ids IS NULL OR ARRAY_LENGTH(v_message_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'messages_marked', 0,
      'message_ids', '[]'::jsonb
    );
  END IF;
  
  -- 3. Actualizar los mensajes
  UPDATE mensajes_whatsapp
  SET leido = TRUE
  WHERE id = ANY(v_message_ids);
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- 4. Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'messages_marked', v_updated_count,
    'message_ids', to_jsonb(v_message_ids)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'messages_marked', 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTARIO ACTUALIZADO
-- ============================================
COMMENT ON FUNCTION mark_messages_as_read IS 
'Marca TODOS los mensajes (Prospecto, AI, Vendedor) como leídos al abrir una conversación. 
SECURITY DEFINER permite bypass de RLS para esta operación específica.';

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta esta query para probar:
-- SELECT * FROM mark_messages_as_read('0f2af834-9fa1-4780-a33b-99ba1bdc6a8e');

