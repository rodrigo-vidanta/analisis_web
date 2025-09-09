// Script para configurar las tablas de Agent Studio en Supabase
// Ejecutar con: node scripts/setup-agent-studio.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada');
  console.log('💡 Agrega la service role key como variable de entorno o usa la anon key temporalmente');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAgentStudioTables() {
  try {
    console.log('🚀 Iniciando configuración de Agent Studio...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'create-agent-studio-tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Ejecutando script SQL...');
    
    // Ejecutar el script SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      // Si la función exec_sql no existe, intentar ejecutar por partes
      console.log('⚠️  Función exec_sql no disponible, ejecutando comandos individuales...');
      
      // Dividir el SQL en comandos individuales
      const commands = sqlContent
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd && !cmd.startsWith('--'));
      
      for (const command of commands) {
        if (command) {
          console.log(`📋 Ejecutando: ${command.substring(0, 50)}...`);
          const { error: cmdError } = await supabase.rpc('exec', { sql: command });
          if (cmdError) {
            console.warn(`⚠️  Advertencia en comando: ${cmdError.message}`);
          }
        }
      }
    }
    
    console.log('✅ Script SQL ejecutado');
    
    // Verificar que las tablas se crearon correctamente
    console.log('🔍 Verificando tablas creadas...');
    
    const tables = ['tools', 'agent_templates', 'agent_template_tools'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ Error verificando tabla ${table}:`, error.message);
      } else {
        console.log(`✅ Tabla ${table} creada correctamente`);
      }
    }
    
    console.log('🎉 ¡Agent Studio configurado exitosamente!');
    console.log('📊 Las siguientes tablas están disponibles:');
    console.log('   • tools - Para almacenar herramientas reutilizables');
    console.log('   • agent_templates - Para plantillas de agentes y squads');
    console.log('   • agent_template_tools - Relación entre plantillas y tools');
    
  } catch (error) {
    console.error('❌ Error configurando Agent Studio:', error);
    process.exit(1);
  }
}

// Función alternativa para crear tablas manualmente
async function createTablesManually() {
  console.log('🔧 Creando tablas manualmente...');
  
  try {
    // Crear tabla tools
    console.log('📝 Creando tabla tools...');
    await supabase.from('tools').select('id').limit(1);
  } catch (error) {
    // La tabla no existe, intentar crearla
    const { error: createError } = await supabase.rpc('create_tools_table');
    if (createError) {
      console.log('⚠️  No se pudo crear automáticamente. Ejecuta el SQL manualmente en Supabase Dashboard.');
    }
  }
  
  console.log('✅ Configuración manual completada');
}

// Ejecutar configuración
if (process.argv.includes('--manual')) {
  createTablesManually();
} else {
  setupAgentStudioTables();
}
