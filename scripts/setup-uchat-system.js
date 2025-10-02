#!/usr/bin/env node

/**
 * Script para configurar el sistema de Live Chat con UChat
 * Ejecuta las tablas necesarias en la base de datos PQNC
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Supabase PQNC
const SUPABASE_URL = 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDY3MjY3NCwiZXhwIjoyMDUwMjQ4Njc0fQ.SERVICE_KEY_PLACEHOLDER';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🚀 Configurando sistema de Live Chat con UChat...');

async function setupUChatSystem() {
  try {
    // 1. Leer el archivo SQL de creación de tablas
    console.log('\n📄 Leyendo archivo SQL...');
    const sqlPath = path.join(__dirname, 'sql', 'create_uchat_tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // 2. Ejecutar el SQL
    console.log('\n🔧 Ejecutando creación de tablas...');
    const { data, error } = await supabase.rpc('exec_sql', { 
      query: sqlContent 
    });

    if (error) {
      console.error('❌ Error ejecutando SQL:', error);
      return false;
    }

    console.log('✅ Tablas creadas exitosamente');

    // 3. Verificar que las tablas se crearon correctamente
    console.log('\n🔍 Verificando tablas creadas...');
    
    const tables = [
      'uchat_bots',
      'uchat_conversations', 
      'uchat_messages',
      'uchat_agent_assignments',
      'uchat_handoff_rules',
      'uchat_metrics',
      'uchat_webhook_events'
    ];

    for (const table of tables) {
      const { data: tableData, error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (tableError) {
        console.error(`❌ Error verificando tabla ${table}:`, tableError);
      } else {
        console.log(`✅ Tabla ${table} verificada`);
      }
    }

    // 4. Verificar bot inicial
    console.log('\n🤖 Verificando bot inicial...');
    const { data: botData, error: botError } = await supabase
      .from('uchat_bots')
      .select('*')
      .eq('bot_name', 'Bot Principal WhatsApp')
      .single();

    if (botError && botError.code !== 'PGRST116') {
      console.error('❌ Error verificando bot inicial:', botError);
    } else if (botData) {
      console.log('✅ Bot inicial configurado:', {
        id: botData.id,
        name: botData.bot_name,
        active: botData.is_active
      });
    } else {
      console.log('⚠️ Bot inicial no encontrado, puede que ya exista o haya un problema');
    }

    // 5. Verificar regla de handoff
    console.log('\n🔄 Verificando regla de handoff...');
    const { data: ruleData, error: ruleError } = await supabase
      .from('uchat_handoff_rules')
      .select('*')
      .eq('rule_name', 'Handoff Automático por Mensaje de Usuario')
      .single();

    if (ruleError && ruleError.code !== 'PGRST116') {
      console.error('❌ Error verificando regla de handoff:', ruleError);
    } else if (ruleData) {
      console.log('✅ Regla de handoff configurada:', {
        id: ruleData.id,
        name: ruleData.rule_name,
        active: ruleData.is_active
      });
    } else {
      console.log('⚠️ Regla de handoff no encontrada');
    }

    console.log('\n🎉 Sistema de Live Chat configurado exitosamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Verificar que la API key de UChat sea correcta');
    console.log('2. Configurar webhooks en UChat para apuntar a tu aplicación');
    console.log('3. Probar el sistema enviando mensajes de prueba');
    console.log('4. Configurar permisos de usuarios para acceder al módulo');

    return true;

  } catch (error) {
    console.error('💥 Error configurando sistema:', error);
    return false;
  }
}

// Función para mostrar información del sistema
async function showSystemInfo() {
  console.log('\n📊 Información del sistema:');
  console.log('- Base de datos PQNC:', SUPABASE_URL);
  console.log('- Módulo: Live Chat con UChat');
  console.log('- API Key configurada: hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5');
  console.log('- Documentación API: https://www.uchat.com.au/api');
}

// Ejecutar configuración
async function main() {
  await showSystemInfo();
  const success = await setupUChatSystem();
  
  if (success) {
    console.log('\n✨ Configuración completada exitosamente');
    process.exit(0);
  } else {
    console.log('\n❌ Configuración falló');
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { setupUChatSystem };
