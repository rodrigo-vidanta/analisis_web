-- ============================================
-- UCHAT LIVE CHAT SYSTEM TABLES - VERSIÓN SIMPLIFICADA
-- Ejecutar directamente en Supabase SQL Editor
-- ============================================

-- Tabla para configuración de chatbots
CREATE TABLE IF NOT EXISTS uchat_bots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_name VARCHAR(255) NOT NULL,
  bot_description TEXT,
  api_key VARCHAR(500) NOT NULL,
  api_url VARCHAR(500) DEFAULT 'https://www.uchat.com.au/api',
  is_active BOOLEAN DEFAULT true,
  bot_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para conversaciones de chat
CREATE TABLE IF NOT EXISTS uchat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id VARCHAR(255) UNIQUE NOT NULL,
  bot_id UUID REFERENCES uchat_bots(id) ON DELETE CASCADE,
  customer_phone VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  platform VARCHAR(50) DEFAULT 'whatsapp',
  status VARCHAR(50) DEFAULT 'active',
  assigned_agent_id UUID,
  assignment_date TIMESTAMP WITH TIME ZONE,
  handoff_enabled BOOLEAN DEFAULT false,
  handoff_triggered_at TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  priority VARCHAR(20) DEFAULT 'medium',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para mensajes del chat
CREATE TABLE IF NOT EXISTS uchat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE NOT NULL,
  conversation_id UUID REFERENCES uchat_conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'bot', 'agent')),
  sender_id VARCHAR(255),
  sender_name VARCHAR(255),
  message_type VARCHAR(50) DEFAULT 'text',
  content TEXT,
  media_url VARCHAR(500),
  media_type VARCHAR(100),
  media_size INTEGER,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar bot inicial
INSERT INTO uchat_bots (
  bot_name, 
  bot_description, 
  api_key, 
  bot_config
) VALUES (
  'Bot Principal WhatsApp',
  'Bot principal para atención de prospectos vía WhatsApp',
  'hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5',
  '{
    "auto_handoff": true,
    "handoff_trigger": "user_message",
    "supported_platforms": ["whatsapp"],
    "response_timeout": 30,
    "max_retries": 3
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- Crear algunos datos de prueba
INSERT INTO uchat_conversations (
  conversation_id,
  bot_id,
  customer_phone,
  customer_name,
  customer_email,
  status,
  message_count,
  priority
) VALUES 
(
  'conv_001',
  (SELECT id FROM uchat_bots WHERE bot_name = 'Bot Principal WhatsApp' LIMIT 1),
  '+5213315127354',
  'Juan Pérez',
  'juan.perez@email.com',
  'active',
  3,
  'high'
),
(
  'conv_002',
  (SELECT id FROM uchat_bots WHERE bot_name = 'Bot Principal WhatsApp' LIMIT 1),
  '+5213315127355',
  'María González',
  'maria.gonzalez@email.com',
  'transferred',
  5,
  'medium'
),
(
  'conv_003',
  (SELECT id FROM uchat_bots WHERE bot_name = 'Bot Principal WhatsApp' LIMIT 1),
  '+5213315127356',
  'Carlos Rodríguez',
  null,
  'active',
  1,
  'low'
) ON CONFLICT DO NOTHING;

-- Crear algunos mensajes de prueba
INSERT INTO uchat_messages (
  message_id,
  conversation_id,
  sender_type,
  sender_name,
  message_type,
  content
) VALUES 
(
  'msg_001',
  (SELECT id FROM uchat_conversations WHERE conversation_id = 'conv_001' LIMIT 1),
  'customer',
  'Juan Pérez',
  'text',
  'Hola, me interesa información sobre sus servicios'
),
(
  'msg_002',
  (SELECT id FROM uchat_conversations WHERE conversation_id = 'conv_001' LIMIT 1),
  'bot',
  'Bot',
  'text',
  '¡Hola Juan! Gracias por contactarnos. Te conectaré con un agente especializado.'
),
(
  'msg_003',
  (SELECT id FROM uchat_conversations WHERE conversation_id = 'conv_002' LIMIT 1),
  'customer',
  'María González',
  'text',
  '¿Tienen disponibilidad para este fin de semana?'
) ON CONFLICT DO NOTHING;
