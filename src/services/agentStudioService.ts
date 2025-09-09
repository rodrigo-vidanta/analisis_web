// Servicio completo para Agent Studio con todas las funcionalidades avanzadas
// Manejo de importación, squads, roles, tools y perfiles de usuario

import { supabase } from '../config/supabase';
import type { Database } from '../types/database';

// Tipos para Agent Studio
export interface AgentTemplate {
  id?: string;
  name: string;
  description: string;
  category: string;
  keywords: string[];
  use_cases: string[];
  is_squad: boolean;
  squad_config?: SquadConfig;
  single_agent_config?: SingleAgentConfig;
  tools: Tool[];
  created_by: string;
  created_at?: string;
  updated_at?: string;
  usage_count: number;
  success_rate: number;
  is_active: boolean;
  vapi_config?: any;
}

export interface SquadConfig {
  name: string;
  description: string;
  members: SquadMember[];
}

export interface SquadMember {
  id: string;
  name: string;
  role: string;
  description: string;
  model_config: ModelConfig;
  voice_config: VoiceConfig;
  tools: string[]; // IDs de tools
  system_prompts: string[];
  destinations?: TransferDestination[];
}

export interface SingleAgentConfig {
  name: string;
  role: string;
  description: string;
  model_config: ModelConfig;
  voice_config: VoiceConfig;
  system_prompts: string[];
}

export interface ModelConfig {
  provider: string;
  model: string;
  temperature: number;
  fallback_models?: string[];
}

export interface VoiceConfig {
  provider: string;
  voice_id: string;
  model: string;
  stability: number;
  similarity_boost: number;
  style?: number;
  speed: number;
}

export interface TransferDestination {
  type: 'assistant' | 'number';
  assistant_name?: string;
  number?: string;
  message: string;
  description: string;
}

export interface Tool {
  id?: string;
  name: string;
  description: string;
  category: string;
  function_schema: any;
  server_url: string;
  is_async: boolean;
  messages?: any[];
  created_by: string;
  created_at?: string;
  is_reusable: boolean;
  usage_count: number;
}

export interface ImportResult {
  success: boolean;
  message: string;
  agent?: AgentTemplate;
  errors?: string[];
  warnings?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  detectedType: 'single' | 'squad' | 'invalid';
  agentCount?: number;
  toolsCount?: number;
}

class AgentStudioService {
  
  // =================== GESTIÓN DE PLANTILLAS ===================
  
