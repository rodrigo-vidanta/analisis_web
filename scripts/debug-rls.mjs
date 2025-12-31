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

console.log('📡 Conectando a:', SUPABASE_URL, '\n');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

// 1. Verificar si RLS está habilitado
console.log('1️⃣ Verificando estado de RLS:\n');
const { data: rlsStatus } = await supabase
  .from('whatsapp_labels_custom')
  .select('*')
  .limit(0);

console.log('   RLS habilitado:', rlsStatus === null ? 'Posiblemente' : 'No estamos seguros');

// 2. Ver TODAS las políticas de la tabla  
console.log('\n2️⃣ Verificando tabla whatsapp_labels_custom:\n');

// Contar registros
const { count, error: countError } = await supabase
  .from('whatsapp_labels_custom')
  .select('*', { count: 'exact', head: true });

console.log('   Total de etiquetas custom:', count);

// Intentar SELECT
const { data: selectTest, error: selectError } = await supabase
  .from('whatsapp_labels_custom')
  .select('*')
  .limit(5);

if (selectError) {
  console.log('   ❌ SELECT bloqueado:', selectError.message);
} else {
  console.log('   ✅ SELECT funciona, registros:', selectTest?.length || 0);
}

// 3. Intentar INSERT directo con service_role
console.log('\n3️⃣ Intentando INSERT directo con service_role:\n');
try {
  const { data: insertTest, error: insertError } = await supabase
    .from('whatsapp_labels_custom')
    .insert({
      user_id: 'e8ced62c-3fd0-4328-b61a-a59ebea2e877',
      name: 'TEST_RLS',
      color: '#EC4899',
      is_active: true
    })
    .select();
  
  if (insertError) {
    console.error('   ❌ Error con service_role:', insertError);
  } else {
    console.log('   ✅ INSERT exitoso con service_role:', insertTest);
    
    // Eliminar el test
    await supabase
      .from('whatsapp_labels_custom')
      .delete()
      .eq('name', 'TEST_RLS');
    console.log('   ✓ Test limpiado');
  }
} catch (e) {
  console.error('   ❌ Exception:', e.message);
}

console.log('\n✅ Verificación completada');
process.exit(0);

