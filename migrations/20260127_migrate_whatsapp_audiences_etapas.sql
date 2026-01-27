-- ============================================
-- MIGRACIÓN: WhatsApp Audiences - Etapas FK
-- ============================================
-- Fecha: 27 de Enero 2026
-- Propósito: Migrar tabla whatsapp_audiences de etapa string a etapa_id FK
-- Proyecto: pqnc_ai (glsmifhkoaifvaegsozd)
-- ============================================

-- Paso 1: Agregar nuevas columnas
ALTER TABLE whatsapp_audiences 
ADD COLUMN IF NOT EXISTS etapa_id UUID REFERENCES etapas(id);

ALTER TABLE whatsapp_audiences 
ADD COLUMN IF NOT EXISTS etapa_ids UUID[];

-- Paso 2: Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_audiences_etapa_id ON whatsapp_audiences(etapa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_audiences_etapa_ids ON whatsapp_audiences USING GIN(etapa_ids);

-- Paso 3: Migrar datos existentes de etapa singular
-- Mapea el string a UUID consultando la tabla etapas
UPDATE whatsapp_audiences 
SET etapa_id = (
  SELECT e.id 
  FROM etapas e 
  WHERE e.nombre = whatsapp_audiences.etapa 
     OR e.codigo = whatsapp_audiences.etapa
  LIMIT 1
)
WHERE etapa IS NOT NULL 
  AND etapa_id IS NULL;

-- Paso 4: Migrar datos existentes de etapas array
-- Convierte el array de strings a array de UUIDs
UPDATE whatsapp_audiences 
SET etapa_ids = (
  SELECT ARRAY_AGG(e.id ORDER BY e.orden)
  FROM etapas e
  WHERE e.nombre = ANY(whatsapp_audiences.etapas)
     OR e.codigo = ANY(whatsapp_audiences.etapas)
)
WHERE etapas IS NOT NULL 
  AND array_length(etapas, 1) > 0
  AND etapa_ids IS NULL;

-- Paso 5: Fallback - Si etapa_ids está vacío pero etapa_id tiene valor, crear array
UPDATE whatsapp_audiences
SET etapa_ids = ARRAY[etapa_id]
WHERE etapa_id IS NOT NULL
  AND (etapa_ids IS NULL OR array_length(etapa_ids, 1) IS NULL);

-- Paso 6: Comentarios de documentación
COMMENT ON COLUMN whatsapp_audiences.etapa_id IS 'FK a tabla etapas - etapa singular (legacy)';
COMMENT ON COLUMN whatsapp_audiences.etapa_ids IS 'Array de FKs a tabla etapas - múltiples etapas seleccionables';
COMMENT ON COLUMN whatsapp_audiences.etapa IS 'DEPRECADO - Campo legacy de etapa string (mantener para compatibilidad)';
COMMENT ON COLUMN whatsapp_audiences.etapas IS 'DEPRECADO - Campo legacy de etapas array string (mantener para compatibilidad)';

-- Paso 7: Verificar migración
SELECT 
  id,
  nombre,
  etapa as etapa_legacy,
  etapa_id,
  etapa_ids,
  (SELECT nombre FROM etapas WHERE id = etapa_id) as etapa_nombre_actual,
  (SELECT ARRAY_AGG(nombre ORDER BY orden) 
   FROM etapas 
   WHERE id = ANY(etapa_ids)) as etapas_nombres_actuales
FROM whatsapp_audiences
WHERE is_active = true
ORDER BY created_at DESC;

-- ============================================
-- ROLLBACK (Solo ejecutar si hay problemas)
-- ============================================
-- DROP INDEX IF EXISTS idx_whatsapp_audiences_etapa_id;
-- DROP INDEX IF EXISTS idx_whatsapp_audiences_etapa_ids;
-- ALTER TABLE whatsapp_audiences DROP COLUMN IF EXISTS etapa_id;
-- ALTER TABLE whatsapp_audiences DROP COLUMN IF EXISTS etapa_ids;

