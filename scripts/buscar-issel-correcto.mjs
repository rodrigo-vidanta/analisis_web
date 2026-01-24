import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(dirname(__dirname), '.env.local') });

const url = process.env.VITE_ANALYSIS_SUPABASE_URL;
const serviceKey = process.env.VITE_ANALYSIS_SUPABASE_SERVICE_KEY;

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

console.log('🔍 Buscando isselrico@vidavacations.com\n');

async function buscar() {
  // Buscar por email exacto
  const { data, error } = await supabase
    .from('user_profiles_v2')
    .select('*')
    .eq('email', 'isselrico@vidavacations.com')
    .single();

  if (error) {
    console.log('❌ Error:', error.message);
    console.log('Código:', error.code);
    
    if (error.code === 'PGRST116') {
      console.log('\n⚠️ No se encontró ningún usuario con ese email');
      
      // Buscar variaciones
      console.log('\nBuscando variaciones del email...\n');
      
      const { data: todos } = await supabase
        .from('user_profiles_v2')
        .select('email, full_name, role_name, is_active')
        .or('email.ilike.%issel%,email.ilike.%rico%');
      
      if (todos && todos.length > 0) {
        console.log('Emails similares encontrados:');
        todos.forEach(u => {
          console.log(`  - ${u.email} | ${u.full_name} | ${u.role_name} | Activo: ${u.is_active}`);
        });
      } else {
        console.log('No se encontraron emails similares');
      }
    }
  } else {
    console.log('✅ ¡ENCONTRADO!\n');
    console.log('ID:', data.id);
    console.log('Email:', data.email);
    console.log('Nombre completo:', data.full_name);
    console.log('First name:', data.first_name);
    console.log('Last name:', data.last_name);
    console.log('Rol:', data.role_name);
    console.log('Activo:', data.is_active);
    console.log('Coordinación ID:', data.coordinacion_id);
    console.log('');
    
    if (data.is_active && data.role_name === 'ejecutivo') {
      console.log('✅ El ejecutivo está correctamente configurado');
      console.log('   Debería aparecer en el filtro de ejecutivos');
    } else {
      if (!data.is_active) {
        console.log('⚠️ El ejecutivo NO está activo (is_active = false)');
      }
      if (data.role_name !== 'ejecutivo') {
        console.log('⚠️ El rol NO es "ejecutivo":', data.role_name);
      }
    }
  }
  
  // También buscar en auth.users directamente
  console.log('\n═══════════════════════════════════════════');
  console.log('Verificando en auth.users...');
  console.log('═══════════════════════════════════════════\n');
  
  const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
  
  if (!authError) {
    const user = authUser.users.find(u => u.email === 'isselrico@vidavacations.com');
    if (user) {
      console.log('✅ Encontrado en auth.users:');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Metadata:', JSON.stringify(user.user_metadata, null, 2));
    } else {
      console.log('❌ No encontrado en auth.users');
    }
  }
}

buscar().catch(console.error);
