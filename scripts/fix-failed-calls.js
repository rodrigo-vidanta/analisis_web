#!/usr/bin/env node

/**
 * Script para corregir llamadas que aparecen como activas pero nunca se contestaron
 * Basado en el análisis del Live Monitor
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configuración de la base de datos Natalia
const analysisSupabaseUrl = 'https://glsmifhkoaifvaegsozd.supabase.co';
const analysisSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';

const analysisSupabase = createClient(analysisSupabaseUrl, analysisSupabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: 'analysis-auth'
  }
});

/**
 * Identificar llamadas que deberían marcarse como fallidas
 */
async function identifyFailedCalls() {
  console.log('🔍 IDENTIFICANDO LLAMADAS FALLIDAS');
  console.log('=' .repeat(50));

  try {
    const { data: calls, error } = await analysisSupabase
      .from('llamadas_ventas')
      .select('call_id, call_status, duracion_segundos, audio_ruta_bucket, fecha_llamada, datos_llamada')
      .eq('call_status', 'activa')
      .order('fecha_llamada', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo llamadas:', error);
      return [];
    }

    const failedCalls = [];
    const now = new Date();

    calls.forEach(call => {
      const callDate = new Date(call.fecha_llamada);
      const minutesAgo = Math.floor((now.getTime() - callDate.getTime()) / (1000 * 60));
      
      // Criterios para identificar llamadas fallidas
      let shouldMarkAsFailed = false;
      let reason = '';

      // 1. Verificar razon_finalizacion en datos_llamada
      try {
        const datosLlamada = typeof call.datos_llamada === 'string' 
          ? JSON.parse(call.datos_llamada) 
          : call.datos_llamada;
        
        if (datosLlamada && datosLlamada.razon_finalizacion) {
          const razon = datosLlamada.razon_finalizacion;
          if (razon === 'customer-did-not-answer' || 
              razon === 'customer-ended-call' ||
              razon === 'no-answer' ||
              razon.includes('not-answer')) {
            shouldMarkAsFailed = true;
            reason = `Razón VAPI: ${razon}`;
          }
        }
      } catch (e) {
        console.warn(`⚠️ Error parseando datos_llamada para ${call.call_id}:`, e.message);
      }

      // 2. Duración cero o muy corta + sin audio
      if (!shouldMarkAsFailed && 
          (call.duracion_segundos === 0 || call.duracion_segundos === null) && 
          !call.audio_ruta_bucket) {
        shouldMarkAsFailed = true;
        reason = 'Duración 0s y sin audio';
      }

      // 3. Llamadas muy antiguas (más de 1 hora)
      if (!shouldMarkAsFailed && minutesAgo > 60) {
        shouldMarkAsFailed = true;
        reason = `Llamada muy antigua: ${minutesAgo} minutos`;
      }

      // 4. Duración muy corta (menos de 30 segundos) + más de 30 minutos
      if (!shouldMarkAsFailed && 
          call.duracion_segundos > 0 && 
          call.duracion_segundos < 30 && 
          minutesAgo > 30) {
        shouldMarkAsFailed = true;
        reason = `Duración muy corta: ${call.duracion_segundos}s hace ${minutesAgo} min`;
      }

      if (shouldMarkAsFailed) {
        failedCalls.push({
          call_id: call.call_id,
          fecha_llamada: call.fecha_llamada,
          duracion_segundos: call.duracion_segundos,
          audio_ruta_bucket: call.audio_ruta_bucket,
          minutesAgo,
          reason
        });
      }
    });

    console.log(`📊 Llamadas analizadas: ${calls.length}`);
    console.log(`🚨 Llamadas a marcar como fallidas: ${failedCalls.length}`);
    
    if (failedCalls.length > 0) {
      console.log('\nDetalles:');
      failedCalls.forEach((call, index) => {
        console.log(`${index + 1}. ${call.call_id.slice(-8)} - ${call.reason} - Hace ${call.minutesAgo}min`);
      });
    }

    return failedCalls;

  } catch (error) {
    console.error('💥 Error identificando llamadas fallidas:', error);
    return [];
  }
}

/**
 * Marcar llamadas como perdidas/fallidas
 */
async function markCallsAsFailed(failedCalls, dryRun = true) {
  console.log('\n🔧 ACTUALIZANDO LLAMADAS FALLIDAS');
  console.log('=' .repeat(50));
  
  if (dryRun) {
    console.log('🧪 MODO DRY RUN - No se realizarán cambios reales');
  } else {
    console.log('⚡ MODO REAL - Se actualizarán las llamadas');
  }

  const results = {
    success: [],
    failed: []
  };

  for (const call of failedCalls) {
    try {
      if (dryRun) {
        console.log(`✅ [DRY RUN] Marcaría como perdida: ${call.call_id.slice(-8)} - ${call.reason}`);
        results.success.push(call);
      } else {
        // Actualizar el estado de la llamada
        const { error } = await analysisSupabase
          .from('llamadas_ventas')
          .update({
            call_status: 'perdida',
            // Limpiar URLs ya que la llamada terminó
            monitor_url: null,
            control_url: null
          })
          .eq('call_id', call.call_id);

        if (error) {
          console.error(`❌ Error actualizando ${call.call_id.slice(-8)}:`, error);
          results.failed.push({ call, error });
        } else {
          console.log(`✅ Actualizada: ${call.call_id.slice(-8)} → perdida - ${call.reason}`);
          results.success.push(call);
        }

        // Pequeña pausa para no sobrecargar la BD
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`💥 Error procesando ${call.call_id.slice(-8)}:`, error);
      results.failed.push({ call, error });
    }
  }

  console.log('\n📊 RESUMEN DE ACTUALIZACIONES:');
  console.log(`✅ Exitosas: ${results.success.length}`);
  console.log(`❌ Fallidas: ${results.failed.length}`);

  return results;
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--apply');
  
  console.log('🚀 CORRECCIÓN DE LLAMADAS FALLIDAS - LIVE MONITOR');
  console.log('=' .repeat(60));
  console.log(`Fecha: ${new Date().toLocaleString('es-MX')}`);
  
  if (isDryRun) {
    console.log('📝 Modo: DRY RUN (usa --apply para aplicar cambios)');
  } else {
    console.log('⚡ Modo: APLICAR CAMBIOS REALES');
  }
  console.log('');

  // 1. Identificar llamadas fallidas
  const failedCalls = await identifyFailedCalls();
  
  if (failedCalls.length === 0) {
    console.log('\n🎉 ¡No se encontraron llamadas que necesiten corrección!');
    return;
  }

  // 2. Marcar como fallidas
  const results = await markCallsAsFailed(failedCalls, isDryRun);

  // 3. Guardar reporte
  const report = {
    timestamp: new Date().toISOString(),
    mode: isDryRun ? 'DRY_RUN' : 'APPLIED',
    totalAnalyzed: failedCalls.length,
    results: results
  };

  const reportFile = `live-monitor-fix-report-${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Reporte guardado en: ${reportFile}`);
  
  if (isDryRun) {
    console.log('\n💡 Para aplicar los cambios, ejecuta:');
    console.log('   node scripts/fix-failed-calls.js --apply');
  } else {
    console.log('\n✅ Corrección completada. Las llamadas ahora aparecerán en "Fallidas" en el Live Monitor.');
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Error ejecutando script:', error);
    process.exit(1);
  });
}

export { identifyFailedCalls, markCallsAsFailed };
