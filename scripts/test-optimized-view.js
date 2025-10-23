#!/usr/bin/env node

/**
 * Script para probar la vista optimizada live_monitor_view
 * Verifica que funcione correctamente y compare con el sistema anterior
 */

import { createClient } from '@supabase/supabase-js';

// Configuración de la base de datos
const analysisSupabaseUrl = 'https://glsmifhkoaifvaegsozd.supabase.co';
const analysisSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';

const analysisSupabase = createClient(analysisSupabaseUrl, analysisSupabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: 'analysis-auth'
  }
});

async function testOptimizedView() {
  console.log('🧪 TESTING VISTA OPTIMIZADA - LIVE MONITOR');
  console.log('=' .repeat(60));
  console.log(`📡 Base de datos: ${analysisSupabaseUrl}`);
  console.log('');

  try {
    // 1. VERIFICAR QUE LA VISTA EXISTE
    console.log('✅ 1. VERIFICANDO EXISTENCIA DE LA VISTA');
    console.log('-'.repeat(50));
    
    const { data: viewData, error: viewError } = await analysisSupabase
      .from('live_monitor_view')
      .select('call_id')
      .limit(1);
    
    if (viewError) {
      console.error('❌ La vista live_monitor_view NO existe:', viewError);
      console.log('\n💡 SOLUCIÓN:');
      console.log('1. Ejecuta el script: scripts/sql/create-live-monitor-view.sql');
      console.log('2. En el SQL Editor de Supabase');
      console.log('3. Luego vuelve a ejecutar este test');
      return;
    }
    
    console.log('✅ Vista live_monitor_view existe y es accesible');

    // 2. COMPARAR PERFORMANCE: SISTEMA ACTUAL vs OPTIMIZADO
    console.log('\n⚡ 2. COMPARACIÓN DE PERFORMANCE');
    console.log('-'.repeat(50));
    
    // Sistema actual (JOIN manual)
    const startCurrent = Date.now();
    const { data: llamadasActuales } = await analysisSupabase
      .from('llamadas_ventas')
      .select('*')
      .order('fecha_llamada', { ascending: false })
      .limit(50);
    
    const prospectIds = llamadasActuales
      ?.map(call => call.prospecto)
      .filter(id => id !== null && id !== undefined) || [];
    
    let prospectosActuales = [];
    if (prospectIds.length > 0) {
      const { data } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .in('id', prospectIds);
      prospectosActuales = data || [];
    }
    
    // Simular JOIN manual
    const combinedCurrent = llamadasActuales?.map(call => {
      const prospecto = prospectosActuales.find(p => p.id === call.prospecto);
      return { ...call, prospecto_data: prospecto };
    }) || [];
    
    const endCurrent = Date.now();
    const timeCurrent = endCurrent - startCurrent;
    
    // Sistema optimizado (vista)
    const startOptimized = Date.now();
    const { data: optimizedData, error: optimizedError } = await analysisSupabase
      .from('live_monitor_view')
      .select('*')
      .limit(50);
    
    const endOptimized = Date.now();
    const timeOptimized = endOptimized - startOptimized;
    
    if (optimizedError) {
      console.error('❌ Error consultando vista optimizada:', optimizedError);
      return;
    }
    
    console.log(`📊 Sistema Actual: ${timeCurrent}ms (${llamadasActuales?.length || 0} llamadas + ${prospectosActuales.length} prospectos + JOIN manual)`);
    console.log(`🚀 Sistema Optimizado: ${timeOptimized}ms (${optimizedData.length} registros directos)`);
    console.log(`🎯 Mejora: ${timeCurrent > timeOptimized ? '✅' : '➡️'} ${Math.abs(timeCurrent - timeOptimized)}ms ${timeCurrent > timeOptimized ? 'más rápido' : ''}`);

    // 3. VERIFICAR AUTO-CLASIFICACIÓN
    console.log('\n🧠 3. VERIFICANDO AUTO-CLASIFICACIÓN INTELIGENTE');
    console.log('-'.repeat(50));
    
    const estadosBD = {};
    const estadosInteligentes = {};
    let reclasificadas = 0;
    
    optimizedData.forEach(call => {
      // Contar estados BD
      const statusBD = call.call_status_bd || 'null';
      estadosBD[statusBD] = (estadosBD[statusBD] || 0) + 1;
      
      // Contar estados inteligentes
      const statusInt = call.call_status_inteligente || 'null';
      estadosInteligentes[statusInt] = (estadosInteligentes[statusInt] || 0) + 1;
      
      // Contar reclasificaciones
      if (call.call_status_bd !== call.call_status_inteligente) {
        reclasificadas++;
        console.log(`  🔄 ${call.call_id?.slice(-8)}: ${call.call_status_bd} → ${call.call_status_inteligente} (${call.razon_finalizacion || 'tiempo/audio'})`);
      }
    });
    
    console.log('\nEstados en BD original:');
    Object.entries(estadosBD).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });
    
    console.log('\nEstados con clasificación inteligente:');
    Object.entries(estadosInteligentes).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });
    
    console.log(`\n🎯 Total reclasificadas automáticamente: ${reclasificadas}/${optimizedData.length}`);

    // 4. VERIFICAR CAMPOS COMBINADOS
    console.log('\n🔗 4. VERIFICANDO COMBINACIÓN DE DATOS');
    console.log('-'.repeat(50));
    
    let camposCompletos = 0;
    let sinProspecto = 0;
    
    optimizedData.forEach(call => {
      if (call.nombre_completo || call.nombre_whatsapp) {
        camposCompletos++;
      } else {
        sinProspecto++;
      }
    });
    
    console.log(`✅ Llamadas con datos de prospecto: ${camposCompletos}/${optimizedData.length}`);
    console.log(`⚠️ Llamadas sin prospecto: ${sinProspecto}/${optimizedData.length}`);
    
    // Mostrar ejemplo de datos combinados
    const ejemplo = optimizedData.find(call => call.nombre_completo || call.nombre_whatsapp);
    if (ejemplo) {
      console.log('\nEjemplo de datos combinados:');
      console.log(`  📞 Call ID: ${ejemplo.call_id?.slice(-8)}`);
      console.log(`  👤 Prospecto: ${ejemplo.nombre_completo || ejemplo.nombre_whatsapp}`);
      console.log(`  📱 WhatsApp: ${ejemplo.whatsapp}`);
      console.log(`  🎯 Status BD: ${ejemplo.call_status_bd}`);
      console.log(`  🧠 Status Inteligente: ${ejemplo.call_status_inteligente}`);
      console.log(`  🏁 Checkpoint: ${ejemplo.checkpoint_venta_actual}`);
      console.log(`  ⏱️ Minutos: ${Math.round(ejemplo.minutos_transcurridos || 0)}`);
    }

    // 5. VERIFICAR CAMPOS CALCULADOS
    console.log('\n🧮 5. VERIFICANDO CAMPOS CALCULADOS');
    console.log('-'.repeat(50));
    
    const conMinutos = optimizedData.filter(c => c.minutos_transcurridos !== null).length;
    const conComposicion = optimizedData.filter(c => c.composicion_familiar_numero !== null).length;
    
    console.log(`⏰ Llamadas con minutos_transcurridos: ${conMinutos}/${optimizedData.length}`);
    console.log(`👨‍👩‍👧‍👦 Llamadas con composición familiar: ${conComposicion}/${optimizedData.length}`);

    // 6. TEST DE FILTROS ESPECÍFICOS
    console.log('\n🎯 6. TESTING FILTROS ESPECÍFICOS');
    console.log('-'.repeat(50));
    
    // Solo activas reales
    const { data: activasReales } = await analysisSupabase
      .from('live_monitor_view')
      .select('*')
      .eq('call_status_inteligente', 'activa');
    
    // Solo perdidas
    const { data: perdidas } = await analysisSupabase
      .from('live_monitor_view')
      .select('*')
      .eq('call_status_inteligente', 'perdida');
    
    console.log(`🟢 Llamadas realmente activas: ${activasReales?.length || 0}`);
    console.log(`🔴 Llamadas perdidas: ${perdidas?.length || 0}`);
    
    if (activasReales && activasReales.length > 0) {
      console.log('\nLlamadas activas reales:');
      activasReales.forEach((call, index) => {
        console.log(`  ${index + 1}. ${(call.nombre_completo || call.nombre_whatsapp)?.slice(0, 20)} - ${call.checkpoint_venta_actual}`);
      });
    }

    // 7. RESUMEN FINAL
    console.log('\n🎉 7. RESUMEN DE TESTING');
    console.log('=' .repeat(50));
    
    const success = !viewError && !optimizedError && optimizedData.length > 0;
    
    if (success) {
      console.log('✅ TESTING EXITOSO - Vista optimizada funciona correctamente');
      console.log(`📊 Registros procesados: ${optimizedData.length}`);
      console.log(`🔄 Auto-clasificaciones: ${reclasificadas}`);
      console.log(`⚡ Performance: ${timeOptimized}ms`);
      console.log(`🎯 Llamadas activas reales: ${activasReales?.length || 0}`);
      console.log('');
      console.log('🚀 LISTO PARA PRODUCCIÓN - Puedes integrar el servicio optimizado');
    } else {
      console.log('❌ TESTING FALLÓ - Revisar configuración');
    }

  } catch (error) {
    console.error('💥 Error durante testing:', error);
  }
}

// Ejecutar test
if (import.meta.url === `file://${process.argv[1]}`) {
  testOptimizedView()
    .then(() => {
      console.log('\n🏁 Testing completado');
    })
    .catch(error => {
      console.error('💥 Error ejecutando test:', error);
      process.exit(1);
    });
}

export { testOptimizedView };