  async getTemplates(userId?: string): Promise<AgentTemplate[]> {
    try {
      // Primero verificar si las tablas existen
      const { error: tableError } = await supabase
        .from('agent_templates')
        .select('id')
        .limit(1);

      if (tableError) {
        console.warn('Tablas de Agent Studio no existen aún. Retornando datos de ejemplo.');
        return this.getMockTemplates();
      }

      let query = supabase
        .from('agent_templates')
        .select(`
          *,
          tools:agent_template_tools(
            tool_id,
            tools(*)
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('created_by', userId);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      return data?.map(template => ({
        ...template,
        tools: template.tools?.map((t: any) => t.tools) || []
      })) || [];
    } catch (error) {
      console.error('Error fetching templates:', error);
      return this.getMockTemplates();
    }
  }

  async getTemplateById(id: string): Promise<AgentTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('agent_templates')
        .select(`
          *,
          tools:agent_template_tools(
            tool_id,
            tools(*)
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      if (!data) return null;

      return {
        ...data,
        tools: data.tools?.map((t: any) => t.tools) || []
      };
    } catch (error) {
      console.error('Error fetching template by ID:', error);
      return null;
    }
  }

  async createTemplate(template: Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<AgentTemplate> {
    try {
      // Crear la plantilla principal
      const { data: templateData, error: templateError } = await supabase
        .from('agent_templates')
        .insert({
          name: template.name,
          description: template.description,
          category: template.category,
          keywords: template.keywords,
          use_cases: template.use_cases,
          is_squad: template.is_squad,
          squad_config: template.squad_config,
          single_agent_config: template.single_agent_config,
          created_by: template.created_by,
          usage_count: 0,
          success_rate: 0,
          is_active: true,
          vapi_config: template.vapi_config
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Asociar tools si existen
      if (template.tools && template.tools.length > 0) {
        const toolAssociations = template.tools.map(tool => ({
          agent_template_id: templateData.id,
          tool_id: tool.id
        }));

        const { error: toolsError } = await supabase
          .from('agent_template_tools')
          .insert(toolAssociations);

        if (toolsError) throw toolsError;
      }

      return await this.getTemplateById(templateData.id) as AgentTemplate;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  async updateTemplate(id: string, updates: Partial<AgentTemplate>): Promise<AgentTemplate> {
    try {
      const { data, error } = await supabase
        .from('agent_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Si se actualizaron las tools, manejar las asociaciones
      if (updates.tools) {
        // Eliminar asociaciones existentes
        await supabase
          .from('agent_template_tools')
          .delete()
          .eq('agent_template_id', id);

        // Crear nuevas asociaciones
        if (updates.tools.length > 0) {
          const toolAssociations = updates.tools.map(tool => ({
            agent_template_id: id,
            tool_id: tool.id
          }));

          await supabase
            .from('agent_template_tools')
            .insert(toolAssociations);
        }
      }

      return await this.getTemplateById(id) as AgentTemplate;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      // Soft delete
      const { error } = await supabase
        .from('agent_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  }

  async duplicateTemplate(id: string, newName: string, userId: string): Promise<AgentTemplate> {
    try {
      const original = await this.getTemplateById(id);
      if (!original) throw new Error('Template not found');

      const duplicate = {
        ...original,
        name: newName,
        created_by: userId,
        usage_count: 0,
        success_rate: 0
      };

      delete duplicate.id;
      delete duplicate.created_at;
      delete duplicate.updated_at;

      return await this.createTemplate(duplicate);
    } catch (error) {
      console.error('Error duplicating template:', error);
      throw error;
    }
  }

  // =================== SISTEMA DE IMPORTACIÓN ===================

  async importAgent(jsonData: any, userId: string): Promise<ImportResult> {
    try {
      // Validar el JSON
      const validation = this.validateAgentJSON(jsonData);
      
      if (!validation.isValid) {
        return {
          success: false,
          message: 'JSON inválido',
          errors: validation.errors
        };
      }

      // Procesar según el tipo detectado
      let agent: AgentTemplate;

      if (validation.detectedType === 'squad') {
        agent = await this.processSquadImport(jsonData, userId);
      } else {
        agent = await this.processSingleAgentImport(jsonData, userId);
      }

      // Guardar en base de datos
      const savedAgent = await this.createTemplate(agent);

      return {
        success: true,
        message: `Agente "${agent.name}" importado exitosamente`,
        agent: savedAgent,
        warnings: validation.warnings
      };

    } catch (error) {
      console.error('Error importing agent:', error);
      return {
        success: false,
        message: 'Error al importar agente',
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }

  private validateAgentJSON(jsonData: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validaciones básicas
    if (!jsonData) {
      errors.push('JSON vacío o inválido');
      return { isValid: false, errors, warnings, detectedType: 'invalid' };
    }

    // Detectar tipo de agente
    let detectedType: 'single' | 'squad' | 'invalid' = 'invalid';
    let agentCount = 0;
    let toolsCount = 0;

    // Verificar si es un squad
    if (jsonData.squad && jsonData.squad.members) {
      detectedType = 'squad';
      agentCount = jsonData.squad.members.length;
      
      // Validar estructura de squad
      if (!jsonData.squad.name) {
        errors.push('El squad debe tener un nombre');
      }

      if (!Array.isArray(jsonData.squad.members) || jsonData.squad.members.length === 0) {
        errors.push('El squad debe tener al menos un miembro');
      }

      // Validar cada miembro del squad
      jsonData.squad.members.forEach((member: any, index: number) => {
        if (!member.assistant?.name) {
          errors.push(`Miembro ${index + 1}: falta nombre del asistente`);
        }
        if (!member.assistant?.model) {
          errors.push(`Miembro ${index + 1}: falta configuración del modelo`);
        }
        if (member.assistant?.tools) {
          toolsCount += member.assistant.tools.length;
        }
      });
    }
    // Verificar si es un agente individual
    else if (jsonData.name || jsonData.assistant) {
      detectedType = 'single';
      agentCount = 1;
      
      const agent = jsonData.assistant || jsonData;
      
      if (!agent.name) {
        errors.push('El agente debe tener un nombre');
      }
      if (!agent.model) {
        errors.push('El agente debe tener configuración del modelo');
      }
      if (agent.tools) {
        toolsCount = agent.tools.length;
      }
    }
    // Verificar si es un workflow de n8n
    else if (jsonData.nodes && Array.isArray(jsonData.nodes)) {
      // Buscar nodos que parezcan agentes VAPI
      const vapiNodes = jsonData.nodes.filter((node: any) => 
        node.parameters && (
          node.parameters.squad || 
          node.parameters.assistant ||
          (typeof node.parameters === 'string' && node.parameters.includes('assistant'))
        )
      );

      if (vapiNodes.length > 0) {
        detectedType = 'squad';
        agentCount = vapiNodes.length;
        warnings.push('Detectado workflow de n8n con configuración VAPI');
      } else {
        errors.push('No se detectó configuración de agentes válida en el workflow');
      }
    }

    if (detectedType === 'invalid') {
      errors.push('Formato de agente no reconocido. Debe ser un agente individual, squad o workflow válido');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      detectedType,
      agentCount,
      toolsCount
    };
  }

  private async processSquadImport(jsonData: any, userId: string): Promise<AgentTemplate> {
    const squad = jsonData.squad;
    const tools: Tool[] = [];
    const members: SquadMember[] = [];

    // Procesar cada miembro del squad
    for (const member of squad.members) {
      const assistant = member.assistant;
      
      // Extraer tools del miembro
      if (assistant.model?.tools) {
        for (const tool of assistant.model.tools) {
          if (tool.type === 'function') {
            const newTool: Tool = {
              name: tool.function.name,
              description: tool.function.description || '',
              category: 'imported',
              function_schema: tool.function,
              server_url: tool.server?.url || '',
              is_async: tool.async || false,
              messages: tool.messages || [],
              created_by: userId,
              is_reusable: true,
              usage_count: 0
            };
            tools.push(newTool);
          }
        }
      }

      // Crear configuración del miembro
      const squadMember: SquadMember = {
        id: assistant.name.replace(/[^a-zA-Z0-9]/g, '_'),
        name: assistant.name,
        role: this.extractRoleFromPrompts(assistant.model?.messages || []),
        description: assistant.model?.messages?.[0]?.content?.substring(0, 200) || '',
        model_config: {
          provider: assistant.model?.provider || 'openai',
          model: assistant.model?.model || 'gpt-4o',
          temperature: assistant.model?.temperature || 0.7,
          fallback_models: assistant.model?.fallbackModels || []
        },
        voice_config: {
          provider: assistant.voice?.provider || '11labs',
          voice_id: assistant.voice?.voiceId || '',
          model: assistant.voice?.model || 'eleven_turbo_v2_5',
          stability: assistant.voice?.stability || 0.5,
          similarity_boost: assistant.voice?.similarityBoost || 0.8,
          style: assistant.voice?.style || 0,
          speed: assistant.voice?.speed || 1.0
        },
        system_prompts: assistant.model?.messages?.map((m: any) => m.content) || [],
        tools: assistant.model?.tools?.map((t: any) => t.function?.name) || [],
        destinations: member.assistantDestinations?.map((dest: any) => ({
          type: dest.type,
          assistant_name: dest.assistantName,
          number: dest.number,
          message: dest.message || '',
          description: dest.description || ''
        })) || []
      };

      members.push(squadMember);
    }

    return {
      name: squad.name,
      description: `Squad importado con ${members.length} miembros`,
      category: 'imported',
      keywords: ['squad', 'imported', 'multi-agent'],
      use_cases: ['Atención al cliente', 'Ventas', 'Soporte'],
      is_squad: true,
      squad_config: {
        name: squad.name,
        description: `Squad con ${members.length} agentes especializados`,
        members
      },
      tools,
      created_by: userId,
      usage_count: 0,
      success_rate: 0,
      is_active: true,
      vapi_config: jsonData
    };
  }

  private async processSingleAgentImport(jsonData: any, userId: string): Promise<AgentTemplate> {
    const agent = jsonData.assistant || jsonData;
    const tools: Tool[] = [];

    // Extraer tools del agente
    if (agent.model?.tools) {
      for (const tool of agent.model.tools) {
        if (tool.type === 'function') {
          const newTool: Tool = {
            name: tool.function.name,
            description: tool.function.description || '',
            category: 'imported',
            function_schema: tool.function,
            server_url: tool.server?.url || '',
            is_async: tool.async || false,
            messages: tool.messages || [],
            created_by: userId,
            is_reusable: true,
            usage_count: 0
          };
          tools.push(newTool);
        }
      }
    }

    return {
      name: agent.name,
      description: agent.model?.messages?.[0]?.content?.substring(0, 200) || 'Agente importado',
      category: 'imported',
      keywords: ['imported', 'single-agent'],
      use_cases: ['Atención personalizada'],
      is_squad: false,
      single_agent_config: {
        name: agent.name,
        role: this.extractRoleFromPrompts(agent.model?.messages || []),
        description: agent.model?.messages?.[0]?.content?.substring(0, 200) || '',
        model_config: {
          provider: agent.model?.provider || 'openai',
          model: agent.model?.model || 'gpt-4o',
          temperature: agent.model?.temperature || 0.7,
          fallback_models: agent.model?.fallbackModels || []
        },
        voice_config: {
          provider: agent.voice?.provider || '11labs',
          voice_id: agent.voice?.voiceId || '',
          model: agent.voice?.model || 'eleven_turbo_v2_5',
          stability: agent.voice?.stability || 0.5,
          similarity_boost: agent.voice?.similarityBoost || 0.8,
          style: agent.voice?.style || 0,
          speed: agent.voice?.speed || 1.0
        },
        system_prompts: agent.model?.messages?.map((m: any) => m.content) || []
      },
      tools,
      created_by: userId,
      usage_count: 0,
      success_rate: 0,
      is_active: true,
      vapi_config: jsonData
    };
  }

  private extractRoleFromPrompts(messages: any[]): string {
    if (!messages || messages.length === 0) return 'Asistente';
    
    const firstMessage = messages[0]?.content || '';
    
    // Buscar patrones comunes de roles
    if (firstMessage.toLowerCase().includes('ventas')) return 'Agente de Ventas';
    if (firstMessage.toLowerCase().includes('soporte')) return 'Agente de Soporte';
    if (firstMessage.toLowerCase().includes('recepción')) return 'Recepcionista';
    if (firstMessage.toLowerCase().includes('atención')) return 'Atención al Cliente';
    if (firstMessage.toLowerCase().includes('técnico')) return 'Soporte Técnico';
    
    return 'Asistente Virtual';
  }

  // =================== GESTIÓN DE TOOLS ===================

  async getTools(userId?: string): Promise<Tool[]> {
    try {
      // Verificar si las tablas existen
      const { error: tableError } = await supabase
        .from('tools')
        .select('id')
        .limit(1);

      if (tableError) {
        console.warn('Tabla tools no existe aún. Retornando datos de ejemplo.');
        return this.getMockTools();
      }

      let query = supabase
        .from('tools')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('created_by', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching tools:', error);
      return this.getMockTools();
    }
  }

  async createTool(tool: Omit<Tool, 'id' | 'created_at'>): Promise<Tool> {
    try {
      const { data, error } = await supabase
        .from('tools')
        .insert({
          name: tool.name,
          description: tool.description,
          category: tool.category,
          function_schema: tool.function_schema,
          server_url: tool.server_url,
          is_async: tool.is_async,
          messages: tool.messages,
          created_by: tool.created_by,
          is_reusable: tool.is_reusable,
          usage_count: 0
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating tool:', error);
      throw error;
    }
  }

  async updateTool(id: string, updates: Partial<Tool>): Promise<Tool> {
    try {
      const { data, error } = await supabase
        .from('tools')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating tool:', error);
      throw error;
    }
  }

  async deleteTool(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tools')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting tool:', error);
      return false;
    }
  }

  // =================== GENERACIÓN VAPI ===================

  generateVAPIConfig(template: AgentTemplate): any {
    if (template.is_squad) {
      return this.generateSquadVAPIConfig(template);
    } else {
      return this.generateSingleAgentVAPIConfig(template);
    }
  }

  private generateSquadVAPIConfig(template: AgentTemplate): any {
    if (!template.squad_config) return null;

    const squadConfig = {
      squad: {
        name: template.squad_config.name,
        members: template.squad_config.members.map(member => ({
          assistant: {
            name: member.name,
            model: {
              provider: member.model_config.provider,
              model: member.model_config.model,
              temperature: member.model_config.temperature,
              fallbackModels: member.model_config.fallback_models || [],
              tools: this.generateToolsForMember(member, template.tools),
              messages: member.system_prompts.map(prompt => ({
                role: 'system',
                content: prompt
              }))
            },
            voice: {
              provider: member.voice_config.provider,
              voiceId: member.voice_config.voice_id,
              model: member.voice_config.model,
              stability: member.voice_config.stability,
              similarityBoost: member.voice_config.similarity_boost,
              style: member.voice_config.style,
              speed: member.voice_config.speed,
              useSpeakerBoost: true,
              enableSsmlParsing: true
            },
            transcriber: {
              provider: 'deepgram',
              model: 'nova-3',
              language: 'multi',
              numerals: true,
              smartFormat: true,
              endpointing: 180,
              confidenceThreshold: 0.75
            },
            maxDurationSeconds: 1800,
            backgroundDenoisingEnabled: true,
            endCallFunctionEnabled: true,
            recordingEnabled: true
          },
          assistantDestinations: member.destinations?.map(dest => ({
            type: dest.type,
            assistantName: dest.assistant_name,
            number: dest.number,
            message: dest.message,
            description: dest.description
          })) || []
        }))
      }
    };

    return squadConfig;
  }

  private generateSingleAgentVAPIConfig(template: AgentTemplate): any {
    if (!template.single_agent_config) return null;

    const config = template.single_agent_config;

    return {
      name: config.name,
      model: {
        provider: config.model_config.provider,
        model: config.model_config.model,
        temperature: config.model_config.temperature,
        fallbackModels: config.model_config.fallback_models || [],
        tools: this.generateToolsConfig(template.tools),
        messages: config.system_prompts.map(prompt => ({
          role: 'system',
          content: prompt
        }))
      },
      voice: {
        provider: config.voice_config.provider,
        voiceId: config.voice_config.voice_id,
        model: config.voice_config.model,
        stability: config.voice_config.stability,
        similarityBoost: config.voice_config.similarity_boost,
        style: config.voice_config.style,
        speed: config.voice_config.speed,
        useSpeakerBoost: true,
        enableSsmlParsing: true
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-3',
        language: 'multi',
        numerals: true,
        smartFormat: true,
        endpointing: 180,
        confidenceThreshold: 0.75
      },
      maxDurationSeconds: 1800,
      backgroundDenoisingEnabled: true,
      endCallFunctionEnabled: true,
      recordingEnabled: true
    };
  }

  private generateToolsForMember(member: SquadMember, allTools: Tool[]): any[] {
    return allTools
      .filter(tool => member.tools.includes(tool.name))
      .map(tool => ({
        type: 'function',
        async: tool.is_async,
        messages: tool.messages || [],
        function: tool.function_schema,
        server: {
          url: tool.server_url
        }
      }));
  }

  private generateToolsConfig(tools: Tool[]): any[] {
    return tools.map(tool => ({
      type: 'function',
      async: tool.is_async,
      messages: tool.messages || [],
      function: tool.function_schema,
      server: {
        url: tool.server_url
      }
    }));
  }

  // =================== ESTADÍSTICAS ===================

  async getStatistics(): Promise<{
    totalTemplates: number;
    totalUsage: number;
    averageSuccess: number;
    totalCategories: number;
    totalTools: number;
  }> {
    try {
      // Verificar si las tablas existen
      const { error: tableError } = await supabase
        .from('agent_templates')
        .select('id')
        .limit(1);

      if (tableError) {
        console.warn('Tablas no existen aún. Retornando estadísticas mock.');
        const mockTemplates = this.getMockTemplates();
        const mockTools = this.getMockTools();
        
        const totalUsage = mockTemplates.reduce((sum, t) => sum + t.usage_count, 0);
        const averageSuccess = mockTemplates.reduce((sum, t) => sum + t.success_rate, 0) / mockTemplates.length;
        const categories = new Set(mockTemplates.map(t => t.category));

        return {
          totalTemplates: mockTemplates.length,
          totalUsage,
          averageSuccess: Math.round(averageSuccess * 100) / 100,
          totalCategories: categories.size,
          totalTools: mockTools.length
        };
      }

      const [templatesResult, toolsResult] = await Promise.all([
        supabase
          .from('agent_templates')
          .select('usage_count, success_rate, category')
          .eq('is_active', true),
        supabase
          .from('tools')
          .select('id')
      ]);

      const templates = templatesResult.data || [];
      const tools = toolsResult.data || [];

      const totalUsage = templates.reduce((sum, t) => sum + (t.usage_count || 0), 0);
      const averageSuccess = templates.length > 0 
        ? templates.reduce((sum, t) => sum + (t.success_rate || 0), 0) / templates.length 
        : 0;
      const categories = new Set(templates.map(t => t.category));

      return {
        totalTemplates: templates.length,
        totalUsage,
        averageSuccess: Math.round(averageSuccess * 100) / 100,
        totalCategories: categories.size,
        totalTools: tools.length
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return {
        totalTemplates: 0,
        totalUsage: 0,
        averageSuccess: 0,
        totalCategories: 0,
        totalTools: 0
      };
    }
  }

  // =================== DATOS MOCK (TEMPORAL) ===================

  private getMockTemplates(): AgentTemplate[] {
    return [
      {
        id: 'mock-1',
        name: 'Agente de Ventas Básico',
        description: 'Plantilla base para agentes de ventas con funcionalidades esenciales',
        category: 'ventas',
        keywords: ['ventas', 'conversion', 'leads'],
        use_cases: ['Calificación de leads', 'Seguimiento de prospectos'],
        is_squad: false,
        single_agent_config: {
          name: 'Agente de Ventas',
          role: 'Especialista en Ventas',
          description: 'Agente especializado en procesos de venta',
          model_config: {
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.7,
            fallback_models: ['gpt-4-0125-preview']
          },
          voice_config: {
            provider: '11labs',
            voice_id: 'pNInz6obpgDQGcFmaJgB',
            model: 'eleven_turbo_v2_5',
            stability: 0.5,
            similarity_boost: 0.8,
            speed: 1.0
          },
          system_prompts: ['Eres un agente de ventas profesional y persuasivo.']
        },
        tools: [],
        created_by: 'system',
        created_at: '2024-01-15T10:00:00Z',
        usage_count: 15,
        success_rate: 85,
        is_active: true
      },
      {
        id: 'mock-2',
        name: 'Squad Atención al Cliente',
        description: 'Squad completo para atención al cliente con escalamiento automático',
        category: 'atencion',
        keywords: ['atencion', 'soporte', 'squad'],
        use_cases: ['Atención 24/7', 'Escalamiento de casos'],
        is_squad: true,
        squad_config: {
          name: 'Squad Atención al Cliente',
          description: 'Equipo especializado en atención al cliente',
          members: [
            {
              id: 'agent-1',
              name: 'Recepcionista Virtual',
              role: 'Primera Línea',
              description: 'Agente que recibe las consultas iniciales',
              model_config: {
                provider: 'openai',
                model: 'gpt-4o',
                temperature: 0.6,
                fallback_models: []
              },
              voice_config: {
                provider: '11labs',
                voice_id: 'voice-1',
                model: 'eleven_turbo_v2_5',
                stability: 0.5,
                similarity_boost: 0.8,
                speed: 1.0
              },
              system_prompts: ['Eres una recepcionista virtual amigable y eficiente.'],
              tools: [],
              destinations: [{
                type: 'assistant',
                assistant_name: 'Especialista Técnico',
                message: 'Te transfiero con un especialista',
                description: 'Transferir casos técnicos'
              }]
            }
          ]
        },
        tools: [],
        created_by: 'system',
        created_at: '2024-01-10T10:00:00Z',
        usage_count: 8,
        success_rate: 92,
        is_active: true
      }
    ];
  }

  private getMockTools(): Tool[] {
    return [
      {
        id: 'tool-1',
        name: 'send_email',
        description: 'Envía emails personalizados a clientes',
        category: 'communication',
        function_schema: {
          name: 'send_email',
          description: 'Envía un email',
          parameters: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Email del destinatario' },
              subject: { type: 'string', description: 'Asunto del email' },
              body: { type: 'string', description: 'Contenido del email' }
            },
            required: ['to', 'subject', 'body']
          }
        },
        server_url: 'https://api.ejemplo.com/send-email',
        is_async: true,
        messages: [],
        created_by: 'system',
        created_at: '2024-01-01T10:00:00Z',
        is_reusable: true,
        usage_count: 25
      },
      {
        id: 'tool-2',
        name: 'get_weather',
        description: 'Obtiene información del clima actual',
        category: 'utility',
        function_schema: {
          name: 'get_weather',
          description: 'Obtiene el clima',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'Ubicación' }
            },
            required: ['location']
          }
        },
        server_url: 'https://api.ejemplo.com/weather',
        is_async: false,
        messages: [],
        created_by: 'system',
        created_at: '2024-01-01T10:00:00Z',
        is_reusable: true,
        usage_count: 12
      }
    ];
  }

  // =================== UTILIDADES ===================

  async incrementUsage(templateId: string): Promise<void> {
    try {
      // Verificar si las tablas existen
      const { error: tableError } = await supabase
        .from('agent_templates')
        .select('id')
        .limit(1);

      if (tableError) {
        console.warn('Tablas no existen aún. Incremento simulado.');
        return;
      }

      await supabase.rpc('increment_template_usage', { template_id: templateId });
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  }

  async updateSuccessRate(templateId: string, success: boolean): Promise<void> {
    try {
      // Esta función requeriría una implementación más compleja
      // para calcular la tasa de éxito promedio
      console.log('Updating success rate for template:', templateId, success);
    } catch (error) {
      console.error('Error updating success rate:', error);
    }
  }
}

export const agentStudioService = new AgentStudioService();
export default agentStudioService;
