#!/usr/bin/env node
/**
 * Utilidades compartidas para scripts de análisis N8N
 * Centraliza código duplicado entre múltiples herramientas
 *
 * @module scripts/lib/utils
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// ============================================
// COLORES ANSI PARA TERMINAL
// ============================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  white: '\x1b[37m'
};

/**
 * Aplica color a un texto para terminal
 * @param {string} color - Nombre del color (green, red, blue, etc.)
 * @param {string} text - Texto a colorear
 * @returns {string} Texto con códigos ANSI
 */
function c(color, text) {
  return `${colors[color] || ''}${text}${colors.reset}`;
}

// ============================================
// FUNCIONES DE UI
// ============================================

/**
 * Dibuja un box con título en terminal
 * @param {string} title - Título del box
 * @param {number} width - Ancho del box (default: 64)
 */
function box(title, width = 64) {
  console.log('\n╔' + '═'.repeat(width) + '╗');
  console.log('║' + title.padEnd(width) + '║');
  console.log('╚' + '═'.repeat(width) + '╝\n');
}

/**
 * Dibuja una línea separadora
 * @param {number} width - Ancho de la línea
 * @param {string} char - Carácter a usar (default: ─)
 */
function separator(width = 60, char = '─') {
  console.log(char.repeat(width));
}

/**
 * Muestra un mensaje de éxito
 * @param {string} message - Mensaje a mostrar
 */
function success(message) {
  console.log(c('green', '✅ ' + message));
}

/**
 * Muestra un mensaje de error
 * @param {string} message - Mensaje a mostrar
 */
function error(message) {
  console.log(c('red', '❌ ' + message));
}

/**
 * Muestra un mensaje de advertencia
 * @param {string} message - Mensaje a mostrar
 */
function warn(message) {
  console.log(c('yellow', '⚠️  ' + message));
}

/**
 * Muestra un mensaje informativo
 * @param {string} message - Mensaje a mostrar
 */
function info(message) {
  console.log(c('cyan', 'ℹ️  ' + message));
}

// ============================================
// FUNCIONES DE ARCHIVOS
// ============================================

/**
 * Carga y parsea un archivo JSON
 * @param {string} filePath - Ruta al archivo JSON
 * @returns {Object|null} Objeto parseado o null si hay error
 */
function loadJSON(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    const content = fs.readFileSync(absolutePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    error(`Error cargando JSON: ${e.message}`);
    return null;
  }
}

/**
 * Guarda un objeto como JSON
 * @param {string} filePath - Ruta al archivo
 * @param {Object} data - Datos a guardar
 * @param {boolean} pretty - Si formatear con indentación (default: true)
 * @returns {boolean} true si se guardó correctamente
 */
function saveJSON(filePath, data, pretty = true) {
  try {
    const absolutePath = path.resolve(filePath);
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    fs.writeFileSync(absolutePath, content, 'utf8');
    return true;
  } catch (e) {
    error(`Error guardando JSON: ${e.message}`);
    return false;
  }
}

/**
 * Carga el workflow_map.json (para herramientas legacy)
 * @param {string} mapPath - Ruta al archivo (default: ./workflow_map.json)
 * @returns {Object|null} Mapa de workflows o null
 */
function loadWorkflowMap(mapPath = './workflow_map.json') {
  const data = loadJSON(mapPath);
  return data ? data.workflowMap : null;
}

// ============================================
// DETECCIÓN DE FRAGMENTOS
// ============================================

/**
 * Detecta si un JSON es un fragmento de workflow o uno completo
 * @param {Object} data - Datos del workflow
 * @returns {Object} { isFragment: boolean, reason: string, score: number }
 */
function detectFragmentStatus(data) {
  const checks = {
    hasMeta: !!data.meta,
    hasName: !!data.name,
    hasId: !!data.id,
    hasActive: typeof data.active === 'boolean',
    hasSettings: !!data.settings,
    hasNodes: Array.isArray(data.nodes) && data.nodes.length > 0,
    hasConnections: !!data.connections
  };

  const requiredForComplete = ['hasMeta', 'hasName', 'hasId', 'hasActive', 'hasSettings'];
  const missingRequired = requiredForComplete.filter(check => !checks[check]);

  const score = Object.values(checks).filter(Boolean).length;
  const maxScore = Object.keys(checks).length;

  if (missingRequired.length === 0 && checks.hasNodes) {
    return {
      isFragment: false,
      reason: 'Workflow completo con todos los campos requeridos',
      score: score,
      maxScore: maxScore
    };
  }

  return {
    isFragment: true,
    reason: `Faltan campos: ${missingRequired.join(', ')}`,
    score: score,
    maxScore: maxScore,
    missing: missingRequired
  };
}

// ============================================
// ANÁLISIS DE WORKFLOWS
// ============================================

/**
 * Detecta triggers en un array de nodos
 * @param {Array} nodes - Array de nodos del workflow
 * @returns {Array} Nodos que son triggers
 */
function detectTriggers(nodes) {
  const triggerTypes = [
    'n8n-nodes-base.webhook',
    'n8n-nodes-base.scheduleTrigger',
    'n8n-nodes-base.manualTrigger',
    'n8n-nodes-base.emailTrigger',
    'n8n-nodes-base.httpRequestTrigger',
    '@n8n/n8n-nodes-langchain.chatTrigger'
  ];

  return nodes.filter(n =>
    triggerTypes.some(type => n.type === type || n.type?.includes('Trigger'))
  );
}

/**
 * Detecta nodos que llaman a sub-workflows
 * @param {Array} nodes - Array de nodos
 * @returns {Array} Nodos de tipo executeWorkflow
 */
function detectSubWorkflowCalls(nodes) {
  return nodes.filter(n =>
    n.type === 'n8n-nodes-base.executeWorkflow' ||
    n.type?.includes('executeWorkflow')
  );
}

/**
 * Extrae IDs de workflows llamados desde nodos executeWorkflow
 * @param {Array} nodes - Array de nodos
 * @returns {Array} IDs de workflows llamados
 */
function extractCalledWorkflowIds(nodes) {
  const executeNodes = detectSubWorkflowCalls(nodes);
  return executeNodes
    .map(n => n.parameters?.workflowId || n.parameters?.workflow?.value)
    .filter(Boolean);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Colores
  colors,
  c,

  // UI
  box,
  separator,
  success,
  error,
  warn,
  info,

  // Archivos
  loadJSON,
  saveJSON,
  loadWorkflowMap,

  // Detección
  detectFragmentStatus,
  detectTriggers,
  detectSubWorkflowCalls,
  extractCalledWorkflowIds
};
