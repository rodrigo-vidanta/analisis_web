-- ============================================
-- AGREGAR COLUMNA ETAPAS (MÚLTIPLES) A WHATSAPP_AUDIENCES
-- ============================================
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Proyecto: pqnc_ai (glsmifhkoaifvaegsozd)
-- Fecha: 2026-01-08
-- ============================================
-- 
-- Este script agrega la columna 'etapas' como array
-- para permitir selección múltiple de etapas en audiencias
-- ============================================

-- Agregar columna etapas (array de strings)
ALTER TABLE whatsapp_audiences 
ADD COLUMN IF NOT EXISTS etapas VARCHAR(50)[] DEFAULT '{}';

-- Crear índice GIN para búsquedas rápidas con arrays
CREATE INDEX IF NOT EXISTS idx_whatsapp_audiences_etapas ON whatsapp_audiences USING GIN (etapas);

-- Comentario de documentación
COMMENT ON COLUMN whatsapp_audiences.etapas IS 'Array de etapas del prospecto (prospectos.etapa) - Permite selección múltiple';

-- ============================================
-- MIGRAR DATOS EXISTENTES (etapa singular → etapas array)
-- ============================================
-- Solo migra si etapa tiene valor y etapas está vacío
UPDATE whatsapp_audiences
SET etapas = ARRAY[etapa]
WHERE etapa IS NOT NULL 
  AND etapa != '' 
  AND (etapas IS NULL OR etapas = '{}');

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Verificar que la columna se agregó correctamente:
-- SELECT id, nombre, etapa, etapas 
-- FROM whatsapp_audiences 
-- LIMIT 10;

