#!/usr/bin/env node
/**
 * ============================================
 * MCP Server: Supa_SystemUI
 * ============================================
 * 
 * Proyecto: System UI Platform
 * Base de datos: system_ui
 * URL: https://zbylezfyagwrxoecioup.supabase.co
 * 
 * Propósito:
 * - Gestión de usuarios y autenticación
 * - Grupos de permisos y roles
 * - Mensajes administrativos
 * - Estado de pausas de bots
 * - Configuración del sistema
 * - Logs de auditoría
 * 
 * Acceso: Full R/W (Read/Write)
 * 
 * IMPORTANTE: Este servidor requiere la función exec_sql habilitada.
 * Ejecutar enable_full_access_mcp.sql en Supabase Dashboard.
 * 
 * Última actualización: 2025-01-06
 * ============================================
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY');
  process.exit(1);
}

// Log connection info for debugging
console.error(`[Supa_SystemUI] Connecting to: ${SUPABASE_URL}`);
console.error(`[Supa_SystemUI] Project ref from URL: ${SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1] || 'unknown'}`);

// Initialize Supabase client with service role for full access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

class SupaSystemUIServer {
  constructor() {
    this.server = new Server(
      {
        name: 'DB_Auth_Users',
        version: '2.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Supa_SystemUI Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'query_table',
          description: 'Consulta una tabla de Supabase con filtros opcionales',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Nombre de la tabla',
              },
              select: {
                type: 'string',
                description: 'Columnas a seleccionar (ej: "*" o "id,name")',
                default: '*',
              },
              filter: {
                type: 'object',
                description: 'Filtros a aplicar (ej: {"name": "valor"})',
                additionalProperties: true,
              },
              limit: {
                type: 'number',
                description: 'Límite de registros',
                default: 50,
              },
              order: {
                type: 'string',
                description: 'Ordenar por columna (ej: "created_at.desc")',
              },
            },
            required: ['table'],
          },
        },
        {
          name: 'execute_rpc',
          description: 'Ejecuta una función RPC de Supabase',
          inputSchema: {
            type: 'object',
            properties: {
              function_name: {
                type: 'string',
                description: 'Nombre de la función RPC',
              },
              params: {
                type: 'object',
                description: 'Parámetros de la función',
                additionalProperties: true,
              },
            },
            required: ['function_name'],
          },
        },
        {
          name: 'execute_sql',
          description: 'Ejecuta SQL arbitrario en Supabase (CREATE TABLE, CREATE FUNCTION, INSERT, UPDATE, DELETE, SELECT, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              sql: {
                type: 'string',
                description: 'Sentencia SQL a ejecutar',
              },
              description: {
                type: 'string',
                description: 'Descripción de lo que hace el SQL (para logging y auditoría)',
              },
            },
            required: ['sql'],
          },
        },
        {
          name: 'insert_data',
          description: 'Inserta datos en una tabla específica',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Nombre de la tabla',
              },
              data: {
                type: 'object',
                description: 'Datos a insertar (objeto JSON)',
                additionalProperties: true,
              },
            },
            required: ['table', 'data'],
          },
        },
        {
          name: 'update_data',
          description: 'Actualiza datos en una tabla específica',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Nombre de la tabla',
              },
              data: {
                type: 'object',
                description: 'Datos a actualizar (objeto JSON)',
                additionalProperties: true,
              },
              filter: {
                type: 'object',
                description: 'Condiciones WHERE (ej: {"id": "uuid"})',
                additionalProperties: true,
              },
            },
            required: ['table', 'data', 'filter'],
          },
        },
        {
          name: 'delete_data',
          description: 'Elimina datos de una tabla específica. ⚠️ OPERACIÓN DESTRUCTIVA',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Nombre de la tabla',
              },
              filter: {
                type: 'object',
                description: 'Condiciones WHERE (ej: {"id": "uuid"}). REQUERIDO para evitar eliminación masiva.',
                additionalProperties: true,
              },
            },
            required: ['table', 'filter'],
          },
        },
        {
          name: 'get_database_schema',
          description: 'Obtiene el esquema completo de la base de datos con tablas, columnas y funciones',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'backup_table',
          description: 'Hace backup completo de una tabla en formato JSON',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Nombre de la tabla a respaldar',
              },
            },
            required: ['table'],
          },
        },
        {
          name: 'exec_sql_transaction',
          description: 'Ejecuta múltiples queries SQL en una sola transacción (COMMIT o ROLLBACK automático)',
          inputSchema: {
            type: 'object',
            properties: {
              queries: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array de queries SQL a ejecutar en transacción',
              },
              description: {
                type: 'string',
                description: 'Descripción de la transacción (para auditoría)',
              },
            },
            required: ['queries'],
          },
        },
        {
          name: 'get_table_info',
          description: 'Obtiene información detallada de una tabla específica (columnas, tipos, constraints)',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Nombre de la tabla',
              },
            },
            required: ['table'],
          },
        },
        {
          name: 'debug_connection',
          description: 'Muestra información de diagnóstico sobre la conexión actual del MCP',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'query_table':
            return await this.queryTable(args);
          case 'execute_rpc':
            return await this.executeRpc(args);
          case 'execute_sql':
            return await this.executeSql(args);
          case 'insert_data':
            return await this.insertData(args);
          case 'update_data':
            return await this.updateData(args);
          case 'delete_data':
            return await this.deleteData(args);
          case 'get_database_schema':
            return await this.getDatabaseSchema(args);
          case 'backup_table':
            return await this.backupTable(args);
          case 'exec_sql_transaction':
            return await this.execSqlTransaction(args);
          case 'get_table_info':
            return await this.getTableInfo(args);
          case 'debug_connection':
            return await this.debugConnection();
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error.message}`
        );
      }
    });
  }

  setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'supabase://admin_messages',
          mimeType: 'application/json',
          name: 'Admin Messages',
          description: 'Mensajes para administradores del sistema',
        },
        {
          uri: 'supabase://permission_groups',
          mimeType: 'application/json',
          name: 'Permission Groups',
          description: 'Grupos de permisos del sistema',
        },
        {
          uri: 'supabase://group_permissions',
          mimeType: 'application/json',
          name: 'Group Permissions',
          description: 'Permisos asociados a grupos',
        },
        {
          uri: 'supabase://user_permission_groups',
          mimeType: 'application/json',
          name: 'User Permission Groups',
          description: 'Relación usuarios-grupos de permisos',
        },
        {
          uri: 'supabase://group_audit_log',
          mimeType: 'application/json',
          name: 'Group Audit Log',
          description: 'Log de auditoría de cambios en grupos',
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      if (uri.startsWith('supabase://')) {
        const table = uri.replace('supabase://', '');
        
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(10);

        if (error) throw error;

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    });
  }

  async queryTable(args) {
    const { table, select = '*', filter = {}, limit = 50, order } = args;
    
    let query = supabase.from(table).select(select);
    
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    if (order) {
      const [column, direction] = order.split('.');
      query = query.order(column, { ascending: direction !== 'desc' });
    }
    
    query = query.limit(limit);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ data, count: data?.length || 0 }, null, 2),
        },
      ],
    };
  }

  async executeRpc(args) {
    const { function_name, params = {} } = args;
    
    const { data, error } = await supabase.rpc(function_name, params);
    
    if (error) throw error;
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ data, function: function_name, params }, null, 2),
        },
      ],
    };
  }

  async executeSql(args) {
    const { sql, description } = args;
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { query: sql });
      
      if (error) {
        if (error.message.includes('Could not find the function')) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ 
                  status: 'setup_required',
                  error: 'exec_sql function not found',
                  sql,
                  description,
                  instructions: [
                    '1. Go to Supabase Dashboard > SQL Editor',
                    '2. Execute the script: enable_full_access_mcp.sql',
                    '3. Retry this operation'
                  ]
                }, null, 2),
              },
            ],
          };
        }
        throw error;
      }
      
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: result.success ? 'success' : 'error',
              operation: result.query_type || 'UNKNOWN',
              data: result.data || null,
              message: result.message || (result.success ? 'Query executed successfully' : result.error),
              row_count: result.row_count || 0,
              sql,
              description
            }, null, 2),
          },
        ],
      };
      
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'exception',
              error: error.message,
              sql,
              description,
            }, null, 2),
          },
        ],
      };
    }
  }

  async insertData(args) {
    const { table, data } = args;
    
    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select();
      
      if (error) throw error;
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'success',
              operation: 'INSERT',
              table,
              data: result,
              message: `Inserted ${result?.length || 1} record(s) successfully`
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'error',
              operation: 'INSERT',
              table,
              error: error.message,
              originalData: data
            }, null, 2),
          },
        ],
      };
    }
  }

  async updateData(args) {
    const { table, data, filter } = args;
    
    try {
      let query = supabase.from(table).update(data);
      
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data: result, error } = await query.select();
      
      if (error) throw error;
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'success',
              operation: 'UPDATE',
              table,
              filter,
              data: result,
              message: `Updated ${result?.length || 0} record(s) successfully`
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'error',
              operation: 'UPDATE',
              table,
              filter,
              error: error.message,
              originalData: data
            }, null, 2),
          },
        ],
      };
    }
  }

  async deleteData(args) {
    const { table, filter } = args;
    
    if (!filter || Object.keys(filter).length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'error',
              operation: 'DELETE',
              table,
              error: 'DELETE without filters is not allowed.',
            }, null, 2),
          },
        ],
      };
    }
    
    try {
      let query = supabase.from(table).delete();
      
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data: result, error } = await query.select();
      
      if (error) throw error;
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'success',
              operation: 'DELETE',
              table,
              filter,
              deletedRecords: result,
              message: `Deleted ${result?.length || 0} record(s) successfully`
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'error',
              operation: 'DELETE',
              table,
              filter,
              error: error.message
            }, null, 2),
          },
        ],
      };
    }
  }

  async getDatabaseSchema(args) {
    try {
      const { data, error } = await supabase.rpc('get_database_schema');
      
      if (error) {
        if (error.message.includes('Could not find the function')) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ 
                  status: 'setup_required',
                  error: 'get_database_schema function not found',
                  instructions: [
                    '1. Execute enable_full_access_mcp.sql in Supabase Dashboard'
                  ]
                }, null, 2),
              },
            ],
          };
        }
        throw error;
      }
      
      const schema = typeof data === 'string' ? JSON.parse(data) : data;
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'success',
              operation: 'GET_SCHEMA',
              schema,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'error',
              operation: 'GET_SCHEMA',
              error: error.message
            }, null, 2),
          },
        ],
      };
    }
  }

  async backupTable(args) {
    const { table } = args;
    
    try {
      const { data, error } = await supabase.rpc('backup_table_data', { table_name_param: table });
      
      if (error) {
        if (error.message.includes('Could not find the function')) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ 
                  status: 'setup_required',
                  error: 'backup_table_data function not found',
                }, null, 2),
              },
            ],
          };
        }
        throw error;
      }
      
      const backup = typeof data === 'string' ? JSON.parse(data) : data;
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'success',
              operation: 'BACKUP_TABLE',
              table,
              backup,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'error',
              operation: 'BACKUP_TABLE',
              table,
              error: error.message
            }, null, 2),
          },
        ],
      };
    }
  }

  async execSqlTransaction(args) {
    const { queries, description } = args;
    
    try {
      const { data, error } = await supabase.rpc('exec_sql_transaction', { queries });
      
      if (error) {
        if (error.message.includes('Could not find the function')) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ 
                  status: 'setup_required',
                  error: 'exec_sql_transaction function not found',
                }, null, 2),
              },
            ],
          };
        }
        throw error;
      }
      
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: result.success ? 'success' : 'error',
              operation: 'TRANSACTION',
              description: description || 'Multi-query transaction',
              queries_count: queries.length,
              result,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'error',
              operation: 'TRANSACTION',
              error: error.message
            }, null, 2),
          },
        ],
      };
    }
  }

  async getTableInfo(args) {
    const { table } = args;
    
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) throw error;
      
      const columns = data && data[0] ? Object.keys(data[0]).map(key => ({
        name: key,
        sample_value: data[0][key],
        inferred_type: typeof data[0][key]
      })) : [];
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'success',
              operation: 'GET_TABLE_INFO',
              table,
              columns,
              column_count: columns.length,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              status: 'error',
              operation: 'GET_TABLE_INFO',
              table,
              error: error.message
            }, null, 2),
          },
        ],
      };
    }
  }

  async debugConnection() {
    const projectRef = SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] || 'unknown';
    const serverName = process.env.MCP_SERVER_NAME || 'UNKNOWN';
    const serverFile = import.meta.url || __filename || 'unknown';
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'debug_info',
            mcp_server: 'DB_Auth_Users',
            env_server_name: serverName,
            server_file: serverFile,
            supabase_url: SUPABASE_URL,
            project_ref: projectRef,
            expected_project: 'zbylezfyagwrxoecioup',
            connection_correct: projectRef === 'zbylezfyagwrxoecioup',
            service_key_prefix: SUPABASE_SERVICE_ROLE_KEY?.substring(0, 50) + '...',
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Supa_SystemUI MCP server running on stdio');
  }
}

const server = new SupaSystemUIServer();
server.run().catch(console.error);
