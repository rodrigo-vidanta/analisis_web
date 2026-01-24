#!/usr/bin/env node
import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_REF = 'glsmifhkoaifvaegsozd';
const ACCESS_TOKEN_PATH = join(__dirname, '..', '.supabase', 'access_token');
const MIGRATION_PATH = join(__dirname, '..', 'migrations', '20260124_search_dashboard_conversations_v3.sql');

async function deployFunction() {
  try {
    console.log('🔧 Desplegando función search_dashboard_conversations\n');
    
    // Leer token y migración
    const accessToken = readFileSync(ACCESS_TOKEN_PATH, 'utf-8').trim();
    const sql = readFileSync(MIGRATION_PATH, 'utf-8');
    
    console.log('📡 Enviando a Management API...');
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error HTTP:', response.status);
      console.error('   Respuesta:', JSON.stringify(result, null, 2));
      process.exit(1);
    }
    
    console.log('✅ Función desplegada exitosamente\n');
    
    // Probar la función
    console.log('🧪 Probando búsqueda de "Rosario"...');
    const testSQL = `
      SELECT 
        prospecto_id,
        nombre_contacto,
        numero_telefono,
        email
      FROM search_dashboard_conversations(
        'Rosario',
        NULL,
        TRUE,
        NULL,
        NULL,
        10
      );
    `;
    
    const testResponse = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: testSQL })
    });
    
    const testResult = await testResponse.json();
    
    if (testResult.result && testResult.result.length > 0) {
      console.log(`\n✅ Encontrados ${testResult.result.length} resultados:\n`);
      testResult.result.forEach((p, i) => {
        console.log(`   ${i+1}. ${p.nombre_contacto}`);
        console.log(`      ID: ${p.prospecto_id}`);
        console.log(`      Tel: ${p.numero_telefono}`);
        console.log(`      Email: ${p.email}\n`);
      });
      
      const found = testResult.result.find(p => p.prospecto_id === 'e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b');
      if (found) {
        console.log('🎉 ¡PROSPECTO ROSARIO ENCONTRADO!');
      } else {
        console.log('⚠️ Rosario no encontrado en resultados');
      }
    } else {
      console.log('\n⚠️ Sin resultados. Verificar datos en BD.');
    }
    
    console.log('\n✅ Deploy completado. Refresca la aplicación (F5)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ENOENT') {
      console.error('\n💡 Tip: Verifica que exista .supabase/access_token');
    }
    process.exit(1);
  }
}

deployFunction();
