import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://glsmifhkoaifvaegsozd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';
const supabase = createClient(supabaseUrl, supabaseKey);

const version = "B10.1.42N2.5.48";

async function updateAppVersion() {
  console.log(`🔄 Actualizando versión requerida en BD: ${version}`);
  
  const { data, error } = await supabase
    .from('system_config')
    .update({
      config_value: {
        version,
        force_update: true
      },
      updated_at: new Date().toISOString()
    })
    .eq('config_key', 'app_version')
    .select();

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error('❌ No se actualizó ningún registro');
    process.exit(1);
  }

  console.log('✅ Versión actualizada exitosamente');
  console.log(`   Versión: ${data[0].config_value.version}`);
  console.log(`   Force Update: ${data[0].config_value.force_update}`);
  console.log(`   Updated At: ${data[0].updated_at}`);
}

updateAppVersion();
