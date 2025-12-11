-- ============================================
-- AGREGAR COLUMNAS DESTINOS Y VIAJA_CON A WHATSAPP_AUDIENCES
-- ============================================
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Proyecto: pqnc_ai (glsmifhkoaifvaegsozd)
-- Fecha: 2025-01-XX
-- ============================================
-- 
-- Este script agrega las columnas 'destinos' y 'viaja_con' como arrays
-- para permitir múltiples selecciones en las audiencias de WhatsApp
-- ============================================

-- Agregar columna destinos (array de strings)
ALTER TABLE whatsapp_audiences 
ADD COLUMN IF NOT EXISTS destinos VARCHAR(50)[] DEFAULT '{}';

-- Agregar columna viaja_con (array de strings)
ALTER TABLE whatsapp_audiences 
ADD COLUMN IF NOT EXISTS viaja_con VARCHAR(30)[] DEFAULT '{}';

-- Crear índices para búsquedas rápidas con arrays
CREATE INDEX IF NOT EXISTS idx_whatsapp_audiences_destinos ON whatsapp_audiences USING GIN (destinos);
CREATE INDEX IF NOT EXISTS idx_whatsapp_audiences_viaja_con ON whatsapp_audiences USING GIN (viaja_con);

-- Comentarios de documentación
COMMENT ON COLUMN whatsapp_audiences.destinos IS 'Array de destinos preferidos (prospectos.destino_preferencia)';
COMMENT ON COLUMN whatsapp_audiences.viaja_con IS 'Array de tipos de viaje (prospectos.viaja_con): familia, pareja, solo, amigos, grupo';

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Verificar que las columnas se agregaron correctamente:
-- SELECT column_name, data_type, udt_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'whatsapp_audiences' 
-- ORDER BY ordinal_position;
