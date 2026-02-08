/**
 * ANALYZERS - Funciones de análisis de workflows N8N
 *
 * Módulo centralizado con todas las funciones de análisis.
 * Usado por el CLI y puede ser importado por otros scripts.
 *
 * @version 1.0.0
 */

// ============================================================================
// ANÁLISIS DE ESTRUCTURA
// ============================================================================

/**
 * Detectar si es fragmento o workflow completo
 */
function detectFragmentStatus(workflow) {
  const warnings = [];
  const checks = {
    hasMeta: !!workflow.meta,
    hasName: !!workflow.name,
    hasId: !!workflow.id,
    hasActive: workflow.active !== undefined,
    hasSettings: !!workflow.settings,
    hasNodes: Array.isArray(workflow.nodes) && workflow.nodes.length > 0,
    hasConnections: !!workflow.connections
  };

  if (!checks.hasMeta) warnings.push('Sin metadata (meta)');
  if (!checks.hasName) warnings.push('Sin nombre de workflow');
  if (!checks.hasId) warnings.push('Sin ID de workflow');
  if (!checks.hasActive) warnings.push('Sin estado activo/inactivo');
  if (!checks.hasSettings) warnings.push('Sin settings');

  return {
    isFragment: warnings.length > 0,
    isComplete: warnings.length === 0,
    warnings,
    checks
  };
}

/**
 * Encontrar dead ends (nodos sin salida que deberían tener)
 */
function findDeadEnds(workflow) {
  const deadEnds = [];
  const { nodes, connections } = workflow;

  const mustHaveOutput = [
    'code', 'if', 'switch', 'merge', 'splitInBatches',
    'set', 'httpRequest', 'postgres', 'supabase', 'redis'
  ];

  nodes?.forEach(node => {
    const nodeType = node.type.split('.').pop().toLowerCase();
    const conns = connections?.[node.name];

    if (!conns || !conns.main) {
      if (mustHaveOutput.some(t => nodeType.includes(t))) {
        deadEnds.push({
          node: node.name,
          type: node.type,
          reason: 'Sin conexiones salientes',
          severity: 'CRITICAL'
        });
      }
      return;
    }

    conns.main.forEach((output, idx) => {
      if (Array.isArray(output) && output.length === 0) {
        const isException = nodeType.includes('aggregate') || nodeType.includes('webhook');
        if (!isException && mustHaveOutput.some(t => nodeType.includes(t))) {
          deadEnds.push({
            node: node.name,
            type: node.type,
            output: idx,
            reason: `Output ${idx} vacío`,
            severity: 'WARNING'
          });
        }
      }
    });
  });

  return deadEnds;
}

/**
 * Validar loops (Split in Batches)
 */
function validateLoops(workflow) {
  const { nodes, connections } = workflow;
  const issues = [];

  const splitNodes = nodes?.filter(n => n.type.includes('splitInBatches')) || [];

  splitNodes.forEach(splitNode => {
    const loopBackNodes = Object.entries(connections || {})
      .filter(([nodeName, conns]) => {
        return conns.main?.[0]?.some(c =>
          c.node === splitNode.name && c.index === 0
        );
      })
      .map(([name]) => name);

    if (loopBackNodes.length === 0) {
      issues.push({
        node: splitNode.name,
        type: 'BROKEN_LOOP',
        severity: 'CRITICAL',
        message: 'Split in Batches sin loop-back'
      });
    } else {
      const splitConns = connections?.[splitNode.name];
      if (!splitConns?.main?.[1] || splitConns.main[1].length === 0) {
        issues.push({
          node: splitNode.name,
          type: 'MISSING_COMPLETION',
          severity: 'WARNING',
          message: 'Sin output de finalización (output 1)'
        });
      }
    }
  });

  return { splitNodes: splitNodes.map(n => n.name), issues };
}

/**
 * Detectar nodos críticos huérfanos
 */
function findOrphanedNodes(workflow) {
  const { nodes, connections } = workflow;
  const orphaned = [];

  const criticalTypes = ['aggregate', 'merge', 'splitInBatches', 'if', 'switch'];

  nodes?.forEach(node => {
    const nodeType = node.type.split('.').pop().toLowerCase();
    const isCritical = criticalTypes.some(t => nodeType.includes(t));
    if (!isCritical) return;

    const hasInput = Object.values(connections || {}).some(conns =>
      conns.main?.some(outputs => outputs.some(o => o.node === node.name))
    );

    const hasOutput = connections?.[node.name]?.main?.some(outputs =>
      outputs && outputs.length > 0
    );

    if (!hasInput) {
      orphaned.push({ node: node.name, type: node.type, issue: 'Sin entradas', severity: 'CRITICAL' });
    }
    if (!hasOutput) {
      orphaned.push({ node: node.name, type: node.type, issue: 'Sin salidas', severity: 'WARNING' });
    }
  });

  return orphaned;
}

/**
 * Validar nodos IF/Switch
 */
