#!/usr/bin/env node
/**
 * CLI completo para interactuar con la API de n8n (v3.0)
 * Uso: node scripts/n8n-cli.js <comando> [opciones]
 *
 * ══════════════════════════════════════════════════════════════
 * COMANDOS DE WORKFLOWS
 * ══════════════════════════════════════════════════════════════
 *   list                      - Listar todos los workflows
 *   get <id>                  - Obtener detalles de un workflow
 *   search <query>            - Buscar workflows por nombre/tags
 *   activate <id>             - Activar un workflow
 *   deactivate <id>           - Desactivar un workflow
 *   create <json-file>        - Crear workflow desde archivo JSON
 *   update <id> <json-file>   - Actualizar workflow existente
 *   prompts <id>              - Extraer prompts de un workflow
 *
 * ══════════════════════════════════════════════════════════════
 * COMANDOS DE EJECUCIONES
 * ══════════════════════════════════════════════════════════════
 *   executions <id> [limit]   - Ver ejecuciones de un workflow
 *   execution <exec-id>       - Ver detalle/resumen de una ejecución
 *   exec-data <exec-id>       - Ver datos entrada/salida (truncados)
 *     --full                  - No truncar datos
 *     --node "nombre"         - Filtrar por nombre de nodo
 *   exec-node <exec-id> <nodo>- Ver input/output COMPLETO de un nodo
 *     --save archivo.json     - Guardar resultado a archivo
 *   exec-save <exec-id> [path]- Guardar ejecución completa a JSON
 *   exec-errors [workflow-id] - Ver solo ejecuciones con errores (excluye manuales por defecto)
 *     --include-manual        - Incluir ejecuciones manuales (pruebas)
 *   exec-delete <exec-id>     - Eliminar una ejecución
 *   metrics <id> [days]       - Ver métricas de un workflow
 *
 * ══════════════════════════════════════════════════════════════
 * COMANDOS DE ANÁLISIS (NUEVO v3.0)
 * ══════════════════════════════════════════════════════════════
 *   trace-error <exec-id>     - Análisis forense de error con código
 *   inspect-code <wf-id>      - Extraer código de nodos Code
 *     [nombre-nodo]           - Filtrar por nombre de nodo
 *   follow-chain <wf-id>      - Árbol de dependencias (sub-workflows)
 *   analyze <wf-id>           - Análisis completo de integridad
 *
 * ══════════════════════════════════════════════════════════════
 * COMANDOS DE RECURSOS
 * ══════════════════════════════════════════════════════════════
 *   credentials               - Listar credenciales
 *   tags                      - Listar tags
 *   variables                 - Listar variables de entorno
 *   test                      - Probar conexión con n8n
 *
 * ══════════════════════════════════════════════════════════════
 * NOTAS SOBRE CREATE/UPDATE
 * ══════════════════════════════════════════════════════════════
 * Al crear/actualizar workflows, NO incluir en el JSON:
 *   - active (read-only, usar activate/deactivate)
 *   - tags (read-only, asignar desde UI)
 *   - id, createdAt, updatedAt (auto-generados)
 */

// Detectar --json para silenciar mensajes
const isJsonMode = process.argv.includes('--json');

const fs = require('fs');
const path = require('path');

// Importar módulo de análisis
const analyzers = require('./lib/analyzers.cjs');

// ══════════════════════════════════════════════════════════════
// CONFIGURACIÓN - PQNC QA AI Platform (primary-dev-d75a)
// ══════════════════════════════════════════════════════════════
const N8N_BASE_URL = process.env.N8N_BASE_URL
  ? `${process.env.N8N_BASE_URL}/api/v1`
  : 'https://primary-dev-d75a.up.railway.app/api/v1';
const SECRETS_PATH = path.join(__dirname, '..', '.cursor', 'secrets', 'n8n.key');

function loadApiKey() {
  // 1. Variable de entorno (prioridad)
  if (process.env.N8N_API_KEY) return process.env.N8N_API_KEY;
  if (process.env.N8N_API_TOKEN) return process.env.N8N_API_TOKEN;

  // 2. Archivo de secrets
  try {
    return fs.readFileSync(SECRETS_PATH, 'utf-8').trim();
  } catch {
    return null;
  }
}

class N8nCLI {
  constructor(options = {}) {
    // Modo silencioso para --json
    this.silent = options.silent || false;

    // Cargar API key desde secrets o env
    this.apiToken = loadApiKey();
    this.baseUrl = process.env.N8N_API_URL || N8N_BASE_URL;

    // Cache de workflows (ID → nombre) para evitar llamadas repetidas
    this._workflowCache = null;
    this._workflowCacheTime = 0;
    this._workflowCacheTTL = 5 * 60 * 1000; // 5 minutos

    // Validar que exista el token
    if (!this.apiToken) {
      console.error('❌ Error: N8N API key no encontrada');
      console.error('   Opciones:');
      console.error('   1. Guardar en .cursor/secrets/n8n.key');
      console.error('   2. Exportar N8N_API_TOKEN como variable de entorno');
      process.exit(1);
    }
  }

  /**
   * Obtiene el cache de workflows (ID → {name, active})
   * Se refresca cada 5 minutos
   */
  async getWorkflowCache() {
    const now = Date.now();
    if (this._workflowCache && (now - this._workflowCacheTime) < this._workflowCacheTTL) {
      return this._workflowCache;
    }

    try {
      const result = await this.makeRequest('/workflows');
      const workflows = result.data || [];

      this._workflowCache = {};
      workflows.forEach(wf => {
        this._workflowCache[wf.id] = {
          name: wf.name,
          active: wf.active
        };
      });
      this._workflowCacheTime = now;

      return this._workflowCache;
    } catch (error) {
      // Si falla, retornar cache vacío
      return this._workflowCache || {};
    }
  }

  /**
   * Obtiene el nombre de un workflow por ID (usa cache)
   */
  async getWorkflowName(workflowId) {
    if (!workflowId) return 'Desconocido';

    const cache = await this.getWorkflowCache();
    return cache[workflowId]?.name || workflowId;
  }

