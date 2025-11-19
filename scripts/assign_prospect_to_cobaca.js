/**
 * Script para asignar prospecto "darig samuel rosales robledo" a COBACA
 * Ejecutar con: node scripts/assign_prospect_to_cobaca.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env') });

// Configuración de bases de datos
const ANALYSIS_SUPABASE_URL = 'https://glsmifhkoaifvaegsozd.supabase.co';
const ANALYSIS_SUPABASE_KEY = process.env.VITE_ANALYSIS_SUPABASE_ANON_KEY || process.env.ANALYSIS_SUPABASE_ANON_KEY;

const SYSTEM_UI_SUPABASE_URL = 'https://zbylezfyagwrxoecioup.supabase.co';
const SYSTEM_UI_SUPABASE_KEY = process.env.VITE_SYSTEM_UI_SUPABASE_ANON_KEY || process.env.SYSTEM_UI_SUPABASE_ANON_KEY;
const SYSTEM_UI_SUPABASE_ADMIN_KEY = process.env.SYSTEM_UI_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SYSTEM_UI_SUPABASE_SERVICE_ROLE_KEY;

if (!ANALYSIS_SUPABASE_KEY || !SYSTEM_UI_SUPABASE_KEY || !SYSTEM_UI_SUPABASE_ADMIN_KEY) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('Necesitas: VITE_ANALYSIS_SUPABASE_ANON_KEY, VITE_SYSTEM_UI_SUPABASE_ANON_KEY, SYSTEM_UI_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const analysisSupabase = createClient(ANALYSIS_SUPABASE_URL, ANALYSIS_SUPABASE_KEY);
const systemUISupabase = createClient(SYSTEM_UI_SUPABASE_URL, SYSTEM_UI_SUPABASE_KEY);
const systemUISupabaseAdmin = createClient(SYSTEM_UI_SUPABASE_URL, SYSTEM_UI_SUPABASE_ADMIN_KEY);

async function assignProspectToCOBACA() {
  try {
    console.log('🔍 Buscando prospecto "darig samuel rosales robledo"...');
    
    // Buscar prospecto por nombre (variaciones posibles)
    const searchTerms = [
      'darig samuel rosales robledo',
      'darig samuel',
      'rosales robledo',
      'darig',
      'samuel rosales'
    ];

    let prospecto = null;
    let prospectoId = null;

    for (const term of searchTerms) {
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('id, nombre_completo, nombre, nombre_whatsapp, email, whatsapp, coordinacion_id')
        .or(`nombre_completo.ilike.%${term}%,nombre.ilike.%${term}%,nombre_whatsapp.ilike.%${term}%`)
        .limit(10);

      if (error) {
        console.error('❌ Error buscando prospecto:', error);
        continue;
      }

      if (data && data.length > 0) {
        // Buscar el más cercano al nombre completo
        const exactMatch = data.find(p => 
          p.nombre_completo?.toLowerCase().includes('darig') && 
          p.nombre_completo?.toLowerCase().includes('samuel') &&
          p.nombre_completo?.toLowerCase().includes('rosales')
        );

        if (exactMatch) {
          prospecto = exactMatch;
          prospectoId = exactMatch.id;
          break;
        } else if (data.length === 1) {
          prospecto = data[0];
          prospectoId = data[0].id;
          break;
        } else {
          console.log(`⚠️ Encontrados ${data.length} prospectos con "${term}"`);
          console.log('Prospectos encontrados:');
          data.forEach((p, i) => {
            console.log(`  ${i + 1}. ID: ${p.id}`);
            console.log(`     Nombre completo: ${p.nombre_completo || 'N/A'}`);
            console.log(`     Nombre: ${p.nombre || 'N/A'}`);
            console.log(`     Nombre WhatsApp: ${p.nombre_whatsapp || 'N/A'}`);
            console.log(`     Coordinación actual: ${p.coordinacion_id || 'Sin asignar'}`);
            console.log('');
          });
        }
      }
    }

    if (!prospectoId) {
      console.error('❌ No se encontró el prospecto "darig samuel rosales robledo"');
      console.log('💡 Intenta buscar manualmente en la base de datos o verifica el nombre exacto');
      return;
    }

    console.log('✅ Prospecto encontrado:');
    console.log(`   ID: ${prospectoId}`);
    console.log(`   Nombre completo: ${prospecto.nombre_completo || 'N/A'}`);
    console.log(`   Coordinación actual: ${prospecto.coordinacion_id || 'Sin asignar'}`);
    console.log('');

    // Obtener ID de coordinación COBACA
    console.log('🔍 Buscando coordinación COBACA...');
    const { data: cobaca, error: cobacaError } = await systemUISupabase
      .from('coordinaciones')
      .select('id, codigo, nombre')
      .eq('codigo', 'COBACA')
      .eq('is_active', true)
      .single();

    if (cobacaError || !cobaca) {
      console.error('❌ Error obteniendo coordinación COBACA:', cobacaError);
      return;
    }

    console.log('✅ Coordinación COBACA encontrada:');
    console.log(`   ID: ${cobaca.id}`);
    console.log(`   Código: ${cobaca.codigo}`);
    console.log(`   Nombre: ${cobaca.nombre}`);
    console.log('');

    // Verificar si ya tiene asignación activa
    const { data: existingAssignment } = await systemUISupabaseAdmin
      .from('prospect_assignments')
      .select('id, coordinacion_id, is_active')
      .eq('prospect_id', prospectoId)
      .eq('is_active', true)
      .single();

    if (existingAssignment) {
      if (existingAssignment.coordinacion_id === cobaca.id) {
        console.log('✅ El prospecto ya está asignado a COBACA');
        return;
      } else {
        console.log(`⚠️ El prospecto ya tiene una asignación activa a otra coordinación`);
        console.log(`   Desactivando asignación anterior...`);
        
        // Desactivar asignación anterior
        await systemUISupabaseAdmin
          .from('prospect_assignments')
          .update({ 
            is_active: false, 
            unassigned_at: new Date().toISOString() 
          })
          .eq('id', existingAssignment.id);
        
        console.log('✅ Asignación anterior desactivada');
      }
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

    console.log('✅ Asignación creada:', newAssignment.id);

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
      console.error('⚠️ Error sincronizando con base de análisis:', syncError);
    } else {
      console.log('✅ Sincronización completada');
    }

    // Actualizar llamadas asociadas
    const { data: calls, error: callsError } = await analysisSupabase
      .from('llamadas_ventas')
      .select('call_id')
      .eq('prospecto', prospectoId);

    if (!callsError && calls && calls.length > 0) {
      console.log(`🔄 Actualizando ${calls.length} llamada(s) asociada(s)...`);
      for (const call of calls) {
        await analysisSupabase
          .from('llamadas_ventas')
          .update({ coordinacion_id: cobaca.id })
          .eq('call_id', call.call_id);
      }
      console.log('✅ Llamadas actualizadas');
    }

    // Actualizar conversaciones asociadas
    const { data: conversations, error: convError } = await systemUISupabaseAdmin
      .from('uchat_conversations')
      .select('id')
      .eq('prospecto_id', prospectoId);

    if (!convError && conversations && conversations.length > 0) {
      console.log(`🔄 Actualizando ${conversations.length} conversación(es) asociada(s)...`);
      for (const conv of conversations) {
        await systemUISupabaseAdmin
          .from('uchat_conversations')
          .update({ coordinacion_id: cobaca.id })
          .eq('id', conv.id);
      }
      console.log('✅ Conversaciones actualizadas');
    }

    console.log('');
    console.log('✅✅✅ ASIGNACIÓN COMPLETADA EXITOSAMENTE ✅✅✅');
    console.log(`   Prospecto: ${prospecto.nombre_completo || prospectoId}`);
    console.log(`   Coordinación: ${cobaca.nombre} (${cobaca.codigo})`);
    console.log(`   ID de asignación: ${newAssignment.id}`);

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar script
assignProspectToCOBACA()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