function validateIfNodes(workflow) {
  const { nodes, connections } = workflow;
  const issues = [];

  const ifNodes = nodes?.filter(n =>
    n.type.includes('if') || n.type.includes('switch')
  ) || [];

  ifNodes.forEach(node => {
    const conns = connections?.[node.name];
    if (!conns?.main) {
      issues.push({ node: node.name, issue: 'Sin conexiones', severity: 'CRITICAL' });
      return;
    }

    const trueOutput = conns.main[0] || [];
    const falseOutput = conns.main[1] || [];

    if (trueOutput.length === 0) {
      issues.push({ node: node.name, issue: 'TRUE path vacío', severity: 'WARNING' });
    }
    if (falseOutput.length === 0) {
      issues.push({ node: node.name, issue: 'FALSE path vacío', severity: 'WARNING' });
    }
  });

  return { ifNodes: ifNodes.map(n => n.name), issues };
}

// ============================================================================
// INSPECCIÓN DE CÓDIGO
// ============================================================================

/**
 * Extraer código de nodos Code de un workflow
 */
function extractCodeNodes(workflow, filter = null) {
  const codeNodes = [];

  workflow.nodes?.forEach(node => {
    if (node.type !== 'n8n-nodes-base.code') return;

    if (filter) {
      const filterLower = filter.toLowerCase();
      if (!node.name.toLowerCase().includes(filterLower)) return;
    }

    const code = node.parameters?.jsCode || '';
    codeNodes.push({
      name: node.name,
      id: node.id,
      code: code,
      lines: code.split('\n').length,
      disabled: node.disabled || false
    });
  });

  return codeNodes;
}

/**
 * Analizar código para detectar problemas comunes
 */
function analyzeCodeIssues(code) {
  const issues = [];
  const lines = code.split('\n');

  // Detectar declaraciones duplicadas
  const declarations = new Map();
  const declRegex = /(const|let|var)\s+(\w+)\s*=/g;

  lines.forEach((line, idx) => {
    let match;
    declRegex.lastIndex = 0;
    while ((match = declRegex.exec(line)) !== null) {
      const varName = match[2];
      if (declarations.has(varName)) {
        issues.push({
          type: 'DUPLICATE_DECLARATION',
          variable: varName,
          line: idx + 1,
          previousLine: declarations.get(varName),
          severity: 'ERROR'
        });
      } else {
        declarations.set(varName, idx + 1);
      }
    }
  });

  // Variables que colisionan con contexto N8N
  const n8nReserved = ['source', 'input', 'output', 'data', 'items', 'node', 'workflow'];
  declarations.forEach((line, varName) => {
    if (n8nReserved.includes(varName)) {
      issues.push({
        type: 'RESERVED_VARIABLE',
        variable: varName,
        line: line,
        severity: 'WARNING',
        suggestion: `Renombrar a ${varName}Data o _${varName}`
      });
    }
  });

  return issues;
}

// ============================================================================
// DEPENDENCIAS Y SUB-WORKFLOWS
// ============================================================================

/**
 * Encontrar Execute Workflow nodes y sus targets
 */
function findSubWorkflowCalls(workflow) {
  const calls = [];

  workflow.nodes?.forEach(node => {
    if (!node.type.includes('executeWorkflow')) return;

    const workflowIdParam = node.parameters?.workflowId;
    let targetId = null;

    if (typeof workflowIdParam === 'string') {
      targetId = workflowIdParam;
    } else if (typeof workflowIdParam === 'object') {
      targetId = workflowIdParam.value || null;
    }

    if (targetId) {
      calls.push({
        node: node.name,
        nodeId: node.id,
        targetWorkflowId: targetId,
        targetName: workflowIdParam?.cachedResultName || null
      });
    }
  });

  return calls;
}

/**
 * Construir árbol de dependencias de un workflow
 */
async function buildDependencyTree(workflowId, fetchWorkflow, visited = new Set()) {
  if (visited.has(workflowId)) {
    return { id: workflowId, name: '(circular reference)', children: [] };
  }

  visited.add(workflowId);

  try {
    const workflow = await fetchWorkflow(workflowId);
    const calls = findSubWorkflowCalls(workflow);

    const children = [];
    for (const call of calls) {
      const child = await buildDependencyTree(call.targetWorkflowId, fetchWorkflow, visited);
      children.push({
        ...child,
        calledVia: call.node
      });
    }

    return {
      id: workflowId,
      name: workflow.name || workflowId,
      active: workflow.active,
      nodeCount: workflow.nodes?.length || 0,
      children
    };
  } catch (error) {
    return {
      id: workflowId,
      name: '(not found)',
      error: error.message,
      children: []
    };
  }
}

// ============================================================================
// ANÁLISIS DE ERRORES
// ============================================================================

/**
 * Analizar una ejecución con error
 */
