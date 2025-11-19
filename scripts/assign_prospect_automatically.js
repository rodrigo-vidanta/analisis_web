/**
 * Script para asignar automáticamente un prospecto específico o todos los prospectos sin asignación
 * 
 * Uso:
 * node scripts/assign_prospect_automatically.js [prospect_id]
 * 
 * Si no se proporciona prospect_id, procesará todos los prospectos sin asignación
 */

import { createClient } from '@supabase/supabase-js';

// Configuración de bases de datos (hardcoded desde los archivos de configuración)
const ANALYSIS_SUPABASE_URL = 'https://glsmifhkoaifvaegsozd.supabase.co';
const ANALYSIS_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';

const SYSTEM_UI_SUPABASE_URL = 'https://zbylezfyagwrxoecioup.supabase.co';
const SYSTEM_UI_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNzEsImV4cCI6MjA3NDkxMjI3MX0.W6Vt5h4r7vNSP_YQtd_fbTWuK7ERrcttwhcpe5Q7KoM';

const analysisSupabase = createClient(ANALYSIS_SUPABASE_URL, ANALYSIS_SUPABASE_KEY);
const systemUISupabase = createClient(SYSTEM_UI_SUPABASE_URL, SYSTEM_UI_SUPABASE_KEY);

/**
 * Asigna un prospecto a una coordinación automáticamente
 */
async function assignProspectToCoordinacion(prospectId) {
  try {
    console.log(`\n🔄 Procesando asignación para prospecto: ${prospectId}`);
    
    // Verificar si ya tiene asignación
    const { data: existingAssignment, error: checkError } = await systemUISupabase
      .from('prospect_assignments')
      .select('*')
      .eq('prospect_id', prospectId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (checkError) {
      console.error('❌ Error verificando asignación existente:', checkError);
      return false;
    }
    
    if (existingAssignment) {
      console.log(`✅ Prospecto ya tiene asignación activa a coordinación: ${existingAssignment.coordinacion_id}`);
      return true;
    }
    
    // Llamar función RPC para asignación automática
    const { data: coordinacionId, error: assignError } = await systemUISupabase.rpc(
      'assign_prospect_to_coordinacion',
      {
        p_prospect_id: prospectId,
        p_assigned_by: null
      }
    );
    
    if (assignError) {
      console.error('❌ Error asignando prospecto:', assignError);
      return false;
    }
    
    if (!coordinacionId) {
      console.error('❌ No se pudo asignar el prospecto a ninguna coordinación');
      return false;
    }
    
    console.log(`✅ Prospecto asignado a coordinación: ${coordinacionId}`);
    
    // Obtener información de la coordinación
    const { data: coordinacion, error: coordError } = await systemUISupabase
      .from('coordinaciones')
      .select('codigo, nombre')
      .eq('id', coordinacionId)
      .single();
    
    if (!coordError && coordinacion) {
      console.log(`   📍 Coordinación: ${coordinacion.codigo} - ${coordinacion.nombre}`);
    }
    
    // Sincronizar coordinacion_id en la tabla prospectos
    const { error: syncError } = await analysisSupabase
      .from('prospectos')
      .update({
        coordinacion_id: coordinacionId,
        assignment_date: new Date().toISOString()
      })
      .eq('id', prospectId);
    
    if (syncError) {
      console.warn('⚠️ Error sincronizando coordinacion_id en prospectos:', syncError);
    } else {
      console.log(`✅ Sincronizado coordinacion_id en tabla prospectos`);
    }
    
    return true;
  } catch (error) {
    console.error('💥 Error en assignProspectToCoordinacion:', error);
    return false;
  }
}

/**
 * Procesa un prospecto específico o todos los prospectos sin asignación
 */
async function processProspects(prospectId = null) {
  try {
    if (prospectId) {
      // Procesar un prospecto específico
      console.log(`\n🎯 Procesando prospecto específico: ${prospectId}`);
      const success = await assignProspectToCoordinacion(prospectId);
      if (success) {
        console.log(`\n✅ Prospecto ${prospectId} procesado exitosamente`);
      } else {
        console.log(`\n❌ Error procesando prospecto ${prospectId}`);
        process.exit(1);
      }
    } else {
      // Procesar todos los prospectos sin asignación
      console.log(`\n🔍 Buscando prospectos sin asignación...`);
      
      const { data: prospects, error: prospectsError } = await analysisSupabase
        .from('prospectos')
        .select('id, nombre_completo, nombre_whatsapp, whatsapp, coordinacion_id, ejecutivo_id, created_at')
        .is('coordinacion_id', null)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (prospectsError) {
        console.error('❌ Error obteniendo prospectos:', prospectsError);
        process.exit(1);
      }
      
      if (!prospects || prospects.length === 0) {
        console.log('✅ No hay prospectos sin asignación');
        return;
      }
      
      console.log(`\n📊 Encontrados ${prospects.length} prospectos sin asignación`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const prospect of prospects) {
        const success = await assignProspectToCoordinacion(prospect.id);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
        
        // Pequeña pausa para no sobrecargar la base de datos
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`\n📈 Resumen:`);
      console.log(`   ✅ Asignados exitosamente: ${successCount}`);
      console.log(`   ❌ Errores: ${errorCount}`);
    }
  } catch (error) {
    console.error('💥 Error en processProspects:', error);
    process.exit(1);
  }
}

// Ejecutar script
const prospectId = process.argv[2] || null;
processProspects(prospectId)
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });

