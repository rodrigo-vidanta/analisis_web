// ============================================
// ANALIZAR TABLA DE PROSPECTOS EN BD PQNC_AI
// ============================================

import { createClient } from '@supabase/supabase-js';

// Conexión a la base de datos pqnc_ai (análisis)
const analysisSupabaseUrl = 'https://glsmifhkoaifvaegsozd.supabase.co';
const analysisSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';

const supabase = createClient(analysisSupabaseUrl, analysisSupabaseKey);

console.log('🔍 Analizando tabla de prospectos...');

async function analyzeProspectsTable() {
  try {
    // 1. VER ESTRUCTURA DE LA TABLA
    console.log('\n📊 ESTRUCTURA DE TABLA PROSPECTOS:');
    
    const { data: sampleData, error: sampleError } = await supabase
      .from('prospectos')
      .select('*')
      .limit(3);

    if (sampleError) {
      console.error('❌ Error accediendo tabla prospectos:', sampleError);
      return false;
    }

    console.log('✅ Muestra de datos:');
    console.table(sampleData);

    // 2. ANALIZAR CAMPOS EXISTENTES
    if (sampleData && sampleData.length > 0) {
      const campos = Object.keys(sampleData[0]);
      console.log('\n📋 CAMPOS ACTUALES:');
      campos.forEach((campo, index) => {
        const valor = sampleData[0][campo];
        const tipo = typeof valor;
        console.log(`${index + 1}. ${campo}: ${tipo} (ej: ${valor})`);
      });
    }

    // 3. VER ETAPAS DISPONIBLES
    console.log('\n🎯 ETAPAS DE PROCESO:');
    const { data: etapas, error: etapasError } = await supabase
      .from('prospectos')
      .select('etapa')
      .not('etapa', 'is', null);

    if (etapasError) {
      console.error('❌ Error obteniendo etapas:', etapasError);
    } else {
      const etapasUnicas = [...new Set(etapas?.map(e => e.etapa))];
      console.log('Etapas encontradas:', etapasUnicas);
    }

    // 4. VER PROSPECTOS ACTIVOS
    console.log('\n🔥 PROSPECTOS ACTIVOS:');
    const { data: activos, error: activosError } = await supabase
      .from('prospectos')
      .select('*')
      .not('etapa', 'is', null)
      .neq('etapa', 'Finalizado')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (activosError) {
      console.error('❌ Error obteniendo activos:', activosError);
    } else {
      console.log(`📊 Prospectos activos encontrados: ${activos?.length || 0}`);
      activos?.forEach(prospecto => {
        console.log(`👤 ${prospecto.nombre_whatsapp || 'Sin nombre'} - ${prospecto.etapa} - ${prospecto.whatsapp}`);
      });
    }

    // 5. IDENTIFICAR CAMPOS FALTANTES PARA LIVE MONITOR
    console.log('\n🔧 CAMPOS NECESARIOS PARA LIVE MONITOR:');
    
    const camposNecesarios = [
      'status_transferencia', // 'pendiente', 'transferida', 'completada'
      'agente_asignado', // ID del agente humano asignado
      'fecha_transferencia', // Timestamp de transferencia
      'feedback_agente', // Feedback del agente humano (max 600 chars)
      'resultado_transferencia', // 'exitosa', 'perdida', 'problemas_tecnicos'
      'comentarios_ia', // Comentarios sobre la IA si los hay
      'checkpoint_transferencia', // En qué checkpoint se transfirió
      'duracion_llamada_ia', // Duración antes de transferir
      'temperatura_prospecto', // 'frio', 'tibio', 'caliente'
      'prioridad_seguimiento' // 'alta', 'media', 'baja'
    ];

    console.log('Campos a agregar:');
    camposNecesarios.forEach((campo, index) => {
      console.log(`${index + 1}. ${campo}`);
    });

    return { sampleData, campos: Object.keys(sampleData?.[0] || {}), etapasUnicas };

  } catch (error) {
    console.error('💥 Error analizando tabla:', error);
    return false;
  }
}

// Ejecutar análisis
analyzeProspectsTable()
  .then((result) => {
    if (result) {
      console.log('\n🎯 ANÁLISIS COMPLETADO');
      console.log('📋 Información obtenida para diseñar Live Monitor');
      console.log('🔧 Campos identificados para agregar');
      console.log('📊 Estructura entendida');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
