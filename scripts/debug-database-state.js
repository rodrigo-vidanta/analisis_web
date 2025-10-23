#!/usr/bin/env node

/**
 * Script para verificar estado real de la base de datos
 * y encontrar por qué las llamadas siguen apareciendo
 */

import { createClient } from '@supabase/supabase-js';

const analysisSupabaseUrl = 'https://glsmifhkoaifvaegsozd.supabase.co';
const analysisSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';

const analysisSupabase = createClient(analysisSupabaseUrl, analysisSupabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function debugDatabaseState() {
  console.log('🔍 DEBUG: ESTADO REAL DE BASE DE DATOS vs FRONTEND');
  console.log('=' .repeat(60));
  
  try {
    // 1. ESTADO REAL EN BD - Tabla directa
    console.log('📊 1. ESTADO REAL EN TABLA llamadas_ventas');
    console.log('-'.repeat(50));
    
    const { data: directCalls, error: directError } = await analysisSupabase
      .from('llamadas_ventas')
      .select('call_id, call_status, prospecto, datos_llamada, duracion_segundos, fecha_llamada')
      .order('fecha_llamada', { ascending: false })
      .limit(20);
    
    if (directError) {
      console.error('❌ Error consultando tabla directa:', directError);
    } else {
      console.log(`Total llamadas en BD: ${directCalls.length}`);
      
      const statusCount = {};
      directCalls.forEach(call => {
        const status = call.call_status || 'null';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });
      
      console.log('Estados en BD directa:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`  - ${status}: ${count} llamadas`);
      });
      
      // Buscar específicamente las llamadas de Samuel
      const samuelCalls = directCalls.filter(call => call.prospecto === 'e6a517ec-b2d3-4b12-a4ca-4b29dfa02c3a');
      console.log(`\n🔍 Llamadas de Samuel en BD: ${samuelCalls.length}`);
      samuelCalls.forEach(call => {
        const now = new Date();
        const callDate = new Date(call.fecha_llamada);
        const hoursAgo = Math.floor((now.getTime() - callDate.getTime()) / (1000 * 60 * 60));
        
        console.log(`  - ${call.call_id.slice(-8)}: ${call.call_status} (hace ${hoursAgo}h)`);
      });
    }
    
    // 2. ESTADO EN VISTA OPTIMIZADA
    console.log('\n📊 2. ESTADO EN VISTA live_monitor_view');
    console.log('-'.repeat(50));
    
    const { data: viewCalls, error: viewError } = await analysisSupabase
      .from('live_monitor_view')
      .select('call_id, call_status_bd, call_status_inteligente, razon_finalizacion, prospecto_id, nombre_completo, minutos_transcurridos')
      .order('fecha_llamada', { ascending: false })
      .limit(20);
    
    if (viewError) {
      console.error('❌ Error consultando vista:', viewError);
    } else {
      console.log(`Total llamadas en vista: ${viewCalls.length}`);
      
      const vistaStatusCount = {};
      viewCalls.forEach(call => {
        const status = call.call_status_inteligente || 'null';
        vistaStatusCount[status] = (vistaStatusCount[status] || 0) + 1;
      });
      
      console.log('Estados inteligentes en vista:');
      Object.entries(vistaStatusCount).forEach(([status, count]) => {
        console.log(`  - ${status}: ${count} llamadas`);
      });
      
      // Buscar llamadas de Samuel en la vista
      const samuelVistaCards = viewCalls.filter(call => 
        call.nombre_completo === 'Samuel Rosales Robledo' || 
        call.prospecto_id === 'e6a517ec-b2d3-4b12-a4ca-4b29dfa02c3a'
      );
      
      console.log(`\n🔍 Llamadas de Samuel en vista: ${samuelVistaCards.length}`);
      samuelVistaCards.forEach(call => {
        console.log(`  - ${call.call_id.slice(-8)}: BD=${call.call_status_bd} → INTELIGENTE=${call.call_status_inteligente} (${call.razon_finalizacion || 'sin razón'}) hace ${Math.round(call.minutos_transcurridos)}min`);
      });
      
      // Verificar llamadas activas en vista
      const activasVista = viewCalls.filter(call => call.call_status_inteligente === 'activa');
      console.log(`\n🟢 Llamadas ACTIVAS en vista: ${activasVista.length}`);
      activasVista.forEach(call => {
        console.log(`  - ${call.call_id.slice(-8)}: ${call.nombre_completo || 'Sin nombre'} (${Math.round(call.minutos_transcurridos)} min)`);
      });
    }
    
    // 3. COMPARAR: ¿Las llamadas problemáticas están en activas?
    console.log('\n🚨 3. VERIFICAR LLAMADAS PROBLEMÁTICAS ESPECÍFICAS');
    console.log('-'.repeat(50));
    
    const problematicIds = ['4306c6bc', '4ee95fec']; // IDs de las llamadas de Samuel
    
    for (const shortId of problematicIds) {
      // Buscar en tabla directa
      const { data: directCheck } = await analysisSupabase
        .from('llamadas_ventas')
        .select('call_id, call_status, prospecto')
        .like('call_id', `%${shortId}%`)
        .single();
      
      // Buscar en vista
      const { data: viewCheck } = await analysisSupabase
        .from('live_monitor_view')
        .select('call_id, call_status_bd, call_status_inteligente, razon_finalizacion')
        .like('call_id', `%${shortId}%`)
        .single();
      
      console.log(`\nLlamada ${shortId}:`);
      console.log(`  BD directa: ${directCheck?.call_status || 'NO ENCONTRADA'}`);
      console.log(`  Vista: BD=${viewCheck?.call_status_bd || 'NO'} → Inteligente=${viewCheck?.call_status_inteligente || 'NO'}`);
      console.log(`  Razón: ${viewCheck?.razon_finalizacion || 'N/A'}`);
    }

  } catch (error) {
    console.error('💥 Error en debug:', error);
  }
}

debugDatabaseState();
