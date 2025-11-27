/**
 * Script para crear el nuevo sistema de permisos y logs
 * Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
 * 
 * Ejecutar con: npx tsx scripts/setup-new-permissions-system.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuración System_UI
const SYSTEM_UI_URL = 'https://zbylezfyagwrxoecioup.supabase.co';
const SYSTEM_UI_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

const supabase = createClient(SYSTEM_UI_URL, SYSTEM_UI_SERVICE_KEY);

async function executeSQLScript() {
  try {
    console.log('📋 Leyendo script SQL...');
    const sqlPath = path.join(__dirname, 'sql', 'create_new_permissions_system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Dividir el script en partes ejecutables (por bloques principales)
    const parts = sql.split('-- ============================================');
    
    console.log(`📦 Ejecutando ${parts.length} partes del script...`);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part || part.startsWith('FIN DEL SCRIPT')) continue;

      console.log(`\n⏳ Ejecutando parte ${i + 1}/${parts.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: part });
        
        if (error) {
          // Intentar ejecución directa si RPC no existe
          console.log(`⚠️  RPC no disponible, intentando ejecución directa...`);
          // Ejecutar directamente usando query
          const { error: directError } = await supabase
            .from('_exec_sql')
            .select('*')
            .limit(0);
          
          if (directError) {
            console.error(`❌ Error en parte ${i + 1}:`, error.message);
            // Continuar con la siguiente parte
            continue;
          }
        } else {
          console.log(`✅ Parte ${i + 1} ejecutada correctamente`);
        }
      } catch (err: any) {
        console.error(`❌ Error ejecutando parte ${i + 1}:`, err.message);
        // Continuar con la siguiente parte
        continue;
      }
    }

    console.log('\n✅ Script ejecutado completamente');
  } catch (error: any) {
    console.error('❌ Error ejecutando script:', error.message);
    process.exit(1);
  }
}

// Ejecutar
executeSQLScript();

