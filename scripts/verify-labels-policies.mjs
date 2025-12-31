#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

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

console.log('📡 Conectando a:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Verificar políticas
const { data, error } = await supabase.rpc('exec_sql', {
  query: `
    SELECT tablename, policyname, cmd 
    FROM pg_policies 
    WHERE tablename LIKE 'whatsapp_labels%' 
    ORDER BY tablename, policyname;
  `
});

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

console.log('\n📋 Políticas actuales en whatsapp_labels*:\n');
console.table(data);

// Verificar si la tabla existe
const { data: tables } = await supabase.rpc('exec_sql', {
  query: `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name LIKE 'whatsapp_labels%';
  `
});

console.log('\n📦 Tablas de etiquetas:\n');
console.table(tables);

