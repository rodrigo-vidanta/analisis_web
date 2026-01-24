#!/usr/bin/env node
/**
 * ============================================
 * MCP Server: Supabase REST API
 * ============================================
 * 
 * Conexión via Supabase Management API (REST)
 * NO requiere funciones RPC como exec_sql
 * Usa Access Token personal de Supabase
 * 
 * Configuración requerida en ~/.cursor/mcp.json:
 * {
 *   "mcpServers": {
 *     "SupabaseREST": {
 *       "command": "npx",
 *       "args": ["ts-node", "/ruta/mcp-supabase-rest-server.ts"],
 *       "env": {
 *         "SUPABASE_ACCESS_TOKEN": "sbp_...",
 *         "SUPABASE_PROJECT_ID": "glsmifhkoaifvaegsozd"
 *       }
 *     }
 *   }
 * }
 * 
 * O puede leer el token de .supabase/access_token
 * 
 * Última actualización: 2026-01-20
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

// Intentar leer token de variable de entorno o archivo
const getAccessToken = (): string => {
  // 1. Primero intentar variable de entorno
  if (process.env.SUPABASE_ACCESS_TOKEN) {
    return process.env.SUPABASE_ACCESS_TOKEN;
  }
  
  // 2. Intentar leer de archivo .supabase/access_token
  const tokenPaths = [
    path.join(process.cwd(), '.supabase', 'access_token'),
    path.join(process.env.HOME || '', '.supabase', 'access_token'),
  ];
  
  for (const tokenPath of tokenPaths) {
    try {
      if (fs.existsSync(tokenPath)) {
        const token = fs.readFileSync(tokenPath, 'utf-8').trim();
        if (token) {
          console.error(`[SupabaseREST] Token loaded from: ${tokenPath}`);
          return token;
        }
      }
    } catch (e) {
      // Continuar al siguiente path
    }
  }
  
  throw new Error('SUPABASE_ACCESS_TOKEN not found. Set env var or create .supabase/access_token');
};

const getProjectId = (): string => {
  if (process.env.SUPABASE_PROJECT_ID) {
    return process.env.SUPABASE_PROJECT_ID;
  }
  
  // Default para PQNC_AI
  return 'glsmifhkoaifvaegsozd';
};

const ACCESS_TOKEN = getAccessToken();
let PROJECT_ID = getProjectId(); // Mutable para cambiar entre proyectos
const API_BASE = 'https://api.supabase.com/v1';

console.error(`[SupabaseREST] Token loaded successfully`);
console.error(`[SupabaseREST] Default project: ${PROJECT_ID}`);

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
    const response = await fetch(`${API_BASE}/projects/${PROJECT_ID}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data,
      rowCount: Array.isArray(data) ? data.length : 1,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

async function queryTable(
  table: string,
  select: string = '*',
  filter?: Record<string, any>,
  limit?: number,
  order?: string
): Promise<QueryResult> {
  let sql = `SELECT ${select} FROM ${table}`;
  
  // Build WHERE clause
  if (filter && Object.keys(filter).length > 0) {
    const conditions = Object.entries(filter).map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key} = '${value.replace(/'/g, "''")}'`;
      } else if (value === null) {
        return `${key} IS NULL`;
      } else {
        return `${key} = ${value}`;
      }
    });
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  // Order
  if (order) {
    sql += ` ORDER BY ${order}`;
  }
  
  // Limit
  if (limit) {
    sql += ` LIMIT ${limit}`;
  }
  
  return executeSQL(sql);
}

async function insertData(table: string, data: Record<string, any>): Promise<QueryResult> {
  const columns = Object.keys(data);
  const values = Object.values(data).map(v => {
    if (v === null) return 'NULL';
    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
    if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
    return v;
  });
  
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) RETURNING *`;
  return executeSQL(sql);
}

async function updateData(
  table: string,
  data: Record<string, any>,
  filter: Record<string, any>
): Promise<QueryResult> {
  const setClause = Object.entries(data).map(([key, value]) => {
    if (value === null) return `${key} = NULL`;
    if (typeof value === 'string') return `${key} = '${value.replace(/'/g, "''")}'`;
    if (typeof value === 'object') return `${key} = '${JSON.stringify(value).replace(/'/g, "''")}'`;
    return `${key} = ${value}`;
  }).join(', ');
  
  const whereClause = Object.entries(filter).map(([key, value]) => {
    if (typeof value === 'string') return `${key} = '${value.replace(/'/g, "''")}'`;
    return `${key} = ${value}`;
  }).join(' AND ');
  
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
  return executeSQL(sql);
}

async function deleteData(table: string, filter: Record<string, any>): Promise<QueryResult> {
  if (!filter || Object.keys(filter).length === 0) {
    return {
      success: false,
      error: 'DELETE requires a filter to prevent accidental mass deletion',
    };
  }
  
  const whereClause = Object.entries(filter).map(([key, value]) => {
    if (typeof value === 'string') return `${key} = '${value.replace(/'/g, "''")}'`;
    return `${key} = ${value}`;
  }).join(' AND ');
  
  const sql = `DELETE FROM ${table} WHERE ${whereClause} RETURNING *`;
  return executeSQL(sql);
}

async function getSchema(): Promise<QueryResult> {
  const sql = `
    SELECT 
      t.table_name,
      array_agg(
        json_build_object(
          'column', c.column_name,
          'type', c.data_type,
          'nullable', c.is_nullable
        )
      ) as columns
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_name
    ORDER BY t.table_name
  `;
  return executeSQL(sql);
}

async function getTableInfo(table: string): Promise<QueryResult> {
  const sql = `
    SELECT 
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      c.character_maximum_length,
      tc.constraint_type
    FROM information_schema.columns c
    LEFT JOIN information_schema.key_column_usage kcu 
      ON c.column_name = kcu.column_name AND c.table_name = kcu.table_name
    LEFT JOIN information_schema.table_constraints tc 
      ON kcu.constraint_name = tc.constraint_name AND kcu.table_name = tc.table_name
    WHERE c.table_schema = 'public' AND c.table_name = '${table}'
    ORDER BY c.ordinal_position
  `;
  return executeSQL(sql);
}

async function backupTable(table: string): Promise<QueryResult> {
  const sql = `SELECT * FROM ${table}`;
  const result = await executeSQL(sql);
  
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

async function listProjects(): Promise<QueryResult> {
  try {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data,
      rowCount: Array.isArray(data) ? data.length : 0,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

async function switchProject(projectId: string): Promise<QueryResult> {
  // Validar que el proyecto existe
  const projects = await listProjects();
  
  if (!projects.success) {
    return projects;
  }

  const projectExists = Array.isArray(projects.data) && 
    projects.data.some((p: any) => p.id === projectId || p.ref === projectId);

  if (!projectExists) {
    return {
      success: false,
      error: `Project ${projectId} not found in your account`,
    };
  }

  // Cambiar proyecto activo
  PROJECT_ID = projectId;
  
  return {
    success: true,
    data: {
      message: `Switched to project: ${projectId}`,
      currentProject: PROJECT_ID,
    },
  };
}

async function getCurrentProject(): Promise<QueryResult> {
  return {
    success: true,
    data: {
      projectId: PROJECT_ID,
      apiBase: API_BASE,
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
      {
        name: 'SupabaseREST',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[SupabaseREST Error]', error);
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
          name: 'list_projects',
          description: '📋 Lista todos los proyectos de Supabase en tu cuenta',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'switch_project',
          description: '🔄 Cambia al proyecto especificado (usa ref o id)',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: { type: 'string', description: 'ID o ref del proyecto (ej: glsmifhkoaifvaegsozd)' },
            },
            required: ['projectId'],
          },
        },
        {
          name: 'get_current_project',
          description: '📍 Muestra el proyecto actualmente seleccionado',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'execute_sql',
          description: '⚡ Ejecuta SQL arbitrario en Supabase (SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              sql: { type: 'string', description: 'Sentencia SQL a ejecutar' },
              description: { type: 'string', description: 'Descripción de la operación (para logging)' },
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
              table: { type: 'string', description: 'Nombre de la tabla' },
              select: { type: 'string', description: 'Columnas a seleccionar (default: *)' },
              filter: { type: 'object', description: 'Filtros (ej: {"status": "active"})' },
              limit: { type: 'number', description: 'Límite de registros' },
              order: { type: 'string', description: 'Ordenar por (ej: "created_at DESC")' },
            },
            required: ['table'],
          },
        },
        {
          name: 'insert_data',
          description: 'Inserta un registro en una tabla',
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
          description: 'Actualiza registros en una tabla',
          inputSchema: {
            type: 'object',
            properties: {
              table: { type: 'string', description: 'Nombre de la tabla' },
              data: { type: 'object', description: 'Datos a actualizar' },
              filter: { type: 'object', description: 'Condiciones WHERE' },
            },
            required: ['table', 'data', 'filter'],
          },
        },
        {
          name: 'delete_data',
          description: 'Elimina registros de una tabla (⚠️ DESTRUCTIVO)',
          inputSchema: {
            type: 'object',
            properties: {
              table: { type: 'string', description: 'Nombre de la tabla' },
              filter: { type: 'object', description: 'Condiciones WHERE (REQUERIDO)' },
            },
            required: ['table', 'filter'],
          },
        },
        {
          name: 'get_schema',
          description: 'Obtiene el esquema completo de la base de datos',
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
          description: 'Crea un backup de una tabla en formato JSON',
          inputSchema: {
            type: 'object',
            properties: {
              table: { type: 'string', description: 'Nombre de la tabla' },
            },
            required: ['table'],
          },
        },
        {
          name: 'debug_connection',
          description: 'Verifica la conexión a Supabase',
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
        let result: QueryResult;

        switch (name) {
          case 'list_projects':
            console.error('[SupabaseREST] Listing all projects');
            result = await listProjects();
            break;

          case 'switch_project':
            console.error(`[SupabaseREST] Switching to project: ${args?.projectId}`);
            result = await switchProject(args?.projectId as string);
            break;

          case 'get_current_project':
            result = await getCurrentProject();
            break;

          case 'execute_sql':
            console.error(`[SupabaseREST] Executing: ${args?.description || 'SQL query'}`);
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
            result = await executeSQL('SELECT NOW() as server_time, current_database() as database');
            if (result.success) {
              result.data = {
                ...result.data,
                project_id: PROJECT_ID,
                api_base: API_BASE,
                token_prefix: ACCESS_TOKEN.substring(0, 10) + '...',
              };
            }
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
    console.error('[SupabaseREST] Server running on stdio');
  }
}

// ============================================
// MAIN
// ============================================

const server = new SupabaseRESTServer();
server.run().catch(console.error);
