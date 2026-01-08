-- Script para agregar campo suggested_by a whatsapp_templates
-- Ejecutar en Supabase Dashboard > SQL Editor (proyecto: pqnc_ai)

-- Agregar columna suggested_by a whatsapp_templates
ALTER TABLE whatsapp_templates 
ADD COLUMN IF NOT EXISTS suggested_by UUID;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_suggested_by ON whatsapp_templates(suggested_by);

-- Comentario
COMMENT ON COLUMN whatsapp_templates.suggested_by IS 'ID del usuario que sugirió esta plantilla (si fue creada desde una sugerencia)';

