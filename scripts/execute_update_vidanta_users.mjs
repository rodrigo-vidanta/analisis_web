#!/usr/bin/env node
/**
 * Script para ejecutar update_vidanta_users.sql usando REST API de Supabase
 * Usa el access token de .supabase/access_token
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ID = 'glsmifhkoaifvaegsozd';
const ACCESS_TOKEN = readFileSync(join(__dirname, '../.supabase/access_token'), 'utf-8').trim();
const API_URL = `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`;

async function executeSQL(sql, description) {
  console.log(`\n📝 ${description}`);
  console.log('⏳ Ejecutando...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: sql,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    console.log('✅ Ejecutado correctamente');
    if (data.data) {
      console.log(`📊 Filas afectadas: ${data.data.length || 0}`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('🚀 Iniciando actualización de usuarios Vidanta');
  console.log(`📦 Proyecto: ${PROJECT_ID}`);
  
  const sqlFile = readFileSync(join(__dirname, 'update_vidanta_users.sql'), 'utf-8');
  
  // Dividir el SQL en bloques (función + cada usuario)
  const functionSQL = sqlFile.split('-- ============================================')[1].split('-- ============================================')[0] + '-- ============================================\n';
  const updatesSQL = sqlFile.split('-- ACTUALIZACIONES DE USUARIOS')[1].split('-- ============================================\n-- VERIFICACIÓN')[0];
  const verificationSQL = sqlFile.split('-- VERIFICACIÓN FINAL')[1];

  try {
    // 1. Crear función auxiliar
    await executeSQL(functionSQL, 'Creando función auxiliar update_user_metadata_safe');

    // 2. Ejecutar actualizaciones (dividir por usuario)
    const userUpdates = updatesSQL.split('-- ');
    for (let i = 1; i < userUpdates.length; i++) {
      const updateBlock = '-- ' + userUpdates[i].trim();
      if (updateBlock.includes('DO $$')) {
        const emailMatch = updateBlock.match(/LOWER\('([^']+)'\)/);
        const email = emailMatch ? emailMatch[1] : `Usuario ${i}`;
        await executeSQL(updateBlock, `Actualizando ${email}`);
      }
    }

    // 3. Verificación final
    console.log('\n📋 Verificando actualizaciones...');
    const result = await executeSQL(verificationSQL, 'Consulta de verificación');
    
    if (result.data && result.data.length > 0) {
      console.log('\n✅ Usuarios actualizados:');
      console.table(result.data);
    } else {
      console.log('\n⚠️ No se encontraron usuarios (puede que no existan aún)');
    }

    console.log('\n✅ Proceso completado');
  } catch (error) {
    console.error('\n❌ Error en el proceso:', error.message);
    process.exit(1);
  }
}

main();
