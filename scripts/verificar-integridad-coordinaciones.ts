#!/usr/bin/env tsx

/**
 * Script de verificación de integridad de coordinaciones
 * 
 * Fecha: 29 de Enero 2026
 * Ejecutar: npx tsx scripts/verificar-integridad-coordinaciones.ts
 */

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

interface VerificationResult {
  category: string;
  issues: Array<{
    userId: string;
    email: string;
    fullName: string;
    roleName: string;
    coordinacionIdMetadata: string | null;
    numCoordinaciones: number;
    issue: string;
  }>;
}

async function executeQuery(sql: string): Promise<any[]> {
  try {
    const response = await fetch(`${EDGE_FUNCTIONS_URL}/functions/v1/auth-admin-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        operation: 'executeRawSQL',
        params: {
          sql
        }
      })
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error('❌ Error ejecutando query:', result.error);
      return [];
    }

    return result.data || [];
  } catch (error) {
    console.error('❌ Error en executeQuery:', error);
    return [];
  }
}

async function main() {
  console.log('🔍 Iniciando verificación de integridad de coordinaciones...\n');
  
  const results: VerificationResult[] = [];

  // ============================================
  // 1. Coordinadores con coordinacion_id NO NULL en metadata (INCORRECTO)
  // ============================================
  console.log('📋 Verificando coordinadores con coordinacion_id en metadata...');
  
  const query1 = `
    SELECT 
      id,
      email,
      raw_user_meta_data->>'full_name' as full_name,
      raw_user_meta_data->>'role_name' as role_name,
      raw_user_meta_data->>'coordinacion_id' as coordinacion_id_metadata,
      (SELECT COUNT(*) FROM auth_user_coordinaciones WHERE user_id = auth.users.id) as num_coordinaciones
    FROM auth.users
    WHERE raw_user_meta_data->>'role_name' = 'coordinador'
      AND raw_user_meta_data->>'coordinacion_id' IS NOT NULL
      AND raw_user_meta_data->>'coordinacion_id' != 'null'
    ORDER BY email;
  `;
  
  const coordinadoresConMetadata = await executeQuery(query1);
  
  if (coordinadoresConMetadata.length > 0) {
    console.log(`   ⚠️  Encontrados ${coordinadoresConMetadata.length} coordinadores con coordinacion_id en metadata (debería ser null)`);
    results.push({
      category: 'Coordinadores con coordinacion_id en metadata',
      issues: coordinadoresConMetadata.map(row => ({
        userId: row.id,
        email: row.email,
        fullName: row.full_name,
        roleName: row.role_name,
        coordinacionIdMetadata: row.coordinacion_id_metadata,
        numCoordinaciones: parseInt(row.num_coordinaciones) || 0,
        issue: 'Coordinadores deben tener coordinacion_id = null en metadata'
      }))
    });
  } else {
    console.log('   ✅ Todos los coordinadores tienen coordinacion_id = null en metadata');
  }

  // ============================================
  // 2. Ejecutivos/Supervisores con coordinacion_id NULL en metadata (INCORRECTO)
  // ============================================
  console.log('\n📋 Verificando ejecutivos/supervisores sin coordinacion_id en metadata...');
  
  const query2 = `
    SELECT 
      id,
      email,
      raw_user_meta_data->>'full_name' as full_name,
      raw_user_meta_data->>'role_name' as role_name,
      raw_user_meta_data->>'coordinacion_id' as coordinacion_id_metadata,
      (SELECT COUNT(*) FROM auth_user_coordinaciones WHERE user_id = auth.users.id) as num_coordinaciones
    FROM auth.users
    WHERE (raw_user_meta_data->>'role_name' = 'ejecutivo' OR raw_user_meta_data->>'role_name' = 'supervisor')
      AND (raw_user_meta_data->>'coordinacion_id' IS NULL OR raw_user_meta_data->>'coordinacion_id' = 'null')
    ORDER BY email;
  `;
  
  const ejecutivosSinMetadata = await executeQuery(query2);
  
  if (ejecutivosSinMetadata.length > 0) {
    console.log(`   ⚠️  Encontrados ${ejecutivosSinMetadata.length} ejecutivos/supervisores sin coordinacion_id en metadata`);
    results.push({
      category: 'Ejecutivos/Supervisores sin coordinacion_id en metadata',
      issues: ejecutivosSinMetadata.map(row => ({
        userId: row.id,
        email: row.email,
        fullName: row.full_name,
        roleName: row.role_name,
        coordinacionIdMetadata: row.coordinacion_id_metadata,
        numCoordinaciones: parseInt(row.num_coordinaciones) || 0,
        issue: 'Ejecutivos/Supervisores deben tener coordinacion_id = UUID en metadata'
      }))
    });
  } else {
    console.log('   ✅ Todos los ejecutivos/supervisores tienen coordinacion_id en metadata');
  }

  // ============================================
  // 3. Coordinadores/Ejecutivos/Supervisores sin relación en auth_user_coordinaciones (INCORRECTO)
  // ============================================
  console.log('\n📋 Verificando usuarios sin relación en auth_user_coordinaciones...');
  
  const query3 = `
    SELECT 
      au.id,
      au.email,
      au.raw_user_meta_data->>'full_name' as full_name,
      au.raw_user_meta_data->>'role_name' as role_name,
      au.raw_user_meta_data->>'coordinacion_id' as coordinacion_id_metadata,
      0 as num_coordinaciones
    FROM auth.users au
    WHERE (au.raw_user_meta_data->>'role_name' IN ('coordinador', 'ejecutivo', 'supervisor'))
      AND NOT EXISTS (SELECT 1 FROM auth_user_coordinaciones WHERE user_id = au.id)
    ORDER BY au.email;
  `;
  
  const usuariosSinRelacion = await executeQuery(query3);
  
  if (usuariosSinRelacion.length > 0) {
    console.log(`   ⚠️  Encontrados ${usuariosSinRelacion.length} usuarios sin relación en auth_user_coordinaciones`);
    results.push({
      category: 'Usuarios sin relación en auth_user_coordinaciones',
      issues: usuariosSinRelacion.map(row => ({
        userId: row.id,
        email: row.email,
        fullName: row.full_name,
        roleName: row.role_name,
        coordinacionIdMetadata: row.coordinacion_id_metadata,
        numCoordinaciones: parseInt(row.num_coordinaciones) || 0,
        issue: 'Coordinadores/Ejecutivos/Supervisores deben tener al menos una coordinación asignada'
      }))
    });
  } else {
    console.log('   ✅ Todos los usuarios tienen relación en auth_user_coordinaciones');
  }

  // ============================================
  // RESUMEN
  // ============================================
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMEN DE VERIFICACIÓN');
  console.log('='.repeat(80));
  
  if (results.length === 0) {
    console.log('✅ No se encontraron problemas de integridad');
    console.log('✅ Todos los usuarios están correctamente configurados');
    return;
  }

  console.log(`⚠️  Se encontraron ${results.length} categorías de problemas:\n`);
  
  let totalIssues = 0;
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.category}: ${result.issues.length} usuario(s)`);
    totalIssues += result.issues.length;
    
    result.issues.forEach(issue => {
      console.log(`   - ${issue.email} (${issue.fullName})`);
      console.log(`     Rol: ${issue.roleName}`);
      console.log(`     coordinacion_id en metadata: ${issue.coordinacionIdMetadata || 'null'}`);
      console.log(`     Coordinaciones en tabla: ${issue.numCoordinaciones}`);
      console.log(`     Problema: ${issue.issue}`);
      console.log('');
    });
  });

  console.log('='.repeat(80));
  console.log(`Total de problemas encontrados: ${totalIssues}`);
  console.log('='.repeat(80));

  console.log('\n💡 RECOMENDACIÓN:');
  console.log('   Ejecutar script de corrección para sincronizar los datos');
  console.log('   Archivo: FIX_COORDINADORES_MASIVO_2026-01-29.sql\n');

  process.exit(1);
}

main().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
