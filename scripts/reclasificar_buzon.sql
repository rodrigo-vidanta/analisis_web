-- ═══════════════════════════════════════════════════════════════════════════
-- RECLASIFICACIÓN DE LLAMADAS A BUZÓN
-- Fecha: 19 Diciembre 2025
-- 
-- Este script corrige llamadas que fueron clasificadas incorrectamente
-- como 'no_contestada' o 'perdida' cuando en realidad fueron a buzón.
--
-- Criterios para BUZÓN:
-- 1. Tiene grabación (audio_ruta_bucket)
-- 2. Duración entre 15-50 segundos
-- 3. Máximo 2 turnos (el asistente puede hablar al buzón)
-- 4. Razón de finalización indica no contestó
-- ═══════════════════════════════════════════════════════════════════════════

-- PASO 1: Ver cuántas llamadas serán afectadas (preview)
SELECT 
    call_id,
    call_status as status_actual,
    duracion_segundos,
    datos_llamada->>'numero_turnos' as turnos,
    datos_llamada->>'razon_finalizacion' as razon,
    fecha_llamada
FROM llamadas_ventas
WHERE 
    -- Tiene grabación
    audio_ruta_bucket IS NOT NULL 
    AND audio_ruta_bucket != ''
    -- Duración típica de buzón (15-50 segundos)
    AND COALESCE(duracion_segundos, 0) >= 15 
    AND COALESCE(duracion_segundos, 0) <= 50
    -- Máximo 2 turnos (asistente puede hablar al buzón)
    AND COALESCE((datos_llamada->>'numero_turnos')::int, 0) <= 2
    -- Razón de no contestó
    AND datos_llamada->>'razon_finalizacion' IN (
        'customer-did-not-answer', 
        'customer-busy', 
        'no-answer', 
        'machine-detected'
    )
    -- Actualmente clasificadas incorrectamente
    AND call_status IN ('no_contestada', 'perdida', 'activa', 'finalizada')
ORDER BY fecha_llamada DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 2: EJECUTAR LA ACTUALIZACIÓN
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE llamadas_ventas
SET call_status = 'buzon'
WHERE 
    -- Tiene grabación
    audio_ruta_bucket IS NOT NULL 
    AND audio_ruta_bucket != ''
    -- Duración típica de buzón (15-50 segundos)
    AND COALESCE(duracion_segundos, 0) >= 15 
    AND COALESCE(duracion_segundos, 0) <= 50
    -- Máximo 2 turnos (asistente puede hablar al buzón)
    AND COALESCE((datos_llamada->>'numero_turnos')::int, 0) <= 2
    -- Razón de no contestó
    AND datos_llamada->>'razon_finalizacion' IN (
        'customer-did-not-answer', 
        'customer-busy', 
        'no-answer', 
        'machine-detected'
    )
    -- Actualmente clasificadas incorrectamente
    AND call_status IN ('no_contestada', 'perdida', 'activa', 'finalizada');

-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 3: Verificar el resultado
-- ═══════════════════════════════════════════════════════════════════════════

SELECT call_status, COUNT(*) as total 
FROM llamadas_ventas 
GROUP BY call_status 
ORDER BY total DESC;

