// Servicio proxy para n8n API (evita problemas de CORS)
// Las llamadas van a través del backend que actúa como proxy

import { supabaseSystemUIAdmin } from '../config/supabaseSystemUI';

class N8nProxyService {
  
  // Obtener workflows a través del backend
  async getWorkflows(): Promise<{ success: boolean; workflows?: any[]; error?: string }> {
    try {
      // Llamar a función edge de Supabase que actúa como proxy
      const { data, error } = await supabaseSystemUIAdmin.functions.invoke('n8n-proxy', {
        body: {
          endpoint: '/workflows',
          method: 'GET'
        }
      });

      if (error) throw error;

      return { success: true, workflows: data.workflows };
    } catch (error) {
      console.error('Error obteniendo workflows:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Obtener un workflow específico
  async getWorkflow(workflowId: string): Promise<{ success: boolean; workflow?: any; error?: string }> {
    try {
      const { data, error } = await supabaseSystemUIAdmin.functions.invoke('n8n-proxy', {
        body: {
          endpoint: `/workflows/${workflowId}`,
          method: 'GET'
        }
      });

      if (error) throw error;

      return { success: true, workflow: data.workflow };
    } catch (error) {
      console.error('Error obteniendo workflow:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Actualizar workflow
  async updateWorkflow(workflowId: string, workflowData: any): Promise<{ success: boolean; workflow?: any; error?: string }> {
    try {
      const { data, error } = await supabaseSystemUIAdmin.functions.invoke('n8n-proxy', {
        body: {
          endpoint: `/workflows/${workflowId}`,
          method: 'PUT',
          data: workflowData
        }
      });

      if (error) throw error;

      return { success: true, workflow: data.workflow };
    } catch (error) {
      console.error('Error actualizando workflow:', error);
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
        workflow.tags?.some((tag: any) => tag.name?.toLowerCase().includes(query.toLowerCase()))
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
}

export const n8nProxyService = new N8nProxyService();
export default n8nProxyService;
