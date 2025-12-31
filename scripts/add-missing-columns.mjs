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

console.log('🔧 Verificando y agregando columnas faltantes...\n');

// Verificar columnas actuales
const { data: sample } = await supabase
  .from('whatsapp_conversation_labels')
  .select('*')
  .limit(1);

console.log('Columnas actuales:', Object.keys(sample?.[0] || {}));

console.log('\n📝 Ejecuta en SQL Editor:\n');
console.log(`
ALTER TABLE whatsapp_conversation_labels 
ADD COLUMN IF NOT EXISTS assigned_by_role VARCHAR(50);

ALTER TABLE whatsapp_conversation_labels
ADD COLUMN IF NOT EXISTS assigned_by_coordinacion_id UUID;

COMMENT ON COLUMN whatsapp_conversation_labels.assigned_by_role 
  IS 'Rol del usuario que aplicó la etiqueta';
  
COMMENT ON COLUMN whatsapp_conversation_labels.assigned_by_coordinacion_id 
  IS 'Coordinación del usuario que aplicó la etiqueta (snapshot)';
`);

console.log('\n✅ Después recarga la app y los permisos funcionarán');

process.exit(0);

