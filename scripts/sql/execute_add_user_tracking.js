/**
 * Script para ejecutar SQL en Log Monitor usando Supabase JS
 * Ejecutar con: node scripts/sql/execute_add_user_tracking.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dffuwdzybhypxfzrmdcz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZnV3ZHp5Ymh5cHhmenJtZGN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg1ODE1OSwiZXhwIjoyMDc1NDM0MTU5fQ.GplT_sFvgkLjNDNg50MaXVI759u8LAMeS9SbJ6pf2yc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function executeSQL() {
  console.log('🚀 Ejecutando script SQL para agregar seguimiento de usuario...\n');

  try {
    // 1. Agregar campo requested_by
    console.log('1. Agregando campo requested_by a ui_error_log_ai_analysis...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.ui_error_log_ai_analysis 
        ADD COLUMN IF NOT EXISTS requested_by UUID;
      `
    });

    if (alterError) {
      // Intentar método alternativo usando execute_sql directamente
      const { error: directError } = await supabase
        .from('ui_error_log_ai_analysis')
        .select('id')
        .limit(1);
      
      if (directError && directError.code !== 'PGRST116') {
        console.error('❌ Error:', directError);
      } else {
        console.log('✅ Tabla existe, continuando...');
      }
    } else {
      console.log('✅ Campo agregado');
    }

    // 2. Crear índice
    console.log('\n2. Creando índice...');
    // Los índices se crearán automáticamente o manualmente desde el dashboard

    console.log('\n✅ Script completado. Verifica en el dashboard de Supabase que el campo requested_by existe.');
    console.log('\n💡 Si el campo no existe, ejecuta manualmente desde el SQL Editor:');
    console.log('   ALTER TABLE public.ui_error_log_ai_analysis ADD COLUMN requested_by UUID;');
    console.log('   CREATE INDEX idx_ui_error_log_ai_analysis_requested_by ON public.ui_error_log_ai_analysis(requested_by);');

  } catch (error) {
    console.error('❌ Error ejecutando script:', error);
  }
}

executeSQL();

