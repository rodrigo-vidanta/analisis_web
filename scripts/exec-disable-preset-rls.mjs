#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

console.log('🔧 Deshabilitando RLS en whatsapp_labels_preset vía HTTP...\n');

// Ejecutar directamente con REST API de Postgrest no funciona para DDL
// Necesita ejecutarse manualmente en SQL Editor
console.log('✅ RESUMEN FINAL:\n');
console.log('Ejecuta estos 2 comandos en SQL Editor de Supabase:\n');
console.log('1. ALTER TABLE whatsapp_labels_preset DISABLE ROW LEVEL SECURITY;');
console.log('2. Quitar confirm(): Ya aplicado en código ✅\n');

process.exit(0);

