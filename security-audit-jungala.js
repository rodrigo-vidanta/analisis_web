/**
 * SECURITY AUDIT SCRIPT - Jungala Ticketing API
 * Fecha: 29 Diciembre 2025
 * Objetivo: Pentesting básico de endpoints detectados
 */

const BASE_URL = 'https://ticketing-services.jungala.com';

// ========================================
// UTILIDADES
// ========================================

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(type, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: `${colors.blue}[INFO]${colors.reset}`,
    success: `${colors.green}[✓ PASS]${colors.reset}`,
    warning: `${colors.yellow}[⚠ WARN]${colors.reset}`,
    error: `${colors.red}[✗ FAIL]${colors.reset}`,
    critical: `${colors.magenta}[🔴 CRITICAL]${colors.reset}`,
  };
  
  console.log(`${timestamp} ${prefix[type]} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// ========================================
// PRUEBAS DE ENDPOINTS
// ========================================

async function testEndpoint(name, url, method, payload = null, headers = {}) {
  log('info', `Probando: ${name}`);
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  
  if (payload) {
    options.body = JSON.stringify(payload);
  }
  
  try {
    const startTime = Date.now();
    const response = await fetch(url, options);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      responseTime,
      headers: Object.fromEntries(response.headers.entries()),
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ========================================
// TEST 1: Sin Autenticación
// ========================================

async function test1_NoAuth() {
  console.log('\n' + '='.repeat(60));
  log('info', 'TEST 1: Acceso sin autenticación');
  console.log('='.repeat(60));
  
  const endpoints = [
    {
      name: 'Get Calendar',
      url: `${BASE_URL}/ws/v1/jungala/performance/get-calendar`,
      method: 'POST',
      payload: {},
    },
    {
      name: 'Get Tickets',
      url: `${BASE_URL}/ws/v1/jungala/products/get-tickets`,
      method: 'POST',
      payload: {},
    },
    {
      name: 'Get Calendar Transport',
      url: `${BASE_URL}/ws/v1/jungala/performance/get-calendar-transport`,
      method: 'POST',
      payload: {},
    },
  ];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(
      endpoint.name,
      endpoint.url,
      endpoint.method,
      endpoint.payload
    );
    
    if (result.success) {
      log('critical', `❌ ${endpoint.name}: Acceso sin autenticación permitido!`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Response Time: ${result.responseTime}ms`);
      console.log(`   Data type: ${typeof result.data}`);
    } else {
      log('success', `✅ ${endpoint.name}: Requiere autenticación`);
      console.log(`   Status: ${result.status || 'Error'}`);
    }
  }
}

// ========================================
// TEST 2: SQL Injection
// ========================================

async function test2_SQLInjection() {
  console.log('\n' + '='.repeat(60));
  log('info', 'TEST 2: Inyección SQL/NoSQL');
  console.log('='.repeat(60));
  
  const payloads = [
    "' OR '1'='1",
    "1' OR '1' = '1",
    "{ $ne: null }",
    "'; DROP TABLE tickets; --",
    "admin'--",
    "' OR 1=1--",
  ];
  
  for (const payload of payloads) {
    const result = await testEndpoint(
      `SQL Injection: ${payload.substring(0, 20)}...`,
      `${BASE_URL}/ws/v1/jungala/products/get-tickets`,
      'POST',
      { date: payload, ticketId: payload }
    );
    
    if (result.success && result.data && typeof result.data === 'object') {
      log('critical', `❌ Posible vulnerabilidad detectada con payload: ${payload}`);
      console.log(`   Status: ${result.status}`);
    } else {
      log('success', `✅ Payload rechazado: ${payload.substring(0, 30)}`);
    }
  }
}

// ========================================
// TEST 3: Parameter Tampering
// ========================================

