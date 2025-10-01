// Servicio para interactuar con la API de n8n
// Documentación: https://docs.n8n.io/api/api-reference/

class N8nService {
  private apiToken: string;
  private baseUrl: string;

  constructor() {
    this.apiToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmE1MDZkMS1hZDM4LTQ3MGYtOTEzOS02MzAwM2NiMjQzZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU5MzU3ODgzfQ.7z0FtziI-eFleJr4pLvP5GgRVptllCw26Losrxf_Qpo';
    this.baseUrl = import.meta.env.VITE_N8N_API_URL || 'https://primary-dev-d75a.up.railway.app/api/v1';
  }

  // Verificar si estamos en modo desarrollo sin n8n configurado
  private isDevelopmentMode(): boolean {
    return false; // Siempre usar la API real ahora que tenemos la URL correcta
  }

  // Datos mock para desarrollo
  private getMockWorkflows() {
    return [
      {
        id: 'vapi-agent-natalia-001',
        name: '[VAPI] Agent-Natalia inbound',
        active: true,
        tags: ['vapi', 'natalia', 'inbound'],
        nodes: [
          {
            id: 'vapi-call-node-001',
            name: 'VAPI Call Handler',
            type: 'vapi-webhook',
            parameters: {
              system_prompt: 'Eres Natalia, una asistente virtual especializada en ventas. Tu objetivo es calificar leads y agendar citas de manera natural y conversacional. Mantén un tono profesional pero amigable.',
              greeting_message: 'Hola, soy Natalia de PQNC. Te llamo porque vi tu interés en nuestras soluciones de automatización. ¿Tienes unos minutos para platicar?',
              objection_handling: 'Si el cliente muestra objeciones, escucha activamente y responde con empatía. Enfócate en los beneficios específicos para su negocio.'
            },
            position: [100, 100]
          }
        ]
      },
      {
        id: 'vapi-trigger-call-002',
        name: 'Trigger llamada vapi',
        active: true,
        tags: ['vapi', 'trigger', 'outbound'],
        nodes: [
          {
            id: 'trigger-node-002',
            name: 'Call Trigger',
            type: 'vapi-trigger',
            parameters: {
              qualification_prompt: 'Analiza la información del lead y determina si cumple con los criterios de calificación: presupuesto, autoridad, necesidad y tiempo.',
              follow_up_script: 'Basándote en la conversación, genera un seguimiento personalizado que mantenga el interés del prospecto.'
            },
            position: [200, 200]
          }
        ]
      }
    ];
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-N8N-API-KEY': this.apiToken,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`n8n API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Obtener todos los workflows
  async getWorkflows(): Promise<{ success: boolean; workflows?: any[]; error?: string }> {
    try {
      // En modo desarrollo, usar datos mock
      if (this.isDevelopmentMode()) {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, workflows: this.getMockWorkflows() };
      }

      const workflows = await this.makeRequest('/workflows');
      return { success: true, workflows };
    } catch (error) {
      console.error('Error obteniendo workflows:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Obtener un workflow específico
  async getWorkflow(workflowId: string): Promise<{ success: boolean; workflow?: any; error?: string }> {
    try {
      const workflow = await this.makeRequest(`/workflows/${workflowId}`);
      return { success: true, workflow };
    } catch (error) {
      console.error('Error obteniendo workflow:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Actualizar un workflow
  async updateWorkflow(workflowId: string, workflowData: any): Promise<{ success: boolean; workflow?: any; error?: string }> {
    try {
      const workflow = await this.makeRequest(`/workflows/${workflowId}`, {
        method: 'PUT',
        body: JSON.stringify(workflowData)
      });
      return { success: true, workflow };
    } catch (error) {
      console.error('Error actualizando workflow:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Obtener ejecuciones de un workflow
  async getWorkflowExecutions(workflowId: string, limit: number = 100): Promise<{ success: boolean; executions?: any[]; error?: string }> {
    try {
      const executions = await this.makeRequest(`/executions?workflowId=${workflowId}&limit=${limit}`);
      return { success: true, executions };
    } catch (error) {
      console.error('Error obteniendo ejecuciones:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Obtener métricas de rendimiento de un workflow
  async getWorkflowMetrics(workflowId: string, days: number = 30): Promise<{ success: boolean; metrics?: any; error?: string }> {
    try {
      // En modo desarrollo, usar métricas mock
      if (this.isDevelopmentMode()) {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const mockMetrics = {
          workflow_id: workflowId,
          total_executions: Math.floor(Math.random() * 500) + 100,
          successful_executions: 0,
          failed_executions: 0,
          success_rate: 0,
          avg_execution_time: Math.floor(Math.random() * 5000) + 2000,
          period_days: days,
          last_execution: new Date().toISOString()
        };
        
        mockMetrics.successful_executions = Math.floor(mockMetrics.total_executions * (0.85 + Math.random() * 0.1));
        mockMetrics.failed_executions = mockMetrics.total_executions - mockMetrics.successful_executions;
        mockMetrics.success_rate = (mockMetrics.successful_executions / mockMetrics.total_executions) * 100;
        
        return { success: true, metrics: mockMetrics };
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const executions = await this.getWorkflowExecutions(workflowId, 1000);
      
      if (!executions.success || !executions.executions) {
        return { success: false, error: 'No se pudieron obtener las ejecuciones' };
      }

      // Filtrar ejecuciones por fecha
      const filteredExecutions = executions.executions.filter((exec: any) => {
        const execDate = new Date(exec.startedAt);
        return execDate >= startDate && execDate <= endDate;
      });

      // Calcular métricas
      const totalExecutions = filteredExecutions.length;
      const successfulExecutions = filteredExecutions.filter((exec: any) => exec.finished && !exec.stoppedAt).length;
      const failedExecutions = totalExecutions - successfulExecutions;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

      // Calcular tiempo promedio de ejecución
      const executionTimes = filteredExecutions
        .filter((exec: any) => exec.startedAt && exec.stoppedAt)
        .map((exec: any) => new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime());
      
      const avgExecutionTime = executionTimes.length > 0 
        ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length 
        : 0;

      const metrics = {
        workflow_id: workflowId,
        total_executions: totalExecutions,
        successful_executions: successfulExecutions,
        failed_executions: failedExecutions,
        success_rate: successRate,
        avg_execution_time: avgExecutionTime,
        period_days: days,
        last_execution: filteredExecutions.length > 0 ? filteredExecutions[0].startedAt : null
      };

      return { success: true, metrics };
    } catch (error) {
      console.error('Error calculando métricas:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Buscar workflows por nombre
  async searchWorkflows(query: string): Promise<{ success: boolean; workflows?: any[]; error?: string }> {
    try {
      const result = await this.getWorkflows();
      if (!result.success || !result.workflows) {
        return result;
      }

      const filteredWorkflows = result.workflows.filter((workflow: any) => 
        workflow.name.toLowerCase().includes(query.toLowerCase()) ||
        workflow.tags?.some((tag: string) => tag.toLowerCase().includes(query.toLowerCase()))
      );

      return { success: true, workflows: filteredWorkflows };
    } catch (error) {
      console.error('Error buscando workflows:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Extraer prompts de un workflow (específico para VAPI)
  extractPromptsFromWorkflow(workflow: any): any[] {
    const prompts: any[] = [];
    
    if (!workflow.nodes) return prompts;

    workflow.nodes.forEach((node: any) => {
      // Buscar nodos VAPI específicamente
      if (node.type === 'vapi' || node.type?.includes('vapi')) {
        // Extraer prompts del nodo VAPI
        const nodePrompts = this.extractVAPIPrompts(node);
        prompts.push(...nodePrompts);
      }
      
      // También buscar otros nodos con prompts
      if (node.type && (
        node.type.includes('openai') ||
        node.type.includes('anthropic') ||
        node.type.includes('llm') ||
        node.type.includes('ai') ||
        node.name.toLowerCase().includes('prompt')
      )) {
        const nodePrompts = this.extractPromptsFromNode(node);
        prompts.push(...nodePrompts);
      }
    });

    return prompts;
  }

  // Extraer prompts específicos de nodos VAPI
  private extractVAPIPrompts(node: any): any[] {
    const prompts: any[] = [];
    
    if (!node.parameters) return prompts;

    // Buscar en la estructura específica de VAPI
    if (node.parameters.assistant && node.parameters.assistant.model && node.parameters.assistant.model.messages) {
      const messages = node.parameters.assistant.model.messages;
      
      messages.forEach((message: any, index: number) => {
        if (message.role === 'system' && message.message && message.message.length > 100) {
          prompts.push({
            node_id: node.id,
            node_name: node.name || 'VAPI Node',
            node_type: node.type,
            parameter_key: `assistant.model.messages[${index}]`,
            prompt_content: message.message,
            prompt_type: 'system_message',
            checkpoint: this.extractCheckpointFromMessage(message.message),
            position: node.position,
            message_index: index,
            seconds_from_start: message.secondsFromStart || 0
          });
        }
      });
    }

    return prompts;
  }

  // Extraer información de checkpoint del mensaje
  private extractCheckpointFromMessage(message: string): string | null {
    const checkpointMatch = message.match(/CHECKPOINT\s+(\d+):\s*([^-\n]+)/i);
    if (checkpointMatch) {
      return `Checkpoint ${checkpointMatch[1]}: ${checkpointMatch[2].trim()}`;
    }
    
    // Buscar otros patrones
    if (message.includes('SALUDO')) return 'Saludo y Continuación';
    if (message.includes('CONEXIÓN EMOCIONAL')) return 'Conexión Emocional';
    if (message.includes('DISCOVERY')) return 'Discovery Familiar';
    if (message.includes('URGENCIA')) return 'Urgencia y Oportunidad';
    if (message.includes('PRESENTACIÓN')) return 'Presentación de Oferta';
    if (message.includes('PROTECCIÓN')) return 'Protección Anti-Manipulación';
    if (message.includes('VOCALIZACIÓN')) return 'Control de Vocalización';
    if (message.includes('REGLAS DE NEGOCIO')) return 'Reglas de Negocio';
    
    return null;
  }

  private extractPromptsFromNode(node: any): any[] {
    const prompts: any[] = [];
    
    if (!node.parameters) return prompts;

    // Buscar campos que contengan prompts
    Object.keys(node.parameters).forEach(key => {
      const value = node.parameters[key];
      
      // Si es un string largo, probablemente es un prompt
      if (typeof value === 'string' && value.length > 50) {
        prompts.push({
          node_id: node.id,
          node_name: node.name,
          node_type: node.type,
          parameter_key: key,
          prompt_content: value,
          position: node.position
        });
      }
      
      // Si es un objeto, buscar recursivamente
      if (typeof value === 'object' && value !== null) {
        const nestedPrompts = this.extractPromptsFromObject(value, node, key);
        prompts.push(...nestedPrompts);
      }
    });

    return prompts;
  }

  private extractPromptsFromObject(obj: any, node: any, parentKey: string): any[] {
    const prompts: any[] = [];
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      
      if (typeof value === 'string' && value.length > 50) {
        prompts.push({
          node_id: node.id,
          node_name: node.name,
          node_type: node.type,
          parameter_key: `${parentKey}.${key}`,
          prompt_content: value,
          position: node.position
        });
      }
    });

    return prompts;
  }
}

export const n8nService = new N8nService();
export default n8nService;
