#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_ANALYSIS_SUPABASE_URL;
const supabaseKey = process.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch() {
  console.log('🧪 Probando búsqueda de "Rosario" via RPC\n');
  
  try {
    const { data, error } = await supabase.rpc('search_dashboard_conversations', {
      p_search_term: 'Rosario',
      p_user_id: null,
      p_is_admin: true,
      p_ejecutivo_ids: null,
      p_coordinacion_ids: null,
      p_limit: 10
    });
    
    if (error) {
      console.error('❌ Error RPC:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ Sin resultados');
      return;
    }
    
    console.log(`✅ Encontrados ${data.length} resultados:\n`);
    data.forEach((p, i) => {
      console.log(`   ${i+1}. ${p.nombre_contacto}`);
      console.log(`      ID: ${p.prospecto_id}`);
      console.log(`      Tel: ${p.numero_telefono}`);
      console.log(`      Email: ${p.email}\n`);
    });
    
    const found = data.find(p => p.prospecto_id === 'e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b');
    if (found) {
      console.log('🎉 ¡PROSPECTO ROSARIO ENCONTRADO!');
    } else {
      console.log('⚠️ Rosario no encontrado');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testSearch();
