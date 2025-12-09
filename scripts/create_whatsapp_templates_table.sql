-- Script para crear la tabla whatsapp_templates en la base de datos PQNC
-- Ejecutar en Supabase Dashboard > SQL Editor

-- Crear tabla whatsapp_templates si no existe
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  language VARCHAR(10) NOT NULL DEFAULT 'es_MX',
  category VARCHAR(50) NOT NULL DEFAULT 'UTILITY',
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  uchat_synced BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_by UUID,
  variable_mappings JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_name ON whatsapp_templates(name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON whatsapp_templates(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_is_active ON whatsapp_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_category ON whatsapp_templates(category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_language ON whatsapp_templates(language);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_created_at ON whatsapp_templates(created_at DESC);

-- Comentarios en la tabla
COMMENT ON TABLE whatsapp_templates IS 'Plantillas de mensajes de WhatsApp para uChat';
COMMENT ON COLUMN whatsapp_templates.variable_mappings IS 'Mapeo de variables {{1}}, {{2}}, etc. a campos de tablas (prospectos, resorts, destinos, etc.)';

