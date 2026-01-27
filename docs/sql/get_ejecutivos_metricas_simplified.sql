-- ============================================
-- RPC: get_ejecutivos_metricas (SIMPLIFICADO)
-- ============================================
-- Función para obtener métricas de ejecutivos
-- Fecha: 27 de Enero 2026
-- Versión: SIMPLIFICADA (sin métricas de WhatsApp por falta de user_id)
-- ============================================

CREATE OR REPLACE FUNCTION get_ejecutivos_metricas(
  p_fecha_inicio TIMESTAMPTZ,
  p_fecha_fin TIMESTAMPTZ,
  p_coordinacion_ids UUID[]
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Obtener métricas por ejecutivo
  WITH ejecutivos_base AS (
    SELECT 
      u.id AS ejecutivo_id,
      u.full_name AS nombre,
      u.email,
      u.coordinacion_id,
      COALESCE(c.nombre, 'Sin coordinación') AS coordinacion_nombre
    FROM user_profiles_v2 u
    LEFT JOIN coordinaciones c ON c.id = u.coordinacion_id
    WHERE 
      u.is_ejecutivo = true
      AND (p_coordinacion_ids IS NULL OR u.coordinacion_id = ANY(p_coordinacion_ids))
  ),
  
  llamadas_por_ejecutivo AS (
    SELECT 
      l.ejecutivo_id,
      COUNT(*) AS llamadas_atendidas
    FROM llamadas_ventas l
    WHERE 
      l.fecha_llamada >= p_fecha_inicio
      AND l.fecha_llamada <= p_fecha_fin
      AND l.call_status IN ('atendida', 'transferida')
      AND l.ejecutivo_id IS NOT NULL
    GROUP BY l.ejecutivo_id
  ),
  
  prospectos_por_ejecutivo AS (
    SELECT 
      p.ejecutivo_id,
      COUNT(*) AS prospectos_asignados
    FROM prospectos p
    WHERE 
      p.ejecutivo_id IS NOT NULL
      AND (p_coordinacion_ids IS NULL OR p.coordinacion_id = ANY(p_coordinacion_ids))
    GROUP BY p.ejecutivo_id
  )
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'ejecutivo_id', eb.ejecutivo_id,
      'nombre', eb.nombre,
      'email', eb.email,
      'coordinacion_id', eb.coordinacion_id,
      'coordinacion_nombre', eb.coordinacion_nombre,
      'mensajes_enviados', 0,
      'plantillas_enviadas', 0,
      'llamadas_atendidas', COALESCE(le.llamadas_atendidas, 0),
      'llamadas_programadas', 0,
      'prospectos_asignados', COALESCE(pe.prospectos_asignados, 0),
      'tiempo_respuesta_promedio', 0,
      'tiempo_handoff_promedio', 0,
      'conversaciones_con_handoff', 0
    )
  ) INTO v_result
  FROM ejecutivos_base eb
  LEFT JOIN llamadas_por_ejecutivo le ON le.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN prospectos_por_ejecutivo pe ON pe.ejecutivo_id = eb.ejecutivo_id;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PERMISOS DE SEGURIDAD
-- ============================================
GRANT EXECUTE ON FUNCTION get_ejecutivos_metricas(TIMESTAMPTZ, TIMESTAMPTZ, UUID[]) 
TO authenticated;

REVOKE EXECUTE ON FUNCTION get_ejecutivos_metricas(TIMESTAMPTZ, TIMESTAMPTZ, UUID[]) 
FROM anon;

-- Comentario
COMMENT ON FUNCTION get_ejecutivos_metricas IS 
'Obtiene métricas de rendimiento de ejecutivos para el dashboard. 
⚠️ SEGURIDAD: Requiere autenticación JWT - Solo rol authenticated.
NOTA: Métricas de WhatsApp en 0 (tabla no tiene user_id).
Fix 2026-01-27: Simplificado - solo llamadas y prospectos';
