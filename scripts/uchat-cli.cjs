#!/usr/bin/env node

/**
 * UChat CLI v2.0.0 - PQNC QA AI Platform
 * Administracion completa de UChat via API
 *
 * Uso: node scripts/uchat-cli.cjs <command> [options]
 *
 * ═══════════════════════════════════════════════════════
 * COMANDOS DE LECTURA (sin restricciones)
 * ═══════════════════════════════════════════════════════
 *
 * Conexion:
 *   test                                    - Verificar conexion API
 *
 * Bot Fields:
 *   bot-fields [--limit N] [--page N]       - Listar bot fields
 *   bot-field <name>                        - Buscar bot field por nombre
 *
 * Subscribers:
 *   subscribers [--limit N] [--page N]      - Listar subscribers
 *   subscriber <user_ns>                    - Info completa de subscriber
 *   subscriber-by-id <user_id>             - Buscar por channel user ID
 *   search-subscriber --phone|--email|--name <value>  - Buscar subscriber
 *
 * Subflows:
 *   subflows [--limit N]                    - Listar subflows del bot
 *
 * Bot Stats:
 *   bot-users-count                         - Conteo de usuarios por status
 *   inbound-webhooks                        - Listar inbound webhooks
 *
 * Chat History:
 *   chat-messages <user_ns> [--limit N]    - Historial de mensajes
 *
 * Segments:
 *   segments [--limit N]                    - Listar segmentos
 *
 * Custom Events:
 *   events [--limit N]                      - Listar custom events
 *   event-summary <event_ns> [--range X]   - Resumen de evento
 *   event-data <event_ns> [--limit N]      - Datos de evento
 *
 * Conversations:
 *   conversations [--limit N]               - Conversaciones cerradas
 *   activity-log [--limit N]                - Log de actividad de agentes
 *
 * Debug:
 *   debug-user <user_ns>                    - Debug completo de usuario
 *   debug-error <user_ns>                   - Debug de errores de usuario
 *   debug-webhooks                          - Verificar config webhooks
 *   debug-triggers                          - Analizar triggers y keywords
 *
 * ═══════════════════════════════════════════════════════
 * COMANDOS DE ESCRITURA (requieren autorizacion)
 * ═══════════════════════════════════════════════════════
 *
 * Mensajes:
 *   send-text <user_ns> <texto>             - Enviar texto a subscriber
 *   send-subflow <user_ns> <sub_flow_ns>   - Ejecutar subflow en subscriber
 *   send-content <user_ns> <json_data>      - Enviar contenido rich
 *   send-node <user_ns> <node_ns>           - Enviar nodo especifico
 *
 * Bot Control:
 *   pause-bot <user_ns> <minutes>           - Pausar bot para subscriber
 *   resume-bot <user_ns>                    - Reanudar bot para subscriber
 *   assign-agent <user_ns> <agent_id>       - Asignar agente live
 *   move-chat <user_ns> <status>            - Mover chat (open/done/pending)
 *   app-trigger <user_ns> <trigger_name>    - Disparar app trigger
 *
 * Subscribers:
 *   subscriber-create --phone <num> [--email <email>] [--name <name>]
 *   subscriber-update <user_ns> --field=value
 *   subscriber-delete <user_ns> --confirm
 *
 * Tags:
 *   tag-add <user_ns> <tag_name>            - Agregar tag
 *   tag-remove <user_ns> <tag_name>         - Quitar tag
 *   tags-add <user_ns> <tag1,tag2,...>      - Agregar multiples tags
 *   tags-remove <user_ns> <tag1,tag2,...>   - Quitar multiples tags
 *
 * Labels:
 *   label-add <user_ns> <label_name>        - Agregar label
 *   label-remove <user_ns> <label_name>     - Quitar label
 *
 * User Fields:
 *   field-set <user_ns> <field_name> <value>     - Establecer campo
 *   field-clear <user_ns> <field_name>           - Limpiar campo
 *   fields-set <user_ns> <name=val,name=val>     - Establecer multiples
 *
 * Bot Fields:
 *   bot-field-set <name> <value>            - Establecer bot field
 *   bot-field-create <name> [--type text]   - Crear bot field
 *   bot-field-delete <name> --confirm       - Eliminar bot field
 *
 * ═══════════════════════════════════════════════════════
 * FLAGS GLOBALES
 * ═══════════════════════════════════════════════════════
 *   --json          Salida JSON (para integracion con Claude Code)
 *   --confirm       Confirmar operaciones destructivas
 *   --verbose       Salida detallada
 */

const BASE_URL = 'https://www.uchat.com.au/api';

// ─────────────────────────────────────────────────────
// Configuracion
// ─────────────────────────────────────────────────────

function getApiKey() {
  const key = process.env.UCHAT_API_KEY;
  if (!key) {
    console.error('ERROR: UCHAT_API_KEY no configurada.');
    console.error('Ejecuta: echo \'export UCHAT_API_KEY="tu_key"\' >> ~/.zshrc && source ~/.zshrc');
    process.exit(1);
  }
  return key;
}

function parseArgs(args) {
  const parsed = { _: [], flags: {} };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (key.includes('=')) {
        const [k, ...v] = key.split('=');
        parsed.flags[k] = v.join('=');
      } else if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        parsed.flags[key] = args[i + 1];
        i++;
      } else {
        parsed.flags[key] = true;
      }
    } else {
      parsed._.push(arg);
    }
    i++;
  }
  return parsed;
}

// ─────────────────────────────────────────────────────
// HTTP Client
// ─────────────────────────────────────────────────────

class UchatAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async get(path, params = {}) {
    const url = new URL(`${BASE_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GET ${path} failed (${response.status}): ${text}`);
    }

    return response.json();
  }

  async post(path, body = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`POST ${path} failed (${response.status}): ${text}`);
    }

    return response.json();
  }

  async put(path, body = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`PUT ${path} failed (${response.status}): ${text}`);
    }

    return response.json();
  }

  async delete(path, body = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: this.headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DELETE ${path} failed (${response.status}): ${text}`);
    }

    return response.json();
  }
}

// ─────────────────────────────────────────────────────
// UChat CLI
// ─────────────────────────────────────────────────────

class UchatCLI {
  constructor() {
    this.api = new UchatAPI(getApiKey());
    this.jsonMode = false;
    this.verbose = false;
  }

  // ═══════════════════════════════════════════════════
  // Formateo
  // ═══════════════════════════════════════════════════

  outputJson(data) {
    console.log(JSON.stringify(data, null, 2));
  }

  printHeader(title) {
    if (this.jsonMode) return;
    const line = '═'.repeat(60);
    console.log(`\n${line}`);
    console.log(`  ${title}`);
    console.log(`${line}`);
  }

  printSection(title) {
    if (this.jsonMode) return;
    console.log(`\n─── ${title} ${'─'.repeat(Math.max(0, 55 - title.length))}`);
  }

  printField(label, value, indent = 2) {
    if (this.jsonMode) return;
    const pad = ' '.repeat(indent);
    console.log(`${pad}${label}: ${value ?? '(vacio)'}`);
  }

  printSuccess(msg) {
    if (this.jsonMode) return;
    console.log(`\n  OK  ${msg}`);
  }

  printError(msg) {
    if (this.jsonMode) return;
    console.error(`\n  ERROR  ${msg}`);
  }

  printWarning(msg) {
    if (this.jsonMode) return;
    console.log(`\n  WARN  ${msg}`);
  }

  // ═══════════════════════════════════════════════════
  // Conexion
  // ═══════════════════════════════════════════════════

  async testConnection() {
    try {
      const result = await this.api.get('/flow/bot-fields', { limit: 1 });
      const data = {
        status: 'connected',
        botFields: result.meta?.total ?? 0,
        message: 'Conexion exitosa a UChat API'
      };

      if (this.jsonMode) return this.outputJson(data);

      this.printHeader('UChat API - Test de Conexion');
      this.printField('Estado', 'Conectado');
      this.printField('Bot Fields', data.botFields);
      this.printSuccess('Conexion exitosa');
    } catch (err) {
      if (this.jsonMode) return this.outputJson({ status: 'error', error: err.message });
      this.printError(`Conexion fallida: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════
  // Bot Fields
  // ═══════════════════════════════════════════════════

  async listBotFields(flags = {}) {
    const result = await this.api.get('/flow/bot-fields', {
      limit: flags.limit || 50,
      page: flags.page || 1,
      name: flags.name
    });

    if (this.jsonMode) return this.outputJson(result);

    this.printHeader('Bot Fields');
    this.printField('Total', result.meta?.total);
    this.printField('Pagina', `${result.meta?.current_page}/${result.meta?.last_page}`);

    if (result.data?.length) {
      this.printSection('Campos');
      for (const field of result.data) {
        console.log(`  [${field.var_type}] ${field.name}`);
        console.log(`    ns: ${field.var_ns}`);
        console.log(`    valor: ${field.value || '(vacio)'}`);
        if (field.description) console.log(`    desc: ${field.description}`);
        console.log('');
      }
    }
  }

  async getBotField(name) {
    const result = await this.api.get('/flow/bot-fields', { name, limit: 50 });

    if (this.jsonMode) return this.outputJson(result);

    this.printHeader(`Bot Field: ${name}`);
    if (result.data?.length) {
      for (const field of result.data) {
        this.printField('Nombre', field.name);
        this.printField('Namespace', field.var_ns);
        this.printField('Tipo', field.var_type);
        this.printField('Valor', field.value);
        this.printField('Template', field.is_template_field ? 'Si' : 'No');
      }
    } else {
      this.printWarning(`No se encontro bot field: ${name}`);
    }
  }

  async setBotField(name, value) {
    const result = await this.api.put('/flow/set-bot-field-by-name', { name, value });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Bot field "${name}" actualizado a: ${value}`);
  }

  async createBotField(name, flags = {}) {
    const body = {
      name,
      var_type: flags.type || 'text',
      description: flags.description || '',
      value: flags.value || ''
    };
    const result = await this.api.post('/flow/create-bot-field', body);
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Bot field "${name}" creado (tipo: ${body.var_type})`);
  }

  async deleteBotField(name, confirmed) {
    if (!confirmed) {
      this.printError('Operacion destructiva. Usa --confirm para confirmar.');
      return;
    }
    const result = await this.api.delete('/flow/delete-bot-field-by-name', { name });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Bot field "${name}" eliminado`);
  }

  // ═══════════════════════════════════════════════════
  // Subscribers
  // ═══════════════════════════════════════════════════

  async listSubscribers(flags = {}) {
    const params = {
      limit: flags.limit || 20,
      page: flags.page || 1
    };

    // Filtros opcionales
    if (flags.phone) params.phone = flags.phone;
    if (flags.email) params.email = flags.email;
    if (flags.name) params.name = flags.name;
    if (flags.tag_ns) params.tag_ns = flags.tag_ns;
    if (flags.label_id) params.label_id = flags.label_id;
    if (flags.is_channel !== undefined) params.is_channel = flags.is_channel;
    if (flags['24h'] === true) params.is_interacted_in_last_24h = true;

    const result = await this.api.get('/subscribers', params);

    if (this.jsonMode) return this.outputJson(result);

    this.printHeader('Subscribers');
    this.printField('Total', result.meta?.total);
    this.printField('Pagina', `${result.meta?.current_page}/${result.meta?.last_page}`);

    if (result.data?.length) {
      this.printSection('Lista');
      for (const sub of result.data) {
        const name = sub.name || `${sub.first_name || ''} ${sub.last_name || ''}`.trim() || '(sin nombre)';
        const phone = sub.phone || '(sin telefono)';
        const channels = (sub.channels || []).map(c => c.type).join(', ') || 'ninguno';
        console.log(`  ${name} | ${phone} | ns:${sub.user_ns}`);
        console.log(`    Canales: ${channels} | Creado: ${sub.created_at || 'N/A'}`);
        console.log('');
      }
    }
  }

  async getSubscriber(userNs) {
    const result = await this.api.get('/subscriber/get-info', { user_ns: userNs });

    if (this.jsonMode) return this.outputJson(result);

    this.printHeader(`Subscriber: ${userNs}`);

    if (result.data) {
      const sub = result.data;
      this.printSection('Informacion Basica');
      this.printField('Nombre', sub.name || `${sub.first_name || ''} ${sub.last_name || ''}`.trim());
      this.printField('Namespace', sub.user_ns);
      this.printField('Telefono', sub.phone);
      this.printField('Email', sub.email);
      this.printField('Genero', sub.gender);
      this.printField('Creado', sub.created_at);
      this.printField('Ultimo mensaje', sub.last_interaction_at);

      if (sub.channels?.length) {
        this.printSection('Canales');
        for (const ch of sub.channels) {
          console.log(`  [${ch.type}] ID: ${ch.user_id} | Channel: ${ch.channel_id}`);
        }
      }

      if (sub.tags?.length) {
        this.printSection('Tags');
        for (const tag of sub.tags) {
          console.log(`  - ${tag.name} (${tag.tag_ns})`);
        }
      }

      if (sub.user_fields?.length) {
        this.printSection('User Fields');
        for (const field of sub.user_fields) {
          if (field.value) {
            console.log(`  ${field.name}: ${field.value}`);
          }
        }
      }

      if (sub.labels?.length) {
        this.printSection('Labels');
        for (const label of sub.labels) {
          console.log(`  - ${label.name}`);
        }
      }
    }
  }

  async getSubscriberById(userId) {
    const result = await this.api.get('/subscriber/get-info-by-user-id', { user_id: userId });
    if (this.jsonMode) return this.outputJson(result);

    if (result.data) {
      this.printHeader(`Subscriber por User ID: ${userId}`);
      await this._printSubscriberSummary(result.data);
    } else {
      this.printWarning(`No se encontro subscriber con user_id: ${userId}`);
    }
  }

  async searchSubscriber(flags) {
    const params = { limit: flags.limit || 20, page: flags.page || 1 };
    if (flags.phone) params.phone = flags.phone;
    if (flags.email) params.email = flags.email;
    if (flags.name) params.name = flags.name;
    if (flags.user_field_ns) {
      params.user_field_ns = flags.user_field_ns;
      params.user_field_value = flags.user_field_value || '';
    }

    const result = await this.api.get('/subscribers', params);

    if (this.jsonMode) return this.outputJson(result);

    this.printHeader(`Busqueda de Subscribers`);
    this.printField('Criterios', JSON.stringify(flags));
    this.printField('Resultados', result.meta?.total || 0);

    if (result.data?.length) {
      for (const sub of result.data) {
        await this._printSubscriberSummary(sub);
        console.log('');
      }
    }
  }

  async createSubscriber(flags) {
    if (!flags.phone && !flags.email) {
      this.printError('Se requiere --phone o --email para crear subscriber');
      return;
    }

    const body = {};
    if (flags.phone) body.phone = flags.phone;
    if (flags.email) body.email = flags.email;
    if (flags.name) body.name = flags.name;
    if (flags.first_name) body.first_name = flags.first_name;
    if (flags.last_name) body.last_name = flags.last_name;
    if (flags.gender) body.gender = flags.gender;

    const result = await this.api.post('/subscriber/create', body);
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Subscriber creado: ${result.data?.user_ns || 'OK'}`);
  }

  async updateSubscriber(userNs, flags) {
    const body = { user_ns: userNs };
    const validFields = ['first_name', 'last_name', 'name', 'phone', 'email', 'gender', 'image'];
    for (const f of validFields) {
      if (flags[f]) body[f] = flags[f];
    }

    const result = await this.api.put('/subscriber/update', body);
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Subscriber ${userNs} actualizado`);
  }

  async deleteSubscriber(userNs, confirmed) {
    if (!confirmed) {
      this.printError('Operacion destructiva. Usa --confirm para confirmar.');
      return;
    }
    const result = await this.api.delete('/subscriber/delete', { user_ns: userNs });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Subscriber ${userNs} eliminado`);
  }

  async _printSubscriberSummary(sub) {
    const name = sub.name || `${sub.first_name || ''} ${sub.last_name || ''}`.trim() || '(sin nombre)';
    this.printField('Nombre', name);
    this.printField('NS', sub.user_ns);
    this.printField('Telefono', sub.phone);
    this.printField('Email', sub.email);
    this.printField('Canales', (sub.channels || []).map(c => `${c.type}:${c.user_id}`).join(', '));
  }

  // ═══════════════════════════════════════════════════
  // Tags
  // ═══════════════════════════════════════════════════

  async addTag(userNs, tagName) {
    const result = await this.api.post('/subscriber/add-tag-by-name', {
      user_ns: userNs,
      tag_name: tagName
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Tag "${tagName}" agregado a ${userNs}`);
  }

  async removeTag(userNs, tagName) {
    const result = await this.api.delete('/subscriber/remove-tag-by-name', {
      user_ns: userNs,
      tag_name: tagName
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Tag "${tagName}" removido de ${userNs}`);
  }

  async addTags(userNs, tagNames) {
    const data = tagNames.split(',').map(t => ({ tag_name: t.trim() }));
    const result = await this.api.post('/subscriber/add-tags-by-name', {
      user_ns: userNs,
      data
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`${data.length} tags agregados a ${userNs}`);
  }

  async removeTags(userNs, tagNames) {
    const data = tagNames.split(',').map(t => ({ tag_name: t.trim() }));
    const result = await this.api.delete('/subscriber/remove-tags-by-name', {
      user_ns: userNs,
      data
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`${data.length} tags removidos de ${userNs}`);
  }

  // ═══════════════════════════════════════════════════
  // Labels
  // ═══════════════════════════════════════════════════

  async addLabels(userNs, labelNames) {
    const data = labelNames.split(',').map(l => ({ label_name: l.trim() }));
    const result = await this.api.post('/subscriber/add-labels-by-name', {
      user_ns: userNs,
      data
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Labels agregados a ${userNs}: ${labelNames}`);
  }

  async removeLabels(userNs, labelNames) {
    const data = labelNames.split(',').map(l => ({ label_name: l.trim() }));
    const result = await this.api.delete('/subscriber/remove-labels-by-name', {
      user_ns: userNs,
      data
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Labels removidos de ${userNs}: ${labelNames}`);
  }

  // ═══════════════════════════════════════════════════
  // User Fields
  // ═══════════════════════════════════════════════════

  async setUserField(userNs, fieldName, value) {
    const result = await this.api.put('/subscriber/set-user-field-by-name', {
      user_ns: userNs,
      field_name: fieldName,
      value
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Campo "${fieldName}" = "${value}" para ${userNs}`);
  }

  async clearUserField(userNs, fieldName) {
    // Need to get the var_ns first by looking up the subscriber
    const subInfo = await this.api.get('/subscriber/get-info', { user_ns: userNs });
    const field = subInfo.data?.user_fields?.find(f => f.name === fieldName);
    if (!field) {
      this.printError(`Campo "${fieldName}" no encontrado en subscriber ${userNs}`);
      return;
    }
    const result = await this.api.delete('/subscriber/clear-user-field', {
      user_ns: userNs,
      var_ns: field.var_ns
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Campo "${fieldName}" limpiado para ${userNs}`);
  }

  async setUserFields(userNs, fieldsStr) {
    const data = fieldsStr.split(',').map(pair => {
      const [name, ...valParts] = pair.split('=');
      return { name: name.trim(), value: valParts.join('=').trim() };
    });
    const result = await this.api.put('/subscriber/set-user-fields-by-name', {
      user_ns: userNs,
      data
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`${data.length} campos actualizados para ${userNs}`);
  }

  // ═══════════════════════════════════════════════════
  // Segments
  // ═══════════════════════════════════════════════════

  async listSegments(flags = {}) {
    const result = await this.api.get('/flow/segments', {
      limit: flags.limit || 50,
      page: flags.page || 1,
      name: flags.name
    });

    if (this.jsonMode) return this.outputJson(result);

    this.printHeader('Segments');
    this.printField('Total', result.meta?.total);

    if (result.data?.length) {
      for (const seg of result.data) {
        console.log(`  ${seg.name} (${seg.segment_ns})`);
        if (seg.description) console.log(`    ${seg.description}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════
  // Custom Events
  // ═══════════════════════════════════════════════════

  async listEvents(flags = {}) {
    const result = await this.api.get('/flow/custom-events', {
      limit: flags.limit || 50,
      page: flags.page || 1,
      name: flags.name
    });

    if (this.jsonMode) return this.outputJson(result);

    this.printHeader('Custom Events');
    this.printField('Total', result.meta?.total);

    if (result.data?.length) {
      for (const evt of result.data) {
        console.log(`  ${evt.name} (${evt.event_ns})`);
        if (evt.description) console.log(`    ${evt.description}`);
      }
    }
  }

  async getEventSummary(eventNs, flags = {}) {
    const result = await this.api.get('/flow/custom-events/summary', {
      event_ns: eventNs,
      range: flags.range || 'last_7_days'
    });

    if (this.jsonMode) return this.outputJson(result);

    this.printHeader(`Event Summary: ${eventNs}`);
    if (result.data) {
      const d = result.data;
      this.printField('Nombre', d.name);
      this.printField('Total', d.total);
      if (d.stats?.length) {
        this.printSection('Estadisticas');
        for (const s of d.stats) {
          console.log(`  ${s.date}: ${s.count}`);
        }
      }
      if (d.text_values?.length) {
        this.printSection('Valores');
        for (const tv of d.text_values.slice(0, 20)) {
          console.log(`  ${tv.value}: ${tv.count}`);
        }
      }
    }
  }

  async getEventData(eventNs, flags = {}) {
    const result = await this.api.get('/flow/custom-events/data', {
      event_ns: eventNs,
      limit: flags.limit || 50,
      start_time: flags.start_time,
      end_time: flags.end_time,
      start_id: flags.start_id
    });

    if (this.jsonMode) return this.outputJson(result);

    this.printHeader(`Event Data: ${eventNs}`);

    if (result.data?.length) {
      for (const record of result.data) {
        console.log(`  [${record.created_at}] user:${record.user_ns} = ${record.value || '(sin valor)'}`);
      }
      this.printField('\nRegistros mostrados', result.data.length);
    }
  }

  // ═══════════════════════════════════════════════════
  // Conversations
  // ═══════════════════════════════════════════════════

  async listConversations(flags = {}) {
    const result = await this.api.get('/flow/conversations/data', {
      limit: flags.limit || 20,
      start_time: flags.start_time,
      end_time: flags.end_time,
      start_id: flags.start_id,
      user_ns: flags.user_ns
    });

    if (this.jsonMode) return this.outputJson(result);

    this.printHeader('Conversaciones Cerradas');

    if (result.data?.length) {
      for (const conv of result.data) {
        console.log(`  [${conv.closed_at || conv.created_at}] ${conv.user_ns}`);
        if (conv.agent_name) console.log(`    Agente: ${conv.agent_name}`);
        if (conv.tags?.length) console.log(`    Tags: ${conv.tags.join(', ')}`);
        console.log('');
      }
      this.printField('Registros', result.data.length);
    } else {
      this.printWarning('No se encontraron conversaciones');
    }
  }

  async getActivityLog(flags = {}) {
    const result = await this.api.get('/flow/agent-activity-log/data', {
      limit: flags.limit || 50,
      user_ns: flags.user_ns,
      agent_id: flags.agent_id,
      action: flags.action,
      start_time: flags.start_time,
      end_time: flags.end_time
    });

    if (this.jsonMode) return this.outputJson(result);

    this.printHeader('Agent Activity Log');

    if (result.data?.length) {
      for (const log of result.data) {
        console.log(`  [${log.created_at}] ${log.action} | agent:${log.agent_id || 'N/A'} | user:${log.user_ns || 'N/A'}`);
        if (log.details) console.log(`    ${JSON.stringify(log.details)}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════
  // Subflows
  // ═══════════════════════════════════════════════════

  async listSubflows(flags = {}) {
    const result = await this.api.get('/flow/subflows', {
      limit: flags.limit || 50,
      page: flags.page || 1,
      name: flags.name
    });

    if (this.jsonMode) return this.outputJson(result);

    this.printHeader('Subflows');
    this.printField('Total', result.meta?.total);

    if (result.data?.length) {
      for (const sf of result.data) {
        console.log(`  ${sf.name} (${sf.sub_flow_ns})`);
      }
    }
  }

  // ═══════════════════════════════════════════════════
  // Bot Stats
  // ═══════════════════════════════════════════════════

  async getBotUsersCount() {
    const result = await this.api.get('/flow/bot-users-count');

    if (this.jsonMode) return this.outputJson(result);

    this.printHeader('Bot Users Count');
    if (result.data?.length) {
      let total = 0;
      for (const item of result.data) {
        this.printField(item.status, item.num);
        total += item.num;
      }
      this.printField('Total', total);
    }
  }

  async listInboundWebhooks(flags = {}) {
    const result = await this.api.get('/flow/inbound-webhooks', {
      limit: flags.limit || 50,
      page: flags.page || 1
    });

    if (this.jsonMode) return this.outputJson(result);

    this.printHeader('Inbound Webhooks');
    this.printField('Total', result.meta?.total);

    if (result.data?.length) {
      for (const wh of result.data) {
        console.log(`  ${wh.name || wh.url || 'unnamed'} (${wh.webhook_ns || 'N/A'})`);
        if (wh.url) console.log(`    URL: ${wh.url}`);
      }
    } else {
      console.log('  (ninguno configurado)');
    }
  }

  // ═══════════════════════════════════════════════════
  // Chat Messages
  // ═══════════════════════════════════════════════════

  async getChatMessages(userNs, flags = {}) {
    const result = await this.api.get('/subscriber/chat-messages', {
      user_ns: userNs,
      limit: flags.limit || 20,
      start_id: flags.start_id
    });

    if (this.jsonMode) return this.outputJson(result);

    this.printHeader(`Chat Messages: ${userNs}`);

    if (result.data?.length) {
      for (const msg of result.data) {
        const dir = msg.type === 'in' ? '<-' : '->';
        const time = msg.ts ? new Date(msg.ts * 1000).toLocaleString() : 'N/A';
        const content = msg.content || msg.payload?.text || `[${msg.msg_type}]`;
        const truncated = content.length > 200 ? content.substring(0, 200) + '...' : content;
        console.log(`  ${dir} [${time}] (${msg.msg_type}) ${truncated}`);
        if (msg.agent_id) console.log(`     agent_id: ${msg.agent_id}`);
      }
      this.printField('\nMensajes', result.data.length);
    } else {
      console.log('  (sin mensajes)');
    }
  }

  // ═══════════════════════════════════════════════════
  // Send Messages (ESCRITURA)
  // ═══════════════════════════════════════════════════

  async sendText(userNs, content) {
    const result = await this.api.post('/subscriber/send-text', {
      user_ns: userNs,
      content
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Texto enviado a ${userNs}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
  }

  async sendSubflow(userNs, subFlowNs) {
    const result = await this.api.post('/subscriber/send-sub-flow', {
      user_ns: userNs,
      sub_flow_ns: subFlowNs
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Subflow ${subFlowNs} ejecutado para ${userNs}`);
  }

  async sendContent(userNs, dataStr) {
    let data;
    try {
      data = JSON.parse(dataStr);
    } catch {
      this.printError('El parametro data debe ser JSON valido');
      return;
    }
    const result = await this.api.post('/subscriber/send-content', {
      user_ns: userNs,
      data
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Contenido enviado a ${userNs}`);
  }

  async sendNode(userNs, nodeNs) {
    const result = await this.api.post('/subscriber/send-node', {
      user_ns: userNs,
      node_ns: nodeNs
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Nodo ${nodeNs} enviado a ${userNs}`);
  }

  // ═══════════════════════════════════════════════════
  // Bot Control (ESCRITURA)
  // ═══════════════════════════════════════════════════

  async pauseBot(userNs, minutes) {
    const result = await this.api.post('/subscriber/pause-bot', {
      user_ns: userNs,
      minutes: parseInt(minutes, 10)
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Bot pausado ${minutes} minutos para ${userNs}`);
  }

  async resumeBot(userNs) {
    const result = await this.api.post('/subscriber/resume-bot', {
      user_ns: userNs
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Bot reanudado para ${userNs}`);
  }

  async assignAgent(userNs, agentId) {
    const result = await this.api.post('/subscriber/assign-agent', {
      user_ns: userNs,
      agent_id: parseInt(agentId, 10)
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Agente ${agentId} asignado a ${userNs}`);
  }

  async moveChatTo(userNs, status) {
    const result = await this.api.post('/subscriber/move-chat-to', {
      user_ns: userNs,
      status
    });
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`Chat de ${userNs} movido a: ${status}`);
  }

  async appTrigger(userNs, triggerName, flags = {}) {
    const body = {
      user_ns: userNs,
      trigger_name: triggerName
    };
    if (flags.data) {
      try {
        body.data = JSON.parse(flags.data);
      } catch {
        this.printError('--data debe ser JSON valido');
        return;
      }
    }
    const result = await this.api.post('/subscriber/app-trigger', body);
    if (this.jsonMode) return this.outputJson(result);
    this.printSuccess(`App trigger "${triggerName}" disparado para ${userNs}`);
  }

  // ═══════════════════════════════════════════════════
  // Debug Commands
  // ═══════════════════════════════════════════════════

  async debugUser(userNs) {
    this.printHeader(`DEBUG COMPLETO: ${userNs}`);

    try {
      const result = await this.api.get('/subscriber/get-info', { user_ns: userNs });

      if (!result.data) {
        this.printError(`Subscriber ${userNs} no encontrado`);

        // Intentar buscar como user_id
        this.printSection('Intentando buscar como user_id...');
        try {
          const byId = await this.api.get('/subscriber/get-info-by-user-id', { user_id: userNs });
          if (byId.data) {
            this.printSuccess(`Encontrado como user_id. Namespace real: ${byId.data.user_ns}`);
            return this.debugUser(byId.data.user_ns);
          }
        } catch {
          this.printWarning('Tampoco encontrado como user_id');
        }
        return;
      }

      const sub = result.data;

      if (this.jsonMode) return this.outputJson(sub);

      // Info basica
      this.printSection('Informacion Basica');
      this.printField('Nombre', sub.name || `${sub.first_name || ''} ${sub.last_name || ''}`.trim());
      this.printField('NS', sub.user_ns);
      this.printField('Telefono', sub.phone);
      this.printField('Email', sub.email);
      this.printField('Genero', sub.gender);
      this.printField('Creado', sub.created_at);
      this.printField('Ultima interaccion', sub.last_interaction_at);
      this.printField('Bot interaccion 24h', sub.is_bot_interacted_in_last_24h);
      this.printField('Ultimo mensaje 24h', sub.is_last_message_in_last_24h);

      // Canales
      if (sub.channels?.length) {
        this.printSection(`Canales (${sub.channels.length})`);
        for (const ch of sub.channels) {
          console.log(`  [${ch.type}] user_id: ${ch.user_id}`);
          console.log(`    channel_id: ${ch.channel_id}`);
          console.log(`    subscribed: ${ch.subscribed_at || 'N/A'}`);
          console.log('');
        }
      }

      // Tags
      if (sub.tags?.length) {
        this.printSection(`Tags (${sub.tags.length})`);
        for (const tag of sub.tags) {
          console.log(`  - ${tag.name} (${tag.tag_ns})`);
        }
      } else {
        this.printSection('Tags');
        console.log('  (sin tags)');
      }

      // User Fields
      const fieldsWithValue = (sub.user_fields || []).filter(f => f.value);
      this.printSection(`User Fields (${fieldsWithValue.length} con valor)`);
      for (const field of fieldsWithValue) {
        const val = field.value.length > 100 ? field.value.substring(0, 100) + '...' : field.value;
        console.log(`  ${field.name}: ${val}`);
      }

      // Fields sin valor (verbose)
      if (this.verbose) {
        const fieldsEmpty = (sub.user_fields || []).filter(f => !f.value);
        if (fieldsEmpty.length) {
          this.printSection(`User Fields vacios (${fieldsEmpty.length})`);
          for (const field of fieldsEmpty) {
            console.log(`  ${field.name} [${field.var_type}] (${field.var_ns})`);
          }
        }
      }

      // Labels
      if (sub.labels?.length) {
        this.printSection(`Labels (${sub.labels.length})`);
        for (const label of sub.labels) {
          console.log(`  - ${label.name}`);
        }
      }

      // Resumen de actividad
      this.printSection('Resumen');
      console.log(`  Canales: ${sub.channels?.length || 0}`);
      console.log(`  Tags: ${sub.tags?.length || 0}`);
      console.log(`  Fields con valor: ${fieldsWithValue.length}`);
      console.log(`  Labels: ${sub.labels?.length || 0}`);

    } catch (err) {
      this.printError(`Error debuggeando usuario: ${err.message}`);
    }
  }

  async debugError(userNs) {
    this.printHeader(`DEBUG ERRORES: ${userNs}`);

    try {
      const result = await this.api.get('/subscriber/get-info', { user_ns: userNs });

      if (!result.data) {
        // Intentar como user_id
        try {
          const byId = await this.api.get('/subscriber/get-info-by-user-id', { user_id: userNs });
          if (byId.data) {
            return this.debugError(byId.data.user_ns);
          }
        } catch {
          // ignore
        }
        this.printError(`Subscriber no encontrado: ${userNs}`);
        return;
      }

      const sub = result.data;

      if (this.jsonMode) return this.outputJson({
        user: { name: sub.name, ns: sub.user_ns, phone: sub.phone },
        errorFields: (sub.user_fields || []).filter(f =>
          f.name?.toLowerCase().includes('error') && f.value
        ),
        allFields: (sub.user_fields || []).filter(f => f.value)
      });

      this.printSection('Usuario');
      this.printField('Nombre', sub.name || sub.first_name);
      this.printField('NS', sub.user_ns);
      this.printField('Telefono', sub.phone);

      // Buscar campos de error
      const errorFields = (sub.user_fields || []).filter(f =>
        f.name?.toLowerCase().includes('error') ||
        f.name?.toLowerCase().includes('log') ||
        f.name?.toLowerCase().includes('webhook') ||
        f.name?.toLowerCase().includes('metadata')
      );

      this.printSection('Campos Relacionados a Errores');
      if (errorFields.length) {
        for (const f of errorFields) {
          console.log(`  ${f.name}: ${f.value || '(vacio)'}`);
        }
      } else {
        console.log('  No se encontraron campos de error');
      }

      // Campos con valor (para contexto)
      const allFields = (sub.user_fields || []).filter(f => f.value);
      this.printSection('Todos los campos con valor');
      for (const f of allFields) {
        const val = f.value.length > 150 ? f.value.substring(0, 150) + '...' : f.value;
        console.log(`  ${f.name}: ${val}`);
      }

      // Tags (pueden indicar estado de error)
      if (sub.tags?.length) {
        this.printSection('Tags del usuario');
        for (const t of sub.tags) {
          console.log(`  - ${t.name}`);
        }
      }

    } catch (err) {
      this.printError(`Error: ${err.message}`);
    }
  }

  async debugWebhooks() {
    this.printHeader('DEBUG WEBHOOKS');

    try {
      // Obtener todos los bot fields para encontrar webhooks
      const result = await this.api.get('/flow/bot-fields', { limit: 50 });

      if (this.jsonMode) return this.outputJson(result);

      const webhookFields = (result.data || []).filter(f =>
        f.name?.toLowerCase().includes('webhook') ||
        f.name?.toLowerCase().includes('url') ||
        f.value?.includes('http')
      );

      this.printSection('Bot Fields con URLs/Webhooks');
      if (webhookFields.length) {
        for (const f of webhookFields) {
          console.log(`  ${f.name}:`);
          console.log(`    Valor: ${f.value}`);
          console.log(`    NS: ${f.var_ns}`);
          console.log('');
        }
      } else {
        console.log('  No se encontraron bot fields con URLs');
      }

      // Verificar conectividad a los webhooks
      this.printSection('Test de Conectividad');
      for (const f of webhookFields) {
        if (f.value?.startsWith('http')) {
          try {
            const resp = await fetch(f.value, {
              method: 'HEAD',
              signal: AbortSignal.timeout(5000)
            });
            console.log(`  ${f.name}: ${resp.status} ${resp.statusText}`);
          } catch (err) {
            console.log(`  ${f.name}: ERROR - ${err.message}`);
          }
        }
      }

      // Verificar Auth
      const authField = (result.data || []).find(f =>
        f.name?.toLowerCase().includes('auth')
      );
      if (authField) {
        this.printSection('Autenticacion N8N');
        console.log(`  Campo: ${authField.name}`);
        console.log(`  Valor: ${authField.value?.substring(0, 20)}...`);
        console.log(`  NS: ${authField.var_ns}`);
      }

    } catch (err) {
      this.printError(`Error: ${err.message}`);
    }
  }

  async debugTriggers() {
    this.printHeader('DEBUG TRIGGERS');

    try {
      // Obtener custom events que pueden representar triggers
      const events = await this.api.get('/flow/custom-events', { limit: 50 });

      if (this.jsonMode) return this.outputJson(events);

      this.printSection('Custom Events (posibles triggers)');
      if (events.data?.length) {
        for (const evt of events.data) {
          console.log(`  ${evt.name} (${evt.event_ns})`);
          if (evt.description) console.log(`    ${evt.description}`);
        }
      } else {
        console.log('  No se encontraron custom events');
      }

      // Obtener bot fields relacionados con errores/logs
      const botFields = await this.api.get('/flow/bot-fields', { limit: 50 });
      const logFields = (botFields.data || []).filter(f =>
        f.name?.toLowerCase().includes('error') ||
        f.name?.toLowerCase().includes('log') ||
        f.name?.toLowerCase().includes('trigger')
      );

      this.printSection('Bot Fields relacionados con errores/logs');
      for (const f of logFields) {
        console.log(`  ${f.name}: ${f.value || '(vacio)'}`);
      }

      // Info sobre el trigger conocido
      this.printSection('Trigger Conocido: error_log_to_db_pqnc_ai');
      console.log('  Tipo: Keyword-based (fire per user/hour)');
      console.log('  Keywords monitoreadas:');
      const keywords = [
        'WhatsApp Error', 'error', 'Error', 'ERROR', 'failed', 'Failed',
        'Message undeliverable', 'Message not sent', 'timeout', 'Timeout',
        'connection error', 'Connection error', 'invalid', 'WhatsApp Error:',
        'not delivered', 'Message Undeliverable', 'Undeliverable', 'undeliverable'
      ];
      for (const kw of keywords) {
        console.log(`    - "${kw}"`);
      }
      console.log('  Accion: Save to user field "Error_Message"');
      console.log('  NOTA: El trigger solo dispara 1 vez/hora por usuario');
      console.log('        Esto puede causar perdida de logs si hay multiples errores');

    } catch (err) {
      this.printError(`Error: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════
  // Bulk/Analysis Commands
  // ═══════════════════════════════════════════════════

  async analyzeErrors(flags = {}) {
    this.printHeader('ANALISIS DE ERRORES');

    try {
      // Buscar subscribers que tengan el campo Error_Message con valor
      const allSubs = [];
      let page = 1;
      const maxPages = flags.pages || 5;

      this.printSection('Buscando subscribers con errores...');

      while (page <= maxPages) {
        const result = await this.api.get('/subscribers', {
          limit: 50,
          page,
          user_field_ns: flags.error_field_ns,
          user_field_value: flags.error_value
        });

        if (!result.data?.length) break;
        allSubs.push(...result.data);
        if (page >= (result.meta?.last_page || 1)) break;
        page++;
      }

      if (this.jsonMode) return this.outputJson({
        total: allSubs.length,
        subscribers: allSubs
      });

      this.printField('Subscribers encontrados', allSubs.length);

      if (allSubs.length) {
        this.printSection('Detalle');
        for (const sub of allSubs.slice(0, 20)) {
          const name = sub.name || sub.first_name || '(sin nombre)';
          console.log(`  ${name} | ${sub.phone || 'N/A'} | ns:${sub.user_ns}`);
        }
        if (allSubs.length > 20) {
          console.log(`  ... y ${allSubs.length - 20} mas`);
        }
      }

    } catch (err) {
      this.printError(`Error: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════
  // Diagnostico de Logs
  // ═══════════════════════════════════════════════════

  async diagnoseLogs(userNs) {
    this.printHeader(`DIAGNOSTICO DE LOGS: ${userNs || 'General'}`);

    try {
      // 1. Verificar bot fields de webhook
      const botFields = await this.api.get('/flow/bot-fields', { limit: 50 });
      const webhookUrl = botFields.data?.find(f => f.name === 'Error_log_webhook');
      const authToken = botFields.data?.find(f => f.name === 'Auth_Webhook_N8N');

      this.printSection('1. Configuracion de Webhooks');
      this.printField('Error_log_webhook', webhookUrl?.value || 'NO ENCONTRADO');
      this.printField('Auth_Webhook_N8N', authToken?.value ? `${authToken.value.substring(0, 15)}...` : 'NO ENCONTRADO');

      // 2. Si tenemos user_ns, verificar el usuario
      if (userNs) {
        this.printSection('2. Estado del Usuario');
        let sub;
        try {
          const result = await this.api.get('/subscriber/get-info', { user_ns: userNs });
          sub = result.data;
        } catch {
          try {
            const result = await this.api.get('/subscriber/get-info-by-user-id', { user_id: userNs });
            sub = result.data;
          } catch {
            this.printError(`Usuario no encontrado: ${userNs}`);
          }
        }

        if (sub) {
          this.printField('Nombre', sub.name || sub.first_name);
          this.printField('NS', sub.user_ns);
          this.printField('Telefono', sub.phone);

          const errorField = sub.user_fields?.find(f => f.name === 'Error_Message' || f.name === 'Error Message');
          this.printField('Error_Message', errorField?.value || '(vacio)');

          const metadataField = sub.user_fields?.find(f => f.name?.toLowerCase().includes('metadata'));
          if (metadataField?.value) {
            this.printField('Metadata', metadataField.value);
          }
        }
      }

      // 3. Analisis del problema
      this.printSection('3. Analisis del Problema');
      console.log('  Posibles causas por las que los logs no llegan a N8N:');
      console.log('');
      console.log('  a) RATE LIMIT: El trigger solo dispara 1 vez/hora por usuario');
      console.log('     Si un usuario tiene multiples errores en 1 hora, solo el');
      console.log('     primero dispara el trigger. Los demas se pierden.');
      console.log('');
      console.log('  b) KEYWORD MATCH: El trigger usa "contains" para keywords.');
      console.log('     El error 131049 contiene "WhatsApp Error:" (con los dos puntos)');
      console.log('     que SI esta en la lista de keywords.');
      console.log('');
      console.log('  c) WEBHOOK URL: Error_log_webhook apunta a:');
      console.log(`     ${webhookUrl?.value || 'N/A'}`);
      console.log('     Pero el usuario reporta que los logs deberian ir a:');
      console.log('     https://primary-dev-d75a.up.railway.app/webhook/import_logs');
      console.log('     ESTAS SON URLs DIFERENTES - verificar cual es la correcta.');
      console.log('');
      console.log('  d) SAVE TO FIELD: El trigger guarda en "Error_Message" pero');
      console.log('     esto SOBREESCRIBE el valor anterior. Si hay multiples errores,');
      console.log('     solo el ultimo queda guardado.');
      console.log('');
      console.log('  e) FLUJO DESCONECTADO: El trigger guarda el error en el campo,');
      console.log('     pero necesita un flujo separado que envie al webhook.');
      console.log('     Si ese flujo tiene condiciones adicionales, puede filtrar.');

      // 4. Test de webhook
      if (webhookUrl?.value) {
        this.printSection('4. Test de Conectividad Webhook');
        try {
          const resp = await fetch(webhookUrl.value, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          this.printField('Status', `${resp.status} ${resp.statusText}`);
        } catch (err) {
          this.printField('Error', err.message);
        }
      }

    } catch (err) {
      this.printError(`Error en diagnostico: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════
  // User Fields (Flow-level, not subscriber)
  // ═══════════════════════════════════════════════════

  async listUserFields(flags = {}) {
    try {
      const result = await this.api.get('/flow/user-fields', {
        limit: flags.limit || 50,
        page: flags.page || 1,
        name: flags.name
      });

      if (this.jsonMode) return this.outputJson(result);

      this.printHeader('Flow User Fields');
      this.printField('Total', result.meta?.total);

      if (result.data?.length) {
        for (const field of result.data) {
          console.log(`  [${field.var_type}] ${field.name} (${field.var_ns})`);
          if (field.description) console.log(`    ${field.description}`);
        }
      }
    } catch (err) {
      // Endpoint might not be available
      if (this.jsonMode) return this.outputJson({ error: err.message });
      this.printWarning(`user-fields endpoint: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════
  // Flow Tags
  // ═══════════════════════════════════════════════════

  async listFlowTags(flags = {}) {
    try {
      const result = await this.api.get('/flow/tags', {
        limit: flags.limit || 50,
        page: flags.page || 1,
        name: flags.name
      });

      if (this.jsonMode) return this.outputJson(result);

      this.printHeader('Flow Tags');
      this.printField('Total', result.meta?.total);

      if (result.data?.length) {
        for (const tag of result.data) {
          console.log(`  ${tag.name} (${tag.tag_ns})`);
        }
      }
    } catch (err) {
      if (this.jsonMode) return this.outputJson({ error: err.message });
      this.printWarning(`tags endpoint: ${err.message}`);
    }
  }
}

// ─────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────

async function main() {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.length === 0) {
    showHelp();
    return;
  }

  const parsed = parseArgs(rawArgs);
  const command = parsed._[0];
  const args = parsed._.slice(1);
  const flags = parsed.flags;

  const cli = new UchatCLI();
  cli.jsonMode = flags.json === true;
  cli.verbose = flags.verbose === true;

  try {
    switch (command) {
      // ── Conexion ──
      case 'test':
        await cli.testConnection();
        break;

      // ── Bot Fields ──
      case 'bot-fields':
        await cli.listBotFields(flags);
        break;
      case 'bot-field':
        if (!args[0]) { console.error('Uso: bot-field <name>'); return; }
        await cli.getBotField(args[0]);
        break;
      case 'bot-field-set':
        if (!args[0] || !args[1]) { console.error('Uso: bot-field-set <name> <value>'); return; }
        await cli.setBotField(args[0], args[1]);
        break;
      case 'bot-field-create':
        if (!args[0]) { console.error('Uso: bot-field-create <name> [--type text]'); return; }
        await cli.createBotField(args[0], flags);
        break;
      case 'bot-field-delete':
        if (!args[0]) { console.error('Uso: bot-field-delete <name> --confirm'); return; }
        await cli.deleteBotField(args[0], flags.confirm === true);
        break;

      // ── Subscribers ──
      case 'subscribers':
        await cli.listSubscribers(flags);
        break;
      case 'subscriber':
        if (!args[0]) { console.error('Uso: subscriber <user_ns>'); return; }
        await cli.getSubscriber(args[0]);
        break;
      case 'subscriber-by-id':
        if (!args[0]) { console.error('Uso: subscriber-by-id <user_id>'); return; }
        await cli.getSubscriberById(args[0]);
        break;
      case 'search-subscriber':
        await cli.searchSubscriber(flags);
        break;
      case 'subscriber-create':
        await cli.createSubscriber(flags);
        break;
      case 'subscriber-update':
        if (!args[0]) { console.error('Uso: subscriber-update <user_ns> --field=value'); return; }
        await cli.updateSubscriber(args[0], flags);
        break;
      case 'subscriber-delete':
        if (!args[0]) { console.error('Uso: subscriber-delete <user_ns> --confirm'); return; }
        await cli.deleteSubscriber(args[0], flags.confirm === true);
        break;

      // ── Tags ──
      case 'tag-add':
        if (!args[0] || !args[1]) { console.error('Uso: tag-add <user_ns> <tag_name>'); return; }
        await cli.addTag(args[0], args[1]);
        break;
      case 'tag-remove':
        if (!args[0] || !args[1]) { console.error('Uso: tag-remove <user_ns> <tag_name>'); return; }
        await cli.removeTag(args[0], args[1]);
        break;
      case 'tags-add':
        if (!args[0] || !args[1]) { console.error('Uso: tags-add <user_ns> <tag1,tag2>'); return; }
        await cli.addTags(args[0], args[1]);
        break;
      case 'tags-remove':
        if (!args[0] || !args[1]) { console.error('Uso: tags-remove <user_ns> <tag1,tag2>'); return; }
        await cli.removeTags(args[0], args[1]);
        break;

      // ── Labels ──
      case 'label-add':
        if (!args[0] || !args[1]) { console.error('Uso: label-add <user_ns> <label>'); return; }
        await cli.addLabels(args[0], args[1]);
        break;
      case 'label-remove':
        if (!args[0] || !args[1]) { console.error('Uso: label-remove <user_ns> <label>'); return; }
        await cli.removeLabels(args[0], args[1]);
        break;

      // ── User Fields ──
      case 'field-set':
        if (!args[0] || !args[1] || !args[2]) { console.error('Uso: field-set <user_ns> <field_name> <value>'); return; }
        await cli.setUserField(args[0], args[1], args[2]);
        break;
      case 'field-clear':
        if (!args[0] || !args[1]) { console.error('Uso: field-clear <user_ns> <field_name>'); return; }
        await cli.clearUserField(args[0], args[1]);
        break;
      case 'fields-set':
        if (!args[0] || !args[1]) { console.error('Uso: fields-set <user_ns> <name=val,name=val>'); return; }
        await cli.setUserFields(args[0], args[1]);
        break;

      // ── Segments ──
      case 'segments':
        await cli.listSegments(flags);
        break;

      // ── Events ──
      case 'events':
        await cli.listEvents(flags);
        break;
      case 'event-summary':
        if (!args[0]) { console.error('Uso: event-summary <event_ns> [--range last_7_days]'); return; }
        await cli.getEventSummary(args[0], flags);
        break;
      case 'event-data':
        if (!args[0]) { console.error('Uso: event-data <event_ns> [--limit 50]'); return; }
        await cli.getEventData(args[0], flags);
        break;

      // ── Conversations ──
      case 'conversations':
        await cli.listConversations(flags);
        break;
      case 'activity-log':
        await cli.getActivityLog(flags);
        break;

      // ── Debug ──
      case 'debug-user':
        if (!args[0]) { console.error('Uso: debug-user <user_ns>'); return; }
        await cli.debugUser(args[0]);
        break;
      case 'debug-error':
        if (!args[0]) { console.error('Uso: debug-error <user_ns>'); return; }
        await cli.debugError(args[0]);
        break;
      case 'debug-webhooks':
        await cli.debugWebhooks();
        break;
      case 'debug-triggers':
        await cli.debugTriggers();
        break;
      case 'diagnose-logs':
        await cli.diagnoseLogs(args[0]);
        break;
      case 'analyze-errors':
        await cli.analyzeErrors(flags);
        break;

      // ── Subflows ──
      case 'subflows':
        await cli.listSubflows(flags);
        break;

      // ── Bot Stats ──
      case 'bot-users-count':
        await cli.getBotUsersCount();
        break;
      case 'inbound-webhooks':
        await cli.listInboundWebhooks(flags);
        break;

      // ── Chat Messages ──
      case 'chat-messages':
        if (!args[0]) { console.error('Uso: chat-messages <user_ns> [--limit N]'); return; }
        await cli.getChatMessages(args[0], flags);
        break;

      // ── Send Messages ──
      case 'send-text':
        if (!args[0] || !args[1]) { console.error('Uso: send-text <user_ns> <texto>'); return; }
        await cli.sendText(args[0], args.slice(1).join(' '));
        break;
      case 'send-subflow':
        if (!args[0] || !args[1]) { console.error('Uso: send-subflow <user_ns> <sub_flow_ns>'); return; }
        await cli.sendSubflow(args[0], args[1]);
        break;
      case 'send-content':
        if (!args[0] || !args[1]) { console.error('Uso: send-content <user_ns> <json_data>'); return; }
        await cli.sendContent(args[0], args.slice(1).join(' '));
        break;
      case 'send-node':
        if (!args[0] || !args[1]) { console.error('Uso: send-node <user_ns> <node_ns>'); return; }
        await cli.sendNode(args[0], args[1]);
        break;

      // ── Bot Control ──
      case 'pause-bot':
        if (!args[0] || !args[1]) { console.error('Uso: pause-bot <user_ns> <minutes>'); return; }
        await cli.pauseBot(args[0], args[1]);
        break;
      case 'resume-bot':
        if (!args[0]) { console.error('Uso: resume-bot <user_ns>'); return; }
        await cli.resumeBot(args[0]);
        break;
      case 'assign-agent':
        if (!args[0] || !args[1]) { console.error('Uso: assign-agent <user_ns> <agent_id>'); return; }
        await cli.assignAgent(args[0], args[1]);
        break;
      case 'move-chat':
        if (!args[0] || !args[1]) { console.error('Uso: move-chat <user_ns> <status>'); return; }
        await cli.moveChatTo(args[0], args[1]);
        break;
      case 'app-trigger':
        if (!args[0] || !args[1]) { console.error('Uso: app-trigger <user_ns> <trigger_name> [--data JSON]'); return; }
        await cli.appTrigger(args[0], args[1], flags);
        break;

      // ── Flow-level ──
      case 'user-fields':
        await cli.listUserFields(flags);
        break;
      case 'flow-tags':
        await cli.listFlowTags(flags);
        break;

      // ── Help ──
      case 'help':
        showHelp();
        break;

      default:
        console.error(`Comando desconocido: ${command}`);
        console.error('Usa "node scripts/uchat-cli.cjs help" para ver comandos disponibles');
        process.exit(1);
    }
  } catch (err) {
    if (cli.jsonMode) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(`\n  ERROR  ${err.message}`);
      if (cli.verbose) console.error(err.stack);
    }
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
UChat CLI v2.0.0 - PQNC QA AI Platform
Administracion completa de UChat via API

USO: node scripts/uchat-cli.cjs <command> [options]

LECTURA:
  test                              Verificar conexion
  bot-fields [--limit N]            Listar bot fields
  bot-field <name>                  Buscar bot field
  subscribers [--limit N]           Listar subscribers
  subscriber <user_ns>             Info completa
  subscriber-by-id <user_id>       Buscar por channel ID
  search-subscriber --phone X      Buscar subscriber
  subflows [--limit N]              Listar subflows del bot
  bot-users-count                   Conteo usuarios por status
  inbound-webhooks                  Listar inbound webhooks
  chat-messages <ns> [--limit N]   Historial de mensajes
  segments                          Listar segmentos
  events                            Listar custom events
  event-summary <ns> [--range X]   Resumen de evento
  event-data <ns> [--limit N]      Datos de evento
  conversations [--limit N]         Conversaciones cerradas
  activity-log [--limit N]          Log de actividad
  user-fields                       User fields del flow
  flow-tags                         Tags del flow

DEBUG:
  debug-user <ns>                   Debug completo usuario
  debug-error <ns>                  Debug errores usuario
  debug-webhooks                    Verificar webhooks
  debug-triggers                    Analizar triggers
  diagnose-logs [user_ns]           Diagnosticar logs perdidos
  analyze-errors                    Analisis de errores

MENSAJES (escritura):
  send-text <ns> <texto>            Enviar texto
  send-subflow <ns> <sub_flow_ns>  Ejecutar subflow
  send-content <ns> <json>          Enviar contenido rich
  send-node <ns> <node_ns>          Enviar nodo especifico

BOT CONTROL (escritura):
  pause-bot <ns> <minutes>          Pausar bot
  resume-bot <ns>                   Reanudar bot
  assign-agent <ns> <agent_id>      Asignar agente live
  move-chat <ns> <status>           Mover chat (open/done/pending)
  app-trigger <ns> <name> [--data]  Disparar app trigger

SUBSCRIBERS (escritura):
  subscriber-create --phone X       Crear subscriber
  subscriber-update <ns> --name X   Actualizar subscriber
  subscriber-delete <ns> --confirm  Eliminar subscriber

TAGS/LABELS (escritura):
  tag-add <ns> <tag>               Agregar tag
  tag-remove <ns> <tag>            Quitar tag
  tags-add <ns> <t1,t2>            Agregar multiples
  tags-remove <ns> <t1,t2>         Quitar multiples
  label-add <ns> <label>           Agregar label
  label-remove <ns> <label>        Quitar label

FIELDS (escritura):
  field-set <ns> <name> <val>      Establecer user field
  field-clear <ns> <name>          Limpiar user field
  fields-set <ns> <n=v,n=v>        Establecer multiples
  bot-field-set <name> <value>     Set bot field
  bot-field-create <name>          Crear bot field
  bot-field-delete <name> --confirm Eliminar bot field

FLAGS:
  --json       Salida JSON
  --verbose    Detalle extra
  --confirm    Confirmar destructivas
  --limit N    Limite de resultados
  --page N     Pagina de resultados
`);
}

main();
