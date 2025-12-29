/**
 * ============================================
 * SCRIPT DE VERIFICACIÓN Y SINCRONIZACIÓN
 * coordinador_coordinaciones → auth_user_coordinaciones
 * ============================================
 * 
 * Propósito: Verificar y sincronizar datos antes de migrar código
 * Fecha: 29 Diciembre 2025
 * Criticidad: ALTA
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zbylezfyagwrxoecioup.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY no encontrada');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface LegacyRecord {
  id: string;
  coordinador_id: string;
  coordinacion_id: string;
  created_at: string;
}

interface NewRecord {
  id: string;
  user_id: string;
  coordinacion_id: string;
  assigned_at: string;
}

async function main() {
  console.log('\n🔍 ============================================');
  console.log('   VERIFICACIÓN DE SINCRONIZACIÓN DE DATOS');
  console.log('============================================\n');

  // PASO 1: Contar registros
  console.log('📊 PASO 1: Contando registros...\n');

  const { count: legacyCount } = await supabase
    .from('coordinador_coordinaciones')
    .select('*', { count: 'exact', head: true });

  const { count: newCount } = await supabase
    .from('auth_user_coordinaciones')
    .select('*', { count: 'exact', head: true });

  console.log(`   Legacy (coordinador_coordinaciones): ${legacyCount} registros`);
  console.log(`   Nueva (auth_user_coordinaciones):   ${newCount} registros`);
  console.log(`   Diferencia:                          ${(legacyCount || 0) - (newCount || 0)} registros\n`);

  // PASO 2: Identificar registros faltantes
  console.log('🔎 PASO 2: Identificando registros faltantes...\n');

  const { data: legacyData, error: legacyError } = await supabase
    .from('coordinador_coordinaciones')
    .select(`
      id,
      coordinador_id,
      coordinacion_id,
      created_at,
      auth_users!coordinador_coordinaciones_coordinador_id_fkey (
        email,
        full_name
      ),
      coordinaciones!coordinador_coordinaciones_coordinacion_id_fkey (
        codigo,
        nombre
      )
    `);

  if (legacyError) {
    console.error('❌ Error obteniendo datos legacy:', legacyError);
    return;
  }

  const { data: newData, error: newError } = await supabase
    .from('auth_user_coordinaciones')
    .select('user_id, coordinacion_id');

  if (newError) {
    console.error('❌ Error obteniendo datos nuevos:', newError);
    return;
  }

  const newSet = new Set(
    (newData || []).map(r => `${r.user_id}|${r.coordinacion_id}`)
  );

  const missing = (legacyData || []).filter(legacy => 
    !newSet.has(`${legacy.coordinador_id}|${legacy.coordinacion_id}`)
  );

  if (missing.length === 0) {
    console.log('   ✅ No hay registros faltantes. Datos sincronizados.\n');
  } else {
    console.log(`   ⚠️  ${missing.length} registros faltantes en tabla nueva:\n`);
    missing.forEach((record: any, index) => {
      const user = Array.isArray(record.auth_users) ? record.auth_users[0] : record.auth_users;
      const coord = Array.isArray(record.coordinaciones) ? record.coordinaciones[0] : record.coordinaciones;
      console.log(`   ${index + 1}. ${user?.full_name || 'Unknown'} (${user?.email}) → ${coord?.codigo || 'Unknown'} (${coord?.nombre})`);
    });
    console.log('');
  }

  // PASO 3: Sincronización (solo si hay registros faltantes)
  if (missing.length > 0) {
    console.log('🔄 PASO 3: Sincronizando registros faltantes...\n');

    const recordsToInsert = missing.map(record => ({
      user_id: record.coordinador_id,
      coordinacion_id: record.coordinacion_id,
      assigned_at: record.created_at,
      assigned_by: null
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('auth_user_coordinaciones')
      .insert(recordsToInsert)
      .select();

    if (insertError) {
      console.error('   ❌ Error insertando registros:', insertError);
      return;
    }

    console.log(`   ✅ ${inserted?.length || 0} registros insertados correctamente\n`);
  }

  // PASO 4: Verificación final
  console.log('✅ PASO 4: Verificación final...\n');

  const { count: finalLegacyCount } = await supabase
    .from('coordinador_coordinaciones')
    .select('*', { count: 'exact', head: true });

  const { count: finalNewCount } = await supabase
    .from('auth_user_coordinaciones')
    .select('*', { count: 'exact', head: true });

  console.log(`   Legacy final: ${finalLegacyCount} registros`);
  console.log(`   Nueva final:  ${finalNewCount} registros`);

  // Verificar si hay discrepancia (puede haber más en nueva si se agregaron manualmente)
  if (finalNewCount && finalLegacyCount && finalNewCount >= finalLegacyCount) {
    console.log('\n   ✅ SINCRONIZACIÓN COMPLETA\n');
    console.log('   Nota: La tabla nueva puede tener MÁS registros si se agregaron manualmente.');
    console.log('   Esto es normal y esperado.\n');
  } else {
    console.log('\n   ⚠️  Aún hay diferencia. Revisar manualmente.\n');
  }

  // PASO 5: Resumen por coordinación
  console.log('📊 PASO 5: Resumen por coordinación...\n');

  const { data: summary, error: summaryError } = await supabase
    .from('auth_user_coordinaciones')
    .select(`
      coordinacion_id,
      coordinaciones!auth_user_coordinaciones_coordinacion_id_fkey (
        codigo,
        nombre
      )
    `);

  if (!summaryError && summary) {
    const counts: Record<string, { codigo: string; nombre: string; count: number }> = {};
    
    summary.forEach((record: any) => {
      const coord = Array.isArray(record.coordinaciones) ? record.coordinaciones[0] : record.coordinaciones;
      const coordId = record.coordinacion_id;
      
      if (!counts[coordId]) {
        counts[coordId] = {
          codigo: coord?.codigo || 'Unknown',
          nombre: coord?.nombre || 'Unknown',
          count: 0
        };
      }
      counts[coordId].count++;
    });

    Object.values(counts)
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
      .forEach(({ codigo, nombre, count }) => {
        console.log(`   ${codigo.padEnd(10)} (${nombre.padEnd(20)}) → ${count} coordinador(es)/supervisor(es)`);
      });
  }

  console.log('\n✅ ============================================');
  console.log('   VERIFICACIÓN COMPLETADA');
  console.log('============================================\n');
}

main().catch(console.error);

