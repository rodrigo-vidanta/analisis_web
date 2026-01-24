#!/usr/bin/env node
/**
 * Script para ejecutar la migración usando Management API de Supabase
 */

import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_REF = 'glsmifhkoaifvaegsozd';
const ACCESS_TOKEN_PATH = join(__dirname, '..', '.supabase', 'access_token');

async function executeMigration() {
  console.log('🚀 Ejecutando migración: search_dashboard_conversations\n');
  
  try {
    // Leer access token
    const accessToken = readFileSync(ACCESS_TOKEN_PATH, 'utf-8').trim();
    console.log('✅ Access token leído');
    
    // Leer SQL v2 simple
    const sqlPath = join(__dirname, '..', 'migrations', '20260124_search_whatsapp_prospects_simple.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    console.log('✅ SQL leído (versión simple)\n');
    
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
    console.log('✅ Migración ejecutada exitosamente\n');
    
    // Probar la función
    console.log('🧪 Probando función con "Rosario"...');
    const testSQL = `SELECT * FROM search_whatsapp_prospects('Rosario', TRUE, 50);`;
    
    const testResponse = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: testSQL })
    });
    
    if (testResponse.ok) {
      const testResult = await testResponse.json();
      console.log(`✅ Función funciona: ${testResult.result?.length || 0} prospectos encontrados`);
      
      if (testResult.result && testResult.result.length > 0) {
        console.log('\n📋 Primer resultado:');
        const first = testResult.result[0];
        console.log(`   ID: ${first.id}`);
        console.log(`   Nombre: ${first.nombre_completo}`);
        console.log(`   Teléfono: ${first.whatsapp}`);
        console.log(`   Email: ${first.email}`);
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MIGRACIÓN COMPLETADA');
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

executeMigration();
