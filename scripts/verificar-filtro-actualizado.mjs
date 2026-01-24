#!/usr/bin/env node
/**
 * Verificar que el filtro de ejecutivos ahora incluye supervisores y coordinadores
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(dirname(__dirname), '.env.local') });

const url = process.env.VITE_ANALYSIS_SUPABASE_URL;
const anonKey = process.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;

const supabase = createClient(url, anonKey);

console.log('🔍 VERIFICACIÓN: Filtro de Ejecutivos Actualizado\n');

async function verificar() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('1️⃣ Consulta ANTERIOR (solo ejecutivos)');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const { data: soloEjecutivos, error: error1 } = await supabase
    .from('user_profiles_v2')
    .select('id, email, full_name, role_name, is_active')
    .eq('role_name', 'ejecutivo')
    .eq('is_active', true)
    .order('full_name');

  if (error1) {
    console.log('❌ Error:', error1.message);
  } else {
    console.log(`📊 Total usuarios (solo ejecutivos): ${soloEjecutivos.length}`);
    
    const issel = soloEjecutivos.find(u => u.email === 'isselrico@vidavacations.com');
    console.log(`❌ Issel Rico encontrado: ${issel ? 'SÍ' : 'NO'}\n`);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('2️⃣ Consulta NUEVA (ejecutivos + coordinadores + supervisores)');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const { data: todosRoles, error: error2 } = await supabase
    .from('user_profiles_v2')
    .select('id, email, full_name, role_name, is_active')
    .in('role_name', ['ejecutivo', 'coordinador', 'supervisor'])
    .eq('is_active', true)
    .order('full_name');

  if (error2) {
    console.log('❌ Error:', error2.message);
  } else {
    console.log(`📊 Total usuarios (todos los roles): ${todosRoles.length}`);
    
    const issel = todosRoles.find(u => u.email === 'isselrico@vidavacations.com');
    if (issel) {
      console.log('✅ Issel Rico encontrado:');
      console.log('   Email:', issel.email);
      console.log('   Nombre:', issel.full_name);
      console.log('   Rol:', issel.role_name);
      console.log('   Activo:', issel.is_active);
      console.log('');
    } else {
      console.log('❌ Issel Rico NO encontrado\n');
    }
    
    // Estadísticas por rol
    const porRol = {};
    todosRoles.forEach(u => {
      porRol[u.role_name] = (porRol[u.role_name] || 0) + 1;
    });
    
    console.log('📊 Distribución por rol:');
    Object.entries(porRol).forEach(([rol, count]) => {
      console.log(`   ${rol}: ${count}`);
    });
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('3️⃣ RESUMEN');
  console.log('═══════════════════════════════════════════════════════\n');
  
  if (soloEjecutivos && todosRoles) {
    const diferencia = todosRoles.length - soloEjecutivos.length;
    console.log(`✅ Se agregaron ${diferencia} usuarios al filtro`);
    console.log(`   (${soloEjecutivos.length} ejecutivos + ${diferencia} coordinadores/supervisores)`);
    console.log('');
    
    const issel = todosRoles.find(u => u.email === 'isselrico@vidavacations.com');
    if (issel) {
      console.log('✅ Issel Rico ahora APARECERÁ en el filtro de ejecutivos');
      console.log('   Motivo: Se incluyó el rol "supervisor" en la consulta');
      console.log('');
    }
  }
  
  console.log('📋 PRÓXIMOS PASOS:');
  console.log('   1. Recargar el módulo de Prospectos (F5)');
  console.log('   2. Abrir el dropdown de "Ejecutivo"');
  console.log('   3. Buscar "Issel Rico" - debería aparecer ahora');
  console.log('');
}

verificar().catch(console.error);
