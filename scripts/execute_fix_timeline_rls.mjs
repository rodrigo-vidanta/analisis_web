// ============================================
// EJECUTAR SQL PARA DESHABILITAR RLS
// Base de datos: system_ui
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbylezfyagwrxoecioup.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQL() {
  try {
    console.log('🚀 Ejecutando SQL para deshabilitar RLS...\n');

    // SQL para deshabilitar RLS
    const sqlCommands = [
      'ALTER TABLE timeline_activities DISABLE ROW LEVEL SECURITY;',
      'DROP POLICY IF EXISTS "Users can view own activities" ON timeline_activities;',
      'DROP POLICY IF EXISTS "Users can insert own activities" ON timeline_activities;',
      'DROP POLICY IF EXISTS "Users can update own activities" ON timeline_activities;',
      'DROP POLICY IF EXISTS "Users can delete own activities" ON timeline_activities;'
    ];

    // Intentar ejecutar cada comando usando rpc si existe una función genérica
    for (const sql of sqlCommands) {
      console.log(`📝 Ejecutando: ${sql.substring(0, 60)}...`);
      
      // Intentar con diferentes métodos
      let success = false;
      
      // Método 1: Intentar con rpc exec_sql si existe
      const { error: rpcError } = await supabase.rpc('exec_sql', { query: sql });
      if (!rpcError) {
        console.log('   ✅ Ejecutado con exec_sql\n');
        success = true;
        continue;
      }
      
      // Método 2: Intentar con rpc execute_sql si existe
      const { error: execError } = await supabase.rpc('execute_sql', { sql });
      if (!execError) {
        console.log('   ✅ Ejecutado con execute_sql\n');
        success = true;
        continue;
      }
      
      // Método 3: Usar fetch directo a la API REST de Supabase
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ query: sql })
        });
        
        if (response.ok) {
          console.log('   ✅ Ejecutado con API REST\n');
          success = true;
          continue;
        }
      } catch (fetchError) {
        // Continuar al siguiente método
      }
      
      if (!success) {
        console.log(`   ⚠️  No se pudo ejecutar automáticamente`);
        console.log(`   📋 Ejecuta manualmente: ${sql}\n`);
      }
    }

    // Verificar estado final
    console.log('🔍 Verificando estado de RLS...');
    const { data, error } = await supabase
      .from('timeline_activities')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42501') {
      console.log('   ⚠️  RLS aún está habilitado. Ejecuta el SQL manualmente en Supabase Dashboard.');
    } else if (error) {
      console.log(`   ⚠️  Error verificando: ${error.message}`);
    } else {
      console.log('   ✅ RLS deshabilitado correctamente (o la tabla no existe aún)');
    }

    console.log('\n✅ Proceso completado');
    console.log('\n📋 Si algunos comandos no se ejecutaron, cópialos y ejecútalos en:');
    console.log('   https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/sql/new\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Ejecuta este SQL manualmente en Supabase Dashboard:\n');
    console.log('ALTER TABLE timeline_activities DISABLE ROW LEVEL SECURITY;');
    console.log('DROP POLICY IF EXISTS "Users can view own activities" ON timeline_activities;');
    console.log('DROP POLICY IF EXISTS "Users can insert own activities" ON timeline_activities;');
    console.log('DROP POLICY IF EXISTS "Users can update own activities" ON timeline_activities;');
    console.log('DROP POLICY IF EXISTS "Users can delete own activities" ON timeline_activities;\n');
  }
}

executeSQL();

