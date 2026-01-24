#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SYSTEM_UI_SUPABASE_URL;
const supabaseKey = process.env.VITE_SYSTEM_UI_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSystemConfig() {
  console.log('🔍 Verificando esquema de system_config\n');
  
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
    
    if (data && data.length > 0) {
      console.log('✅ Columnas disponibles:');
      Object.keys(data[0]).forEach(col => {
        console.log(`   - ${col}`);
      });
      
      console.log('\n📊 Datos actuales:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('⚠️ No hay datos en system_config');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkSystemConfig();
