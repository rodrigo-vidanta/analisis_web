/**
 * AGGRESSIVE SECURITY AUDIT - ai.vidavacations.com
 * PQNC QA AI Platform
 */

const BASE_URL = 'https://ai.vidavacations.com';
const SUPABASE_URL = 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const SUPABASE_SYSTEM_URL = 'https://zbylezfyagwrxoecioup.supabase.co';

// ========================================
// TEST 1: Rate Limiting (200 requests)
// ========================================
async function test1_RateLimiting() {
  console.log('[TEST 1] Rate Limiting - 200 requests a frontend');
  
  const results = [];
  const startTime = Date.now();
  
  for (let i = 0; i < 200; i++) {
    const start = Date.now();
    try {
      const response = await fetch(`${BASE_URL}/`, {
        method: 'GET'
      });
      
      results.push({
        status: response.status,
        blocked: response.status === 429 || response.status === 403,
        time: Date.now() - start
      });
    } catch (error) {
      results.push({ error: true });
    }
  }
  
  const endTime = Date.now();
  const blocked = results.filter(r => r.blocked).length;
  const avgTime = results.filter(r => r.time).reduce((a, b) => a + b.time, 0) / results.length;
  
  console.log(`Total: ${results.length} | Bloqueadas: ${blocked} | Tiempo: ${endTime - startTime}ms | Avg: ${avgTime.toFixed(2)}ms`);
  return { total: results.length, blocked, time: endTime - startTime };
}

// ========================================
// TEST 2: Supabase REST API Sin Auth
// ========================================
async function test2_SupabaseNoAuth() {
  console.log('[TEST 2] Supabase REST API sin autenticación');
  
  const endpoints = [
    '/rest/v1/system_config',
    '/rest/v1/users',
    '/rest/v1/user_profiles',
    '/rest/v1/call_transcriptions',
    '/rest/v1/llamadas',
    '/rest/v1/prospectos',
    '/rest/v1/whatsapp_conversations',
    '/rest/v1/api_auth_tokens'
  ];
  
  let accessible = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${SUPABASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        const data = await response.text();
        accessible++;
        console.log(`  🔓 ACCESIBLE: ${endpoint} (${data.length} bytes)`);
      }
    } catch (error) {
      // Endpoint protegido o no existe
    }
  }
  
  console.log(`Endpoints probados: ${endpoints.length} | Accesibles: ${accessible}`);
  return { total: endpoints.length, accessible };
}

// ========================================
// TEST 3: CORS Verification
// ========================================
async function test3_CORS() {
  console.log('[TEST 3] CORS - Orígenes maliciosos');
  
  const origins = [
    'https://evil.com',
    'https://ai-vidavacations.com',
    'https://vidavacations.com.attacker.com',
    'https://phishing-site.com',
    'http://localhost',
    'null'
  ];
  
  let allowed = 0;
  
  for (const origin of origins) {
    try {
      const response = await fetch(`${BASE_URL}/`, {
        method: 'GET',
        headers: { 'Origin': origin }
      });
      
      const corsHeader = response.headers.get('access-control-allow-origin');
      if (corsHeader === '*' || corsHeader === origin) {
        allowed++;
        console.log(`  ✅ PERMITIDO: ${origin}`);
      }
    } catch (error) {
      // Error de red
    }
  }
  
  console.log(`Orígenes probados: ${origins.length} | Permitidos: ${allowed}`);
  return { total: origins.length, allowed };
}

// ========================================
// TEST 4: Endpoints Sensibles
// ========================================
async function test4_SensitiveEndpoints() {
  console.log('[TEST 4] Endpoints Sensibles');
  
  const endpoints = [
    '/.env',
    '/.env.local',
    '/.env.production',
    '/config.json',
    '/api/config',
    '/admin',
    '/.git/config',
    '/backup',
    '/swagger',
    '/graphql',
    '/debug',
    '/server-status',
    '/phpinfo.php'
  ];
  
  let accessible = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET'
      });
      
      if (response.status === 200) {
        accessible++;
        console.log(`  🔓 ACCESIBLE: ${endpoint}`);
      }
    } catch (error) {
      // No accesible
    }
  }
  
  console.log(`Endpoints probados: ${endpoints.length} | Accesibles: ${accessible}`);
  return { total: endpoints.length, accessible };
}

