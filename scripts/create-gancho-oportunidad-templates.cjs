/**
 * Script para crear 10 plantillas "Gancho de Oportunidad" para contactos en frío
 * Sin variables (solo número de teléfono disponible)
 * Llama al webhook N8N (misma ruta que el edge function proxy)
 *
 * Uso: node scripts/create-gancho-oportunidad-templates.cjs
 */

const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates';
const AUTH_TOKEN = '4ydoA3HgTwWI5lSolmZW8VYqjpazPPap5M6a0EHLccHyXvOgv82evBMzMGj5sYVF';
const TEMPLATE_GROUP_ID = '44249a5e-a4e1-4355-9d74-48b3cece8254';

const TAGS = ['primer_contacto', 'interes'];

const templates = [
  {
    name: 'gancho_sin_vender',
    description: 'Pattern Interrupt - Rompe expectativa de mensaje de ventas, baja defensas',
    body: 'No le voy a vender nada. Solo quiero hacerle una pregunta: ¿ya conoce las experiencias vacacionales que ofrece Vidanta?',
  },
  {
    name: 'gancho_sin_compromiso',
    description: 'Reactance (Brehm) - Da permiso de decir no, paradójicamente aumenta el sí',
    body: 'Hola 😊 Si ya tiene todo resuelto para sus vacaciones, perfecto. Pero si no, tengo una opción en Vidanta que vale la pena conocer.\n\n¿Le interesa?',
  },
  {
    name: 'gancho_familias_recientes',
    description: 'Social Proof (Cialdini) - Otros ya lo hacen, activa instinto de manada',
    body: 'Hola 👋 Esta semana varias familias separaron fechas en Vidanta. Se abrieron algunos espacios nuevos en nuestros resorts de lujo.\n\n¿Quiere que le cuente qué hay disponible?',
  },
  {
    name: 'gancho_playa_o_montana',
    description: 'False Choice (Doble Vínculo) - Ambas opciones llevan a sí quiero vacaciones',
    body: 'Hola 😊 Una pregunta rápida: si pudiera elegir sus vacaciones en Vidanta, ¿prefiere playa con arena blanca o un destino rodeado de naturaleza?',
  },
  {
    name: 'gancho_despertar_mar',
    description: 'Future Pacing (PNL) - Transporta al futuro deseado, el cerebro ya lo quiere',
    body: 'Imagine despertar mañana rodeado de naturaleza, arena y mar en una suite de lujo en Vidanta. Está más cerca de lo que cree.\n\n¿Quiere saber cómo?',
  },
  {
    name: 'gancho_solo_escuchar',
    description: 'DITF Door In The Face - Ancla con algo grande, luego pide algo pequeño',
    body: 'Hola 👋 No le pido que reserve nada hoy. Solo quiero saber: ¿le gustaría conocer las opciones de vacaciones de lujo en Vidanta con costos preferenciales?',
  },
  {
    name: 'gancho_merecen_vacaciones',
    description: 'Self-Reference Effect - Fuerza introspección, activa deseo latente',
    body: 'Hola 😊 ¿Hace cuánto no se toma unas vacaciones como se las merece? Tengo algo en Vidanta que podría ser justo lo que necesita.\n\n¿Le cuento?',
  },
  {
    name: 'gancho_mi_contacto',
    description: 'Reciprocity (Cialdini) - Da primero su contacto, crea obligación implícita',
    body: 'Hola, le comparto mi contacto por si en algún momento busca vacaciones de lujo a costos preferenciales. Soy Vacation Planner de Vidanta.\n\n¿Tiene algún viaje en mente?',
  },
  {
    name: 'gancho_planner_experto',
    description: 'Authority (Cialdini) - Se posiciona como especialista, genera confianza',
    body: 'Hola 👋 Soy Vacation Planner en Vidanta y me especializo en encontrar las mejores opciones de hospedaje de lujo.\n\n¿Está planeando algún viaje próximamente?',
  },
  {
    name: 'gancho_lujo_accesible',
    description: 'Contrast Effect (Cialdini) - Ancla con inalcanzable, contrasta con accesible',
    body: 'Hola 😊 Unas vacaciones en resort de lujo suenan inalcanzables, pero en Vidanta tenemos opciones con costos preferenciales que cambian esa idea.\n\n¿Le gustaría conocerlas?',
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
  console.log('CREACIÓN MASIVA - Gancho de Oportunidad (Frío, 0 vars)');
  console.log('='.repeat(60));
  console.log(`Webhook: ${WEBHOOK_URL}`);
  console.log(`Grupo: ${TEMPLATE_GROUP_ID} (Gancho de Oportunidad)`);
  console.log(`Categoría: MARKETING`);
  console.log(`Tags: ${TAGS.join(', ')}`);
  console.log(`Total: ${templates.length} plantillas`);
  console.log(`Variables: ninguna (contactos en frío)`);

  const results = [];

  for (let i = 0; i < templates.length; i++) {
    const result = await createTemplate(templates[i], i, templates.length);
    results.push(result);

    // Esperar 2 segundos entre creaciones para no saturar
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
