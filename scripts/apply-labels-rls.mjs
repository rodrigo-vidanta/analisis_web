#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer .env.local
const envPath = join(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const DB_URL = env.VITE_SYSTEM_UI_DATABASE_URL || 
  `postgresql://postgres.zbylezfyagwrxoecioup:${env.VITE_SYSTEM_UI_DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

console.log('📡 Conectando a System UI...');

const sql = postgres(DB_URL, {
  ssl: 'require',
  max: 1
});

try {
  // Deshabilitar RLS
  console.log('1️⃣ Deshabilitando RLS...');
  await sql`ALTER TABLE whatsapp_labels_preset DISABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE whatsapp_labels_custom DISABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE whatsapp_conversation_labels DISABLE ROW LEVEL SECURITY`;
  
  // Eliminar todas las políticas
  console.log('2️⃣ Eliminando políticas existentes...');
  const policies = await sql`
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE tablename IN ('whatsapp_labels_preset', 'whatsapp_labels_custom', 'whatsapp_conversation_labels')
  `;
  
  for (const policy of policies) {
    await sql.unsafe(`DROP POLICY IF EXISTS ${policy.policyname} ON ${policy.tablename}`);
    console.log(`   ✓ Eliminada: ${policy.policyname}`);
  }
  
  // Crear políticas nuevas
  console.log('3️⃣ Creando políticas nuevas...');
  
  await sql.unsafe(`
    CREATE POLICY whatsapp_labels_preset_select ON whatsapp_labels_preset
      FOR SELECT USING (auth.uid() IS NOT NULL)
  `);
  console.log('   ✓ whatsapp_labels_preset_select');
  
  await sql.unsafe(`
    CREATE POLICY whatsapp_labels_custom_select ON whatsapp_labels_custom
      FOR SELECT USING (auth.uid() = user_id)
  `);
  console.log('   ✓ whatsapp_labels_custom_select');
  
  await sql.unsafe(`
    CREATE POLICY whatsapp_labels_custom_insert ON whatsapp_labels_custom
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)
  `);
  console.log('   ✓ whatsapp_labels_custom_insert');
  
  await sql.unsafe(`
    CREATE POLICY whatsapp_labels_custom_update ON whatsapp_labels_custom
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
  `);
  console.log('   ✓ whatsapp_labels_custom_update');
  
  await sql.unsafe(`
    CREATE POLICY whatsapp_labels_custom_delete ON whatsapp_labels_custom
      FOR DELETE USING (auth.uid() = user_id)
  `);
  console.log('   ✓ whatsapp_labels_custom_delete');
  
  await sql.unsafe(`
    CREATE POLICY whatsapp_conversation_labels_select ON whatsapp_conversation_labels
      FOR SELECT USING (auth.uid() IS NOT NULL)
  `);
  console.log('   ✓ whatsapp_conversation_labels_select');
  
  await sql.unsafe(`
    CREATE POLICY whatsapp_conversation_labels_insert ON whatsapp_conversation_labels
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)
  `);
  console.log('   ✓ whatsapp_conversation_labels_insert');
  
  await sql.unsafe(`
    CREATE POLICY whatsapp_conversation_labels_update ON whatsapp_conversation_labels
      FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)
  `);
  console.log('   ✓ whatsapp_conversation_labels_update');
  
  await sql.unsafe(`
    CREATE POLICY whatsapp_conversation_labels_delete ON whatsapp_conversation_labels
      FOR DELETE USING (auth.uid() IS NOT NULL)
  `);
  console.log('   ✓ whatsapp_conversation_labels_delete');
  
  // Habilitar RLS
  console.log('4️⃣ Habilitando RLS...');
  await sql`ALTER TABLE whatsapp_labels_preset ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE whatsapp_labels_custom ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE whatsapp_conversation_labels ENABLE ROW LEVEL SECURITY`;
  
  console.log('\n✅ POLÍTICAS RLS APLICADAS CORRECTAMENTE\n');
  
  // Verificar
  const newPolicies = await sql`
    SELECT tablename, policyname, cmd 
    FROM pg_policies 
    WHERE tablename LIKE 'whatsapp_labels%' 
    ORDER BY tablename, policyname
  `;
  
  console.log('📋 Políticas finales:');
  console.table(newPolicies);
  
} catch (error) {
  console.error('❌ Error:', error);
} finally {
  await sql.end();
}

