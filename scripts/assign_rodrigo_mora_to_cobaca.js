/**
 * Script para asignar prospecto "Rodrigo Mora Barba" a COBACA
 */

import { createClient } from '@supabase/supabase-js';

const ANALYSIS_SUPABASE_URL = 'https://glsmifhkoaifvaegsozd.supabase.co';
const ANALYSIS_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';

const SYSTEM_UI_SUPABASE_URL = 'https://zbylezfyagwrxoecioup.supabase.co';
const SYSTEM_UI_SUPABASE_ADMIN_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

const analysisSupabase = createClient(ANALYSIS_SUPABASE_URL, ANALYSIS_SUPABASE_KEY);
const systemUISupabaseAdmin = createClient(SYSTEM_UI_SUPABASE_URL, SYSTEM_UI_SUPABASE_ADMIN_KEY);

async function assignRodrigoMoraToCOBACA() {
  try {
    console.log('🔍 Buscando prospecto "Rodrigo Mora Barba"...\n');
    
    // Buscar por nombre y email
    const { data: prospects, error: searchError } = await analysisSupabase
      .from('prospectos')
      .select('id, nombre_completo, nombre, nombre_whatsapp, email, whatsapp, coordinacion_id, ejecutivo_id, created_at')
      .or(`nombre_completo.ilike.%Rodrigo Mora Barba%,nombre.ilike.%Rodrigo%,email.eq.rodrigo@anova.mx,whatsapp.eq.5213315127354,whatsapp.eq.523315127354`)
      .limit(10);

    if (searchError) {
      console.error('❌ Error buscando prospecto:', searchError);
      return;
    }

    if (!prospects || prospects.length === 0) {
      console.log('❌ No se encontró el prospecto "Rodrigo Mora Barba"');
      console.log('💡 Verificando si existe con email rodrigo@anova.mx...\n');
      
      // Buscar solo por email
      const { data: emailProspect } = await analysisSupabase
        .from('prospectos')
        .select('id, nombre_completo, nombre, email, whatsapp, coordinacion_id')
        .eq('email', 'rodrigo@anova.mx')
        .maybeSingle();

      if (emailProspect) {
        console.log('✅ Prospecto encontrado por email:');
        console.log(`   ID: ${emailProspect.id}`);
        console.log(`   Nombre completo: ${emailProspect.nombre_completo || 'N/A'}`);
        console.log(`   Email: ${emailProspect.email}`);
        console.log(`   Coordinación actual: ${emailProspect.coordinacion_id || 'Sin asignar'}\n`);
        
        await assignToCOBACA(emailProspect.id, emailProspect);
        return;
      }

      console.log('❌ No se encontró ningún prospecto con ese email');
      return;
    }

    // Encontrar el más cercano
    const exactMatch = prospects.find(p => 
      (p.nombre_completo && p.nombre_completo.toLowerCase().includes('rodrigo') && 
       p.nombre_completo.toLowerCase().includes('mora')) ||
      p.email === 'rodrigo@anova.mx'
    );

    const prospecto = exactMatch || prospects[0];

    console.log('✅ Prospecto encontrado:');
    console.log(`   ID: ${prospecto.id}`);
    console.log(`   Nombre completo: ${prospecto.nombre_completo || 'N/A'}`);
    console.log(`   Nombre: ${prospecto.nombre || 'N/A'}`);
    console.log(`   Email: ${prospecto.email || 'N/A'}`);
    console.log(`   WhatsApp: ${prospecto.whatsapp || 'N/A'}`);
    console.log(`   Coordinación actual: ${prospecto.coordinacion_id || 'Sin asignar'}`);
    console.log(`   Ejecutivo actual: ${prospecto.ejecutivo_id || 'Sin asignar'}\n`);

    await assignToCOBACA(prospecto.id, prospecto);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function assignToCOBACA(prospectoId, prospecto) {
  try {
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
      console.log(`⚠️ Desactivando asignación anterior...`);
      await systemUISupabaseAdmin
        .from('prospect_assignments')
        .update({ 
          is_active: false, 
          unassigned_at: new Date().toISOString() 
        })
        .eq('id', existingAssignment.id);
      console.log('✅ Asignación anterior desactivada\n');
    }

    // Crear nueva asignación
    console.log('📝 Creando asignación a COBACA...');
    const { data: newAssignment, error: assignError } = await systemUISupabaseAdmin
      .from('prospect_assignments')
      .insert({
        prospect_id: prospectoId,
        coordinacion_id: cobaca.id,
        assignment_type: 'manual',
        assignment_reason: 'Asignación manual - Rodrigo Mora Barba a COBACA',
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
      reason: 'Asignación manual - Rodrigo Mora Barba a COBACA',
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

    console.log('\n✅✅✅ ASIGNACIÓN COMPLETADA EXITOSAMENTE ✅✅✅');
    console.log(`   Prospecto: ${prospecto.nombre_completo || prospecto.nombre || prospectoId}`);
    console.log(`   Email: ${prospecto.email || 'N/A'}`);
    console.log(`   Coordinación: ${cobaca.nombre} (${cobaca.codigo})`);
    console.log(`   ID de asignación: ${newAssignment.id}`);

  } catch (error) {
    console.error('❌ Error en asignación:', error);
  }
}

assignRodrigoMoraToCOBACA()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

