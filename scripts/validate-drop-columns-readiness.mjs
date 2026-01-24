#!/usr/bin/env node
/**
 * Script para preparar migración de eliminación de columnas redundantes
 * Este script solo prepara y valida, la ejecución debe ser manual en SQL Editor
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://glsmifhkoaifvaegsozd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function prepareForMigration() {
  console.log('🔍 Preparando migración: Eliminar columnas redundantes\n');
  
  try {
    // Paso 1: Verificar cuántas conversaciones hay
    console.log('1️⃣ Verificando conversaciones existentes...');
    const { count, error: countError } = await supabase
      .from('conversaciones_whatsapp')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('   ❌ Error:', countError.message);
    } else {
      console.log(`   ✅ Total conversaciones: ${count || 0}`);
    }
    
    // Paso 2: Verificar que las conversaciones tienen prospecto_id
    console.log('\n2️⃣ Verificando integridad de prospecto_id...');
    const { count: withProspect } = await supabase
      .from('conversaciones_whatsapp')
      .select('*', { count: 'exact', head: true })
      .not('prospecto_id', 'is', null);
    
    console.log(`   ✅ Con prospecto_id: ${withProspect || 0}`);
    console.log(`   ⚠️ Sin prospecto_id: ${(count || 0) - (withProspect || 0)}`);
    
    // Paso 3: Instrucciones para ejecución manual
    console.log('\n3️⃣ MIGRACIÓN LISTA PARA EJECUTAR');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Archivo de migración:');
    console.log('   migrations/20260124_drop_redundant_columns_conversaciones.sql\n');
    
    console.log('📝 Pasos para ejecutar en Supabase Dashboard:');
    console.log('   1. Ir a https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd');
    console.log('   2. Click en "SQL Editor" en el menú lateral');
    console.log('   3. Click en "New query"');
    console.log('   4. Copiar todo el contenido del archivo de migración');
    console.log('   5. Pegar en el editor SQL');
    console.log('   6. Click en "Run" (o Ctrl+Enter)');
    console.log('   7. Verificar que se ejecutó sin errores\n');
    
    console.log('✅ Cambios de código completados:');
    console.log('   - ✅ LiveChatDashboard.tsx - Filtros actualizados');
    console.log('   - ✅ notificationListenerService.ts - Usando prospecto');
    console.log('   - ✅ notificationService.ts - Usando prospecto');
    console.log('   - ✅ LiveChatCanvas.tsx - Usando prospecto');
    console.log('   - ✅ uchatService.ts - Interfaz actualizada\n');
    
    console.log('🎯 Cambios en BD (al ejecutar migración):');
    console.log('   - ❌ DROP: conversaciones_whatsapp.numero_telefono');
    console.log('   - ❌ DROP: conversaciones_whatsapp.nombre_contacto');
    console.log('   - ✅ CREATE: vista conversaciones_whatsapp_con_prospecto');
    console.log('   - ✅ CREATE: backup conversaciones_whatsapp_backup_pre_drop_columns_20260124\n');
    
    console.log('🔍 Queries de verificación post-migración:');
    console.log(`
-- 1. Verificar que columnas fueron eliminadas
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'conversaciones_whatsapp'
  AND column_name IN ('numero_telefono', 'nombre_contacto');
-- Esperado: 0 filas

-- 2. Verificar que vista funciona
SELECT COUNT(*) 
FROM conversaciones_whatsapp_con_prospecto
WHERE numero_telefono IS NOT NULL;
-- Esperado: ~${withProspect}

-- 3. Probar búsqueda específica
SELECT 
  c.id,
  p.whatsapp,
  p.nombre_completo
FROM conversaciones_whatsapp c
LEFT JOIN prospectos p ON c.prospecto_id = p.id
WHERE p.whatsapp = '5215522490483';
-- Debe encontrar: prospecto_id = e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b
    `);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TODO LISTO - Código actualizado, migración preparada');
    console.log('⏳ Pendiente: Ejecutar migración SQL en Supabase Dashboard\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar
prepareForMigration();
