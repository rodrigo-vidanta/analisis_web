/**
 * Script para ejecutar actualización de ejecutivos a no operativos
 * Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
 * 
 * Ejecutar con: node scripts/execute-update-ejecutivos.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Credenciales System_UI
const SUPABASE_URL = 'https://zbylezfyagwrxoecioup.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Leer el archivo SQL
const sqlPath = join(__dirname, '../docs/sql/update_ejecutivos_no_operativos.sql');
const sql = readFileSync(sqlPath, 'utf-8');

/**
 * Validar estructura de la base de datos antes de ejecutar
 */
async function validateStructure() {
  console.log('🔍 Validando estructura de la base de datos...\n');

  // Verificar que existe la tabla auth_users
  const { data: usersTable, error: usersError } = await supabase
    .from('auth_users')
    .select('id')
    .limit(1);

  if (usersError) {
    console.error('❌ Error accediendo a auth_users:', usersError.message);
    return false;
  }
  console.log('✅ Tabla auth_users existe');

  // Verificar que existe la tabla auth_roles
  const { data: rolesTable, error: rolesError } = await supabase
    .from('auth_roles')
    .select('id, name')
    .eq('name', 'ejecutivo')
    .single();

  if (rolesError || !rolesTable) {
    console.error('❌ Error: Rol "ejecutivo" no encontrado');
    return false;
  }
  console.log('✅ Rol "ejecutivo" existe');

  // Verificar que existe la tabla coordinaciones
  const { data: calidadCoord, error: coordError } = await supabase
    .from('coordinaciones')
    .select('id, codigo')
    .eq('codigo', 'CALIDAD')
    .single();

  if (coordError || !calidadCoord) {
    console.warn('⚠️  Coordinación CALIDAD no encontrada (se creará si es necesario)');
  } else {
    console.log('✅ Coordinación CALIDAD existe');
  }

  // Verificar si existe el campo is_operativo
  const { data: checkColumn, error: columnError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'auth_users' 
        AND column_name = 'is_operativo'
      LIMIT 1;
    `
  });

  if (columnError) {
    console.log('⚠️  No se pudo verificar is_operativo (se creará si no existe)');
  } else {
    console.log('✅ Campo is_operativo existe o se creará automáticamente');
  }

  return true;
}

/**
 * Ejecutar el SQL usando diferentes métodos
 */
async function executeSQL() {
  console.log('\n🔄 Ejecutando script SQL...\n');

  try {
    // Método 1: Intentar con RPC exec_sql (ejecutar todo el SQL de una vez)
    console.log('📝 Intentando ejecutar con RPC exec_sql...');
    
    const methods = [
      { name: 'exec_sql con query', params: { query: sql } },
      { name: 'exec_sql con sql', params: { sql: sql } },
      { name: 'exec_sql con sql_query', params: { sql_query: sql } }
    ];

    let executed = false;
    let lastError = null;

    for (const method of methods) {
      try {
        console.log(`   Probando método: ${method.name}...`);
        const { data, error } = await supabase.rpc('exec_sql', method.params);

        if (!error) {
          console.log(`✅ SQL ejecutado exitosamente con ${method.name}`);
          if (data) {
            console.log('   Resultados:', JSON.stringify(data, null, 2));
          }
          executed = true;
          break;
        } else {
          lastError = error;
          console.log(`   ⚠️  ${method.name} falló:`, error.message);
        }
      } catch (err) {
        lastError = err;
        console.log(`   ⚠️  ${method.name} falló:`, err.message);
      }
    }

    if (!executed) {
      // Método alternativo: usar fetch directamente
      console.log('\n📝 Intentando con fetch directo...');
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ query: sql })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error ejecutando SQL:', errorText);
        throw new Error(`Error ejecutando SQL: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ SQL ejecutado exitosamente con fetch');
      if (result) {
        console.log('   Resultados:', JSON.stringify(result, null, 2));
      }
    }

    console.log('\n✅ Script ejecutado completamente');
    
    // Verificar resultados finales
    console.log('\n📊 Verificando resultados...');
    const { data: resultados, error: resultadosError } = await supabase
      .from('auth_users')
      .select(`
        id,
        email,
        full_name,
        is_operativo,
        role_id,
        coordinacion_id
      `);

    if (!resultadosError && resultados) {
      // Obtener roles y coordinaciones
      const { data: roles } = await supabase.from('auth_roles').select('id, name');
      const { data: coords } = await supabase.from('coordinaciones').select('id, codigo');

      const ejecutivos = resultados.filter(u => {
        const role = roles?.find(r => r.id === u.role_id);
        return role?.name === 'ejecutivo';
      });

      const noOperativos = ejecutivos.filter(u => u.is_operativo === false).length;
      const operativos = ejecutivos.filter(u => u.is_operativo === true).length;
      
      const calidadCoord = coords?.find(c => c.codigo === 'CALIDAD');
      const calidadOperativos = ejecutivos.filter(
        u => u.coordinacion_id === calidadCoord?.id && u.is_operativo === true
      ).length;

      console.log(`\n📈 Resumen:`);
      console.log(`   - Ejecutivos no operativos: ${noOperativos}`);
      console.log(`   - Ejecutivos operativos: ${operativos}`);
      console.log(`   - Ejecutivos CALIDAD operativos: ${calidadOperativos}`);
      console.log(`   - Total ejecutivos: ${ejecutivos.length}`);
    }

  } catch (error) {
    console.error('\n❌ Error ejecutando SQL:', error);
    console.log('\n📋 Si el script falla, ejecuta el SQL manualmente en:');
    console.log('   https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/sql');
    console.log('\nSQL a ejecutar:');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    throw error;
  }
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('🚀 Iniciando actualización de ejecutivos a no operativos\n');
    console.log('='.repeat(60));
    
    // Validar estructura
    const isValid = await validateStructure();
    if (!isValid) {
      console.error('\n❌ Validación fallida. Revisa los errores arriba.');
      process.exit(1);
    }

    // Ejecutar SQL
    await executeSQL();

    console.log('\n' + '='.repeat(60));
    console.log('✅ Proceso completado exitosamente');
  } catch (error) {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1])) {
  main();
}

export { main, validateStructure, executeSQL };
