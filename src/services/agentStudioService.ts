// ============================================
// SERVICIO PARA AGENT STUDIO
// Gestión completa de plantillas, categorías, prompts y herramientas
// ============================================

import { supabaseMainAdmin } from '../config/supabase';

// Tipos
export interface AgentTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  category_name?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_time: string;
  icon: string;
  agent_type: 'inbound' | 'outbound';
  keywords: string[];
  use_cases: string[];
  business_context?: string;
  vapi_config: any;
  usage_count: number;
  success_rate: number;
  is_active: boolean;
  is_public: boolean;
  source_type?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AgentCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface SystemPrompt {
  id: string;
  title: string;
  content: string;
  role: 'system' | 'user' | 'assistant';
  category: string;
  prompt_type: string;
  keywords: string[];
  applicable_categories: string[];
  order_priority: number;
  is_required: boolean;
  is_editable: boolean;
  variables: any;
  created_at: string;
  updated_at: string;
}

export interface Tool {
  id: string;
  name: string;
  tool_type: string;
  category: string;
  config: any;
  description: string;
  complexity: 'low' | 'medium' | 'high';
  keywords: string[];
  use_cases: string[];
  integration_requirements: string[];
  applicable_categories: string[];
  is_active: boolean;
  usage_count: number;
  success_rate: number;
  setup_instructions?: string;
  example_usage?: any;
  troubleshooting_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentRequest {
  name: string;
  description: string;
  category_id: string;
  agent_type: 'inbound' | 'outbound';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_time: string;
  keywords: string[];
  use_cases: string[];
  business_context?: string;
  selectedPrompts: string[];
  selectedTools: string[];
  vapi_config?: any;
  created_by: string;
}

class AgentStudioService {

  // ============================================
  // GESTIÓN DE PLANTILLAS
  // ============================================

  /**
   * Obtener todas las plantillas activas
   */
  async getTemplates(): Promise<AgentTemplate[]> {
    try {
      const { data, error } = await supabaseMainAdmin
        .from('agent_templates')
        .select(`
          *,
          agent_categories!inner(name, icon, color)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo plantillas:', error);
        return [];
      }

      return data?.map(template => ({
        ...template,
        category_name: template.agent_categories?.name,
        icon: template.icon || template.agent_categories?.icon
      })) || [];
    } catch (error) {
      console.error('💥 Error en getTemplates:', error);
      return [];
    }
  }

  /**
   * Obtener plantilla por ID
   */
  async getTemplateById(id: string): Promise<AgentTemplate | null> {
    try {
      const { data, error } = await supabaseMainAdmin
        .from('agent_templates')
        .select(`
          *,
          agent_categories(name, icon, color)
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('❌ Error obteniendo plantilla:', error);
        return null;
      }

      return {
        ...data,
        category_name: data.agent_categories?.name,
        icon: data.icon || data.agent_categories?.icon
      };
    } catch (error) {
      console.error('💥 Error en getTemplateById:', error);
      return null;
    }
  }

