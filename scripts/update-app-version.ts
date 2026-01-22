#!/usr/bin/env tsx
/**
 * Script para actualizar la versión requerida de la aplicación en la base de datos
 * 
 * Uso:
 *   tsx scripts/update-app-version.ts <version>
 * 
 * Ejemplo:
 *   tsx scripts/update-app-version.ts 2.5.40
 * 
 * Esto actualizará la configuración en system_config para forzar actualización
 * de todos los usuarios a la versión especificada.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Cargar variables de entorno
dotenv.config({ path: join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_ANALYSIS_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.VITE_ANALYSIS_SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Variables de entorno no configuradas');
  console.error('   Requiere: VITE_ANALYSIS_SUPABASE_URL y VITE_ANALYSIS_SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function updateAppVersion(version: string) {
  try {
    console.log(`🔄 Actualizando versión requerida a: ${version}`);

    // Verificar si ya existe la configuración
    const { data: existing } = await supabase
      .from('system_config')
      .select('id')
      .eq('config_key', 'app_version')
      .single();

    const configValue = {
      version,
      force_update: true,
      updated_at: new Date().toISOString()
    };

    if (existing) {
      // Actualizar existente
      const { error } = await supabase
        .from('system_config')
        .update({
          config_value: configValue,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', 'app_version');

      if (error) {
        throw error;
      }

      console.log('✅ Versión actualizada exitosamente');
    } else {
      // Crear nuevo
      const { error } = await supabase
        .from('system_config')
        .insert({
          config_key: 'app_version',
          config_value: configValue,
          description: 'Versión requerida de la aplicación. Los usuarios con versiones anteriores serán forzados a actualizar.'
        });

      if (error) {
        throw error;
      }

      console.log('✅ Versión creada exitosamente');
    }

    console.log(`\n📋 Configuración:`);
    console.log(`   Versión requerida: ${version}`);
    console.log(`   Force update: true`);
    console.log(`\n⚠️  Todos los usuarios con versión diferente serán forzados a actualizar`);

  } catch (error) {
    console.error('❌ Error al actualizar versión:', error);
    process.exit(1);
  }
}

// Obtener versión del argumento o package.json
const args = process.argv.slice(2);
let targetVersion = args[0];

if (!targetVersion) {
  // Intentar leer de package.json
  try {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    targetVersion = packageJson.version;
    console.log(`📦 Versión detectada de package.json: ${targetVersion}`);
  } catch (error) {
    console.error('❌ Error: No se proporcionó versión y no se pudo leer package.json');
    console.error('   Uso: tsx scripts/update-app-version.ts <version>');
    process.exit(1);
  }
}

updateAppVersion(targetVersion);