  // Log condicional que respeta modo silencioso
  log(...args) {
    if (!this.silent) console.log(...args);
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-N8N-API-KEY': this.apiToken,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`n8n API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // ══════════════════════════════════════════════════════════════
  // COMANDOS DE CONEXIÓN
  // ══════════════════════════════════════════════════════════════

  async testConnection() {
    console.log('🔗 Probando conexión con n8n...');
    console.log(`   URL: ${this.baseUrl}`);
    
    try {
      const workflows = await this.makeRequest('/workflows');
      console.log('✅ Conexión exitosa!');
      console.log(`   Workflows encontrados: ${workflows.data?.length || 0}`);
      return true;
    } catch (error) {
      console.error('❌ Error de conexión:', error.message);
      return false;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // COMANDOS DE WORKFLOWS
  // ══════════════════════════════════════════════════════════════

  async listWorkflows() {
    console.log('📋 Listando workflows...\n');
    
    const result = await this.makeRequest('/workflows');
    const workflows = result.data || [];
    
    if (workflows.length === 0) {
      console.log('No se encontraron workflows.');
      return [];
    }

    // Agrupar por estado
    const active = workflows.filter(w => w.active);
    const inactive = workflows.filter(w => !w.active);

    console.log(`🟢 ACTIVOS (${active.length})`);
    console.log('─'.repeat(60));
    active.forEach((wf, index) => {
      const tags = wf.tags?.map(t => t.name || t).join(', ') || '';
      console.log(`  ${index + 1}. [${wf.id}] ${wf.name}`);
      if (tags) console.log(`     Tags: ${tags}`);
    });

    console.log(`\n⚪ INACTIVOS (${inactive.length})`);
    console.log('─'.repeat(60));
    inactive.forEach((wf, index) => {
      console.log(`  ${index + 1}. [${wf.id}] ${wf.name}`);
    });

    console.log(`\n📊 Total: ${workflows.length} workflows (${active.length} activos, ${inactive.length} inactivos)`);
    console.log(`\n💡 Nota: "Inactivos" incluye sub-workflows que se ejecutan desde otros workflows.`);
    console.log(`   Solo necesitan estar activos los workflows con triggers propios (webhook, cron).`);
    return workflows;
  }

  async getWorkflow(workflowId) {
    this.log(`📄 Obteniendo workflow: ${workflowId}\n`);

    const workflow = await this.makeRequest(`/workflows/${workflowId}`);

    this.log('┌' + '─'.repeat(58) + '┐');
    this.log(`│ ${workflow.name.padEnd(56)} │`);
    this.log('├' + '─'.repeat(58) + '┤');
    this.log(`│ ID:          ${workflow.id.padEnd(43)} │`);
    this.log(`│ Activo:      ${(workflow.active ? '✅ Sí' : '❌ No').padEnd(43)} │`);
    this.log(`│ Nodos:       ${String(workflow.nodes?.length || 0).padEnd(43)} │`);
    this.log(`│ Conexiones:  ${String(Object.keys(workflow.connections || {}).length).padEnd(43)} │`);
    this.log(`│ Creado:      ${new Date(workflow.createdAt).toLocaleString().padEnd(43)} │`);
    this.log(`│ Actualizado: ${new Date(workflow.updatedAt).toLocaleString().padEnd(43)} │`);
    this.log('└' + '─'.repeat(58) + '┘');

    if (workflow.nodes?.length > 0) {
      this.log('\n📦 NODOS:');
      this.log('─'.repeat(60));

      // Categorizar nodos por tipo
      const triggers = workflow.nodes.filter(n => n.type.includes('trigger') || n.type.includes('webhook') || n.type.includes('Trigger'));
      const others = workflow.nodes.filter(n => !n.type.includes('trigger') && !n.type.includes('webhook') && !n.type.includes('Trigger'));

      if (triggers.length > 0) {
        this.log('\n  🎯 Triggers:');
        triggers.forEach(node => {
          this.log(`     • [${node.type.split('.').pop()}] ${node.name}`);
        });
      }

      this.log('\n  ⚙️  Procesamiento:');
      others.forEach(node => {
        const typeShort = node.type.split('.').pop() || node.type;
        this.log(`     • [${typeShort}] ${node.name}`);
      });
    }

    // Mostrar settings si existen
    if (workflow.settings && Object.keys(workflow.settings).length > 0) {
      this.log('\n⚙️  SETTINGS:');
      this.log('─'.repeat(60));
      Object.entries(workflow.settings).forEach(([key, value]) => {
        this.log(`   ${key}: ${JSON.stringify(value)}`);
      });
    }

    return workflow;
  }

  async searchWorkflows(query) {
    console.log(`🔍 Buscando: "${query}"\n`);
    
    const result = await this.makeRequest('/workflows');
    const workflows = result.data || [];
    
    const filtered = workflows.filter(wf => 
      wf.name.toLowerCase().includes(query.toLowerCase()) ||
      wf.tags?.some(tag => {
        const tagName = tag.name || tag;
        return tagName.toLowerCase().includes(query.toLowerCase());
      })
    );

    if (filtered.length === 0) {
      console.log('No se encontraron workflows que coincidan.');
      return [];
    }

    filtered.forEach((wf, index) => {
      const status = wf.active ? '🟢' : '⚪';
      const tags = wf.tags?.map(t => t.name || t).join(', ') || '';
      console.log(`${index + 1}. ${status} [${wf.id}] ${wf.name}`);
      if (tags) console.log(`   Tags: ${tags}`);
    });

    console.log(`\n✅ Encontrados: ${filtered.length} workflows`);
    return filtered;
  }

  async activateWorkflow(workflowId) {
    console.log(`🔄 Activando workflow: ${workflowId}...\n`);
    
    const result = await this.makeRequest(`/workflows/${workflowId}/activate`, {
      method: 'POST'
    });
    
    console.log('✅ Workflow activado exitosamente!');
    console.log(`   Nombre: ${result.name}`);
    console.log(`   Estado: ${result.active ? '🟢 Activo' : '⚪ Inactivo'}`);
    return result;
  }

  async deactivateWorkflow(workflowId) {
    console.log(`🔄 Desactivando workflow: ${workflowId}...\n`);

    const result = await this.makeRequest(`/workflows/${workflowId}/deactivate`, {
      method: 'POST'
    });

    console.log('✅ Workflow desactivado exitosamente!');
    console.log(`   Nombre: ${result.name}`);
    console.log(`   Estado: ${result.active ? '🟢 Activo' : '⚪ Inactivo'}`);
    return result;
  }

  async createWorkflow(workflowData) {
    console.log(`🚀 Creando workflow: ${workflowData.name}...\n`);

    const result = await this.makeRequest('/workflows', {
      method: 'POST',
      body: JSON.stringify(workflowData)
    });

    console.log('✅ Workflow creado exitosamente!');
    console.log(`   ID: ${result.id}`);
    console.log(`   Nombre: ${result.name}`);
    console.log(`   Nodos: ${result.nodes?.length || 0}`);
    console.log(`   Estado: ${result.active ? '🟢 Activo' : '⚪ Inactivo'}`);
    return result;
  }

  async updateWorkflow(workflowId, workflowData) {
    console.log(`📝 Actualizando workflow: ${workflowId}...\n`);

    const result = await this.makeRequest(`/workflows/${workflowId}`, {
      method: 'PUT',
      body: JSON.stringify(workflowData)
    });

    console.log('✅ Workflow actualizado exitosamente!');
    console.log(`   ID: ${result.id}`);
    console.log(`   Nombre: ${result.name}`);
    return result;
  }

  // ══════════════════════════════════════════════════════════════
  // COMANDOS DE EJECUCIONES
  // ══════════════════════════════════════════════════════════════

  async getExecutions(workflowId, limit = 20, status = null) {
    console.log(`📊 Ejecuciones del workflow: ${workflowId}`);
    if (status) console.log(`   Filtro: ${status}`);
    console.log(`   Últimas: ${limit}\n`);
    
    let endpoint = `/executions?workflowId=${workflowId}&limit=${limit}`;
    if (status) endpoint += `&status=${status}`;
    
    const result = await this.makeRequest(endpoint);
    const executions = result.data || [];

    if (executions.length === 0) {
      console.log('No hay ejecuciones registradas.');
      return [];
    }

    // Estadísticas
    let stats = { success: 0, error: 0, waiting: 0, running: 0 };

    console.log('┌─────────┬────────────────────────┬──────────┬───────────┐');
    console.log('│ Estado  │ Fecha                  │ Duración │ ID        │');
    console.log('├─────────┼────────────────────────┼──────────┼───────────┤');

    executions.forEach(exec => {
      const statusIcon = this.getStatusIcon(exec.status);
      const date = new Date(exec.startedAt).toLocaleString();
      const duration = this.calculateDuration(exec);
      const idShort = exec.id.substring(0, 8) + '...';
      
      // Actualizar stats
      if (exec.status === 'success') stats.success++;
      else if (exec.status === 'error') stats.error++;
      else if (exec.status === 'waiting') stats.waiting++;
      else stats.running++;

      console.log(`│ ${statusIcon.padEnd(7)} │ ${date.padEnd(22)} │ ${duration.padStart(8)} │ ${idShort.padEnd(9)} │`);
    });

    console.log('└─────────┴────────────────────────┴──────────┴───────────┘');
    
    // Resumen
    const successRate = executions.length > 0 ? ((stats.success / executions.length) * 100).toFixed(1) : 0;
    console.log(`\n📈 RESUMEN:`);
    console.log(`   ✅ Exitosas: ${stats.success} | ❌ Fallidas: ${stats.error} | ⏳ Esperando: ${stats.waiting} | 🔄 En proceso: ${stats.running}`);
    console.log(`   📊 Tasa de éxito: ${successRate}%`);
    
    return executions;
  }

  async getExecutionDetail(executionId) {
    console.log(`🔍 Detalle de ejecución: ${executionId}\n`);
    
    const execution = await this.makeRequest(`/executions/${executionId}?includeData=true`);
    
    console.log('┌' + '─'.repeat(68) + '┐');
    console.log(`│ EJECUCIÓN: ${execution.id}`.padEnd(69) + '│');
    console.log('├' + '─'.repeat(68) + '┤');
    console.log(`│ Workflow:     ${(execution.workflowData?.name || execution.workflowId || 'N/A').substring(0, 52).padEnd(52)} │`);
    console.log(`│ Estado:       ${this.getStatusIcon(execution.status).padEnd(52)} │`);
    console.log(`│ Modo:         ${(execution.mode || 'N/A').padEnd(52)} │`);
    console.log(`│ Inicio:       ${new Date(execution.startedAt).toLocaleString().padEnd(52)} │`);
    if (execution.stoppedAt) {
      console.log(`│ Fin:          ${new Date(execution.stoppedAt).toLocaleString().padEnd(52)} │`);
      console.log(`│ Duración:     ${this.calculateDuration(execution).padEnd(52)} │`);
    }
    console.log('└' + '─'.repeat(68) + '┘');

    // Mostrar error si existe
    if (execution.status === 'error' && execution.data?.resultData?.error) {
      const error = execution.data.resultData.error;
      console.log('\n❌ ERROR:');
      console.log('─'.repeat(70));
      console.log(`   Mensaje: ${error.message || 'Sin mensaje'}`);
      if (error.node) console.log(`   Nodo: ${error.node}`);
      if (error.stack) {
        console.log('   Stack trace:');
        console.log(error.stack.split('\n').map(l => `      ${l}`).join('\n').substring(0, 500));
      }
    }

    // Mostrar flujo de nodos ejecutados
    if (execution.data?.resultData?.runData) {
      console.log('\n📦 NODOS EJECUTADOS:');
      console.log('─'.repeat(70));
      
      const runData = execution.data.resultData.runData;
      Object.entries(runData).forEach(([nodeName, nodeRuns]) => {
        const run = nodeRuns[0];
        const startTime = run?.startTime ? new Date(run.startTime).toLocaleTimeString() : 'N/A';
        const execTime = run?.executionTime ? `${run.executionTime}ms` : 'N/A';
        const status = run?.error ? '❌' : '✅';
        
        console.log(`   ${status} ${nodeName}`);
        console.log(`      Hora: ${startTime} | Duración: ${execTime}`);
        
        // Mostrar items procesados
        if (run?.data?.main?.[0]) {
          const items = run.data.main[0];
          console.log(`      Items: ${items.length} procesados`);
        }
        
        // Mostrar error del nodo si existe
        if (run?.error) {
          console.log(`      ⚠️  Error: ${run.error.message?.substring(0, 100) || 'Error desconocido'}`);
        }
      });
    }

    return execution;
  }

  async getExecutionData(executionId, options = {}) {
    const { full = false, nodeFilter = null } = options;
    console.log(`📦 Datos de ejecución: ${executionId}`);
    if (nodeFilter) console.log(`   Filtro: "${nodeFilter}"`);
    if (full) console.log(`   Modo: COMPLETO (sin truncar)`);
    console.log('');

    const execution = await this.makeRequest(`/executions/${executionId}?includeData=true`);

    if (!execution.data?.resultData?.runData) {
      console.log('No hay datos de ejecución disponibles.');
      return null;
    }

    const runData = execution.data.resultData.runData;
    const maxLength = full ? Infinity : 200;

    console.log('═'.repeat(70));
    console.log(' DATOS DE ENTRADA/SALIDA POR NODO');
    console.log('═'.repeat(70));

    // Filtrar nodos si se especificó filtro
    let nodesToShow = Object.entries(runData);
    if (nodeFilter) {
      const filterLower = nodeFilter.toLowerCase();
      nodesToShow = nodesToShow.filter(([name]) =>
        name.toLowerCase().includes(filterLower)
      );
      if (nodesToShow.length === 0) {
        console.log(`\n⚠️  No se encontraron nodos que coincidan con "${nodeFilter}"`);
        console.log('\n📋 Nodos disponibles:');
        Object.keys(runData).forEach(n => console.log(`   • ${n}`));
        return null;
      }
    }

    nodesToShow.forEach(([nodeName, nodeRuns]) => {
      const run = nodeRuns[0];

      console.log(`\n┌─ 📦 ${nodeName} ─${'─'.repeat(Math.max(0, 60 - nodeName.length))}`);

      // Datos de entrada
      if (run?.inputData?.main?.[0]) {
        const inputItems = run.inputData.main[0];
        console.log(`│ 📥 ENTRADA (${inputItems.length} items):`);
        const itemsToShow = full ? inputItems : inputItems.slice(0, 3);
        itemsToShow.forEach((item, i) => {
          const json = JSON.stringify(item.json || {}, null, 2);
          const display = json.length > maxLength ? json.substring(0, maxLength) + '...' : json;
          console.log(`│    Item ${i + 1}:`);
          display.split('\n').forEach(line => console.log(`│      ${line}`));
        });
        if (!full && inputItems.length > 3) console.log(`│    ... y ${inputItems.length - 3} items más`);
      }

      // Datos de salida
      if (run?.data?.main?.[0]) {
        const outputItems = run.data.main[0];
        console.log(`│ 📤 SALIDA (${outputItems.length} items):`);
        const itemsToShow = full ? outputItems : outputItems.slice(0, 3);
        itemsToShow.forEach((item, i) => {
          const json = JSON.stringify(item.json || {}, null, 2);
          const display = json.length > maxLength ? json.substring(0, maxLength) + '...' : json;
          console.log(`│    Item ${i + 1}:`);
          display.split('\n').forEach(line => console.log(`│      ${line}`));
        });
        if (!full && outputItems.length > 3) console.log(`│    ... y ${outputItems.length - 3} items más`);
      }

      console.log('└' + '─'.repeat(69));
    });

    return execution;
  }

  /**
   * Obtener input/output completo de un nodo específico
   * @param {string} executionId - ID de la ejecución
   * @param {string} nodeName - Nombre del nodo (puede ser parcial)
   * @param {object} options - { saveToFile: string|null }
   */
  async getNodeData(executionId, nodeName, options = {}) {
    const { saveToFile = null } = options;
    this.log(`🔍 Buscando nodo "${nodeName}" en ejecución: ${executionId}\n`);

    const execution = await this.makeRequest(`/executions/${executionId}?includeData=true`);

    if (!execution.data?.resultData?.runData) {
      console.log('No hay datos de ejecución disponibles.');
      return null;
    }

    const runData = execution.data.resultData.runData;
    const nodeNameLower = nodeName.toLowerCase();

    // Buscar nodo por nombre (exacto o parcial)
    let matchedNode = null;
    let matchedNodeName = null;

    for (const [name, data] of Object.entries(runData)) {
      if (name.toLowerCase() === nodeNameLower) {
        matchedNode = data;
        matchedNodeName = name;
        break;
      }
      if (name.toLowerCase().includes(nodeNameLower)) {
        matchedNode = data;
        matchedNodeName = name;
      }
    }

    if (!matchedNode) {
      console.log(`❌ No se encontró nodo "${nodeName}"`);
      console.log('\n📋 Nodos disponibles:');
      Object.keys(runData).forEach(n => console.log(`   • ${n}`));
      return null;
    }

    const run = matchedNode[0];

    // ═══════════════════════════════════════════════════════════════════
    // RECONSTRUIR INPUT: La API de N8N no retorna inputData directamente.
    // Usamos 'source' para encontrar el nodo anterior y obtener su output.
    // ═══════════════════════════════════════════════════════════════════
    let reconstructedInput = [];
    const sources = run?.source || [];

    if (sources.length > 0) {
      // Reconstruir input desde los nodos fuente
      sources.forEach((src, sourceIdx) => {
        const prevNodeName = src.previousNode;
        const prevNodeOutputSlot = src.previousNodeOutput || 0;
        const prevNodeData = runData[prevNodeName];

        if (prevNodeData && prevNodeData[0]?.data?.main) {
          const outputSlot = prevNodeData[0].data.main[prevNodeOutputSlot];
          if (outputSlot) {
            const items = outputSlot.map(i => i.json);
            if (sources.length > 1) {
              // Múltiples inputs - indicar de dónde viene cada uno
              reconstructedInput.push({
                _sourceNode: prevNodeName,
                _sourceSlot: prevNodeOutputSlot,
                items: items
              });
            } else {
              // Un solo input - formato plano
              reconstructedInput = items;
            }
          }
        }
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // OUTPUT: Obtener todos los slots de output, no solo [0]
    // ═══════════════════════════════════════════════════════════════════
    let outputData = [];
    const outputMain = run?.data?.main || [];

    if (outputMain.length === 1) {
      // Un solo output slot - formato plano
      outputData = outputMain[0]?.map(i => i.json) || [];
    } else if (outputMain.length > 1) {
      // Múltiples output slots (ej: IF node tiene True/False)
      outputMain.forEach((slot, slotIdx) => {
        if (slot && slot.length > 0) {
          outputData.push({
            _outputSlot: slotIdx,
            _slotName: slotIdx === 0 ? 'Output 0 (True/Main)' : `Output ${slotIdx}`,
            items: slot.map(i => i.json)
          });
        }
      });
    }

    const result = {
      executionId,
      nodeName: matchedNodeName,
      startTime: run?.startTime,
      executionTime: run?.executionTime,
      sources: sources.map(s => ({ node: s.previousNode, outputSlot: s.previousNodeOutput || 0 })),
      input: reconstructedInput,
      output: outputData,
      error: run?.error || null
    };

    // Calcular conteos para display
    const inputCount = Array.isArray(result.input)
      ? (result.input[0]?.items ? result.input.reduce((sum, s) => sum + s.items.length, 0) : result.input.length)
      : 0;
    const outputCount = Array.isArray(result.output)
      ? (result.output[0]?._outputSlot !== undefined ? result.output.reduce((sum, s) => sum + s.items.length, 0) : result.output.length)
      : 0;

    // Mostrar en consola
    console.log('╔' + '═'.repeat(68) + '╗');
    console.log(`║ 📦 NODO: ${matchedNodeName}`.padEnd(69) + '║');
    console.log('╠' + '═'.repeat(68) + '╣');
    console.log(`║ Ejecución:    ${executionId}`.padEnd(69) + '║');
    console.log(`║ Inicio:       ${run?.startTime ? new Date(run.startTime).toLocaleString() : 'N/A'}`.padEnd(69) + '║');
    console.log(`║ Duración:     ${run?.executionTime ? run.executionTime + 'ms' : 'N/A'}`.padEnd(69) + '║');
    console.log(`║ Items input:  ${inputCount}`.padEnd(69) + '║');
    console.log(`║ Items output: ${outputCount}`.padEnd(69) + '║');
    console.log('╚' + '═'.repeat(68) + '╝');

    // SOURCES (de dónde viene el input)
    if (result.sources.length > 0) {
      console.log('\n🔗 FUENTES (input viene de):');
      console.log('─'.repeat(70));
      result.sources.forEach(s => {
        console.log(`   ← ${s.node} (output slot ${s.outputSlot})`);
      });
    }

    // INPUT
    console.log('\n📥 INPUT (reconstruido desde nodos fuente):');
    console.log('─'.repeat(70));
    if (result.input.length === 0) {
      console.log('   (sin input - este es un nodo trigger o sin conexiones entrantes)');
    } else {
      console.log(JSON.stringify(result.input, null, 2));
    }

    // OUTPUT
    console.log('\n📤 OUTPUT:');
    console.log('─'.repeat(70));
    if (result.output.length === 0) {
      console.log('   (sin output - el nodo pudo haber fallado antes de producir output)');
    } else {
      console.log(JSON.stringify(result.output, null, 2));
    }

    // ERROR si existe
    if (result.error) {
      console.log('\n❌ ERROR:');
      console.log('─'.repeat(70));
      console.log(JSON.stringify(result.error, null, 2));
    }

    // Guardar a archivo si se especificó
    if (saveToFile) {
      const fs = require('fs');
      fs.writeFileSync(saveToFile, JSON.stringify(result, null, 2));
      console.log(`\n✅ Guardado en: ${saveToFile}`);
    }

    return result;
  }

  /**
   * Guardar ejecución completa a archivo JSON
   * @param {string} executionId - ID de la ejecución
   * @param {string} outputPath - Ruta del archivo de salida
   */
  async saveExecution(executionId, outputPath = null) {
    const fs = require('fs');
    const path = require('path');

    // Generar nombre de archivo si no se especificó
    if (!outputPath) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      outputPath = `tmp/exec-${executionId}-${timestamp}.json`;
    }

    console.log(`💾 Guardando ejecución: ${executionId}`);
    console.log(`   Destino: ${outputPath}\n`);

    const execution = await this.makeRequest(`/executions/${executionId}?includeData=true`);

    // Asegurar que el directorio existe
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(execution, null, 2));

    // Estadísticas del archivo
    const stats = fs.statSync(outputPath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    const nodeCount = Object.keys(execution.data?.resultData?.runData || {}).length;

    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║ ✅ EJECUCIÓN GUARDADA EXITOSAMENTE'.padEnd(59) + '║');
    console.log('╠' + '═'.repeat(58) + '╣');
    console.log(`║ Archivo:  ${outputPath}`.padEnd(59) + '║');
    console.log(`║ Tamaño:   ${sizeKB} KB`.padEnd(59) + '║');
    console.log(`║ Nodos:    ${nodeCount}`.padEnd(59) + '║');
    console.log(`║ Workflow: ${(execution.workflowData?.name || 'N/A').substring(0, 40)}`.padEnd(59) + '║');
    console.log(`║ Estado:   ${execution.status}`.padEnd(59) + '║');
    console.log('╚' + '═'.repeat(58) + '╝');

    // Listar nodos
    if (execution.data?.resultData?.runData) {
      console.log('\n📋 Nodos incluidos:');
      Object.keys(execution.data.resultData.runData).forEach(n => {
        console.log(`   • ${n}`);
      });
    }

    return { path: outputPath, execution };
  }

  async getExecutionErrors(workflowId = null, limit = 50, hours = null, excludeManual = true) {
    console.log('❌ Ejecuciones con errores');
    if (workflowId) console.log(`   Workflow: ${workflowId}`);
    if (hours) console.log(`   Período: últimas ${hours} horas`);
    console.log(`   Límite: ${limit}`);
    if (excludeManual) console.log('   Filtro: Solo producción (excluye ejecuciones manuales)');
    console.log('   Cargando datos...\n');

    let endpoint = `/executions?status=error&limit=${limit}&includeData=true`;
    if (workflowId) endpoint += `&workflowId=${workflowId}`;

    const result = await this.makeRequest(endpoint);
    let executions = result.data || [];

    // Filtrar por horas si se especifica
    if (hours && executions.length > 0) {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      executions = executions.filter(exec => new Date(exec.startedAt) >= cutoffTime);
    }

    // Filtrar ejecuciones manuales si se especifica (por defecto excluye)
    if (excludeManual && executions.length > 0) {
      const beforeCount = executions.length;
      executions = executions.filter(exec => exec.mode !== 'manual');
      const filteredCount = beforeCount - executions.length;
      if (filteredCount > 0) {
        console.log(`   ℹ️  Excluidas ${filteredCount} ejecuciones manuales (pruebas)\n`);
      }
    }

    if (executions.length === 0) {
      console.log('🎉 No hay ejecuciones con errores!');
      return [];
    }

    // Cargar cache de workflows para obtener nombres
    const wfCache = await this.getWorkflowCache();

    // Extraer base URL para construir enlaces
    const baseUrl = this.baseUrl.replace('/api/v1', '');

    // Procesar cada ejecución para extraer info de parentExecution
    const processedExecs = executions.map(exec => {
      const wfId = exec.workflowId || exec.workflowData?.id;
      const wfName = exec.workflowData?.name || wfCache[wfId]?.name || wfId;

      // Detectar si es sub-workflow (mode: "integrated" indica que fue llamado desde otro workflow)
      const isSubWorkflow = exec.mode === 'integrated';

      // Extraer parentExecution de los metadatos del trigger
      let parentExecution = null;
      if (exec.data?.resultData?.runData) {
        const runData = exec.data.resultData.runData;
        // Buscar en cualquier nodo que tenga metadata.parentExecution
        for (const [nodeName, nodeRuns] of Object.entries(runData)) {
          const meta = nodeRuns?.[0]?.metadata?.parentExecution;
          if (meta) {
            parentExecution = {
              executionId: meta.executionId,
              workflowId: meta.workflowId,
              workflowName: wfCache[meta.workflowId]?.name || meta.workflowId
            };
            break;
          }
        }
      }

      return {
        ...exec,
        _processed: {
          wfId,
          wfName,
          isSubWorkflow,
          parentExecution,
          errorMsg: exec.data?.resultData?.error?.message || null
        }
      };
    });

    // Agrupar errores por cadena (padre → hijo)
    const errorChains = new Map(); // parentExecId → [childExecs]
    const standaloneErrors = [];

    processedExecs.forEach(exec => {
      if (exec._processed.parentExecution) {
        const parentId = exec._processed.parentExecution.executionId;
        if (!errorChains.has(parentId)) {
          errorChains.set(parentId, []);
        }
        errorChains.get(parentId).push(exec);
      } else {
        standaloneErrors.push(exec);
      }
    });

    // Mostrar tabla principal
    console.log('┌────────────┬────────────────────────┬──────────────────────────────────────────┬──────────┐');
    console.log('│ Exec ID    │ Fecha                  │ Workflow                                 │ Tipo     │');
    console.log('├────────────┼────────────────────────┼──────────────────────────────────────────┼──────────┤');

    for (const exec of processedExecs) {
      const execId = String(exec.id).substring(0, 10).padEnd(10);
      const date = new Date(exec.startedAt).toLocaleString().substring(0, 22);
      const wfName = exec._processed.wfName.substring(0, 40).padEnd(40);
      const tipo = exec._processed.isSubWorkflow ? '🔗 Sub-WF' : '📋 Main  ';

      console.log(`│ ${execId} │ ${date.padEnd(22)} │ ${wfName} │ ${tipo} │`);

      // Mostrar error
      if (exec._processed.errorMsg) {
        const errorMsg = exec._processed.errorMsg.substring(0, 60);
        console.log(`│            │                        │ ⚠️  ${errorMsg.padEnd(37)} │          │`);
      }

      // Mostrar padre si es sub-workflow
      if (exec._processed.parentExecution) {
        const parent = exec._processed.parentExecution;
        const parentInfo = `↑ Padre: ${parent.executionId} (${parent.workflowName.substring(0, 25)})`;
        console.log(`│            │                        │ ${parentInfo.padEnd(40)} │          │`);
      }
    }

    console.log('└────────────┴────────────────────────┴──────────────────────────────────────────┴──────────┘');

    // Resumen de propagación de errores
    if (errorChains.size > 0) {
      console.log('\n🔗 PROPAGACIÓN DE ERRORES (Sub-workflows con errores):');
      console.log('─'.repeat(80));

      for (const [parentId, children] of errorChains) {
        // Intentar obtener info del padre
        const firstChild = children[0];
        const parentInfo = firstChild._processed.parentExecution;
        const parentName = parentInfo?.workflowName || parentId;

        console.log(`\n   📋 Padre: ${parentId} (${parentName})`);
        children.forEach(child => {
          const childName = child._processed.wfName.substring(0, 35);
          const childError = child._processed.errorMsg?.substring(0, 40) || 'Sin mensaje';
          console.log(`      └─ 🔗 ${child.id}: ${childName}`);
          console.log(`            ⚠️  ${childError}`);
        });
      }

      console.log('\n   💡 Estos errores en sub-workflows pueden indicar:');
      console.log('      - El workflow padre no pasó parámetros requeridos');
      console.log('      - Datos inválidos enviados al sub-workflow');
      console.log('      - Use: node scripts/n8n-cli.js trace-error <exec-id> para investigar');
    }

    // Mostrar URLs de ejecuciones
    console.log(`\n📊 Total errores: ${executions.length} (${errorChains.size} cadenas de propagación)`);
    console.log(`\n🔗 URLs de ejecuciones:`);
    processedExecs.slice(0, 10).forEach(exec => {
      const wfId = exec._processed.wfId;
      const tipo = exec._processed.isSubWorkflow ? '🔗' : '📋';
      if (wfId) {
        console.log(`   ${tipo} ${exec.id}: ${baseUrl}/workflow/${wfId}/executions/${exec.id}`);
      }
    });
    if (executions.length > 10) {
      console.log(`   ... y ${executions.length - 10} más`);
    }

    return processedExecs;
  }

  async deleteExecution(executionId) {
    console.log(`🗑️  Eliminando ejecución: ${executionId}...\n`);
    
    await this.makeRequest(`/executions/${executionId}`, {
      method: 'DELETE'
    });
    
    console.log('✅ Ejecución eliminada exitosamente!');
    return true;
  }

  async getMetrics(workflowId, days = 30) {
    console.log(`📈 Métricas del workflow: ${workflowId}`);
    console.log(`   Período: últimos ${days} días\n`);
    
    // Paginar para obtener más ejecuciones (límite API: 250)
    let allExecutions = [];
    let cursor = null;
    const pageLimit = 250;
    
    // Obtener hasta 1000 ejecuciones paginando
    for (let i = 0; i < 4; i++) {
      let endpoint = `/executions?workflowId=${workflowId}&limit=${pageLimit}`;
      if (cursor) endpoint += `&cursor=${cursor}`;
      
      const result = await this.makeRequest(endpoint);
      const pageData = result.data || [];
      allExecutions = allExecutions.concat(pageData);
      
      cursor = result.nextCursor;
      if (!cursor || pageData.length < pageLimit) break;
    }
    
    const executions = allExecutions;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const filtered = executions.filter(exec => {
      const execDate = new Date(exec.startedAt);
      return execDate >= startDate && execDate <= endDate;
    });

    const total = filtered.length;
    const successful = filtered.filter(e => e.status === 'success').length;
    const failed = filtered.filter(e => e.status === 'error').length;
    const waiting = filtered.filter(e => e.status === 'waiting').length;
    const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : 0;

    // Calcular tiempos
    const times = filtered
      .filter(e => e.startedAt && e.stoppedAt)
      .map(e => new Date(e.stoppedAt) - new Date(e.startedAt));
    
    const avgTime = times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length / 1000).toFixed(2) : 0;
    const minTime = times.length > 0 ? (Math.min(...times) / 1000).toFixed(2) : 0;
    const maxTime = times.length > 0 ? (Math.max(...times) / 1000).toFixed(2) : 0;

    // Ejecuciones por día
    const byDay = {};
    filtered.forEach(exec => {
      const day = new Date(exec.startedAt).toLocaleDateString();
      byDay[day] = (byDay[day] || 0) + 1;
    });
    const avgPerDay = Object.keys(byDay).length > 0 
      ? (total / Object.keys(byDay).length).toFixed(1) 
      : 0;

    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║             📊 MÉTRICAS DE EJECUCIÓN             ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Total ejecuciones:        ${String(total).padStart(18)}  ║`);
    console.log(`║  ├─ Exitosas:              ${String(successful).padStart(18)}  ║`);
    console.log(`║  ├─ Fallidas:              ${String(failed).padStart(18)}  ║`);
    console.log(`║  └─ En espera:             ${String(waiting).padStart(18)}  ║`);
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Tasa de éxito:            ${String(successRate + '%').padStart(18)}  ║`);
    console.log(`║  Promedio por día:         ${String(avgPerDay).padStart(18)}  ║`);
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Tiempo promedio:          ${String(avgTime + 's').padStart(18)}  ║`);
    console.log(`║  Tiempo mínimo:            ${String(minTime + 's').padStart(18)}  ║`);
    console.log(`║  Tiempo máximo:            ${String(maxTime + 's').padStart(18)}  ║`);
    console.log('╚══════════════════════════════════════════════════╝');

    // Gráfico simple de barras por día (últimos 7 días)
    const last7Days = Object.entries(byDay).slice(-7);
    if (last7Days.length > 0) {
      console.log('\n📅 EJECUCIONES POR DÍA (últimos 7 días):');
      const maxCount = Math.max(...last7Days.map(([, c]) => c));
      last7Days.forEach(([day, count]) => {
        const barLength = Math.round((count / maxCount) * 30);
        const bar = '█'.repeat(barLength);
        console.log(`   ${day.padEnd(12)} │ ${bar} ${count}`);
      });
    }

    return { total, successful, failed, waiting, successRate, avgTime, minTime, maxTime, avgPerDay };
  }

  // ══════════════════════════════════════════════════════════════
  // COMANDOS DE RECURSOS
  // ══════════════════════════════════════════════════════════════

  async listCredentials() {
    console.log('🔐 Listando credenciales...\n');
    
    const result = await this.makeRequest('/credentials');
    const credentials = result.data || [];

    if (credentials.length === 0) {
      console.log('No hay credenciales configuradas.');
      return [];
    }

    console.log('┌────────────────────────────────┬────────────────────────┬────────────┐');
    console.log('│ Nombre                         │ Tipo                   │ ID         │');
    console.log('├────────────────────────────────┼────────────────────────┼────────────┤');

    credentials.forEach(cred => {
      const name = cred.name.substring(0, 30).padEnd(30);
      const type = cred.type.substring(0, 22).padEnd(22);
      const id = String(cred.id).padEnd(10);
      console.log(`│ ${name} │ ${type} │ ${id} │`);
    });

    console.log('└────────────────────────────────┴────────────────────────┴────────────┘');
    console.log(`\n📊 Total: ${credentials.length} credenciales`);
    
    return credentials;
  }

  async listTags() {
    console.log('🏷️  Listando tags...\n');
    
    const result = await this.makeRequest('/tags');
    const tags = result.data || result || [];

    if (tags.length === 0) {
      console.log('No hay tags configurados.');
      return [];
    }

    console.log('┌────────────────────────────────────────┬────────────┐');
    console.log('│ Nombre                                 │ ID         │');
    console.log('├────────────────────────────────────────┼────────────┤');

    tags.forEach(tag => {
      const name = tag.name.substring(0, 38).padEnd(38);
      const id = String(tag.id).padEnd(10);
      console.log(`│ ${name} │ ${id} │`);
    });

    console.log('└────────────────────────────────────────┴────────────┘');
    console.log(`\n📊 Total: ${tags.length} tags`);
    
    return tags;
  }

  async listVariables() {
    console.log('🔧 Listando variables de entorno...\n');
    
    try {
      const result = await this.makeRequest('/variables');
      const variables = result.data || result || [];

      if (variables.length === 0) {
        console.log('No hay variables configuradas.');
        return [];
      }

      console.log('┌────────────────────────────────┬────────────────────────────────┐');
      console.log('│ Clave                          │ Valor                          │');
      console.log('├────────────────────────────────┼────────────────────────────────┤');

      variables.forEach(variable => {
        const key = variable.key.substring(0, 30).padEnd(30);
        const value = (variable.value || '***').substring(0, 30).padEnd(30);
        console.log(`│ ${key} │ ${value} │`);
      });

      console.log('└────────────────────────────────┴────────────────────────────────┘');
      console.log(`\n📊 Total: ${variables.length} variables`);
      
      return variables;
    } catch (error) {
      console.log('⚠️  El endpoint de variables no está disponible en esta versión de n8n.');
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════════
  // COMANDOS DE PROMPTS (VAPI/AI)
  // ══════════════════════════════════════════════════════════════

  async extractPrompts(workflowId) {
    console.log(`🤖 Extrayendo prompts del workflow: ${workflowId}\n`);
    
    const workflow = await this.makeRequest(`/workflows/${workflowId}`);
    const prompts = [];

    if (!workflow.nodes) {
      console.log('El workflow no tiene nodos.');
      return [];
    }

    workflow.nodes.forEach(node => {
      // Buscar nodos VAPI
      if (node.type === 'vapi' || node.type?.includes('vapi')) {
        const vapiPrompts = this.extractVAPIPrompts(node);
        prompts.push(...vapiPrompts);
      }

      // Buscar nodos de AI/LLM
      if (node.type && (
        node.type.includes('openai') ||
        node.type.includes('anthropic') ||
        node.type.includes('llm') ||
        node.type.includes('ai') ||
        node.type.includes('@n8n/n8n-nodes-langchain')
      )) {
        const nodePrompts = this.extractNodePrompts(node);
        prompts.push(...nodePrompts);
      }
    });

    if (prompts.length === 0) {
      console.log('No se encontraron prompts en este workflow.');
      return [];
    }

    prompts.forEach((prompt, index) => {
      console.log(`\n${'═'.repeat(70)}`);
      console.log(`📝 PROMPT ${index + 1}: ${prompt.node_name}`);
      console.log(`   Tipo: ${prompt.node_type}`);
      console.log(`   Campo: ${prompt.parameter_key}`);
      if (prompt.checkpoint) {
        console.log(`   Checkpoint: ${prompt.checkpoint}`);
      }
      console.log(`${'─'.repeat(70)}`);
      const content = prompt.prompt_content.substring(0, 1000);
      console.log(content + (prompt.prompt_content.length > 1000 ? '\n...(truncado)' : ''));
    });

    console.log(`\n\n✅ Total: ${prompts.length} prompts encontrados`);
    return prompts;
  }

  extractVAPIPrompts(node) {
    const prompts = [];
    if (!node.parameters) return prompts;

    if (node.parameters.assistant?.model?.messages) {
      node.parameters.assistant.model.messages.forEach((msg, idx) => {
        if (msg.role === 'system' && msg.message?.length > 100) {
          prompts.push({
            node_id: node.id,
            node_name: node.name || 'VAPI Node',
            node_type: node.type,
            parameter_key: `assistant.model.messages[${idx}]`,
            prompt_content: msg.message,
            checkpoint: this.extractCheckpoint(msg.message)
          });
        }
      });
    }

    return prompts;
  }

  extractNodePrompts(node) {
    const prompts = [];
    if (!node.parameters) return prompts;

    const searchInObject = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'string' && value.length > 100) {
          if (key.toLowerCase().includes('prompt') || 
              key.toLowerCase().includes('message') ||
              key.toLowerCase().includes('system') ||
              key.toLowerCase().includes('instruction') ||
              value.includes('Eres') ||
              value.includes('You are')) {
            prompts.push({
              node_id: node.id,
              node_name: node.name,
              node_type: node.type,
              parameter_key: currentPath,
              prompt_content: value,
              checkpoint: this.extractCheckpoint(value)
            });
          }
        } else if (typeof value === 'object' && value !== null) {
          searchInObject(value, currentPath);
        }
      }
    };

    searchInObject(node.parameters);
    return prompts;
  }

  extractCheckpoint(message) {
    const checkpointMatch = message.match(/CHECKPOINT\s+(\d+):\s*([^-\n]+)/i);
    if (checkpointMatch) return `Checkpoint ${checkpointMatch[1]}: ${checkpointMatch[2].trim()}`;
    
    if (message.includes('SALUDO')) return 'Saludo y Continuación';
    if (message.includes('CONEXIÓN EMOCIONAL')) return 'Conexión Emocional';
    if (message.includes('DISCOVERY')) return 'Discovery Familiar';
    if (message.includes('URGENCIA')) return 'Urgencia y Oportunidad';
    if (message.includes('PRESENTACIÓN')) return 'Presentación de Oferta';
    
    return null;
  }

  // ══════════════════════════════════════════════════════════════
  // COMANDOS DE ANÁLISIS (v3.0)
  // ══════════════════════════════════════════════════════════════

  /**
   * Análisis forense de error: detecta nodo fallido, extrae código, sigue sub-workflows
   * v3.2: Detecta propagación de errores entre workflows padre/hijo
   */
  async traceError(executionId) {
    console.log(`🔍 Análisis forense de ejecución: ${executionId}\n`);

    const execution = await this.makeRequest(`/executions/${executionId}?includeData=true`);

    if (execution.status !== 'error') {
      console.log('✅ Esta ejecución no tiene errores');
      return execution;
    }

    // Cargar cache de workflows para nombres
    const wfCache = await this.getWorkflowCache();
    const baseUrl = this.baseUrl.replace('/api/v1', '');

    const analysis = analyzers.analyzeExecutionError(execution);

    // Detectar si es sub-workflow (llamado desde otro workflow)
    const isSubWorkflow = execution.mode === 'integrated';
    let parentExecution = null;

    // Extraer información del padre desde metadata
    if (execution.data?.resultData?.runData) {
      for (const [nodeName, nodeRuns] of Object.entries(execution.data.resultData.runData)) {
        const meta = nodeRuns?.[0]?.metadata?.parentExecution;
        if (meta) {
          parentExecution = {
            executionId: meta.executionId,
            workflowId: meta.workflowId,
            workflowName: wfCache[meta.workflowId]?.name || meta.workflowId
          };
          break;
        }
      }
    }

    // Extraer input recibido por el trigger (para detectar parámetros faltantes)
    let triggerInput = null;
    if (execution.data?.resultData?.runData) {
      const runData = execution.data.resultData.runData;
      // Buscar el primer nodo (trigger)
      for (const [nodeName, nodeRuns] of Object.entries(runData)) {
        if (nodeRuns?.[0]?.data?.main?.[0]?.[0]) {
          triggerInput = nodeRuns[0].data.main[0][0].json;
          break;
        }
      }
    }

    // Header con información de propagación
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log(`║ ❌ ERROR EN EJECUCIÓN`.padEnd(79) + '║');
    console.log('╠' + '═'.repeat(78) + '╣');
    console.log(`║ Workflow:     ${(analysis.workflowName || 'N/A').substring(0, 60).padEnd(60)} ║`);
    console.log(`║ Workflow ID:  ${(execution.workflowId || 'N/A').padEnd(60)} ║`);
    console.log(`║ Ejecución:    ${String(executionId).padEnd(60)} ║`);
    console.log(`║ Nodo fallido: ${(analysis.failedNode || 'N/A').substring(0, 60).padEnd(60)} ║`);
    console.log(`║ Tipo:         ${(isSubWorkflow ? '🔗 Sub-workflow (llamado desde otro)' : '📋 Workflow principal').padEnd(60)} ║`);
    console.log('╚' + '═'.repeat(78) + '╝');

    // Mostrar cadena de propagación si es sub-workflow
    if (isSubWorkflow && parentExecution) {
      console.log('\n🔗 PROPAGACIÓN DE ERROR (Cadena de llamadas):');
      console.log('─'.repeat(80));
      console.log(`   📋 PADRE: ${parentExecution.workflowName}`);
      console.log(`      ID Ejecución: ${parentExecution.executionId}`);
      console.log(`      ID Workflow:  ${parentExecution.workflowId}`);
      console.log(`      URL: ${baseUrl}/workflow/${parentExecution.workflowId}/executions/${parentExecution.executionId}`);
      console.log(`         │`);
      console.log(`         ▼ llamó a`);
      console.log(`   🔗 HIJO (ACTUAL): ${analysis.workflowName}`);
      console.log(`      ID Ejecución: ${executionId}`);
      console.log(`      ID Workflow:  ${execution.workflowId}`);
      console.log(`         │`);
      console.log(`         ▼ falló en`);
      console.log(`   ❌ NODO: ${analysis.failedNode}`);

      // Analizar si el error fue por parámetros faltantes
      console.log('\n📥 INPUT RECIBIDO DEL PADRE:');
      console.log('─'.repeat(80));
      if (triggerInput) {
        const inputStr = JSON.stringify(triggerInput, null, 2);
        const lines = inputStr.split('\n').slice(0, 15);
        lines.forEach(line => console.log(`   ${line}`));
        if (inputStr.split('\n').length > 15) {
          console.log('   ...(truncado)');
        }

        // Detectar campos undefined o null que podrían ser el problema
        const missingFields = [];
        const checkMissing = (obj, path = '') => {
          for (const [key, value] of Object.entries(obj)) {
            const fullPath = path ? `${path}.${key}` : key;
            if (value === undefined || value === null || value === '') {
              missingFields.push(fullPath);
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              checkMissing(value, fullPath);
            }
          }
        };
        checkMissing(triggerInput);

        if (missingFields.length > 0) {
          console.log('\n   ⚠️  CAMPOS VACÍOS/NULOS (posible causa del error):');
          missingFields.forEach(f => console.log(`      - ${f}`));
        }
      } else {
        console.log('   (No se pudo extraer el input)');
      }

      // Sugerencia de investigación
      console.log('\n💡 PARA INVESTIGAR EL PADRE:');
      console.log(`   node scripts/n8n-cli.js execution ${parentExecution.executionId}`);
      console.log(`   node scripts/n8n-cli.js exec-node ${parentExecution.executionId} "Execute Workflow"`);
    }

    // Mostrar error
    if (analysis.error) {
      console.log('\n❌ MENSAJE DE ERROR:');
      console.log('─'.repeat(80));
      console.log(`   ${analysis.error.message}`);
    }

    // Si el nodo fallido es un Execute Workflow, seguir la cadena hacia abajo
    const workflow = execution.workflowData;
    if (workflow && analysis.failedNode) {
      const failedNodeData = workflow.nodes?.find(n => n.name === analysis.failedNode);

      if (failedNodeData?.type.includes('executeWorkflow')) {
        console.log('\n🔗 SIGUIENDO CADENA HACIA SUB-WORKFLOW...');
        console.log('─'.repeat(80));

        const targetId = failedNodeData.parameters?.workflowId?.value ||
                         failedNodeData.parameters?.workflowId;

        if (targetId) {
          const targetName = wfCache[targetId]?.name || targetId;
          console.log(`   Sub-workflow: ${targetName} (${targetId})`);

          try {
            const subWorkflow = await this.makeRequest(`/workflows/${targetId}`);
            console.log(`   Nombre completo: ${subWorkflow.name}`);

            // Buscar nodos Code en el sub-workflow
            const codeNodes = analyzers.extractCodeNodes(subWorkflow);
            if (codeNodes.length > 0) {
              console.log(`   Nodos Code: ${codeNodes.length}`);

              for (const cn of codeNodes) {
                const issues = analyzers.analyzeCodeIssues(cn.code);
                if (issues.length > 0) {
                  console.log(`\n   ⚠️  Problemas en nodo "${cn.name}":`);
                  issues.forEach(issue => {
                    console.log(`      - L${issue.line}: ${issue.type} (${issue.variable})`);
                    if (issue.suggestion) {
                      console.log(`        💡 ${issue.suggestion}`);
                    }
                  });
                }

                if (analysis.error?.message) {
                  const context = analyzers.extractErrorCodeContext(cn.code, analysis.error.message);
                  if (context.found) {
                    console.log(`\n   📍 Código relevante en "${cn.name}" (L${context.errorLine}):`);
                    console.log('   ' + '─'.repeat(60));
                    context.lines.forEach(l => {
                      const marker = l.isError ? ' → ' : '   ';
                      console.log(`   ${marker}${String(l.number).padStart(4)}: ${l.text}`);
                    });
                    console.log('   ' + '─'.repeat(60));
                  }
                }
              }
            }
          } catch (err) {
            console.log(`   ⚠️  No se pudo obtener sub-workflow: ${err.message}`);
          }
        }
      } else if (failedNodeData?.type === 'n8n-nodes-base.code') {
        const code = failedNodeData.parameters?.jsCode;
        if (code && analysis.error?.message) {
          const context = analyzers.extractErrorCodeContext(code, analysis.error.message);
          if (context.found) {
            console.log(`\n📍 Código relevante (L${context.errorLine}):`);
            console.log('─'.repeat(80));
            context.lines.forEach(l => {
              const marker = l.isError ? ' → ' : '   ';
              console.log(`${marker}${String(l.number).padStart(4)}: ${l.text}`);
            });
            console.log('─'.repeat(80));
          }
        }
      }
    }

    // Mostrar cadena de nodos ejecutados
    if (analysis.nodeChain.length > 0) {
      console.log('\n📦 CADENA DE EJECUCIÓN (nodos ejecutados):');
      console.log('─'.repeat(80));
      analysis.nodeChain.forEach((node, idx) => {
        const icon = node.status === 'error' ? '❌' : '✅';
        const time = node.executionTime ? `${node.executionTime}ms` : '';
        console.log(`   ${idx + 1}. ${icon} ${node.name} ${time}`);
        if (node.error) {
          console.log(`      └─ ${node.error.substring(0, 70)}`);
        }
      });
    }

    // Resumen y acciones recomendadas
    console.log('\n' + '═'.repeat(80));
    console.log('📋 RESUMEN:');
    if (isSubWorkflow && parentExecution) {
      console.log(`   • Este es un SUB-WORKFLOW llamado desde ${parentExecution.workflowName}`);
      console.log(`   • El error puede ser causado por parámetros faltantes del padre`);
      console.log(`   • Investiga la ejecución padre: ${parentExecution.executionId}`);
    }
    console.log(`   • Nodo que falló: ${analysis.failedNode}`);
    console.log(`   • Error: ${analysis.error?.message?.substring(0, 60) || 'Sin mensaje'}`);
    console.log('');

    return { ...analysis, isSubWorkflow, parentExecution, triggerInput };
  }

  /**
   * Inspeccionar código de nodos Code en un workflow remoto
   */
  async inspectCode(workflowId, nodeFilter = null) {
    console.log(`🔍 Inspeccionando código del workflow: ${workflowId}`);
    if (nodeFilter) console.log(`   Filtro: "${nodeFilter}"`);
    console.log('');

    const workflow = await this.makeRequest(`/workflows/${workflowId}`);
    const codeNodes = analyzers.extractCodeNodes(workflow, nodeFilter);

    if (codeNodes.length === 0) {
      console.log(nodeFilter
        ? `❌ No se encontraron nodos Code que contengan "${nodeFilter}"`
        : '❌ No hay nodos Code en este workflow');

      // Listar nodos disponibles
      const allCode = analyzers.extractCodeNodes(workflow);
      if (allCode.length > 0) {
        console.log('\n📋 Nodos Code disponibles:');
        allCode.forEach(n => console.log(`   - ${n.name}`));
      }
      return [];
    }

    console.log(`✅ Encontrados: ${codeNodes.length} nodo(s) Code\n`);

    codeNodes.forEach((node, idx) => {
      console.log('━'.repeat(70));
      console.log(`${idx + 1}. ${node.name} (${node.lines} líneas)`);
      console.log('━'.repeat(70));
      if (node.disabled) console.log('⚠️  NODO DESHABILITADO\n');

      // Analizar problemas en el código
      const issues = analyzers.analyzeCodeIssues(node.code);
      if (issues.length > 0) {
        console.log('⚠️  PROBLEMAS DETECTADOS:');
        issues.forEach(issue => {
          const icon = issue.severity === 'ERROR' ? '🔴' : '🟡';
          console.log(`   ${icon} L${issue.line}: ${issue.type} - ${issue.variable}`);
          if (issue.suggestion) console.log(`      💡 ${issue.suggestion}`);
        });
        console.log('');
      }

      console.log('📝 CÓDIGO:');
      console.log('─'.repeat(70));
      console.log(node.code);
      console.log('─'.repeat(70));
      console.log('');
    });

    return codeNodes;
  }

  /**
   * Mostrar árbol de dependencias de sub-workflows
   */
  async followChain(workflowId) {
    console.log(`🔗 Árbol de dependencias: ${workflowId}\n`);

    const fetchWorkflow = async (id) => {
      return await this.makeRequest(`/workflows/${id}`);
    };

    const tree = await analyzers.buildDependencyTree(workflowId, fetchWorkflow);

    const printTree = (node, indent = '') => {
      const status = node.error ? '❌' : (node.active ? '✅' : '⚪');
      const info = node.nodeCount ? `(${node.nodeCount} nodos)` : '';
      console.log(`${indent}${status} ${node.name} ${info}`);

      if (node.calledVia) {
        console.log(`${indent}   └─ via: ${node.calledVia}`);
      }

      node.children?.forEach((child, idx) => {
        const isLast = idx === node.children.length - 1;
        const newIndent = indent + (isLast ? '   ' : '│  ');
        printTree(child, newIndent);
      });
    };

    console.log('🌳 ÁRBOL DE DEPENDENCIAS:');
    console.log('─'.repeat(70));
    printTree(tree);
    console.log('');

    // Resumen
    const countNodes = (node) => {
      let count = 1;
      node.children?.forEach(c => count += countNodes(c));
      return count;
    };
    console.log(`📊 Total workflows en cadena: ${countNodes(tree)}`);

    return tree;
  }

  /**
   * Análisis completo de integridad de un workflow
   */
  async analyzeWorkflow(workflowId) {
    console.log(`📊 Análisis completo del workflow: ${workflowId}\n`);

    const workflow = await this.makeRequest(`/workflows/${workflowId}`);
    const report = analyzers.generateFullAnalysis(workflow);

    // Header
    const scoreIcon = report.integrityScore >= 80 ? '✅' : report.integrityScore >= 50 ? '⚠️' : '❌';
    console.log('╔' + '═'.repeat(68) + '╗');
    console.log(`║ ${scoreIcon} SCORE DE INTEGRIDAD: ${report.integrityScore}/100`.padEnd(69) + '║');
    console.log('╠' + '═'.repeat(68) + '╣');
    console.log(`║ Nombre:      ${report.basic.name.substring(0, 52).padEnd(52)} ║`);
    console.log(`║ ID:          ${report.basic.id.padEnd(52)} ║`);
    console.log(`║ Activo:      ${(report.basic.active ? 'Sí' : 'No').padEnd(52)} ║`);
    console.log(`║ Nodos:       ${String(report.basic.nodeCount).padEnd(52)} ║`);
    console.log('╚' + '═'.repeat(68) + '╝');

    // Dead Ends
    if (report.deadEnds.length > 0) {
      console.log('\n❌ DEAD ENDS:');
      console.log('─'.repeat(70));
      report.deadEnds.forEach(d => {
        const icon = d.severity === 'CRITICAL' ? '🔴' : '🟡';
        console.log(`   ${icon} ${d.node}: ${d.reason}`);
      });
    }

    // Loops
    if (report.loops.issues.length > 0) {
      console.log('\n🔄 PROBLEMAS EN LOOPS:');
      console.log('─'.repeat(70));
      report.loops.issues.forEach(i => {
        const icon = i.severity === 'CRITICAL' ? '🔴' : '🟡';
        console.log(`   ${icon} ${i.node}: ${i.message}`);
      });
    }

    // Orphaned
    if (report.orphaned.length > 0) {
      console.log('\n⚠️  NODOS HUÉRFANOS:');
      console.log('─'.repeat(70));
      report.orphaned.forEach(o => {
        console.log(`   ${o.node}: ${o.issue}`);
      });
    }

    // IF Validation
    if (report.ifValidation.issues.length > 0) {
      console.log('\n🔀 PROBLEMAS EN IF/SWITCH:');
      console.log('─'.repeat(70));
      report.ifValidation.issues.forEach(i => {
        console.log(`   ${i.node}: ${i.issue}`);
      });
    }

    // Code Issues
    if (report.codeIssues.length > 0) {
      console.log('\n📝 PROBLEMAS EN CÓDIGO:');
      console.log('─'.repeat(70));
      report.codeIssues.forEach(ci => {
        console.log(`   ${ci.node}:`);
        ci.issues.forEach(issue => {
          console.log(`      - L${issue.line}: ${issue.type} (${issue.variable})`);
        });
      });
    }

    // Sub-workflows
    if (report.subWorkflows.length > 0) {
      console.log('\n🔗 SUB-WORKFLOWS LLAMADOS:');
      console.log('─'.repeat(70));
      report.subWorkflows.forEach(sw => {
        console.log(`   ${sw.node} → ${sw.targetName || sw.targetWorkflowId}`);
      });
    }

    // Resumen
    const totalIssues = report.deadEnds.filter(d => d.severity === 'CRITICAL').length +
                        report.loops.issues.filter(i => i.severity === 'CRITICAL').length +
                        report.orphaned.filter(o => o.severity === 'CRITICAL').length +
                        report.codeIssues.reduce((sum, ci) => sum + ci.issues.filter(i => i.severity === 'ERROR').length, 0);

    console.log('\n' + '═'.repeat(70));
    if (totalIssues === 0) {
      console.log('✅ No se encontraron problemas críticos');
    } else {
      console.log(`❌ Problemas críticos: ${totalIssues}`);
    }
    console.log('');

    return report;
  }

  // ══════════════════════════════════════════════════════════════
  // COMANDOS DE TRACKING (v3.1)
  // ══════════════════════════════════════════════════════════════

  /**
   * Buscar ejecuciones por customData (ej: whatsapp de un contacto)
   * Esto permite rastrear todas las ejecuciones relacionadas a un contacto
   * 
   * @param {string} key - Clave a buscar (ej: "whatsapp")
   * @param {string} value - Valor a buscar (ej: "5215537034281")
   * @param {number} limit - Límite de ejecuciones a revisar
   */
  async trackByCustomData(key, value, limit = 100) {
    console.log(`🔍 Buscando ejecuciones con ${key}="${value}"`);
    console.log(`   Revisando últimas ${limit} ejecuciones...\n`);

    // Obtener ejecuciones recientes (necesitamos includeData para ver customData)
    // La API no tiene filtro por customData, así que traemos varias y filtramos
    const result = await this.makeRequest(`/executions?limit=${limit}&includeData=true`);
    const allExecutions = result.data || [];

    // Filtrar por customData
    const matches = allExecutions.filter(exec => {
      // Revisar customData a nivel raíz
      if (exec.customData?.[key] === value) return true;
      // Revisar metadata en resultData
      if (exec.data?.resultData?.metadata?.[key] === value) return true;
      return false;
    });

    if (matches.length === 0) {
      console.log(`⚠️  No se encontraron ejecuciones con ${key}="${value}"`);
      console.log(`   Revisadas: ${allExecutions.length} ejecuciones`);
      console.log(`\n💡 Tips:`);
      console.log(`   - El workflow debe usar $execution.customData.set("${key}", valor)`);
      console.log(`   - Solo workflows recientes (dentro del límite) serán encontrados`);
      console.log(`   - Aumenta el límite con: track-contact <valor> <límite>`);
      return [];
    }

    // Agrupar por workflow
    const byWorkflow = {};
    matches.forEach(exec => {
      const wfName = exec.workflowData?.name || exec.workflowId || 'Desconocido';
      if (!byWorkflow[wfName]) byWorkflow[wfName] = [];
      byWorkflow[wfName].push(exec);
    });

    console.log('╔' + '═'.repeat(78) + '╗');
    console.log(`║ 📱 TRACKING: ${key}="${value}"`.padEnd(79) + '║');
    console.log(`║    Encontradas: ${matches.length} ejecuciones en ${Object.keys(byWorkflow).length} workflows`.padEnd(79) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');

    // Mostrar por workflow
    Object.entries(byWorkflow).forEach(([wfName, execs]) => {
      console.log(`\n📋 ${wfName} (${execs.length} ejecuciones)`);
      console.log('─'.repeat(80));
      console.log('│ Estado  │ Fecha                  │ Duración │ ID         │ Modo     │');
      console.log('├─────────┼────────────────────────┼──────────┼────────────┼──────────┤');

      execs.forEach(exec => {
        const statusIcon = this.getStatusIcon(exec.status).substring(0, 7);
        const date = new Date(exec.startedAt).toLocaleString().substring(0, 22);
        const duration = this.calculateDuration(exec).padStart(8);
        const id = exec.id.substring(0, 10);
        const mode = (exec.mode || 'N/A').substring(0, 8);

        console.log(`│ ${statusIcon.padEnd(7)} │ ${date.padEnd(22)} │ ${duration} │ ${id.padEnd(10)} │ ${mode.padEnd(8)} │`);
      });
    });

    // Timeline cronológico
    console.log('\n\n📅 TIMELINE CRONOLÓGICO:');
    console.log('═'.repeat(80));

    const sorted = matches.sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
    sorted.forEach((exec, idx) => {
      const time = new Date(exec.startedAt).toLocaleString();
      const wfName = (exec.workflowData?.name || exec.workflowId || '?').substring(0, 40);
      const status = exec.status === 'success' ? '✅' : exec.status === 'error' ? '❌' : '⏳';
      const duration = this.calculateDuration(exec);

      console.log(`${idx + 1}. ${time} ${status} ${wfName}`);
      console.log(`   └─ ID: ${exec.id} | Duración: ${duration}`);

      // Si hubo error, mostrar mensaje breve
      if (exec.status === 'error' && exec.data?.resultData?.error?.message) {
        const errMsg = exec.data.resultData.error.message.substring(0, 60);
        console.log(`   └─ ⚠️  ${errMsg}`);
      }
    });

    // Resumen
    const stats = {
      success: matches.filter(e => e.status === 'success').length,
      error: matches.filter(e => e.status === 'error').length,
      other: matches.filter(e => !['success', 'error'].includes(e.status)).length
    };

    console.log('\n' + '═'.repeat(80));
    console.log(`📊 RESUMEN: ✅ ${stats.success} exitosas | ❌ ${stats.error} fallidas | ⏳ ${stats.other} otras`);
    
    if (stats.error > 0) {
      console.log('\n💡 Para ver detalles de errores:');
      const errorExec = matches.find(e => e.status === 'error');
      if (errorExec) {
        console.log(`   node scripts/n8n-cli.js trace-error ${errorExec.id}`);
      }
    }

    return matches;
  }

  /**
   * Shortcut para buscar por whatsapp (el caso más común)
   */
  async trackContact(whatsapp, limit = 100) {
    // Normalizar número (quitar + y espacios)
    const normalized = whatsapp.replace(/[+\s-]/g, '');
    return this.trackByCustomData('whatsapp', normalized, limit);
  }

  // ══════════════════════════════════════════════════════════════
  // UTILIDADES
  // ══════════════════════════════════════════════════════════════

  getStatusIcon(status) {
    switch (status) {
      case 'success': return '✅ OK';
      case 'error': return '❌ Error';
      case 'waiting': return '⏳ Wait';
      case 'running': return '🔄 Run';
      default: return '❓ ' + status;
    }
  }

  calculateDuration(exec) {
    if (!exec.startedAt || !exec.stoppedAt) return 'N/A';
    const duration = (new Date(exec.stoppedAt) - new Date(exec.startedAt)) / 1000;
    if (duration < 1) return `${(duration * 1000).toFixed(0)}ms`;
    if (duration < 60) return `${duration.toFixed(1)}s`;
    return `${(duration / 60).toFixed(1)}m`;
  }

  async outputJson(data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const jsonOutput = args.includes('--json');
  const cli = new N8nCLI({ silent: jsonOutput });
  const filteredArgs = args.filter(a => a !== '--json');

  try {
    switch (command) {
      // Conexión
      case 'test':
        await cli.testConnection();
        break;

      // Workflows
      case 'list':
      case 'ls':
        const workflows = await cli.listWorkflows();
        if (jsonOutput) await cli.outputJson(workflows);
        break;

      case 'get':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar el ID del workflow');
          console.log('Uso: node scripts/n8n-cli.js get <workflow-id>');
          process.exit(1);
        }
        const workflow = await cli.getWorkflow(filteredArgs[1]);
        if (jsonOutput) await cli.outputJson(workflow);
        break;

      case 'search':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar el término de búsqueda');
          process.exit(1);
        }
        const searchResults = await cli.searchWorkflows(filteredArgs[1]);
        if (jsonOutput) await cli.outputJson(searchResults);
        break;

      case 'activate':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar el ID del workflow');
          process.exit(1);
        }
        const activated = await cli.activateWorkflow(filteredArgs[1]);
        if (jsonOutput) await cli.outputJson(activated);
        break;

      case 'deactivate':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar el ID del workflow');
          process.exit(1);
        }
        const deactivated = await cli.deactivateWorkflow(filteredArgs[1]);
        if (jsonOutput) await cli.outputJson(deactivated);
        break;

      case 'create':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar la ruta del archivo JSON');
          process.exit(1);
        }
        const fs = require('fs');
        const createPath = filteredArgs[1];
        if (!fs.existsSync(createPath)) {
          console.error(`❌ Error: Archivo no encontrado: ${createPath}`);
          process.exit(1);
        }
        const createData = JSON.parse(fs.readFileSync(createPath, 'utf8'));
        const created = await cli.createWorkflow(createData);
        if (jsonOutput) await cli.outputJson(created);
        break;

      case 'update':
        if (!filteredArgs[1] || !filteredArgs[2]) {
          console.error('❌ Error: Debes especificar el ID del workflow y la ruta del JSON');
          console.log('Uso: node scripts/n8n-cli.js update <workflow-id> <path-to-json>');
          process.exit(1);
        }
        const fsUpdate = require('fs');
        const updatePath = filteredArgs[2];
        if (!fsUpdate.existsSync(updatePath)) {
          console.error(`❌ Error: Archivo no encontrado: ${updatePath}`);
          process.exit(1);
        }
        const updateData = JSON.parse(fsUpdate.readFileSync(updatePath, 'utf8'));
        const updated = await cli.updateWorkflow(filteredArgs[1], updateData);
        if (jsonOutput) await cli.outputJson(updated);
        break;

      // Ejecuciones
      case 'executions':
      case 'exec':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar el ID del workflow');
          process.exit(1);
        }
        const limit = parseInt(filteredArgs[2]) || 20;
        const executions = await cli.getExecutions(filteredArgs[1], limit);
        if (jsonOutput) await cli.outputJson(executions);
        break;

      case 'execution':
      case 'exec-detail':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar el ID de la ejecución');
          process.exit(1);
        }
        const execDetail = await cli.getExecutionDetail(filteredArgs[1]);
        if (jsonOutput) await cli.outputJson(execDetail);
        break;

      case 'exec-data':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar el ID de la ejecución');
          process.exit(1);
        }
        // Opciones: --full, --node "nombre"
        const execDataFull = args.includes('--full');
        const nodeArgIdx = args.indexOf('--node');
        const execDataNodeFilter = nodeArgIdx !== -1 ? args[nodeArgIdx + 1] : null;
        const execData = await cli.getExecutionData(filteredArgs[1], {
          full: execDataFull,
          nodeFilter: execDataNodeFilter
        });
        if (jsonOutput) await cli.outputJson(execData);
        break;

      case 'exec-node':
        if (!filteredArgs[1] || !filteredArgs[2]) {
          console.error('❌ Error: Debes especificar el ID de ejecución y nombre del nodo');
          console.log('Uso: node scripts/n8n-cli.js exec-node <exec-id> <node-name> [--save archivo.json]');
          process.exit(1);
        }
        const saveArgIdx = args.indexOf('--save');
        const saveFile = saveArgIdx !== -1 ? args[saveArgIdx + 1] : null;
        const nodeData = await cli.getNodeData(filteredArgs[1], filteredArgs[2], { saveToFile: saveFile });
        if (jsonOutput) await cli.outputJson(nodeData);
        break;

      case 'exec-save':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar el ID de la ejecución');
          console.log('Uso: node scripts/n8n-cli.js exec-save <exec-id> [output-path.json]');
          process.exit(1);
        }
        const savedExec = await cli.saveExecution(filteredArgs[1], filteredArgs[2] || null);
        if (jsonOutput) await cli.outputJson(savedExec);
        break;

      case 'exec-errors':
      case 'errors':
        // Parsear flags: --hours N, --limit N, --no-manual, --include-manual
        let errWfId = null;
        let errLimit = 50;
        let errHours = null;
        let excludeManual = true; // Por defecto excluye ejecuciones manuales

        for (let i = 1; i < filteredArgs.length; i++) {
          const arg = filteredArgs[i];
          if (arg === '--hours' && filteredArgs[i + 1]) {
            errHours = parseInt(filteredArgs[i + 1]);
            i++; // Skip next arg
          } else if (arg === '--limit' && filteredArgs[i + 1]) {
            errLimit = parseInt(filteredArgs[i + 1]);
            i++; // Skip next arg
          } else if (arg === '--no-manual') {
            excludeManual = true;
          } else if (arg === '--include-manual' || arg === '--all') {
            excludeManual = false;
          } else if (!arg.startsWith('--')) {
            // Es un workflow ID
            errWfId = arg;
          }
        }

        const errors = await cli.getExecutionErrors(errWfId, errLimit, errHours, excludeManual);
        if (jsonOutput) await cli.outputJson(errors);
        break;

      case 'exec-delete':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar el ID de la ejecución');
          process.exit(1);
        }
        await cli.deleteExecution(filteredArgs[1]);
        break;

      case 'metrics':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar el ID del workflow');
          process.exit(1);
        }
        const days = parseInt(filteredArgs[2]) || 30;
        const metrics = await cli.getMetrics(filteredArgs[1], days);
        if (jsonOutput) await cli.outputJson(metrics);
        break;

      // Recursos
      case 'credentials':
      case 'creds':
        const creds = await cli.listCredentials();
        if (jsonOutput) await cli.outputJson(creds);
        break;

      case 'tags':
        const tags = await cli.listTags();
        if (jsonOutput) await cli.outputJson(tags);
        break;

      case 'variables':
      case 'vars':
        const vars = await cli.listVariables();
        if (jsonOutput) await cli.outputJson(vars);
        break;

      // Prompts
      case 'prompts':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar el ID del workflow');
          process.exit(1);
        }
        const prompts = await cli.extractPrompts(filteredArgs[1]);
        if (jsonOutput) await cli.outputJson(prompts);
        break;

      // ══════════════════════════════════════════════════════════════
      // COMANDOS DE ANÁLISIS (v3.0)
      // ══════════════════════════════════════════════════════════════

      case 'trace-error':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar el ID de la ejecución');
          console.log('Uso: node scripts/n8n-cli.js trace-error <exec-id>');
          process.exit(1);
        }
        const traceResult = await cli.traceError(filteredArgs[1]);
        if (jsonOutput) await cli.outputJson(traceResult);
        break;

      case 'inspect-code':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar el ID del workflow');
          console.log('Uso: node scripts/n8n-cli.js inspect-code <workflow-id> [nombre-nodo]');
          process.exit(1);
        }
        const codeNodes = await cli.inspectCode(filteredArgs[1], filteredArgs[2] || null);
        if (jsonOutput) await cli.outputJson(codeNodes);
        break;

      case 'follow-chain':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar el ID del workflow');
          console.log('Uso: node scripts/n8n-cli.js follow-chain <workflow-id>');
          process.exit(1);
        }
        const chain = await cli.followChain(filteredArgs[1]);
        if (jsonOutput) await cli.outputJson(chain);
        break;

      case 'analyze':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar el ID del workflow');
          console.log('Uso: node scripts/n8n-cli.js analyze <workflow-id>');
          process.exit(1);
        }
        const analysisReport = await cli.analyzeWorkflow(filteredArgs[1]);
        if (jsonOutput) await cli.outputJson(analysisReport);
        break;

      // ══════════════════════════════════════════════════════════════
      // COMANDOS DE TRACKING (v3.1)
      // ══════════════════════════════════════════════════════════════

      case 'track-contact':
      case 'track':
        if (!filteredArgs[1]) {
          console.error('❌ Error: Debes especificar el número de WhatsApp');
          console.log('Uso: node scripts/n8n-cli.js track-contact <whatsapp> [limit]');
          console.log('Ejemplo: node scripts/n8n-cli.js track-contact 5215537034281');
          process.exit(1);
        }
        const trackLimit = parseInt(filteredArgs[2]) || 100;
        const trackResult = await cli.trackContact(filteredArgs[1], trackLimit);
        if (jsonOutput) await cli.outputJson(trackResult);
        break;

      case 'track-by':
        if (!filteredArgs[1] || !filteredArgs[2]) {
          console.error('❌ Error: Debes especificar key y valor');
          console.log('Uso: node scripts/n8n-cli.js track-by <key> <value> [limit]');
          console.log('Ejemplo: node scripts/n8n-cli.js track-by whatsapp 5215537034281');
          process.exit(1);
        }
        const trackByLimit = parseInt(filteredArgs[3]) || 100;
        const trackByResult = await cli.trackByCustomData(filteredArgs[1], filteredArgs[2], trackByLimit);
        if (jsonOutput) await cli.outputJson(trackByResult);
        break;

      // Ayuda
      case 'help':
      case '--help':
      case '-h':
      default:
        console.log(`
╔════════════════════════════════════════════════════════════════════╗
║          n8n CLI - Contract Validation (v3.3-cv)                   ║
║          Server: primary-er1n-dev.up.railway.app                   ║
╚════════════════════════════════════════════════════════════════════╝

📋 WORKFLOWS
  list, ls                    Listar todos los workflows
  get <id>                    Obtener detalles de un workflow
  search <query>              Buscar workflows por nombre/tags
  activate <id>               Activar un workflow
  deactivate <id>             Desactivar un workflow
  create <json-file>          Crear workflow desde archivo JSON
  update <id> <json-file>     Actualizar workflow existente

📊 EJECUCIONES
  executions <id> [limit]     Ver ejecuciones de un workflow (default: 20)
  execution <exec-id>         Ver detalle/resumen de una ejecución
  exec-data <exec-id>         Ver datos de entrada/salida (truncados)
    --full                    No truncar datos
    --node "nombre"           Filtrar por nombre de nodo
  exec-node <exec-id> <nodo>  Ver input/output COMPLETO de un nodo
    --save archivo.json       Guardar resultado a archivo
  exec-save <exec-id> [path]  Guardar ejecución completa a JSON
  exec-errors [wf-id] [--hours N] [--limit N]  Ver ejecuciones con errores
                      [--include-manual]      Incluir ejecuciones manuales (excluidas por defecto)
  exec-delete <exec-id>       Eliminar una ejecución
  metrics <id> [days]         Ver métricas (default: 30 días)

🔍 ANÁLISIS ─────────────────────────────────────────────────────────
  trace-error <exec-id>       Análisis forense de error
                              • Detecta nodo fallido
                              • Extrae código relevante
                              • Sigue cadena de sub-workflows

  inspect-code <wf-id> [nodo] Inspeccionar código de nodos Code
                              • Detecta problemas (variables duplicadas, etc.)
                              • Filtra por nombre de nodo

  follow-chain <wf-id>        Árbol de dependencias
                              • Muestra sub-workflows llamados
                              • Resuelve nombres y estados

  analyze <wf-id>             Análisis completo de integridad
                              • Dead ends, loops rotos
                              • Nodos huérfanos
                              • Problemas en código
                              • Score de integridad (0-100)

📱 TRACKING DE CONTACTOS (v3.1) ─────────────────────────────────────
  track-contact <whatsapp>    Buscar todas las ejecuciones de un contacto
    [limit]                   por su número de WhatsApp (default: 100)
                              • Timeline cronológico
                              • Agrupado por workflow
                              • Detecta errores

  track-by <key> <value>      Buscar por cualquier customData
    [limit]                   Ej: track-by whatsapp 5215537034281

🔧 RECURSOS
  credentials, creds          Listar credenciales
  tags                        Listar tags
  variables, vars             Listar variables de entorno

🤖 AI/VAPI
  prompts <id>                Extraer prompts de un workflow

🔗 CONEXIÓN
  test                        Probar conexión con n8n

⚙️  OPCIONES
  --json                      Salida en formato JSON

📝 EJEMPLOS ─────────────────────────────────────────────────────────

  # Tracking de contactos (NUEVO v3.1)
  node scripts/n8n-cli.js track-contact 5215537034281
  node scripts/n8n-cli.js track-contact +52 1 553 703 4281 200
  node scripts/n8n-cli.js track-by whatsapp 5215537034281

  # Debugging rápido de errores
  node scripts/n8n-cli.js trace-error 420446
  node scripts/n8n-cli.js inspect-code qJOzay37hj4AYHQf "Audit"
  node scripts/n8n-cli.js follow-chain qJOzay37hj4AYHQf
  node scripts/n8n-cli.js analyze qJOzay37hj4AYHQf

  # Workflows
  node scripts/n8n-cli.js list
  node scripts/n8n-cli.js get abc123
  node scripts/n8n-cli.js search "vapi"

  # Ejecuciones
  node scripts/n8n-cli.js executions abc123 50
  node scripts/n8n-cli.js execution exec-456
  node scripts/n8n-cli.js exec-node 383172 "Claude API"

🔐 VARIABLES DE ENTORNO
  N8N_API_URL                 URL de la API de n8n
  N8N_API_TOKEN               Token de autenticación (REQUERIDO)
`);
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (process.env.DEBUG) console.error(error.stack);
    process.exit(1);
  }
}

main();
