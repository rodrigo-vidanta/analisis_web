#!/usr/bin/env tsx

/**
 * Script para sincronizar coordinacion_id en auth.users.raw_user_meta_data
 * para coordinadores que tienen el campo en null
 * 
 * Fecha: 29 de Enero 2026
 * Ejecutar: npx tsx scripts/fix-coordinadores-coordinacion-id.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Leer variables de entorno desde .env o .env.local
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    const env: Record<string, string> = {};
    lines.forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"]|['"]$/g, '');
        env[key] = value;
      }
    });
    
    return env;
  } catch (error) {
    try {
      const envPath = resolve(process.cwd(), '.env');
      const envContent = readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      
      const env: Record<string, string> = {};
      lines.forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^['"]|['"]$/g, '');
          env[key] = value;
        }
      });
      
      return env;
    } catch {
      console.error('❌ No se pudo leer .env ni .env.local');
      return {};
    }
  }
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_ANALYSIS_SUPABASE_URL || 'https://glsmifhkoaifvaegsozd.supabase.co';
const EDGE_FUNCTIONS_URL = env.VITE_EDGE_FUNCTIONS_URL || SUPABASE_URL;
const ANON_KEY = env.VITE_ANALYSIS_SUPABASE_ANON_KEY;

if (!ANON_KEY) {
  console.error('❌ Error: VITE_ANALYSIS_SUPABASE_ANON_KEY no está definida en .env');
  process.exit(1);
}

// Coordinadores a actualizar
const coordinadoresAActualizar = [
  {
    email: 'diegobarba@vidavacations.com',
    userId: '5b8852ef-ae60-4b82-a7aa-bc4f98ee1654',
    coordinacionId: 'f33742b9-46cf-4716-bf7a-ce129a82bad2',
    coordinacionNombre: 'APEX'
  },
  {
    email: 'paolamaldonado@vidavacations.com',
    userId: '8313be22-91b7-4c8b-a5c2-bc81caf1ab06',
    coordinacionId: '3f41a10b-60b1-4c2b-b097-a83968353af5',
    coordinacionNombre: 'GDLM'
  },
  {
    email: 'fernandamondragon@vidavacations.com',
    userId: '9e81ada2-028d-426a-ad10-8a814080a3df',
    coordinacionId: 'eea1c2ff-b50c-48ba-a694-0dc4c96706ca',
    coordinacionNombre: 'MX CORP'
  },
  {
    email: 'angelicaguzman@vidavacations.com',
    userId: 'e86a85eb-b291-476d-8cd4-08b1391e5a7a',
    coordinacionId: 'eea1c2ff-b50c-48ba-a694-0dc4c96706ca',
    coordinacionNombre: 'MX CORP'
  },
  {
    email: 'vanessaperez@vidavacations.com',
    userId: '90303228-29d4-4938-8245-4c5275bc881d',
    coordinacionId: 'eea1c2ff-b50c-48ba-a694-0dc4c96706ca',
    coordinacionNombre: 'MX CORP'
  },
  {
    email: 'elizabethhernandez@vidavacations.com',
    userId: '226d0071-a391-4c86-8f83-d4e9fc58bdc1',
    coordinacionId: 'eea1c2ff-b50c-48ba-a694-0dc4c96706ca',
    coordinacionNombre: 'MX CORP'
  }
];

async function actualizarCoordinador(coordinador: typeof coordinadoresAActualizar[0]) {
  try {
    console.log(`\n📝 Actualizando ${coordinador.email}...`);
    console.log(`   User ID: ${coordinador.userId}`);
    console.log(`   Coordinación: ${coordinador.coordinacionNombre} (${coordinador.coordinacionId})`);

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/functions/v1/auth-admin-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        operation: 'updateUserMetadata',
        params: {
          userId: coordinador.userId,
          metadata: {
            coordinacion_id: coordinador.coordinacionId
          }
        }
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error(`   ❌ Error: ${result.error || 'Unknown error'}`);
      return false;
    }

    console.log(`   ✅ Actualizado exitosamente`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error en la actualización:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando sincronización de coordinacion_id para coordinadores...\n');
  console.log(`📊 Total de coordinadores a actualizar: ${coordinadoresAActualizar.length}\n`);

  let exitosos = 0;
  let fallidos = 0;

  for (const coordinador of coordinadoresAActualizar) {
    const success = await actualizarCoordinador(coordinador);
    if (success) {
      exitosos++;
    } else {
      fallidos++;
    }
    
    // Pequeña pausa entre actualizaciones
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN');
  console.log('='.repeat(60));
  console.log(`✅ Exitosos: ${exitosos}`);
  console.log(`❌ Fallidos: ${fallidos}`);
  console.log(`📝 Total: ${coordinadoresAActualizar.length}`);
  console.log('='.repeat(60));

  if (fallidos > 0) {
    console.log('\n⚠️  Algunos coordinadores no pudieron ser actualizados.');
    console.log('   Revisar los errores arriba y ejecutar el script SQL manualmente si es necesario.');
    process.exit(1);
  } else {
    console.log('\n✅ Todos los coordinadores fueron actualizados exitosamente!');
    console.log('\n📢 IMPORTANTE: Los usuarios deben cerrar sesión y volver a iniciar para que los cambios tengan efecto.');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
