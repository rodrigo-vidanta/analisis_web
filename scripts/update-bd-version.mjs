import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(process.cwd(), '.env.local') });

const url = process.env.VITE_ANALYSIS_SUPABASE_URL;
const serviceKey = process.env.VITE_ANALYSIS_SUPABASE_SERVICE_KEY;

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

const newVersion = 'B10.1.42N2.5.46';

console.log(`🔄 Actualizando versión en BD a: ${newVersion}\n`);

async function updateVersion() {
  // Verificar si existe
  const { data: existing } = await supabase
    .from('system_config')
    .select('*')
    .eq('config_key', 'app_version')
    .single();

  if (existing) {
    console.log('✅ Registro existente encontrado');
    console.log('   Versión actual:', existing.config_value);
    
    // Actualizar
    const { data, error } = await supabase
      .from('system_config')
      .update({
        config_value: {
          version: newVersion,
          force_update: true
        },
        updated_at: new Date().toISOString()
      })
      .eq('config_key', 'app_version')
      .select();

    if (error) {
      console.error('❌ Error actualizando:', error.message);
      process.exit(1);
    }

    console.log('✅ Versión actualizada en BD');
    console.log('   Nueva versión:', newVersion);
  } else {
    console.log('⚠️  Registro no existe, creando...');
    
    // Crear
    const { data, error } = await supabase
      .from('system_config')
      .insert({
        config_key: 'app_version',
        config_value: {
          version: newVersion,
          force_update: true
        },
        description: 'Versión requerida de la aplicación'
      })
      .select();

    if (error) {
      console.error('❌ Error creando:', error.message);
      process.exit(1);
    }

    console.log('✅ Registro creado en BD');
  }

  // Verificar
  const { data: verified } = await supabase
    .from('system_config')
    .select('*')
    .eq('config_key', 'app_version')
    .single();

  console.log('\n📊 Verificación:');
  console.log(JSON.stringify(verified, null, 2));
}

updateVersion().catch(console.error);
