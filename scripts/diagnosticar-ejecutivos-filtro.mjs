#!/usr/bin/env node
/**
 * Script de diagnóstico para el problema de filtros de ejecutivos en Prospectos
 * 
 * Problema: El filtro de ejecutivo en ProspectosManager no muestra a Issel Rico
 * Causa posible: Vista user_profiles_v2 no existe o no tiene datos
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const PQNC_AI_URL = process.env.VITE_ANALYSIS_SUPABASE_URL;
const PQNC_AI_ANON_KEY = process.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;

if (!PQNC_AI_URL || !PQNC_AI_ANON_KEY) {
  console.error('❌ Faltan variables de entorno VITE_ANALYSIS_SUPABASE_URL o VITE_ANALYSIS_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(PQNC_AI_URL, PQNC_AI_ANON_KEY);

console.log('📊 DIAGNÓSTICO: Filtro de Ejecutivos en Prospectos\n');
console.log('🔗 URL:', PQNC_AI_URL);
console.log('');

async function diagnosticar() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('1️⃣ VERIFICAR: ¿Existe la vista user_profiles_v2?');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Intentar consultar la vista
  const { data: vistaDatos, error: vistaError } = await supabase
    .from('user_profiles_v2')
    .select('id, email, full_name, role_name, is_active')
    .eq('role_name', 'ejecutivo')
    .limit(5);

  if (vistaError) {
    console.log('❌ ERROR al consultar user_profiles_v2:');
    console.log('   Código:', vistaError.code);
    console.log('   Mensaje:', vistaError.message);
    console.log('   Detalle:', vistaError.details);
    console.log('\n⚠️ CAUSA: La vista user_profiles_v2 NO existe o tiene problemas de permisos\n');
    
    // Verificar si existe en auth.users directamente
    console.log('═══════════════════════════════════════════════════════════');
    console.log('2️⃣ VERIFICAR: ¿Existen usuarios en auth.users?');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id, email, raw_user_meta_data')
      .limit(5);
      
    if (authError) {
      console.log('❌ ERROR al consultar auth.users:');
      console.log('   Mensaje:', authError.message);
      console.log('\n⚠️ CAUSA: No se puede acceder a auth.users con anon_key\n');
      console.log('   Esto es normal por seguridad. Necesitamos crear la vista user_profiles_v2.\n');
    } else {
      console.log('✅ auth.users accesible, encontrados:', authUsers?.length || 0, 'usuarios');
    }
    
    console.log('\n📋 SOLUCIÓN:');
    console.log('   Ejecutar: scripts/fix-user-profiles-v2-view.sql en Supabase Dashboard');
    console.log('   Este script creará la vista user_profiles_v2 con los permisos correctos\n');
    
    return false;
  }

  console.log('✅ Vista user_profiles_v2 accesible');
  console.log('   Ejecutivos encontrados:', vistaDatos?.length || 0);
  
  if (vistaDatos && vistaDatos.length > 0) {
    console.log('\n📋 Ejecutivos activos en la vista:\n');
    vistaDatos.forEach((ej, i) => {
      console.log(`   ${i + 1}. ${ej.full_name || 'SIN NOMBRE'}`);
      console.log(`      Email: ${ej.email}`);
      console.log(`      Activo: ${ej.is_active ? '✅ Sí' : '❌ No'}`);
      console.log('');
    });
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('3️⃣ BUSCAR: ¿Existe "Issel Rico" en la vista?');
  console.log('═══════════════════════════════════════════════════════════\n');

  const { data: todosEjecutivos, error: errorTodos } = await supabase
    .from('user_profiles_v2')
    .select('id, email, full_name, role_name, is_active, coordinacion_id')
    .eq('role_name', 'ejecutivo');

  if (errorTodos) {
    console.log('❌ ERROR:', errorTodos.message);
    return false;
  }

  console.log(`📊 Total de ejecutivos en la BD: ${todosEjecutivos?.length || 0}\n`);

  // Buscar a Issel
  const issel = todosEjecutivos?.find(e => 
    e.full_name?.toLowerCase().includes('issel') ||
    e.email?.toLowerCase().includes('issel')
  );

  if (issel) {
    console.log('✅ ¡ENCONTRADO! Issel Rico existe:\n');
    console.log('   ID:', issel.id);
    console.log('   Email:', issel.email);
    console.log('   Nombre completo:', issel.full_name);
    console.log('   Activo:', issel.is_active ? '✅ Sí' : '❌ No');
    console.log('   Coordinación ID:', issel.coordinacion_id || 'SIN ASIGNAR');
    console.log('');
    
    if (!issel.is_active) {
      console.log('⚠️ PROBLEMA: Issel Rico existe pero is_active = false');
      console.log('   El filtro en ProspectosManager solo muestra ejecutivos activos');
      console.log('   (línea 1086: .filter(e => e.is_active))');
      console.log('');
      console.log('📋 SOLUCIÓN:');
      console.log('   1. Activar a Issel Rico en el módulo de Usuarios');
      console.log('   2. O modificar el código para mostrar ejecutivos inactivos\n');
    } else if (!issel.coordinacion_id) {
      console.log('⚠️ POSIBLE PROBLEMA: Issel Rico no tiene coordinación asignada');
      console.log('   Si aplicas filtro de coordinación, no aparecerá');
      console.log('');
      console.log('📋 SOLUCIÓN:');
      console.log('   Asignar una coordinación a Issel Rico en el módulo de Coordinaciones\n');
    } else {
      console.log('✅ Issel Rico está correctamente configurado');
      console.log('   Debería aparecer en el filtro de ejecutivos\n');
    }
  } else {
    console.log('❌ NO ENCONTRADO: Issel Rico no existe en la base de datos');
    console.log('\n📋 Búsqueda por nombre parcial:\n');
    
    const posiblesMatches = todosEjecutivos?.filter(e => 
      e.full_name?.toLowerCase().includes('rico') ||
      e.full_name?.toLowerCase().includes('isse')
    );
    
    if (posiblesMatches && posiblesMatches.length > 0) {
      console.log('   Posibles coincidencias:');
      posiblesMatches.forEach(e => {
        console.log(`   - ${e.full_name} (${e.email}) - Activo: ${e.is_active}`);
      });
      console.log('');
    } else {
      console.log('   No se encontraron coincidencias parciales');
      console.log('');
    }
    
    console.log('📋 SOLUCIÓN:');
    console.log('   1. Verificar que el usuario existe en el módulo de Usuarios');
    console.log('   2. Verificar que el rol sea "ejecutivo"');
    console.log('   3. Verificar que el campo full_name contenga "Issel Rico"\n');
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('4️⃣ VERIFICAR: Coordinaciones disponibles');
  console.log('═══════════════════════════════════════════════════════════\n');

  const { data: coordinaciones, error: errorCoord } = await supabase
    .from('coordinaciones')
    .select('id, nombre, codigo')
    .eq('is_active', true);

  if (errorCoord) {
    console.log('❌ ERROR al consultar coordinaciones:', errorCoord.message);
  } else {
    console.log(`📊 Total de coordinaciones activas: ${coordinaciones?.length || 0}\n`);
    if (coordinaciones && coordinaciones.length > 0) {
      coordinaciones.slice(0, 5).forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.nombre} (${c.codigo})`);
      });
      console.log('');
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('5️⃣ RESUMEN Y RECOMENDACIONES');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (issel) {
    if (issel.is_active && issel.coordinacion_id) {
      console.log('✅ Todo parece estar correcto');
      console.log('   Si aún no aparece en el filtro, verificar:');
      console.log('   1. Recargar el módulo de Prospectos (F5)');
      console.log('   2. Verificar que no haya errores en la consola del navegador');
      console.log('   3. Verificar que coordinacionService.getAllEjecutivos() esté funcionando\n');
    } else {
      console.log('⚠️ Problema encontrado con Issel Rico');
      console.log('   Ver detalles arriba en la sección 3️⃣\n');
    }
  } else {
    console.log('❌ Issel Rico no existe en la base de datos');
    console.log('   Debe ser creado en el módulo de Usuarios con rol "ejecutivo"\n');
  }

  return true;
}

diagnosticar()
  .then(() => {
    console.log('✅ Diagnóstico completado\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error durante el diagnóstico:', error);
    process.exit(1);
  });
