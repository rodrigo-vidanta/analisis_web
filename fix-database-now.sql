-- ============================================
-- SOLUCIÓN INMEDIATA - CREAR TABLAS UCHAT
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Crear tabla de bots (sin relaciones complejas)
CREATE TABLE IF NOT EXISTS uchat_bots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_name VARCHAR(255) NOT NULL,
  api_key VARCHAR(500) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla de conversaciones (simplificada)
CREATE TABLE IF NOT EXISTS uchat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id VARCHAR(255) UNIQUE NOT NULL,
  bot_id UUID,
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

-- 3. Crear tabla de mensajes
CREATE TABLE IF NOT EXISTS uchat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE NOT NULL,
  conversation_id UUID,
  sender_type VARCHAR(20) NOT NULL,
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

-- 4. Deshabilitar RLS para evitar problemas de permisos
ALTER TABLE uchat_bots DISABLE ROW LEVEL SECURITY;
ALTER TABLE uchat_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE uchat_messages DISABLE ROW LEVEL SECURITY;

-- 5. Insertar bot inicial
INSERT INTO uchat_bots (bot_name, api_key) 
VALUES ('Bot Principal WhatsApp', 'hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5')
ON CONFLICT (id) DO NOTHING;

-- 6. Obtener el ID del bot para las conversaciones
DO $$
DECLARE
    bot_uuid UUID;
BEGIN
    SELECT id INTO bot_uuid FROM uchat_bots WHERE bot_name = 'Bot Principal WhatsApp' LIMIT 1;
    
    -- Insertar conversaciones de prueba
    INSERT INTO uchat_conversations (
        conversation_id, bot_id, customer_phone, customer_name, 
        customer_email, status, message_count, priority, last_message_at
    ) VALUES 
    ('conv_001', bot_uuid, '+5213315127354', 'Juan Pérez', 'juan.perez@email.com', 'active', 3, 'high', NOW() - INTERVAL '5 minutes'),
    ('conv_002', bot_uuid, '+5213315127355', 'María González', 'maria.gonzalez@email.com', 'transferred', 5, 'medium', NOW() - INTERVAL '15 minutes'),
    ('conv_003', bot_uuid, '+5213315127356', 'Carlos Rodríguez', null, 'active', 1, 'low', NOW() - INTERVAL '30 minutes')
    ON CONFLICT (conversation_id) DO NOTHING;
    
END $$;

-- 7. Insertar mensajes de prueba
DO $$
DECLARE
    conv_uuid UUID;
BEGIN
    -- Mensajes para Juan Pérez
    SELECT id INTO conv_uuid FROM uchat_conversations WHERE conversation_id = 'conv_001' LIMIT 1;
    INSERT INTO uchat_messages (message_id, conversation_id, sender_type, sender_name, content, created_at) VALUES 
    ('msg_001', conv_uuid, 'customer', 'Juan Pérez', 'Hola, me interesa información sobre sus servicios', NOW() - INTERVAL '10 minutes'),
    ('msg_002', conv_uuid, 'bot', 'Bot', '¡Hola Juan! Gracias por contactarnos. Te conectaré con un agente especializado.', NOW() - INTERVAL '9 minutes'),
    ('msg_003', conv_uuid, 'customer', 'Juan Pérez', 'Perfecto, estaré esperando', NOW() - INTERVAL '5 minutes')
    ON CONFLICT (message_id) DO NOTHING;
    
    -- Mensajes para María González
    SELECT id INTO conv_uuid FROM uchat_conversations WHERE conversation_id = 'conv_002' LIMIT 1;
    INSERT INTO uchat_messages (message_id, conversation_id, sender_type, sender_name, content, created_at) VALUES 
    ('msg_004', conv_uuid, 'customer', 'María González', '¿Tienen disponibilidad para este fin de semana?', NOW() - INTERVAL '20 minutes'),
    ('msg_005', conv_uuid, 'agent', 'Agente Carlos', 'Hola María, sí tenemos disponibilidad. ¿Para cuántas personas?', NOW() - INTERVAL '15 minutes')
    ON CONFLICT (message_id) DO NOTHING;
    
    -- Mensaje para Carlos Rodríguez
    SELECT id INTO conv_uuid FROM uchat_conversations WHERE conversation_id = 'conv_003' LIMIT 1;
    INSERT INTO uchat_messages (message_id, conversation_id, sender_type, sender_name, content, created_at) VALUES 
    ('msg_006', conv_uuid, 'customer', 'Carlos Rodríguez', 'Buenos días, quisiera información sobre precios', NOW() - INTERVAL '35 minutes')
    ON CONFLICT (message_id) DO NOTHING;
    
END $$;

-- 8. Verificar que todo se creó correctamente
SELECT 'Tablas creadas:' as resultado;
SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'uchat_%';

SELECT 'Bots creados:' as resultado;
SELECT bot_name, is_active FROM uchat_bots;

SELECT 'Conversaciones creadas:' as resultado;
SELECT conversation_id, customer_name, status, message_count FROM uchat_conversations;

SELECT 'Mensajes creados:' as resultado;
SELECT COUNT(*) as total_mensajes FROM uchat_messages;