  /**
   * Crear nueva plantilla
   */
  async createTemplate(request: CreateAgentRequest): Promise<AgentTemplate | null> {
    try {
      // Generar slug único
      const baseSlug = request.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      
      let slug = baseSlug;
      let counter = 1;
      
      // Verificar unicidad del slug
      while (true) {
        const { data: existing } = await supabaseMainAdmin
          .from('agent_templates')
          .select('id')
          .eq('slug', slug)
          .single();

        if (!existing) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Construir configuración VAPI optimizada
      const vapiConfig = await this.buildVapiConfig(request);

      // Crear plantilla principal
      const { data: template, error: templateError } = await supabaseMainAdmin
        .from('agent_templates')
        .insert({
          name: request.name,
          slug,
          description: request.description,
          category_id: request.category_id,
          difficulty: request.difficulty,
          estimated_time: request.estimated_time,
          agent_type: request.agent_type,
          keywords: request.keywords,
          use_cases: request.use_cases,
          business_context: request.business_context,
          vapi_config: vapiConfig,
          created_by: request.created_by,
          is_active: true,
          is_public: true,
          source_type: 'agent_studio',
          usage_count: 0,
          success_rate: 0.0
        })
        .select()
        .single();

      if (templateError) {
        console.error('❌ Error creando plantilla:', templateError);
        return null;
      }

      // Crear relaciones con prompts
      if (request.selectedPrompts.length > 0) {
        const promptRelations = request.selectedPrompts.map((promptId, index) => ({
          agent_template_id: template.id,
          system_prompt_id: promptId,
          order_index: index + 1,
          is_customized: false
        }));

        const { error: promptError } = await supabaseMainAdmin
          .from('agent_prompts')
          .insert(promptRelations);

        if (promptError) {
          console.error('❌ Error creando relaciones de prompts:', promptError);
        }
      }

      // Crear relaciones con herramientas
      if (request.selectedTools.length > 0) {
        const toolRelations = request.selectedTools.map(toolId => ({
          agent_template_id: template.id,
          tool_id: toolId,
          is_enabled: true
        }));

        const { error: toolError } = await supabaseMainAdmin
          .from('agent_tools')
          .insert(toolRelations);

        if (toolError) {
          console.error('❌ Error creando relaciones de herramientas:', toolError);
        }
      }

      console.log('✅ Plantilla creada exitosamente:', template.name);
      return template;
    } catch (error) {
      console.error('💥 Error en createTemplate:', error);
      return null;
    }
  }

  /**
   * Construir configuración VAPI optimizada
   */
  private async buildVapiConfig(request: CreateAgentRequest): Promise<any> {
    try {
      // Obtener prompts seleccionados
      const { data: prompts } = await supabaseMainAdmin
        .from('system_prompts')
        .select('*')
        .in('id', request.selectedPrompts)
        .order('order_priority');

      // Obtener herramientas seleccionadas
      const { data: tools } = await supabaseMainAdmin
        .from('tool_catalog')
        .select('*')
        .in('id', request.selectedTools);

      // Configuración base optimizada
      const config = {
        name: request.name,
        model: {
          provider: "openai",
          model: "gpt-4o",
          temperature: 0.7,
          fallbackModels: ["gpt-4-0125-preview", "gpt-3.5-turbo"]
        },
        voice: {
          provider: "11labs",
          voiceId: "9qxz2UdKZeMN5XFM4myE",
          model: "eleven_turbo_v2_5",
          stability: 0.30,
          similarityBoost: 0.75,
          style: 0.9,
          speed: 1.0,
          useSpeakerBoost: true,
          enableSsmlParsing: true,
          fallbackPlan: {
            voices: [{
              provider: "11labs",
              voiceId: "R9EPoSH2zk7AP9XgMBCk",
              model: "eleven_turbo_v2_5"
            }]
          }
        },
        transcriber: {
          provider: "deepgram",
          model: "nova-3",
          language: "es",
          numerals: true,
          smartFormat: true,
          endpointing: 280,
          confidenceThreshold: 0.75,
          keywords: request.keywords
        },
        messages: prompts?.map(prompt => ({
          role: prompt.role,
          content: prompt.content
        })) || [],
        tools: tools?.map(tool => tool.config).filter(Boolean) || [],
        firstMessage: "Hola, soy su asistente virtual. ¿En qué puedo ayudarle?",
        firstMessageMode: "assistant-speaks-first",
        firstMessageInterruptionsEnabled: true,
        backgroundSound: "office",
        maxDurationSeconds: 900,
        backgroundDenoisingEnabled: true,
        recordingEnabled: true,
        endCallFunctionEnabled: true,
        endCallPhrases: ["hasta luego", "bye", "adiós", "gracias"],
        endCallMessage: "Gracias por contactarnos. ¡Que tenga un excelente día!",
        messagePlan: {
          idleMessages: ["¿Sigue ahí?", "¿Me escucha bien?"],
          idleMessageMaxSpokenCount: 2,
          idleTimeoutSeconds: 7
        },
        startSpeakingPlan: {
          waitSeconds: 0.8,
          smartEndpointingEnabled: true
        },
        stopSpeakingPlan: {
          numWords: 1,
          voiceSeconds: 0.2,
          backoffSeconds: 1
        },
        voicemailDetection: {
          provider: "vapi"
        },
        analysisPlan: {
          summaryPrompt: `Analiza esta conversación y proporciona un resumen conciso destacando: 1) El propósito de la llamada, 2) Los puntos clave discutidos, 3) El resultado o resolución alcanzada, 4) Próximos pasos si los hay.`,
          structuredDataPrompt: "Extrae información estructurada de esta conversación según el esquema proporcionado.",
          structuredDataSchema: {
            type: "object",
            properties: {
              purpose: { type: "string", description: "Propósito principal de la llamada" },
              outcome: { type: "string", description: "Resultado de la conversación" },
              nextSteps: { type: "array", items: { type: "string" }, description: "Próximos pasos acordados" },
              customerSatisfaction: { type: "string", enum: ["high", "medium", "low"], description: "Nivel de satisfacción percibido" }
            }
          },
          successEvaluationPrompt: "Evalúa el éxito de esta conversación basándote en si se cumplieron los objetivos del agente y la satisfacción del cliente.",
          successEvaluationRubric: "NumericScale"
        }
      };

      return config;
    } catch (error) {
      console.error('💥 Error construyendo configuración VAPI:', error);
      return {};
    }
  }

  /**
   * Actualizar plantilla existente
   */
  async updateTemplate(id: string, updates: Partial<AgentTemplate>): Promise<boolean> {
    try {
      const { error } = await supabaseMainAdmin
        .from('agent_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error actualizando plantilla:', error);
        return false;
      }

      console.log('✅ Plantilla actualizada exitosamente');
      return true;
    } catch (error) {
      console.error('💥 Error en updateTemplate:', error);
      return false;
    }
  }

