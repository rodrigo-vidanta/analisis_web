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
    
    // Note: This is a simplified version. In production, you'd want more security
    const { data, error } = await supabase.rpc('execute_sql', { query: sql });
    
    if (error) {
      // Fallback: try direct query for SELECT statements
      if (sql.trim().toLowerCase().startsWith('select')) {
        const { data: selectData, error: selectError } = await supabase
          .from('dual')
          .select('*')
          .limit(1);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ 
                note: 'SQL execution not available, showing sample data',
                sql,
                description,
                error: error.message 
              }, null, 2),
            },
          ],
        };
      }
      throw error;
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ data, sql, description }, null, 2),
        },
      ],
    };
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('SupaVidanta MCP server running on stdio');
  }
}

const server = new SupaVidantaServer();
server.run().catch(console.error);
