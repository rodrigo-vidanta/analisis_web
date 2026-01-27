import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://glsmifhkoaifvaegsozd.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY4Njc4NywiZXhwIjoyMDY4MjYyNzg3fQ.oyKsFpO_8ulE_m877kpDoxF-htfenoXjq0_GrFThrwI';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function ejecutarVista() {
  console.log('🔧 Ejecutando actualización de vista...');
  
  const sql = fs.readFileSync('scripts/optimizaciones/vista_prospectos_corregida.sql', 'utf-8');
  
  // Ejecutar el CREATE VIEW
  const createViewSQL = sql.split('COMMENT ON VIEW')[0].trim();
  
  const { data, error } = await supabase.rpc('exec_sql', {
    query: createViewSQL
  });
  
  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  console.log('✅ Vista actualizada correctamente');
  
  // Verificar
  console.log('\n📊 Verificando vista...');
  const { data: testData, error: testError } = await supabase
    .from('prospectos_con_ejecutivo_y_coordinacion')
    .select('id, nombre_completo, etapa_codigo, ejecutivo_nombre, coordinacion_nombre')
    .limit(5);
  
  if (testError) {
    console.error('❌ Error verificando:', testError);
  } else {
    console.log('✅ Vista funciona correctamente');
    console.table(testData);
  }
}

ejecutarVista().catch(console.error);
