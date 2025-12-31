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

console.log('🔍 Diagnosticando errores de Supabase...\n');

// 1. Test auth_users con backup_id
console.log('1️⃣ Testing auth_users.backup_id...\n');
const { data: user1, error: err1 } = await supabase
  .from('auth_users')
  .select('backup_id, has_backup')
  .eq('id', 'e8ced62c-3fd0-4328-b61a-a59ebea2e877')
  .single();

console.log('   Result:', err1 ? `❌ ${err1.message}` : `✅ ${JSON.stringify(user1)}`);

// 2. Test system_config
console.log('\n2️⃣ Testing system_config...\n');
const { data: config, error: err2 } = await supabase
  .from('system_config')
  .select('config_value')
  .eq('config_key', 'selected_logo')
  .single();

console.log('   Result:', err2 ? `❌ ${err2.code} ${err2.message}` : `✅ ${JSON.stringify(config)}`);

// 3. Test admin_messages
console.log('\n3️⃣ Testing admin_messages...\n');
const { data: msgs, error: err3 } = await supabase
  .from('admin_messages')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'pending')
  .eq('recipient_role', 'admin');

console.log('   Result:', err3 ? `❌ ${err3.message}` : `✅ ${msgs} mensajes`);

// 4. Verificar CORS
console.log('\n4️⃣ Verificando configuración...\n');
console.log('   URL:', env.VITE_SYSTEM_UI_SUPABASE_URL);
console.log('   Tiene SERVICE_KEY:', !!env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY);
console.log('   Tiene ANON_KEY:', !!env.VITE_SYSTEM_UI_SUPABASE_ANON_KEY);

console.log('\n✅ Diagnóstico completado');
process.exit(0);

