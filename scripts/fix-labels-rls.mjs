#!/usr/bin/env node

/**
 * Script para ejecutar force_reset_whatsapp_labels_rls.sql
 * Usa las credenciales de .env.local
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer .env.local
const envPath = join(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');

// Parsear variables
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const SUPABASE_URL = env.VITE_SYSTEM_UI_SUPABASE_URL;
const SERVICE_KEY = env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Faltan credenciales en .env.local');
  process.exit(1);
}

// Leer script SQL
const sqlPath = join(__dirname, 'sql/force_reset_whatsapp_labels_rls.sql');
const sql = readFileSync(sqlPath, 'utf-8');

// Ejecutar con HTTP request
console.log('🔧 Ejecutando reset de políticas RLS...');

const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({ query: sql })
});

if (!response.ok) {
  const error = await response.text();
  console.error('❌ Error:', error);
  process.exit(1);
}

console.log('✅ Políticas RLS actualizadas correctamente');

// Verificar políticas creadas
const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`
  },
  body: JSON.stringify({ 
    query: `SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename LIKE 'whatsapp_labels%' ORDER BY tablename, policyname;`
  })
});

const policies = await verifyResponse.json();
console.log('\n📋 Políticas creadas:');
console.table(policies);

