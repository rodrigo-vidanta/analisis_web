/**
 * Script para buscar y asignar prospecto a COBACA
 * Ejecutar con: node scripts/find_and_assign_prospect.js
 */

import { createClient } from '@supabase/supabase-js';

// Configuración de bases de datos
const ANALYSIS_SUPABASE_URL = 'https://glsmifhkoaifvaegsozd.supabase.co';
const ANALYSIS_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';

const SYSTEM_UI_SUPABASE_URL = 'https://zbylezfyagwrxoecioup.supabase.co';
const SYSTEM_UI_SUPABASE_ADMIN_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

const analysisSupabase = createClient(ANALYSIS_SUPABASE_URL, ANALYSIS_SUPABASE_KEY);
const systemUISupabaseAdmin = createClient(SYSTEM_UI_SUPABASE_URL, SYSTEM_UI_SUPABASE_ADMIN_KEY);

async function findAndAssignProspect() {
  try {
    console.log('🔍 Buscando prospecto "darig samuel rosales robledo"...\n');
    
    // Buscar con diferentes variaciones
    const searchPatterns = [
      '%darig%samuel%rosales%robledo%',
      '%darig samuel%',
      '%rosales robledo%',
      '%darig%',
      '%samuel rosales%',
    ];

    let foundProspects = [];

    for (const pattern of searchPatterns) {
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('id, nombre_completo, nombre, nombre_whatsapp, email, whatsapp, coordinacion_id, ejecutivo_id, created_at')
        .or(`nombre_completo.ilike.${pattern},nombre.ilike.${pattern},nombre_whatsapp.ilike.${pattern}`)
        .limit(20);

      if (!error && data) {
        foundProspects.push(...data);
      }
    }

    // Eliminar duplicados
    const uniqueProspects = Array.from(
      new Map(foundProspects.map(p => [p.id, p])).values()
    );

    if (uniqueProspects.length === 0) {
      console.log('❌ No se encontraron prospectos con ese nombre.');
      console.log('\n💡 Buscando todos los prospectos recientes para referencia...\n');
      
      const { data: recentProspects } = await analysisSupabase
        .from('prospectos')
        .select('id, nombre_completo, nombre, nombre_whatsapp, email, coordinacion_id, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentProspects && recentProspects.length > 0) {
        console.log('📋 Prospectos recientes:');
        recentProspects.forEach((p, i) => {
          console.log(`\n${i + 1}. ID: ${p.id}`);
          console.log(`   Nombre completo: ${p.nombre_completo || 'N/A'}`);
          console.log(`   Nombre: ${p.nombre || 'N/A'}`);
          console.log(`   Nombre WhatsApp: ${p.nombre_whatsapp || 'N/A'}`);
          console.log(`   Email: ${p.email || 'N/A'}`);
          console.log(`   Coordinación: ${p.coordinacion_id || 'Sin asignar'}`);
        });
      }
      return;
    }

    console.log(`✅ Encontrados ${uniqueProspects.length} prospecto(s):\n`);
    uniqueProspects.forEach((p, i) => {
      console.log(`${i + 1}. ID: ${p.id}`);
      console.log(`   Nombre completo: ${p.nombre_completo || 'N/A'}`);
      console.log(`   Nombre: ${p.nombre || 'N/A'}`);
      console.log(`   Nombre WhatsApp: ${p.nombre_whatsapp || 'N/A'}`);
      console.log(`   Email: ${p.email || 'N/A'}`);
      console.log(`   WhatsApp: ${p.whatsapp || 'N/A'}`);
      console.log(`   Coordinación actual: ${p.coordinacion_id || 'Sin asignar'}`);
      console.log(`   Ejecutivo actual: ${p.ejecutivo_id || 'Sin asignar'}`);
      console.log(`   Creado: ${p.created_at || 'N/A'}`);
      console.log('');
    });

    // Buscar el más cercano al nombre completo
    const exactMatch = uniqueProspects.find(p => {
      const fullName = (p.nombre_completo || '').toLowerCase();
      return fullName.includes('darig') && 
             fullName.includes('samuel') && 
             (fullName.includes('rosales') || fullName.includes('robledo'));
    });

    const prospectoId = exactMatch ? exactMatch.id : uniqueProspects[0].id;
    const prospecto = uniqueProspects.find(p => p.id === prospectoId);

    console.log(`\n🎯 Prospecto seleccionado para asignación:`);
    console.log(`   ID: ${prospectoId}`);
    console.log(`   Nombre: ${prospecto.nombre_completo || prospecto.nombre || 'N/A'}`);
    console.log(`   Coordinación actual: ${prospecto.coordinacion_id || 'Sin asignar'}\n`);

    // Obtener ID de coordinación COBACA
    console.log('🔍 Obteniendo coordinación COBACA...');
    const { data: cobaca, error: cobacaError } = await systemUISupabaseAdmin
      .from('coordinaciones')
      .select('id, codigo, nombre')
      .eq('codigo', 'COBACA')
      .eq('is_active', true)
      .single();

    if (cobacaError || !cobaca) {
      console.error('❌ Error obteniendo coordinación COBACA:', cobacaError);
      return;
    }

    console.log(`✅ Coordinación COBACA: ${cobaca.nombre} (ID: ${cobaca.id})\n`);

    // Verificar asignación existente
    const { data: existingAssignment } = await systemUISupabaseAdmin
      .from('prospect_assignments')
      .select('id, coordinacion_id, is_active')
      .eq('prospect_id', prospectoId)
      .eq('is_active', true)
      .maybeSingle();

    if (existingAssignment) {
      if (existingAssignment.coordinacion_id === cobaca.id) {
        console.log('✅ El prospecto ya está asignado a COBACA');
        return;
      }
      console.log(`⚠️ Desactivando asignación anterior (coordinación diferente)...`);
      await systemUISupabaseAdmin
        .from('prospect_assignments')
        .update({ 
          is_active: false, 
          unassigned_at: new Date().toISOString() 
        })
        .eq('id', existingAssignment.id);
    }

    // Crear nueva asignación
    console.log('📝 Creando asignación a COBACA...');
    const { data: newAssignment, error: assignError } = await systemUISupabaseAdmin
      .from('prospect_assignments')
      .insert({
        prospect_id: prospectoId,
        coordinacion_id: cobaca.id,
        assignment_type: 'manual',
        assignment_reason: 'Asignación manual - Script de administración',
      })
      .select()
      .single();

    if (assignError) {
      console.error('❌ Error creando asignación:', assignError);
      return;
    }

    console.log(`✅ Asignación creada: ${newAssignment.id}`);

    // Registrar en logs
    await systemUISupabaseAdmin.from('assignment_logs').insert({
      prospect_id: prospectoId,
      coordinacion_id: cobaca.id,
      action: 'assigned',
      reason: 'Asignación manual - Script de administración',
    });

    // Sincronizar con base de análisis
    console.log('🔄 Sincronizando con base de análisis...');
    const { error: syncError } = await analysisSupabase
      .from('prospectos')
      .update({
        coordinacion_id: cobaca.id,
        assignment_date: new Date().toISOString(),
      })
      .eq('id', prospectoId);

    if (syncError) {
      console.error('⚠️ Error sincronizando:', syncError);
    } else {
      console.log('✅ Prospecto actualizado en base de análisis');
    }

    // Actualizar llamadas asociadas
    const { data: calls } = await analysisSupabase
      .from('llamadas_ventas')
      .select('call_id')
      .eq('prospecto', prospectoId);

    if (calls && calls.length > 0) {
      console.log(`🔄 Actualizando ${calls.length} llamada(s)...`);
      for (const call of calls) {
        await analysisSupabase
          .from('llamadas_ventas')
          .update({ coordinacion_id: cobaca.id })
          .eq('call_id', call.call_id);
      }
      console.log('✅ Llamadas actualizadas');
    }

    // Actualizar conversaciones asociadas
    const { data: conversations } = await systemUISupabaseAdmin
      .from('uchat_conversations')
      .select('id')
      .eq('prospecto_id', prospectoId);

    if (conversations && conversations.length > 0) {
      console.log(`🔄 Actualizando ${conversations.length} conversación(es)...`);
      for (const conv of conversations) {
        await systemUISupabaseAdmin
          .from('uchat_conversations')
          .update({ coordinacion_id: cobaca.id })
          .eq('id', conv.id);
      }
      console.log('✅ Conversaciones actualizadas');
    }

    console.log('\n✅✅✅ ASIGNACIÓN COMPLETADA ✅✅✅');
    console.log(`   Prospecto: ${prospecto.nombre_completo || prospectoId}`);
    console.log(`   Coordinación: ${cobaca.nombre} (${cobaca.codigo})`);
    console.log(`   ID de asignación: ${newAssignment.id}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findAndAssignProspect()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

