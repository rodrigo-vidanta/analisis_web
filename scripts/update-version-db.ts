/**
 * Script para actualizar versión en system_config
 * Ejecutar: npx tsx scripts/update-version-db.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_ANALYSIS_SUPABASE_URL || 'https://glsmifhkoaifvaegsozd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.VITE_ANALYSIS_SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ VITE_ANALYSIS_SUPABASE_SERVICE_KEY no está definida en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function updateVersion() {
  const newVersion = 'B10.1.42N2.5.42';
  
  console.log('🔄 Actualizando versión en system_config...');
  console.log(`   Nueva versión: ${newVersion}`);
  
  try {
    // Actualizar versión
    const { data, error } = await supabase
      .from('system_config')
      .update({
        config_value: newVersion,
        updated_at: new Date().toISOString()
      })
      .eq('config_key', 'app_version')
      .select();
    
    if (error) {
      console.error('❌ Error actualizando versión:', error);
      process.exit(1);
    }
    
    console.log('✅ Versión actualizada exitosamente:', data);
    
    // Verificar actualización
    const { data: verifyData, error: verifyError } = await supabase
      .from('system_config')
      .select('config_key, config_value, updated_at')
      .eq('config_key', 'app_version')
      .single();
    
    if (verifyError) {
      console.error('❌ Error verificando versión:', verifyError);
      process.exit(1);
    }
    
    console.log('\n📊 Versión actual en BD:');
    console.log('   Key:', verifyData.config_key);
    console.log('   Value:', verifyData.config_value);
    console.log('   Updated:', verifyData.updated_at);
    
  } catch (err) {
    console.error('❌ Error inesperado:', err);
    process.exit(1);
  }
}

updateVersion();
