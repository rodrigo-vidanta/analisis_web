import fetch from 'node-fetch';

const DYNAMICS_SEARCH_URL = 'https://primary-dev-d75a.up.railway.app/webhook/lead-info';
const IMPORT_WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/import-contact-crm';
const LIVECHAT_AUTH = '2025_livechat_auth';

async function testImportWebhook(phoneNumber) {
  console.log('📞 Buscando lead en Dynamics:', phoneNumber);
  
  try {
    const searchResponse = await fetch(DYNAMICS_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'dynamics_token': 'T0k3n_D1n4m1c5_2024'
      },
      body: JSON.stringify({ phone: phoneNumber })
    });
    
    const searchResult = await searchResponse.json();
    console.log('✅ Lead encontrado:', JSON.stringify(searchResult, null, 2));
    
    if (!searchResult.success || !searchResult.data) {
      console.error('❌ No se encontró el lead');
      return;
    }
    
    const leadData = searchResult.data;
    
    const payload = {
      ejecutivo_nombre: 'Test Usuario',
      ejecutivo_id: '7ac0ed39-77e8-4564-acdd-3c1117ca584a',
      coordinacion_id: '4c1ece41-bb6b-49a1-b52b-f5236f54d60a',
      fecha_solicitud: new Date().toISOString(),
      telefono: phoneNumber,
      nombre_completo: leadData.Nombre,
      id_dynamics: leadData.LeadID,
      lead_dynamics: {
        LeadID: leadData.LeadID,
        Nombre: leadData.Nombre,
        Email: leadData.Email,
        EstadoCivil: leadData.EstadoCivil || null,
        Ocupacion: leadData.Ocupacion || null,
        Pais: leadData.Pais || null,
        EntidadFederativa: leadData.EntidadFederativa || null,
        Coordinacion: leadData.Coordinacion || null,
        CoordinacionID: leadData.CoordinacionID || null,
        Propietario: leadData.Propietario || null,
        OwnerID: leadData.OwnerID || null,
        FechaUltimaLlamada: leadData.FechaUltimaLlamada || null,
        Calificacion: leadData.Calificacion || null
      }
    };
    
    console.log('\n📦 Payload construido:', JSON.stringify(payload, null, 2));
    console.log('\n🚀 Llamando webhook de importación...');
    
    const importResponse = await fetch(IMPORT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'livechat_auth': LIVECHAT_AUTH
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`\n📊 Status Code: ${importResponse.status}`);
    console.log(`📊 Status Text: ${importResponse.statusText}`);
    console.log(`📊 OK: ${importResponse.ok}`);
    
    const responseText = await importResponse.text();
    console.log(`\n📥 Respuesta (raw):\n${responseText}`);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('\n✅ Respuesta (JSON):', JSON.stringify(responseJson, null, 2));
      
      if (Array.isArray(responseJson)) {
        console.log('\n✨ Es un array con', responseJson.length, 'elementos');
        console.log('✨ Primer elemento:', responseJson[0]);
      }
    } catch (e) {
      console.log('⚠️ No es JSON válido');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testImportWebhook('5522998337');
