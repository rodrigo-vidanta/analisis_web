/**
 * Script para crear 20 plantillas de conciertos (10 El Buki + 10 Michael Bublé)
 * Contactos en frío, 0 variables, todas MARKETING
 * Llama al webhook N8N (misma ruta que el edge function proxy)
 *
 * Uso: node scripts/create-conciertos-templates.cjs
 */

const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates';
const AUTH_TOKEN = '4ydoA3HgTwWI5lSolmZW8VYqjpazPPap5M6a0EHLccHyXvOgv82evBMzMGj5sYVF';

const BUKI_GROUP_ID = 'd7ddb4ee-9f4a-4a72-8e26-d0e9760e6084';
const BUBLE_GROUP_ID = '9b406cde-deb8-415e-9178-8561215c2318';

const CONCIERTOS_TAGS = ['conciertos', 'eventos', 'exclusivo'];

const templates = [
  // ========== EL BUKI (10) ==========
  {
    name: 'buki_pregunta_directa',
    description: 'Pattern Interrupt - Pregunta directa que rompe expectativa de mensaje comercial',
    body: 'Hola 👋 Una pregunta directa: ¿le gusta Marco Antonio Solís? Viene a Vidanta el 30 de abril en un formato íntimo. ¿Le cuento más?',
    group_id: BUKI_GROUP_ID,
  },
  {
    name: 'buki_ultima_vez',
    description: 'Self-Reference Effect - Fuerza introspección sobre última experiencia musical',
    body: 'Hola 😊 ¿Cuándo fue la última vez que vivió un concierto inolvidable? Marco Antonio Solís estará en Vidanta en un formato que pocos van a ver. ¿Le cuento?',
    group_id: BUKI_GROUP_ID,
  },
  {
    name: 'buki_30_abril',
    description: 'Curiosity Gap - Fecha como ancla, revela parcialmente para generar curiosidad',
    body: 'Hola 👋 El 30 de abril pasa algo especial en Vidanta. Tiene que ver con Marco Antonio Solís y un escenario rodeado de naturaleza y mar. ¿Quiere saber más?',
    group_id: BUKI_GROUP_ID,
  },
  {
    name: 'buki_regalo_especial',
    description: 'Future Pacing - Transporta al futuro deseado, activa vínculo emocional',
    body: 'Imagine regalarle a alguien especial una noche con Marco Antonio Solís en Vidanta, rodeados de naturaleza, arena y mar. ¿Le interesa conocer los detalles?',
    group_id: BUKI_GROUP_ID,
  },
  {
    name: 'buki_acceso_planner',
    description: 'Authority - Se posiciona como Vacation Planner con acceso exclusivo',
    body: 'Hola 👋 Muy pocas personas saben que Marco Antonio Solís dará un concierto íntimo en Vidanta. Soy Vacation Planner y puedo darle acceso. ¿Le interesa?',
    group_id: BUKI_GROUP_ID,
  },
  {
    name: 'buki_no_deberia_decirle',
    description: 'Forbidden Knowledge - Transgresión controlada, activa alerta de info privilegiada',
    body: 'Probablemente no debería decirle esto, pero Marco Antonio Solís viene a Vidanta en formato privado. Soy Vacation Planner y aún hay lugar. ¿Le interesa?',
    group_id: BUKI_GROUP_ID,
  },
  {
    name: 'buki_cancion_en_vivo',
    description: 'Cultural Anchoring - Referencia a canción icónica genera conexión emocional instantánea',
    body: 'Si no te hubieras ido... ¿la ha cantado alguna vez? El 30 de abril puede escucharla en vivo en Vidanta, rodeado de naturaleza y mar. ¿Le cuento cómo?',
    group_id: BUKI_GROUP_ID,
  },
  {
    name: 'buki_favor_conocido',
    description: 'Indirect Targeting - Pide referir a alguien, elimina presión directa, 80% responde "yo"',
    body: 'Hola, necesito un favor: tengo un lugar para ver a Marco Antonio Solís en Vidanta y no sé a quién ofrecerlo. ¿Conoce a alguien que le interese?',
    group_id: BUKI_GROUP_ID,
  },
  {
    name: 'buki_no_se_lo_pierda',
    description: 'Regret Aversion - Miedo a arrepentirse impulsa acción sin presión directa',
    body: 'Hola 👋 Marco Antonio Solís en Vidanta, 30 de abril, formato íntimo. Sería una lástima no conocer los detalles. Soy Vacation Planner de Vidanta. ¿Le cuento?',
    group_id: BUKI_GROUP_ID,
  },
  {
    name: 'buki_un_momento',
    description: 'Rapid Fire Premium - Directo pero respetuoso, respeta tiempo del cliente premium',
    body: 'Hola 😊 Le tomo solo un momento: Marco Antonio Solís, Vidanta, 30 de abril, formato íntimo. Soy Vacation Planner de Vidanta. ¿Le gustaría conocer los detalles?',
    group_id: BUKI_GROUP_ID,
  },
  // ========== MICHAEL BUBLÉ (10) ==========
  {
    name: 'buble_si_o_no',
    description: 'FITD Foot in the Door - Pide compromiso mínimo, la respuesta abre conversación',
    body: 'Hola 😊 Solo una pregunta: ¿le gusta Michael Bublé? Viene a Vidanta en mayo para algo muy especial. Si le interesa, le cuento.',
    group_id: BUBLE_GROUP_ID,
  },
  {
    name: 'buble_sin_presion',
    description: 'Reactance - Da permiso de rechazar, paradójicamente baja resistencia',
    body: 'Hola 👋 Michael Bublé en Vidanta, mayo 2026, formato íntimo. Si no le interesa, sin problema. Pero si sí, puedo apartarle lugar como su Vacation Planner.',
    group_id: BUBLE_GROUP_ID,
  },
  {
    name: 'buble_info_exclusiva',
    description: 'Reciprocity - Da información primero, crea obligación implícita de reciprocar',
    body: 'Hola, le comparto algo que aún no es muy conocido: Michael Bublé en Vidanta, formato íntimo, mayo 2026. Soy Vacation Planner y puedo darle los detalles. ¿Le interesa?',
    group_id: BUBLE_GROUP_ID,
  },
  {
    name: 'buble_pareja_o_familia',
    description: 'False Choice - Ambas opciones implican "sí quiero ir", elimina el "no"',
    body: 'Hola 😊 Michael Bublé viene a Vidanta en un formato exclusivo. Si pudiera ir, ¿lo disfrutaría en pareja o con su familia?',
    group_id: BUBLE_GROUP_ID,
  },
  {
    name: 'buble_solo_conocer',
    description: 'DITF Door in the Face - Ancla con comprar, luego pide solo conocer',
    body: 'Hola 👋 No le pido que compre nada. Solo quiero saber si le gustaría conocer una experiencia única: Michael Bublé en vivo en Vidanta. ¿Le cuento más?',
    group_id: BUBLE_GROUP_ID,
  },
  {
    name: 'buble_mejores_lugares',
    description: 'Insider Access - Vacation Planner de Vidanta con capacidad de apartar mejores lugares',
    body: 'Hola 👋 Michael Bublé en Vidanta, mayo, formato íntimo. Como Vacation Planner de Vidanta puedo apartarle los mejores lugares. ¿Le interesa conocer los detalles?',
    group_id: BUBLE_GROUP_ID,
  },
  {
    name: 'buble_buena_musica',
    description: 'Identity Labeling - Asigna identidad positiva de amante de buena música',
    body: 'Hola 😊 Si disfruta de la buena música, esto le va a encantar: Michael Bublé viene a Vidanta en mayo, formato exclusivo. Soy Vacation Planner de Vidanta. ¿Le interesa?',
    group_id: BUBLE_GROUP_ID,
  },
  {
    name: 'buble_ya_separaron',
    description: 'Social Proof - Otros ya separaron lugar, activa instinto de no quedarse fuera',
    body: 'Hola 👋 Muchas personas ya separaron su lugar para Michael Bublé en Vidanta. Soy Vacation Planner de Vidanta y aún quedan espacios. ¿Le gustaría saber más?',
    group_id: BUBLE_GROUP_ID,
  },
  {
    name: 'buble_otro_nivel',
    description: 'Contrast Effect - Contrasta concierto normal vs experiencia Vidanta',
    body: 'Hola 😊 Un concierto normal es una cosa. Michael Bublé en un escenario íntimo rodeado de naturaleza y mar en Vidanta es otra. Soy Vacation Planner de Vidanta. ¿Le cuento?',
    group_id: BUBLE_GROUP_ID,
  },
  {
    name: 'buble_rapido',
    description: 'Rapid Fire Zero-friction - Telegráfico, sin rodeos, respeta tiempo del prospecto',
    body: 'Le tomo 10 segundos: Michael Bublé, Vidanta, mayo 2026, escenario íntimo rodeado de naturaleza y mar. ¿Le interesa?',
    group_id: BUBLE_GROUP_ID,
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
    template_group_id: template.group_id,
    tags: CONCIERTOS_TAGS,
  };

  const grupo = template.group_id === BUKI_GROUP_ID ? 'El Buki' : 'Bublé';
  console.log(`\n[${index + 1}/${total}] Creando: ${template.name} (${grupo})`);
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
      return { success: false, name: template.name, grupo, error: result };
    }

    const templateId = result?.data?.id || result?.id;
    console.log(`  ✅ Creada exitosamente. ID: ${templateId || 'N/A'}`);
    return { success: true, name: template.name, grupo, id: templateId, data: result };
  } catch (error) {
    console.error(`  ❌ Error de red:`, error.message);
    return { success: false, name: template.name, grupo, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('CREACIÓN MASIVA - Conciertos (El Buki + Michael Bublé)');
  console.log('='.repeat(60));
  console.log(`Webhook: ${WEBHOOK_URL}`);
  console.log(`Grupo El Buki: ${BUKI_GROUP_ID}`);
  console.log(`Grupo Bublé: ${BUBLE_GROUP_ID}`);
  console.log(`Categoría: MARKETING`);
  console.log(`Tags: ${CONCIERTOS_TAGS.join(', ')}`);
  console.log(`Total: ${templates.length} plantillas (10 Buki + 10 Bublé)`);
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

  const bukiOk = succeeded.filter(r => r.grupo === 'El Buki').length;
  const bubleOk = succeeded.filter(r => r.grupo === 'Bublé').length;

  console.log(`✅ Exitosas: ${succeeded.length} (Buki: ${bukiOk}, Bublé: ${bubleOk})`);
  console.log(`❌ Fallidas: ${failed.length}`);

  if (succeeded.length > 0) {
    console.log('\nIDs creados:');
    succeeded.forEach(r => {
      console.log(`  [${r.grupo}] ${r.name}: ${r.id || 'sin ID'}`);
    });
  }

  if (failed.length > 0) {
    console.log('\nFallidas:');
    failed.forEach(r => {
      console.log(`  [${r.grupo}] ${r.name}: ${JSON.stringify(r.error)}`);
    });
  }

  console.log('\n--- JSON RESULTS ---');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
