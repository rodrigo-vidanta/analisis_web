#!/usr/bin/env node

const results = [{"id":"b33deff7-717b-41b8-ae84-73b29c975f9a","nombre_completo":"M"},{"id":"cd2f5d7f-572a-419c-bc7c-e36183fdcd84","nombre_completo":"MEDELLIN MEJIA FRANCISCO MEDELLIN MEJIA FRANCISCO"}];

// Verificar si alguno es el prospecto problemático
const targetId = 'e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b';
const targetName = 'Rosario';

console.log('📊 Análisis de resultados:\n');
console.log(`Total prospectos: ${results.length}`);
console.log(`\n🔍 Buscando "${targetName}"...`);

const hasTarget = results.some(p => p.id === targetId);
const hasRosario = results.filter(p => 
  p.nombre_completo?.toLowerCase().includes(targetName.toLowerCase()) ||
  p.nombre_whatsapp?.toLowerCase().includes(targetName.toLowerCase())
);

console.log(`\n❓ ¿Está el prospecto problemático (${targetId})?`);
console.log(hasTarget ? '✅ SÍ' : '❌ NO');

console.log(`\n❓ ¿Hay prospectos con "Rosario"?`);
if (hasRosario.length > 0) {
  console.log(`✅ SÍ (${hasRosario.length} encontrados):`);
  hasRosario.forEach(p => {
    console.log(`   - ${p.nombre_completo} (${p.id})`);
  });
} else {
  console.log('❌ NO');
}

console.log('\n📝 ¿Qué término de búsqueda usaste en el módulo WhatsApp?');
