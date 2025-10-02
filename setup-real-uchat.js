#!/usr/bin/env node

/**
 * Script para crear tablas UChat y sincronizar con API real
 */

import { createClient } from '@supabase/supabase-js';

// Credenciales reales de la base PQNC
const SUPABASE_URL = 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTUxMzU4NywiZXhwIjoyMDYxMDg5NTg3fQ.mTnTOpkXi19xu1l-cZKx_f5RbqSg6zzH8mGdBOY3MZg';

// API de UChat
const UCHAT_API_KEY = 'hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5';
const UCHAT_API_URL = 'https://www.uchat.com.au/api';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🚀 Configurando UChat con datos REALES...');

async function setupRealUChat() {
  try {
    // 1. Crear las tablas necesarias usando SQL directo
    console.log('\n🔧 Creando tablas en Supabase...');
    
    // Usar fetch directo para crear tablas
    const createTablesResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        query: `
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
            handoff_enabled BOOLEAN DEFAULT false,
            platform TEXT DEFAULT 'whatsapp',
            metadata JSONB DEFAULT '{}',
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
            message_type TEXT DEFAULT 'text',
            media_url TEXT,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          -- Deshabilitar RLS para evitar problemas de permisos
          ALTER TABLE uchat_bots DISABLE ROW LEVEL SECURITY;
          ALTER TABLE uchat_conversations DISABLE ROW LEVEL SECURITY;
          ALTER TABLE uchat_messages DISABLE ROW LEVEL SECURITY;
        `
      })
    });

    if (!createTablesResponse.ok) {
      console.log('⚠️ Método SQL directo no disponible, creando tablas manualmente...');
      
      // Método alternativo: crear bot directamente
      try {
        const { data: botData, error: botError } = await supabase
          .from('uchat_bots')
          .insert({
            bot_name: 'Bot Principal WhatsApp',
            api_key: UCHAT_API_KEY
          })
          .select()
          .single();

        if (botError && !botError.message.includes('already exists')) {
          console.error('❌ Las tablas no existen y no se pueden crear automáticamente');
          console.log('\n📋 EJECUTA ESTE SQL EN SUPABASE MANUALMENTE:');
          console.log('🔗 https://hmmfuhqgvsehkizlfzga.supabase.co → SQL Editor');
          console.log(`
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
  handoff_enabled BOOLEAN DEFAULT false,
  platform TEXT DEFAULT 'whatsapp',
  metadata JSONB DEFAULT '{}',
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
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
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
          `);
          return false;
        }
      } catch (error) {
        console.error('❌ Error creando tablas:', error);
        return false;
      }
    } else {
      console.log('✅ Tablas creadas con SQL directo');
    }

    // 2. Sincronizar con API real de UChat
    console.log('\n🔄 Sincronizando con API de UChat...');
    
    const uchatResponse = await fetch(`${UCHAT_API_URL}/conversations`, {
      headers: {
        'Authorization': `Bearer ${UCHAT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!uchatResponse.ok) {
      console.error('❌ Error conectando con UChat API:', uchatResponse.status, uchatResponse.statusText);
      console.log('⚠️ Verificar API key y documentación: https://www.uchat.com.au/api');
      return false;
    }

    const uchatData = await uchatResponse.json();
    console.log('✅ Datos obtenidos de UChat:', uchatData);

    // 3. Procesar y guardar conversaciones reales
    if (uchatData && uchatData.conversations) {
      console.log(`\n📱 Procesando ${uchatData.conversations.length} conversaciones reales...`);
      
      // Obtener bot ID
      const { data: botData } = await supabase
        .from('uchat_bots')
        .select('id')
        .eq('bot_name', 'Bot Principal WhatsApp')
        .single();

      for (const uchatConv of uchatData.conversations) {
        try {
          // Insertar conversación real
          const { error: convError } = await supabase
            .from('uchat_conversations')
            .insert({
              conversation_id: uchatConv.id,
              bot_id: botData?.id,
              customer_phone: uchatConv.contact?.phone || 'Sin teléfono',
              customer_name: uchatConv.contact?.name || 'Sin nombre',
              customer_email: uchatConv.contact?.email,
              status: uchatConv.status || 'active',
              message_count: uchatConv.message_count || 0,
              priority: 'medium',
              last_message_at: uchatConv.last_message_at || new Date().toISOString(),
              platform: 'whatsapp',
              metadata: uchatConv
            });

          if (convError && !convError.message.includes('duplicate')) {
            console.error('❌ Error insertando conversación:', convError);
          } else {
            console.log(`✅ Conversación sincronizada: ${uchatConv.contact?.name || uchatConv.id}`);
          }
        } catch (error) {
          console.error('❌ Error procesando conversación:', error);
        }
      }
    }

    // 4. Verificación final
    console.log('\n🔍 Verificación final...');
    
    const { data: finalConversations, error: finalError } = await supabase
      .from('uchat_conversations')
      .select('conversation_id, customer_name, customer_phone, status, message_count')
      .order('created_at', { ascending: false });

    if (finalError) {
      console.error('❌ Error en verificación final:', finalError);
      return false;
    }

    console.log('\n🎉 ¡Sincronización completada!');
    console.log(`📊 ${finalConversations.length} conversaciones disponibles:`);
    
    finalConversations.forEach((conv, index) => {
      console.log(`${index + 1}. ${conv.customer_name || 'Sin nombre'} (${conv.customer_phone}) - ${conv.status}`);
    });

    console.log('\n✨ Ve a Live Chat para ver tus conversaciones reales:');
    console.log('🔗 http://localhost:5174 → Live Chat → Actualizar');

    return true;

  } catch (error) {
    console.error('💥 Error general:', error);
    return false;
  }
}

// Ejecutar
setupRealUChat()
  .then(success => {
    if (success) {
      console.log('\n✅ Configuración real completada');
      process.exit(0);
    } else {
      console.log('\n❌ Configuración falló - Revisa los errores de arriba');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
