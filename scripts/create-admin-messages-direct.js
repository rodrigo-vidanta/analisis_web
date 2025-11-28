/**
 * Script para crear la tabla admin_messages en System UI usando HTTP directo
 * Ejecuta el SQL del archivo create_admin_messages_table.sql
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://zbylezfyagwrxoecioup.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

// Leer el SQL del archivo
const SQL_FILE = join(__dirname, 'sql', 'create_admin_messages_table.sql');
const SQL = readFileSync(SQL_FILE, 'utf-8');

async function createTable() {
  try {
    console.log('🔄 Creando tabla admin_messages en System UI...');
    console.log('📋 Usando credenciales del proyecto...\n');
    
    // Nota: PostgREST no puede ejecutar DDL directamente
    // Necesitamos usar el SQL Editor de Supabase o una función RPC especial
    console.log('⚠️  PostgREST no puede ejecutar DDL (CREATE TABLE) directamente.');
    console.log('📋 Por favor ejecuta el SQL manualmente en el dashboard de Supabase:\n');
    console.log('   🔗 https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/sql\n');
    console.log('📄 SQL a ejecutar:\n');
    console.log('─'.repeat(80));
    console.log(SQL);
    console.log('─'.repeat(80));
    console.log('\n✅ Después de ejecutar el SQL, las funciones de mensajería funcionarán correctamente.');
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📋 Por favor ejecuta el SQL manualmente en el dashboard de Supabase:');
    console.log('   https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/sql');
    console.log('\nSQL a ejecutar:');
    console.log(SQL);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createTable();
}

export { createTable, SQL };

