#!/usr/bin/env node
/**
 * Script para actualizar el nombre de un ejecutivo
 * 
 * Uso: node scripts/actualizar-nombre-ejecutivo.mjs <email> <nuevo_nombre>
 * Ejemplo: node scripts/actualizar-nombre-ejecutivo.mjs gisselortiz@vidavacations.com "Issel Rico"
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(dirname(__dirname), '.env.local') });

const url = process.env.VITE_ANALYSIS_SUPABASE_URL;
const serviceKey = process.env.VITE_ANALYSIS_SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

const email = process.argv[2];
const nuevoNombre = process.argv[3];

if (!email || !nuevoNombre) {
  console.log('❌ Uso: node actualizar-nombre-ejecutivo.mjs <email> <nuevo_nombre>');
  console.log('Ejemplo: node scripts/actualizar-nombre-ejecutivo.mjs gisselortiz@vidavacations.com "Issel Rico"');
  process.exit(1);
}

async function actualizar() {
  console.log('🔍 Buscando usuario...\n');
  
  // Buscar usuario en auth.users
  const { data: users, error: searchError } = await supabase.auth.admin.listUsers();
  
  if (searchError) {
    console.error('❌ Error buscando usuarios:', searchError.message);
    return;
  }

  const user = users.users.find(u => u.email === email);
  
  if (!user) {
    console.error(`❌ Usuario no encontrado: ${email}`);
    return;
  }

  console.log('✅ Usuario encontrado:');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Nombre actual:', user.user_metadata?.full_name || 'SIN NOMBRE');
  console.log('');

  // Extraer primer y último nombre del nuevo nombre completo
  const partes = nuevoNombre.trim().split(/\s+/);
  const firstName = partes[0];
  const lastName = partes.slice(1).join(' ') || partes[0];

  console.log('📝 Actualizando a:');
  console.log('   Nombre completo:', nuevoNombre);
  console.log('   First name:', firstName);
  console.log('   Last name:', lastName);
  console.log('');

  // Confirmar
  console.log('⚠️  ¿Continuar? (Ctrl+C para cancelar, Enter para continuar)');
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  // Actualizar metadata en auth.users
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      full_name: nuevoNombre,
      first_name: firstName,
      last_name: lastName
    }
  });

  if (error) {
    console.error('❌ Error actualizando:', error.message);
    return;
  }

  console.log('✅ Usuario actualizado exitosamente');
  console.log('');

  // Verificar cambio
  const { data: verificacion } = await supabase
    .from('user_profiles_v2')
    .select('full_name, first_name, last_name')
    .eq('email', email)
    .single();

  if (verificacion) {
    console.log('✅ Verificación en user_profiles_v2:');
    console.log('   Nombre completo:', verificacion.full_name);
    console.log('   First name:', verificacion.first_name);
    console.log('   Last name:', verificacion.last_name);
    console.log('');
  }

  console.log('✅ Proceso completado');
  console.log('   El ejecutivo ahora aparecerá como:', nuevoNombre);
  console.log('   Recarga el módulo de Prospectos (F5) para ver el cambio');
}

actualizar()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
