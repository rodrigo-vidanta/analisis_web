#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const PROSPECTO_ID = 'e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b';

async function testWithSupabaseClient() {
  console.log('🔍 Probando con supabase-js client\n');
  
  const supabaseUrl = process.env.VITE_ANALYSIS_SUPABASE_URL;
  const serviceKey = process.env.VITE_ANALYSIS_SUPABASE_SERVICE_KEY;
  
  if (!serviceKey) {
    console.log('⚠️ No hay SERVICE_KEY en .env');
    console.log('   Intentando con ANON_KEY...\n');
    
    const anonKey = process.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, anonKey);
    
    // Probar con anon key
    const { data, error } = await supabase
      .from('prospectos')
      .select('id, nombre_completo, whatsapp')
      .eq('id', PROSPECTO_ID)
      .single();
    
    if (error) {
      console.log('❌ Error con anon_key:', error.message);
    } else if (data) {
      console.log('✅ ENCONTRADO con anon_key:');
      console.log(`   Nombre: ${data.nombre_completo}`);
      console.log(`   WhatsApp: ${data.whatsapp}`);
    } else {
      console.log('❌ No encontrado con anon_key');
    }
    
    // Buscar por nombre
    console.log('\n🔍 Buscando "Rosario" con anon_key...\n');
    const { data: rosarios, error: err2 } = await supabase
      .from('prospectos')
      .select('id, nombre_completo, whatsapp')
      .or('nombre_completo.ilike.%rosario%,nombre_whatsapp.ilike.%rosario%')
      .limit(5);
    
    if (rosarios && rosarios.length > 0) {
      console.log(`✅ Encontrados ${rosarios.length} prospectos con "Rosario":`);
      rosarios.forEach(p => {
        console.log(`   - ${p.nombre_completo} (${p.whatsapp})`);
        if (p.id === PROSPECTO_ID) {
          console.log('     ⭐ ¡Este es el que buscamos!');
        }
      });
    } else {
      console.log('❌ No encontrados con anon_key');
      if (err2) console.log('   Error:', err2.message);
    }
    
  } else {
    console.log('✅ Usando SERVICE_KEY\n');
    const supabase = createClient(supabaseUrl, serviceKey);
    
    const { data, error } = await supabase
      .from('prospectos')
      .select('*')
      .eq('id', PROSPECTO_ID)
      .single();
    
    if (error) {
      console.log('❌ Error:', error.message);
    } else if (data) {
      console.log('✅ ENCONTRADO:');
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

testWithSupabaseClient();
