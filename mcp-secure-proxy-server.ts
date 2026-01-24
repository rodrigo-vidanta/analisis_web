#!/usr/bin/env node
/**
 * ============================================
 * MCP Server: Secure Proxy
 * ============================================
 * 
 * MCP Server que usa Edge Function como proxy
 * - NO expone service_role_key
 * - Usa session_token del usuario de Cursor
 * - Todas las operaciones son auditadas
 * - Solo operaciones permitidas por whitelist
 * 
 * Ventajas vs MCP REST directo:
 * - Token de usuario (no admin de cuenta)
 * - Auditable (cada query con user_id)
 * - Controlado (whitelist de operaciones)
 * - Seguro (service_role_key solo en Edge Function)
 * 
 * Última actualización: 2026-01-24
 * ============================================
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CONFIGURACIÓN
// ============================================

const EDGE_FUNCTION_URL = process.env.EDGE_FUNCTION_URL || 'https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/mcp-secure-proxy';

// Intentar leer session token de varios lugares
const getSessionToken = (): string => {
  // 1. Variable de entorno (para testing)
  if (process.env.SESSION_TOKEN) {
    return process.env.SESSION_TOKEN;
  }
  
  // 2. Archivo .cursor/session_token
  const tokenPaths = [
    path.join(process.cwd(), '.cursor', 'session_token'),
    path.join(process.env.HOME || '', '.cursor', 'session_token'),
  ];
  
  for (const tokenPath of tokenPaths) {
    try {
      if (fs.existsSync(tokenPath)) {
        const token = fs.readFileSync(tokenPath, 'utf-8').trim();
        if (token) {
          console.error(`[MCPSecureProxy] Session token loaded from: ${tokenPath}`);
          return token;
        }
      }
    } catch (e) {
      // Continuar al siguiente path
    }
  }
  
  throw new Error('SESSION_TOKEN not found. Set env var or create .cursor/session_token');
};

let SESSION_TOKEN: string;

try {
  SESSION_TOKEN = getSessionToken();
  console.error(`[MCPSecureProxy] Connected to: ${EDGE_FUNCTION_URL}`);
} catch (error) {
  console.error(`[MCPSecureProxy] ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
  console.error('[MCPSecureProxy] Para obtener tu session token, loguéate en la app y copia el token de:');
  console.error('[MCPSecureProxy]   - localStorage.getItem("session_token")');
  console.error('[MCPSecureProxy]   - O desde Supabase: auth_sessions table');
  process.exit(1);
}

// ============================================
// FUNCIONES DE API
// ============================================

interface ProxyResult {
  success: boolean;
  data?: any;
  error?: string;
  rowCount?: number;
}

async function callEdgeFunction(operation: string, params: any): Promise<ProxyResult> {
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': SESSION_TOKEN,
      },
      body: JSON.stringify({ operation, params }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    
    if (data.error) {
      return {
        success: false,
        error: data.error,
      };
    }

    return {
      success: true,
      data: data,
      rowCount: data.data ? (Array.isArray(data.data) ? data.data.length : 1) : 0,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

// Wrappers específicos
async function queryTable(
  table: string,
  select: string = '*',
  filter?: Record<string, any>,
  limit?: number,
  order?: string
): Promise<ProxyResult> {
  return callEdgeFunction('query_table', { table, select, filter, limit, order });
}

async function insertData(table: string, data: Record<string, any>): Promise<ProxyResult> {
  return callEdgeFunction('insert_data', { table, data });
}

async function updateData(
  table: string,
  data: Record<string, any>,
  filter: Record<string, any>
): Promise<ProxyResult> {
  return callEdgeFunction('update_data', { table, data, filter });
}

async function getSchema(): Promise<ProxyResult> {
  return callEdgeFunction('get_schema', {});
}

async function getTableInfo(table: string): Promise<ProxyResult> {
  return callEdgeFunction('get_table_info', { table });
}

async function backupTable(table: string): Promise<ProxyResult> {
  return callEdgeFunction('backup_table', { table });
}

async function executeReadSQL(sql: string): Promise<ProxyResult> {
  return callEdgeFunction('execute_read_sql', { sql });
}

async function debugConnection(): Promise<ProxyResult> {
  return callEdgeFunction('debug_connection', {});
}

// ============================================
// MCP SERVER
// ============================================

class MCPSecureProxyServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'MCPSecureProxy',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCPSecureProxy Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'query_table',
          description: 'Consulta una tabla con filtros (seguro, auditado)',
          inputSchema: {
            type: 'object',
            properties: {
              table: { type: 'string', description: 'Nombre de la tabla' },
              select: { type: 'string', description: 'Columnas a seleccionar (default: *)' },
              filter: { type: 'object', description: 'Filtros (ej: {"status": "active"})' },
              limit: { type: 'number', description: 'Límite de registros (max 1000)' },
              order: { type: 'string', description: 'Ordenar por (ej: "created_at DESC")' },
            },
            required: ['table'],
          },
        },
        {
          name: 'insert_data',
          description: 'Inserta un registro en una tabla (auditado)',
          inputSchema: {
            type: 'object',
            properties: {
              table: { type: 'string', description: 'Nombre de la tabla' },
              data: { type: 'object', description: 'Datos a insertar' },
            },
            required: ['table', 'data'],
          },
        },
        {
          name: 'update_data',
          description: 'Actualiza registros en una tabla (auditado, requiere filtro)',
          inputSchema: {
            type: 'object',
            properties: {
              table: { type: 'string', description: 'Nombre de la tabla' },
              data: { type: 'object', description: 'Datos a actualizar' },
              filter: { type: 'object', description: 'Condiciones WHERE (REQUERIDO)' },
            },
            required: ['table', 'data', 'filter'],
          },
        },
        {
          name: 'get_schema',
          description: 'Obtiene el esquema de tablas permitidas',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_table_info',
          description: 'Obtiene información detallada de una tabla',
          inputSchema: {
            type: 'object',
            properties: {
              table: { type: 'string', description: 'Nombre de la tabla' },
            },
            required: ['table'],
          },
        },
        {
          name: 'backup_table',
          description: 'Crea un backup de una tabla en formato JSON (max 10k registros)',
          inputSchema: {
            type: 'object',
            properties: {
              table: { type: 'string', description: 'Nombre de la tabla' },
            },
            required: ['table'],
          },
        },
        {
          name: 'execute_read_sql',
          description: 'Ejecuta SQL de SOLO LECTURA (SELECT, EXPLAIN)',
          inputSchema: {
            type: 'object',
            properties: {
              sql: { type: 'string', description: 'Query SELECT o EXPLAIN' },
            },
            required: ['sql'],
          },
        },
        {
          name: 'debug_connection',
          description: 'Verifica la conexión al proxy seguro',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: ProxyResult;

        switch (name) {
          case 'query_table':
            result = await queryTable(
              args?.table as string,
              args?.select as string,
              args?.filter as Record<string, any>,
              args?.limit as number,
              args?.order as string
            );
            break;

          case 'insert_data':
            result = await insertData(args?.table as string, args?.data as Record<string, any>);
            break;

          case 'update_data':
            result = await updateData(
              args?.table as string,
              args?.data as Record<string, any>,
              args?.filter as Record<string, any>
            );
            break;

          case 'get_schema':
            result = await getSchema();
            break;

          case 'get_table_info':
            result = await getTableInfo(args?.table as string);
            break;

          case 'backup_table':
            result = await backupTable(args?.table as string);
            break;

          case 'execute_read_sql':
            result = await executeReadSQL(args?.sql as string);
            break;

          case 'debug_connection':
            result = await debugConnection();
            break;

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error.message || 'Unknown error',
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[MCPSecureProxy] Server running on stdio');
  }
}

// ============================================
// MAIN
// ============================================

const server = new MCPSecureProxyServer();
server.run().catch(console.error);
