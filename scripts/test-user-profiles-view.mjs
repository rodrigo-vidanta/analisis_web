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

async function testUserProfilesView() {
  console.log('🧪 Probando vista user_profiles_v2\n');
  
  try {
    // Probar SELECT simple
    const { data, error, count } = await supabase
      .from('user_profiles_v2')
      .select('id, email, full_name, backup_id, has_backup', { count: 'exact' })
      .limit(5);
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log(`✅ Vista accesible. Total registros: ${count}\n`);
    console.log('Primeros 5 usuarios:');
    data?.forEach((u, i) => {
      console.log(`   ${i+1}. ${u.full_name} (${u.email})`);
      console.log(`      Backup: ${u.has_backup ? 'Sí' : 'No'} ${u.backup_id ? `(${u.backup_id})` : ''}\n`);
    });
    
    // Probar consulta específica con .single()
    console.log('🧪 Probando consulta con .single() para un usuario específico...');
    const testUserId = data?.[0]?.id;
    if (testUserId) {
      const { data: singleData, error: singleError } = await supabase
        .from('user_profiles_v2')
        .select('backup_id, has_backup')
        .eq('id', testUserId)
        .single();
      
      if (singleError) {
        console.error('❌ Error en .single():', singleError);
      } else {
        console.log('✅ Consulta .single() exitosa:', singleData);
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
  }
}

testUserProfilesView();
