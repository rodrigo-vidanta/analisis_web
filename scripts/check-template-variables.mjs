#!/usr/bin/env node
/**
 * Script para validar que las plantillas de WhatsApp tengan variable_mappings correctos
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_ANALYSIS_SUPABASE_URL;
const supabaseKey = process.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno VITE_ANALYSIS_SUPABASE_URL o VITE_ANALYSIS_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTemplates() {
  console.log('🔍 Consultando plantillas...\n');

  const { data: templates, error } = await supabase
    .from('whatsapp_templates')
    .select('id, name, components, variable_mappings, is_active, status')
    .eq('is_active', true)
    .eq('status', 'APPROVED');

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log(`✅ Plantillas encontradas: ${templates.length}\n`);

  const issues = [];

  for (const template of templates) {
    // Extraer todas las variables {{N}} de los componentes
    const variablesInText = new Set();
    
    for (const component of template.components || []) {
      if (component.text) {
        const matches = component.text.matchAll(/\{\{(\d+)\}\}/g);
        for (const match of matches) {
          variablesInText.add(parseInt(match[1], 10));
        }
      }
    }

    // Extraer números de variables en mappings
    const variablesInMappings = new Set(
      (template.variable_mappings || []).map(m => m.variable_number)
    );

    // Comparar
    const missingMappings = [...variablesInText].filter(v => !variablesInMappings.has(v));
    const unusedMappings = [...variablesInMappings].filter(v => !variablesInText.has(v));

    if (missingMappings.length > 0 || unusedMappings.length > 0) {
      issues.push({
        name: template.name,
        id: template.id,
        missingMappings,
        unusedMappings,
        variablesInText: [...variablesInText].sort(),
        variablesInMappings: [...variablesInMappings].sort(),
      });
    }
  }

  if (issues.length === 0) {
    console.log('✅ Todas las plantillas tienen variable_mappings correctos\n');
    return;
  }

  console.log(`⚠️  Encontrados ${issues.length} problemas:\n`);

  for (const issue of issues) {
    console.log(`📋 ${issue.name} (${issue.id})`);
    
    if (issue.missingMappings.length > 0) {
      console.log(`   ❌ Variables en texto SIN mapping: {{${issue.missingMappings.join('}}, {{')}}}`);
    }
    
    if (issue.unusedMappings.length > 0) {
      console.log(`   ⚠️  Variables con mapping pero NO usadas: {{${issue.unusedMappings.join('}}, {{')}}}`);
    }

    console.log(`   Variables en texto: [${issue.variablesInText.join(', ')}]`);
    console.log(`   Variables con mapping: [${issue.variablesInMappings.join(', ')}]`);
    console.log('');
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   Total plantillas: ${templates.length}`);
  console.log(`   Con problemas: ${issues.length}`);
  console.log(`   Correctas: ${templates.length - issues.length}\n`);
}

checkTemplates().catch(console.error);
