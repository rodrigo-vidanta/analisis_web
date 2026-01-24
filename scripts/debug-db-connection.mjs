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

async function debugConnection() {
  try {
    const accessToken = readFileSync(ACCESS_TOKEN_PATH, 'utf-8').trim();
    
    console.log('🔍 DEBUG CONEXIÓN\n');
    console.log(`Proyecto: ${PROJECT_REF}`);
    console.log(`Prospecto ID: ${PROSPECTO_ID}\n`);
    
    // 1. Verificar proyecto con query simple
    const sql1 = `SELECT current_database() as db_name, current_user;`;
    const r1 = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql1 })
    });
    const res1 = await r1.json();
    console.log('📊 Conexión:');
    console.log(`   Database: ${res1.result?.[0]?.db_name || 'Unknown'}`);
    console.log(`   User: ${res1.result?.[0]?.current_user || 'Unknown'}\n`);
    
    // 2. Contar total de prospectos
    const sql2 = `SELECT COUNT(*) as total FROM prospectos;`;
    const r2 = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql2 })
    });
    const res2 = await r2.json();
    console.log(`📋 Total prospectos: ${res2.result?.[0]?.total || 0}\n`);
    
    // 3. Buscar por nombre similar
    const sql3 = `SELECT id, nombre_completo, whatsapp FROM prospectos WHERE LOWER(nombre_completo) LIKE '%rosario%' OR LOWER(nombre_whatsapp) LIKE '%rosario%' LIMIT 5;`;
    const r3 = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql3 })
    });
    const res3 = await r3.json();
    
    if (res3.result && res3.result.length > 0) {
      console.log('🔍 Prospectos con "Rosario":');
      res3.result.forEach(p => {
        console.log(`   - ${p.nombre_completo} (${p.id})`);
        console.log(`     WhatsApp: ${p.whatsapp}`);
        if (p.id === PROSPECTO_ID) {
          console.log('     ⭐ ¡Este es el que buscamos!');
        }
      });
    } else {
      console.log('❌ No hay prospectos con "Rosario"');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugConnection();
