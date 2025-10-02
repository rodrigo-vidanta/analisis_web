#!/usr/bin/env node

/**
 * Crear tablas UChat directamente usando service_role
 */

import { createClient } from '@supabase/supabase-js';

// Credenciales reales
const SUPABASE_URL = 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTUxMzU4NywiZXhwIjoyMDYxMDg5NTg3fQ.mTnTOpkXi19xu1l-cZKx_f5RbqSg6zzH8mGdBOY3MZg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🚀 Creando tablas UChat con service_role...');

async function createTables() {
  try {
    console.log('\n🔧 Ejecutando SQL para crear tablas...');
    
    // Usar SQL directo con fetch
    const sqlQueries = [
      // Crear tabla de bots
      `CREATE TABLE IF NOT EXISTS uchat_bots (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        bot_name TEXT NOT NULL,
        api_key TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`,
      
      // Crear tabla de conversaciones
      `CREATE TABLE IF NOT EXISTS uchat_conversations (
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
        handoff_enabled BOOLEAN DEFAULT false,
        platform TEXT DEFAULT 'whatsapp',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );`,
      
      // Crear tabla de mensajes
      `CREATE TABLE IF NOT EXISTS uchat_messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        message_id TEXT UNIQUE NOT NULL,
        conversation_id UUID,
        sender_type TEXT NOT NULL,
        sender_name TEXT,
        content TEXT,
        message_type TEXT DEFAULT 'text',
        media_url TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`,
      
      // Deshabilitar RLS
      `ALTER TABLE uchat_bots DISABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE uchat_conversations DISABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE uchat_messages DISABLE ROW LEVEL SECURITY;`
    ];

    // Ejecutar cada query individualmente
    for (const query of sqlQueries) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({ query })
        });

        if (response.ok) {
          console.log('✅ Query ejecutada exitosamente');
        } else {
          const errorText = await response.text();
          console.log(`⚠️ Query falló: ${errorText}`);
        }
      } catch (error) {
        console.log(`⚠️ Error en query: ${error.message}`);
      }
    }

    // Verificar que las tablas se crearon
    console.log('\n🔍 Verificando tablas creadas...');
    
    try {
      // Intentar insertar bot
      const { data: botData, error: botError } = await supabase
        .from('uchat_bots')
        .insert({
          bot_name: 'Bot Principal WhatsApp',
          api_key: 'hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5'
        })
        .select()
        .single();

      if (botError) {
        if (botError.message.includes('duplicate') || botError.message.includes('already exists')) {
          console.log('✅ Bot ya existe');
          // Obtener bot existente
          const { data: existingBot } = await supabase
            .from('uchat_bots')
            .select('*')
            .eq('bot_name', 'Bot Principal WhatsApp')
            .single();
          console.log('✅ Bot encontrado:', existingBot?.bot_name);
        } else {
          console.error('❌ Error con tabla uchat_bots:', botError);
          return false;
        }
      } else {
        console.log('✅ Bot creado:', botData.bot_name);
      }

      // Verificar tabla de conversaciones
      const { data: testConv, error: convError } = await supabase
        .from('uchat_conversations')
        .select('*')
        .limit(1);

      if (convError) {
        console.error('❌ Error con tabla uchat_conversations:', convError);
        return false;
      }

      console.log('✅ Tabla uchat_conversations funcional');

      // Verificar tabla de mensajes
      const { data: testMsg, error: msgError } = await supabase
        .from('uchat_messages')
        .select('*')
        .limit(1);

      if (msgError) {
        console.error('❌ Error con tabla uchat_messages:', msgError);
        return false;
      }

      console.log('✅ Tabla uchat_messages funcional');

    } catch (error) {
      console.error('❌ Error verificando tablas:', error);
      return false;
    }

    console.log('\n🎉 ¡Tablas UChat creadas exitosamente!');
    console.log('✨ Ahora el módulo Live Chat puede cargar conversaciones reales');
    console.log('🔗 Ve a: http://localhost:5174 → Live Chat');

    return true;

  } catch (error) {
    console.error('💥 Error general:', error);
    return false;
  }
}

// Ejecutar
createTables()
  .then(success => {
    if (success) {
      console.log('\n✅ Tablas creadas exitosamente');
      process.exit(0);
    } else {
      console.log('\n❌ Error creando tablas');
      process.exit(1);
    }
  });