async function test3_ParameterTampering() {
  console.log('\n' + '='.repeat(60));
  log('info', 'TEST 3: Manipulación de parámetros');
  console.log('='.repeat(60));
  
  const tests = [
    {
      name: 'Precio negativo',
      payload: { productId: '8326853A-73D4-7C51-4969-018FDF17193D', price: -9999 },
    },
    {
      name: 'Precio cero',
      payload: { productId: '8326853A-73D4-7C51-4969-018FDF17193D', price: 0 },
    },
    {
      name: 'Cantidad extrema',
      payload: { productId: '8326853A-73D4-7C51-4969-018FDF17193D', quantity: 999999 },
    },
    {
      name: 'ID de producto inválido',
      payload: { productId: '../../../etc/passwd' },
    },
    {
      name: 'XSS en parámetros',
      payload: { name: '<script>alert("XSS")</script>' },
    },
  ];
  
  for (const test of tests) {
    const result = await testEndpoint(
      test.name,
      `${BASE_URL}/ws/v1/jungala/products/get-tickets`,
      'POST',
      test.payload
    );
    
    if (result.success) {
      log('warning', `⚠️ ${test.name}: Parámetro aceptado`);
      console.log(`   Verificar validación server-side`);
    } else {
      log('success', `✅ ${test.name}: Parámetro rechazado`);
    }
  }
}

// ========================================
// TEST 4: Rate Limiting
// ========================================

