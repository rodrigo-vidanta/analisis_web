-- ============================================
-- VERIFICAR IMPORTACIÓN: ANDRES MARTINEZ
-- ============================================
-- Fecha importación: 2026-02-03 23:15:14
-- ID Dynamics: 8bce1871-d8fe-4414-b91e-374e72d3b2a7
-- Teléfono: 8332727818

-- 1. Buscar por ID Dynamics
SELECT 
  id,
  nombre_completo,
  whatsapp,
  telefono_principal,
  id_dynamics,
  ejecutivo_id,
  coordinacion_id,
  etapa,
  origen,
  created_at
FROM prospectos
WHERE id_dynamics = '8bce1871-d8fe-4414-b91e-374e72d3b2a7'
ORDER BY created_at DESC;

-- 2. Buscar por teléfono (normalizado a 10 dígitos)
SELECT 
  id,
  nombre_completo,
  whatsapp,
  telefono_principal,
  id_dynamics,
  ejecutivo_id,
  coordinacion_id,
  etapa,
  origen,
  created_at
FROM prospectos
WHERE whatsapp = '8332727818' 
   OR telefono_principal = '8332727818'
   OR whatsapp LIKE '%8332727818%'
   OR telefono_principal LIKE '%8332727818%'
ORDER BY created_at DESC;

-- 3. Buscar por nombre (aproximado)
SELECT 
  id,
  nombre_completo,
  whatsapp,
  telefono_principal,
  id_dynamics,
  ejecutivo_id,
  coordinacion_id,
  etapa,
  origen,
  created_at
FROM prospectos
WHERE nombre_completo ILIKE '%ANDRES%MARTINEZ%'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Buscar últimos prospectos creados (alrededor de 23:15 UTC)
SELECT 
  id,
  nombre_completo,
  whatsapp,
  telefono_principal,
  id_dynamics,
  ejecutivo_id,
  coordinacion_id,
  etapa,
  origen,
  created_at
FROM prospectos
WHERE created_at >= '2026-02-03 23:10:00'
  AND created_at <= '2026-02-03 23:20:00'
ORDER BY created_at DESC;

-- 5. Verificar conversación asociada (si existe)
SELECT 
  c.id as conversacion_id,
  c.prospecto_id,
  c.numero_prospecto,
  c.etiqueta,
  c.estado,
  c.started_at,
  p.nombre_completo
FROM conversaciones_whatsapp c
LEFT JOIN prospectos p ON p.id = c.prospecto_id
WHERE c.numero_prospecto = '8332727818'
   OR p.id_dynamics = '8bce1871-d8fe-4414-b91e-374e72d3b2a7'
ORDER BY c.started_at DESC;
