#!/usr/bin/env node
import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_REF = 'glsmifhkoaifvaegsozd';
const ACCESS_TOKEN_PATH = join(__dirname, '..', '.supabase', 'access_token');

async function executeSQL() {
  try {
    const accessToken = readFileSync(ACCESS_TOKEN_PATH, 'utf-8').trim();
    
    console.log('🔧 Ejecutando SQL via REST API\n');
    
    // SQL para corregir la función
    const sql = `
DROP FUNCTION IF EXISTS search_whatsapp_prospects(TEXT, BOOLEAN, INTEGER);

CREATE OR REPLACE FUNCTION search_whatsapp_prospects(
  p_search_term TEXT,
  p_is_admin BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 50
)
RETURNS SETOF prospectos
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.*
  FROM prospectos p
  WHERE 
    EXISTS (SELECT 1 FROM mensajes_whatsapp m WHERE m.prospecto_id = p.id LIMIT 1)
    AND (
      LOWER(p.nombre_completo) ILIKE '%' || LOWER(TRIM(p_search_term)) || '%' OR
      LOWER(COALESCE(p.nombre_whatsapp, '')) ILIKE '%' || LOWER(TRIM(p_search_term)) || '%' OR
      LOWER(COALESCE(p.email, '')) ILIKE '%' || LOWER(TRIM(p_search_term)) || '%' OR
      REGEXP_REPLACE(COALESCE(p.whatsapp, ''), '[^0-9]', '', 'g') LIKE '%' || REGEXP_REPLACE(LOWER(TRIM(p_search_term)), '[^0-9]', '', 'g') || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION search_whatsapp_prospects TO anon;
GRANT EXECUTE ON FUNCTION search_whatsapp_prospects TO authenticated;
GRANT EXECUTE ON FUNCTION search_whatsapp_prospects TO service_role;

SELECT id, nombre_completo, whatsapp FROM search_whatsapp_prospects('Rosario', TRUE, 50);
`;
    
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
    
    console.log('✅ SQL ejecutado\n');
    
    if (result.result && result.result.length > 0) {
      console.log(`🎯 Resultados (${result.result.length} prospectos):\n`);
      result.result.forEach((p, i) => {
        console.log(`   ${i+1}. ${p.nombre_completo}`);
        console.log(`      ID: ${p.id}`);
        console.log(`      Tel: ${p.whatsapp}\n`);
      });
      
      const found = result.result.find(p => p.id === 'e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b');
      if (found) {
        console.log('✅ ¡PROSPECTO ENCONTRADO EN RESULTADOS!');
      } else {
        console.log('⚠️ Prospecto no encontrado');
      }
    } else {
      console.log('⚠️ Sin resultados');
    }
    
    console.log('\n✅ Listo. Refresca el módulo WhatsApp (F5) y busca "Rosario"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

executeSQL();
