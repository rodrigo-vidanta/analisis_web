// Hook completo para Agent Studio con gestión de estado avanzada
// Manejo de importación, squads, roles, tools y perfiles de usuario

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { agentStudioService } from '../services/agentStudioService';
import type { 
  AgentTemplate, 
  Tool, 
  ImportResult, 
  ValidationResult 
} from '../services/agentStudioService';

export interface UseAgentStudioReturn {
  // Estado principal
  templates: AgentTemplate[];
  tools: Tool[];
  loading: boolean;
  error: string | null;
  
  // Estadísticas
  statistics: {
    totalTemplates: number;
    totalUsage: number;
    averageSuccess: number;
    totalCategories: number;
    totalTools: number;
  };

  // Gestión de plantillas
  createTemplate: (template: Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<AgentTemplate>;
  updateTemplate: (id: string, updates: Partial<AgentTemplate>) => Promise<AgentTemplate>;
  deleteTemplate: (id: string) => Promise<boolean>;
  duplicateTemplate: (id: string, newName: string) => Promise<AgentTemplate>;
  getTemplateById: (id: string) => Promise<AgentTemplate | null>;
  
  // Importación de agentes
  importAgent: (jsonData: any) => Promise<ImportResult>;
  validateAgentJSON: (jsonData: any) => ValidationResult;
  
  // Gestión de tools
  createTool: (tool: Omit<Tool, 'id' | 'created_at'>) => Promise<Tool>;
  updateTool: (id: string, updates: Partial<Tool>) => Promise<Tool>;
  deleteTool: (id: string) => Promise<boolean>;
  getMyTools: () => Tool[];
  getReusableTools: () => Tool[];
  
  // Generación VAPI
  generateVAPIConfig: (template: AgentTemplate) => any;
  exportTemplate: (template: AgentTemplate) => string;
  
  // Filtros y búsqueda
  filteredTemplates: AgentTemplate[];
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (category: string) => void;
  setShowMyTemplates: (show: boolean) => void;
  searchTerm: string;
  selectedCategory: string;
  showMyTemplates: boolean;
  
  // Utilidades
  refreshData: () => Promise<void>;
  incrementUsage: (templateId: string) => Promise<void>;
}

export const useAgentStudio = (): UseAgentStudioReturn => {
  const { user } = useAuth();
  
  // Estado principal
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estadísticas
  const [statistics, setStatistics] = useState({
    totalTemplates: 0,
    totalUsage: 0,
    averageSuccess: 0,
    totalCategories: 0,
    totalTools: 0
  });
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showMyTemplates, setShowMyTemplates] = useState(false);

  // Cargar datos iniciales
  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [templatesData, toolsData, statsData] = await Promise.all([
        agentStudioService.getTemplates(),
        agentStudioService.getTools(),
        agentStudioService.getStatistics()
      ]);
      
      setTemplates(templatesData);
      setTools(toolsData);
      setStatistics(statsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Gestión de plantillas
  const createTemplate = useCallback(async (templateData: Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<AgentTemplate> => {
    if (!user) throw new Error('Usuario no autenticado');
    
    try {
      const template = await agentStudioService.createTemplate({
        ...templateData,
        created_by: user.id
      });
      
      setTemplates(prev => [template, ...prev]);
      await loadData(); // Refrescar estadísticas
      
      return template;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creando plantilla';
      setError(errorMessage);
      throw err;
    }
  }, [user, loadData]);

  const updateTemplate = useCallback(async (id: string, updates: Partial<AgentTemplate>): Promise<AgentTemplate> => {
    try {
      const updatedTemplate = await agentStudioService.updateTemplate(id, updates);
      
      setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t));
      
      return updatedTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando plantilla';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await agentStudioService.deleteTemplate(id);
      
      if (success) {
        setTemplates(prev => prev.filter(t => t.id !== id));
        await loadData(); // Refrescar estadísticas
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error eliminando plantilla';
      setError(errorMessage);
      throw err;
    }
  }, [loadData]);

  const duplicateTemplate = useCallback(async (id: string, newName: string): Promise<AgentTemplate> => {
    if (!user) throw new Error('Usuario no autenticado');
    
    try {
      const duplicated = await agentStudioService.duplicateTemplate(id, newName, user.id);
      
      setTemplates(prev => [duplicated, ...prev]);
      await loadData(); // Refrescar estadísticas
      
      return duplicated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error duplicando plantilla';
      setError(errorMessage);
      throw err;
    }
  }, [user, loadData]);

  const getTemplateById = useCallback(async (id: string): Promise<AgentTemplate | null> => {
    try {
      return await agentStudioService.getTemplateById(id);
    } catch (err) {
      console.error('Error getting template by ID:', err);
      return null;
    }
  }, []);

  // Importación de agentes
  const importAgent = useCallback(async (jsonData: any): Promise<ImportResult> => {
    if (!user) throw new Error('Usuario no autenticado');
    
    try {
      const result = await agentStudioService.importAgent(jsonData, user.id);
      
      if (result.success && result.agent) {
        setTemplates(prev => [result.agent!, ...prev]);
        await loadData(); // Refrescar datos
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error importando agente';
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage]
      };
    }
  }, [user, loadData]);

