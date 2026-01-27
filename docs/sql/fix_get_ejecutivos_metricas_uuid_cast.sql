-- ============================================
-- RPC: get_ejecutivos_metricas (CORREGIDO)
-- ============================================
-- Función para obtener métricas de ejecutivos
-- Fecha: 27 de Enero 2026
-- Uso: Dashboard Ejecutivo - Widget de Métricas de Ejecutivos
-- Fix: Corregir cast de UUID en llamadas_por_ejecutivo
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
  
  mensajes_por_ejecutivo AS (
    SELECT 
      m.user_id AS ejecutivo_id,
      COUNT(*) AS mensajes_enviados,
      COUNT(*) FILTER (WHERE m.es_plantilla = true) AS plantillas_enviadas
    FROM mensajes_whatsapp m
    WHERE 
      m.rol = 'Agente'
      AND m.fecha_hora >= p_fecha_inicio
      AND m.fecha_hora <= p_fecha_fin
      AND m.user_id IS NOT NULL
    GROUP BY m.user_id
  ),
  
  llamadas_por_ejecutivo AS (
    SELECT 
      -- FIX: Cast explícito de TEXT a UUID
      COALESCE(
        l.ejecutivo_asignado_id, 
        NULLIF(l.prospecto::jsonb->>'ejecutivo_id', '')::UUID
      ) AS ejecutivo_id,
      COUNT(*) AS llamadas_atendidas
    FROM llamadas_ventas l
    WHERE 
      l.fecha_llamada >= p_fecha_inicio
      AND l.fecha_llamada <= p_fecha_fin
      AND l.call_status IN ('atendida', 'transferida')
      AND (
        l.ejecutivo_asignado_id IS NOT NULL 
        OR (l.prospecto::jsonb->>'ejecutivo_id') IS NOT NULL
      )
    GROUP BY COALESCE(
      l.ejecutivo_asignado_id, 
      NULLIF(l.prospecto::jsonb->>'ejecutivo_id', '')::UUID
    )
  ),
  
  llamadas_programadas_por_ejecutivo AS (
    SELECT 
      lp.ejecutivo_id,
      COUNT(*) AS llamadas_programadas
    FROM llamadas_programadas lp
    WHERE 
      lp.fecha_programada >= p_fecha_inicio
      AND lp.fecha_programada <= p_fecha_fin
      AND lp.ejecutivo_id IS NOT NULL
    GROUP BY lp.ejecutivo_id
  ),
  
  prospectos_por_ejecutivo AS (
    SELECT 
      p.ejecutivo_asignado_id AS ejecutivo_id,
      COUNT(*) AS prospectos_asignados
    FROM prospectos p
    WHERE 
      p.ejecutivo_asignado_id IS NOT NULL
      AND (p_coordinacion_ids IS NULL OR p.coordinacion_id = ANY(p_coordinacion_ids))
    GROUP BY p.ejecutivo_asignado_id
  ),
  
  tiempos_respuesta AS (
    SELECT 
      m.user_id AS ejecutivo_id,
      AVG(
        EXTRACT(EPOCH FROM (m.fecha_hora - prev.fecha_hora)) / 60
      ) AS tiempo_respuesta_promedio,
      COUNT(*) AS conversaciones_con_handoff
    FROM mensajes_whatsapp m
    INNER JOIN LATERAL (
      SELECT fecha_hora
      FROM mensajes_whatsapp prev
      WHERE prev.prospecto_id = m.prospecto_id
        AND prev.rol = 'Prospecto'
        AND prev.fecha_hora < m.fecha_hora
      ORDER BY prev.fecha_hora DESC
      LIMIT 1
    ) prev ON true
    WHERE 
      m.rol = 'Agente'
      AND m.fecha_hora >= p_fecha_inicio
      AND m.fecha_hora <= p_fecha_fin
      AND m.user_id IS NOT NULL
    GROUP BY m.user_id
  ),
  
  tiempos_handoff AS (
    SELECT 
      m.user_id AS ejecutivo_id,
      AVG(
        EXTRACT(EPOCH FROM (m.fecha_hora - first.fecha_hora)) / 60
      ) AS tiempo_handoff_promedio
    FROM mensajes_whatsapp m
    INNER JOIN LATERAL (
      SELECT MIN(fecha_hora) AS fecha_hora
      FROM mensajes_whatsapp first
      WHERE first.prospecto_id = m.prospecto_id
    ) first ON true
    WHERE 
      m.rol = 'Agente'
      AND m.fecha_hora >= p_fecha_inicio
      AND m.fecha_hora <= p_fecha_fin
      AND m.user_id IS NOT NULL
    GROUP BY m.user_id
  )
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'ejecutivo_id', eb.ejecutivo_id,
      'nombre', eb.nombre,
      'email', eb.email,
      'coordinacion_id', eb.coordinacion_id,
      'coordinacion_nombre', eb.coordinacion_nombre,
      'mensajes_enviados', COALESCE(me.mensajes_enviados, 0),
      'plantillas_enviadas', COALESCE(me.plantillas_enviadas, 0),
      'llamadas_atendidas', COALESCE(le.llamadas_atendidas, 0),
      'llamadas_programadas', COALESCE(lp.llamadas_programadas, 0),
      'prospectos_asignados', COALESCE(pe.prospectos_asignados, 0),
      'tiempo_respuesta_promedio', COALESCE(tr.tiempo_respuesta_promedio, 0),
      'tiempo_handoff_promedio', COALESCE(th.tiempo_handoff_promedio, 0),
      'conversaciones_con_handoff', COALESCE(tr.conversaciones_con_handoff, 0)
    )
  ) INTO v_result
  FROM ejecutivos_base eb
  LEFT JOIN mensajes_por_ejecutivo me ON me.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN llamadas_por_ejecutivo le ON le.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN llamadas_programadas_por_ejecutivo lp ON lp.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN prospectos_por_ejecutivo pe ON pe.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN tiempos_respuesta tr ON tr.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN tiempos_handoff th ON th.ejecutivo_id = eb.ejecutivo_id;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PERMISOS DE SEGURIDAD
-- ============================================
-- ⚠️ CRÍTICO: Solo usuarios autenticados pueden ejecutar esta función
-- Las métricas de ejecutivos son información sensible y privada
GRANT EXECUTE ON FUNCTION get_ejecutivos_metricas(TIMESTAMPTZ, TIMESTAMPTZ, UUID[]) 
TO authenticated;

-- Revocar acceso a anon (seguridad)
REVOKE EXECUTE ON FUNCTION get_ejecutivos_metricas(TIMESTAMPTZ, TIMESTAMPTZ, UUID[]) 
FROM anon;

-- Comentario de la función
COMMENT ON FUNCTION get_ejecutivos_metricas IS 
'Obtiene métricas de rendimiento de ejecutivos para el dashboard. 
Incluye: mensajes, plantillas, llamadas, tiempos de respuesta y handoff.
⚠️ SEGURIDAD: Requiere autenticación JWT - Solo rol authenticated.
Fix 2026-01-27: Corregido cast UUID en llamadas_por_ejecutivo';
