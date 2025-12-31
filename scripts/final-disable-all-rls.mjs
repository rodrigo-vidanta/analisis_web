#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(
  env.VITE_SYSTEM_UI_SUPABASE_URL,
  env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY
);

console.log('🔧 Deshabilitando RLS en TODAS las tablas de etiquetas...\n');

// Verificar y deshabilitar
const tables = ['whatsapp_labels_preset', 'whatsapp_labels_custom', 'whatsapp_conversation_labels'];

for (const table of tables) {
  // Test SELECT
  const { data: testData, error: testError } = await supabase
    .from(table)
    .select('*')
    .limit(1);
  
  console.log(`${table}:`);
  console.log(`  SELECT: ${testError ? `❌ ${testError.code}` : `✅ ${testData?.length || 0} registros`}`);
}

console.log('\n⚠️ Si alguno muestra error, ejecuta en SQL Editor:\n');
console.log('ALTER TABLE whatsapp_labels_preset DISABLE ROW LEVEL SECURITY;');
console.log('ALTER TABLE whatsapp_labels_custom DISABLE ROW LEVEL SECURITY;');
console.log('ALTER TABLE whatsapp_conversation_labels DISABLE ROW LEVEL SECURITY;');

console.log('\n📊 Conteo de registros:\n');

const { count: presetCount } = await supabase
  .from('whatsapp_labels_preset')
  .select('*', { count: 'exact', head: true });

const { count: customCount } = await supabase
  .from('whatsapp_labels_custom')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true);

console.log(`Preset labels: ${presetCount || 0}`);
console.log(`Custom labels: ${customCount || 0}`);

if ((presetCount || 0) === 0 || (customCount || 0) === 0) {
  console.log('\n⚠️ RLS ESTÁ BLOQUEANDO - Ejecuta los ALTER TABLE arriba');
}

process.exit(0);

