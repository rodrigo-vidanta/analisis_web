/**
 * Verificación de WAF - Jungala
 * Detectar presencia de Web Application Firewall
 */

const BASE_URL = 'https://ticketing-services.jungala.com';

async function detectWAF() {
  console.log('=== DETECCIÓN DE WAF ===\n');
  
  // Test 1: Headers que indican WAF
  console.log('[1] Verificando headers de seguridad...');
  try {
    const response = await fetch(`${BASE_URL}/ws/v1/jungala/performance/get-calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const headers = {
      'x-amzn-waf-action': response.headers.get('x-amzn-waf-action'),
      'x-amzn-requestid': response.headers.get('x-amzn-requestid'),
      'x-cache': response.headers.get('x-cache'),
      'x-amz-cf-id': response.headers.get('x-amz-cf-id'),
      'cf-ray': response.headers.get('cf-ray'),
      'server': response.headers.get('server'),
      'x-powered-by': response.headers.get('x-powered-by'),
      'x-amz-apigw-id': response.headers.get('x-amz-apigw-id'),
      'via': response.headers.get('via'),
      'x-edge-location': response.headers.get('x-edge-location')
    };
    
    console.log('\nHeaders detectados:');
    let wafDetected = false;
    for (const [name, value] of Object.entries(headers)) {
      if (value) {
        console.log(`  ✓ ${name}: ${value}`);
        if (name.includes('waf') || name.includes('cloudfront') || name.includes('cf-') || name.includes('cloudflare')) {
          wafDetected = true;
        }
      }
    }
    
    if (!wafDetected) {
      console.log('  ℹ No se detectaron headers de WAF conocidos');
    }
    
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
  
  // Test 2: Comportamiento ante payloads maliciosos típicos de WAF
  console.log('\n[2] Probando payloads que activan WAF...');
  
  const wafTriggers = [
    { name: 'SQL Injection típico', payload: "' OR 1=1--" },
    { name: 'XSS Script', payload: '<script>alert(1)</script>' },
    { name: 'Path Traversal', payload: '../../../etc/passwd' },
    { name: 'Command Injection', payload: '; ls -la' },
    { name: 'XXE', payload: '<?xml version="1.0"?><!DOCTYPE foo>' }
  ];
  
  for (const trigger of wafTriggers) {
    try {
      const response = await fetch(`${BASE_URL}/ws/v1/jungala/products/get-tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: trigger.payload })
      });
      
      if (response.status === 403) {
        console.log(`  ⚠️ ${trigger.name}: BLOQUEADO (403) - Posible WAF`);
      } else {
        console.log(`  ✓ ${trigger.name}: ${response.status} - No bloqueado por WAF`);
      }
    } catch (error) {
      console.log(`  ! ${trigger.name}: Error de conexión`);
    }
  }
  
  // Test 3: Rate limiting extremo (más de lo normal)
  console.log('\n[3] Test de rate limiting extremo (500 requests)...');
  
  let blocked = 0;
  let forbidden = 0;
  let timeout = 0;
  
  const startTime = Date.now();
  
  for (let i = 0; i < 500; i++) {
    try {
      const response = await fetch(`${BASE_URL}/ws/v1/jungala/performance/get-calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (response.status === 429) {
        blocked++;
        if (blocked === 1) {
          console.log(`  ⚠️ Rate limit detectado en request #${i + 1}`);
          const retryAfter = response.headers.get('retry-after');
          if (retryAfter) {
            console.log(`     Retry-After: ${retryAfter}`);
          }
        }
      } else if (response.status === 403) {
        forbidden++;
        if (forbidden === 1) {
          console.log(`  ⚠️ 403 Forbidden en request #${i + 1} - Posible WAF`);
        }
      }
    } catch (error) {
      timeout++;
    }
    
    if (i % 100 === 0 && i > 0) {
      console.log(`  Progreso: ${i}/500`);
    }
  }
  
  const endTime = Date.now();
  
  console.log(`\nResultados:`);
  console.log(`  Total: 500 requests`);
  console.log(`  429 (Rate Limited): ${blocked}`);
  console.log(`  403 (Forbidden): ${forbidden}`);
  console.log(`  Timeouts: ${timeout}`);
  console.log(`  Tiempo total: ${((endTime - startTime) / 1000).toFixed(2)}s`);
  
  // Test 4: Detección de fingerprinting
  console.log('\n[4] Fingerprinting de tecnología...');
  
  try {
    const response = await fetch(`${BASE_URL}/`, { method: 'HEAD' });
    const server = response.headers.get('server');
    const poweredBy = response.headers.get('x-powered-by');
    
    if (server) console.log(`  Server: ${server}`);
    if (poweredBy) console.log(`  X-Powered-By: ${poweredBy}`);
    
    // Detectar servicios conocidos
    if (server && (server.includes('cloudflare') || server.includes('cloudfront'))) {
      console.log('  ✓ CDN/WAF detectado en header Server');
    }
  } catch (error) {
    console.log('  No se pudo obtener información del servidor');
  }
  
  // Conclusión
  console.log('\n=== CONCLUSIÓN ===');
  if (blocked > 0) {
    console.log(`✓ WAF/Rate Limiting DETECTADO (${blocked} requests bloqueadas)`);
  } else if (forbidden > 0) {
    console.log(`⚠️ Posible WAF (${forbidden} requests con 403)`);
  } else {
    console.log('✗ NO se detectó WAF ni rate limiting activo');
  }
}

detectWAF().catch(console.error);
