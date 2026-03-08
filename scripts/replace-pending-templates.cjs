/**
 * Script para ELIMINAR 20 plantillas PENDING (+24h) y CREAR 19 versiones refraseadas
 * Llama al webhook N8N (misma ruta que el edge function proxy whatsapp-templates-proxy)
 *
 * DELETE: POST a WEBHOOK_URL?id=<template_id> con body { _method: 'DELETE' }
 * CREATE: POST a WEBHOOK_URL con payload completo
 *
 * Uso: node scripts/replace-pending-templates.cjs
 */

const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates';
const AUTH_TOKEN = '4ydoA3HgTwWI5lSolmZW8VYqjpazPPap5M6a0EHLccHyXvOgv82evBMzMGj5sYVF';

// ============================================
// TEMPLATE IDS A ELIMINAR (20 PENDING +24h)
// ============================================
const TEMPLATES_TO_DELETE = [
  { id: 'a509a136-bad1-4f0f-b543-f291e2903520', name: 'agendar_llamada' },
  { id: 'd2cee91a-dc7d-45a5-b981-979ade125d1f', name: 'michael_buble_en_vidanta_v2' },
  { id: '092d7e23-89b4-40bd-a6a2-ddef5f58d302', name: 'prospecto_puente__marzo' },
  { id: '94d940d5-eca7-4acd-98bb-936871a358c4', name: 'test_delete_prueba' },
  { id: '4731e586-e305-44cd-be40-8bc370e7dc5d', name: 'post_contacto_breve' },
  { id: 'fed0fbe5-18d6-420e-a919-38b83a63b9b5', name: 'post_contacto_seguimiento' },
  { id: '9b9ea8b0-17aa-4d99-9c08-cfe502bfd71a', name: 'post_contacto_pregunta_abierta' },
  { id: '9b893f8e-facd-439e-947d-35dd6bbe01fb', name: 'retomar_sin_presion' },
  { id: 'ede0e285-a121-4b54-92a0-086e7f5f6418', name: 'retomar_propuesta_nueva' },
  { id: 'efec9515-0c3e-4946-a57a-cb1357f2f1df', name: 'buki_experiencia_exclusiva' },
  { id: 'b10a6d77-08f8-4b3f-bfa0-b525f09c2ca7', name: 'oportunidad_exclusiva' },
  { id: '9380dbc2-e9a5-4b85-8489-7308fae251cd', name: 'reserva_pendiente_breve' },
  { id: '6ae56f1f-0a8d-4ade-a781-70aadc6268c6', name: 'llamada_pendiente_breve' },
  { id: '12da6ea6-4d76-43d9-a4c7-900e0b72fb55', name: 'conciertos_2026_breve' },
  { id: '61c1c1e9-262e-4bac-9963-6ffae788e2e6', name: 'escapada_en_pareja' },
  { id: '22bc0010-a235-4581-9bc8-462ac7b744d8', name: 'buble_experiencia_exclusiva' },
  { id: '3d8ff9ad-4ad7-4c3e-937c-4fb3b7b94c9f', name: 'oportunidad_microcompromiso' },
  { id: '3bdf7fd3-dfa1-4156-b771-986e5fd14d15', name: 'reserva_vencimiento' },
  { id: 'b2aa5d4b-886b-4150-aed0-ab2229409a95', name: 'llamada_empatia' },
  { id: '5706c9cd-cbd5-4a8b-9dcd-415a232de11c', name: 'conciertos_2026_temporada' },
];

// ============================================
// GROUP IDS
// ============================================
const GROUPS = {
  CON_RESERVA:    'ef6b3dd0-9692-4a4d-b9a4-95cb2a4fa796',
  BUKI:           'd7ddb4ee-9f4a-4a72-8e26-d0e9760e6084',
  BUBLE:          '9b406cde-deb8-415e-9178-8561215c2318',
  SERIES_2026:    'de337b35-4521-4e97-9f98-72214f3fce3f',
  GANCHO:         '44249a5e-a4e1-4355-9d74-48b3cece8254',
  RETOMAR:        '40447d01-9e93-4d9a-b848-5387cb6ef562',
  SEG_LLAMADA:    'e5ee1d31-13ef-48c8-ae50-3cec8ba78557',
  SEG_POST:       'ce2d9a8d-e0c1-41b0-b343-e806711893a4',
  PAREJA:         '3051d075-e890-48ce-9cdf-8f659937adc2',
};

