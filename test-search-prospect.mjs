import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_ANALYSIS_SUPABASE_URL;
const serviceKey = process.env.VITE_ANALYSIS_SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

const normalizePhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-10);
};

const testSearch = async () => {
  const phoneToTest = '3333243333';
  const normalizedPhone = normalizePhone(phoneToTest);
  
  console.log('=== TEST BÚSQUEDA DE PROSPECTO ===\n');
  console.log('Número ingresado:', phoneToTest);
  console.log('Normalizado (últimos 10):', normalizedPhone);
  console.log('');
  
  // Simular la búsqueda del código
  const { data: candidates, error } = await supabase
    .from('prospectos')
    .select('id, nombre_completo, ejecutivo_id, coordinacion_id, whatsapp, telefono_principal')
    .or(`whatsapp.like.%${normalizedPhone},telefono_principal.like.%${normalizedPhone}`)
    .limit(10);
  
  if (error) {
    console.log('❌ Error:', error.message);
    process.exit(1);
  }
  
  console.log(`📊 Candidatos encontrados: ${candidates.length}`);
  console.log('');
  
  if (candidates.length === 0) {
    console.log('❌ No se encontraron candidatos');
    process.exit(0);
  }
  
  // Mostrar candidatos
  candidates.forEach((c, i) => {
    console.log(`Candidato ${i + 1}:`);
    console.log('  - ID:', c.id);
    console.log('  - Nombre:', c.nombre_completo);
    console.log('  - WhatsApp:', c.whatsapp);
    console.log('  - Teléfono:', c.telefono_principal);
    
    // Validar match exacto (últimos 10 dígitos)
    const whatsappNorm = c.whatsapp?.replace(/\D/g, '').slice(-10);
    const telefonoNorm = c.telefono_principal?.replace(/\D/g, '').slice(-10);
    
    const matchWhatsApp = whatsappNorm === normalizedPhone;
    const matchTelefono = telefonoNorm === normalizedPhone;
    
    console.log('  - Match WhatsApp:', matchWhatsApp ? '✅' : '❌', `(${whatsappNorm})`);
    console.log('  - Match Teléfono:', matchTelefono ? '✅' : '❌', `(${telefonoNorm})`);
    console.log('');
  });
  
  // Encontrar match exacto
  const exactMatch = candidates.find(c => {
    const whatsappNorm = c.whatsapp?.replace(/\D/g, '').slice(-10);
    const telefonoNorm = c.telefono_principal?.replace(/\D/g, '').slice(-10);
    return whatsappNorm === normalizedPhone || telefonoNorm === normalizedPhone;
  });
  
  if (exactMatch) {
    console.log('✅ MATCH EXACTO ENCONTRADO:');
    console.log('   ID:', exactMatch.id);
    console.log('   Nombre:', exactMatch.nombre_completo);
    console.log('');
    console.log('🎯 El prospecto SÍ será detectado correctamente');
  } else {
    console.log('❌ NO SE ENCONTRÓ MATCH EXACTO');
    console.log('⚠️ El prospecto NO será detectado');
  }
  
  process.exit(0);
};

testSearch().catch(console.error);
