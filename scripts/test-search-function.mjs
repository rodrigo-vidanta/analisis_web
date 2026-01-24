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

async function testSearch() {
  try {
    const accessToken = readFileSync(ACCESS_TOKEN_PATH, 'utf-8').trim();
    
    console.log('🔍 Investigando prospecto específico\n');
    
    // 1. Ver prospecto
    const sql1 = `SELECT id, nombre_completo, whatsapp, email FROM prospectos WHERE id = '${PROSPECTO_ID}';`;
    const r1 = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql1 })
    });
    const res1 = await r1.json();
    
    if (res1.result && res1.result.length > 0) {
      const p = res1.result[0];
      console.log('1️⃣ Prospecto:');
      console.log(`   Nombre: "${p.nombre_completo}"`);
      console.log(`   WhatsApp: "${p.whatsapp}"`);
      console.log(`   Email: "${p.email}"\n`);
      
      // 2. Ver si tiene mensajes
      const sql2 = `SELECT COUNT(*) as total FROM mensajes_whatsapp WHERE prospecto_id = '${PROSPECTO_ID}';`;
      const r2 = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql2 })
      });
      const res2 = await r2.json();
      
      console.log('2️⃣ Mensajes:');
      console.log(`   Total: ${res2.result?.[0]?.total || 0}\n`);
      
      if (res2.result?.[0]?.total > 0) {
        // 3. Probar búsqueda por partes del nombre
        const searches = [
          'Rosario',
          'Arroyo',
          'Rivera',
          p.nombre_completo,
          p.whatsapp
        ];
        
        console.log('3️⃣ Probando búsquedas:\n');
        for (const term of searches) {
          const sqlTest = `SELECT COUNT(*) as found FROM search_whatsapp_prospects('${term}', TRUE, 50) WHERE id = '${PROSPECTO_ID}';`;
          const rTest = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: sqlTest })
          });
          const resTest = await rTest.json();
          const found = resTest.result?.[0]?.found > 0;
          console.log(`   "${term}": ${found ? '✅' : '❌'}`);
        }
      } else {
        console.log('   ❌ Prospecto NO tiene mensajes en mensajes_whatsapp');
        console.log('   📝 Por eso no aparece en el módulo WhatsApp');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSearch();
