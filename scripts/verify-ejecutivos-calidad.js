/**
 * Script para verificar ejecutivos de CALIDAD
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zbylezfyagwrxoecioup.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verify() {
  console.log('🔍 Verificando ejecutivos de CALIDAD...\n');

  // Obtener coordinación CALIDAD
  const { data: calidadCoord } = await supabase
    .from('coordinaciones')
    .select('id, codigo, nombre')
    .eq('codigo', 'CALIDAD')
    .single();

  if (!calidadCoord) {
    console.log('❌ Coordinación CALIDAD no encontrada');
    return;
  }

  console.log(`✅ Coordinación CALIDAD encontrada: ${calidadCoord.nombre} (ID: ${calidadCoord.id})\n`);

  // Obtener rol ejecutivo
  const { data: ejecutivoRole } = await supabase
    .from('auth_roles')
    .select('id, name')
    .eq('name', 'ejecutivo')
    .single();

  if (!ejecutivoRole) {
    console.log('❌ Rol ejecutivo no encontrado');
    return;
  }

  // Obtener ejecutivos de CALIDAD
  const { data: ejecutivosCalidad, error } = await supabase
    .from('auth_users')
    .select('id, email, full_name, is_operativo, coordinacion_id, role_id')
    .eq('role_id', ejecutivoRole.id)
    .eq('coordinacion_id', calidadCoord.id);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Ejecutivos en coordinación CALIDAD: ${ejecutivosCalidad?.length || 0}\n`);

  if (ejecutivosCalidad && ejecutivosCalidad.length > 0) {
    console.log('📋 Lista de ejecutivos CALIDAD:');
    ejecutivosCalidad.forEach((u, i) => {
      const estado = u.is_operativo ? '✅ OPERATIVO' : '❌ NO OPERATIVO';
      console.log(`   ${i + 1}. ${u.email} - ${u.full_name || 'Sin nombre'} - ${estado}`);
    });

    const operativos = ejecutivosCalidad.filter(u => u.is_operativo === true).length;
    const noOperativos = ejecutivosCalidad.filter(u => u.is_operativo === false).length;

    console.log(`\n📈 Resumen CALIDAD:`);
    console.log(`   - Operativos: ${operativos}`);
    console.log(`   - No operativos: ${noOperativos}`);

    if (noOperativos > 0) {
      console.log('\n⚠️  Hay ejecutivos de CALIDAD marcados como no operativos.');
      console.log('   Estos deberían estar operativos según los requisitos.');
    }
  } else {
    console.log('ℹ️  No hay ejecutivos asignados a la coordinación CALIDAD.');
  }
}

verify().catch(console.error);
