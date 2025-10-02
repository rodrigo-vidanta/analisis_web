#!/usr/bin/env node

/**
 * Script simple para crear datos UChat
 */

import { createClient } from '@supabase/supabase-js';

// Credenciales reales de la base PQNC
const SUPABASE_URL = 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTUxMzU4NywiZXhwIjoyMDYxMDg5NTg3fQ.mTnTOpkXi19xu1l-cZKx_f5RbqSg6zzH8mGdBOY3MZg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🚀 Verificando y creando datos UChat...');

async function setupUChat() {
  try {
    // 1. Verificar conexión
    console.log('\n🔗 Verificando conexión...');
    const { data: testData, error: testError } = await supabase
      .from('auth_users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error de conexión:', testError);
      return false;
    }
    console.log('✅ Conexión exitosa');

    // 2. Verificar si las tablas existen intentando hacer una consulta
    console.log('\n🔍 Verificando tablas UChat...');
    
    const { data: existingConversations, error: checkError } = await supabase
      .from('uchat_conversations')
      .select('*')
      .limit(1);

    if (checkError) {
      if (checkError.code === 'PGRST106' || checkError.message.includes('does not exist')) {
        console.log('❌ Las tablas UChat NO existen');
        console.log('\n📋 NECESITAS CREAR LAS TABLAS MANUALMENTE:');
        console.log('🔗 Ve a: https://hmmfuhqgvsehkizlfzga.supabase.co');
        console.log('📝 Haz clic en "SQL Editor"');
        console.log('📋 Copia y pega este SQL:');
        console.log('\n' + `
-- Crear tabla de bots
CREATE TABLE uchat_bots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de conversaciones
CREATE TABLE uchat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT UNIQUE NOT NULL,
  bot_id UUID,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  status TEXT DEFAULT 'active',
  assigned_agent_id UUID,
  message_count INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'medium',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de mensajes
CREATE TABLE uchat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT UNIQUE NOT NULL,
  conversation_id UUID,
  sender_type TEXT NOT NULL,
  sender_name TEXT,
  content TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deshabilitar RLS
ALTER TABLE uchat_bots DISABLE ROW LEVEL SECURITY;
ALTER TABLE uchat_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE uchat_messages DISABLE ROW LEVEL SECURITY;

-- Insertar bot inicial
INSERT INTO uchat_bots (bot_name, api_key) VALUES 
('Bot Principal WhatsApp', 'hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5');

-- Insertar conversaciones de prueba
INSERT INTO uchat_conversations (conversation_id, customer_phone, customer_name, status, message_count, priority, last_message_at) VALUES 
('conv_001', '+5213315127354', 'Juan Pérez', 'active', 3, 'high', NOW() - INTERVAL '5 minutes'),
('conv_002', '+5213315127355', 'María González', 'transferred', 5, 'medium', NOW() - INTERVAL '15 minutes'),
('conv_003', '+5213315127356', 'Carlos Rodríguez', 'active', 1, 'low', NOW() - INTERVAL '30 minutes');
        `);
        console.log('\n🔄 Después de ejecutar el SQL, vuelve a ejecutar este script');
        return false;
      } else {
        console.error('❌ Error verificando tablas:', checkError);
        return false;
      }
    }

    console.log('✅ Las tablas UChat existen');

    // 3. Verificar datos
    if (existingConversations && existingConversations.length > 0) {
      console.log(`✅ ${existingConversations.length} conversaciones ya existen`);
      
      // Mostrar conversaciones existentes
      const { data: allConversations, error: allError } = await supabase
        .from('uchat_conversations')
        .select('conversation_id, customer_name, customer_phone, status, message_count, priority')
        .order('created_at', { ascending: false });

      if (!allError && allConversations) {
        console.log('\n📊 Conversaciones disponibles:');
        allConversations.forEach((conv, index) => {
          console.log(`${index + 1}. ${conv.customer_name || 'Sin nombre'} (${conv.customer_phone}) - ${conv.status} - ${conv.message_count} mensajes`);
        });
      }
    } else {
      console.log('⚠️ No hay conversaciones, creando datos de prueba...');
      
      // Buscar bot existente
      const { data: existingBot } = await supabase
        .from('uchat_bots')
        .select('*')
        .limit(1)
        .single();

      if (!existingBot) {
        console.log('❌ No hay bots configurados');
        return false;
      }

      // Crear conversaciones de prueba
      const conversationsData = [
        {
          conversation_id: 'conv_001',
          bot_id: existingBot.id,
          customer_phone: '+5213315127354',
          customer_name: 'Juan Pérez',
          customer_email: 'juan.perez@email.com',
          status: 'active',
          message_count: 3,
          priority: 'high',
          last_message_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        {
          conversation_id: 'conv_002',
          bot_id: existingBot.id,
          customer_phone: '+5213315127355',
          customer_name: 'María González',
          customer_email: 'maria.gonzalez@email.com',
          status: 'transferred',
          message_count: 5,
          priority: 'medium',
          last_message_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        },
        {
          conversation_id: 'conv_003',
          bot_id: existingBot.id,
          customer_phone: '+5213315127356',
          customer_name: 'Carlos Rodríguez',
          status: 'active',
          message_count: 1,
          priority: 'low',
          last_message_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        }
      ];

      const { data: conversationsResult, error: conversationsError } = await supabase
        .from('uchat_conversations')
        .insert(conversationsData)
        .select();

      if (conversationsError) {
        console.error('❌ Error insertando conversaciones:', conversationsError);
        return false;
      }

      console.log(`✅ ${conversationsResult.length} conversaciones creadas`);
    }

    console.log('\n🎉 ¡Sistema UChat listo!');
    console.log('✨ Ve a: http://localhost:5174 → Live Chat → Actualizar');
    console.log('📱 Deberías ver las conversaciones inmediatamente');

    return true;

  } catch (error) {
    console.error('💥 Error general:', error);
    return false;
  }
}

// Ejecutar
setupUChat()
  .then(success => {
    if (success) {
      console.log('\n✅ Configuración completada');
      process.exit(0);
    } else {
      console.log('\n❌ Configuración incompleta - Sigue las instrucciones de arriba');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
