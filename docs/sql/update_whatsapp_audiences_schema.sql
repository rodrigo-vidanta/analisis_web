-- ============================================
-- ACTUALIZAR ESQUEMA DE WHATSAPP_AUDIENCES
-- ============================================
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Proyecto: pqnc_ai (glsmifhkoaifvaegsozd)
-- URL: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql
-- Fecha: 2026-01-09
-- ============================================
-- 
-- Este script agrega las columnas faltantes para el módulo de Audiencias:
-- - etapas: Array de etapas del prospecto
-- - destinos: Array de destinos preferidos
-- - viaja_con: Array de tipos de viaje
-- - etiquetas: Array de etiquetas de WhatsApp
-- - dias_sin_contacto: Días desde último contacto
-- - tiene_email: Filtro de prospectos con email
-- - con_menores: Filtro de viaje con menores
-- ============================================

-- 1. Agregar columna ETAPAS (array de strings)
ALTER TABLE whatsapp_audiences 
ADD COLUMN IF NOT EXISTS etapas VARCHAR(50)[] DEFAULT '{}';

-- 2. Agregar columna DESTINOS (array de strings)
ALTER TABLE whatsapp_audiences 
ADD COLUMN IF NOT EXISTS destinos VARCHAR(50)[] DEFAULT '{}';

-- 3. Agregar columna VIAJA_CON (array de strings)
ALTER TABLE whatsapp_audiences 
ADD COLUMN IF NOT EXISTS viaja_con VARCHAR(30)[] DEFAULT '{}';

-- 4. Agregar columna ETIQUETAS (array de UUIDs)
ALTER TABLE whatsapp_audiences 
ADD COLUMN IF NOT EXISTS etiquetas UUID[] DEFAULT '{}';

-- 5. Agregar columna DIAS_SIN_CONTACTO (integer)
ALTER TABLE whatsapp_audiences 
ADD COLUMN IF NOT EXISTS dias_sin_contacto INTEGER DEFAULT NULL;

-- 6. Agregar columna TIENE_EMAIL (boolean)
ALTER TABLE whatsapp_audiences 
ADD COLUMN IF NOT EXISTS tiene_email BOOLEAN DEFAULT NULL;

-- 7. Agregar columna CON_MENORES (boolean)
ALTER TABLE whatsapp_audiences 
ADD COLUMN IF NOT EXISTS con_menores BOOLEAN DEFAULT NULL;

-- ============================================
-- CREAR ÍNDICES PARA BÚSQUEDAS RÁPIDAS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_whatsapp_audiences_etapas 
ON whatsapp_audiences USING GIN (etapas);

CREATE INDEX IF NOT EXISTS idx_whatsapp_audiences_destinos 
ON whatsapp_audiences USING GIN (destinos);

CREATE INDEX IF NOT EXISTS idx_whatsapp_audiences_viaja_con 
ON whatsapp_audiences USING GIN (viaja_con);

CREATE INDEX IF NOT EXISTS idx_whatsapp_audiences_etiquetas 
ON whatsapp_audiences USING GIN (etiquetas);

CREATE INDEX IF NOT EXISTS idx_whatsapp_audiences_dias_sin_contacto 
ON whatsapp_audiences (dias_sin_contacto) WHERE dias_sin_contacto IS NOT NULL;

-- ============================================
-- DOCUMENTACIÓN DE COLUMNAS
-- ============================================

COMMENT ON COLUMN whatsapp_audiences.etapas IS 'Array de etapas del prospecto (prospectos.etapa) - Permite selección múltiple';
COMMENT ON COLUMN whatsapp_audiences.destinos IS 'Array de destinos preferidos (prospectos.destino_preferencia)';
COMMENT ON COLUMN whatsapp_audiences.viaja_con IS 'Array de tipos de viaje (prospectos.viaja_con): familia, pareja, solo, amigos, grupo';
COMMENT ON COLUMN whatsapp_audiences.etiquetas IS 'Array de UUIDs de etiquetas de WhatsApp (whatsapp_labels_preset.id)';
COMMENT ON COLUMN whatsapp_audiences.dias_sin_contacto IS 'Mínimo de días desde último contacto del prospecto';
COMMENT ON COLUMN whatsapp_audiences.tiene_email IS 'true = solo con email, false = solo sin email, null = todos';
COMMENT ON COLUMN whatsapp_audiences.con_menores IS 'true = viaja con menores, false = sin menores, null = todos';

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
-- Ejecutar después para verificar que las columnas se agregaron:
SELECT column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'whatsapp_audiences' 
ORDER BY ordinal_position;

