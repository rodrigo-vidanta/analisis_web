#!/usr/bin/env node

import { readFileSync } from 'fs';
import postgres from 'postgres';
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

// Construir connection string
const dbUrl = env.VITE_SYSTEM_UI_DATABASE_URL;

console.log('🔧 Conectando directamente a PostgreSQL...\n');

const sql = postgres(dbUrl, {
  ssl: 'require',
  max: 1,
  onnotice: () => {} // Silenciar notices
});

try {
  // Deshabilitar RLS en las 3 tablas
  console.log('1️⃣ Deshabilitando RLS...\n');
  
  await sql.unsafe('ALTER TABLE whatsapp_labels_preset DISABLE ROW LEVEL SECURITY');
  console.log('   ✅ whatsapp_labels_preset');
  
  await sql.unsafe('ALTER TABLE whatsapp_labels_custom DISABLE ROW LEVEL SECURITY');
  console.log('   ✅ whatsapp_labels_custom');
  
  await sql.unsafe('ALTER TABLE whatsapp_conversation_labels DISABLE ROW LEVEL SECURITY');
  console.log('   ✅ whatsapp_conversation_labels');
  
  console.log('\n✅ RLS DESHABILITADO EN LAS 3 TABLAS\n');
  
  // Verificar
  const result = await sql.unsafe(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE tablename LIKE 'whatsapp_labels%'
    ORDER BY tablename
  `);
  
  console.log('📋 Verificación:\n');
  console.table(result);
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await sql.end();
}

process.exit(0);

