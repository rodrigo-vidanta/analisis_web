#!/usr/bin/env node
/**
 * Verificar si el prospecto tiene conversación en conversaciones_whatsapp
 * y por qué no aparece en get_dashboard_conversations
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://glsmifhkoaifvaegsozd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PROSPECTO_ID = 'e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b';

async function checkDashboardConversations() {
  console.log('🔍 Verificando por qué prospecto NO aparece en get_dashboard_conversations\n');
  console.log(`Prospecto ID: ${PROSPECTO_ID}`);
  console.log(`Rol: Administrador (acceso total)\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // 1. Verificar conversaciones en conversaciones_whatsapp
    console.log('1️⃣ Buscando en conversaciones_whatsapp...');
    const { data: convs, error: convError } = await supabase
      .from('conversaciones_whatsapp')
      .select('id, prospecto_id, estado, fecha_ultimo_mensaje, requiere_atencion_humana')
      .eq('prospecto_id', PROSPECTO_ID);
    
    if (convError) {
      console.log(`   ⚠️ No se puede acceder a conversaciones_whatsapp`);
      console.log(`   Error: ${convError.message}`);
    } else if (!convs || convs.length === 0) {
      console.log('   ❌ NO tiene conversación en conversaciones_whatsapp');
      console.log('   📝 Por eso no aparece en el módulo WhatsApp');
      console.log('\n   Solución:');
      console.log('   - El prospecto debe tener al menos 1 conversación de WhatsApp');
      console.log('   - Verificar que tenga mensajes en mensajes_whatsapp');
      return;
    } else {
      console.log(`   ✅ ${convs.length} conversación(es) encontrada(s)`);
      convs.forEach((c, i) => {
        console.log(`\n   Conversación ${i + 1}:`);
        console.log(`      ID: ${c.id}`);
        console.log(`      Estado: ${c.estado}`);
        console.log(`      Último mensaje: ${c.fecha_ultimo_mensaje}`);
        console.log(`      Requiere atención: ${c.requiere_atencion_humana}`);
      });
    }
    
    // 2. Llamar a get_dashboard_conversations
    console.log('\n2️⃣ Consultando get_dashboard_conversations (como admin)...');
    const { data: dashConvs, error: dashError } = await supabase.rpc('get_dashboard_conversations', {
      p_user_id: null,
      p_is_admin: true,
      p_ejecutivo_ids: null,
      p_coordinacion_ids: null,
      p_limit: 3000, // Más que 2388 para asegurar
      p_offset: 0
    });
    
    if (dashError) {
      console.log('   ❌ Error al llamar get_dashboard_conversations');
      console.log(`   Error: ${dashError.message}`);
      console.log('\n   ⚠️ Esta función debe existir en Supabase');
      console.log('   Si no existe, el módulo WhatsApp NO funciona');
      return;
    }
    
    console.log(`   ✅ Función ejecutada correctamente`);
    console.log(`   Total conversaciones retornadas: ${dashConvs?.length || 0}`);
    
    // 3. Buscar el prospecto en los resultados
    console.log('\n3️⃣ Buscando prospecto en resultados...');
    const found = dashConvs?.find(c => c.prospecto_id === PROSPECTO_ID);
    
    if (found) {
      console.log('   ✅ Prospecto SÍ está en los resultados');
      console.log('\n   Datos retornados:');
      console.log(`      prospecto_id: ${found.prospecto_id}`);
      console.log(`      nombre_contacto: ${found.nombre_contacto || 'NULL'}`);
      console.log(`      nombre_whatsapp: ${found.nombre_whatsapp || 'NULL'}`);
      console.log(`      numero_telefono: ${found.numero_telefono || 'NULL'}`);
      console.log(`      etapa: ${found.etapa || 'NULL'}`);
      console.log(`      fecha_ultimo_mensaje: ${found.fecha_ultimo_mensaje || 'NULL'}`);
      
      console.log('\n   ⚠️ Si los datos están NULL, el filtro no puede buscarlo');
      console.log('   ✅ Solución ya aplicada: Buscar en prospectosDataRef');
    } else {
      console.log('   ❌ Prospecto NO está en los resultados');
      console.log('\n   📋 Posibles causas:');
      console.log('      1. Conversación tiene estado que la excluye');
      console.log('      2. Fecha de último mensaje muy antigua');
      console.log('      3. Vista/función tiene filtros adicionales');
      console.log('      4. Offset está cortando los resultados');
      
      // Verificar si con LIMIT más alto aparece
      console.log('\n   🔄 Intentando con LIMIT 5000...');
      const { data: moreConvs } = await supabase.rpc('get_dashboard_conversations', {
        p_user_id: null,
        p_is_admin: true,
        p_ejecutivo_ids: null,
        p_coordinacion_ids: null,
        p_limit: 5000,
        p_offset: 0
      });
      
      const foundNow = moreConvs?.find(c => c.prospecto_id === PROSPECTO_ID);
      if (foundNow) {
        console.log(`   ✅ Encontrado con LIMIT 5000 (posición: ${moreConvs.findIndex(c => c.prospecto_id === PROSPECTO_ID) + 1})`);
        console.log('   📝 Problema: La conversación está después de la posición 3000');
        console.log('   💡 Solución: Aumentar CONVERSATIONS_BATCH_SIZE o cargar más batches');
      } else {
        console.log('   ❌ Aún no encontrado con LIMIT 5000');
        console.log('   📝 La función get_dashboard_conversations lo está excluyendo');
      }
    }
    
    // 4. Ver mensajes del prospecto
    console.log('\n4️⃣ Verificando mensajes en mensajes_whatsapp...');
    const { data: msgs, error: msgError, count } = await supabase
      .from('mensajes_whatsapp')
      .select('id, fecha, sender_type', { count: 'exact' })
      .eq('prospecto_id', PROSPECTO_ID)
      .order('fecha', { ascending: false })
      .limit(5);
    
    if (msgError) {
      console.log(`   ⚠️ No se pueden leer mensajes: ${msgError.message}`);
    } else {
      console.log(`   ✅ Total mensajes: ${count || 0}`);
      if (msgs && msgs.length > 0) {
        console.log('   Últimos 5 mensajes:');
        msgs.forEach((m, i) => {
          console.log(`      ${i + 1}. ${m.fecha} (${m.sender_type})`);
        });
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (convs && convs.length > 0) {
      console.log('✅ Tiene conversación en conversaciones_whatsapp');
      
      if (found) {
        console.log('✅ Aparece en get_dashboard_conversations');
        console.log('⚠️ Problema: Datos NULL en la función');
        console.log('✅ Solución aplicada: Buscar en prospectosDataRef');
        console.log('\n💡 Siguiente paso: Hacer build y deploy del código actualizado');
      } else {
        console.log('❌ NO aparece en get_dashboard_conversations');
        console.log('📝 Causa: Función lo está excluyendo');
        console.log('🔧 Acción: Revisar definición de la función SQL');
      }
    } else {
      console.log('❌ NO tiene conversación en conversaciones_whatsapp');
      console.log('📝 Por eso no aparece en el módulo WhatsApp');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

checkDashboardConversations();