// ============================================
// 19 PLANTILLAS REFRASEADAS (factory-templates)
// ============================================
const TEMPLATES_TO_CREATE = [
  // --- Seguimiento de Llamada ---
  {
    name: 'agendar_llamada_v2',
    description: 'FITD - Micro-compromiso de horario. Reemplaza agendar_llamada (54d pending)',
    category: 'MARKETING',
    template_group_id: GROUPS.SEG_LLAMADA,
    tags: ['llamada', 'seguimiento'],
    body: 'Hola, buen día 😊 Le saluda su Vacation Planner {{1}} de *Vidanta*. Me gustaría agendar una breve llamada para compartirle algo que creo le va a interesar.\n\n¿Le funciona más tarde?',
    variable_mappings: [
      { variable_number: 1, table_name: 'system', field_name: 'ejecutivo_nombre', display_name: 'Nombre del Ejecutivo', is_required: true, is_system_variable: true },
    ],
    example: [['Ejecutivo Ejemplo']],
  },
  {
    name: 'llamada_sin_presion',
    description: 'Pattern Interrupt - Empatia en vez de push. Reemplaza llamada_empatia',
    category: 'MARKETING',
    template_group_id: GROUPS.SEG_LLAMADA,
    tags: ['llamada', 'seguimiento'],
    body: 'Hola 👋 No se preocupe por la llamada que no pudimos concretar. Estoy para cuando usted pueda.\n\n¿En qué horario le funciona mejor para que platiquemos?',
    variable_mappings: [],
  },
  {
    name: 'llamada_breve',
    description: 'FITD - Solo unos minutos. Reemplaza llamada_pendiente_breve',
    category: 'MARKETING',
    template_group_id: GROUPS.SEG_LLAMADA,
    tags: ['llamada', 'seguimiento'],
    body: 'Hola 👋 Le llamamos pero no logramos comunicarnos. No se preocupe, solo serían unos minutos.\n\n¿En qué horario le queda mejor?',
    variable_mappings: [],
  },

  // --- Concierto: Michael Buble ---
  {
    name: 'buble_concierto_intimo',
    description: 'Future Pacing - Vivir la experiencia. Reemplaza michael_buble_en_vidanta_v2',
    category: 'MARKETING',
    template_group_id: GROUPS.BUBLE,
    tags: ['conciertos', 'eventos', 'exclusivo'],
    body: 'Hola 😊 Imagine disfrutar a *Michael Bublé* en vivo, frente al mar, en un evento íntimo en *Vidanta*. Una experiencia que muy pocas personas van a vivir.\n\n¿Le interesa conocer los detalles?',
    variable_mappings: [],
  },
  {
    name: 'buble_concierto_lujo',
    description: 'Authority - Calidad del evento. Reemplaza buble_experiencia_exclusiva',
    category: 'MARKETING',
    template_group_id: GROUPS.BUBLE,
    tags: ['conciertos', 'eventos', 'exclusivo'],
    body: 'Hola 👋 *Michael Bublé* llega a *Vidanta* para un concierto exclusivo en un escenario de lujo frente al mar.\n\n¿Le interesa que le comparta la información del evento?',
    variable_mappings: [],
  },

  // --- Concierto: El Buki ---
  {
    name: 'buki_formato_intimo',
    description: 'Curiosity Gap - Formato unico. Reemplaza buki_experiencia_exclusiva',
    category: 'MARKETING',
    template_group_id: GROUPS.BUKI,
    tags: ['conciertos', 'eventos', 'exclusivo'],
    body: 'Hola 👋 *Marco Antonio Solís* se presenta en *Vidanta* en un formato íntimo frente al mar. Una experiencia que no se repite.\n\n¿Le gustaría conocer los detalles?',
    variable_mappings: [],
  },

  // --- Concierto: Series 2026 ---
  {
    name: 'conciertos_formato_unico',
    description: 'Contrast Effect - Formato unico vs conciertos regulares. Reemplaza conciertos_2026_breve',
    category: 'MARKETING',
    template_group_id: GROUPS.SERIES_2026,
    tags: ['conciertos', 'eventos'],
    body: 'Hola 👋 *Vidanta* tiene una temporada de conciertos con artistas internacionales en un formato íntimo que no encontrará en otro lugar.\n\n¿Quiere que le cuente más?',
    variable_mappings: [],
  },
  {
    name: 'conciertos_escapada',
    description: 'Regret Aversion - No perderse la temporada. Reemplaza conciertos_2026_temporada',
    category: 'MARKETING',
    template_group_id: GROUPS.SERIES_2026,
    tags: ['conciertos', 'eventos'],
    body: 'Hola 😊 Si está planeando una escapada este año, *Vidanta* tiene una temporada de conciertos exclusivos que no querrá perderse.\n\n¿Le gustaría conocer la programación?',
    variable_mappings: [],
  },

  // --- Gancho de Oportunidad ---
  {
    name: 'gancho_curiosidad',
    description: 'Curiosity Gap - Algo no disponible antes. Reemplaza oportunidad_microcompromiso',
    category: 'MARKETING',
    template_group_id: GROUPS.GANCHO,
    tags: ['primer_contacto', 'oferta'],
    body: 'Hola 👋 Surgió algo en *Vidanta* que normalmente no está disponible y pensé que podría interesarle.\n\n¿Le cuento de qué se trata?',
    variable_mappings: [],
  },
  {
    name: 'gancho_oportunidad_nueva',
    description: 'Scarcity implicita - Oportunidad liberada. Reemplaza oportunidad_exclusiva',
    category: 'MARKETING',
    template_group_id: GROUPS.GANCHO,
    tags: ['primer_contacto', 'exclusivo'],
    body: 'Hola 👀 Se acaba de liberar una oportunidad en *Vidanta* que no estaba disponible antes.\n\n¿Quiere que le cuente los detalles?',
    variable_mappings: [],
  },
  {
    name: 'escapada_puente',
    description: 'Scarcity - Disponibilidad en puentes. Reemplaza prospecto_puente__marzo',
    category: 'MARKETING',
    template_group_id: GROUPS.GANCHO,
    tags: ['primer_contacto', 'oferta'],
    body: 'Hola, buen día 😊 Se acerca un puente perfecto para una escapada. En *Vidanta* hay disponibilidad en nuestros resorts de lujo con costos preferenciales.\n\n¿Le gustaría conocer las opciones?',
    variable_mappings: [],
  },

  // --- Con Reserva Pendiente ---
  {
    name: 'reserva_pendiente_v2',
    description: 'Endowment Effect - No pierda lo avanzado. Reemplaza reserva_pendiente_breve',
    category: 'MARKETING',
    template_group_id: GROUPS.CON_RESERVA,
    tags: ['seguimiento', 'negociacion'],
    body: 'Hola, buen día 😊 Su reservación en *Vidanta* quedó pendiente y no quiero que pierda lo que ya tiene avanzado.\n\n¿Le puedo apoyar en algo para retomarlo?',
    variable_mappings: [],
  },
  {
    name: 'reserva_vigencia',
    description: 'Loss Aversion - Vigencia del certificado. Reemplaza reserva_vencimiento',
    category: 'MARKETING',
    template_group_id: GROUPS.CON_RESERVA,
    tags: ['seguimiento', 'negociacion'],
    body: 'Hola 😊 Su certificado *Vidanta* tiene una vigencia y me gustaría asegurarme de que aproveche todos sus beneficios a tiempo.\n\n¿Quiere que revisemos juntos las opciones disponibles?',
    variable_mappings: [],
  },

  // --- Retomar Negociacion ---
  {
    name: 'retomar_sin_compromiso',
    description: 'Reactance - Libertad de no aceptar. Reemplaza retomar_sin_presion',
    category: 'MARKETING',
    template_group_id: GROUPS.RETOMAR,
    tags: ['reactivacion', 'negociacion'],
    body: 'Hola, buen día 😊 Solo quería retomar nuestra conversación sobre *Vidanta*. Si ya no le interesa, sin problema.\n\n¿Hay algo en lo que pueda apoyarle?',
    variable_mappings: [],
  },
  {
    name: 'retomar_opciones_nuevas',
    description: 'Reciprocity - Hice trabajo por usted. Reemplaza retomar_propuesta_nueva',
    category: 'MARKETING',
    template_group_id: GROUPS.RETOMAR,
    tags: ['reactivacion', 'negociacion'],
    body: 'Hola, buen día 😊 Estuve revisando opciones y encontré algo nuevo que podría interesarle, {{1}}.\n\n¿Le gustaría que le comparta los detalles?',
    variable_mappings: [
      { variable_number: 1, table_name: 'prospectos', field_name: 'nombre', display_name: 'Nombre del Prospecto', is_required: true },
    ],
    example: [['Juan']],
  },

  // --- Seguimiento Post-Contacto ---
  {
    name: 'seg_pregunta_destino',
    description: 'Zeigarnik Effect - Pensamiento incompleto. Reemplaza post_contacto_pregunta_abierta',
    category: 'UTILITY',
    template_group_id: GROUPS.SEG_POST,
    tags: ['seguimiento', 'interes'],
    body: 'Hola 😊 Fue un gusto platicar con usted. Me quedé pensando...\n\n¿Qué destino fue el que más le llamó la atención?',
    variable_mappings: [],
  },
  {
    name: 'seg_retomar_platica',
    description: 'Commitment & Consistency - Ya se comprometio al conversar. Reemplaza post_contacto_seguimiento',
    category: 'UTILITY',
    template_group_id: GROUPS.SEG_POST,
    tags: ['seguimiento'],
    body: 'Hola, buen día 😊 Retomando nuestra plática, {{1}}, quería saber si tuvo oportunidad de revisar la información.\n\n¿Tiene alguna duda que pueda resolverle?',
    variable_mappings: [
      { variable_number: 1, table_name: 'prospectos', field_name: 'nombre', display_name: 'Nombre del Prospecto', is_required: true },
    ],
    example: [['María']],
  },
  {
    name: 'seg_post_contacto',
    description: 'Reciprocity - Disponibilidad genuina. Reemplaza post_contacto_breve',
    category: 'UTILITY',
    template_group_id: GROUPS.SEG_POST,
    tags: ['seguimiento'],
    body: 'Hola, fue un gusto platicar con usted 😊 Quedo al pendiente para lo que necesite sobre su experiencia vacacional.\n\n¿Le quedó alguna duda?',
    variable_mappings: [],
  },

  // --- Viaje en Pareja ---
  {
    name: 'pareja_experiencia',
    description: 'Future Pacing - Pintar la escena romantica. Reemplaza escapada_en_pareja',
    category: 'MARKETING',
    template_group_id: GROUPS.PAREJA,
    tags: ['parejas', 'romantico'],
    body: 'Hola 😊 En *Vidanta* tenemos experiencias pensadas para parejas: cenas frente al mar, spa para dos y suites con vista al océano.\n\n¿Le gustaría conocer las opciones?',
    variable_mappings: [],
  },
];

