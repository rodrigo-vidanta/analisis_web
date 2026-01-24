#!/usr/bin/env node
import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_REF = 'glsmifhkoaifvaegsozd';
const ACCESS_TOKEN_PATH = join(__dirname, '..', '.supabase', 'access_token');

async function checkRLS() {
  try {
    const accessToken = readFileSync(ACCESS_TOKEN_PATH, 'utf-8').trim();
    
    console.log('🔍 Verificando RLS en user_profiles_v2\n');
    
    const sql = `
-- Verificar RLS en la vista
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'user_profiles_v2'
UNION ALL
SELECT
  schemaname,
  viewname as tablename,
  false as rowsecurity
FROM pg_views
WHERE viewname = 'user_profiles_v2';

-- Ver definición de la vista
SELECT pg_get_viewdef('user_profiles_v2'::regclass, true);
`;
    
    console.log('📡 Consultando...');
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
    
    console.log('✅ Resultado:\n');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkRLS();
