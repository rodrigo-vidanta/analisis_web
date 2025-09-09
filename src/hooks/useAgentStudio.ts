import { useState, useEffect } from 'react';
import { agentStudioService, type AgentTemplate, type AgentCategory, type SystemPrompt, type Tool } from '../services/agentStudioService';
import { useAuth } from '../contexts/AuthContext';

interface AgentStudioState {
  templates: AgentTemplate[];
  categories: AgentCategory[];
  prompts: SystemPrompt[];
  tools: Tool[];
  loading: boolean;
  error: string | null;
}

export const useAgentStudio = () => {
  const { user } = useAuth();
  const [state, setState] = useState<AgentStudioState>({
    templates: [],
    categories: [],
    prompts: [],
    tools: [],
    loading: true,
    error: null
  });

  // Cargar todos los datos
  const loadAllData = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const [templates, categories, prompts, tools] = await Promise.all([
        agentStudioService.getTemplates(),
        agentStudioService.getCategories(),
        agentStudioService.getSystemPrompts(),
        agentStudioService.getTools()
      ]);

      setState({
        templates,
        categories,
        prompts,
        tools,
        loading: false,
        error: null
      });

      console.log('✅ Datos de Agent Studio cargados:', {
        templates: templates.length,
        categories: categories.length,
        prompts: prompts.length,
        tools: tools.length
      });
    } catch (error) {
      console.error('💥 Error cargando datos de Agent Studio:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Error al cargar los datos del Agent Studio'
      }));
    }
  };

  // Crear nuevo agente
  const createAgent = async (request: any): Promise<boolean> => {
    if (!user) {
      console.error('❌ Usuario no autenticado');
      return false;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const newTemplate = await agentStudioService.createTemplate({
        ...request,
        created_by: user.id
      });

      if (newTemplate) {
        // Recargar plantillas para incluir la nueva
        const updatedTemplates = await agentStudioService.getTemplates();
        setState(prev => ({
          ...prev,
          templates: updatedTemplates,
          loading: false
        }));
        return true;
      }

      setState(prev => ({ ...prev, loading: false }));
      return false;
    } catch (error) {
      console.error('💥 Error creando agente:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Error al crear el agente'
      }));
      return false;
    }
  };

  // Actualizar agente
  const updateAgent = async (id: string, updates: Partial<AgentTemplate>): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const success = await agentStudioService.updateTemplate(id, updates);
      
      if (success) {
        // Recargar plantillas
        const updatedTemplates = await agentStudioService.getTemplates();
        setState(prev => ({
          ...prev,
          templates: updatedTemplates,
          loading: false
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }

      return success;
    } catch (error) {
      console.error('💥 Error actualizando agente:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Error al actualizar el agente'
      }));
      return false;
    }
  };

  // Eliminar agente
  const deleteAgent = async (id: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const success = await agentStudioService.deleteTemplate(id);
      
      if (success) {
        // Actualizar lista local eliminando el agente
        setState(prev => ({
          ...prev,
          templates: prev.templates.filter(t => t.id !== id),
          loading: false
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }

      return success;
    } catch (error) {
      console.error('💥 Error eliminando agente:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Error al eliminar el agente'
      }));
      return false;
    }
  };

  // Duplicar agente
  const duplicateAgent = async (originalId: string, newName: string): Promise<boolean> => {
    if (!user) {
      console.error('❌ Usuario no autenticado');
      return false;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const duplicated = await agentStudioService.duplicateTemplate(originalId, newName, user.id);
      
      if (duplicated) {
        // Recargar plantillas
        const updatedTemplates = await agentStudioService.getTemplates();
        setState(prev => ({
          ...prev,
          templates: updatedTemplates,
          loading: false
        }));
        return true;
      }

      setState(prev => ({ ...prev, loading: false }));
      return false;
    } catch (error) {
      console.error('💥 Error duplicando agente:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Error al duplicar el agente'
      }));
      return false;
    }
  };

  // Incrementar contador de uso
  const incrementUsage = async (templateId: string): Promise<void> => {
    try {
      await agentStudioService.incrementUsageCount(templateId);
      
      // Actualizar contador local
      setState(prev => ({
        ...prev,
        templates: prev.templates.map(t => 
          t.id === templateId 
            ? { ...t, usage_count: t.usage_count + 1 }
            : t
        )
      }));
    } catch (error) {
      console.error('💥 Error incrementando uso:', error);
    }
  };

  // Exportar agente
  const exportAgent = async (templateId: string): Promise<any> => {
    try {
      return await agentStudioService.exportTemplate(templateId);
    } catch (error) {
      console.error('💥 Error exportando agente:', error);
      return null;
    }
  };

  // Filtrar plantillas
  const filterTemplates = (searchTerm: string, categoryId: string, agentType?: string) => {
    return state.templates.filter(template => {
      const matchesSearch = !searchTerm || 
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = categoryId === 'all' || template.category_id === categoryId;
      
      const matchesType = !agentType || template.agent_type === agentType;

      return matchesSearch && matchesCategory && matchesType;
    });
  };

  // Obtener estadísticas
  const getStats = () => {
    const totalTemplates = state.templates.length;
    const totalUsage = state.templates.reduce((sum, t) => sum + t.usage_count, 0);
    const avgSuccessRate = totalTemplates > 0 
      ? state.templates.reduce((sum, t) => sum + t.success_rate, 0) / totalTemplates 
      : 0;

    const byCategory = state.categories.map(category => ({
      ...category,
      count: state.templates.filter(t => t.category_id === category.id).length
    }));

    const byDifficulty = {
      beginner: state.templates.filter(t => t.difficulty === 'beginner').length,
      intermediate: state.templates.filter(t => t.difficulty === 'intermediate').length,
      advanced: state.templates.filter(t => t.difficulty === 'advanced').length
    };

    return {
      totalTemplates,
      totalUsage,
      avgSuccessRate,
      byCategory,
      byDifficulty
    };
  };

  // Cargar datos al inicializar
  useEffect(() => {
    loadAllData();
  }, []);

  return {
    ...state,
    loadAllData,
    createAgent,
    updateAgent,
    deleteAgent,
    duplicateAgent,
    incrementUsage,
    exportAgent,
    filterTemplates,
    getStats
  };
};

export default useAgentStudio;
