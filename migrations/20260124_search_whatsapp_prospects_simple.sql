-- ============================================
-- FUNCIÓN SIMPLE: Búsqueda de prospectos con mensajes WhatsApp
-- ============================================

CREATE OR REPLACE FUNCTION search_whatsapp_prospects(
  p_search_term TEXT,
  p_is_admin BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 50
)
RETURNS SETOF prospectos
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.*
  FROM prospectos p
  WHERE 
    -- Debe tener mensajes
    EXISTS (SELECT 1 FROM mensajes_whatsapp m WHERE m.prospecto_id = p.id LIMIT 1)
    -- Búsqueda
    AND (
      LOWER(p.nombre_completo) ILIKE '%' || LOWER(TRIM(p_search_term)) || '%' OR
      LOWER(COALESCE(p.nombre_whatsapp, '')) ILIKE '%' || LOWER(TRIM(p_search_term)) || '%' OR
      LOWER(COALESCE(p.email, '')) ILIKE '%' || LOWER(TRIM(p_search_term)) || '%' OR
      REGEXP_REPLACE(COALESCE(p.whatsapp, ''), '[^0-9]', '', 'g') LIKE '%' || REGEXP_REPLACE(LOWER(TRIM(p_search_term)), '[^0-9]', '', 'g') || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION search_whatsapp_prospects TO anon;
GRANT EXECUTE ON FUNCTION search_whatsapp_prospects TO authenticated;
GRANT EXECUTE ON FUNCTION search_whatsapp_prospects TO service_role;

-- Prueba
SELECT * FROM search_whatsapp_prospects('Rosario', TRUE, 50);