// ========================================
// TEST 5: SQL Injection en Supabase
// ========================================
async function test5_SQLInjection() {
  console.log('[TEST 5] SQL Injection en Supabase REST API');
  
  const payloads = [
    "' OR '1'='1",
    "1' OR '1' = '1",
    "'; DROP TABLE users--",
    "{ $ne: null }",
    "admin'--"
  ];
  
  let vulnerable = 0;
  
  for (const payload of payloads) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${payload}`, {
        method: 'GET'
      });
      
      if (response.status === 200) {
        vulnerable++;
        console.log(`  ⚠️ POSIBLE: ${payload.substring(0, 30)}`);
      }
    } catch (error) {
      // Rechazado
    }
  }
  
  console.log(`Payloads: ${payloads.length} | Posibles: ${vulnerable}`);
  return { total: payloads.length, vulnerable };
}

// ========================================
// TEST 6: Security Headers
// ========================================
async function test6_SecurityHeaders() {
  console.log('[TEST 6] Security Headers');
  
  try {
    const response = await fetch(`${BASE_URL}/`);
    
    const headers = {
      'strict-transport-security': response.headers.get('strict-transport-security'),
      'x-frame-options': response.headers.get('x-frame-options'),
      'x-content-type-options': response.headers.get('x-content-type-options'),
      'content-security-policy': response.headers.get('content-security-policy'),
      'x-xss-protection': response.headers.get('x-xss-protection')
    };
    
    let implemented = 0;
    for (const [name, value] of Object.entries(headers)) {
      if (value) {
        implemented++;
        console.log(`  ✅ ${name}: ${value.substring(0, 50)}...`);
      } else {
        console.log(`  ❌ ${name}: NO IMPLEMENTADO`);
      }
    }
    
    console.log(`Headers probados: 5 | Implementados: ${implemented}`);
    return { total: 5, implemented };
  } catch (error) {
    console.log('Error verificando headers');
    return { total: 5, implemented: 0 };
  }
}

// ========================================
// TEST 7: Supabase Storage Access
// ========================================
async function test7_StorageAccess() {
  console.log('[TEST 7] Supabase Storage - Acceso a archivos');
  
  const paths = [
    '/storage/v1/object/public/system-assets/logo-1757048487097.png',
    '/storage/v1/object/public/avatars/',
    '/storage/v1/object/public/documents/',
    '/storage/v1/object/list/system-assets'
  ];
  
  let accessible = 0;
  
  for (const path of paths) {
    try {
      const response = await fetch(`${SUPABASE_URL}${path}`);
      
      if (response.status === 200) {
        accessible++;
        console.log(`  📂 ACCESIBLE: ${path}`);
      }
    } catch (error) {
      // No accesible
    }
  }
  
  console.log(`Paths probados: ${paths.length} | Accesibles: ${accessible}`);
  return { total: paths.length, accessible };
}

// ========================================
// EJECUTAR TODAS LAS PRUEBAS
// ========================================
async function runAudit() {
  console.log('\n=== AUDITORÍA AGRESIVA - ai.vidavacations.com ===\n');
  
  const results = {};
  
  try {
    results.rateLimiting = await test1_RateLimiting();
    await sleep(2000);
    
    results.supabaseNoAuth = await test2_SupabaseNoAuth();
    await sleep(2000);
    
    results.cors = await test3_CORS();
    await sleep(2000);
    
    results.sensitiveEndpoints = await test4_SensitiveEndpoints();
    await sleep(2000);
    
    results.sqlInjection = await test5_SQLInjection();
    await sleep(2000);
    
    results.securityHeaders = await test6_SecurityHeaders();
    await sleep(2000);
    
    results.storageAccess = await test7_StorageAccess();
    
  } catch (error) {
    console.error('Error en auditoría:', error);
  }
  
  console.log('\n=== RESUMEN ===');
  console.log(JSON.stringify(results, null, 2));
  
  return results;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Ejecutar
runAudit().catch(console.error);
