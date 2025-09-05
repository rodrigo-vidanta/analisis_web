import React, { useState, useEffect } from 'react';
import { type ToolCatalog } from '../../config/supabase';
import { supabaseMainAdmin as supabaseAdmin } from '../../config/supabase';

interface SelectedTool extends ToolCatalog {
  isEnabled: boolean;
  customConfig?: any;
}

interface ToolsSelectorProps {
  selectedTools: SelectedTool[];
  category: string;
  onUpdate: (tools: SelectedTool[]) => void;
}

interface ToolParameterConfig {
  phoneNumber?: string;
  extension?: string;
  message?: string;
  conditions?: string[];
  dtmf?: string;
  destination?: {
    type: 'phone' | 'sip' | 'assistant';
    value: string;
  };
}

const ToolsSelector: React.FC<ToolsSelectorProps> = ({ selectedTools, category, onUpdate }) => {
  const [availableTools, setAvailableTools] = useState<ToolCatalog[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingTool, setEditingTool] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAvailableTools();
  }, []);

  const loadAvailableTools = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabaseAdmin
        .from('tools_catalog')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setAvailableTools(data || []);
    } catch (error) {
      console.error('Error loading tools:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTools = availableTools.filter(tool => {
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesCategory;
  });

  const toolCategories = [
    { id: 'all', name: 'Todas', icon: '🔧' },
    { id: 'communication', name: 'Comunicación', icon: '📞' },
    { id: 'data_collection', name: 'Datos', icon: '📊' },
    { id: 'business_logic', name: 'Lógica', icon: '⚡' },
    { id: 'external_api', name: 'APIs Externas', icon: '🌐' }
  ];

  const isToolSelected = (toolId: string) => {
    return selectedTools.some(t => t.id === toolId);
  };

  const toggleTool = (tool: ToolCatalog) => {
    const isSelected = isToolSelected(tool.id);
    
    if (isSelected) {
      // Remover herramienta
      const updatedTools = selectedTools.filter(t => t.id !== tool.id);
      onUpdate(updatedTools);
    } else {
      // Agregar herramienta
      const newTool: SelectedTool = {
        ...tool,
        isEnabled: true,
        customConfig: getDefaultConfig(tool)
      };
      onUpdate([...selectedTools, newTool]);
    }
  };

  const getDefaultConfig = (tool: ToolCatalog): ToolParameterConfig => {
    switch (tool.tool_type) {
      case 'transferCall':
        return {
          phoneNumber: '',
          message: 'Te voy a transferir con un especialista que podrá ayudarte mejor.',
          destination: {
            type: 'phone',
            value: ''
          }
        };
      case 'endCall':
        return {
          message: 'Gracias por tu llamada. ¡Que tengas un excelente día!'
        };
      default:
        return {};
    }
  };

  const updateToolConfig = (toolId: string, config: ToolParameterConfig) => {
    const updatedTools = selectedTools.map(tool => 
      tool.id === toolId 
        ? { ...tool, customConfig: { ...tool.customConfig, ...config } }
        : tool
    );
    onUpdate(updatedTools);
  };

  const renderToolParameters = (tool: SelectedTool) => {
    const config = tool.customConfig || {};

    switch (tool.tool_type) {
      case 'transferCall':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de destino
                </label>
                <select
                  value={config.destination?.type || 'phone'}
                  onChange={(e) => updateToolConfig(tool.id, {
                    destination: { ...config.destination, type: e.target.value as 'phone' | 'sip' | 'assistant' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="phone">Número de teléfono</option>
                  <option value="sip">SIP</option>
                  <option value="assistant">Otro asistente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {config.destination?.type === 'phone' ? 'Número de teléfono' : 
                   config.destination?.type === 'sip' ? 'Dirección SIP' : 'ID del asistente'}
                </label>
                <input
                  type="text"
                  value={config.destination?.value || ''}
                  onChange={(e) => updateToolConfig(tool.id, {
                    destination: { ...config.destination, value: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder={
                    config.destination?.type === 'phone' ? '+1234567890' :
                    config.destination?.type === 'sip' ? 'sip:user@domain.com' : 'assistant-id'
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Extensión (opcional)
              </label>
              <input
                type="text"
                value={config.extension || ''}
                onChange={(e) => updateToolConfig(tool.id, { extension: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensaje antes de transferir
              </label>
              <textarea
                value={config.message || ''}
                onChange={(e) => updateToolConfig(tool.id, { message: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Te voy a transferir con un especialista..."
              />
            </div>
          </div>
        );

      case 'endCall':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensaje de despedida
              </label>
              <textarea
                value={config.message || ''}
                onChange={(e) => updateToolConfig(tool.id, { message: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Gracias por tu llamada. ¡Que tengas un excelente día!"
              />
            </div>
          </div>
        );

      case 'function':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-700">
                <strong>Función personalizada:</strong> {tool.name}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Los parámetros de esta función se configuran automáticamente basados en su definición.
              </p>
            </div>
            
            {tool.config?.parameters && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parámetros configurables
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <pre className="text-xs text-gray-600 overflow-x-auto">
                    {JSON.stringify(tool.config.parameters, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            No hay parámetros configurables para este tipo de herramienta.
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Herramientas Disponibles</h3>
          <p className="text-sm text-gray-600">
            Selecciona y configura las herramientas que usará tu agente
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {selectedTools.length} seleccionada{selectedTools.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filtros por categoría */}
      <div className="flex flex-wrap gap-2">
        {toolCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
              selectedCategory === cat.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Herramientas seleccionadas */}
      {selectedTools.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Herramientas Configuradas</h4>
          
          {selectedTools.map(tool => (
            <div key={tool.id} className="border border-gray-200 rounded-lg bg-white">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600">✓</span>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">{tool.name}</h5>
                      <p className="text-xs text-gray-500">{tool.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingTool(editingTool === tool.id ? null : tool.id)}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      {editingTool === tool.id ? 'Cerrar' : 'Configurar'}
                    </button>
                    <button
                      onClick={() => toggleTool(tool)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                    >
                      Remover
                    </button>
                  </div>
                </div>

                {/* Parámetros de configuración */}
                {editingTool === tool.id && (
                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <h6 className="text-sm font-medium text-gray-900 mb-3">Configuración de Parámetros</h6>
                    {renderToolParameters(tool)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Herramientas disponibles */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900">Agregar Herramientas</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTools.map(tool => {
            const isSelected = isToolSelected(tool.id);
            
            return (
              <div
                key={tool.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                }`}
                onClick={() => !isSelected && toggleTool(tool)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h5 className="text-sm font-medium text-gray-900">{tool.name}</h5>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        tool.complexity === 'simple' ? 'bg-green-100 text-green-700' :
                        tool.complexity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {tool.complexity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{tool.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {tool.keywords.slice(0, 3).map((keyword, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="ml-3">
                    {isSelected ? (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    ) : (
                      <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay herramientas disponibles para esta categoría.
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsSelector;