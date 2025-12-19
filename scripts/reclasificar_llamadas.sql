-- ═══════════════════════════════════════════════════════════════════════════
-- RECLASIFICACIÓN DE LLAMADAS EXISTENTES v1.0
-- Fecha: 19 Diciembre 2025
-- Aplica la lógica de clasificación de 6 estados directamente en la BD
-- Estados: activa, transferida, atendida, no_contestada, buzon, perdida
-- ═══════════════════════════════════════════════════════════════════════════

-- Primero, veamos cuántas llamadas hay por estado actual
SELECT call_status, COUNT(*) as total 
FROM llamadas_ventas 
GROUP BY call_status 
ORDER BY total DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- RECLASIFICACIÓN MASIVA
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE llamadas_ventas
SET call_status = CASE
    -- ═══════════════════════════════════════════════════════════════════════
    -- REGLA 1: TRANSFERIDAS (prioridad máxima)
    -- ═══════════════════════════════════════════════════════════════════════
    WHEN datos_llamada->>'razon_finalizacion' = 'assistant-forwarded-call' 
         OR datos_llamada->>'razon_finalizacion' = 'call.ringing.hook-executed-transfer'
    THEN 'transferida'
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- REGLA 2: BUZÓN DE VOZ
    -- Tiene grabación + duración 15-50s + máximo 2 turnos + razón de no contestó
    -- Los buzones típicos tienen 0-2 turnos (solo el asistente puede hablar al buzón)
    -- ═══════════════════════════════════════════════════════════════════════
    WHEN datos_llamada->>'razon_finalizacion' IN ('customer-did-not-answer', 'customer-busy', 'no-answer', 'machine-detected')
         AND audio_ruta_bucket IS NOT NULL 
         AND audio_ruta_bucket != ''
         AND COALESCE(duracion_segundos, 0) >= 15 
         AND COALESCE(duracion_segundos, 0) <= 50
         AND COALESCE((datos_llamada->>'numero_turnos')::int, 0) <= 2
    THEN 'buzon'
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- REGLA 3: NO CONTESTADAS (cliente nunca contestó)
    -- ═══════════════════════════════════════════════════════════════════════
    WHEN datos_llamada->>'razon_finalizacion' IN ('customer-did-not-answer', 'customer-busy', 'no-answer', 'machine-detected')
    THEN 'no_contestada'
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- REGLA 4: ATENDIDAS (hubo conversación pero no transferida)
    -- ═══════════════════════════════════════════════════════════════════════
    WHEN datos_llamada->>'razon_finalizacion' IN ('customer-ended-call', 'assistant-ended-call', 'silence-timed-out', 'max-duration-reached')
         AND (COALESCE((datos_llamada->>'numero_turnos')::int, 0) >= 1 OR COALESCE(duracion_segundos, 0) >= 30)
    THEN 'atendida'
    
    -- Atendida con razón conocida pero pocos turnos y duración típica de buzón = posible buzón
    WHEN datos_llamada->>'razon_finalizacion' IN ('customer-ended-call', 'assistant-ended-call', 'silence-timed-out', 'max-duration-reached')
         AND COALESCE(duracion_segundos, 0) >= 15 
         AND COALESCE(duracion_segundos, 0) <= 50
         AND COALESCE((datos_llamada->>'numero_turnos')::int, 0) <= 2
         AND audio_ruta_bucket IS NOT NULL 
         AND audio_ruta_bucket != ''
    THEN 'buzon'
    
    -- Atendida con razón conocida pero duración corta sin grabación
    WHEN datos_llamada->>'razon_finalizacion' IN ('customer-ended-call', 'assistant-ended-call', 'silence-timed-out', 'max-duration-reached')
         AND COALESCE(duracion_segundos, 0) > 0 
         AND COALESCE(duracion_segundos, 0) < 30
         AND COALESCE((datos_llamada->>'numero_turnos')::int, 0) = 0
         AND (audio_ruta_bucket IS NULL OR audio_ruta_bucket = '')
    THEN 'no_contestada'
    
    -- Default para razones atendidas
    WHEN datos_llamada->>'razon_finalizacion' IN ('customer-ended-call', 'assistant-ended-call', 'silence-timed-out', 'max-duration-reached')
    THEN 'atendida'
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- REGLA 5: ERRORES TÉCNICOS (perdida por sistema)
    -- ═══════════════════════════════════════════════════════════════════════
    WHEN datos_llamada->>'razon_finalizacion' IN ('assistant-not-found', 'assistant-request-failed', 'pipeline-error', 'twilio-failed', 'unknown-error')
    THEN 'perdida'
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- REGLA 6: TIENE GRABACIÓN O FIN_LLAMADA = FINALIZADA
    -- ═══════════════════════════════════════════════════════════════════════
    WHEN (audio_ruta_bucket IS NOT NULL AND audio_ruta_bucket != '') 
         OR (datos_llamada->>'fin_llamada' IS NOT NULL AND datos_llamada->>'fin_llamada' != '')
    THEN CASE
        WHEN COALESCE((datos_llamada->>'numero_turnos')::int, 0) >= 1 THEN 'atendida'
        WHEN COALESCE(duracion_segundos, 0) >= 30 THEN 'atendida'
        ELSE 'no_contestada'
    END
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- REGLA 7: LLAMADAS STUCK (más de 15 min sin datos)
    -- ═══════════════════════════════════════════════════════════════════════
    WHEN fecha_llamada < NOW() - INTERVAL '15 minutes'
         AND COALESCE(duracion_segundos, 0) = 0
         AND COALESCE((datos_llamada->>'numero_turnos')::int, 0) = 0
         AND (audio_ruta_bucket IS NULL OR audio_ruta_bucket = '')
    THEN 'perdida'
    
    -- Sin monitor_url después de 30 min = muerta
    WHEN fecha_llamada < NOW() - INTERVAL '30 minutes'
         AND (monitor_url IS NULL OR monitor_url = '')
         AND (audio_ruta_bucket IS NULL OR audio_ruta_bucket = '')
    THEN 'perdida'
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- DEFAULT: Mantener estado actual si no aplica ninguna regla
    -- ═══════════════════════════════════════════════════════════════════════
    ELSE call_status
END;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN POST-RECLASIFICACIÓN
-- ═══════════════════════════════════════════════════════════════════════════

SELECT call_status, COUNT(*) as total 
FROM llamadas_ventas 
GROUP BY call_status 
ORDER BY total DESC;

