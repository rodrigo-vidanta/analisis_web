#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(
  env.VITE_SYSTEM_UI_SUPABASE_URL,
  env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY
);

console.log('🔍 Verificando etiquetas preset...\n');

const { data, error } = await supabase
  .from('whatsapp_labels_preset')
  .select('*')
  .order('display_order');

if (error) {
  console.error('❌ Error:', error);
} else if (!data || data.length === 0) {
  console.log('⚠️ NO HAY ETIQUETAS PRESET - Insertando...\n');
  
  const { error: insertError } = await supabase
    .from('whatsapp_labels_preset')
    .insert([
      { name: 'Nuevo Lead', color: '#3B82F6', icon: 'user-plus', description: 'Prospecto nuevo sin gestionar', business_rule: 'neutral', display_order: 1 },
      { name: 'En Seguimiento', color: '#F59E0B', icon: 'clock', description: 'Prospecto en proceso de seguimiento', business_rule: 'neutral', display_order: 2 },
      { name: 'Reservación Concretada', color: '#10B981', icon: 'check-circle', description: 'Cliente ha concretado una reservación', business_rule: 'positive', display_order: 3 },
      { name: 'No Interesado', color: '#EF4444', icon: 'x-circle', description: 'Cliente no está interesado en el servicio', business_rule: 'negative', display_order: 4 },
      { name: 'Pendiente de Pago', color: '#8B5CF6', icon: 'credit-card', description: 'Cliente pendiente de realizar pago', business_rule: 'neutral', display_order: 5 },
      { name: 'Reagendar', color: '#F97316', icon: 'calendar', description: 'Necesita reagendar cita o llamada', business_rule: 'neutral', display_order: 6 }
    ]);
  
  if (insertError) {
    console.error('❌ Error insertando:', insertError);
  } else {
    console.log('✅ 6 etiquetas preset creadas');
  }
} else {
  console.log(`✅ Hay ${data.length} etiquetas preset:`);
  console.table(data.map(d => ({ nombre: d.name, color: d.color, activa: d.is_active })));
}

process.exit(0);