// ============================================
// FUNCIONES
// ============================================

async function deleteTemplate(template, index, total) {
  const url = `${WEBHOOK_URL}?id=${template.id}`;
  console.log(`\n[DELETE ${index + 1}/${total}] ${template.name} (${template.id})`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth': AUTH_TOKEN,
      },
      body: JSON.stringify({ _method: 'DELETE' }),
    });

    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch { result = { raw: text }; }

    if (!response.ok) {
      console.error(`  ❌ Error ${response.status}:`, JSON.stringify(result).substring(0, 200));
      return { success: false, name: template.name, error: result };
    }

    console.log(`  ✅ Eliminada`);
    return { success: true, name: template.name };
  } catch (error) {
    console.error(`  ❌ Error de red:`, error.message);
    return { success: false, name: template.name, error: error.message };
  }
}

async function createTemplate(template, index, total) {
  const components = [{ type: 'BODY', text: template.body }];

  // Agregar examples si tiene variables
  if (template.example) {
    components[0].example = { body_text: template.example };
  }

  const payload = {
    name: template.name,
    language: 'es_MX',
    category: template.category,
    components,
    description: template.description,
    variable_mappings: template.variable_mappings,
    audience_ids: [],
    audiences: [],
    template_group_id: template.template_group_id,
    tags: template.tags,
  };

  console.log(`\n[CREATE ${index + 1}/${total}] ${template.name}`);
  console.log(`  Grupo: ${Object.entries(GROUPS).find(([, v]) => v === template.template_group_id)?.[0] || 'N/A'}`);
  console.log(`  Body: ${template.body.substring(0, 80)}...`);

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
    try { result = JSON.parse(text); } catch { result = { raw: text }; }

    if (!response.ok) {
      console.error(`  ❌ Error ${response.status}:`, JSON.stringify(result).substring(0, 200));
      return { success: false, name: template.name, error: result };
    }

    const templateId = result?.data?.id || result?.id;
    console.log(`  ✅ Creada. ID: ${templateId || 'N/A'}`);
    return { success: true, name: template.name, id: templateId, data: result };
  } catch (error) {
    console.error(`  ❌ Error de red:`, error.message);
    return { success: false, name: template.name, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('REEMPLAZO DE PLANTILLAS PENDING (+24h) - Factory Templates v2');
  console.log('='.repeat(70));
  console.log(`Webhook: ${WEBHOOK_URL}`);
  console.log(`Eliminar: ${TEMPLATES_TO_DELETE.length} plantillas`);
  console.log(`Crear: ${TEMPLATES_TO_CREATE.length} plantillas refraseadas`);
  console.log('');

  // ============================================
  // FASE 1: ELIMINAR
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('FASE 1: ELIMINANDO PLANTILLAS PENDING');
  console.log('='.repeat(70));

  const deleteResults = [];
  for (let i = 0; i < TEMPLATES_TO_DELETE.length; i++) {
    const result = await deleteTemplate(TEMPLATES_TO_DELETE[i], i, TEMPLATES_TO_DELETE.length);
    deleteResults.push(result);

    if (i < TEMPLATES_TO_DELETE.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  const deleteOk = deleteResults.filter(r => r.success);
  const deleteFail = deleteResults.filter(r => !r.success);

  console.log(`\n--- Resumen DELETE ---`);
  console.log(`✅ Eliminadas: ${deleteOk.length}/${TEMPLATES_TO_DELETE.length}`);
  if (deleteFail.length > 0) {
    console.log(`❌ Fallidas: ${deleteFail.length}`);
    deleteFail.forEach(r => console.log(`  - ${r.name}`));
  }

  // ============================================
  // FASE 2: CREAR
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('FASE 2: CREANDO PLANTILLAS REFRASEADAS');
  console.log('='.repeat(70));

  const createResults = [];
  for (let i = 0; i < TEMPLATES_TO_CREATE.length; i++) {
    const result = await createTemplate(TEMPLATES_TO_CREATE[i], i, TEMPLATES_TO_CREATE.length);
    createResults.push(result);

    if (i < TEMPLATES_TO_CREATE.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const createOk = createResults.filter(r => r.success);
  const createFail = createResults.filter(r => !r.success);

  // ============================================
  // RESUMEN FINAL
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('RESUMEN FINAL');
  console.log('='.repeat(70));
  console.log(`DELETE: ${deleteOk.length}/${TEMPLATES_TO_DELETE.length} exitosas`);
  console.log(`CREATE: ${createOk.length}/${TEMPLATES_TO_CREATE.length} exitosas`);

  if (createOk.length > 0) {
    console.log('\nIDs creados:');
    createOk.forEach(r => console.log(`  ${r.name}: ${r.id || 'sin ID'}`));
  }

  if (createFail.length > 0) {
    console.log('\nCREATE fallidas:');
    createFail.forEach(r => console.log(`  ${r.name}: ${JSON.stringify(r.error).substring(0, 150)}`));
  }

  if (deleteFail.length > 0) {
    console.log('\nDELETE fallidas:');
    deleteFail.forEach(r => console.log(`  ${r.name}: ${JSON.stringify(r.error).substring(0, 150)}`));
  }
}

main().catch(console.error);
