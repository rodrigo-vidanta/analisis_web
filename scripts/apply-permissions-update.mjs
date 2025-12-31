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

console.log('🔧 Actualizando función de permisos...\n');

const sqlPath = join(__dirname, 'sql/UPDATE_LABEL_PERMISSIONS.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log('✅ SQL listo para ejecutar\n');
console.log('📝 Copia y pega en SQL Editor de Supabase (System UI):\n');
console.log(sql);
console.log('\n⚠️ O ejecuta: scripts/sql/UPDATE_LABEL_PERMISSIONS.sql');

process.exit(0);

