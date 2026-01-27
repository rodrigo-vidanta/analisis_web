-- ============================================
-- RPC: get_ejecutivos_metricas (VERSIÓN FUNCIONAL)
-- ============================================
-- Función para obtener métricas de ejecutivos
-- Fecha: 27 de Enero 2026
-- Adaptada al esquema real de la base de datos
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
      AND u.is_active = true
      AND (p_coordinacion_ids IS NULL OR u.coordinacion_id = ANY(p_coordinacion_ids))
  ),
  
  -- Llamadas atendidas por ejecutivo
  llamadas_por_ejecutivo AS (
    SELECT 
      l.ejecutivo_id,
      COUNT(*) AS llamadas_atendidas,
      -- Duración promedio de llamadas en minutos
      AVG(COALESCE(l.duracion_segundos, 0) / 60.0) AS duracion_promedio
    FROM llamadas_ventas l
    WHERE 
      l.fecha_llamada >= p_fecha_inicio
      AND l.fecha_llamada <= p_fecha_fin
      AND l.call_status IN ('atendida', 'transferida', 'answered')
      AND l.ejecutivo_id IS NOT NULL
    GROUP BY l.ejecutivo_id
  ),
  
  -- Prospectos asignados por ejecutivo
  prospectos_por_ejecutivo AS (
    SELECT 
      p.ejecutivo_id,
      COUNT(*) AS prospectos_asignados,
      -- Prospectos creados en el período
      COUNT(*) FILTER (
        WHERE p.created_at >= p_fecha_inicio 
        AND p.created_at <= p_fecha_fin
      ) AS prospectos_nuevos
    FROM prospectos p
    WHERE 
      p.ejecutivo_id IS NOT NULL
      AND (p_coordinacion_ids IS NULL OR p.coordinacion_id = ANY(p_coordinacion_ids))
    GROUP BY p.ejecutivo_id
  ),
  
  -- Conversaciones de WhatsApp por ejecutivo (via prospectos)
  conversaciones_por_ejecutivo AS (
    SELECT 
      p.ejecutivo_id,
      COUNT(DISTINCT c.id) AS conversaciones_totales,
      COUNT(DISTINCT c.id) FILTER (WHERE c.estado = 'activa') AS conversaciones_activas
    FROM conversaciones_whatsapp c
    INNER JOIN prospectos p ON p.id = c.prospecto_id
    WHERE 
      p.ejecutivo_id IS NOT NULL
      AND c.fecha_inicio >= p_fecha_inicio
      AND c.fecha_inicio <= p_fecha_fin
      AND (p_coordinacion_ids IS NULL OR p.coordinacion_id = ANY(p_coordinacion_ids))
    GROUP BY p.ejecutivo_id
  ),
  
  -- Mensajes por ejecutivo (via prospectos)
  mensajes_por_ejecutivo AS (
    SELECT 
      p.ejecutivo_id,
      COUNT(m.id) AS mensajes_totales
    FROM mensajes_whatsapp m
    INNER JOIN prospectos p ON p.id = m.prospecto_id
    WHERE 
      p.ejecutivo_id IS NOT NULL
      AND m.fecha_hora >= p_fecha_inicio
      AND m.fecha_hora <= p_fecha_fin
      AND (p_coordinacion_ids IS NULL OR p.coordinacion_id = ANY(p_coordinacion_ids))
    GROUP BY p.ejecutivo_id
  ),
  
  -- Tiempos de respuesta (primera respuesta de Agente después de mensaje de Prospecto)
  tiempos_respuesta AS (
    SELECT 
      p.ejecutivo_id,
      AVG(
        EXTRACT(EPOCH FROM (agente.fecha_hora - prospecto.fecha_hora)) / 60
      ) AS tiempo_respuesta_promedio,
      COUNT(*) AS respuestas_totales
    FROM mensajes_whatsapp prospecto
    INNER JOIN prospectos p ON p.id = prospecto.prospecto_id
    INNER JOIN LATERAL (
      SELECT fecha_hora
      FROM mensajes_whatsapp
      WHERE prospecto_id = prospecto.prospecto_id
        AND fecha_hora > prospecto.fecha_hora
        AND rol = 'Agente'
      ORDER BY fecha_hora ASC
      LIMIT 1
    ) agente ON true
    WHERE 
      prospecto.rol = 'Prospecto'
      AND prospecto.fecha_hora >= p_fecha_inicio
      AND prospecto.fecha_hora <= p_fecha_fin
      AND p.ejecutivo_id IS NOT NULL
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
      'mensajes_enviados', COALESCE(me.mensajes_totales, 0),
      'plantillas_enviadas', 0, -- No disponible en esquema actual
      'llamadas_atendidas', COALESCE(le.llamadas_atendidas, 0),
      'llamadas_programadas', 0, -- Tabla sin ejecutivo_id
      'prospectos_asignados', COALESCE(pe.prospectos_asignados, 0),
      'prospectos_nuevos', COALESCE(pe.prospectos_nuevos, 0),
      'conversaciones_totales', COALESCE(ce.conversaciones_totales, 0),
      'conversaciones_activas', COALESCE(ce.conversaciones_activas, 0),
      'tiempo_respuesta_promedio', COALESCE(tr.tiempo_respuesta_promedio, 0),
      'tiempo_handoff_promedio', 0, -- Requiere campo user_id en mensajes
      'conversaciones_con_handoff', COALESCE(tr.respuestas_totales, 0),
      'duracion_promedio_llamadas', COALESCE(le.duracion_promedio, 0)
    )
  ) INTO v_result
  FROM ejecutivos_base eb
  LEFT JOIN llamadas_por_ejecutivo le ON le.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN prospectos_por_ejecutivo pe ON pe.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN conversaciones_por_ejecutivo ce ON ce.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN mensajes_por_ejecutivo me ON me.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN tiempos_respuesta tr ON tr.ejecutivo_id = eb.ejecutivo_id;
  
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
✅ FUNCIONAL: Llamadas, prospectos, conversaciones, mensajes (via relación con prospectos)
⚠️ SEGURIDAD: Requiere autenticación JWT - Solo rol authenticated.
Versión: 2.0 - Adaptada al esquema real de BD
Actualizado: 2026-01-27';
