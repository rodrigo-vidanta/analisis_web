#!/usr/bin/env node
/**
 * Ejecutar corrección de search_whatsapp_prospects
 */

import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_REF = 'glsmifhkoaifvaegsozd';
const ACCESS_TOKEN_PATH = join(__dirname, '..', '.supabase', 'access_token');

async function executeCorrection() {
  console.log('🔧 Ejecutando corrección de search_whatsapp_prospects\n');
  
  try {
    // Leer access token
    const accessToken = readFileSync(ACCESS_TOKEN_PATH, 'utf-8').trim();
    console.log('✅ Access token leído');
    
    // Leer SQL
    const sqlPath = join(__dirname, '..', 'migrations', '20260124_fix_search_whatsapp_prospects.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    console.log('✅ SQL leído\n');
    
    // Ejecutar via Management API
    console.log('📡 Ejecutando en Supabase...');
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', response.status, error);
      process.exit(1);
    }
    
    const result = await response.json();
    console.log('✅ Función corregida exitosamente\n');
    
    // Mostrar resultados de la prueba
    if (result.result && result.result.length > 0) {
      console.log('🎯 Resultados de búsqueda "Rosario":');
      console.log(`   Total encontrados: ${result.result.length}\n`);
      
      result.result.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.nombre_completo}`);
        console.log(`      ID: ${p.id}`);
        console.log(`      WhatsApp: ${p.whatsapp}`);
        console.log(`      Email: ${p.email || 'Sin email'}\n`);
      });
      
      // Verificar si está nuestro prospecto
      const target = result.result.find(p => p.id === 'e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b');
      if (target) {
        console.log('✅ ¡ENCONTRADO! El prospecto problemático ahora aparece en los resultados');
      } else {
        console.log('⚠️ El prospecto problemático NO apareció en la búsqueda');
      }
    } else {
      console.log('❌ No se encontraron resultados para "Rosario"');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ CORRECCIÓN COMPLETADA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Recargar módulo WhatsApp (F5)');
    console.log('   2. Buscar "Rosario"');
    console.log('   3. ✅ Debería aparecer instantáneamente\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

executeCorrection();
