/**
 * Script para crear 10 plantillas "Viaje en Familia" para contactos en frío
 * Sin variables (solo número de teléfono disponible)
 * Llama al webhook N8N (misma ruta que el edge function proxy)
 *
 * Uso: node scripts/create-familia-templates.cjs
 */

const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates';
const AUTH_TOKEN = '4ydoA3HgTwWI5lSolmZW8VYqjpazPPap5M6a0EHLccHyXvOgv82evBMzMGj5sYVF';
const TEMPLATE_GROUP_ID = 'd3d6ddfa-fcba-484d-86a0-c6d3b68d4827';

const TAGS = ['familias', 'primer_contacto', 'interes'];

const templates = [
  {
    name: 'familia_recuerdos',
    description: 'Future Pacing - Los mejores recuerdos se crean en familia, posiciona como recurso',
    body: 'Hola 😊 Los mejores recuerdos se crean en familia. ¿Ya tiene plan para sus próximas vacaciones familiares? Soy Vacation Planner de Vidanta y puedo ayudarle.',
  },
  {
    name: 'familia_vacaciones_perfectas',
    description: 'FITD - Pregunta aspiracional segura sobre destino ideal, sin temas sensibles',
    body: 'Hola 👋 Si pudiera planear unas vacaciones familiares perfectas, ¿a dónde iría? Soy Vacation Planner de Vidanta y me especializo en experiencias para familias. ¿Le interesa?',
  },
  {
    name: 'familia_merece_tiempo',
    description: 'Self-Reference Effect - Menciona cosas concretas de Vidanta sin juzgar',
    body: 'Hola 😊 ¿Qué tal unas vacaciones donde toda la familia la pase increíble? Parque acuático, playa, restaurantes y más. Soy Vacation Planner de Vidanta. ¿Le interesa?',
  },
  {
    name: 'familia_no_crecen_dos_veces',
    description: 'Regret Aversion - Los hijos no crecen dos veces, menciona qué hay en Vidanta',
    body: 'Hola 👋 Los hijos no crecen dos veces. Cada vacación juntos vale oro. En Vidanta hay parque acuático, kids club y actividades para toda la familia. Soy Vacation Planner. ¿Le cuento?',
  },
  {
    name: 'familia_playa_o_parque',
    description: 'False Choice - Ambas opciones comprometen al prospecto, no revela que Vidanta tiene ambas',
    body: 'Hola 😊 Si pudiera elegir para su familia: ¿un día de playa en arena blanca o un parque acuático de clase mundial? Soy Vacation Planner de Vidanta. ¿Qué prefiere?',
  },
  {
    name: 'familia_ya_separaron',
    description: 'Social Proof - Otras familias ya están planeando, activa instinto de no quedarse fuera',
    body: 'Hola 👋 Muchas familias ya están planeando sus vacaciones en Vidanta para este año. Soy Vacation Planner de Vidanta y puedo ayudarle a encontrar la mejor opción. ¿Le interesa?',
  },
  {
    name: 'familia_todo_incluido',
    description: 'Curiosity Gap - Pinta la escena completa de Vidanta, genera curiosidad',
    body: 'Hola 😊 Imagine un lugar con parque acuático, kids club, restaurantes de todo el mundo y playa privada. Eso es Vidanta. Soy Vacation Planner. ¿Quiere saber más?',
  },
  {
    name: 'familia_sin_vender',
    description: 'Pattern Interrupt - Rompe expectativa de mensaje comercial, enfoque familiar',
    body: 'No le voy a vender nada. Solo quiero preguntarle: ¿le gustaría que su familia viviera unas vacaciones que recuerden toda la vida? Eso hacemos en Vidanta. ¿Le cuento?',
  },
  {
    name: 'familia_contacto_planner',
    description: 'Reciprocity - Ofrece su contacto primero, crea obligación implícita',
    body: 'Hola, le comparto mi contacto por si busca vacaciones familiares de lujo a costos preferenciales. Soy Vacation Planner de Vidanta y me especializo en familias. ¿Tiene algún viaje en mente?',
  },
  {
    name: 'familia_lujo_accesible',
    description: 'Contrast Effect - Ancla con inalcanzable, contrasta con costos preferenciales',
    body: 'Hola 😊 Vacaciones familiares en resort de lujo suenan inalcanzables, pero en Vidanta tenemos opciones con costos preferenciales para toda la familia. ¿Le gustaría conocerlas?',
  },
];

async function createTemplate(template, index, total) {
  const payload = {
    name: template.name,
    language: 'es_MX',
    category: 'MARKETING',
    components: [
      {
        type: 'BODY',
        text: template.body,
      },
    ],
    description: template.description,
    variable_mappings: [],
    audience_ids: [],
    audiences: [],
    template_group_id: TEMPLATE_GROUP_ID,
    tags: TAGS,
  };

  console.log(`\n[${index + 1}/${total}] Creando: ${template.name}`);
  console.log(`  Técnica: ${template.description.split(' - ')[0]}`);
  console.log(`  Body: ${template.body.substring(0, 80)}...`);
  console.log(`  Chars: ${template.body.length}`);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth': AUTH_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { raw: text };
    }

    if (!response.ok) {
      console.error(`  ❌ Error ${response.status}:`, JSON.stringify(result, null, 2));
      return { success: false, name: template.name, error: result };
    }

    const templateId = result?.data?.id || result?.id;
    console.log(`  ✅ Creada exitosamente. ID: ${templateId || 'N/A'}`);
    return { success: true, name: template.name, id: templateId, data: result };
  } catch (error) {
    console.error(`  ❌ Error de red:`, error.message);
    return { success: false, name: template.name, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('CREACIÓN MASIVA - Viaje en Familia (Frío, 0 vars)');
  console.log('='.repeat(60));
  console.log(`Webhook: ${WEBHOOK_URL}`);
  console.log(`Grupo: ${TEMPLATE_GROUP_ID} (Viaje en Familia)`);
  console.log(`Categoría: MARKETING`);
  console.log(`Tags: ${TAGS.join(', ')}`);
  console.log(`Total: ${templates.length} plantillas`);
  console.log(`Variables: ninguna (contactos en frío)`);

  const results = [];

  for (let i = 0; i < templates.length; i++) {
    const result = await createTemplate(templates[i], i, templates.length);
    results.push(result);

    if (i < templates.length - 1) {
      console.log('  ⏳ Esperando 2s...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN');
  console.log('='.repeat(60));

  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Exitosas: ${succeeded.length}`);
  console.log(`❌ Fallidas: ${failed.length}`);

  if (succeeded.length > 0) {
    console.log('\nIDs creados:');
    succeeded.forEach(r => {
      console.log(`  ${r.name}: ${r.id || 'sin ID'}`);
    });
  }

  if (failed.length > 0) {
    console.log('\nFallidas:');
    failed.forEach(r => {
      console.log(`  ${r.name}: ${JSON.stringify(r.error)}`);
    });
  }

  console.log('\n--- JSON RESULTS ---');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
