#!/usr/bin/env node

/**
 * Script para verificar tipos exactos de columnas en las tablas
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

async function checkColumnTypes() {
  console.log('🔍 VERIFICANDO TIPOS DE COLUMNAS');
  console.log('=' .repeat(50));
  
  try {
    // Obtener información de esquema de ambas tablas
    const { data: llamadasSchema, error: llamadasError } = await analysisSupabase.rpc('exec_sql', {
      query: `
        SELECT column_name, data_type, udt_name, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'llamadas_ventas' 
        AND table_schema = 'public'
        ORDER BY column_name;
      `
    });

    const { data: prospectosSchema, error: prospectosError } = await analysisSupabase.rpc('exec_sql', {
      query: `
        SELECT column_name, data_type, udt_name, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'prospectos' 
        AND table_schema = 'public'
        ORDER BY column_name;
      `
    });

    if (llamadasError) {
      console.error('❌ Error con llamadas_ventas:', llamadasError);
      // Fallback: obtener muestra de datos
      const { data: sample1 } = await analysisSupabase
        .from('llamadas_ventas')
        .select('destino_preferido, composicion_familiar_numero, preferencia_vacaciones')
        .limit(1)
        .single();
      
      if (sample1) {
        console.log('📊 MUESTRA llamadas_ventas:');
        Object.entries(sample1).forEach(([key, value]) => {
          console.log(`  ${key}: ${typeof value} = ${JSON.stringify(value)}`);
        });
      }
    } else {
      console.log('📋 ESQUEMA llamadas_ventas:');
      llamadasSchema.forEach(col => {
        if (['destino_preferido', 'preferencia_vacaciones', 'composicion_familiar_numero'].includes(col.column_name)) {
          console.log(`  ${col.column_name}: ${col.data_type} (${col.udt_name})`);
        }
      });
    }

    if (prospectosError) {
      console.error('❌ Error con prospectos:', prospectosError);
      // Fallback: obtener muestra de datos
      const { data: sample2 } = await analysisSupabase
        .from('prospectos')
        .select('destino_preferencia, tamano_grupo')
        .limit(1)
        .single();
      
      if (sample2) {
        console.log('\n📊 MUESTRA prospectos:');
        Object.entries(sample2).forEach(([key, value]) => {
          console.log(`  ${key}: ${typeof value} = ${JSON.stringify(value)}`);
        });
      }
    } else {
      console.log('\n📋 ESQUEMA prospectos:');
      prospectosSchema.forEach(col => {
        if (['destino_preferencia', 'tamano_grupo'].includes(col.column_name)) {
          console.log(`  ${col.column_name}: ${col.data_type} (${col.udt_name})`);
        }
      });
    }

    // Verificar datos reales
    console.log('\n🔍 VALORES REALES DE MUESTRA:');
    
    const { data: llamadaSample } = await analysisSupabase
      .from('llamadas_ventas')
      .select('destino_preferido, preferencia_vacaciones, composicion_familiar_numero')
      .not('destino_preferido', 'is', null)
      .limit(1)
      .single();
    
    const { data: prospectoSample } = await analysisSupabase
      .from('prospectos') 
      .select('destino_preferencia, tamano_grupo')
      .not('destino_preferencia', 'is', null)
      .limit(1)
      .single();

    if (llamadaSample) {
      console.log('Llamada:');
      console.log(`  destino_preferido: ${typeof llamadaSample.destino_preferido} = ${JSON.stringify(llamadaSample.destino_preferido)}`);
      console.log(`  preferencia_vacaciones: ${typeof llamadaSample.preferencia_vacaciones} = ${JSON.stringify(llamadaSample.preferencia_vacaciones)}`);
    }

    if (prospectoSample) {
      console.log('Prospecto:');
      console.log(`  destino_preferencia: ${typeof prospectoSample.destino_preferencia} = ${JSON.stringify(prospectoSample.destino_preferencia)}`);
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkColumnTypes();
