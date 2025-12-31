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

console.log('🔧 Corrigiendo problemas finales...\n');

// 1. Verificar user_id de Samuel
console.log('1️⃣ Verificando user_id de Samuel...\n');
const { data: samuel } = await supabase
  .from('auth_users')
  .select('id, email')
  .eq('email', 'samuelrosales@grupovidanta.com')
  .single();

console.log('   Samuel user_id:', samuel?.id);

// 2. Verificar VIP
const { data: vip } = await supabase
  .from('whatsapp_labels_custom')
  .select('*')
  .eq('name', 'VIP')
  .single();

console.log('   VIP user_id:', vip?.user_id);
console.log('   Match:', samuel?.id === vip?.user_id ? '✅ Coinciden' : '❌ NO coinciden');

// 3. Si no coinciden, actualizar
if (samuel && vip && samuel.id !== vip.user_id) {
  console.log('\n   Corrigiendo owner de VIP...');
  await supabase
    .from('whatsapp_labels_custom')
    .update({ user_id: samuel.id })
    .eq('id', vip.id);
  console.log('   ✅ Owner corregido');
}

// 4. Verificar funciones RPC en el schema
console.log('\n2️⃣ Verificando funciones RPC en schema...\n');

const functions = [
  'get_batch_prospecto_labels',
  'can_remove_label_from_prospecto',
  'get_prospecto_labels',
  'add_label_to_prospecto',
  'remove_label_from_prospecto'
];

for (const funcName of functions) {
  const { error } = await supabase.rpc(funcName, {}).catch(e => ({ error: e }));
  
  const exists = error?.message ? !error.message.includes('not found') : true;
  console.log(`   ${exists ? '✅' : '❌'} ${funcName}`);
}

console.log('\n✅ VERIFICACIÓN COMPLETADA');
console.log('\n📝 Resumen:');
console.log('   • VIP owner:', samuel?.id === vip?.user_id ? 'Correcto' : 'Corregido');
console.log('   • Funciones RPC: Verificadas');
console.log('\n⚡ Limpia caché (Ctrl+Shift+R) y recarga');

process.exit(0);

