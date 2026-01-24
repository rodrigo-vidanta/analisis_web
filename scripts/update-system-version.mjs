#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SYSTEM_UI_SUPABASE_URL;
const supabaseKey = process.env.VITE_SYSTEM_UI_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSystemConfig() {
  console.log('🔧 Actualizando system_config con versión B10.1.42N2.5.45\n');
  
  try {
    // Actualizar versión en system_config
    const { data, error } = await supabase
      .from('system_config')
      .update({
        app_version: 'B10.1.42N2.5.45',
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select();
    
    if (error) {
      console.error('❌ Error al actualizar:', error);
      process.exit(1);
    }
    
    console.log('✅ Versión actualizada en system_config');
    console.log('📊 Datos actualizados:', data);
    
    // Verificar actualización
    const { data: verification } = await supabase
      .from('system_config')
      .select('app_version, updated_at')
      .eq('id', 1)
      .single();
    
    console.log('\n🔍 Verificación:');
    console.log(`   Versión: ${verification?.app_version}`);
    console.log(`   Actualizado: ${verification?.updated_at}`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

updateSystemConfig();
