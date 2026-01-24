#!/usr/bin/env node
import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_REF = 'glsmifhkoaifvaegsozd';
const ACCESS_TOKEN_PATH = join(__dirname, '..', '.supabase', 'access_token');

async function getTableSchema() {
  try {
    const accessToken = readFileSync(ACCESS_TOKEN_PATH, 'utf-8').trim();
    
    const sql = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'conversaciones_whatsapp'
      ORDER BY ordinal_position;
    `;
    
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });
    
    const result = await response.json();
    
    console.log('📋 Estructura de conversaciones_whatsapp:\n');
    result.result?.forEach(col => {
      console.log(`   ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getTableSchema();
