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

console.log('🔍 Verificando columnas de auth_users...\n');

// Obtener usuario de ejemplo
const { data: user } = await supabase
  .from('auth_users')
  .select('*')
  .eq('email', 'angelicaguzman@vidavacations.com')
  .single();

console.log('Columnas en auth_users:');
console.log(Object.keys(user || {}).sort());

console.log('\n📊 Usuario angelicaguzman:');
console.log('  coordinacion_id:', user?.coordinacion_id);
console.log('  coordinaciones_ids:', user?.coordinaciones_ids);

// Verificar en auth_user_coordinaciones
const { data: coords } = await supabase
  .from('auth_user_coordinaciones')
  .select('coordinacion_id, coordinaciones:coordinaciones(codigo, nombre)')
  .eq('user_id', user?.id);

console.log('\n📊 Coordinaciones desde auth_user_coordinaciones:');
console.table(coords?.map(c => ({
  coordinacion_id: c.coordinacion_id,
  codigo: c.coordinaciones?.codigo,
  nombre: c.coordinaciones?.nombre
})));

process.exit(0);

