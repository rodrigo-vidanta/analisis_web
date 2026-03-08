/**
 * Script para crear 7 plantillas de "Actualización de Número" en WhatsApp
 * Llama directamente al webhook N8N (misma ruta que el edge function proxy)
 *
 * Uso: node scripts/create-number-update-templates.cjs
 */

const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates';
const AUTH_TOKEN = '4ydoA3HgTwWI5lSolmZW8VYqjpazPPap5M6a0EHLccHyXvOgv82evBMzMGj5sYVF';
const TEMPLATE_GROUP_ID = '6e84976c-c70b-4917-bea9-3f1bcf5d29cb';

const TAGS = ['actualizacion_numero', 'utility', 'cambio_whatsapp'];

const templates = [
  {
    name: 'act_numero_pregunta_idioma',
    description: 'Pregunta obvia irresistible - ¿prefiere español? (reply rate alto)',
    body: 'Vidanta le saluda. Actualizamos nuestro WhatsApp para brindarle mejor atención desde este número. Por favor guárdelo en sus contactos. Una consulta rápida: ¿prefiere que le atendamos en español?',
  },
  {
    name: 'act_numero_eleccion_canal',
    description: 'Elección falsa - WhatsApp o llamada (ambas = sí)',
    body: 'Buen día, le contactamos de Vidanta. Nuestro número de WhatsApp se actualizó. Guarde este contacto para seguir comunicados. ¿Prefiere que le contactemos por WhatsApp o por llamada telefónica?',
  },
  {
    name: 'act_numero_validacion_contacto',
    description: 'Validación de identidad - confirmar número principal',
    body: 'Vidanta le saluda. Hemos cambiado nuestro número de WhatsApp y estamos actualizando nuestros registros. Para confirmar, ¿este número sigue siendo su contacto principal?',
  },
  {
    name: 'act_numero_fecha_vacaciones',
    description: 'Zeigarnik + vacaciones - activa dopamina aspiracional',
    body: 'Vidanta le saluda. Cambiamos nuestro WhatsApp para mejorar nuestro servicio. Guarde este número en sus contactos. Por cierto, ¿ya tiene pensada la fecha de sus próximas vacaciones?',
  },
  {
    name: 'act_numero_saludo_cortesia',
    description: 'Cortesía cultural mexicana - ¿cómo ha estado?',
    body: 'Buen día, le escribimos de Vidanta. Nuestro WhatsApp se actualizó y le contactamos para que tenga nuestro número correcto. Estamos para servirle en lo que necesite. ¿Cómo ha estado? Esperamos que muy bien.',
  },
  {
    name: 'act_numero_preferencia_contacto',
    description: 'Completar patrón - ¿escribirnos o que le contactemos?',
    body: 'Este es un mensaje de Vidanta. Hemos actualizado nuestro número de WhatsApp. Para su comodidad, guarde este contacto. Una pregunta breve: cuando necesita atención, ¿prefiere escribirnos o que nosotros le contactemos?',
  },
  {
    name: 'act_numero_confirmacion_recibido',
    description: 'Confirmar hecho - fricción cero absoluto',
    body: 'Buen día, le contactamos de Vidanta. A partir de hoy nuestro WhatsApp es este número. Guárdelo para cualquier consulta o solicitud futura. ¿Recibió bien este mensaje?',
  },
];

async function createTemplate(template, index) {
  const payload = {
    name: template.name,
    language: 'es_MX',
    category: 'UTILITY',
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

  console.log(`\n[${index + 1}/7] Creando: ${template.name}`);
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
  console.log('CREACIÓN MASIVA DE PLANTILLAS - Actualización de Número');
  console.log('='.repeat(60));
  console.log(`Webhook: ${WEBHOOK_URL}`);
  console.log(`Grupo: ${TEMPLATE_GROUP_ID}`);
  console.log(`Tags: ${TAGS.join(', ')}`);
  console.log(`Total: ${templates.length} plantillas`);

  const results = [];

  for (let i = 0; i < templates.length; i++) {
    const result = await createTemplate(templates[i], i);
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
    console.log('\nIDs creados (para actualizar tags y grupo en BD):');
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

  // Output JSON para post-procesamiento
  console.log('\n--- JSON RESULTS ---');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
