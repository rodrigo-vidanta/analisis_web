import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(process.cwd(), '.env.local') });

const url = process.env.VITE_ANALYSIS_SUPABASE_URL;
const serviceKey = process.env.VITE_ANALYSIS_SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Faltan variables: VITE_ANALYSIS_SUPABASE_URL o VITE_ANALYSIS_SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

console.log('🔍 CONSULTANDO REAL con service_role_key\n');
console.log('URL:', url);
console.log('');

async function consultar() {
  // 1. Consultar user_profiles_v2
  console.log('═══════════════════════════════════════════════════════');
  console.log('1️⃣ Consultando user_profiles_v2');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const { data: profiles, error } = await supabase
    .from('user_profiles_v2')
    .select('id, email, full_name, role_name, is_active, coordinacion_id')
    .eq('role_name', 'ejecutivo')
    .order('full_name');

  if (error) {
    console.log('❌ Error:', error.message);
    console.log('Código:', error.code);
    console.log('Detalles:', error.details);
    console.log('');
  } else {
    console.log(`✅ Consulta exitosa: ${profiles.length} ejecutivos\n`);
    
    // Buscar Issel
    const issel = profiles.find(e => 
      e.full_name?.toLowerCase().includes('issel') ||
      e.full_name?.toLowerCase().includes('gissel') ||
      e.email?.toLowerCase().includes('issel') ||
      e.email?.toLowerCase().includes('gissel')
    );

    if (issel) {
      console.log('✅ ¡ENCONTRADO! Issel Rico:');
      console.log(JSON.stringify(issel, null, 2));
      console.log('');
    } else {
      console.log('❌ Issel Rico NO encontrado');
      console.log('');
      console.log('Buscando coincidencias parciales...');
      const parciales = profiles.filter(e => 
        e.full_name?.toLowerCase().includes('rico') ||
        e.full_name?.toLowerCase().includes('ortiz')
      );
      if (parciales.length > 0) {
        console.log('Posibles coincidencias:');
        parciales.forEach(p => console.log(`  - ${p.full_name} (${p.email})`));
      }
      console.log('');
    }

    const activos = profiles.filter(p => p.is_active);
    console.log(`📊 Activos: ${activos.length} / ${profiles.length}\n`);
    
    console.log('Primeros 15 ejecutivos activos:');
    activos.slice(0, 15).forEach((e, i) => {
      const coord = e.coordinacion_id ? '✓' : '✗';
      console.log(`${String(i + 1).padStart(2)}. [${coord}] ${e.full_name}`);
    });
  }
}

consultar().catch(console.error);
