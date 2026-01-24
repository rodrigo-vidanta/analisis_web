-- ============================================
-- FUNCIÓN: Búsqueda de conversaciones en servidor (SIMPLIFICADA)
-- ============================================
-- Problema: Cargar 2388 conversaciones causa ERR_INSUFFICIENT_RESOURCES
-- Solución: Buscar directamente en servidor sin cargar todo
-- Fecha: 2026-01-24
-- ============================================

CREATE OR REPLACE FUNCTION search_dashboard_conversations(
  p_search_term TEXT,
  p_user_id UUID DEFAULT NULL,
  p_is_admin BOOLEAN DEFAULT FALSE,
  p_ejecutivo_ids UUID[] DEFAULT NULL,
  p_coordinacion_ids UUID[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  prospecto_id UUID,
  nombre_contacto TEXT,
  nombre_whatsapp VARCHAR(255),
  numero_telefono TEXT,
  whatsapp_raw TEXT,
  etapa TEXT,
  requiere_atencion_humana BOOLEAN,
  motivo_handoff TEXT,
  id_dynamics TEXT,
  id_uchat TEXT,
  fecha_creacion TIMESTAMPTZ,
  email TEXT,
  titulo TEXT,
  coordinacion_id UUID,
  coordinacion_codigo TEXT,
  coordinacion_nombre TEXT,
  ejecutivo_id UUID,
  ejecutivo_nombre TEXT,
  ejecutivo_email TEXT,
  fecha_ultimo_mensaje TIMESTAMPTZ,
  mensajes_totales BIGINT,
  mensajes_no_leidos BIGINT,
  ultimo_mensaje_preview TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_search_normalized TEXT;
  v_search_phone TEXT;
BEGIN
  -- Normalizar término de búsqueda
  v_search_normalized := LOWER(TRIM(p_search_term));
  v_search_phone := REGEXP_REPLACE(v_search_normalized, '[^0-9]', '', 'g');
  
  -- Buscar primero en prospectos, luego obtener info de conversación
  RETURN QUERY
  SELECT 
    p.id as prospecto_id,
    p.nombre_completo as nombre_contacto,
    p.nombre_whatsapp,
    p.whatsapp as numero_telefono,
    p.whatsapp as whatsapp_raw,
    p.etapa,
    p.requiere_atencion_humana,
    CAST(NULL AS TEXT) as motivo_handoff,
    p.id_dynamics,
    CAST(NULL AS TEXT) as id_uchat,
    CURRENT_TIMESTAMP as fecha_creacion,
    p.email,
    p.titulo,
    p.coordinacion_id,
    coord.codigo as coordinacion_codigo,
    coord.nombre as coordinacion_nombre,
    p.ejecutivo_id,
    u.full_name as ejecutivo_nombre,
    u.email as ejecutivo_email,
    (
      SELECT MAX(m.fecha_hora)
      FROM mensajes_whatsapp m
      WHERE m.prospecto_id = p.id
    ) as fecha_ultimo_mensaje,
    (
      SELECT COUNT(*)
      FROM mensajes_whatsapp m
      WHERE m.prospecto_id = p.id
    ) as mensajes_totales,
    (
      SELECT COUNT(*)
      FROM mensajes_whatsapp m
      WHERE m.prospecto_id = p.id
    ) as mensajes_no_leidos,
    (
      SELECT m.mensaje
      FROM mensajes_whatsapp m
      WHERE m.prospecto_id = p.id
      ORDER BY m.fecha_hora DESC
      LIMIT 1
    ) as ultimo_mensaje_preview
  FROM prospectos p
  LEFT JOIN coordinaciones coord ON p.coordinacion_id = coord.id
  LEFT JOIN user_profiles_v2 u ON p.ejecutivo_id = u.id
  WHERE 
    -- Debe tener al menos 1 mensaje de WhatsApp
    EXISTS (
      SELECT 1 FROM mensajes_whatsapp m WHERE m.prospecto_id = p.id LIMIT 1
    )
    -- Búsqueda por nombre, teléfono o email
    AND (
      LOWER(p.nombre_completo) LIKE '%' || v_search_normalized || '%' OR
      LOWER(COALESCE(p.nombre_whatsapp, '')) LIKE '%' || v_search_normalized || '%' OR
      LOWER(COALESCE(p.email, '')) LIKE '%' || v_search_normalized || '%' OR
      REGEXP_REPLACE(COALESCE(p.whatsapp, ''), '[^0-9]', '', 'g') LIKE '%' || v_search_phone || '%'
    )
    -- Filtros de permisos
    AND (
      p_is_admin = TRUE OR
      (p_ejecutivo_ids IS NOT NULL AND p.ejecutivo_id = ANY(p_ejecutivo_ids)) OR
      (p_coordinacion_ids IS NOT NULL AND p.coordinacion_id = ANY(p_coordinacion_ids))
    )
  ORDER BY 
    (SELECT MAX(m.fecha_hora) FROM mensajes_whatsapp m WHERE m.prospecto_id = p.id) DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION search_dashboard_conversations TO anon;
GRANT EXECUTE ON FUNCTION search_dashboard_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION search_dashboard_conversations TO service_role;

-- ============================================
-- PRUEBAS
-- ============================================

-- Buscar "Rosario" como admin
SELECT * FROM search_dashboard_conversations(
  'Rosario',
  NULL,
  TRUE,
  NULL,
  NULL,
  50
);
