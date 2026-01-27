-- ============================================
-- FIX: Agregar etapa_id a funciones RPC de WhatsApp
-- ============================================
-- Fecha: 27 Enero 2026
-- Problema: Funciones RPC devuelven etapa (string) pero NO etapa_id (UUID)
-- Causa: EtapaBadge muestra "? Sin etapa" porque no encuentra etapa_id
-- Solución: Agregar etapa_id a RETURNS TABLE y SELECT
-- ============================================
-- URL: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
-- Tiempo: 1 minuto | Riesgo: Bajo
-- ============================================

-- ============================================
-- FUNCIÓN 1: get_dashboard_conversations (principal)
-- ============================================

CREATE OR REPLACE FUNCTION get_dashboard_conversations(
  p_user_id UUID DEFAULT NULL,
  p_is_admin BOOLEAN DEFAULT FALSE,
  p_ejecutivo_ids UUID[] DEFAULT NULL,
  p_coordinacion_ids UUID[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  prospecto_id UUID,
  nombre_contacto TEXT,
  nombre_whatsapp TEXT,
  numero_telefono TEXT,
  whatsapp_raw TEXT,
  etapa TEXT,
  etapa_id UUID,  -- ✅ AGREGADO
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
  ultimo_mensaje_preview TEXT,
  llamada_activa_id UUID,
  tiene_llamada_activa BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as prospecto_id,
    p.nombre_completo::TEXT as nombre_contacto,
    p.nombre_whatsapp::TEXT,
    p.whatsapp::TEXT as numero_telefono,
    p.whatsapp::TEXT as whatsapp_raw,
    p.etapa::TEXT,
    p.etapa_id,  -- ✅ AGREGADO
    p.requiere_atencion_humana,
    p.motivo_handoff::TEXT,
    p.id_dynamics::TEXT,
    p.id_uchat::TEXT,
    p.created_at as fecha_creacion,
    p.email::TEXT,
    p.titulo::TEXT,
    p.coordinacion_id,
    coord.codigo::TEXT as coordinacion_codigo,
    coord.nombre::TEXT as coordinacion_nombre,
    p.ejecutivo_id,
    u.full_name::TEXT as ejecutivo_nombre,
    u.email::TEXT as ejecutivo_email,
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
    0::BIGINT as mensajes_no_leidos,
    (
      SELECT m.mensaje::TEXT
      FROM mensajes_whatsapp m
      WHERE m.prospecto_id = p.id
      ORDER BY m.fecha_hora DESC
      LIMIT 1
    ) as ultimo_mensaje_preview,
    (
      SELECT lv.id
      FROM llamadas_ventas lv
      WHERE lv.prospecto_id = p.id
        AND lv.llamada_activa = TRUE
      ORDER BY lv.fecha_llamada DESC
      LIMIT 1
    ) as llamada_activa_id,
    EXISTS(
      SELECT 1 
      FROM llamadas_ventas lv
      WHERE lv.prospecto_id = p.id
        AND lv.llamada_activa = TRUE
      LIMIT 1
    ) as tiene_llamada_activa
  FROM prospectos p
  LEFT JOIN coordinaciones coord ON p.coordinacion_id = coord.id
  LEFT JOIN user_profiles_v2 u ON p.ejecutivo_id = u.id
  WHERE 
    -- Debe tener al menos 1 mensaje de WhatsApp
    EXISTS (
      SELECT 1 FROM mensajes_whatsapp m WHERE m.prospecto_id = p.id LIMIT 1
    )
    -- Filtros de permisos
    AND (
      p_is_admin = TRUE OR
      (p_ejecutivo_ids IS NOT NULL AND p.ejecutivo_id = ANY(p_ejecutivo_ids)) OR
      (p_coordinacion_ids IS NOT NULL AND p.coordinacion_id = ANY(p_coordinacion_ids))
    )
  ORDER BY 
    (SELECT MAX(m.fecha_hora) FROM mensajes_whatsapp m WHERE m.prospecto_id = p.id) DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_conversations TO anon;
GRANT EXECUTE ON FUNCTION get_dashboard_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_conversations TO service_role;

COMMENT ON FUNCTION get_dashboard_conversations IS 
'Conversaciones para dashboard - Fix: agregado etapa_id (27 Enero 2026)';

-- ============================================
-- FUNCIÓN 2: search_dashboard_conversations
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
  etapa_id UUID,  -- ✅ AGREGADO
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
  
  RETURN QUERY
  SELECT 
    p.id as prospecto_id,
    p.nombre_completo::TEXT as nombre_contacto,
    p.nombre_whatsapp::TEXT,
    p.whatsapp::TEXT as numero_telefono,
    p.whatsapp::TEXT as whatsapp_raw,
    p.etapa::TEXT,
    p.etapa_id,  -- ✅ AGREGADO
    p.requiere_atencion_humana,
    CAST(NULL AS TEXT) as motivo_handoff,
    p.id_dynamics::TEXT,
    CAST(NULL AS TEXT) as id_uchat,
    CURRENT_TIMESTAMP as fecha_creacion,
    p.email::TEXT,
    p.titulo::TEXT,
    p.coordinacion_id,
    coord.codigo::TEXT as coordinacion_codigo,
    coord.nombre::TEXT as coordinacion_nombre,
    p.ejecutivo_id,
    u.full_name::TEXT as ejecutivo_nombre,
    u.email::TEXT as ejecutivo_email,
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
    0::BIGINT as mensajes_no_leidos,
    (
      SELECT m.mensaje::TEXT
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

GRANT EXECUTE ON FUNCTION search_dashboard_conversations TO anon;
GRANT EXECUTE ON FUNCTION search_dashboard_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION search_dashboard_conversations TO service_role;

COMMENT ON FUNCTION search_dashboard_conversations IS 
'Búsqueda de conversaciones - Fix: agregado etapa_id (27 Enero 2026)';

-- ============================================
-- DESPUÉS DE EJECUTAR: Hard refresh (Cmd+Shift+R)
-- ============================================