  const validateAgentJSON = useCallback((jsonData: any): ValidationResult => {
    // Esta función se implementa en el servicio
    return agentStudioService['validateAgentJSON'](jsonData);
  }, []);

  // Gestión de tools
  const createTool = useCallback(async (toolData: Omit<Tool, 'id' | 'created_at'>): Promise<Tool> => {
    if (!user) throw new Error('Usuario no autenticado');
    
    try {
      const tool = await agentStudioService.createTool({
        ...toolData,
        created_by: user.id
      });
      
      setTools(prev => [tool, ...prev]);
      await loadData(); // Refrescar estadísticas
      
      return tool;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creando tool';
      setError(errorMessage);
      throw err;
    }
  }, [user, loadData]);

  const updateTool = useCallback(async (id: string, updates: Partial<Tool>): Promise<Tool> => {
    try {
      const updatedTool = await agentStudioService.updateTool(id, updates);
      
      setTools(prev => prev.map(t => t.id === id ? updatedTool : t));
      
      return updatedTool;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando tool';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteTool = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await agentStudioService.deleteTool(id);
      
      if (success) {
        setTools(prev => prev.filter(t => t.id !== id));
        await loadData(); // Refrescar estadísticas
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error eliminando tool';
      setError(errorMessage);
      throw err;
    }
  }, [loadData]);

  const getMyTools = useCallback((): Tool[] => {
    if (!user) return [];
    return tools.filter(tool => tool.created_by === user.id);
  }, [tools, user]);

  const getReusableTools = useCallback((): Tool[] => {
    return tools.filter(tool => tool.is_reusable);
  }, [tools]);

  // Generación VAPI
  const generateVAPIConfig = useCallback((template: AgentTemplate): any => {
    return agentStudioService.generateVAPIConfig(template);
  }, []);

  const exportTemplate = useCallback((template: AgentTemplate): string => {
    const vapiConfig = generateVAPIConfig(template);
    return JSON.stringify(vapiConfig, null, 2);
  }, [generateVAPIConfig]);

  // Filtros aplicados
  const filteredTemplates = useCallback(() => {
    let filtered = templates;

    // Filtro por usuario
    if (showMyTemplates && user) {
      filtered = filtered.filter(template => template.created_by === user.id);
    }

    // Filtro por categoría
    if (selectedCategory) {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(term) ||
        template.description.toLowerCase().includes(term) ||
        template.keywords.some(keyword => keyword.toLowerCase().includes(term)) ||
        template.use_cases.some(useCase => useCase.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [templates, showMyTemplates, user, selectedCategory, searchTerm]);

  // Utilidades
  const refreshData = useCallback(async (): Promise<void> => {
    await loadData();
  }, [loadData]);

  const incrementUsage = useCallback(async (templateId: string): Promise<void> => {
    try {
      await agentStudioService.incrementUsage(templateId);
      
      // Actualizar localmente
      setTemplates(prev => prev.map(t => 
        t.id === templateId 
          ? { ...t, usage_count: t.usage_count + 1 }
          : t
      ));
    } catch (err) {
      console.error('Error incrementing usage:', err);
    }
  }, []);

  return {
    // Estado principal
    templates,
    tools,
    loading,
    error,
    statistics,

    // Gestión de plantillas
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    getTemplateById,

    // Importación
    importAgent,
    validateAgentJSON,

    // Gestión de tools
    createTool,
    updateTool,
    deleteTool,
    getMyTools,
    getReusableTools,

    // Generación VAPI
    generateVAPIConfig,
    exportTemplate,

    // Filtros
    filteredTemplates: filteredTemplates(),
    setSearchTerm,
    setSelectedCategory,
    setShowMyTemplates,
    searchTerm,
    selectedCategory,
    showMyTemplates,

    // Utilidades
    refreshData,
    incrementUsage
  };
};
