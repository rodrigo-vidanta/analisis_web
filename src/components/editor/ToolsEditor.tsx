import React, { useState, useEffect } from 'react';
import { supabaseMainAdmin } from '../../config/supabase';
import type { AgentTemplate } from '../../config/supabase';

interface ToolsEditorProps {
  template: AgentTemplate;
  onUpdate: (updates: Partial<AgentTemplate>) => void;
}

const ToolsEditor: React.FC<ToolsEditorProps> = ({ template, onUpdate }) => {
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [templateTools, setTemplateTools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadTools();
  }, [template]);

  const loadTools = async () => {
    try {
      setIsLoading(true);
      
      // Cargar catálogo de herramientas
      const { data: toolsData, error: toolsError } = await supabaseMainAdmin
        .from('tools_catalog')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (toolsError) throw toolsError;

      // Cargar herramientas del template
      const { data: templateToolsData, error: templateError } = await supabaseMainAdmin
        .from('agent_tools')
        .select(`
          *,
          tool_catalog(*)
        `)
        .eq('agent_template_id', template.id);

      if (templateError) throw templateError;

      setAvailableTools(toolsData || []);
      setTemplateTools(templateToolsData || []);
    } catch (error) {
      console.error('Error loading tools:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTool = async (toolId: string) => {
    try {
      const { error } = await supabaseMainAdmin
        .from('agent_tools')
        .insert({
          agent_template_id: template.id,
          tool_id: toolId,
          is_enabled: true
        });

      if (error) throw error;

      // Recargar herramientas del template
      await loadTools();
    } catch (error) {
      console.error('Error adding tool:', error);
      alert('Error al agregar la herramienta');
    }
  };

  const handleRemoveTool = async (agentToolId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta herramienta?')) return;

    try {
      const { error } = await supabaseMainAdmin
        .from('agent_tools')
        .delete()
        .eq('id', agentToolId);

      if (error) throw error;

      // Recargar herramientas del template
      await loadTools();
    } catch (error) {
      console.error('Error removing tool:', error);
      alert('Error al eliminar la herramienta');
    }
  };

  const handleToggleTool = async (agentToolId: string, isEnabled: boolean) => {
    try {
      const { error } = await supabaseMainAdmin
        .from('agent_tools')
        .update({ is_enabled: !isEnabled })
        .eq('id', agentToolId);

      if (error) throw error;

      // Recargar herramientas del template
      await loadTools();
    } catch (error) {
      console.error('Error toggling tool:', error);
      alert('Error al cambiar el estado de la herramienta');
    }
  };

  const getToolIcon = (toolType: string) => {
    switch (toolType) {
      case 'function':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'transferCall':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      case 'endCall':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
    }
  };

  const filteredAvailableTools = availableTools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tool.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    const notInTemplate = !templateTools.some(t => t.tool_id === tool.id);
    
    return matchesSearch && matchesCategory && notInTemplate;
  });

  const categories = ['all', 'communication', 'data_collection', 'business_logic', 'external_api'];

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Cargando herramientas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Herramientas del Agente
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Gestiona las herramientas disponibles para este agente
            </p>
          </div>
        </div>
      </div>

      {/* Herramientas Actuales */}
      <div className="glass-card p-6">
        <h4 className="font-medium text-slate-900 dark:text-white mb-4">
          Herramientas Activas ({templateTools.length})
        </h4>
        
        {templateTools.length > 0 ? (
          <div className="space-y-3">
            {templateTools.map((agentTool) => (
              <div key={agentTool.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    agentTool.is_enabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-700'
                  }`}>
                    {getToolIcon(agentTool.tool?.tool_type)}
                  </div>
                  <div>
                    <h5 className="font-medium text-slate-900 dark:text-white">
                      {agentTool.tool?.name}
                    </h5>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {agentTool.tool?.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleTool(agentTool.id, agentTool.is_enabled)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      agentTool.is_enabled
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {agentTool.is_enabled ? 'Activa' : 'Inactiva'}
                  </button>
                  <button
                    onClick={() => handleRemoveTool(agentTool.id)}
                    className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-slate-500 dark:text-slate-400">No hay herramientas configuradas</p>
          </div>
        )}
      </div>

      {/* Catálogo de Herramientas */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-slate-900 dark:text-white">
            Catálogo de Herramientas ({filteredAvailableTools.length})
          </h4>
        </div>

        {/* Filtros */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar herramientas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas las categorías</option>
            <option value="communication">Comunicación</option>
            <option value="data_collection">Recolección de datos</option>
            <option value="business_logic">Lógica de negocio</option>
            <option value="external_api">APIs externas</option>
          </select>
        </div>

        {/* Lista de herramientas disponibles */}
        {filteredAvailableTools.length > 0 ? (
          <div className="space-y-3">
            {filteredAvailableTools.map((tool) => (
              <div key={tool.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                    {getToolIcon(tool.tool_type)}
                  </div>
                  <div>
                    <h5 className="font-medium text-slate-900 dark:text-white">
                      {tool.name}
                    </h5>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {tool.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded text-xs ${
                        tool.complexity === 'simple' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        tool.complexity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {tool.complexity}
                      </span>
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs">
                        {tool.category}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleAddTool(tool.id)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Agregar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              {searchTerm || selectedCategory !== 'all' 
                ? 'No se encontraron herramientas con los filtros aplicados'
                : 'No hay herramientas disponibles en el catálogo'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsEditor;
