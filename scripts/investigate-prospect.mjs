#!/usr/bin/env node
import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_REF = 'glsmifhkoaifvaegsozd';
const ACCESS_TOKEN_PATH = join(__dirname, '..', '.supabase', 'access_token');
const PROSPECTO_ID = 'e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b';

async function investigateProspect() {
  try {
    const accessToken = readFileSync(ACCESS_TOKEN_PATH, 'utf-8').trim();
    
    console.log('🔍 Investigando prospecto...\n');
    
    // 1. Datos del prospecto
    const sql1 = `SELECT id, nombre_completo, nombre_whatsapp, whatsapp, email FROM prospectos WHERE id = '${PROSPECTO_ID}';`;
    const r1 = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql1 })
    });
    const res1 = await r1.json();
    
    if (res1.result && res1.result.length > 0) {
      const p = res1.result[0];
      console.log('📋 PROSPECTO:');
      console.log(`   nombre_completo: "${p.nombre_completo}"`);
      console.log(`   nombre_whatsapp: "${p.nombre_whatsapp}"`);
      console.log(`   whatsapp: "${p.whatsapp}"`);
      console.log(`   email: "${p.email}"\n`);
      
      // 2. Contar mensajes
      const sql2 = `SELECT COUNT(*) as total FROM mensajes_whatsapp WHERE prospecto_id = '${PROSPECTO_ID}';`;
      const r2 = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql2 })
      });
      const res2 = await r2.json();
      console.log(`📨 MENSAJES: ${res2.result?.[0]?.total || 0}\n`);
      
      // 3. Probar búsquedas específicas
      const searches = ['Rosario', 'Arroyo', 'Rivera', p.nombre_completo, p.whatsapp];
      console.log('🧪 PROBANDO BÚSQUEDAS:\n');
      
      for (const term of searches) {
        const sqlTest = `SELECT COUNT(*) as found FROM search_whatsapp_prospects('${term}', TRUE, 50) WHERE id = '${PROSPECTO_ID}';`;
        const rTest = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: sqlTest })
        });
        const resTest = await rTest.json();
        const found = resTest.result?.[0]?.found > 0;
        console.log(`   "${term}": ${found ? '✅ Encontrado' : '❌ NO encontrado'}`);
      }
      
    } else {
      console.log('❌ Prospecto no encontrado en la base de datos');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

investigateProspect();
