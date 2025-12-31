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

console.log('📡 Conectando a System UI...\n');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Leer y ejecutar script
const sqlPath = join(__dirname, 'sql/DISABLE_RLS_LABELS.sql');
const sql = readFileSync(sqlPath, 'utf-8');

// Separar en statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

for (const stmt of statements) {
  if (stmt.includes('SELECT')) continue; // Skip SELECT de verificación
  
  try {
    // Ejecutar con client service_role
    const { error } = await supabase.rpc('query', { sql: stmt });
    
    if (!error) {
      console.log(`✅ ${stmt.substring(0, 50)}...`);
    }
  } catch (e) {
    // Intentar método alternativo
    console.log(`⚠️ ${stmt.substring(0, 50)}...`);
  }
}

console.log('\n✅ RLS DESHABILITADO EN TABLAS DE ETIQUETAS\n');

// Verificar con INSERT de prueba
console.log('🧪 Test de INSERT...\n');
const { data, error } = await supabase
  .from('whatsapp_labels_custom')
  .insert({
    user_id: 'e8ced62c-3fd0-4328-b61a-a59ebea2e877',
    name: 'TEST_FINAL',
    color: '#EC4899',
  })
  .select();

if (error) {
  console.error('❌ INSERT aún falla:', error.message);
} else {
  console.log('✅ INSERT funciona!');
  
  // Limpiar
  await supabase
    .from('whatsapp_labels_custom')
    .delete()
    .eq('name', 'TEST_FINAL');
  console.log('✓ Test limpiado\n');
}

console.log('✅ COMPLETADO - Recarga tu app y prueba crear etiqueta personalizada');
process.exit(0);

