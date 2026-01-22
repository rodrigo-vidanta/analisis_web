#!/usr/bin/env tsx
/**
 * Script para verificar y habilitar Realtime en Supabase
 * 
 * Verifica si las tablas necesarias tienen realtime habilitado
 * y proporciona instrucciones para habilitarlo si no está activo.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const TABLES_TO_CHECK = [
  'system_config',
  'llamadas_programadas',
];

log('\n🔍 Verificando estado de Realtime en Supabase...', 'cyan');
log('\n⚠️  IMPORTANTE: Este script solo muestra el SQL necesario.', 'yellow');
log('   Debes ejecutarlo manualmente en Supabase Dashboard.\n', 'yellow');

TABLES_TO_CHECK.forEach((table) => {
  log(`\n📋 Tabla: ${table}`, 'cyan');
  log('   SQL para habilitar:', 'yellow');
  log(`   ALTER PUBLICATION supabase_realtime ADD TABLE public.${table};`, 'green');
  
  log('\n   SQL para verificar:', 'yellow');
  log(`   SELECT schemaname, tablename, pubname`, 'green');
  log(`   FROM pg_publication_tables`, 'green');
  log(`   WHERE pubname = 'supabase_realtime'`, 'green');
  log(`   AND tablename = '${table}';`, 'green');
  
  log('\n   Si la consulta retorna una fila, realtime está habilitado ✅', 'green');
});

log('\n📝 Archivo SQL completo disponible en:', 'cyan');
log('   scripts/sql/enable_realtime_system_config.sql', 'green');

log('\n🔧 Pasos para habilitar:', 'cyan');
log('   1. Abre Supabase Dashboard', 'yellow');
log('   2. Ve a Database > Replication', 'yellow');
log('   3. O ejecuta el SQL en SQL Editor', 'yellow');
log('   4. Ejecuta el SQL mostrado arriba para cada tabla', 'yellow');
