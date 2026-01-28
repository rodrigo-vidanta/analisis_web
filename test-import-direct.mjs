import fetch from 'node-fetch';

const IMPORT_WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/import-contact-crm';
const LIVECHAT_AUTH = '2025_livechat_auth';

// Payload de prueba con IDs reales del ejemplo que diste
const payload = {
  ejecutivo_nombre: 'Lopez Toscano Rolando',
  ejecutivo_id: '7ac0ed39-77e8-4564-acdd-3c1117ca584a',
  coordinacion_id: '4c1ece41-bb6b-49a1-b52b-f5236f54d60a',
  fecha_solicitud: new Date().toISOString(),
  telefono: '5522998337',
  nombre_completo: 'PRUEBA TEST WEBHOOK',
  id_dynamics: 'test-dynamics-' + Date.now(),
  lead_dynamics: {
    LeadID: 'test-dynamics-' + Date.now(),
    Nombre: 'PRUEBA TEST WEBHOOK',
    Email: 'test@example.com',
    EstadoCivil: null,
    Ocupacion: null,
    Pais: 'México',
    EntidadFederativa: 'CDMX',
    Coordinacion: 'COB CDMX',
    CoordinacionID: null,
    Propietario: 'Lopez Toscano Rolando',
    OwnerID: '7ac0ed39-77e8-4564-acdd-3c1117ca584a',
    FechaUltimaLlamada: null,
    Calificacion: null
  }
};

console.log('📦 Payload a enviar:');
console.log(JSON.stringify(payload, null, 2));

console.log('\n🚀 Llamando webhook...');

try {
  const response = await fetch(IMPORT_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'livechat_auth': LIVECHAT_AUTH
    },
    body: JSON.stringify(payload)
  });

  console.log(`\n📊 ============================================`);
  console.log(`📊 Status Code: ${response.status}`);
  console.log(`📊 Status Text: ${response.statusText}`);
  console.log(`📊 response.ok: ${response.ok}`);
  console.log(`📊 ============================================\n`);

  const responseText = await response.text();
  console.log(`📥 Respuesta RAW:\n${responseText}\n`);

  try {
    const responseJson = JSON.parse(responseText);
    console.log('✅ Respuesta JSON parseada:');
    console.log(JSON.stringify(responseJson, null, 2));

    if (Array.isArray(responseJson)) {
      console.log(`\n✨ Es un ARRAY con ${responseJson.length} elementos`);
      if (responseJson[0]) {
        console.log('✨ Primer elemento:');
        console.log(JSON.stringify(responseJson[0], null, 2));
      }
    }
  } catch (e) {
    console.log('⚠️ No se pudo parsear como JSON');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}
