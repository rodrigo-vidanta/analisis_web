// Servicio productivo para n8n API usando proxy local
// Evita problemas de CORS usando servidor Express local

class N8nLocalProxyService {
  private readonly proxyUrl = 'http://localhost:3001/api/n8n';

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.proxyUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Proxy API Error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  async getWorkflows(): Promise<{ success: boolean; workflows?: any[]; error?: string }> {
    try {
      const data = await this.makeRequest('/workflows');
      return { 
        success: true, 
        workflows: data.data || data 
      };
    } catch (error) {
      console.error('Error obteniendo workflows:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  async getWorkflow(workflowId: string): Promise<{ success: boolean; workflow?: any; error?: string }> {
    try {
      const data = await this.makeRequest(`/workflows/${workflowId}`);
      return { 
        success: true, 
        workflow: { data: data.data || data }
      };
    } catch (error) {
      console.error('Error obteniendo workflow:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  async updateWorkflow(workflowId: string, workflowData: any): Promise<{ success: boolean; workflow?: any; error?: string }> {
    try {
      const data = await this.makeRequest(`/workflows/${workflowId}`, {
        method: 'PUT',
        body: JSON.stringify(workflowData),
      });
      
      return { 
        success: true, 
        workflow: { data: data.data || data }
      };
    } catch (error) {
      console.error('Error actualizando workflow:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  // Extraer prompts de un workflow (específico para VAPI)
  extractPromptsFromWorkflow(workflow: any): any[] {
    const prompts: any[] = [];
    
    if (!workflow.nodes) return prompts;

    workflow.nodes.forEach((node: any) => {
      // Solo buscar nodos que hagan llamadas VAPI (no todos los nodos)
      const isVAPICallNode = (
        (node.type === 'n8n-nodes-base.httpRequest' && 
         node.parameters?.jsonBody?.includes('assistant') &&
         node.parameters?.jsonBody?.includes('model')) ||
        (node.type === 'n8n-nodes-base.respondToWebhook' && 
         node.parameters?.responseBody?.includes('assistant') &&
         node.parameters?.responseBody?.includes('model'))
      );
      
      if (isVAPICallNode) {
        console.log('🎯 Nodo VAPI de llamada encontrado:', node.name);
        const nodePrompts = this.extractVAPIPrompts(node);
        console.log('📝 Prompts extraídos de este nodo:', nodePrompts.length);
        prompts.push(...nodePrompts);
      }
    });

    return prompts;
  }

  private extractVAPIPrompts(node: any): any[] {
    const prompts: any[] = [];
    
    if (!node.parameters) return prompts;

    // Caso 1: HTTP Request con jsonBody
    if (node.type === 'n8n-nodes-base.httpRequest' && node.parameters.jsonBody) {
      try {
        const jsonBodyStr = node.parameters.jsonBody.replace(/^=/, '');
        
        // Solo procesar si parece ser configuración VAPI válida
        if (!jsonBodyStr.includes('assistant') || !jsonBodyStr.includes('model')) {
          return prompts; // Omitir nodos que no son VAPI
        }
        
        console.log('📄 Procesando jsonBody de:', node.name);
        console.log('📝 Contenido jsonBody (primeros 500 chars):', jsonBodyStr.substring(0, 500));
        
        // Intentar parsear de forma más robusta
        let vapiConfig;
        try {
          vapiConfig = JSON.parse(jsonBodyStr);
          console.log('✅ JSON parseado exitosamente');
        } catch (parseError) {
          console.warn('⚠️ Error parsing directo, intentando limpiar...', parseError.message);
          
          // Si falla el parsing directo, intentar limpiar el JSON
          const cleanedJson = jsonBodyStr
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remover caracteres de control
            .replace(/\\n/g, '\\\\n') // Escapar saltos de línea
            .replace(/\\"/g, '\\\\"'); // Escapar comillas
          
          try {
            vapiConfig = JSON.parse(cleanedJson);
            console.log('✅ JSON limpio parseado exitosamente');
          } catch (secondError) {
            console.error('❌ No se pudo parsear jsonBody para nodo:', node.name, secondError.message);
            return prompts;
          }
        }
        
        if (vapiConfig.assistant?.model?.messages) {
          console.log('📋 Messages encontrados en jsonBody:', vapiConfig.assistant.model.messages.length);
          
          vapiConfig.assistant.model.messages.forEach((message: any, index: number) => {
            console.log(`📝 Message ${index}:`, {
              role: message.role,
              contentLength: message.content?.length || 0,
              hasContent: !!message.content,
              preview: message.content?.substring(0, 100) + '...'
            });
            
            if (message.role === 'system' && message.content && message.content.length > 10) { // Filtro muy bajo para capturar todo
              prompts.push({
                node_id: node.id,
                node_name: node.name || 'HTTP Request VAPI',
                node_type: node.type,
                parameter_key: `jsonBody.assistant.model.messages[${index}]`,
                prompt_content: message.content,
                prompt_type: 'system_message',
                checkpoint: this.extractCheckpointFromMessage(message.content),
                position: node.position,
                message_index: index,
                seconds_from_start: 0,
                raw_message: message // Incluir mensaje completo con variables
              });
              console.log(`✅ Prompt ${index} agregado:`, this.extractCheckpointFromMessage(message.content));
            } else {
              console.log(`⏭️ Prompt ${index} omitido:`, { role: message.role, length: message.content?.length });
            }
          });
        } else {
          console.warn('❌ No se encontraron messages en assistant.model');
        }
        
        // También extraer tools si existen
        if (vapiConfig.assistant?.model?.tools) {
          vapiConfig.assistant.model.tools.forEach((tool: any, index: number) => {
            if (tool.function?.name) {
              prompts.push({
                node_id: node.id,
                node_name: node.name || 'HTTP Request VAPI',
                node_type: node.type,
                parameter_key: `jsonBody.assistant.model.tools[${index}]`,
                prompt_content: `TOOL: ${tool.function.name}\nDescription: ${tool.function.description || 'Sin descripción'}\nParameters: ${JSON.stringify(tool.function.parameters, null, 2)}`,
                prompt_type: 'tool_function',
                checkpoint: `Tool: ${tool.function.name}`,
                position: node.position,
                message_index: index,
                seconds_from_start: 0,
                raw_tool: tool // Incluir tool completo
              });
            }
          });
        }
      } catch (error) {
        console.warn('Omitiendo nodo con jsonBody no válido:', node.name);
        // Omitir silenciosamente nodos que no se pueden parsear
      }
    }

    // Caso 2: Respond to Webhook con responseBody
    if (node.type === 'n8n-nodes-base.respondToWebhook' && node.parameters.responseBody) {
      try {
        const responseBodyStr = node.parameters.responseBody.replace(/^=/, '');
        
        // Solo procesar si parece ser configuración VAPI válida
        if (!responseBodyStr.includes('assistant') || !responseBodyStr.includes('model')) {
          return prompts; // Omitir nodos que no son VAPI
        }
        
        // Intentar parsear de forma más robusta
        let vapiConfig;
        try {
          vapiConfig = JSON.parse(responseBodyStr);
        } catch (parseError) {
          // Si falla el parsing directo, intentar limpiar el JSON
          const cleanedJson = responseBodyStr
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remover caracteres de control
            .replace(/\\n/g, '\\\\n') // Escapar saltos de línea
            .replace(/\\"/g, '\\\\"'); // Escapar comillas
          
          try {
            vapiConfig = JSON.parse(cleanedJson);
          } catch (secondError) {
            console.warn('No se pudo parsear responseBody para nodo:', node.name);
            return prompts;
          }
        }
        
        if (vapiConfig.assistant?.model?.messages) {
          vapiConfig.assistant.model.messages.forEach((message: any, index: number) => {
            if (message.role === 'system' && message.content && message.content.length > 50) { // Reducir filtro
              prompts.push({
                node_id: node.id,
                node_name: node.name || 'Respond to Webhook VAPI',
                node_type: node.type,
                parameter_key: `responseBody.assistant.model.messages[${index}]`,
                prompt_content: message.content,
                prompt_type: 'system_message',
                checkpoint: this.extractCheckpointFromMessage(message.content),
                position: node.position,
                message_index: index,
                seconds_from_start: 0,
                raw_message: message // Incluir mensaje completo con variables
              });
            }
          });
        }
        
        // También extraer tools si existen
        if (vapiConfig.assistant?.model?.tools) {
          vapiConfig.assistant.model.tools.forEach((tool: any, index: number) => {
            if (tool.function?.name) {
              prompts.push({
                node_id: node.id,
                node_name: node.name || 'Respond to Webhook VAPI',
                node_type: node.type,
                parameter_key: `responseBody.assistant.model.tools[${index}]`,
                prompt_content: `TOOL: ${tool.function.name}\nDescription: ${tool.function.description || 'Sin descripción'}\nParameters: ${JSON.stringify(tool.function.parameters, null, 2)}`,
                prompt_type: 'tool_function',
                checkpoint: `Tool: ${tool.function.name}`,
                position: node.position,
                message_index: index,
                seconds_from_start: 0,
                raw_tool: tool // Incluir tool completo
              });
            }
          });
        }
      } catch (error) {
        console.warn('Omitiendo nodo con responseBody no válido:', node.name);
        // Omitir silenciosamente nodos que no se pueden parsear
      }
    }

    return prompts;
  }

  private extractCheckpointFromMessage(content: string): string | null {
    const checkpointMatch = content.match(/CHECKPOINT\s+(\d+)/i);
    return checkpointMatch ? checkpointMatch[0] : null;
  }
}

export const n8nLocalProxyService = new N8nLocalProxyService();
