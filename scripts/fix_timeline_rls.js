// ============================================
// SCRIPT PARA DESHABILITAR RLS EN TIMELINE_ACTIVITIES
// Base de datos: system_ui (zbylezfyagwrxoecioup.supabase.co)
// ============================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Supabase System UI
const supabaseUrl = 'https://zbylezfyagwrxoecioup.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function disableRLS() {
  try {
    console.log('🚀 Deshabilitando RLS en timeline_activities...\n');

    // SQL para deshabilitar RLS
    const sql = `
      -- Deshabilitar RLS
      ALTER TABLE timeline_activities DISABLE ROW LEVEL SECURITY;

      -- Eliminar políticas existentes
      DROP POLICY IF EXISTS "Users can view own activities" ON timeline_activities;
      DROP POLICY IF EXISTS "Users can insert own activities" ON timeline_activities;
      DROP POLICY IF EXISTS "Users can update own activities" ON timeline_activities;
      DROP POLICY IF EXISTS "Users can delete own activities" ON timeline_activities;
    `;

    // Intentar ejecutar usando rpc si existe
    console.log('📝 Intentando ejecutar SQL...');
    
    // Dividir en comandos individuales
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--'));

    for (const command of commands) {
      if (command) {
        console.log(`   Ejecutando: ${command.substring(0, 60)}...`);
        
        // Intentar ejecutar usando una función RPC genérica si existe
        const { error } = await supabase.rpc('exec_sql', { sql: command });
        
        if (error) {
          console.warn(`   ⚠️  No se pudo ejecutar automáticamente: ${error.message}`);
          console.log(`   📋 Comando para ejecutar manualmente:`);
          console.log(`   ${command};\n`);
        } else {
          console.log(`   ✅ Ejecutado correctamente\n`);
        }
      }
    }

    console.log('\n✅ Proceso completado');
    console.log('\n📋 Si algunos comandos no se ejecutaron automáticamente,');
    console.log('   copia y pega los comandos SQL mostrados arriba en el');
    console.log('   SQL Editor de Supabase:');
    console.log('   https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/sql/new\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Ejecuta este SQL manualmente en Supabase:');
    console.log('\n' + sql + '\n');
  }
}

// Ejecutar
disableRLS();

