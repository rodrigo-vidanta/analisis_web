-- ============================================
-- ACTUALIZACIÓN FUNCIÓN get_dashboard_conversations (CORREGIDA)
-- ============================================
-- Ejecutar en: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
-- Fix: Removidas columnas de llamadas_ventas (tabla no existe o sin datos)
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
  etapa_id UUID,
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
    p.etapa_id,
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
    NULL::UUID as llamada_activa_id,
    FALSE as tiene_llamada_activa
  FROM prospectos p
  LEFT JOIN coordinaciones coord ON p.coordinacion_id = coord.id
  LEFT JOIN user_profiles_v2 u ON p.ejecutivo_id = u.id
  WHERE 
    EXISTS (
      SELECT 1 FROM mensajes_whatsapp m WHERE m.prospecto_id = p.id LIMIT 1
    )
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

-- Restaurar permisos
GRANT EXECUTE ON FUNCTION get_dashboard_conversations TO anon;
GRANT EXECUTE ON FUNCTION get_dashboard_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_conversations TO service_role;

-- Verificar que funciona
SELECT 
  prospecto_id,
  nombre_contacto,
  etapa,
  etapa_id  -- ✅ Debe tener valores UUID
FROM get_dashboard_conversations(NULL, TRUE, NULL, NULL, 3, 0);
