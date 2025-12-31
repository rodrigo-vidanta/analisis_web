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

console.log('🔍 Verificación Final del Sistema de Etiquetas\n');

// 1. Todas las etiquetas custom
console.log('1️⃣ Etiquetas personalizadas activas:\n');
const { data: customLabels } = await supabase
  .from('whatsapp_labels_custom')
  .select('id, name, user_id, is_active, creator:auth_users!user_id(email)')
  .eq('is_active', true)
  .order('created_at', { ascending: false });

if (customLabels && customLabels.length > 0) {
  console.table(customLabels.map(l => ({
    nombre: l.name,
    creador: l.creator?.email || 'N/A',
    activa: l.is_active
  })));
} else {
  console.log('   No hay etiquetas personalizadas activas\n');
}

// 2. Etiquetas aplicadas
console.log('\n2️⃣ Etiquetas aplicadas a prospectos:\n');
const { data: applied } = await supabase
  .from('whatsapp_conversation_labels')
  .select('id, prospecto_id, label_id, label_type, added_by, assigned_by_role')
  .limit(10);

if (applied && applied.length > 0) {
  console.table(applied);
} else {
  console.log('   No hay etiquetas aplicadas\n');
}

// 3. Test de función RPC
console.log('\n3️⃣ Test de funciones RPC:\n');

// Test get_batch
const testProspectos = applied?.map(a => a.prospecto_id).slice(0, 3) || [];
if (testProspectos.length > 0) {
  const { data: batchTest, error: batchError } = await supabase.rpc('get_batch_prospecto_labels', {
    p_prospecto_ids: testProspectos
  });
  
  console.log('   get_batch_prospecto_labels:', batchError ? `❌ ${batchError.message}` : `✅ ${Object.keys(batchTest || {}).length} prospectos`);
}

// Test can_remove
if (applied && applied.length > 0) {
  const { data: permTest, error: permError } = await supabase.rpc('can_remove_label_from_prospecto', {
    p_relation_id: applied[0].id,
    p_user_id: 'e8ced62c-3fd0-4328-b61a-a59ebea2e877'
  });
  
  console.log('   can_remove_label_from_prospecto:', permError ? `❌ ${permError.message}` : `✅ ${JSON.stringify(permTest)}`);
}

console.log('\n✅ VERIFICACIÓN COMPLETADA\n');
console.log('📋 Acción recomendada:');
console.log('   1. Limpia caché del navegador (Ctrl+Shift+R / Cmd+Shift+R)');
console.log('   2. Recarga la app');
console.log('   3. Las etiquetas personalizadas deberían aparecer ahora');

process.exit(0);