async function test4_RateLimiting() {
  console.log('\n' + '='.repeat(60));
  log('info', 'TEST 4: Rate Limiting');
  console.log('='.repeat(60));
  
  const requests = 50;
  const results = [];
  
  log('info', `Enviando ${requests} peticiones consecutivas...`);
  
  const startTime = Date.now();
  
  for (let i = 0; i < requests; i++) {
    const result = await testEndpoint(
      `Request ${i + 1}`,
      `${BASE_URL}/ws/v1/jungala/performance/get-calendar`,
      'POST',
      { date: '2025-12-29' }
    );
    
    results.push({
      index: i + 1,
      status: result.status,
      success: result.success,
      responseTime: result.responseTime,
    });
    
    // Sin delay para probar rate limiting
    if (i % 10 === 0) {
      console.log(`   Progreso: ${i + 1}/${requests}`);
    }
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  const blocked = results.filter(r => r.status === 429 || r.status === 403).length;
  const successful = results.filter(r => r.success).length;
  
  console.log(`\n   Resultados:`);
  console.log(`   - Total requests: ${requests}`);
  console.log(`   - Exitosas: ${successful}`);
  console.log(`   - Bloqueadas: ${blocked}`);
  console.log(`   - Tiempo total: ${totalTime}ms`);
  console.log(`   - Promedio: ${(totalTime / requests).toFixed(2)}ms/request`);
  
  if (blocked === 0) {
    log('critical', '❌ No hay rate limiting implementado!');
  } else {
    log('success', `✅ Rate limiting detectado (${blocked}/${requests} bloqueadas)`);
  }
}

// ========================================
// TEST 5: CORS y Headers de Seguridad
// ========================================

async function test5_SecurityHeaders() {
  console.log('\n' + '='.repeat(60));
  log('info', 'TEST 5: Headers de seguridad');
  console.log('='.repeat(60));
  
  const result = await testEndpoint(
    'Security Headers Check',
    `${BASE_URL}/ws/v1/jungala/performance/get-calendar`,
    'POST',
    { date: '2025-12-29' }
  );
  
  const securityHeaders = {
    'strict-transport-security': 'HSTS',
    'x-content-type-options': 'X-Content-Type-Options',
    'x-frame-options': 'X-Frame-Options',
    'x-xss-protection': 'X-XSS-Protection',
    'content-security-policy': 'CSP',
    'x-permitted-cross-domain-policies': 'Cross-Domain Policy',
  };
  
  console.log('\n   Headers de seguridad:');
  
  for (const [header, name] of Object.entries(securityHeaders)) {
    if (result.headers && result.headers[header]) {
      log('success', `✅ ${name}: ${result.headers[header]}`);
    } else {
      log('warning', `⚠️ ${name}: No implementado`);
    }
  }
  
  // Check CORS
  console.log('\n   CORS Configuration:');
  if (result.headers && result.headers['access-control-allow-origin']) {
    const origin = result.headers['access-control-allow-origin'];
    if (origin === '*') {
      log('critical', '❌ CORS: Acepta CUALQUIER origen (*)');
    } else {
      log('success', `✅ CORS: Restringido a ${origin}`);
    }
  } else {
    log('info', 'ℹ️ CORS: No detectado');
  }
}

// ========================================
// TEST 6: Information Disclosure
// ========================================

async function test6_InformationDisclosure() {
  console.log('\n' + '='.repeat(60));
  log('info', 'TEST 6: Exposición de información');
  console.log('='.repeat(60));
  
  // Intentar acceder a endpoints comunes de debug/admin
  const sensitiveEndpoints = [
    '/admin',
    '/debug',
    '/api/users',
    '/api/config',
    '/.env',
    '/config.json',
    '/swagger',
    '/api-docs',
    '/graphql',
    '/health',
    '/status',
  ];
  
  for (const path of sensitiveEndpoints) {
    const result = await testEndpoint(
      `Sensitive path: ${path}`,
      `${BASE_URL}${path}`,
      'GET'
    );
    
    if (result.success) {
      log('critical', `❌ Endpoint sensible accesible: ${path}`);
      console.log(`   Status: ${result.status}`);
    } else if (result.status === 404) {
      log('success', `✅ ${path}: No encontrado (esperado)`);
    } else {
      log('info', `ℹ️ ${path}: Status ${result.status}`);
    }
  }
}

// ========================================
// TEST 7: Error Handling
// ========================================

async function test7_ErrorHandling() {
  console.log('\n' + '='.repeat(60));
  log('info', 'TEST 7: Manejo de errores');
  console.log('='.repeat(60));
  
  const invalidPayloads = [
    { name: 'Payload vacío', data: null },
    { name: 'String en lugar de objeto', data: 'invalid' },
    { name: 'Array en lugar de objeto', data: [] },
    { name: 'Payload muy grande', data: { data: 'x'.repeat(1000000) } },
  ];
  
  for (const test of invalidPayloads) {
    const result = await testEndpoint(
      test.name,
      `${BASE_URL}/ws/v1/jungala/products/get-tickets`,
      'POST',
      test.data
    );
    
    if (result.data && typeof result.data === 'object' && result.data.stack) {
      log('critical', `❌ ${test.name}: Stack trace expuesto!`);
      console.log('   Datos sensibles en respuesta de error');
    } else if (result.data && typeof result.data === 'string' && result.data.includes('Error:')) {
      log('warning', `⚠️ ${test.name}: Mensaje de error detallado`);
    } else {
      log('success', `✅ ${test.name}: Error genérico`);
    }
  }
}

// ========================================
// EJECUTAR TODAS LAS PRUEBAS
// ========================================

async function runAllTests() {
  console.log('\n');
  console.log(colors.cyan + '╔════════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + '║       SECURITY AUDIT - JUNGALA TICKETING API              ║' + colors.reset);
  console.log(colors.cyan + '║       Fecha: 29 Diciembre 2025                            ║' + colors.reset);
  console.log(colors.cyan + '╚════════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');
  
  const tests = [
    { name: 'Test 1: Sin Autenticación', fn: test1_NoAuth },
    { name: 'Test 2: SQL Injection', fn: test2_SQLInjection },
    { name: 'Test 3: Parameter Tampering', fn: test3_ParameterTampering },
    { name: 'Test 4: Rate Limiting', fn: test4_RateLimiting },
    { name: 'Test 5: Security Headers', fn: test5_SecurityHeaders },
    { name: 'Test 6: Information Disclosure', fn: test6_InformationDisclosure },
    { name: 'Test 7: Error Handling', fn: test7_ErrorHandling },
  ];
  
  for (const test of tests) {
    try {
      await test.fn();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa entre tests
    } catch (error) {
      log('error', `Error en ${test.name}: ${error.message}`);
    }
  }
  
  console.log('\n');
  console.log(colors.cyan + '╔════════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + '║                  AUDITORÍA COMPLETADA                     ║' + colors.reset);
  console.log(colors.cyan + '╚════════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');
}

// Exportar para uso en Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests };
}

// Auto-ejecutar si se corre directamente
if (typeof window === 'undefined') {
  runAllTests().catch(console.error);
}

