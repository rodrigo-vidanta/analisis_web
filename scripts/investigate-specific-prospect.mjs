#!/usr/bin/env node
/**
 * Script para investigar por qué un prospecto específico NO aparece en el filtrado
 * pero otros sí
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://glsmifhkoaifvaegsozd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PROSPECTO_ID = 'e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b';

async function investigateProspect() {
  console.log('🔍 Investigando por qué prospecto NO aparece en filtrado\n');
  console.log(`Prospecto ID: ${PROSPECTO_ID}`);
  console.log(`Nombre esperado: Rosario\n`);
  
  try {
    // 1. Verificar que el prospecto existe
    console.log('1️⃣ Verificando prospecto en tabla prospectos...');
    const { data: prospecto, error: pError } = await supabase
      .from('prospectos')
      .select('*')
      .eq('id', PROSPECTO_ID)
      .single();
    
    if (pError) {
      console.error('   ❌ Error:', pError.message);
      return;
    }
    
    console.log('   ✅ Prospecto encontrado:');
    console.log(`      Nombre: ${prospecto.nombre_completo}`);
    console.log(`      WhatsApp: ${prospecto.whatsapp}`);
    console.log(`      Email: ${prospecto.email}`);
    console.log(`      Ejecutivo: ${prospecto.ejecutivo_id}`);
    console.log(`      Coordinación: ${prospecto.coordinacion_id}`);
    console.log(`      Etapa: ${prospecto.etapa}`);
    
    // 2. Verificar conversación en conversaciones_whatsapp
    console.log('\n2️⃣ Verificando conversación en conversaciones_whatsapp...');
    const { data: conversaciones, error: cError } = await supabase
      .from('conversaciones_whatsapp')
      .select('*')
      .eq('prospecto_id', PROSPECTO_ID);
    
    if (cError) {
      console.error('   ❌ Error:', cError.message);
      return;
    }
    
    if (!conversaciones || conversaciones.length === 0) {
      console.log('   ❌ NO hay conversaciones para este prospecto');
      console.log('   ℹ️ Por eso no aparece en el módulo WhatsApp');
      return;
    }
    
    console.log(`   ✅ ${conversaciones.length} conversación(es) encontrada(s)`);
    conversaciones.forEach((conv, idx) => {
      console.log(`\n   Conversación ${idx + 1}:`);
      console.log(`      ID: ${conv.id}`);
      console.log(`      Estado: ${conv.estado}`);
      console.log(`      Fecha última mensaje: ${conv.fecha_ultimo_mensaje}`);
      console.log(`      Requiere atención: ${conv.requiere_atencion_humana}`);
    });
    
    // 3. Verificar con la función RPC get_dashboard_conversations
    console.log('\n3️⃣ Verificando con función RPC get_dashboard_conversations...');
    console.log('   (Esta es la función que usa el módulo WhatsApp)');
    
    // Probar con admin (sin filtros)
    const { data: dashConvs, error: dashError } = await supabase.rpc('get_dashboard_conversations', {
      p_user_id: null,
      p_is_admin: true,
      p_ejecutivo_ids: null,
      p_coordinacion_ids: null,
      p_limit: 1000,
      p_offset: 0
    });
    
    if (dashError) {
      console.error('   ❌ Error RPC:', dashError.message);
      console.log('   ⚠️ La función get_dashboard_conversations no existe o tiene error');
      return;
    }
    
    // Buscar el prospecto en los resultados
    const prospectoEnResultados = dashConvs?.find(c => c.prospecto_id === PROSPECTO_ID);
    
    if (!prospectoEnResultados) {
      console.log('   ❌ Prospecto NO aparece en resultados de get_dashboard_conversations');
      console.log('\n   📋 Análisis de por qué no aparece:');
      console.log('      - La función RPC filtra conversaciones');
      console.log('      - Verifica si hay restricciones de coordinación/ejecutivo');
      console.log(`      - Total conversaciones retornadas: ${dashConvs?.length || 0}`);
      
      // Buscar conversaciones de la misma coordinación
      if (prospecto.coordinacion_id) {
        const mismaCoord = dashConvs?.filter(c => {
          return c.coordinacion_id === prospecto.coordinacion_id;
        }) || [];
        console.log(`      - Conversaciones de misma coordinación (${prospecto.coordinacion_id}): ${mismaCoord.length}`);
      }
      
      return;
    }
    
    console.log('   ✅ Prospecto SÍ aparece en get_dashboard_conversations');
    console.log(`\n   Datos retornados por la función:`);
    console.log(`      prospecto_id: ${prospectoEnResultados.prospecto_id}`);
    console.log(`      nombre_contacto: ${prospectoEnResultados.nombre_contacto || 'NULL'}`);
    console.log(`      nombre_whatsapp: ${prospectoEnResultados.nombre_whatsapp || 'NULL'}`);
    console.log(`      numero_telefono: ${prospectoEnResultados.numero_telefono || 'NULL'}`);
    console.log(`      whatsapp_raw: ${prospectoEnResultados.whatsapp_raw || 'NULL'}`);
    console.log(`      etapa: ${prospectoEnResultados.etapa || 'NULL'}`);
    
    // 4. Verificar qué datos se usarían para el filtro
    console.log('\n4️⃣ Verificando qué datos se usarían para búsqueda...');
    const nombre = prospectoEnResultados.nombre_contacto || prospectoEnResultados.nombre_whatsapp || 
                   prospectoEnResultados.numero_telefono || 'Sin nombre';
    const telefono = prospectoEnResultados.numero_telefono || '';
    
    console.log(`   Nombre para búsqueda: "${nombre}"`);
    console.log(`   Teléfono para búsqueda: "${telefono}"`);
    
    if (!nombre || nombre === 'Sin nombre') {
      console.log('\n   ❌ PROBLEMA ENCONTRADO:');
      console.log('      - nombre_contacto: NULL');
      console.log('      - nombre_whatsapp: NULL');
      console.log('      - numero_telefono: NULL');
      console.log('      - El filtro no puede encontrar el prospecto porque no hay datos para buscar');
      console.log('\n   ✅ SOLUCIÓN:');
      console.log('      - El filtro debe buscar en prospectosDataRef.nombre_completo');
      console.log(`      - Valor correcto: "${prospecto.nombre_completo}"`);
    }
    
    // 5. Verificar que prospectosDataRef tendría los datos correctos
    console.log('\n5️⃣ Verificando datos que estarían en prospectosDataRef...');
    console.log('   (Map construido por optimizedConversationsService)');
    console.log(`   nombre_completo: "${prospecto.nombre_completo}"`);
    console.log(`   nombre_whatsapp: "${prospecto.nombre_whatsapp || 'NULL'}"`);
    console.log(`   whatsapp: "${prospecto.whatsapp}"`);
    console.log(`   email: "${prospecto.email}"`);
    
    // Probar búsqueda
    const searchTerm = 'Rosario';
    const searchTermLower = searchTerm.toLowerCase();
    
    console.log(`\n6️⃣ Probando búsqueda con término: "${searchTerm}"`);
    const match1 = prospecto.nombre_completo?.toLowerCase().includes(searchTermLower);
    const match2 = prospecto.nombre_whatsapp?.toLowerCase().includes(searchTermLower);
    const match3 = prospecto.whatsapp?.includes(searchTerm);
    
    console.log(`   nombre_completo match: ${match1 ? '✅' : '❌'} ("${prospecto.nombre_completo}")`);
    console.log(`   nombre_whatsapp match: ${match2 ? '✅' : '❌'} ("${prospecto.nombre_whatsapp || 'NULL'}")`);
    console.log(`   whatsapp match: ${match3 ? '✅' : '❌'} ("${prospecto.whatsapp}")`);
    
    if (match1 || match2 || match3) {
      console.log('\n   ✅ El prospecto DEBERÍA aparecer en búsqueda');
      console.log('   ⚠️ Si no aparece, el problema está en:');
      console.log('      1. prospectosDataRef no contiene este prospecto');
      console.log('      2. Filtros de permisos lo están excluyendo');
      console.log('      3. La conversación no se está cargando en la lista inicial');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Prospecto existe: ${prospecto.nombre_completo}`);
    console.log(`✅ Tiene ${conversaciones.length} conversación(es)`);
    console.log(`${prospectoEnResultados ? '✅' : '❌'} Aparece en get_dashboard_conversations`);
    console.log(`✅ Búsqueda por nombre debería funcionar`);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

investigateProspect();
