/**
 * Script para migrar audiencias hardcodeadas a base de datos
 * Ejecutar con: node scripts/migrate_hardcoded_audiences.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_ANALYSIS_URL || 'https://glsmifhkoaifvaegsozd.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANALYSIS_ANON_KEY || '';

if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_ANALYSIS_ANON_KEY no está configurado');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mapeo de IDs hardcodeados a nuevos IDs de BD
const etapaMapping = {
  'etapa-0': '6b89d37b-3319-499b-bbf4-b44e33c7b038', // Interesado
  'etapa-1': '88648315-6903-493c-85de-19844face527', // Atendió llamada
  'etapa-2': '6af3fb99-7f27-48e9-80d5-83d04c15655b', // En seguimiento
  'etapa-3': '1059c0d0-364f-47a4-b9f2-097c1d4d9d33', // Nuevo
  'etapa-4': '85ebd1aa-528c-47b4-a1bd-32f9ed7e8b34', // Activo PQNC
};

async function migrateTemplates() {
  console.log('🔄 Iniciando migración de audiencias hardcodeadas...\n');

  // Obtener todas las plantillas
  const { data: templates, error: fetchError } = await supabase
    .from('whatsapp_templates')
    .select('id, name, variable_mappings');

  if (fetchError) {
    console.error('❌ Error obteniendo plantillas:', fetchError);
    return;
  }

  console.log(`📋 Encontradas ${templates.length} plantillas\n`);

  let updatedCount = 0;

  for (const template of templates) {
    if (!template.variable_mappings) continue;

    let mappings = template.variable_mappings;
    
    // Parsear si es string
    if (typeof mappings === 'string') {
      try {
        mappings = JSON.parse(mappings);
      } catch (e) {
        continue;
      }
    }

    // Verificar si tiene audience_ids
    if (!mappings || typeof mappings !== 'object') continue;
    
    let audienceIds = mappings.audience_ids;
    if (!Array.isArray(audienceIds)) continue;

    // Verificar si tiene IDs hardcodeados
    const hasHardcoded = audienceIds.some(id => etapaMapping[id]);
    if (!hasHardcoded) continue;

    // Reemplazar IDs hardcodeados
    const updatedAudienceIds = audienceIds.map(id => etapaMapping[id] || id);

    // Actualizar variable_mappings
    const updatedMappings = {
      ...mappings,
      audience_ids: updatedAudienceIds,
    };

    // Actualizar en BD
    const { error: updateError } = await supabase
      .from('whatsapp_templates')
      .update({
        variable_mappings: updatedMappings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', template.id);

    if (updateError) {
      console.error(`❌ Error actualizando plantilla ${template.name}:`, updateError);
    } else {
      console.log(`✅ Actualizada: ${template.name}`);
      updatedCount++;
    }
  }

  console.log(`\n✨ Migración completada: ${updatedCount} plantillas actualizadas`);
}

migrateTemplates().catch(console.error);

