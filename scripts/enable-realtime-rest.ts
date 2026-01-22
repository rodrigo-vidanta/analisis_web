#!/usr/bin/env tsx
/**
 * Script para habilitar Realtime usando Supabase Management API REST
 * 
 * Usa el access token de .supabase/access_token para ejecutar SQL
 * directamente en la base de datos.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

const SUPABASE_PROJECT_ID = 'glsmifhkoaifvaegsozd';
const SUPABASE_API_URL = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}`;

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Leer access token
function getAccessToken(): string {
  const tokenPath = join(ROOT_DIR, '.supabase/access_token');
  
  if (!existsSync(tokenPath)) {
    log('❌ Error: No se encontró .supabase/access_token', 'red');
    log('   Crea el archivo con tu access token de Supabase:', 'yellow');
    log('   echo "sbp_tu_token" > .supabase/access_token', 'yellow');
    process.exit(1);
  }
  
  const token = readFileSync(tokenPath, 'utf-8').trim();
  
  if (!token.startsWith('sbp_')) {
    log('⚠️  Advertencia: El token no parece ser un access token válido (debe empezar con sbp_)', 'yellow');
  }
  
  return token;
}

// Ejecutar SQL usando Management API REST
async function executeSQL(sql: string, description: string): Promise<any> {
  const accessToken = getAccessToken();
  
  log(`\n🔧 ${description}...`, 'cyan');
  
  try {
    // Usar el endpoint de ejecución SQL de Supabase Management API
    // Mismo endpoint que usa el servidor MCP
    const response = await fetch(`${SUPABASE_API_URL}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: sql,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      // Error 42710: relation already member of publication (es idempotente, está bien)
      if (errorData.message && errorData.message.includes('42710') && 
          errorData.message.includes('already member of publication')) {
        log(`✅ Ya estaba habilitado (idempotente)`, 'green');
        return { success: true, alreadyEnabled: true };
      }
      
      log(`❌ Error HTTP ${response.status}: ${errorText}`, 'red');
      
      // Si es 404, el endpoint puede no estar disponible
      if (response.status === 404) {
        log(`\n⚠️  Endpoint no disponible. SQL a ejecutar manualmente:`, 'yellow');
        log(`\n${sql}`, 'green');
        return null;
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    log(`✅ ${description} completado`, 'green');
    
    // Mostrar resultado si hay datos
    if (Array.isArray(result) && result.length > 0) {
      log(`   Resultado: ${result.length} fila(s)`, 'cyan');
    }
    
    return result;
  } catch (error: any) {
    log(`❌ Error: ${error.message}`, 'red');
    log(`\n📝 SQL a ejecutar manualmente:`, 'yellow');
    log(`\n${sql}`, 'green');
    return null;
  }
}

// Verificar estado de realtime
async function verifyRealtime(): Promise<void> {
  const accessToken = getAccessToken();
  
  log(`\n🔍 Verificando estado de Realtime...`, 'cyan');
  
  const sql = `
    SELECT 
      schemaname,
      tablename,
      pubname
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND tablename IN ('system_config', 'llamadas_programadas')
    ORDER BY tablename;
  `;
  
  try {
    const result = await executeSQL(sql, 'Verificando tablas con realtime');
    
    if (result && Array.isArray(result) && result.length > 0) {
      const tables = result;
      const tableNames = tables.map((t: any) => t.tablename || t.table_name);
      
      if (tableNames.length === 2) {
        log(`\n✅ Realtime habilitado en ambas tablas:`, 'green');
        tableNames.forEach((name: string) => {
          log(`   ✓ ${name}`, 'green');
        });
      } else if (tableNames.length === 1) {
        log(`\n⚠️  Solo una tabla tiene realtime habilitado:`, 'yellow');
        tableNames.forEach((name: string) => {
          log(`   ✓ ${name}`, 'yellow');
        });
        const missing = tableNames[0] === 'system_config' ? 'llamadas_programadas' : 'system_config';
        log(`\n   ❌ Falta habilitar: ${missing}`, 'yellow');
      } else {
        log(`\n❌ Ninguna tabla tiene realtime habilitado`, 'red');
      }
    } else if (result && Array.isArray(result) && result.length === 0) {
      log(`\n❌ Ninguna tabla tiene realtime habilitado`, 'red');
    }
  } catch (error: any) {
    log(`\n⚠️  No se pudo verificar automáticamente`, 'yellow');
    log(`   Ejecuta este SQL manualmente en Supabase Dashboard:`, 'yellow');
    log(`\n${sql}`, 'green');
  }
}

// Función principal
async function main() {
  log('\n🚀 Habilitando Realtime usando Supabase Management API REST...', 'blue');
  
  const accessToken = getAccessToken();
  log(`✅ Access token encontrado (${accessToken.substring(0, 10)}...)`, 'green');
  
  // SQL para habilitar realtime
  const sqlCommands = [
    {
      sql: `ALTER PUBLICATION supabase_realtime ADD TABLE public.system_config;`,
      description: 'Habilitar Realtime en system_config'
    },
    {
      sql: `ALTER PUBLICATION supabase_realtime ADD TABLE public.llamadas_programadas;`,
      description: 'Habilitar Realtime en llamadas_programadas'
    }
  ];
  
  // Intentar ejecutar cada comando
  for (const cmd of sqlCommands) {
    try {
      await executeSQL(cmd.sql, cmd.description);
    } catch (error: any) {
      log(`\n⚠️  No se pudo ejecutar automáticamente: ${cmd.description}`, 'yellow');
      log(`   SQL a ejecutar manualmente:`, 'yellow');
      log(`\n${cmd.sql}\n`, 'green');
    }
  }
  
  // Verificar estado
  await verifyRealtime();
  
  log('\n✅ Proceso completado', 'green');
  log('\n📝 Nota: Si la ejecución automática falló, ejecuta el SQL manualmente en:', 'cyan');
  log('   https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new', 'yellow');
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});
