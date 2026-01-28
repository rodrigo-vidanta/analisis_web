/**
 * TEST: Función normalizeCoordinacion con regex
 * 
 * Para ejecutar este test:
 * npx tsx scripts/test-normalize-coordinacion.ts
 */

const normalizeCoordinacion = (coord: string | null | undefined): string => {
  if (!coord) return '';
  
  // Convertir a uppercase y limpiar espacios extras
  const cleaned = coord.trim().toUpperCase().replace(/\s+/g, ' ');
  
  // Mapeo con regex para variaciones
  const coordinacionPatterns: Array<{ regex: RegExp; normalized: string }> = [
    // COB Acapulco y variantes
    { regex: /^COB\s*(ACA|ACAP|ACAPULCO)$/i, normalized: 'COBACA' },
    { regex: /^COBACA$/i, normalized: 'COBACA' },
    
    // APEX e i360
    { regex: /^(APEX|I360)$/i, normalized: 'i360' },
    
    // MVP
    { regex: /^MVP$/i, normalized: 'MVP' },
    
    // VEN (Ventas)
    { regex: /^VEN(TAS)?$/i, normalized: 'VEN' },
    
    // BOOM
    { regex: /^BOOM$/i, normalized: 'BOOM' },
    
    // Telemarketing (variantes)
    { regex: /^(TELE|TELEMARK|TELEMARKETING)$/i, normalized: 'TELEMARKETING' },
    
    // Campaña (variantes)
    { regex: /^(CAMP|CAMPA|CAMPANA|CAMPAIGN)$/i, normalized: 'CAMPANA' },
    
    // CDMX (variantes)
    { regex: /^CDMX(\s*(SUR|NORTE|CENTRO))?$/i, normalized: 'CDMX' },
    
    // Inbound
    { regex: /^(INB|INBOUND)$/i, normalized: 'INBOUND' },
    
    // Outbound
    { regex: /^(OUT|OUTBOUND)$/i, normalized: 'OUTBOUND' },
  ];
  
  // Buscar coincidencia con regex
  for (const pattern of coordinacionPatterns) {
    if (pattern.regex.test(cleaned)) {
      return pattern.normalized;
    }
  }
  
  // Si no hay coincidencia, retornar uppercase limpio
  return cleaned;
};

// ============================================
// TESTS
// ============================================

const tests = [
  // COB Acapulco
  { input: 'COB ACAPULCO', expected: 'COBACA' },
  { input: 'COB Aca', expected: 'COBACA' },
  { input: 'COB ACAP', expected: 'COBACA' },
  { input: 'cob acapulco', expected: 'COBACA' },
  { input: 'COBACA', expected: 'COBACA' },
  { input: 'cobaca', expected: 'COBACA' },
  
  // APEX / i360
  { input: 'APEX', expected: 'i360' },
  { input: 'apex', expected: 'i360' },
  { input: 'Apex', expected: 'i360' },
  { input: 'i360', expected: 'i360' },
  { input: 'I360', expected: 'i360' },
  
  // MVP
  { input: 'MVP', expected: 'MVP' },
  { input: 'mvp', expected: 'MVP' },
  { input: 'Mvp', expected: 'MVP' },
  
  // VEN
  { input: 'VEN', expected: 'VEN' },
  { input: 'ven', expected: 'VEN' },
  { input: 'Ven', expected: 'VEN' },
  { input: 'VENTAS', expected: 'VEN' },
  { input: 'ventas', expected: 'VEN' },
  
  // BOOM
  { input: 'BOOM', expected: 'BOOM' },
  { input: 'boom', expected: 'BOOM' },
  { input: 'Boom', expected: 'BOOM' },
  
  // Telemarketing
  { input: 'TELEMARKETING', expected: 'TELEMARKETING' },
  { input: 'telemarketing', expected: 'TELEMARKETING' },
  { input: 'TELEMARK', expected: 'TELEMARKETING' },
  { input: 'TELE', expected: 'TELEMARKETING' },
  
  // Campaña
  { input: 'CAMPANA', expected: 'CAMPANA' },
  { input: 'campana', expected: 'CAMPANA' },
  { input: 'CAMPA', expected: 'CAMPANA' },
  { input: 'CAMP', expected: 'CAMPANA' },
  { input: 'CAMPAIGN', expected: 'CAMPANA' },
  
  // CDMX
  { input: 'CDMX', expected: 'CDMX' },
  { input: 'cdmx', expected: 'CDMX' },
  { input: 'CDMX SUR', expected: 'CDMX' },
  { input: 'CDMX NORTE', expected: 'CDMX' },
  
  // Inbound
  { input: 'INBOUND', expected: 'INBOUND' },
  { input: 'inbound', expected: 'INBOUND' },
  { input: 'INB', expected: 'INBOUND' },
  
  // Outbound
  { input: 'OUTBOUND', expected: 'OUTBOUND' },
  { input: 'outbound', expected: 'OUTBOUND' },
  { input: 'OUT', expected: 'OUTBOUND' },
  
  // Sin coincidencia (mantener uppercase)
  { input: 'OTRO', expected: 'OTRO' },
  { input: 'otra coordinacion', expected: 'OTRA COORDINACION' },
  
  // Edge cases
  { input: '', expected: '' },
  { input: '   ', expected: '' },
  { input: null, expected: '' },
  { input: undefined, expected: '' },
];

console.log('🧪 Ejecutando tests de normalizeCoordinacion...\n');

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  const result = normalizeCoordinacion(test.input as any);
  const success = result === test.expected;
  
  if (success) {
    passed++;
    console.log(`✅ Test ${index + 1}: "${test.input}" → "${result}"`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: "${test.input}" → "${result}" (esperado: "${test.expected}")`);
  }
});

console.log(`\n📊 Resultados: ${passed}/${tests.length} tests pasados`);

if (failed === 0) {
  console.log('✅ Todos los tests pasaron correctamente!');
  process.exit(0);
} else {
  console.log(`❌ ${failed} tests fallaron`);
  process.exit(1);
}
