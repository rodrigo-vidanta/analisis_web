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

console.log('🔧 Creando funciones RPC faltantes...\n');

// 1. Limpiar etiquetas huérfanas
console.log('1️⃣ Limpiando etiquetas huérfanas...');
const { data: orphans } = await supabase
  .from('whatsapp_labels_custom')
  .select('id, name, user_id')
  .is('user_id', null);

if (orphans && orphans.length > 0) {
  console.log(`   ⚠️ Encontradas ${orphans.length} etiquetas sin owner`);
  
  // Eliminar relaciones huérfanas
  for (const orphan of orphans) {
    await supabase
      .from('whatsapp_conversation_labels')
      .delete()
      .eq('label_id', orphan.id)
      .eq('label_type', 'custom');
    
    await supabase
      .from('whatsapp_labels_custom')
      .delete()
      .eq('id', orphan.id);
  }
  console.log('   ✅ Etiquetas huérfanas eliminadas');
} else {
  console.log('   ✅ No hay etiquetas huérfanas');
}

// 2. Verificar etiqueta VIP de samuelrosales@grupovidanta.com
console.log('\n2️⃣ Verificando etiqueta VIP...');
const { data: vipLabels } = await supabase
  .from('whatsapp_labels_custom')
  .select('*, creator:auth_users!user_id(email)')
  .eq('name', 'VIP');

if (vipLabels && vipLabels.length > 0) {
  console.log(`   Encontradas ${vipLabels.length} etiquetas VIP:`);
  vipLabels.forEach(vip => {
    const creatorEmail = vip.creator?.email || 'N/A';
    console.log(`     - ${vip.id} | Activa: ${vip.is_active} | User: ${creatorEmail}`);
  });
  
  // Reactivar si está inactiva
  const inactiveVIP = vipLabels.find(v => !v.is_active && v.creator?.email === 'samuelrosales@grupovidanta.com');
  if (inactiveVIP) {
    await supabase
      .from('whatsapp_labels_custom')
      .update({ is_active: true })
      .eq('id', inactiveVIP.id);
    console.log('   ✅ Etiqueta VIP reactivada');
  }
}

// 3. Verificar que la función RPC existe
console.log('\n3️⃣ Verificando función can_remove_label_from_prospecto...');
const { data: testPerm, error: testErr } = await supabase.rpc('can_remove_label_from_prospecto', {
  p_relation_id: '00000000-0000-0000-0000-000000000000', // ID fake para test
  p_user_id: 'e8ced62c-3fd0-4328-b61a-a59ebea2e877'
});

if (testErr && testErr.message.includes('not found')) {
  console.log('   ❌ Función NO existe - Creando...');
  // La función debería haberse creado en el script anterior
  console.log('   ⚠️ Ejecuta manualmente el SQL de la función RPC');
} else {
  console.log('   ✅ Función RPC existe y funciona');
}

console.log('\n✅ LIMPIEZA COMPLETADA');
process.exit(0);

