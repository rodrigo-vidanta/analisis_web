#!/usr/bin/env node

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

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

class SupaVidantaServer {
  constructor() {
    this.server = new Server(
      {
        name: 'SupaVidanta',
        version: '1.0.0',
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
    this.server.onerror = (error) => console.error('[MCP Error]', error);
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
          description: 'Ejecuta SQL arbitrario en Supabase (CREATE TABLE, CREATE FUNCTION, INSERT, UPDATE, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              sql: {
                type: 'string',
                description: 'Sentencia SQL a ejecutar',
              },
              description: {
                type: 'string',
                description: 'Descripción de lo que hace el SQL (opcional, para logging)',
              },
            },
            required: ['sql'],
          },
        },
        {
          name: 'get_agent_full',
          description: 'Obtiene un agente completo con todos sus roles y herramientas',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: {
                type: 'string',
                description: 'UUID del agente',
              },
            },
            required: ['agent_id'],
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
          description: 'Elimina datos de una tabla específica',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Nombre de la tabla',
              },
              filter: {
                type: 'object',
                description: 'Condiciones WHERE (ej: {"id": "uuid"})',
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
          description: 'Ejecuta múltiples queries SQL en una sola transacción',
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
                description: 'Descripción de la transacción (opcional)',
              },
            },
            required: ['queries'],
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
          case 'get_agent_full':
            return await this.getAgentFull(args);
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
          uri: 'supabase://llamadas_ventas',
          mimeType: 'application/json',
          name: 'Llamadas Ventas',
          description: 'Llamadas de ventas y análisis PQNC - 44 columnas',
        },
        {
          uri: 'supabase://prospectos',
          mimeType: 'application/json',
          name: 'Prospectos',
          description: 'Base de datos de prospectos y clientes potenciales - 35 columnas',
        },
        {
          uri: 'supabase://live_monitor_view',
          mimeType: 'application/json',
          name: 'Live Monitor View',
          description: 'Vista optimizada para monitoreo en vivo - 61 columnas',
        },
        {
          uri: 'supabase://call_analysis_summary',
          mimeType: 'application/json',
          name: 'Call Analysis Summary',
          description: 'Resumen de análisis de llamadas - 15 columnas',
        },
        {
          uri: 'supabase://conversaciones_whatsapp',
          mimeType: 'application/json',
          name: 'Conversaciones WhatsApp',
          description: 'Conversaciones de WhatsApp con prospectos - 18 columnas',
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      if (uri.startsWith('supabase://')) {
        const table = uri.replace('supabase://', '');
        
        // Diferentes selects según la tabla para optimizar respuesta
        let select = '*';
        if (table === 'llamadas_ventas') {
          select = 'call_id,fecha_llamada,duracion_segundos,es_venta_exitosa,nivel_interes,probabilidad_cierre,tipo_llamada,prospecto,resumen_llamada';
        } else if (table === 'prospectos') {
          select = 'id,nombre_completo,edad,estado_civil,ciudad_residencia,etapa,score,whatsapp,email,asesor_asignado';
        } else if (table === 'live_monitor_view') {
          select = 'call_id,prospecto_id,call_status_inteligente,fecha_llamada,duracion_segundos,checkpoint_venta_actual,nivel_interes';
        } else if (table === 'call_analysis_summary') {
          select = 'analysis_id,prospecto_id,call_id,calificaciones,total_puntos_positivos,feedback_positivo';
        } else if (table === 'conversaciones_whatsapp') {
          select = 'id,prospecto_id,summary,resultado,fecha_inicio,fecha_fin';
        }
        
        const { data, error } = await supabase
          .from(table)
          .select(select)
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
    const { table, select = '*', filter = {}, limit = 50 } = args;
    
    let query = supabase.from(table).select(select);
    
    // Apply filters
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
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
      // Execute SQL using the existing exec_sql RPC function with full access
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        // If exec_sql function doesn't exist, provide setup instructions
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
                    '2. Execute the SQL script: enable_full_access_mcp.sql',
                    '3. This will create the exec_sql function with full DDL/DML access',
                    '4. Then retry this operation'
                  ],
                  setup_file: 'enable_full_access_mcp.sql'
                }, null, 2),
              },
            ],
          };
        }
        
        // Handle other RPC errors
        throw error;
      }
      
      // Parse the JSON response from exec_sql function
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ 
                status: 'success',
                operation: result.query_type || 'UNKNOWN',
                data: result.data || null,
                message: result.message || 'Query executed successfully',
                row_count: result.row_count || 0,
                sql,
                description
              }, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ 
                status: 'error',
                error: result.error || 'Unknown error',
                error_code: result.error_code || 'UNKNOWN',
                sql,
                description
              }, null, 2),
            },
          ],
        };
      }
      
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
              note: 'Unexpected error during SQL execution'
            }, null, 2),
          },
        ],
      };
    }
  }

  async getAgentFull(args) {
    const { agent_id } = args;
    
    try {
      // Get prospecto data by ID
      const { data: prospectoData, error: prospectoError } = await supabase
        .from('prospectos')
        .select('*')
        .eq('id', agent_id)
        .single();
      
      if (prospectoError) throw prospectoError;
      
      // Get related calls for this prospect
      const { data: callsData, error: callsError } = await supabase
        .from('llamadas_ventas')
        .select('call_id,fecha_llamada,duracion_segundos,es_venta_exitosa,nivel_interes')
        .eq('prospecto->id', agent_id)
        .limit(5);
      
      const result = {
        prospecto: prospectoData,
        llamadas_relacionadas: callsData || [],
        agent_id
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      // Fallback: try to find by call_id or other identifier
      const { data, error: basicError } = await supabase
        .from('llamadas_ventas')
        .select('call_id,fecha_llamada,prospecto,es_venta_exitosa')
        .eq('call_id', agent_id)
        .single();
      
      if (basicError) throw basicError;
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ llamada: data, agent_id, note: 'Found by call_id' }, null, 2),
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
      
      // Apply filters
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
    
    try {
      let query = supabase.from(table).delete();
      
      // Apply filters
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
                    '1. Execute the enable_full_access_mcp.sql script in Supabase Dashboard',
                    '2. This will create all required functions for full access'
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
              message: 'Database schema retrieved successfully'
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
                  instructions: [
                    '1. Execute the enable_full_access_mcp.sql script in Supabase Dashboard'
                  ]
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
              message: `Table '${table}' backed up successfully`
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
                  instructions: [
                    '1. Execute the enable_full_access_mcp.sql script in Supabase Dashboard'
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
              operation: 'TRANSACTION',
              description: description || 'Multi-query transaction',
              queries_count: queries.length,
              result,
              message: result.message || 'Transaction completed'
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
              description: description || 'Multi-query transaction',
              queries_count: queries.length,
              error: error.message
            }, null, 2),
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('SupaVidanta MCP server running on stdio');
  }
}

const server = new SupaVidantaServer();
server.run().catch(console.error);
