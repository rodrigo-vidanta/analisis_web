#!/usr/bin/env node

/**
 * Crear tablas UChat usando PostgreSQL directo
 */

import { createClient } from '@supabase/supabase-js';

// Credenciales reales
const SUPABASE_URL = 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTUxMzU4NywiZXhwIjoyMDYxMDg5NTg3fQ.mTnTOpkXi19xu1l-cZKx_f5RbqSg6zzH8mGdBOY3MZg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🚀 Creando tablas UChat usando service_role...');

async function createTablesWithServiceRole() {
  try {
    console.log('\n🔧 Creando tablas usando PostgreSQL directo...');
    
    // Usar el endpoint de PostgreSQL directo
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS uchat_bots (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        bot_name TEXT NOT NULL,
        api_key TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

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
        handoff_enabled BOOLEAN DEFAULT false,
        platform TEXT DEFAULT 'whatsapp',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS uchat_messages (
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
      );

      ALTER TABLE uchat_bots DISABLE ROW LEVEL SECURITY;
      ALTER TABLE uchat_conversations DISABLE ROW LEVEL SECURITY;
      ALTER TABLE uchat_messages DISABLE ROW LEVEL SECURITY;
    `;

    // Usar el endpoint directo de PostgreSQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: createTableSQL })
    });

    if (response.ok) {
      console.log('✅ Tablas creadas exitosamente');
    } else {
      const errorText = await response.text();
      console.log('⚠️ SQL directo no funcionó:', errorText);
      console.log('\n📋 EJECUTA ESTE SQL MANUALMENTE EN SUPABASE:');
      console.log('🔗 https://hmmfuhqgvsehkizlfzga.supabase.co → SQL Editor');
      console.log('\n' + createTableSQL);
      return false;
    }

    // Verificar creando el bot
    console.log('\n🤖 Creando bot inicial...');
    
    const { data: botData, error: botError } = await supabase
      .from('uchat_bots')
      .upsert({
        bot_name: 'Bot Principal WhatsApp',
        api_key: 'hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5'
      }, {
        onConflict: 'bot_name'
      })
      .select()
      .single();

    if (botError) {
      console.error('❌ Error creando bot:', botError);
      return false;
    }

    console.log('✅ Bot configurado:', botData.bot_name);

    console.log('\n🎉 ¡Tablas UChat creadas exitosamente!');
    console.log('✨ Ahora puedes sincronizar con la API real de UChat');
    console.log('🔗 Ve a: http://localhost:5174 → Live Chat');

    return true;

  } catch (error) {
    console.error('💥 Error:', error);
    return false;
  }
}

createTablesWithServiceRole()
  .then(success => {
    if (success) {
      console.log('\n✅ Configuración completada');
    } else {
      console.log('\n❌ Sigue las instrucciones manuales de arriba');
    }
    process.exit(success ? 0 : 1);
  });
