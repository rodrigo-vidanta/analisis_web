#!/usr/bin/env node
/**
 * ============================================
 * MCP Server: Supabase REST API
 * ============================================
 * 
 * Usa REST API de Supabase directamente con service_role_key
 * Acceso completo, bypasea RLS
 * 
 * Configuración en ~/.cursor/mcp.json:
 * {
 *   "mcpServers": {
 *     "SupabaseREST": {
 *       "command": "npx",
 *       "args": ["-y", "tsx", "/ruta/mcp-supabase-rest-server.ts"],
 *       "env": {
 *         "SUPABASE_PROJECT_ID": "glsmifhkoaifvaegsozd",
 *         "SUPABASE_SERVICE_ROLE_KEY": "eyJ..."
 *       }
 *     }
 *   }
 * }
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

// ============================================
// CONFIGURACIÓN
// ============================================

const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'glsmifhkoaifvaegsozd';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ACCESS_TOKEN;

if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY required in env');
}

const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;

// ============================================
// FUNCIONES DE API
// ============================================

interface QueryResult {
  success: boolean;
  data?: any;
  error?: string;
  rowCount?: number;
}

async function executeSQL(sql: string): Promise<QueryResult> {
  try {
    // Detectar si es DDL (CREATE, DROP, ALTER) o DML (SELECT, INSERT, UPDATE, DELETE)
    const isDDL = /^\s*(create|drop|alter|grant|revoke)/i.test(sql);
    
    if (isDDL) {
      // Para DDL, usar exec_ddl que retorna 'OK' o 'ERROR: ...'
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_ddl`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql_command: sql }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const result = await response.text();
      
      // Verificar si hubo error
      if (result.startsWith('ERROR:')) {
        return { success: false, error: result };
      }
      
      return { success: true, data: result, rowCount: 1 };
    } else {
      // Para SELECT/INSERT/UPDATE/DELETE, usar exec_sql (retorna datos)
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Si exec_sql no existe y es un SELECT, intentar query directa
        if (response.status === 404 && sql.trim().toLowerCase().startsWith('select')) {
          const tableMatch = sql.match(/from\s+(\w+)/i);
          if (tableMatch) {
            const table = tableMatch[1];
            return queryTable(table, '*');
          }
        }
        
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const data = await response.json();
      return {
        success: true,
        data: data,
        rowCount: Array.isArray(data) ? data.length : 1,
      };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function queryTable(
  table: string,
  select: string = '*',
  filter?: Record<string, any>,
  limit?: number,
  order?: string
): Promise<QueryResult> {
  try {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
    
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url += `&${key}=eq.${encodeURIComponent(String(value))}`;
        }
      });
    }
    
    if (order) {
      url += `&order=${order.replace(/\s+/g, '')}`;
    }
    
    if (limit) {
      url += `&limit=${limit}`;
    }

    const response = await fetch(url, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'count=exact',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    const countHeader = response.headers.get('content-range');
    const count = countHeader ? parseInt(countHeader.split('/')[1]) : data.length;

    return { success: true, data, rowCount: count };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function insertData(table: string, data: Record<string, any>): Promise<QueryResult> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    return { success: true, data: result, rowCount: Array.isArray(result) ? result.length : 1 };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function updateData(
  table: string,
  data: Record<string, any>,
  filter: Record<string, any>
): Promise<QueryResult> {
  try {
    let url = `${SUPABASE_URL}/rest/v1/${table}?`;
    Object.entries(filter).forEach(([key, value]) => {
      url += `${key}=eq.${encodeURIComponent(String(value))}&`;
    });

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    return { success: true, data: result, rowCount: Array.isArray(result) ? result.length : 1 };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function deleteData(table: string, filter: Record<string, any>): Promise<QueryResult> {
  if (!filter || Object.keys(filter).length === 0) {
    return { success: false, error: 'DELETE requires a filter' };
  }
  
  try {
    let url = `${SUPABASE_URL}/rest/v1/${table}?`;
    Object.entries(filter).forEach(([key, value]) => {
      url += `${key}=eq.${encodeURIComponent(String(value))}&`;
    });

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    return { success: true, data: result, rowCount: Array.isArray(result) ? result.length : 1 };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function getSchema(): Promise<QueryResult> {
  return queryTable('information_schema.tables', 'table_name', { table_schema: 'public' });
}

async function getTableInfo(table: string): Promise<QueryResult> {
  return queryTable('information_schema.columns', 'column_name,data_type,is_nullable', 
    { table_schema: 'public', table_name: table });
}

async function backupTable(table: string): Promise<QueryResult> {
  const result = await queryTable(table, '*');
  if (result.success) {
    return {
      success: true,
      data: {
        table,
        timestamp: new Date().toISOString(),
        rowCount: result.rowCount,
        backup: result.data,
      },
    };
  }
  return result;
}

async function debugConnection(): Promise<QueryResult> {
  const result = await queryTable('prospectos', 'id', undefined, 1);
  return {
    success: result.success,
    data: {
      connected: result.success,
      projectId: PROJECT_ID,
      supabaseUrl: SUPABASE_URL,
      timestamp: new Date().toISOString(),
    },
  };
}

// ============================================
// MCP SERVER
// ============================================

class SupabaseRESTServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: 'SupabaseREST', version: '2.0.0' },
      { capabilities: { tools: {} } }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error) => {};
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'execute_sql',
          description: 'Ejecuta SQL arbitrario (requiere función exec_sql en BD)',
          inputSchema: {
            type: 'object',
            properties: {
              sql: { type: 'string', description: 'Query SQL a ejecutar' },
            },
            required: ['sql'],
          },
        },
        {
          name: 'query_table',
          description: 'Consulta una tabla con filtros opcionales',
          inputSchema: {
            type: 'object',
            properties: {
              table: { type: 'string' },
              select: { type: 'string', description: 'Columnas (default: *)' },
              filter: { type: 'object' },
              limit: { type: 'number' },
              order: { type: 'string', description: 'Ej: created_at.desc' },
            },
            required: ['table'],
          },
        },
        {
          name: 'insert_data',
          description: 'Inserta un registro',
          inputSchema: {
            type: 'object',
            properties: {
              table: { type: 'string' },
              data: { type: 'object' },
            },
            required: ['table', 'data'],
          },
        },
        {
          name: 'update_data',
          description: 'Actualiza registros',
          inputSchema: {
            type: 'object',
            properties: {
              table: { type: 'string' },
              data: { type: 'object' },
              filter: { type: 'object' },
            },
            required: ['table', 'data', 'filter'],
          },
        },
        {
          name: 'delete_data',
          description: 'Elimina registros',
          inputSchema: {
            type: 'object',
            properties: {
              table: { type: 'string' },
              filter: { type: 'object' },
            },
            required: ['table', 'filter'],
          },
        },
        {
          name: 'get_schema',
          description: 'Obtiene el esquema de la BD',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_table_info',
          description: 'Info de una tabla',
          inputSchema: {
            type: 'object',
            properties: { table: { type: 'string' } },
            required: ['table'],
          },
        },
        {
          name: 'backup_table',
          description: 'Backup de tabla en JSON',
          inputSchema: {
            type: 'object',
            properties: { table: { type: 'string' } },
            required: ['table'],
          },
        },
        {
          name: 'debug_connection',
          description: 'Verifica la conexión',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: QueryResult;

        switch (name) {
          case 'execute_sql':
            result = await executeSQL(args?.sql as string);
            break;

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

          case 'delete_data':
            result = await deleteData(args?.table as string, args?.filter as Record<string, any>);
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

          case 'debug_connection':
            result = await debugConnection();
            break;

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: false, error: error.message }, null, 2),
          }],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new SupabaseRESTServer();
server.run().catch(console.error);
