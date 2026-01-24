-- ============================================
-- FUNCIÓN: Búsqueda de conversaciones en servidor
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
  nombre_whatsapp TEXT,
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
  mensajes_totales INTEGER,
  mensajes_no_leidos INTEGER,
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
  
  -- Buscar en conversaciones con JOIN a prospectos
  RETURN QUERY
  SELECT 
    c.prospecto_id,
    p.nombre_completo as nombre_contacto,
    p.nombre_whatsapp,
    p.whatsapp as numero_telefono,
    p.whatsapp as whatsapp_raw,
    p.etapa,
    p.requiere_atencion_humana,
    CAST(NULL AS TEXT) as motivo_handoff,
    p.id_dynamics,
    c.id_uchat,
    c.created_at as fecha_creacion,
    p.email,
    p.titulo,
    p.coordinacion_id,
    coord.codigo as coordinacion_codigo,
    coord.nombre as coordinacion_nombre,
    p.ejecutivo_id,
    u.full_name as ejecutivo_nombre,
    u.email as ejecutivo_email,
    c.last_message_at as fecha_ultimo_mensaje,
    (SELECT COUNT(*)::INTEGER FROM mensajes_whatsapp m WHERE m.prospecto_id = c.prospecto_id) as mensajes_totales,
    (SELECT COUNT(*)::INTEGER FROM mensajes_whatsapp m WHERE m.prospecto_id = c.prospecto_id AND m.is_read = false) as mensajes_no_leidos,
    (SELECT mensaje FROM mensajes_whatsapp m WHERE m.prospecto_id = c.prospecto_id ORDER BY m.fecha DESC LIMIT 1) as ultimo_mensaje_preview
  FROM conversaciones_whatsapp c
  INNER JOIN prospectos p ON c.prospecto_id = p.id
  LEFT JOIN coordinaciones coord ON p.coordinacion_id = coord.id
  LEFT JOIN user_profiles_v2 u ON p.ejecutivo_id = u.id
  WHERE 
    -- Búsqueda por nombre, teléfono o email
    (
      LOWER(p.nombre_completo) LIKE '%' || v_search_normalized || '%' OR
      LOWER(p.nombre_whatsapp) LIKE '%' || v_search_normalized || '%' OR
      LOWER(p.email) LIKE '%' || v_search_normalized || '%' OR
      REGEXP_REPLACE(p.whatsapp, '[^0-9]', '', 'g') LIKE '%' || v_search_phone || '%'
    )
    -- Filtros de permisos
    AND (
      p_is_admin = TRUE OR
      (p_ejecutivo_ids IS NOT NULL AND p.ejecutivo_id = ANY(p_ejecutivo_ids)) OR
      (p_coordinacion_ids IS NOT NULL AND p.coordinacion_id = ANY(p_coordinacion_ids))
    )
  ORDER BY c.last_message_at DESC NULLS LAST
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

-- Buscar por teléfono
SELECT * FROM search_dashboard_conversations(
  '5215522490483',
  NULL,
  TRUE,
  NULL,
  NULL,
  50
);

-- ============================================
-- NOTAS
-- ============================================
-- 
-- Esta función permite búsqueda directa en servidor sin cargar
-- todas las conversaciones en memoria del navegador.
-- 
-- Ventajas:
-- - No causa ERR_INSUFFICIENT_RESOURCES
-- - Búsqueda más rápida (índices en BD)
-- - Soporta filtros de permisos
-- - Resultados instantáneos
-- 
-- Uso en frontend:
-- await supabase.rpc('search_dashboard_conversations', {
--   p_search_term: 'Rosario',
--   p_user_id: userId,
--   p_is_admin: true,
--   p_limit: 50
-- });
