#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://glsmifhkoaifvaegsozd.supabase.co';
const PROSPECTO_ID = 'e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b';

// Usar anon key desde .env.local (actualizada 2026-01-24)
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';

async function testDirectQuery() {
  console.log('🔍 Conectando directamente a Supabase...\n');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Prospecto: ${PROSPECTO_ID}\n`);
  
  const supabase = createClient(SUPABASE_URL, ANON_KEY);
  
  // 1. Verificar prospecto
  console.log('1️⃣ Buscando prospecto por ID...');
  const { data: prospecto, error: err1 } = await supabase
    .from('prospectos')
    .select('id, nombre_completo, nombre_whatsapp, whatsapp, email')
    .eq('id', PROSPECTO_ID)
    .single();
  
  if (err1) {
    console.log('❌ Error:', err1.message);
    return;
  }
  
  if (!prospecto) {
    console.log('❌ Prospecto no encontrado');
    return;
  }
  
  console.log('✅ ENCONTRADO:');
  console.log(`   Nombre: "${prospecto.nombre_completo}"`);
  console.log(`   WhatsApp Name: "${prospecto.nombre_whatsapp}"`);
  console.log(`   Teléfono: "${prospecto.whatsapp}"`);
  console.log(`   Email: "${prospecto.email}"\n`);
  
  // 2. Contar mensajes
  console.log('2️⃣ Contando mensajes WhatsApp...');
  const { count, error: err2 } = await supabase
    .from('mensajes_whatsapp')
    .select('*', { count: 'exact', head: true })
    .eq('prospecto_id', PROSPECTO_ID);
  
  if (err2) {
    console.log('❌ Error:', err2.message);
  } else {
    console.log(`✅ Total mensajes: ${count}\n`);
  }
  
  // 3. Probar función RPC
  console.log('3️⃣ Probando función search_whatsapp_prospects...');
  const { data: searchResults, error: err3 } = await supabase
    .rpc('search_whatsapp_prospects', {
      p_search_term: 'Rosario',
      p_is_admin: true,
      p_limit: 50
    });
  
  if (err3) {
    console.log('❌ Error RPC:', err3.message);
    console.log('   Código:', err3.code);
    console.log('   Detalles:', err3.details);
  } else if (searchResults && searchResults.length > 0) {
    console.log(`✅ Función retorna ${searchResults.length} resultados`);
    
    const found = searchResults.find((p) => p.id === PROSPECTO_ID);
    if (found) {
      console.log('   ⭐ ¡El prospecto problemático ESTÁ en los resultados!');
    } else {
      console.log('   ⚠️ El prospecto problemático NO está en los resultados');
      console.log('   Primeros 3 resultados:');
      searchResults.slice(0, 3).forEach((p, i) => {
        console.log(`      ${i + 1}. ${p.nombre_completo} (${p.id})`);
      });
    }
  } else {
    console.log('⚠️ La función no retornó resultados');
  }
}

testDirectQuery().catch(console.error);
