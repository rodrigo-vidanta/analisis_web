-- ============================================
-- ACTUALIZACIÓN DIRECTA DE LLAMADAS FALLIDAS
-- Base: glsmifhkoaifvaegsozd.supabase.co (Natalia)
-- Aplicar la misma lógica que la vista pero UPDATE real
-- ============================================

-- 1. VER ESTADO ACTUAL DE LLAMADAS PROBLEMÁTICAS
SELECT 
  call_id,
  call_status,
  fecha_llamada,
  duracion_segundos,
  audio_ruta_bucket,
  datos_llamada->>'razon_finalizacion' as razon_finalizacion,
  EXTRACT(EPOCH FROM (NOW() - fecha_llamada))/60 as minutos_transcurridos,
  prospecto
FROM llamadas_ventas 
WHERE call_status = 'activa'
  AND (
    datos_llamada->>'razon_finalizacion' IS NOT NULL
    OR (duracion_segundos = 0 OR duracion_segundos IS NULL) AND audio_ruta_bucket IS NULL
    OR fecha_llamada < NOW() - INTERVAL '30 minutes'
  )
ORDER BY fecha_llamada DESC;

-- 2. ACTUALIZAR LLAMADAS CON RAZÓN DE NO CONTESTADO
UPDATE llamadas_ventas 
SET call_status = 'perdida'
WHERE call_status = 'activa' 
  AND datos_llamada->>'razon_finalizacion' IN (
    'customer-did-not-answer', 
    'customer-ended-call', 
    'customer-busy', 
    'no-answer'
  );

-- 3. ACTUALIZAR LLAMADAS SIN DURACIÓN NI AUDIO
UPDATE llamadas_ventas 
SET call_status = 'perdida'
WHERE call_status = 'activa' 
  AND (duracion_segundos = 0 OR duracion_segundos IS NULL)
  AND audio_ruta_bucket IS NULL
  AND fecha_llamada < NOW() - INTERVAL '30 minutes';

-- 4. ACTUALIZAR LLAMADAS MUY ANTIGUAS (más de 2 horas)
UPDATE llamadas_ventas 
SET call_status = 'perdida'
WHERE call_status = 'activa' 
  AND fecha_llamada < NOW() - INTERVAL '2 hours';

-- 5. LIMPIAR URLs de llamadas que ya no están activas
UPDATE llamadas_ventas 
SET 
  monitor_url = NULL,
  control_url = NULL
WHERE call_status IN ('perdida', 'finalizada', 'transferida', 'colgada')
  AND (monitor_url IS NOT NULL OR control_url IS NOT NULL);

-- 6. VERIFICAR RESULTADO
SELECT 
  'DESPUÉS DE ACTUALIZACIÓN' as estado,
  call_status,
  COUNT(*) as cantidad
FROM llamadas_ventas 
GROUP BY call_status
ORDER BY cantidad DESC;

-- 7. VER LLAMADAS ACTIVAS RESTANTES
SELECT 
  call_id,
  call_status,
  fecha_llamada,
  duracion_segundos,
  datos_llamada->>'razon_finalizacion' as razon_finalizacion,
  EXTRACT(EPOCH FROM (NOW() - fecha_llamada))/60 as minutos_transcurridos,
  prospecto
FROM llamadas_ventas 
WHERE call_status = 'activa'
ORDER BY fecha_llamada DESC;

-- 8. VERIFICAR ESPECÍFICAMENTE LAS LLAMADAS DE SAMUEL
SELECT 
  call_id,
  call_status,
  datos_llamada->>'razon_finalizacion' as razon_finalizacion,
  EXTRACT(EPOCH FROM (NOW() - fecha_llamada))/60 as minutos_transcurridos
FROM llamadas_ventas 
WHERE prospecto = 'e6a517ec-b2d3-4b12-a4ca-4b29dfa02c3a' -- ID de Samuel
  AND call_status = 'activa';
