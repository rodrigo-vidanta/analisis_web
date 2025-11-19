/**
 * Script para agregar campo requested_by a ui_error_log_ai_analysis
 * Ejecutar con: node scripts/sql/execute_add_requested_by.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dffuwdzybhypxfzrmdcz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZnV3ZHp5Ymh5cHhmenJtZGN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg1ODE1OSwiZXhwIjoyMDc1NDM0MTU5fQ.GplT_sFvgkLjNDNg50MaXVI759u8LAMeS9SbJ6pf2yc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function executeSQL() {
  console.log('🚀 Ejecutando SQL para agregar campo requested_by...\n');

  try {
    // Verificar si la columna ya existe consultando la tabla
    const { data: testData, error: testError } = await supabase
      .from('ui_error_log_ai_analysis')
      .select('id, requested_by')
      .limit(1);

    if (testError && testError.code === '42703') {
      // Columna no existe, necesitamos agregarla
      console.log('⚠️  La columna requested_by no existe. Ejecutando ALTER TABLE...');
      console.log('💡 Por favor ejecuta manualmente desde el SQL Editor de Supabase:');
      console.log('\nALTER TABLE public.ui_error_log_ai_analysis ADD COLUMN IF NOT EXISTS requested_by UUID;');
      console.log('CREATE INDEX IF NOT EXISTS idx_ui_error_log_ai_analysis_requested_by ON public.ui_error_log_ai_analysis(requested_by);');
      console.log("COMMENT ON COLUMN public.ui_error_log_ai_analysis.requested_by IS 'ID del usuario que solicitó el análisis de IA';");
    } else if (testError) {
      console.error('❌ Error verificando columna:', testError);
    } else {
      console.log('✅ La columna requested_by ya existe o la tabla está accesible.');
      console.log('📊 Verificando estructura...');
      
      // Intentar crear índice si no existe
      console.log('\n💡 Si el índice no existe, ejecuta:');
      console.log('CREATE INDEX IF NOT EXISTS idx_ui_error_log_ai_analysis_requested_by ON public.ui_error_log_ai_analysis(requested_by);');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

executeSQL();

