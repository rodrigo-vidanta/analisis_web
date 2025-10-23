#!/usr/bin/env node

/**
 * Script para analizar las llamadas del Live Monitor
 * Conecta a la base de datos Natalia y diagnostica llamadas activas que nunca se contestaron
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

async function analyzeDatabase() {
  console.log('🔍 ANÁLISIS DEL LIVE MONITOR - BASE DE DATOS NATALIA');
  console.log('=' .repeat(60));
  console.log(`📡 Conectando a: ${analysisSupabaseUrl}`);
  console.log('');

  try {
    // 1. Obtener esquema de la tabla llamadas_ventas
    console.log('📋 1. ESQUEMA DE LA TABLA llamadas_ventas');
    console.log('-'.repeat(50));
    
    const { data: columns, error: columnsError } = await analysisSupabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'llamadas_ventas')
      .eq('table_schema', 'public');

    if (columnsError) {
      console.error('❌ Error obteniendo esquema:', columnsError);
    } else {
      console.log(`Encontradas ${columns.length} columnas:`);
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }
    console.log('');

    // 2. Obtener estadísticas generales de llamadas
    console.log('📊 2. ESTADÍSTICAS GENERALES DE LLAMADAS');
    console.log('-'.repeat(50));
    
    const { data: stats, error: statsError } = await analysisSupabase
      .from('llamadas_ventas')
      .select('call_status, duracion_segundos, audio_ruta_bucket, fecha_llamada')
      .order('fecha_llamada', { ascending: false })
      .limit(100);

    if (statsError) {
      console.error('❌ Error obteniendo estadísticas:', statsError);
    } else {
      console.log(`Total de llamadas analizadas: ${stats.length}`);
      
      // Agrupar por status
      const statusCount = {};
      const problematicCalls = [];
      
      stats.forEach(call => {
        const status = call.call_status || 'sin_estado';
        statusCount[status] = (statusCount[status] || 0) + 1;
        
        // Identificar llamadas problemáticas
        if (call.call_status === 'activa' && 
            (call.duracion_segundos === 0 || call.duracion_segundos < 60) && 
            !call.audio_ruta_bucket) {
          problematicCalls.push({
            call_id: call.call_id || 'N/A',
            status: call.call_status,
            duracion: call.duracion_segundos,
            audio: call.audio_ruta_bucket ? 'SÍ' : 'NO',
            fecha: new Date(call.fecha_llamada).toLocaleString('es-MX')
          });
        }
      });
      
      console.log('Estado de llamadas:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`  - ${status}: ${count} llamadas`);
      });
      
      console.log('');
      console.log(`🚨 LLAMADAS PROBLEMÁTICAS ENCONTRADAS: ${problematicCalls.length}`);
      console.log('   (Marcadas como activas pero probablemente nunca se contestaron)');
      console.log('');
      
      if (problematicCalls.length > 0) {
        console.log('Detalles de llamadas problemáticas:');
        problematicCalls.slice(0, 10).forEach((call, index) => {
          console.log(`  ${index + 1}. Duración: ${call.duracion}s | Audio: ${call.audio} | Fecha: ${call.fecha}`);
        });
        
        if (problematicCalls.length > 10) {
          console.log(`  ... y ${problematicCalls.length - 10} más`);
        }
      }
    }
    console.log('');

    // 3. Analizar patrones de llamadas activas vs finalizadas
    console.log('🔍 3. ANÁLISIS DE PATRONES DE LLAMADAS');
    console.log('-'.repeat(50));
    
    const { data: activeCalls, error: activeError } = await analysisSupabase
      .from('llamadas_ventas')
      .select('call_id, call_status, duracion_segundos, audio_ruta_bucket, fecha_llamada, datos_llamada')
      .eq('call_status', 'activa')
      .order('fecha_llamada', { ascending: false });

    if (activeError) {
      console.error('❌ Error obteniendo llamadas activas:', activeError);
    } else {
      console.log(`Llamadas marcadas como activas: ${activeCalls.length}`);
      
      let reallyActive = 0;
      let probablyFailed = 0;
      let needsAnalysis = 0;
      
      activeCalls.forEach(call => {
        const now = new Date();
        const callDate = new Date(call.fecha_llamada);
        const minutesAgo = Math.floor((now.getTime() - callDate.getTime()) / (1000 * 60));
        
        if (minutesAgo > 30) { // Llamadas de más de 30 minutos
          if (call.duracion_segundos === 0 && !call.audio_ruta_bucket) {
            probablyFailed++;
          } else {
            needsAnalysis++;
          }
        } else {
          reallyActive++;
        }
      });
      
      console.log(`  - Realmente activas (< 30 min): ${reallyActive}`);
      console.log(`  - Probablemente fallidas (> 30 min, 0s, sin audio): ${probablyFailed}`);
      console.log(`  - Necesitan análisis manual: ${needsAnalysis}`);
    }
    console.log('');

    // 4. Verificar si hay campos adicionales útiles
    console.log('🔎 4. CAMPOS ADICIONALES PARA FILTRADO');
    console.log('-'.repeat(50));
    
    const { data: sampleCall, error: sampleError } = await analysisSupabase
      .from('llamadas_ventas')
      .select('*')
      .not('datos_llamada', 'is', null)
      .limit(1)
      .single();

    if (!sampleError && sampleCall) {
      console.log('Campos disponibles en datos_llamada:');
      try {
        const datosLlamada = typeof sampleCall.datos_llamada === 'string' 
          ? JSON.parse(sampleCall.datos_llamada) 
          : sampleCall.datos_llamada;
        
        if (datosLlamada && typeof datosLlamada === 'object') {
          Object.keys(datosLlamada).forEach(key => {
            console.log(`  - ${key}: ${typeof datosLlamada[key]} = ${JSON.stringify(datosLlamada[key]).substring(0, 50)}...`);
          });
        } else {
          console.log('  No hay datos_llamada válidos');
        }
      } catch (e) {
        console.log('  Error parseando datos_llamada:', e.message);
      }
    } else {
      console.log('  No se encontraron datos de llamada para analizar');
    }
    console.log('');

    // 5. Recomendaciones
    console.log('💡 5. RECOMENDACIONES PARA FILTRADO');
    console.log('-'.repeat(50));
    console.log('Criterios sugeridos para marcar llamadas como fallidas:');
    console.log('  1. call_status = "activa" AND duracion_segundos = 0 AND audio_ruta_bucket IS NULL');
    console.log('  2. call_status = "activa" AND fecha_llamada < NOW() - INTERVAL \'30 minutes\'');
    console.log('  3. call_status = "activa" AND duracion_segundos < 60 AND NO hay audio');
    console.log('');
    console.log('Campos a verificar en datos_llamada si están disponibles:');
    console.log('  - end_call_reason (razón de finalización)');
    console.log('  - call_duration (duración real de VAPI)');
    console.log('  - answered (si la llamada fue contestada)');
    console.log('  - status (estado interno de VAPI)');

    return {
      totalCalls: stats?.length || 0,
      activeCalls: activeCalls?.length || 0,
      problematicCount: problematicCalls.length,
      problematicCalls: problematicCalls.slice(0, 10)
    };

  } catch (error) {
    console.error('💥 Error durante el análisis:', error);
    return null;
  }
}

// Ejecutar análisis si este archivo se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeDatabase()
    .then(result => {
      if (result) {
        console.log('\n✅ Análisis completado exitosamente');
        
        // Guardar resumen en archivo
        const summary = {
          timestamp: new Date().toISOString(),
          analysis: result
        };
        
        fs.writeFileSync('live-monitor-analysis-result.json', JSON.stringify(summary, null, 2));
        console.log('📄 Resumen guardado en: live-monitor-analysis-result.json');
      } else {
        console.log('\n❌ Análisis falló');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Error ejecutando análisis:', error);
      process.exit(1);
    });
}

export { analyzeDatabase };
