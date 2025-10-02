#!/usr/bin/env node

/**
 * Script para crear tablas UChat usando credenciales reales
 * Ejecuta directamente en la base de datos PQNC
 */

import { createClient } from '@supabase/supabase-js';

// Credenciales reales de la base PQNC
const SUPABASE_URL = 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTUxMzU4NywiZXhwIjoyMDYxMDg5NTg3fQ.mTnTOpkXi19xu1l-cZKx_f5RbqSg6zzH8mGdBOY3MZg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🚀 Creando tablas UChat en base PQNC...');

async function createUChatTables() {
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

    // 2. Verificar si las tablas ya existen
    console.log('\n🔍 Verificando tablas existentes...');
    const { data: existingTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', 'uchat_%');

    if (!tablesError && existingTables && existingTables.length > 0) {
      console.log('⚠️ Tablas UChat ya existen:', existingTables.map(t => t.table_name));
      
      // Verificar datos
      const { data: conversations, error: convError } = await supabase
        .from('uchat_conversations')
        .select('*')
        .limit(5);
      
      if (!convError && conversations) {
        console.log(`✅ ${conversations.length} conversaciones encontradas`);
        return true;
      }
    }

    // 3. Crear las tablas usando SQL directo
    console.log('\n🔧 Creando tablas...');
    
    const createTablesSQL = `
      -- Crear tabla de bots
      CREATE TABLE IF NOT EXISTS uchat_bots (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        bot_name TEXT NOT NULL,
        api_key TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Crear tabla de conversaciones
      CREATE TABLE IF NOT EXISTS uchat_conversations (
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
      CREATE TABLE IF NOT EXISTS uchat_messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        message_id TEXT UNIQUE NOT NULL,
        conversation_id UUID,
        sender_type TEXT NOT NULL,
        sender_name TEXT,
        content TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Deshabilitar RLS para evitar problemas
      ALTER TABLE uchat_bots DISABLE ROW LEVEL SECURITY;
      ALTER TABLE uchat_conversations DISABLE ROW LEVEL SECURITY;
      ALTER TABLE uchat_messages DISABLE ROW LEVEL SECURITY;
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { 
      query: createTablesSQL 
    });

    if (createError) {
      console.error('❌ Error creando tablas:', createError);
      return false;
    }

    console.log('✅ Tablas creadas exitosamente');

    // 4. Insertar datos de prueba
    console.log('\n📝 Insertando datos de prueba...');

    // Insertar bot
    const { data: botData, error: botError } = await supabase
      .from('uchat_bots')
      .insert({
        bot_name: 'Bot Principal WhatsApp',
        api_key: 'hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5'
      })
      .select()
      .single();

    if (botError) {
      console.error('❌ Error insertando bot:', botError);
      return false;
    }

    console.log('✅ Bot creado:', botData.bot_name);

    // Insertar conversaciones
    const conversationsData = [
      {
        conversation_id: 'conv_001',
        bot_id: botData.id,
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
        bot_id: botData.id,
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
        bot_id: botData.id,
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

    // Insertar mensajes de prueba
    const messagesData = [
      {
        message_id: 'msg_001',
        conversation_id: conversationsResult[0].id,
        sender_type: 'customer',
        sender_name: 'Juan Pérez',
        content: 'Hola, me interesa información sobre sus servicios'
      },
      {
        message_id: 'msg_002',
        conversation_id: conversationsResult[0].id,
        sender_type: 'bot',
        sender_name: 'Bot',
        content: '¡Hola Juan! Gracias por contactarnos. Te conectaré con un agente especializado.'
      },
      {
        message_id: 'msg_003',
        conversation_id: conversationsResult[1].id,
        sender_type: 'customer',
        sender_name: 'María González',
        content: '¿Tienen disponibilidad para este fin de semana?'
      }
    ];

    const { data: messagesResult, error: messagesError } = await supabase
      .from('uchat_messages')
      .insert(messagesData)
      .select();

    if (messagesError) {
      console.error('❌ Error insertando mensajes:', messagesError);
      return false;
    }

    console.log(`✅ ${messagesResult.length} mensajes creados`);

    // 5. Verificación final
    console.log('\n🔍 Verificación final...');
    
    const { data: finalCheck, error: finalError } = await supabase
      .from('uchat_conversations')
      .select(`
        conversation_id,
        customer_name,
        customer_phone,
        status,
        message_count,
        priority
      `)
      .order('created_at', { ascending: false });

    if (finalError) {
      console.error('❌ Error en verificación final:', finalError);
      return false;
    }

    console.log('\n🎉 ¡Sistema UChat configurado exitosamente!');
    console.log('\n📊 Conversaciones creadas:');
    finalCheck.forEach((conv, index) => {
      console.log(`${index + 1}. ${conv.customer_name} (${conv.customer_phone}) - ${conv.status} - ${conv.message_count} mensajes`);
    });

    console.log('\n✨ Ahora puedes ver las conversaciones en Live Chat!');
    console.log('🔗 Ve a: http://localhost:5174 → Live Chat → Actualizar');

    return true;

  } catch (error) {
    console.error('💥 Error general:', error);
    return false;
  }
}

// Ejecutar
createUChatTables()
  .then(success => {
    if (success) {
      console.log('\n✅ Configuración completada exitosamente');
      process.exit(0);
    } else {
      console.log('\n❌ Configuración falló');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
