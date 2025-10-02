#!/usr/bin/env node

/**
 * Script para crear tablas UChat usando inserts directos
 */

import { createClient } from '@supabase/supabase-js';

// Credenciales reales de la base PQNC
const SUPABASE_URL = 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTUxMzU4NywiZXhwIjoyMDYxMDg5NTg3fQ.mTnTOpkXi19xu1l-cZKx_f5RbqSg6zzH8mGdBOY3MZg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🚀 Creando tablas UChat directamente...');

async function createTablesDirectly() {
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

    // 2. Crear tablas usando SQL directo con fetch
    console.log('\n🔧 Creando tablas con SQL directo...');
    
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

      -- Deshabilitar RLS
      ALTER TABLE uchat_bots DISABLE ROW LEVEL SECURITY;
      ALTER TABLE uchat_conversations DISABLE ROW LEVEL SECURITY;
      ALTER TABLE uchat_messages DISABLE ROW LEVEL SECURITY;
    `;

    // Usar fetch directo para ejecutar SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ query: createTablesSQL })
    });

    if (!response.ok) {
      console.log('⚠️ SQL directo falló, intentando método alternativo...');
      
      // Método alternativo: crear tablas una por una
      console.log('\n🔄 Creando tablas individualmente...');
      
      // Intentar crear directamente usando el cliente
      try {
        // Crear bot de prueba primero para verificar que funciona
        const { data: botData, error: botError } = await supabase
          .from('uchat_bots')
          .insert({
            bot_name: 'Bot Principal WhatsApp',
            api_key: 'hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5'
          })
          .select()
          .single();

        if (botError && !botError.message.includes('already exists')) {
          console.error('❌ Las tablas no existen. Necesitas crearlas manualmente en Supabase SQL Editor');
          console.log('\n📋 Copia y pega este SQL en Supabase SQL Editor:');
          console.log('🔗 https://hmmfuhqgvsehkizlfzga.supabase.co');
          console.log('\n' + createTablesSQL);
          return false;
        }

        console.log('✅ Tablas ya existen o se crearon correctamente');
        
      } catch (error) {
        console.error('❌ Error creando tablas:', error);
        return false;
      }
    } else {
      console.log('✅ Tablas creadas con SQL directo');
    }

    // 3. Insertar datos de prueba
    console.log('\n📝 Insertando datos de prueba...');

    // Verificar si ya existe el bot
    const { data: existingBot } = await supabase
      .from('uchat_bots')
      .select('*')
      .eq('bot_name', 'Bot Principal WhatsApp')
      .single();

    let botData = existingBot;

    if (!existingBot) {
      const { data: newBot, error: botError } = await supabase
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
      botData = newBot;
    }

    console.log('✅ Bot configurado:', botData.bot_name);

    // Verificar conversaciones existentes
    const { data: existingConversations } = await supabase
      .from('uchat_conversations')
      .select('*');

    if (!existingConversations || existingConversations.length === 0) {
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
    } else {
      console.log(`✅ ${existingConversations.length} conversaciones ya existen`);
    }

    // 4. Verificación final
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
    console.log('\n📊 Conversaciones disponibles:');
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
createTablesDirectly()
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
