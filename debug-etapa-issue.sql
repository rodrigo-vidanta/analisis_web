-- ============================================
-- DEBUG: Verificar prospecto "DIEGO BARBA SALAS"
-- ============================================

-- 1. Buscar el prospecto por teléfono
SELECT 
  id,
  nombre_completo,
  whatsapp,
  etapa,
  etapa_id,
  ejecutivo_id,
  coordinacion_id,
  created_at
FROM prospectos
WHERE whatsapp = '7442582382' 
   OR nombre_completo ILIKE '%DIEGO BARBA%'
LIMIT 5;

-- 2. Verificar si el prospecto tiene etapa_id NULL
SELECT 
  p.id,
  p.nombre_completo,
  p.etapa,
  p.etapa_id,
  e.nombre as etapa_nombre_tabla,
  CASE 
    WHEN p.etapa_id IS NULL THEN '❌ etapa_id es NULL'
    WHEN e.nombre IS NULL THEN '❌ etapa_id no corresponde a ninguna etapa válida'
    ELSE '✅ OK'
  END as diagnostico
FROM prospectos p
LEFT JOIN etapas e ON p.etapa_id = e.id
WHERE p.whatsapp = '7442582382' 
   OR p.nombre_completo ILIKE '%DIEGO BARBA%'
LIMIT 5;

-- 3. Ver todas las etapas disponibles
SELECT id, nombre, orden FROM etapas ORDER BY orden;

-- 4. Contar prospectos con etapa_id NULL pero con texto en etapa
SELECT 
  COUNT(*) as prospectos_con_etapa_null,
  COUNT(DISTINCT etapa) as etapas_distintas
FROM prospectos
WHERE etapa_id IS NULL 
  AND etapa IS NOT NULL
  AND etapa != '';

-- 5. Ver algunos ejemplos de etapas sin etapa_id
SELECT 
  etapa,
  COUNT(*) as cantidad
FROM prospectos
WHERE etapa_id IS NULL 
  AND etapa IS NOT NULL
  AND etapa != ''
GROUP BY etapa
ORDER BY cantidad DESC
LIMIT 10;
