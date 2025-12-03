// Script para crear un workflow de prueba en n8n
// Ejecutar con: npx tsx scripts/create-test-workflow.ts

// Configuración directa para evitar problemas con import.meta.env
const N8N_API_URL = 'https://primary-dev-d75a.up.railway.app/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmE1MDZkMS1hZDM4LTQ3MGYtOTEzOS02MzAwM2NiMjQzZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU5MzU3ODgzfQ.7z0FtziI-eFleJr4pLvP5GgRVptllCw26Losrxf_Qpo';

async function createWorkflow(workflowData: any) {
  const url = `${N8N_API_URL}/workflows`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(workflowData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`n8n API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Estructura de un workflow simple de prueba
const testWorkflow = {
  name: '[TEST] Workflow de Prueba - PQNC',
  // active se establece después de crear el workflow (es read-only)
  nodes: [
    {
      parameters: {},
      id: 'manual-trigger-001',
      name: 'Manual Trigger',
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [250, 300]
    },
    {
      parameters: {
        values: {
          string: [
            {
              name: 'mensaje',
              value: 'Hola desde n8n! Este es un workflow de prueba creado desde la API de PQNC.'
            },
            {
              name: 'timestamp',
              value: '={{ $now }}'
            },
            {
              name: 'workflow_name',
              value: '={{ $workflow.name }}'
            }
          ]
        },
        options: {}
      },
      id: 'set-data-001',
      name: 'Set Datos de Prueba',
      type: 'n8n-nodes-base.set',
      typeVersion: 1,
      position: [450, 300]
    },
    {
      parameters: {
        respondWith: 'json',
        responseBody: '={{ JSON.stringify($json, null, 2) }}',
        options: {}
      },
      id: 'respond-webhook-001',
      name: 'Respond to Webhook',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1,
      position: [650, 300]
    }
  ],
  connections: {
    'Manual Trigger': {
      main: [
        [
          {
            node: 'Set Datos de Prueba',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'Set Datos de Prueba': {
      main: [
        [
          {
            node: 'Respond to Webhook',
            type: 'main',
            index: 0
          }
        ]
      ]
    }
  },
  settings: {
    executionOrder: 'v1'
  }
  // tags y active se establecen después de crear el workflow (son read-only)
};

async function createTestWorkflow() {
  console.log('🚀 Creando workflow de prueba en n8n...\n');
  console.log('📋 Configuración del workflow:');
  console.log(`   Nombre: ${testWorkflow.name}`);
  console.log(`   Nodos: ${testWorkflow.nodes.length}`);
  console.log(`   Estado: Inactivo (se puede activar después)\n`);

  try {
    const workflow = await createWorkflow(testWorkflow);

    console.log('✅ Workflow creado exitosamente!\n');
    console.log('📊 Detalles del workflow creado:');
    console.log(`   ID: ${workflow.id || workflow.data?.id || 'N/A'}`);
    console.log(`   Nombre: ${workflow.name || workflow.data?.name || testWorkflow.name}`);
    console.log(`   Activo: ${workflow.active !== undefined ? (workflow.active ? 'Sí' : 'No') : (workflow.data?.active ? 'Sí' : 'No')}`);
    console.log(`   Nodos: ${workflow.nodes?.length || workflow.data?.nodes?.length || testWorkflow.nodes.length}`);
    
    const workflowId = workflow.id || workflow.data?.id;
    if (workflowId) {
      console.log(`\n🔗 URL del workflow:`);
      console.log(`   https://primary-dev-d75a.up.railway.app/workflow/${workflowId}`);
    }
    
    console.log('\n✨ Workflow listo para usar!');
    console.log('\n💡 Puedes activarlo desde la interfaz de n8n cuando estés listo para probarlo.');
  } catch (error) {
    console.error('❌ Error al crear workflow:', error);
    if (error instanceof Error) {
      console.error('   Mensaje:', error.message);
    }
    process.exit(1);
  }
}

// Ejecutar
createTestWorkflow();

