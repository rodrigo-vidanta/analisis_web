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

async function debug() {
  try {
    const accessToken = readFileSync(ACCESS_TOKEN_PATH, 'utf-8').trim();
    
    const sql = `
-- 1. Verificar prospecto
SELECT 'PROSPECTO' as tipo, id, nombre_completo, whatsapp 
FROM prospectos WHERE id = '${PROSPECTO_ID}';

-- 2. Contar mensajes
SELECT 'MENSAJES' as tipo, COUNT(*)::text as total 
FROM mensajes_whatsapp WHERE prospecto_id = '${PROSPECTO_ID}';

-- 3. Búsqueda con LIKE manual
SELECT 'BUSQUEDA_MANUAL' as tipo, id, nombre_completo 
FROM prospectos 
WHERE id = '${PROSPECTO_ID}'
  AND EXISTS (SELECT 1 FROM mensajes_whatsapp m WHERE m.prospecto_id = prospectos.id)
  AND LOWER(nombre_completo) LIKE '%rosario%';
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
    
    if (result.result) {
      console.log('📊 Resultados:\n');
      console.log(JSON.stringify(result.result, null, 2));
    } else {
      console.log('⚠️ Sin resultados');
      console.log(JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('❌', error.message);
  }
}

debug();
