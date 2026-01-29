#!/usr/bin/env node
/**
 * Script para actualizar app_version en system_config
 * Usar cuando el MCP no puede actualizar directamente
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env.local') });
dotenv.config({ path: join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_ANALYSIS_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateAppVersion(version) {
  console.log(`🔄 Actualizando app_version a: ${version}`);

  const { data, error } = await supabase
    .from('system_config')
    .update({
      config_value: {
        version: version,
        force_update: true
      },
      updated_at: new Date().toISOString()
    })
    .eq('config_key', 'app_version')
    .select();

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('✅ Versión actualizada:', data);
  
  // Verificar
  const { data: verify } = await supabase
    .from('system_config')
    .select('config_key, config_value, updated_at')
    .eq('config_key', 'app_version')
    .single();

  console.log('📊 Verificación:', verify);
}

const version = process.argv[2] || 'B10.1.43N2.5.61';
updateAppVersion(version);
