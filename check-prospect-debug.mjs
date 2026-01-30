import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_ANALYSIS_SUPABASE_URL;
const supabaseKey = process.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const checkProspect = async () => {
  const phoneToSearch = '3333243333';
  
  console.log('=== BÚSQUEDA DE PROSPECTO ===');
  console.log('Número a buscar:', phoneToSearch);
  console.log('');
  
  // 1. Búsqueda exacta por whatsapp
  console.log('1️⃣ Búsqueda por whatsapp (exacto):');
  const { data: data1, error: error1 } = await supabase
    .from('prospectos')
    .select('id, nombre_completo, whatsapp, telefono_principal')
    .eq('whatsapp', phoneToSearch)
    .limit(5);
  console.log('   Resultado:', JSON.stringify(data1 || error1, null, 2));
  console.log('');
  
  // 2. Búsqueda exacta por telefono_principal
  console.log('2️⃣ Búsqueda por telefono_principal (exacto):');
  const { data: data2, error: error2 } = await supabase
    .from('prospectos')
    .select('id, nombre_completo, whatsapp, telefono_principal')
    .eq('telefono_principal', phoneToSearch)
    .limit(5);
  console.log('   Resultado:', JSON.stringify(data2 || error2, null, 2));
  console.log('');
  
  // 3. Búsqueda con ILIKE
  console.log('3️⃣ Búsqueda con ILIKE %3333243%:');
  const { data: data3, error: error3 } = await supabase
    .from('prospectos')
    .select('id, nombre_completo, whatsapp, telefono_principal')
    .or(`whatsapp.ilike.%3333243%,telefono_principal.ilike.%3333243%`)
    .limit(10);
  console.log('   Resultado:', JSON.stringify(data3 || error3, null, 2));
  console.log('');
  
  process.exit(0);
};

checkProspect().catch(console.error);
