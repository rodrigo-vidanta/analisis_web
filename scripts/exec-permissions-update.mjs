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

// Leer SQL
const sqlPath = join(__dirname, 'sql/UPDATE_LABEL_PERMISSIONS.sql');
const fullSql = readFileSync(sqlPath, 'utf-8');

// Extraer solo la función CREATE OR REPLACE
const functionMatch = fullSql.match(/CREATE OR REPLACE FUNCTION[\s\S]+?END;[\s]*\$\$ LANGUAGE plpgsql SECURITY DEFINER;/);

if (!functionMatch) {
  console.error('❌ No se pudo extraer la función del SQL');
  process.exit(1);
}

const functionSql = functionMatch[0];

console.log('📝 Función a actualizar:\n');
console.log(functionSql.substring(0, 200) + '...\n');

console.log('⚠️ Ejecuta manualmente en SQL Editor:');
console.log('   scripts/sql/UPDATE_LABEL_PERMISSIONS.sql\n');

console.log('✅ Después, los permisos serán:');
console.log('   1. Admin/Admin Operativo → CUALQUIER etiqueta');
console.log('   2. Coordinador Calidad → CUALQUIER etiqueta');
console.log('   3. Coordinador → Etiquetas de su coordinación');
console.log('   4. Usuario → Sus propias etiquetas');

process.exit(0);

