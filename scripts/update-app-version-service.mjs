#!/usr/bin/env node
/**
 * Script para actualizar app_version en system_config usando service_role
 */

import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_ANALYSIS_SUPABASE_URL;
const SERVICE_KEY = process.env.VITE_ANALYSIS_SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Variables de entorno no configuradas (necesita service_key en .env.local)');
  process.exit(1);
}

const version = process.argv[2] || 'B10.1.43N2.5.61';

async function updateVersion() {
  console.log(`🔄 Actualizando app_version a: ${version}`);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/system_config?config_key=eq.app_version`, {
    method: 'PATCH',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      config_value: {
        version: version,
        force_update: true
      },
      updated_at: new Date().toISOString()
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Error:', error);
    process.exit(1);
  }

  const data = await response.json();
  console.log('✅ Versión actualizada:', data);
}

updateVersion();