  /**
   * Eliminar plantilla (soft delete)
   */
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const { error } = await supabaseMainAdmin
        .from('agent_templates')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error eliminando plantilla:', error);
        return false;
      }

      console.log('✅ Plantilla eliminada exitosamente');
      return true;
    } catch (error) {
      console.error('💥 Error en deleteTemplate:', error);
      return false;
    }
  }

  /**
   * Duplicar plantilla
   */
  async duplicateTemplate(originalId: string, newName: string, userId: string): Promise<AgentTemplate | null> {
    try {
      // Obtener plantilla original con relaciones
      const original = await this.getTemplateById(originalId);
      if (!original) return null;

      // Obtener prompts asociados
      const { data: promptRelations } = await supabaseMainAdmin
        .from('agent_prompts')
        .select('system_prompt_id, order_index, is_customized, custom_content')
        .eq('agent_template_id', originalId)
        .order('order_index');

      // Obtener herramientas asociadas
      const { data: toolRelations } = await supabaseMainAdmin
        .from('agent_tools')
        .select('tool_id, is_enabled, custom_config')
        .eq('agent_template_id', originalId);

      // Crear nueva plantilla
      const createRequest: CreateAgentRequest = {
        name: newName,
        description: `${original.description} (Copia)`,
        category_id: original.category_id,
        agent_type: original.agent_type,
        difficulty: original.difficulty,
        estimated_time: original.estimated_time,
        keywords: [...original.keywords],
        use_cases: [...original.use_cases],
        business_context: original.business_context,
        selectedPrompts: promptRelations?.map(pr => pr.system_prompt_id) || [],
        selectedTools: toolRelations?.map(tr => tr.tool_id) || [],
        vapi_config: original.vapi_config,
        created_by: userId
      };

      return await this.createTemplate(createRequest);
    } catch (error) {
      console.error('💥 Error en duplicateTemplate:', error);
      return null;
    }
  }

  // ============================================
  // GESTIÓN DE CATEGORÍAS
  // ============================================

  /**
   * Obtener todas las categorías
   */
  async getCategories(): Promise<AgentCategory[]> {
    try {
      const { data, error } = await supabaseMainAdmin
        .from('agent_categories')
        .select('*')
        .order('name');

      if (error) {
        console.error('❌ Error obteniendo categorías:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('💥 Error en getCategories:', error);
      return [];
    }
  }

  /**
   * Crear nueva categoría
   */
  async createCategory(category: Omit<AgentCategory, 'id' | 'created_at' | 'updated_at'>): Promise<AgentCategory | null> {
    try {
      const { data, error } = await supabaseMainAdmin
        .from('agent_categories')
        .insert(category)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando categoría:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('💥 Error en createCategory:', error);
      return null;
    }
  }

  // ============================================
  // GESTIÓN DE PROMPTS
  // ============================================

  /**
   * Obtener prompts del sistema
   */
  async getSystemPrompts(categoryFilter?: string): Promise<SystemPrompt[]> {
    try {
      let query = supabaseMainAdmin
        .from('system_prompts')
        .select('*')
        .order('order_priority');

      if (categoryFilter) {
        query = query.contains('applicable_categories', [categoryFilter]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error obteniendo prompts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('💥 Error en getSystemPrompts:', error);
      return [];
    }
  }

  /**
   * Crear nuevo prompt
   */
  async createSystemPrompt(prompt: Omit<SystemPrompt, 'id' | 'created_at' | 'updated_at'>): Promise<SystemPrompt | null> {
    try {
      const { data, error } = await supabaseMainAdmin
        .from('system_prompts')
        .insert(prompt)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando prompt:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('💥 Error en createSystemPrompt:', error);
      return null;
    }
  }

  // ============================================
  // GESTIÓN DE HERRAMIENTAS
  // ============================================

  /**
   * Obtener herramientas disponibles
   */
  async getTools(categoryFilter?: string): Promise<Tool[]> {
    try {
      let query = supabaseMainAdmin
        .from('tool_catalog')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (categoryFilter) {
        query = query.contains('applicable_categories', [categoryFilter]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error obteniendo herramientas:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('💥 Error en getTools:', error);
      return [];
    }
  }

  /**
   * Crear nueva herramienta
   */
  async createTool(tool: Omit<Tool, 'id' | 'created_at' | 'updated_at'>): Promise<Tool | null> {
    try {
      const { data, error } = await supabaseMainAdmin
        .from('tool_catalog')
        .insert(tool)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando herramienta:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('💥 Error en createTool:', error);
      return null;
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  /**
   * Incrementar contador de uso
   */
  async incrementUsageCount(templateId: string): Promise<void> {
    try {
      const { error } = await supabaseMainAdmin
        .rpc('increment_template_usage', { template_id: templateId });

      if (error) {
        console.error('❌ Error incrementando contador:', error);
      }
    } catch (error) {
      console.error('💥 Error en incrementUsageCount:', error);
    }
  }

  /**
   * Actualizar tasa de éxito
   */
  async updateSuccessRate(templateId: string, successRate: number): Promise<void> {
    try {
      const { error } = await supabaseMainAdmin
        .from('agent_templates')
        .update({ 
          success_rate: successRate,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId);

      if (error) {
        console.error('❌ Error actualizando tasa de éxito:', error);
      }
    } catch (error) {
      console.error('💥 Error en updateSuccessRate:', error);
    }
  }

  /**
   * Validar configuración VAPI
   */
  validateVapiConfig(config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name) errors.push('Nombre requerido');
    if (!config.model?.provider) errors.push('Proveedor de modelo requerido');
    if (!config.voice?.provider) errors.push('Proveedor de voz requerido');
    if (!config.transcriber?.provider) errors.push('Proveedor de transcripción requerido');
    if (!config.messages || config.messages.length === 0) errors.push('Al menos un mensaje del sistema requerido');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Exportar plantilla como JSON
   */
  async exportTemplate(templateId: string): Promise<any> {
    try {
      const template = await this.getTemplateById(templateId);
      if (!template) return null;

      return {
        version: "1.0",
        exported_at: new Date().toISOString(),
        template: {
          ...template,
          prompts: await this.getTemplatePrompts(templateId),
          tools: await this.getTemplateTools(templateId)
        }
      };
    } catch (error) {
      console.error('💥 Error en exportTemplate:', error);
      return null;
    }
  }

  /**
   * Obtener prompts de una plantilla
   */
  private async getTemplatePrompts(templateId: string) {
    const { data } = await supabaseMainAdmin
      .from('agent_prompts')
      .select(`
        order_index,
        is_customized,
        custom_content,
        system_prompts(*)
      `)
      .eq('agent_template_id', templateId)
      .order('order_index');

    return data || [];
  }

  /**
   * Obtener herramientas de una plantilla
   */
  private async getTemplateTools(templateId: string) {
    const { data } = await supabaseMainAdmin
      .from('agent_tools')
      .select(`
        is_enabled,
        custom_config,
        tool_catalog(*)
      `)
      .eq('agent_template_id', templateId);

    return data || [];
  }
}

// Exportar instancia singleton
export const agentStudioService = new AgentStudioService();
export default agentStudioService;