function analyzeExecutionError(execution) {
  const result = {
    executionId: execution.id,
    workflowId: execution.workflowId,
    workflowName: execution.workflowData?.name,
    status: execution.status,
    error: null,
    failedNode: null,
    nodeChain: [],
    codeContext: null
  };

  if (execution.status !== 'error') {
    return result;
  }

  // Extraer error
  const errorData = execution.data?.resultData?.error;
  if (errorData) {
    result.error = {
      message: errorData.message,
      name: errorData.name,
      node: errorData.node,
      stack: errorData.stack
    };
    result.failedNode = errorData.node;
  }

  // Construir cadena de nodos ejecutados
  const runData = execution.data?.resultData?.runData;
  if (runData) {
    result.nodeChain = Object.entries(runData).map(([name, runs]) => {
      const run = runs[0];
      return {
        name,
        status: run?.error ? 'error' : 'success',
        executionTime: run?.executionTime,
        error: run?.error?.message
      };
    });
  }

  return result;
}

/**
 * Extraer contexto de código alrededor de un error
 */
function extractErrorCodeContext(code, errorMessage, contextLines = 5) {
  const lines = code.split('\n');

  // Buscar línea del error en el stack trace
  const lineMatch = errorMessage.match(/:(\d+)(?::\d+)?/);
  let errorLine = lineMatch ? parseInt(lineMatch[1]) : null;

  // Buscar por contenido si no hay número de línea
  if (!errorLine) {
    const patterns = [
      /Identifier '(\w+)' has already been declared/,
      /(\w+) is not defined/,
      /Cannot read propert/
    ];

    for (const pattern of patterns) {
      const match = errorMessage.match(pattern);
      if (match) {
        const searchTerm = match[1];
        const idx = lines.findIndex(l => l.includes(searchTerm));
        if (idx !== -1) {
          errorLine = idx + 1;
          break;
        }
      }
    }
  }

  if (!errorLine) {
    return { found: false, lines: [] };
  }

  const start = Math.max(0, errorLine - contextLines - 1);
  const end = Math.min(lines.length, errorLine + contextLines);

  return {
    found: true,
    errorLine,
    lines: lines.slice(start, end).map((text, idx) => ({
      number: start + idx + 1,
      text,
      isError: start + idx + 1 === errorLine
    }))
  };
}

// ============================================================================
// ANÁLISIS COMPLETO
// ============================================================================

/**
 * Generar reporte completo de un workflow
 */
function generateFullAnalysis(workflow) {
  const report = {
    basic: {
      name: workflow.name,
      id: workflow.id,
      active: workflow.active,
      nodeCount: workflow.nodes?.length || 0,
      connectionCount: Object.keys(workflow.connections || {}).length
    },
    fragment: detectFragmentStatus(workflow),
    deadEnds: findDeadEnds(workflow),
    loops: validateLoops(workflow),
    orphaned: findOrphanedNodes(workflow),
    ifValidation: validateIfNodes(workflow),
    codeNodes: extractCodeNodes(workflow),
    subWorkflows: findSubWorkflowCalls(workflow)
  };

  // Calcular score de integridad
  let score = 100;
  report.deadEnds.forEach(d => score -= d.severity === 'CRITICAL' ? 15 : 5);
  report.loops.issues.forEach(i => score -= i.severity === 'CRITICAL' ? 20 : 10);
  report.orphaned.forEach(o => score -= o.severity === 'CRITICAL' ? 15 : 5);
  report.ifValidation.issues.forEach(i => score -= i.severity === 'CRITICAL' ? 10 : 3);

  report.integrityScore = Math.max(0, score);

  // Analizar código de cada nodo
  report.codeIssues = [];
  report.codeNodes.forEach(cn => {
    const issues = analyzeCodeIssues(cn.code);
    if (issues.length > 0) {
      report.codeIssues.push({ node: cn.name, issues });
    }
  });

  return report;
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Encontrar camino entre dos nodos (BFS)
 */
function findPath(connections, start, end) {
  const queue = [[start]];
  const visited = new Set([start]);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];

    if (current === end) return path;

    if (connections[current]) {
      const targets = connections[current];
      Object.keys(targets).forEach(outputType => {
        targets[outputType].forEach(connectionArray => {
          connectionArray.forEach(conn => {
            if (conn.node && !visited.has(conn.node)) {
              visited.add(conn.node);
              queue.push([...path, conn.node]);
            }
          });
        });
      });
    }
  }

  return null;
}

/**
 * Obtener nodos por tipo
 */
function getNodesByType(workflow, typeFilter) {
  return workflow.nodes?.filter(n => {
    const nodeType = n.type.split('.').pop().toLowerCase();
    return nodeType.includes(typeFilter.toLowerCase());
  }) || [];
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Análisis de estructura
  detectFragmentStatus,
  findDeadEnds,
  validateLoops,
  findOrphanedNodes,
  validateIfNodes,

  // Inspección de código
  extractCodeNodes,
  analyzeCodeIssues,

  // Dependencias
  findSubWorkflowCalls,
  buildDependencyTree,

  // Análisis de errores
  analyzeExecutionError,
  extractErrorCodeContext,

  // Análisis completo
  generateFullAnalysis,

  // Utilidades
  findPath,
  getNodesByType
};
