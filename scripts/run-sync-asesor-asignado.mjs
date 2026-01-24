/**
 * Script para sincronizar asesor_asignado desde user_profiles_v2
 * Ejecutar: node scripts/run-sync-asesor-asignado.mjs
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_ANALYSIS_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_ANALYSIS_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno:');
  console.error('   VITE_ANALYSIS_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   VITE_ANALYSIS_SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAsesorAsignado() {
  console.log('🔄 Iniciando sincronización de asesor_asignado...\n');

  try {
    // 1. Diagnóstico inicial
    console.log('📊 Diagnóstico inicial:');
    
    const { data: prospectos, error: prospError } = await supabase
      .from('prospectos')
      .select('id, ejecutivo_id, asesor_asignado')
      .not('ejecutivo_id', 'is', null);
    
    if (prospError) throw prospError;
    
    console.log(`   - Prospectos con ejecutivo_id: ${prospectos.length}`);
    
    const sinAsesor = prospectos.filter(p => !p.asesor_asignado || p.asesor_asignado.trim() === '');
    console.log(`   - Prospectos sin asesor_asignado: ${sinAsesor.length}`);
    
    // 2. Obtener usuarios de user_profiles_v2
    const ejecutivoIds = [...new Set(prospectos.map(p => p.ejecutivo_id))];
    console.log(`   - IDs únicos de ejecutivos: ${ejecutivoIds.length}\n`);
    
    const { data: usuarios, error: userError } = await supabase
      .from('user_profiles_v2')
      .select('id, full_name')
      .in('id', ejecutivoIds);
    
    if (userError) throw userError;
    
    console.log(`   - Usuarios encontrados en user_profiles_v2: ${usuarios.length}`);
    
    // Crear mapa de usuarios
    const userMap = new Map(usuarios.map(u => [u.id, u.full_name]));
    
    // 3. Identificar registros a actualizar
    const toUpdate = prospectos.filter(p => {
      const realName = userMap.get(p.ejecutivo_id);
      if (!realName) return false;
      return !p.asesor_asignado || p.asesor_asignado.trim() === '' || p.asesor_asignado !== realName;
    });
    
    console.log(`   - Registros a actualizar: ${toUpdate.length}\n`);
    
    if (toUpdate.length === 0) {
      console.log('✅ No hay registros que actualizar. Todo sincronizado.');
      return;
    }
    
    // 4. Actualizar en batches
    console.log('🔄 Actualizando registros...');
    const BATCH_SIZE = 50;
    let updated = 0;
    
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE);
      
      for (const prospecto of batch) {
        const newName = userMap.get(prospecto.ejecutivo_id);
        if (!newName) continue;
        
        const { error: updateError } = await supabase
          .from('prospectos')
          .update({ 
            asesor_asignado: newName,
            updated_at: new Date().toISOString()
          })
          .eq('id', prospecto.id);
        
        if (updateError) {
          console.error(`   ❌ Error actualizando ${prospecto.id}:`, updateError.message);
        } else {
          updated++;
        }
      }
      
      console.log(`   Progreso: ${Math.min(i + BATCH_SIZE, toUpdate.length)}/${toUpdate.length}`);
    }
    
    console.log(`\n✅ Sincronización completada: ${updated} registros actualizados`);
    
    // 5. Verificación final
    const { data: verificacion } = await supabase
      .from('prospectos')
      .select('id')
      .not('ejecutivo_id', 'is', null)
      .or('asesor_asignado.is.null,asesor_asignado.eq.');
    
    console.log(`\n📊 Verificación final:`);
    console.log(`   - Registros pendientes sin asesor_asignado: ${verificacion?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    process.exit(1);
  }
}

syncAsesorAsignado();
