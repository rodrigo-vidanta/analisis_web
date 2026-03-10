/**
 * Script para crear 10 plantillas "Gancho de Oportunidad" v2
 * Data-driven: basadas en patrones de top performers (19% reply rate)
 * Sin variables (contactos en frio)
 *
 * Uso: node scripts/create-gancho-oportunidad-v2-templates.cjs
 */

const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates';
const AUTH_TOKEN = '4ydoA3HgTwWI5lSolmZW8VYqjpazPPap5M6a0EHLccHyXvOgv82evBMzMGj5sYVF';
const TEMPLATE_GROUP_ID = '44249a5e-a4e1-4355-9d74-48b3cece8254';

const TAGS = ['oferta', 'exclusivo', 'reactivacion'];

const templates = [
  {
    name: 'gancho_upgrade_cancelado',
    description: 'Scarcity (Cialdini) - Cancelacion real libera recurso unico, urgencia implicita',
    body: 'Hola \u{1F44B} Se cancel\u00F3 una reservaci\u00F3n y qued\u00F3 libre un upgrade a suite premium en *Vidanta*. Soy _Vacation Planner_ y puedo reasignarla. \u00BFLe cuento?',
  },
  {
    name: 'gancho_experiencia_vip',
    description: 'Curiosity Gap (Loewenstein) - Brecha de informacion con acceso exclusivo VIP',
    body: 'Hola \u{1F60A} Hay una experiencia VIP en *Vidanta* que normalmente est\u00E1 reservada para hu\u00E9spedes premium. Como _Vacation Planner_ puedo darle acceso. \u00BFLe cuento?',
  },
  {
    name: 'gancho_precio_cierra_pronto',
    description: 'Loss Aversion (Kahneman) - Frame de perdida anticipada, cuidado genuino',
    body: 'Hola \u{1F44B} Como _Vacation Planner_ de *Vidanta* le aviso: hay un costo preferencial que no va a durar mucho. No quiero que se quede sin conocerlo. \u00BFLe cuento?',
  },
  {
    name: 'gancho_antes_que_se_vaya',
    description: 'Regret Aversion - Disponibilidad rara genera miedo a perderla',
    body: 'Hola \u{1F60A} Se abri\u00F3 una disponibilidad en *Vidanta* que no hab\u00EDa visto en semanas. Soy _Vacation Planner_ y no quiero que se la pierda. \u00BFLe cuento de qu\u00E9 se trata?',
  },
  {
    name: 'gancho_suite_disponible',
    description: 'Authority (Cialdini) - Posiciona como insider con acceso real a suites',
    body: 'Hola \u{1F44B} Revisando disponibilidad de suites en *Vidanta*, encontr\u00E9 una opci\u00F3n que normalmente no est\u00E1 abierta. Soy _Vacation Planner_ y puedo apartarla. \u00BFLe cuento?',
  },
  {
    name: 'gancho_espacio_exclusivo',
    description: 'Social Proof + Scarcity - Demanda implicita por espacio comprometido que se libero',
    body: 'Hola \u{1F60A} Un espacio en resort de lujo en *Vidanta* que estaba comprometido qued\u00F3 libre. Soy _Vacation Planner_ y pens\u00E9 en avisarle antes de reasignarlo. \u00BFLe cuento?',
  },
  {
    name: 'gancho_suite_mar_liberada',
    description: 'Future Pacing + Scarcity - Imagen mental vivida con urgencia temporal',
    body: 'Hola \u{1F44B} Imagine una suite frente al mar en *Vidanta* que acaba de quedar disponible. Soy _Vacation Planner_ y puedo apartarla antes de que se reasigne. \u00BFQuiere saber m\u00E1s?',
  },
  {
    name: 'gancho_evento_privado',
    description: 'DITF Door In The Face - Reduce pedido a solo escuchar, baja resistencia',
    body: 'Hola \u{1F60A} No le pido nada, solo avisarle: en *Vidanta* hay un evento exclusivo con cupo limitado. Soy _Vacation Planner_ y puedo darle detalles. \u00BFMe permite?',
  },
  {
    name: 'gancho_beneficio_extra',
    description: 'Reciprocity (Cialdini) - Avisarle primero crea deuda social sutil',
    body: 'Hola \u{1F44B} Soy _Vacation Planner_ de *Vidanta* y me autorizaron ofrecer un beneficio adicional que normalmente no se incluye. Quise avisarle primero. \u00BFLe cuento de qu\u00E9 se trata?',
  },
  {
    name: 'gancho_temporada_agotada',
    description: 'Contrast Effect (Cialdini) - Agotado vs disponible amplifica valor percibido',
    body: 'Hola \u{1F60A} Una temporada que estaba agotada en *Vidanta* acaba de tener una apertura. Soy _Vacation Planner_ y no creo que dure. \u00BFQuiere que le comparta los detalles?',
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
  console.log(`  Tecnica: ${template.description.split(' - ')[0]}`);
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
      console.error(`  Error ${response.status}:`, JSON.stringify(result, null, 2));
      return { success: false, name: template.name, error: result };
    }

    const templateId = result?.data?.id || result?.id;
    console.log(`  Creada exitosamente. ID: ${templateId || 'N/A'}`);
    return { success: true, name: template.name, id: templateId, data: result };
  } catch (error) {
    console.error(`  Error de red:`, error.message);
    return { success: false, name: template.name, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('CREACION MASIVA - Gancho de Oportunidad v2 (10 templates)');
  console.log('='.repeat(60));
  console.log(`Webhook: ${WEBHOOK_URL}`);
  console.log(`Grupo: ${TEMPLATE_GROUP_ID} (Gancho de Oportunidad)`);
  console.log(`Categoria: MARKETING`);
  console.log(`Tags: ${TAGS.join(', ')}`);
  console.log(`Total: ${templates.length} plantillas`);
  console.log(`Variables: ninguna (contactos en frio)`);

  const results = [];

  for (let i = 0; i < templates.length; i++) {
    const result = await createTemplate(templates[i], i, templates.length);
    results.push(result);

    if (i < templates.length - 1) {
      console.log('  Esperando 2s...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN');
  console.log('='.repeat(60));

  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Exitosas: ${succeeded.length}`);
  console.log(`Fallidas: ${failed.length}`);

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
}

main().catch(console.error);
