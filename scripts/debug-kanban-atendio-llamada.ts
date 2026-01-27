/**
 * Script de debugging para verificar por qué la columna "Atendió llamada"
 * no muestra prospectos en el Kanban
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno desde .env.local
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_ANALYSIS_SUPABASE_URL!;
const supabaseKey = process.env.VITE_ANALYSIS_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno no encontradas');
  console.error('VITE_ANALYSIS_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('VITE_ANALYSIS_SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const analysisSupabase = createClient(supabaseUrl, supabaseKey);

async function debugKanbanAtendioLlamada() {
  console.log('🔍 Verificando columna "Atendió llamada" en Kanban\n');
  
  // 1. Verificar que la etapa existe en la tabla etapas
  console.log('1️⃣ Verificando etapa en tabla etapas...');
  const { data: etapa, error: etapaError } = await analysisSupabase
    .from('etapas')
    .select('*')
    .ilike('nombre', '%atendió llamada%')
    .single();
  
  if (etapaError) {
    console.error('❌ Error obteniendo etapa:', etapaError);
    return;
  }
  
  console.log('✅ Etapa encontrada:', {
    id: etapa.id,
    nombre: etapa.nombre,
    codigo: etapa.codigo,
    activo: etapa.activo,
    orden_funnel: etapa.orden_funnel
  });
  
  const etapaId = etapa.id;
  
  // 2. Verificar prospectos con etapa_id
  console.log('\n2️⃣ Verificando prospectos con etapa_id...');
  const { data: prospectosConId, error: errorConId, count: countConId } = await analysisSupabase
    .from('prospectos')
    .select('id, nombre_completo, etapa_id, etapa, coordinacion_id', { count: 'exact' })
    .eq('etapa_id', etapaId)
    .limit(5);
  
  if (errorConId) {
    console.error('❌ Error:', errorConId);
  } else {
    console.log(`✅ Prospectos con etapa_id="${etapaId}": ${countConId || 0} total`);
    console.log('Primeros 5:', prospectosConId?.map(p => ({
      nombre: p.nombre_completo,
      etapa_id: p.etapa_id,
      etapa_text: p.etapa,
      coordinacion_id: p.coordinacion_id
    })));
  }
  
  // 3. Verificar prospectos con etapa (TEXT) - legacy
  console.log('\n3️⃣ Verificando prospectos con etapa (TEXT) legacy...');
  const { data: prospectosConTexto, error: errorConTexto, count: countConTexto } = await analysisSupabase
    .from('prospectos')
    .select('id, nombre_completo, etapa_id, etapa', { count: 'exact' })
    .ilike('etapa', '%atendió llamada%')
    .limit(5);
  
  if (errorConTexto) {
    console.error('❌ Error:', errorConTexto);
  } else {
    console.log(`✅ Prospectos con etapa TEXT="Atendió llamada": ${countConTexto || 0} total`);
    console.log('Primeros 5:', prospectosConTexto?.map(p => ({
      nombre: p.nombre_completo,
      etapa_id: p.etapa_id,
      etapa_text: p.etapa
    })));
  }
  
  // 4. Verificar si hay prospectos con etapa_id NULL
  console.log('\n4️⃣ Verificando prospectos con etapa_id NULL...');
  const { data: prospectosSinId, count: countSinId } = await analysisSupabase
    .from('prospectos')
    .select('id, nombre_completo, etapa', { count: 'exact' })
    .is('etapa_id', null)
    .ilike('etapa', '%atendió llamada%')
    .limit(5);
  
  console.log(`⚠️ Prospectos con etapa_id=NULL pero etapa TEXT="Atendió llamada": ${countSinId || 0}`);
  if (prospectosSinId && prospectosSinId.length > 0) {
    console.log('Primeros 5:', prospectosSinId.map(p => ({
      nombre: p.nombre_completo,
      etapa_text: p.etapa
    })));
    console.log('\n⚠️ PROBLEMA: Estos prospectos necesitan migración de etapa → etapa_id');
  }
  
  // 5. Simular carga del ProspectosManager
  console.log('\n5️⃣ Simulando carga de ProspectosManager (primeros 100 prospectos)...');
  const { data: prospectosCargados, error: errorCarga } = await analysisSupabase
    .from('prospectos')
    .select('id, nombre_completo, etapa_id, etapa')
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (errorCarga) {
    console.error('❌ Error:', errorCarga);
  } else {
    const porEtapaId = prospectosCargados?.filter(p => p.etapa_id === etapaId) || [];
    console.log(`✅ Total cargados: ${prospectosCargados?.length || 0}`);
    console.log(`✅ Con etapa_id="${etapaId}": ${porEtapaId.length}`);
    
    if (porEtapaId.length === 0) {
      console.log('\n⚠️ PROBLEMA: Los primeros 100 prospectos NO incluyen ninguno con "Atendió llamada"');
      console.log('Esto indica que están más abajo en la lista (por fecha de creación)');
      
      // Verificar ordenamiento por fecha
      const conAtendio = prospectosCargados?.filter(p => 
        p.etapa_id === etapaId || p.etapa?.toLowerCase().includes('atendió llamada')
      ) || [];
      console.log(`Prospectos con "Atendió llamada" en primeros 100: ${conAtendio.length}`);
    } else {
      console.log('\n✅ Los primeros 100 prospectos SÍ incluyen algunos con "Atendió llamada"');
      console.log('Nombres:', porEtapaId.slice(0, 5).map(p => p.nombre_completo));
    }
  }
  
  // 6. Verificar totales por etapa_id
  console.log('\n6️⃣ Verificando totales por etapa_id (como loadEtapaTotals)...');
  const { data: totales, error: errorTotales } = await analysisSupabase
    .from('prospectos')
    .select('etapa_id', { count: 'exact', head: false });
  
  if (errorTotales) {
    console.error('❌ Error:', errorTotales);
  } else {
    const counts: Record<string, number> = {};
    totales?.forEach((row: any) => {
      const id = row.etapa_id || 'sin-etapa';
      counts[id] = (counts[id] || 0) + 1;
    });
    
    console.log(`✅ Total de prospectos agrupados: ${totales?.length || 0}`);
    console.log(`✅ Prospectos con etapa_id="${etapaId}": ${counts[etapaId] || 0}`);
    console.log(`⚠️ Prospectos con etapa_id=NULL: ${counts['sin-etapa'] || 0}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN:');
  console.log('='.repeat(60));
  console.log(`Etapa ID: ${etapaId}`);
  console.log(`Nombre: ${etapa.nombre}`);
  console.log(`Código: ${etapa.codigo}`);
  console.log(`\nProspectos con etapa_id poblado: ${countConId || 0}`);
  console.log(`Prospectos con etapa TEXT (legacy): ${countConTexto || 0}`);
  console.log(`Prospectos sin etapa_id (necesitan migración): ${countSinId || 0}`);
  
  if (countSinId && countSinId > 0) {
    console.log('\n⚠️ ACCIÓN REQUERIDA:');
    console.log('Ejecutar migración para poblar etapa_id en prospectos:');
    console.log(`UPDATE prospectos SET etapa_id = '${etapaId}' WHERE etapa ILIKE '%atendió llamada%' AND etapa_id IS NULL;`);
  }
}

// Ejecutar
debugKanbanAtendioLlamada()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en script:', error);
    process.exit(1);
  });
