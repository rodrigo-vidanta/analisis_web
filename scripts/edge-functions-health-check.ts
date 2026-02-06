/**
 * ============================================
 * EDGE FUNCTIONS HEALTH CHECK
 * ============================================
 * 
 * Script para detectar Edge Functions "fantasma" en Supabase:
 * funciones registradas como ACTIVE en Management API pero sin
 * código desplegado (retornan 404 en runtime).
 * 
 * Uso:
 *   npx tsx scripts/edge-functions-health-check.ts
 * 
 * Requisitos:
 *   - .supabase/access_token con Personal Access Token de Supabase
 *   - Conexión a internet
 * 
 * Fecha: 06 Febrero 2026
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================
// CONFIGURACIÓN
// ============================================

const PROJECT_REF = 'glsmifhkoaifvaegsozd';
const MANAGEMENT_API = 'https://api.supabase.com/v1';
const RUNTIME_BASE = `https://${PROJECT_REF}.supabase.co/functions/v1`;
const ORIGIN = 'https://ai.vidavacations.com';

// Funciones formalmente deprecadas (no alertar si están 404)
const DEPRECATED_FUNCTIONS = new Set([
  'agent-creator-proxy',
  'cotizar-habitacion',
  'error-analisis-proxy',
  'n8n-proxy',
  'anthropic-proxy',
  'hola_mundo',
]);

// ============================================
// TIPOS
// ============================================

interface FunctionInfo {
  slug: string;
  status: string;
  verify_jwt: boolean;
  version: number;
  created_at: number;
  updated_at: number;
}

interface HealthResult {
  slug: string;
  apiStatus: string;
  verifyJwt: boolean;
  httpStatus: number;
  verdict: 'OK' | 'GHOST' | 'DEPRECATED' | 'ERROR';
  version: number;
}

// ============================================
// FUNCIONES
// ============================================

async function getAccessToken(): Promise<string> {
  const tokenPath = join(process.cwd(), '.supabase', 'access_token');
  try {
    return readFileSync(tokenPath, 'utf-8').trim();
  } catch {
    console.error('Error: No se encontró .supabase/access_token');
    console.error('Ejecuta: echo "sbp_TU_TOKEN" > .supabase/access_token');
    process.exit(1);
  }
}

async function listFunctions(token: string): Promise<FunctionInfo[]> {
  const response = await fetch(`${MANAGEMENT_API}/projects/${PROJECT_REF}/functions`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Management API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function testOptionsRequest(slug: string): Promise<number> {
  try {
    const response = await fetch(`${RUNTIME_BASE}/${slug}`, {
      method: 'OPTIONS',
      headers: {
        'Origin': ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization',
      },
    });
    return response.status;
  } catch {
    return -1;
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0];
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('');
  console.log('========================================');
  console.log('  EDGE FUNCTIONS HEALTH CHECK');
  console.log(`  Proyecto: ${PROJECT_REF}`);
  console.log(`  Fecha: ${new Date().toISOString()}`);
  console.log('========================================');
  console.log('');

  const token = await getAccessToken();
  const functions = await listFunctions(token);

  console.log(`Encontradas ${functions.length} funciones registradas.`);
  console.log('Probando conectividad...\n');

  const results: HealthResult[] = [];

  // Ejecutar tests en paralelo (batches de 5 para no saturar)
  const batchSize = 5;
  for (let i = 0; i < functions.length; i += batchSize) {
    const batch = functions.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (fn) => {
        const httpStatus = await testOptionsRequest(fn.slug);
        let verdict: HealthResult['verdict'];

        if (DEPRECATED_FUNCTIONS.has(fn.slug)) {
          verdict = 'DEPRECATED';
        } else if (httpStatus === 200) {
          verdict = 'OK';
        } else if (httpStatus === 404) {
          verdict = 'GHOST';
        } else {
          verdict = 'ERROR';
        }

        return {
          slug: fn.slug,
          apiStatus: fn.status,
          verifyJwt: fn.verify_jwt,
          httpStatus,
          verdict,
          version: fn.version,
        };
      })
    );
    results.push(...batchResults);
  }

  // Ordenar: GHOST primero, luego ERROR, luego DEPRECATED, luego OK
  const order = { GHOST: 0, ERROR: 1, DEPRECATED: 2, OK: 3 };
  results.sort((a, b) => order[a.verdict] - order[b.verdict]);

  // Imprimir tabla
  const slugWidth = Math.max(...results.map(r => r.slug.length), 4) + 2;

  console.log(
    'SLUG'.padEnd(slugWidth) +
    'API'.padEnd(10) +
    'JWT'.padEnd(8) +
    'HTTP'.padEnd(8) +
    'VER'.padEnd(6) +
    'VEREDICTO'
  );
  console.log('-'.repeat(slugWidth + 10 + 8 + 8 + 6 + 12));

  for (const r of results) {
    const icon = r.verdict === 'OK' ? '  ' :
                 r.verdict === 'GHOST' ? '! ' :
                 r.verdict === 'DEPRECATED' ? '~ ' : '? ';

    console.log(
      `${icon}${r.slug}`.padEnd(slugWidth) +
      r.apiStatus.padEnd(10) +
      String(r.verifyJwt).padEnd(8) +
      String(r.httpStatus).padEnd(8) +
      `v${r.version}`.padEnd(6) +
      r.verdict
    );
  }

  // Resumen
  const ghosts = results.filter(r => r.verdict === 'GHOST');
  const errors = results.filter(r => r.verdict === 'ERROR');
  const deprecated = results.filter(r => r.verdict === 'DEPRECATED');
  const ok = results.filter(r => r.verdict === 'OK');

  console.log('');
  console.log('========================================');
  console.log('  RESUMEN');
  console.log('========================================');
  console.log(`  OK:         ${ok.length}`);
  console.log(`  GHOST:      ${ghosts.length}`);
  console.log(`  ERROR:      ${errors.length}`);
  console.log(`  DEPRECATED: ${deprecated.length}`);
  console.log(`  TOTAL:      ${results.length}`);
  console.log('');

  if (ghosts.length > 0) {
    console.log('ACCIONES REQUERIDAS:');
    for (const g of ghosts) {
      console.log(`  [GHOST] ${g.slug} - Necesita redeploy:`);
      console.log(`          npx supabase functions deploy ${g.slug} --project-ref ${PROJECT_REF} --no-verify-jwt`);
    }
    console.log('');
  }

  if (errors.length > 0) {
    console.log('ERRORES INESPERADOS:');
    for (const e of errors) {
      console.log(`  [ERROR] ${e.slug} - HTTP ${e.httpStatus} (investigar manualmente)`);
    }
    console.log('');
  }

  // Exit code: 1 si hay ghosts o errores
  const exitCode = (ghosts.length > 0 || errors.length > 0) ? 1 : 0;
  process.exit(exitCode);
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(2);
});
