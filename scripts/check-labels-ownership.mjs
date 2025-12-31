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

console.log('🔍 Verificando ownership de etiquetas...\n');

// 1. User ID de Samuel
const { data: samuel } = await supabase
  .from('auth_users')
  .select('id, email, full_name')
  .eq('email', 'samuelrosales@grupovidanta.com')
  .single();

console.log('1️⃣ Usuario Samuel:');
console.log('   ID:', samuel?.id);
console.log('   Email:', samuel?.email);
console.log('   Nombre:', samuel?.full_name);

// 2. Todas las etiquetas custom
console.log('\n2️⃣ Etiquetas personalizadas en BD:\n');
const { data: labels } = await supabase
  .from('whatsapp_labels_custom')
  .select('id, name, user_id, is_active, created_at')
  .eq('is_active', true)
  .order('created_at', { ascending: false });

if (labels && labels.length > 0) {
  console.table(labels.map(l => ({
    nombre: l.name,
    user_id: l.user_id,
    es_de_samuel: l.user_id === samuel?.id ? '✅ SÍ' : '❌ NO',
    created_at: new Date(l.created_at).toLocaleString()
  })));
  
  const samuelsLabels = labels.filter(l => l.user_id === samuel?.id);
  console.log(`\n   📊 De Samuel: ${samuelsLabels.length}/${labels.length}`);
  
  // 3. Si NO son de Samuel, averiguar de quién son
  const notSamuels = labels.filter(l => l.user_id !== samuel?.id);
  if (notSamuels.length > 0) {
    console.log('\n3️⃣ Etiquetas que NO son de Samuel:\n');
    for (const label of notSamuels) {
      const { data: owner } = await supabase
        .from('auth_users')
        .select('email, full_name')
        .eq('id', label.user_id)
        .single();
      
      console.log(`   ${label.name} → Owner: ${owner?.email || 'Usuario no encontrado'} (ID: ${label.user_id})`);
    }
    
    // 4. Reasignar a Samuel si es necesario
    console.log('\n4️⃣ ¿Reasignar a Samuel? (S/N)');
    console.log('   Ejecuta: UPDATE whatsapp_labels_custom SET user_id = \'' + samuel?.id + '\' WHERE id IN (...);');
  }
} else {
  console.log('   No hay etiquetas personalizadas');
}

console.log('\n✅ Verificación completada');
process.exit(0);

