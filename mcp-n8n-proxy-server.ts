#!/usr/bin/env node
/**
 * MCP Proxy Server para N8N
 * 
 * Este servidor actúa como proxy entre Cursor y el servidor MCP de N8N,
 * eliminando la limitación de 5 workflows haciendo múltiples llamadas
 * y combinando los resultados.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

const N8N_MCP_URL = process.env.N8N_MCP_URL || 'https://primary-dev-d75a.up.railway.app/mcp-server/http';
const N8N_MCP_TOKEN = process.env.N8N_MCP_TOKEN || '';

if (!N8N_MCP_TOKEN) {
  console.error('❌ Error: N8N_MCP_TOKEN no está configurado');
  process.exit(1);
}

class N8NProxyServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'n8n-proxy-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Listar herramientas disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_workflows',
            description: 'Buscar workflows en N8N (sin límite de 5 resultados)',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Texto de búsqueda (opcional)',
                },
                limit: {
                  type: 'number',
                  description: 'Límite de resultados (por defecto: sin límite)',
                  default: 1000,
                },
                projectId: {
                  type: 'string',
                  description: 'ID del proyecto (opcional)',
                },
              },
            },
          },
          {
            name: 'get_workflow_details',
            description: 'Obtener detalles completos de un workflow',
            inputSchema: {
              type: 'object',
              properties: {
                workflowId: {
                  type: 'string',
                  description: 'ID del workflow',
                },
              },
              required: ['workflowId'],
            },
          },
          {
            name: 'execute_workflow',
            description: 'Ejecutar un workflow',
            inputSchema: {
              type: 'object',
              properties: {
                workflowId: {
                  type: 'string',
                  description: 'ID del workflow',
                },
                inputs: {
                  type: 'object',
                  description: 'Inputs del workflow',
                },
              },
              required: ['workflowId', 'inputs'],
            },
          },
        ],
      };
    });

    // Manejar llamadas a herramientas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_workflows':
            return await this.searchWorkflows(args as any);
          case 'get_workflow_details':
            return await this.getWorkflowDetails(args as any);
          case 'execute_workflow':
            return await this.executeWorkflow(args as any);
          default:
            throw new Error(`Herramienta desconocida: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async callN8NMCP(method: string, params: any): Promise<any> {
    const response = await fetch(N8N_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${N8N_MCP_TOKEN}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // El servidor MCP de N8N devuelve Server-Sent Events (SSE)
    const text = await response.text();
    
    // Parsear SSE format
    const lines = text.split('\n');
    let jsonData = '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        jsonData = line.substring(6);
        break;
      }
    }

    if (!jsonData) {
      throw new Error('No se pudo parsear la respuesta del servidor MCP');
    }

    const parsed = JSON.parse(jsonData);
    
    if (parsed.error) {
      throw new Error(parsed.error.message || 'Error del servidor MCP');
    }

    return parsed.result;
  }

  private async searchWorkflows(args: { query?: string; limit?: number; projectId?: string }) {
    const { query = '', limit = 1000, projectId } = args;

    // El servidor MCP de N8N solo devuelve 5 workflows, así que hacemos múltiples llamadas
    // con diferentes queries para obtener todos los workflows
    const allWorkflows: any[] = [];
    const seenIds = new Set<string>();

    // Estrategia: hacer múltiples búsquedas con diferentes términos comunes
    const searchTerms = query 
      ? [query] 
      : ['', 'PROD', '[PROD]', 'api', 'LiveChat', 'VAPI', 'whatsapp', 'template', 'cron', 'error'];

    for (const term of searchTerms) {
      try {
        const result = await this.callN8NMCP('tools/call', {
          name: 'search_workflows',
          arguments: {
            query: term,
            limit: 200,
            projectId,
          },
        });

        if (result?.structuredContent?.data) {
          for (const workflow of result.structuredContent.data) {
            if (!seenIds.has(workflow.id)) {
              seenIds.add(workflow.id);
              allWorkflows.push(workflow);
            }
          }
        }

        // Si ya tenemos suficientes workflows, parar
        if (allWorkflows.length >= limit) {
          break;
        }
      } catch (error) {
        // Continuar con el siguiente término si hay error
        console.error(`Error buscando con término "${term}":`, error);
      }
    }

    // Si aún no tenemos suficientes, hacer una búsqueda directa con la API REST
    if (allWorkflows.length < limit) {
      try {
        const apiKey = process.env.N8N_API_KEY || '';
        if (apiKey) {
          const baseUrl = N8N_MCP_URL.replace('/mcp-server/http', '');
          const apiResponse = await fetch(
            `${baseUrl}/api/v1/workflows?active=true&limit=${limit}`,
            {
              headers: {
                'X-N8N-API-KEY': apiKey,
              },
            }
          );

          if (apiResponse.ok) {
            const apiData = await apiResponse.json();
            if (apiData.data) {
              for (const workflow of apiData.data) {
                if (!seenIds.has(workflow.id)) {
                  seenIds.add(workflow.id);
                  allWorkflows.push(workflow);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error usando API REST como fallback:', error);
      }
    }

    // Limitar resultados según el límite solicitado
    const limitedWorkflows = allWorkflows.slice(0, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            data: limitedWorkflows,
            count: limitedWorkflows.length,
            totalFound: allWorkflows.length,
          }, null, 2),
        },
      ],
    };
  }

  private async getWorkflowDetails(args: { workflowId: string }) {
    const { workflowId } = args;

    const result = await this.callN8NMCP('tools/call', {
      name: 'get_workflow_details',
      arguments: {
        workflowId,
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async executeWorkflow(args: { workflowId: string; inputs: any }) {
    const { workflowId, inputs } = args;

    const result = await this.callN8NMCP('tools/call', {
      name: 'execute_workflow',
      arguments: {
        workflowId,
        inputs,
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 N8N Proxy MCP Server iniciado');
  }
}

const server = new N8NProxyServer();
server.run().catch(console.error);

