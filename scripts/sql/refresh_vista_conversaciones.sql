-- Refrescar vista materializada de conversaciones
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversaciones_dashboard;

-- Verificar conteo después del refresh
SELECT 
  'TOTAL' as tipo,
  COUNT(*) as conversaciones
FROM mv_conversaciones_dashboard

UNION ALL

SELECT 
  'OSMARA (BOOM)' as tipo,
  COUNT(*) as conversaciones
FROM mv_conversaciones_dashboard
WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531'
  AND coordinacion_id = 'e590fed1-6d65-43e0-80ab-ff819ce63eee'

UNION ALL

SELECT 
  'OSMARA (VEN)' as tipo,
  COUNT(*) as conversaciones
FROM mv_conversaciones_dashboard
WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531'
  AND coordinacion_id = '3f41a10b-60b1-4c2b-b097-a83968353af5'

UNION ALL

SELECT 
  'OSMARA (TOTAL)' as tipo,
  COUNT(*) as conversaciones
FROM mv_conversaciones_dashboard
WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531';
