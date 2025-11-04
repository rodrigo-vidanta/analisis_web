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

class SupaCleverServer {
  constructor() {
    this.server = new Server(
      {
        name: 'SupaClever',
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
          description: 'Ejecuta SQL arbitrario en Supabase',
          inputSchema: {
            type: 'object',
            properties: {
              sql: {
                type: 'string',
                description: 'Sentencia SQL a ejecutar',
              },
              description: {
                type: 'string',
                description: 'Descripción de lo que hace el SQL (opcional)',
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
          uri: 'supabase://agent_templates',
          mimeType: 'application/json',
          name: 'Agent Templates',
          description: 'Lista de plantillas de agentes Vapi',
        },
        {
          uri: 'supabase://agent_roles',
          mimeType: 'application/json',
          name: 'Agent Roles',
          description: 'Roles/prompts configurados para agentes',
        },
        {
          uri: 'supabase://tool_catalog',
          mimeType: 'application/json',
          name: 'Tool Catalog',
          description: 'Catálogo de herramientas disponibles',
        },
        {
          uri: 'supabase://agent_tools',
          mimeType: 'application/json',
          name: 'Agent Tools',
          description: 'Relación agentes-herramientas',
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
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ 
            note: 'Direct SQL execution not available in this environment',
            sql,
            description,
            suggestion: 'Use query_table or execute_rpc instead'
          }, null, 2),
        },
      ],
    };
  }

  async getAgentFull(args) {
    const { agent_id } = args;
    
    const { data, error } = await supabase
      .from('agent_templates')
      .select('*')
      .eq('id', agent_id)
      .single();
    
    if (error) throw error;
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ agent: data, agent_id }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('SupaClever MCP server running on stdio');
  }
}

const server = new SupaCleverServer();
server.run().catch(console.error);
