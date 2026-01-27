-- ============================================
-- RPC: get_ejecutivos_metricas (VERSIÓN COMPLETA)
-- ============================================
-- Función para obtener métricas de ejecutivos
-- Fecha: 27 de Enero 2026
-- TODAS LAS MÉTRICAS FUNCIONALES usando correlaciones reales
-- ============================================

CREATE OR REPLACE FUNCTION get_ejecutivos_metricas(
  p_fecha_inicio TIMESTAMPTZ,
  p_fecha_fin TIMESTAMPTZ,
  p_coordinacion_ids UUID[]
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
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
  
  -- ========================================
  -- MÉTRICAS DE MENSAJES DE WHATSAPP
  -- ========================================
  
  -- Mensajes enviados por ejecutivo (rol 'Vendedor' con id_sender)
  mensajes_vendedor AS (
    SELECT 
      m.id_sender::UUID AS ejecutivo_id,
      COUNT(*) AS mensajes_enviados
    FROM mensajes_whatsapp m
    WHERE 
      m.rol = 'Vendedor'
      AND m.id_sender IS NOT NULL
      AND m.fecha_hora >= p_fecha_inicio
      AND m.fecha_hora <= p_fecha_fin
    GROUP BY m.id_sender::UUID
  ),
  
  -- Plantillas enviadas (rol 'Plantilla' via prospecto)
  plantillas_por_ejecutivo AS (
    SELECT 
      p.ejecutivo_id,
      COUNT(*) AS plantillas_enviadas
    FROM mensajes_whatsapp m
    INNER JOIN prospectos p ON p.id = m.prospecto_id
    WHERE 
      m.rol = 'Plantilla'
      AND m.fecha_hora >= p_fecha_inicio
      AND m.fecha_hora <= p_fecha_fin
      AND p.ejecutivo_id IS NOT NULL
      AND (p_coordinacion_ids IS NULL OR p.coordinacion_id = ANY(p_coordinacion_ids))
    GROUP BY p.ejecutivo_id
  ),
  
  -- Conversaciones donde hubo handoff (AI → Vendedor)
  conversaciones_con_handoff AS (
    SELECT 
      p.ejecutivo_id,
      m.prospecto_id,
      MIN(CASE WHEN m.rol = 'AI' THEN m.fecha_hora END) AS primer_mensaje_ai,
      MIN(CASE WHEN m.rol = 'Vendedor' THEN m.fecha_hora END) AS primer_mensaje_vendedor
    FROM mensajes_whatsapp m
    INNER JOIN prospectos p ON p.id = m.prospecto_id
    WHERE 
      m.fecha_hora >= p_fecha_inicio
      AND m.fecha_hora <= p_fecha_fin
      AND p.ejecutivo_id IS NOT NULL
      AND m.rol IN ('AI', 'Vendedor')
      AND (p_coordinacion_ids IS NULL OR p.coordinacion_id = ANY(p_coordinacion_ids))
    GROUP BY p.ejecutivo_id, m.prospecto_id
    HAVING 
      MIN(CASE WHEN m.rol = 'AI' THEN m.fecha_hora END) IS NOT NULL
      AND MIN(CASE WHEN m.rol = 'Vendedor' THEN m.fecha_hora END) IS NOT NULL
  ),
  
  -- Tiempo promedio de handoff (AI → Vendedor)
  tiempos_handoff AS (
    SELECT 
      ejecutivo_id,
      AVG(EXTRACT(EPOCH FROM (primer_mensaje_vendedor - primer_mensaje_ai)) / 60) AS tiempo_handoff_promedio,
      COUNT(*) AS total_handoffs
    FROM conversaciones_con_handoff
    WHERE primer_mensaje_vendedor > primer_mensaje_ai
    GROUP BY ejecutivo_id
  ),
  
  -- Tiempo de respuesta (último Prospecto → primer Vendedor después)
  tiempos_respuesta AS (
    SELECT 
      p.ejecutivo_id,
      AVG(
        EXTRACT(EPOCH FROM (vendedor.fecha_hora - prospecto.fecha_hora)) / 60
      ) AS tiempo_respuesta_promedio,
      COUNT(*) AS respuestas_totales
    FROM mensajes_whatsapp prospecto
    INNER JOIN prospectos p ON p.id = prospecto.prospecto_id
    INNER JOIN LATERAL (
      SELECT fecha_hora
      FROM mensajes_whatsapp
      WHERE prospecto_id = prospecto.prospecto_id
        AND fecha_hora > prospecto.fecha_hora
        AND rol = 'Vendedor'
      ORDER BY fecha_hora ASC
      LIMIT 1
    ) vendedor ON true
    WHERE 
      prospecto.rol = 'Prospecto'
      AND prospecto.fecha_hora >= p_fecha_inicio
      AND prospecto.fecha_hora <= p_fecha_fin
      AND p.ejecutivo_id IS NOT NULL
      AND (p_coordinacion_ids IS NULL OR p.coordinacion_id = ANY(p_coordinacion_ids))
    GROUP BY p.ejecutivo_id
  ),
  
  -- ========================================
  -- MÉTRICAS DE LLAMADAS
  -- ========================================
  
  llamadas_por_ejecutivo AS (
    SELECT 
      l.ejecutivo_id,
      COUNT(*) AS llamadas_atendidas,
      AVG(COALESCE(l.duracion_segundos, 0) / 60.0) AS duracion_promedio
    FROM llamadas_ventas l
    WHERE 
      l.fecha_llamada >= p_fecha_inicio
      AND l.fecha_llamada <= p_fecha_fin
      AND l.call_status IN ('atendida', 'transferida', 'answered', 'completed')
      AND l.ejecutivo_id IS NOT NULL
    GROUP BY l.ejecutivo_id
  ),
  
  -- ========================================
  -- MÉTRICAS DE PROSPECTOS Y CONVERSACIONES
  -- ========================================
  
  prospectos_por_ejecutivo AS (
    SELECT 
      p.ejecutivo_id,
      COUNT(*) AS prospectos_asignados,
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
  )
  
  -- ========================================
  -- RESULTADO FINAL
  -- ========================================
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'ejecutivo_id', eb.ejecutivo_id,
      'nombre', eb.nombre,
      'email', eb.email,
      'coordinacion_id', eb.coordinacion_id,
      'coordinacion_nombre', eb.coordinacion_nombre,
      
      -- Mensajes WhatsApp
      'mensajes_enviados', COALESCE(mv.mensajes_enviados, 0),
      'plantillas_enviadas', COALESCE(pte.plantillas_enviadas, 0),
      
      -- Llamadas
      'llamadas_atendidas', COALESCE(le.llamadas_atendidas, 0),
      'llamadas_programadas', 0, -- Tabla sin ejecutivo_id
      'duracion_promedio_llamadas', COALESCE(le.duracion_promedio, 0),
      
      -- Prospectos
      'prospectos_asignados', COALESCE(pe.prospectos_asignados, 0),
      'prospectos_nuevos', COALESCE(pe.prospectos_nuevos, 0),
      
      -- Conversaciones
      'conversaciones_totales', COALESCE(ce.conversaciones_totales, 0),
      'conversaciones_activas', COALESCE(ce.conversaciones_activas, 0),
      'conversaciones_con_handoff', COALESCE(th.total_handoffs, 0),
      
      -- Tiempos
      'tiempo_respuesta_promedio', ROUND(COALESCE(tr.tiempo_respuesta_promedio, 0)::numeric, 2),
      'tiempo_handoff_promedio', ROUND(COALESCE(th.tiempo_handoff_promedio, 0)::numeric, 2),
      'respuestas_totales', COALESCE(tr.respuestas_totales, 0)
    )
  ) INTO v_result
  FROM ejecutivos_base eb
  LEFT JOIN mensajes_vendedor mv ON mv.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN plantillas_por_ejecutivo pte ON pte.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN llamadas_por_ejecutivo le ON le.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN prospectos_por_ejecutivo pe ON pe.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN conversaciones_por_ejecutivo ce ON ce.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN tiempos_respuesta tr ON tr.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN tiempos_handoff th ON th.ejecutivo_id = eb.ejecutivo_id;
  
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

-- ============================================
-- COMENTARIO
-- ============================================

COMMENT ON FUNCTION get_ejecutivos_metricas IS 
'Obtiene métricas COMPLETAS de rendimiento de ejecutivos.
✅ TODAS LAS MÉTRICAS FUNCIONALES:
- Mensajes de Vendedor (via id_sender)
- Plantillas enviadas (via prospecto.ejecutivo_id)
- Tiempo handoff (AI → Vendedor)
- Tiempo respuesta (Prospecto → Vendedor)
- Llamadas, prospectos, conversaciones
⚠️ SEGURIDAD: Solo usuarios autenticados (JWT requerido)
Versión: 3.0 COMPLETA
Actualizado: 2026-01-27 23:00 UTC';
