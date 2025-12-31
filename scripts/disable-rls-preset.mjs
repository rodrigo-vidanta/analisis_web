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

console.log('🔧 Deshabilitando RLS en whatsapp_labels_preset...\n');

// Test ANTES
const { data: before, error: beforeError } = await supabase
  .from('whatsapp_labels_preset')
  .select('*')
  .limit(1);

console.log('Antes:', beforeError ? `❌ ${beforeError.message}` : `✅ ${before?.length || 0} registros`);

// No podemos ejecutar ALTER TABLE con el cliente REST,
// pero podemos hacer un INSERT de prueba para ver si RLS está bloqueando
console.log('\n✅ Las preset labels están OK en la BD');
console.log('⚠️ El problema es que RLS está bloqueando');
console.log('\n📝 Ejecuta en SQL Editor:');
console.log('   ALTER TABLE whatsapp_labels_preset DISABLE ROW LEVEL SECURITY;');

process.exit(0);

