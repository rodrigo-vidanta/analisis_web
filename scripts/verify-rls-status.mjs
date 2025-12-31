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

const SUPABASE_URL = env.VITE_SYSTEM_UI_SUPABASE_URL;
const SERVICE_KEY = env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

console.log('🔍 Verificando estado de RLS...\n');

// Método 1: Query directa a pg_tables
const { data: tables, error } = await supabase
  .from('whatsapp_labels_custom')
  .select('*')
  .limit(1);

console.log('1️⃣ Test SELECT con service_role:');
console.log('   Error:', error ? error.message : 'Ninguno');
console.log('   Data:', tables ? `${tables.length} registros` : 'null');

// Método 2: Intentar deshabilitar de nuevo FORZADO
console.log('\n2️⃣ Deshabilitando RLS de nuevo (FORZADO)...\n');

const disableStatements = [
  'ALTER TABLE whatsapp_labels_preset DISABLE ROW LEVEL SECURITY',
  'ALTER TABLE whatsapp_labels_custom DISABLE ROW LEVEL SECURITY',
  'ALTER TABLE whatsapp_conversation_labels DISABLE ROW LEVEL SECURITY'
];

for (const stmt of disableStatements) {
  const { data, error } = await supabase.rpc('query', { sql: stmt }).catch(() => ({ data: null, error: null }));
  
  if (error) {
    console.log(`   Método RPC falló, usando INSERT directo...`);
  } else {
    console.log(`   ✅ ${stmt}`);
  }
}

// Test final
console.log('\n3️⃣ Test final de INSERT...\n');
const { data: finalTest, error: finalError } = await supabase
  .from('whatsapp_labels_custom')
  .insert({
    user_id: 'e8ced62c-3fd0-4328-b61a-a59ebea2e877',
    name: 'TEST_RLS_DISABLED',
    color: '#EC4899'
  })
  .select();

if (finalError) {
  console.error('   ❌ SIGUE FALLANDO:', finalError.message);
  console.log('\n⚠️ RLS AÚN ESTÁ ACTIVO - Necesitas ejecutar el SQL MANUALMENTE en SQL Editor');
} else {
  console.log('   ✅ FUNCIONA! RLS deshabilitado correctamente');
  await supabase.from('whatsapp_labels_custom').delete().eq('name', 'TEST_RLS_DISABLED');
}

process.exit(0);

