-- Script para crear la tabla whatsapp_template_suggestions en la base de datos PQNC AI
-- Ejecutar en Supabase Dashboard > SQL Editor (proyecto: pqnc_ai)

-- Crear tabla whatsapp_template_suggestions si no existe
CREATE TABLE IF NOT EXISTS whatsapp_template_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Información básica de la sugerencia
  name VARCHAR(255) NOT NULL,
  template_text TEXT NOT NULL,
  justification TEXT NOT NULL,
  
  -- Metadatos de creación
  suggested_by UUID NOT NULL, -- ID del usuario que sugiere
  conversation_id UUID, -- ID de la conversación donde se sugirió (opcional)
  suggested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Estado de la sugerencia
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by UUID, -- ID del administrador que revisó
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT, -- Razón si fue rechazada
  
  -- Relación con plantilla aprobada (si se importa)
  imported_to_template_id UUID, -- ID de la plantilla creada desde esta sugerencia
  
  -- Variables básicas que el usuario puede usar
  -- Se almacenan como JSONB para flexibilidad
  available_variables JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_whatsapp_template_suggestions_status ON whatsapp_template_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_template_suggestions_suggested_by ON whatsapp_template_suggestions(suggested_by);
CREATE INDEX IF NOT EXISTS idx_whatsapp_template_suggestions_conversation_id ON whatsapp_template_suggestions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_template_suggestions_suggested_at ON whatsapp_template_suggestions(suggested_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_template_suggestions_imported_to_template_id ON whatsapp_template_suggestions(imported_to_template_id);

-- Comentarios en la tabla
COMMENT ON TABLE whatsapp_template_suggestions IS 'Sugerencias de plantillas de WhatsApp realizadas por ejecutivos, coordinadores y supervisores';
COMMENT ON COLUMN whatsapp_template_suggestions.status IS 'Estado de la sugerencia: PENDING, APPROVED, REJECTED';
COMMENT ON COLUMN whatsapp_template_suggestions.imported_to_template_id IS 'ID de la plantilla creada desde esta sugerencia (si fue importada)';
COMMENT ON COLUMN whatsapp_template_suggestions.available_variables IS 'Variables disponibles que el usuario puede usar: título, primer_nombre, primer_apellido, ejecutivo_nombre, fecha_actual';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_whatsapp_template_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_whatsapp_template_suggestions_updated_at
  BEFORE UPDATE ON whatsapp_template_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_template_suggestions_updated_at();

-- Función para sincronizar estado cuando se aprueba/rechaza una plantilla relacionada
-- Esta función se ejecutará cuando cambie el estado de una plantilla en whatsapp_templates
CREATE OR REPLACE FUNCTION sync_template_suggestion_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la plantilla fue aprobada y tiene una sugerencia relacionada, aprobar la sugerencia
  IF NEW.status = 'APPROVED' AND OLD.status != 'APPROVED' THEN
    UPDATE whatsapp_template_suggestions
    SET 
      status = 'APPROVED',
      reviewed_by = NEW.created_by, -- Usar created_by como reviewed_by por defecto
      reviewed_at = NOW()
    WHERE imported_to_template_id = NEW.id AND status = 'PENDING';
  END IF;
  
  -- Si la plantilla fue rechazada y tiene una sugerencia relacionada, rechazar la sugerencia
  IF NEW.status = 'REJECTED' AND OLD.status != 'REJECTED' THEN
    UPDATE whatsapp_template_suggestions
    SET 
      status = 'REJECTED',
      reviewed_by = NEW.created_by,
      reviewed_at = NOW(),
      rejection_reason = COALESCE(NEW.rejection_reason, 'Plantilla rechazada')
    WHERE imported_to_template_id = NEW.id AND status = 'PENDING';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger en whatsapp_templates para sincronizar con sugerencias
CREATE TRIGGER trigger_sync_template_suggestion_status
  AFTER UPDATE OF status ON whatsapp_templates
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_template_suggestion_status();

