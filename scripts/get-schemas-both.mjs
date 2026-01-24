#!/usr/bin/env node
import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_REF = 'glsmifhkoaifvaegsozd';
const ACCESS_TOKEN_PATH = join(__dirname, '..', '.supabase', 'access_token');

async function getTableSchemas() {
  try {
    const accessToken = readFileSync(ACCESS_TOKEN_PATH, 'utf-8').trim();
    
    console.log('📋 Obteniendo esquemas...\n');
    
    // Mensajes WhatsApp
    const sql1 = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'mensajes_whatsapp'
      ORDER BY ordinal_position;
    `;
    
    const r1 = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql1 })
    });
    
    const res1 = await r1.json();
    console.log('mensajes_whatsapp:');
    console.log(res1.result?.map(c => `  - ${c.column_name}`).join('\n'));
    
    // Conversaciones WhatsApp  
    const sql2 = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'conversaciones_whatsapp'
      ORDER BY ordinal_position;
    `;
    
    const r2 = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql2 })
    });
    
    const res2 = await r2.json();
    console.log('\nconversaciones_whatsapp:');
    console.log(res2.result?.map(c => `  - ${c.column_name}`).join('\n'));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getTableSchemas();
