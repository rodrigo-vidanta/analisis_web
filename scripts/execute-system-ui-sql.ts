/**
 * Script para ejecutar SQL en System_UI
 * Ejecutar con: npx tsx scripts/execute-system-ui-sql.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SYSTEM_UI_URL = 'https://zbylezfyagwrxoecioup.supabase.co';
const SYSTEM_UI_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

const supabase = createClient(SYSTEM_UI_URL, SYSTEM_UI_SERVICE_KEY);

async function executeSQL() {
  try {
    console.log('📋 Leyendo script SQL...');
    const sqlPath = path.join(process.cwd(), 'scripts', 'sql', 'create_new_permissions_system_safe.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('⏳ Ejecutando script completo en System_UI...\n');
    
    // Ejecutar el SQL completo usando RPC exec_sql si existe
    // Si no existe, necesitaremos ejecutarlo manualmente en Supabase Dashboard
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    });
    
    if (error) {
      if (error.code === '42883') {
        console.log('⚠️  La función exec_sql no existe en System_UI.');
        console.log('📝 Debes ejecutar el script manualmente en Supabase Dashboard:\n');
        console.log('   1. Ve a: https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/sql/new');
        console.log('   2. Copia el contenido de: scripts/sql/create_new_permissions_system_safe.sql');
        console.log('   3. Pégalo en el SQL Editor');
        console.log('   4. Ejecuta el script\n');
        console.log('📄 Contenido del script:\n');
        console.log('─'.repeat(80));
        console.log(sql);
        console.log('─'.repeat(80));
      } else {
        console.error('❌ Error:', error.message);
        console.error('   Código:', error.code);
      }
    } else {
      console.log('✅ Script ejecutado correctamente');
      console.log('📊 Resultado:', data);
    }
  } catch (error: any) {
    console.error('❌ Error ejecutando script:', error.message);
  }
}

executeSQL();

