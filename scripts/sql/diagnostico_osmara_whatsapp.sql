-- Script temporal para diagnosticar el problema de Osmara Partida
-- Ejecutar en SQL Editor de Supabase (PQNC_AI)

-- 1. Verificar prospectos asignados a Osmara
SELECT 
  COUNT(*) as total_prospectos,
  COUNT(DISTINCT coordinacion_id) as coordinaciones
FROM prospectos
WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531';

-- 2. Ver estructura de conversaciones_whatsapp
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversaciones_whatsapp' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar conversaciones de WhatsApp de sus prospectos (primeras 3)
SELECT 
  c.*,
  p.nombre_completo,
  p.whatsapp
FROM conversaciones_whatsapp c
INNER JOIN prospectos p ON c.prospecto_id = p.id
WHERE p.ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531'
ORDER BY c.created_at DESC
LIMIT 3;

-- 4. Verificar mensajes de WhatsApp
SELECT 
  COUNT(*) as total_mensajes,
  MIN(m.fecha_hora) as mensaje_mas_antiguo,
  MAX(m.fecha_hora) as mensaje_mas_reciente
FROM mensajes_whatsapp m
INNER JOIN prospectos p ON m.prospecto_id = p.id
WHERE p.ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531';

-- 5. Verificar si hay prospectos SIN conversaciones
SELECT 
  COUNT(*) as prospectos_sin_conversaciones
FROM prospectos p
LEFT JOIN conversaciones_whatsapp c ON p.id = c.prospecto_id
WHERE p.ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531'
  AND c.id IS NULL;

-- 6. Verificar vista mv_conversaciones_dashboard (si existe)
SELECT 
  COUNT(*) as total_en_vista
FROM mv_conversaciones_dashboard
WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531';

