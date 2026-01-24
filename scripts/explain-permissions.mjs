#!/usr/bin/env node
/**
 * Script para verificar permisos y entender por qué un prospecto no aparece
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://glsmifhkoaifvaegsozd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PROSPECTO_ID = 'e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b';

async function checkPermissions() {
  console.log('🔍 VERIFICACIÓN DE PERMISOS Y FILTROS\n');
  console.log('Para entender por qué el prospecto NO aparece en la búsqueda\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📝 INFORMACIÓN NECESARIA DEL USUARIO:');
  console.log('   Por favor proporciona:');
  console.log('   1. ¿Qué rol tienes? (Admin, Coordinador, Ejecutivo)');
  console.log('   2. Si eres Coordinador: ¿Qué coordinaciones tienes asignadas?');
  console.log('   3. Si eres Ejecutivo: ¿Cuál es tu ID de usuario?');
  console.log('   4. ¿Puedes ver OTROS prospectos de COBACA en el módulo WhatsApp?\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📊 DATOS DEL PROSPECTO "ROSARIO":');
  console.log('   ID: e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b');
  console.log('   Coordinación: COBACA');
  console.log('   Ejecutivo: Gutierrez Arredondo\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('🔍 ESCENARIOS POSIBLES:\n');
  
  console.log('1️⃣ SI ERES ADMIN:');
  console.log('   ✅ Deberías ver TODOS los prospectos');
  console.log('   ✅ Deberías ver el prospecto "Rosario"');
  console.log('   ❌ Si no lo ves: Problema en la función get_dashboard_conversations\n');
  
  console.log('2️⃣ SI ERES COORDINADOR:');
  console.log('   ✅ Solo ves prospectos de tus coordinaciones asignadas');
  console.log('   ❓ ¿Tienes COBACA en tus coordinaciones?');
  console.log('      - SÍ → Deberías ver a "Rosario"');
  console.log('      - NO → Es normal que NO aparezca (filtro de permisos correcto)\n');
  
  console.log('3️⃣ SI ERES EJECUTIVO:');
  console.log('   ✅ Solo ves TUS prospectos asignados');
  console.log('   ❓ ¿Eres "Gutierrez Arredondo"?');
  console.log('      - SÍ → Deberías ver a "Rosario"');
  console.log('      - NO → Es normal que NO aparezca (no es tu prospecto)\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('🎯 DIAGNÓSTICO SEGÚN TU ROL:\n');
  console.log('   Caso A: "Soy admin y NO veo a Rosario"');
  console.log('      → Problema técnico en la función RPC');
  console.log('      → Verificar get_dashboard_conversations\n');
  
  console.log('   Caso B: "Soy coordinador de COBACA y NO veo a Rosario"');
  console.log('      → Problema técnico (deberías verlo)');
  console.log('      → Verificar filtro de coordinación\n');
  
  console.log('   Caso C: "Soy coordinador de OTRA coordinación"');
  console.log('      → ✅ CORRECTO - No deberías ver a Rosario');
  console.log('      → Filtro de permisos funciona bien\n');
  
  console.log('   Caso D: "Soy Gutierrez Arredondo y NO veo a Rosario"');
  console.log('      → Problema técnico (es TU prospecto)');
  console.log('      → Verificar filtro de ejecutivo\n');
  
  console.log('   Caso E: "Soy OTRO ejecutivo"');
  console.log('      → ✅ CORRECTO - No deberías ver a Rosario');
  console.log('      → Es prospecto de otro ejecutivo\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('🔧 PRUEBA PARA IDENTIFICAR EL PROBLEMA:\n');
  console.log('   1. Busca OTRO prospecto de COBACA');
  console.log('   2. Si encuentras otros de COBACA:');
  console.log('      → El filtro de coordinación funciona');
  console.log('      → Problema específico con este prospecto');
  console.log('   3. Si NO encuentras ninguno de COBACA:');
  console.log('      → No tienes acceso a COBACA (permisos correctos)\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📋 PREGUNTAS PARA RESOLVER:');
  console.log('   1. ¿Cuál es tu rol?');
  console.log('   2. ¿Puedes ver otros prospectos de COBACA?');
  console.log('   3. ¿El filtro muestra algún prospecto al buscar?');
  console.log('   4. ¿Cuántos prospectos totales ves en el módulo WhatsApp?\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkPermissions();
