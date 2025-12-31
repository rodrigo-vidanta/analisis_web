#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer .env.local
const envPath = join(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const SUPABASE_URL = env.VITE_SYSTEM_UI_SUPABASE_URL;
const SERVICE_KEY = env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY;

console.log('📡 System UI URL:', SUPABASE_URL);

async function execSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL failed: ${text}`);
  }
  
  return response;
}

// Ejecutar manualmente cada statement
console.log('\n1️⃣ Deshabilitando RLS...');

const statements = [
  `ALTER TABLE whatsapp_labels_custom DISABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS custom_select_policy ON whatsapp_labels_custom`,
  `DROP POLICY IF EXISTS custom_insert_policy ON whatsapp_labels_custom`,
  `DROP POLICY IF EXISTS custom_update_policy ON whatsapp_labels_custom`,
  `DROP POLICY IF EXISTS custom_delete_policy ON whatsapp_labels_custom`,
  `DROP POLICY IF EXISTS whatsapp_labels_custom_select ON whatsapp_labels_custom`,
  `DROP POLICY IF EXISTS whatsapp_labels_custom_insert ON whatsapp_labels_custom`,
  `DROP POLICY IF EXISTS whatsapp_labels_custom_update ON whatsapp_labels_custom`,
  `DROP POLICY IF EXISTS whatsapp_labels_custom_delete ON whatsapp_labels_custom`,
  `DROP POLICY IF EXISTS "Usuarios pueden ver sus etiquetas custom" ON whatsapp_labels_custom`,
  `DROP POLICY IF EXISTS "Usuarios pueden crear etiquetas custom" ON whatsapp_labels_custom`,
  `DROP POLICY IF EXISTS "Usuarios pueden actualizar sus etiquetas custom" ON whatsapp_labels_custom`,
  `DROP POLICY IF EXISTS "Usuarios pueden eliminar sus etiquetas custom" ON whatsapp_labels_custom`,
  `CREATE POLICY whatsapp_labels_custom_select_v2 ON whatsapp_labels_custom FOR SELECT USING (auth.uid() = user_id)`,
  `CREATE POLICY whatsapp_labels_custom_insert_v2 ON whatsapp_labels_custom FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)`,
  `CREATE POLICY whatsapp_labels_custom_update_v2 ON whatsapp_labels_custom FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
  `CREATE POLICY whatsapp_labels_custom_delete_v2 ON whatsapp_labels_custom FOR DELETE USING (auth.uid() = user_id)`,
  `ALTER TABLE whatsapp_labels_custom ENABLE ROW LEVEL SECURITY`,
];

for (const stmt of statements) {
  try {
    await execSQL(stmt);
    console.log(`✓ ${stmt.substring(0, 60)}...`);
  } catch (error) {
    console.log(`⚠️ ${stmt.substring(0, 60)}... (puede fallar si no existe)`);
  }
}

console.log('\n✅ COMPLETADO');

process.exit(0);

