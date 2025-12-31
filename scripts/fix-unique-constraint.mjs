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

console.log('🔧 Corrigiendo constraint UNIQUE...\n');

// Verificar etiquetas inactivas
const { data: inactive } = await supabase
  .from('whatsapp_labels_custom')
  .select('*')
  .eq('is_active', false);

console.log(`Etiquetas inactivas (soft deleted): ${inactive?.length || 0}`);

if (inactive && inactive.length > 0) {
  console.table(inactive.map(i => ({ nombre: i.name, user_id: i.user_id })));
  
  console.log('\n✅ Estas se pueden reutilizar después del fix\n');
}

console.log('📝 Ejecuta en SQL Editor:\n');
console.log(`
-- Eliminar constraint vieja
ALTER TABLE whatsapp_labels_custom DROP CONSTRAINT IF EXISTS unique_user_label_name;

-- Crear índice UNIQUE solo para activas
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_user_label_name 
ON whatsapp_labels_custom (user_id, name) 
WHERE is_active = true;
`);

console.log('\nDespués podrás crear "VIP" de nuevo (la anterior está is_active=false)');

process.exit(0);

