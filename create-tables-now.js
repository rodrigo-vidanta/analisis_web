// Script para crear tablas usando fetch directo
// Ejecutar con: node create-tables-now.js

const SUPABASE_URL = 'https://hmmfuhqgvsehkizlfzga.supabase.co';
// Necesitarás reemplazar esta key con la real de tu proyecto
const SUPABASE_ANON_KEY = 'tu_anon_key_aqui';

const sql = `
-- Crear tabla de bots
CREATE TABLE IF NOT EXISTS uchat_bots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_name VARCHAR(255) NOT NULL,
  api_key VARCHAR(500) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de conversaciones
CREATE TABLE IF NOT EXISTS uchat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id VARCHAR(255) UNIQUE NOT NULL,
  bot_id UUID REFERENCES uchat_bots(id),
  customer_phone VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  assigned_agent_id UUID,
  message_count INTEGER DEFAULT 0,
  priority VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar bot inicial
INSERT INTO uchat_bots (bot_name, api_key) 
VALUES ('Bot Principal WhatsApp', 'hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5')
ON CONFLICT DO NOTHING;

-- Insertar conversaciones de prueba
INSERT INTO uchat_conversations (conversation_id, bot_id, customer_phone, customer_name, status, message_count, priority)
SELECT 'conv_001', b.id, '+5213315127354', 'Juan Pérez', 'active', 3, 'high'
FROM uchat_bots b WHERE b.bot_name = 'Bot Principal WhatsApp'
ON CONFLICT DO NOTHING;

INSERT INTO uchat_conversations (conversation_id, bot_id, customer_phone, customer_name, status, message_count, priority)
SELECT 'conv_002', b.id, '+5213315127355', 'María González', 'transferred', 5, 'medium'
FROM uchat_bots b WHERE b.bot_name = 'Bot Principal WhatsApp'
ON CONFLICT DO NOTHING;
`;

async function createTables() {
  console.log('🚀 Creando tablas en Supabase...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (response.ok) {
      console.log('✅ Tablas creadas exitosamente');
      
      // Verificar que se crearon
      const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/uchat_conversations?select=count`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      
      if (checkResponse.ok) {
        console.log('✅ Verificación exitosa - Las tablas están funcionando');
      }
    } else {
      console.error('❌ Error creando tablas:', await response.text());
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTables();
