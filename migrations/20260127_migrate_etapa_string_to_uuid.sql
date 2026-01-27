-- ============================================
-- MIGRACIÓN: Campo etapa (string) → etapa_id (UUID)
-- ============================================
-- Fecha: 27 Enero 2026
-- Problema: Solo 1000 de 2671 prospectos tienen etapa_id poblado
-- Solución: Migrar el campo legacy `etapa` al nuevo `etapa_id`
-- ============================================
-- URL: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
-- Tiempo estimado: 1-2 minutos | Riesgo: Bajo (solo UPDATE, no borra datos)
-- ============================================

-- PASO 1: Verificación PRE-migración
-- ============================================
SELECT 'ANTES DE MIGRACIÓN' as status;
SELECT 
  COUNT(*) FILTER (WHERE etapa_id IS NOT NULL) as con_etapa_id,
  COUNT(*) FILTER (WHERE etapa_id IS NULL) as sin_etapa_id,
  COUNT(*) as total
FROM prospectos;

-- PASO 2: Migrar prospectos con campo legacy "etapa" sin etapa_id
-- ============================================

-- 2.1 "Primer contacto"
UPDATE prospectos 
SET etapa_id = '9832d031-f7ef-4596-a66e-f922daaa9772'
WHERE etapa_id IS NULL 
  AND etapa ILIKE 'Primer contacto';

-- 2.2 "Validando membresia" / "Validando membresía" (con y sin tilde)
UPDATE prospectos 
SET etapa_id = '3a8eff65-9bc2-4ac7-913d-2dd611ff8622'
WHERE etapa_id IS NULL 
  AND (etapa ILIKE 'Validando membresia' OR etapa ILIKE 'Validando membresía');

-- 2.3 "En seguimiento" → Discovery (cambio de nombre histórico)
UPDATE prospectos 
SET etapa_id = '328b8817-567b-480e-a3b1-5ecd198433dc'
WHERE etapa_id IS NULL 
  AND (etapa ILIKE 'En seguimiento' OR etapa ILIKE 'Discovery');

-- 2.4 "Interesado"
UPDATE prospectos 
SET etapa_id = '5327dcda-399a-460e-be96-0eb87e1d4d6b'
WHERE etapa_id IS NULL 
  AND etapa ILIKE 'Interesado';

-- 2.5 "Atendió llamada"
UPDATE prospectos 
SET etapa_id = '003ec594-6e7d-4bea-9cf4-09870626b182'
WHERE etapa_id IS NULL 
  AND etapa ILIKE 'Atendió llamada';

-- 2.6 "Con ejecutivo"
UPDATE prospectos 
SET etapa_id = '9613d6a4-ef49-4bff-94fd-b995f8498ffb'
WHERE etapa_id IS NULL 
  AND etapa ILIKE 'Con ejecutivo';

-- 2.7 "Activo PQNC"
UPDATE prospectos 
SET etapa_id = '3fd67703-d3b3-41f3-89f8-0b46c0eb33be'
WHERE etapa_id IS NULL 
  AND etapa ILIKE 'Activo PQNC';

-- 2.8 "Es miembro"
UPDATE prospectos 
SET etapa_id = 'e3b7dbea-7eb7-4a28-9f9a-c0df609878d3'
WHERE etapa_id IS NULL 
  AND etapa ILIKE 'Es miembro';

-- 2.9 "Importado Manual" / "Importado CRM"
UPDATE prospectos 
SET etapa_id = 'eed28f88-2734-4d48-914d-daee97fe7232'
WHERE etapa_id IS NULL 
  AND (etapa ILIKE 'Importado Manual' OR etapa ILIKE 'Importado CRM' OR etapa ILIKE 'Manual Import');

-- 2.10 "No interesado"
UPDATE prospectos 
SET etapa_id = '161c5a65-eaae-4505-bc17-a57d37d0975d'
WHERE etapa_id IS NULL 
  AND etapa ILIKE 'No interesado';

-- PASO 3: Para prospectos sin etapa definida, asignar "Primer contacto" como default
-- ============================================
UPDATE prospectos 
SET etapa_id = '9832d031-f7ef-4596-a66e-f922daaa9772'  -- Primer contacto
WHERE etapa_id IS NULL 
  AND (etapa IS NULL OR etapa = '' OR etapa = 'null');

-- PASO 4: Verificación POST-migración
-- ============================================
SELECT 'DESPUÉS DE MIGRACIÓN' as status;
SELECT 
  COUNT(*) FILTER (WHERE etapa_id IS NOT NULL) as con_etapa_id,
  COUNT(*) FILTER (WHERE etapa_id IS NULL) as sin_etapa_id,
  COUNT(*) as total
FROM prospectos;

-- PASO 5: Conteo por etapa_id (verificar distribución)
-- ============================================
SELECT 
  e.nombre as etapa_nombre,
  e.codigo as etapa_codigo,
  COUNT(p.id) as total_prospectos
FROM etapas e
LEFT JOIN prospectos p ON e.id = p.etapa_id
WHERE e.is_active = true
GROUP BY e.id, e.nombre, e.codigo, e.orden_funnel
ORDER BY e.orden_funnel;

-- PASO 6: Prospectos que quedaron sin etapa_id (deberían ser 0)
-- ============================================
SELECT 
  etapa as etapa_legacy,
  COUNT(*) as total
FROM prospectos
WHERE etapa_id IS NULL
GROUP BY etapa
ORDER BY total DESC;

-- ============================================
-- DESPUÉS DE EJECUTAR:
-- 1. Verificar que "sin_etapa_id" = 0
-- 2. Hacer hard refresh del navegador (Cmd+Shift+R)
-- 3. El Kanban debería mostrar todos los prospectos correctamente
-- ============================================
