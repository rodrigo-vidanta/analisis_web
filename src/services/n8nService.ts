// Servicio para interactuar con la API de n8n
// Documentación: https://docs.n8n.io/api/api-reference/

class N8nService {
  private apiToken: string;
  private baseUrl: string;

  constructor() {
    this.apiToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmE1MDZkMS1hZDM4LTQ3MGYtOTEzOS02MzAwM2NiMjQzZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU5MzU3ODgzfQ.7z0FtziI-eFleJr4pLvP5GgRVptllCw26Losrxf_Qpo';
    this.baseUrl = import.meta.env.VITE_N8N_API_URL || 'https://your-n8n-instance.com/api/v1';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
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

  // Extraer prompts de un workflow
  extractPromptsFromWorkflow(workflow: any): any[] {
    const prompts: any[] = [];
    
    if (!workflow.nodes) return prompts;

    workflow.nodes.forEach((node: any) => {
      // Buscar nodos que contengan prompts (típicamente nodos de AI/LLM)
      if (node.type && (
        node.type.includes('openai') ||
        node.type.includes('anthropic') ||
        node.type.includes('llm') ||
        node.type.includes('ai') ||
        node.name.toLowerCase().includes('prompt') ||
        node.name.toLowerCase().includes('vapi')
      )) {
        // Extraer prompts de los parámetros del nodo
        const nodePrompts = this.extractPromptsFromNode(node);
        prompts.push(...nodePrompts);
      }
    });

    return prompts;
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
