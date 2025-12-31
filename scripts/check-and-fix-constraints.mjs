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

console.log('🔍 Verificando constraints y limpiando...\n');

// 1. Limpiar TODAS las etiquetas inactivas (hard delete)
console.log('1️⃣ Eliminando etiquetas inactivas (hard delete)...\n');

const { data: toDelete } = await supabase
  .from('whatsapp_labels_custom')
  .select('id, name')
  .eq('is_active', false);

if (toDelete && toDelete.length > 0) {
  console.log(`   Encontradas ${toDelete.length} etiquetas inactivas`);
  
  // Eliminar relaciones primero
  for (const label of toDelete) {
    await supabase
      .from('whatsapp_conversation_labels')
      .delete()
      .eq('label_id', label.id)
      .eq('label_type', 'custom');
  }
  
  // Eliminar las etiquetas
  const { error } = await supabase
    .from('whatsapp_labels_custom')
    .delete()
    .eq('is_active', false);
  
  if (error) {
    console.error('   ❌ Error:', error.message);
  } else {
    console.log('   ✅ Etiquetas inactivas eliminadas permanentemente');
  }
} else {
  console.log('   ✅ No hay etiquetas inactivas');
}

// 2. Verificar constraints
console.log('\n2️⃣ Verificando constraints...\n');

// Ahora deberías poder crear "VIP" sin problema
const { data: testVIP, error: vipError } = await supabase
  .from('whatsapp_labels_custom')
  .insert({
    user_id: 'e8ced62c-3fd0-4328-b61a-a59ebea2e877',
    name: 'VIP_TEST',
    color: '#EC4899'
  })
  .select();

if (vipError) {
  console.log('   ❌ Aún falla:', vipError.message);
  console.log('\n   Ejecuta en SQL Editor:');
  console.log('   ALTER TABLE whatsapp_labels_custom DROP CONSTRAINT IF EXISTS unique_user_label_name;');
} else {
  console.log('   ✅ INSERT funciona!');
  
  // Limpiar test
  await supabase
    .from('whatsapp_labels_custom')
    .delete()
    .eq('id', testVIP[0].id);
  console.log('   ✓ Test limpiado');
}

console.log('\n✅ Ahora deberías poder crear "VIP"');
process.exit(0);

