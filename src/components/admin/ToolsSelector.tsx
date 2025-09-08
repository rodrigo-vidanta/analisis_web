import React, { useState, useEffect } from 'react';
import { type ToolCatalog } from '../../config/supabase';
import { supabaseMainAdmin as supabaseAdmin } from '../../config/supabase';
import { createTool } from '../../services/supabaseService';
import { useAuth } from '../../contexts/AuthContext';

interface SelectedTool extends ToolCatalog {
  isEnabled: boolean;
  customConfig?: any;
}

interface SquadMember {
  id: string;
  name: string;
  originalMessages?: any[];
  assistant?: {
    tools?: any[];
  };
}

interface ToolsSelectorProps {
  selectedTools: SelectedTool[];
  category: string;
  onUpdate: (tools: SelectedTool[]) => void;
  squadMembers?: SquadMember[];
  squadEnabled?: boolean;
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

const ToolsSelector: React.FC<ToolsSelectorProps> = ({ selectedTools, category, onUpdate, squadMembers = [], squadEnabled = false }) => {
  const [availableTools, setAvailableTools] = useState<ToolCatalog[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingTool, setEditingTool] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'mine'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newToolData, setNewToolData] = useState({
    name: '',
    tool_type: 'function' as 'function' | 'transferCall' | 'endCall',
    category: 'communication',
    description: '',
    configText: '{\n  \n}'
  });
  const { user } = useAuth();

  useEffect(() => {
    loadAvailableTools();
  }, []);

  // Asegurar que endCall esté siempre seleccionado y bloqueado
  useEffect(() => {
    const hasEndCall = selectedTools.some(t => t.tool_type === 'endCall');
    if (!hasEndCall) {
      const endCall: SelectedTool = {
        id: '', // se creará en DB si es necesario al guardar
        name: 'End Call',
        tool_type: 'endCall',
        category: 'communication',
        config: {},
        description: 'Finaliza la llamada de forma elegante',
        complexity: 'simple',
        keywords: ['end', 'hangup'],
        use_cases: ['Finalización automática'],
        is_active: true,
        usage_count: 0,
        success_rate: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isEnabled: true,
        customConfig: {}
      } as any;
      onUpdate([endCall, ...selectedTools]);
    }
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
    const isMine = ownerFilter === 'mine'
      ? (tool as any)?.config?.metadata?.created_by === user?.id
      : true;
    // Ocultar endCall del listado (ya forzado por defecto)
    const notEndCall = tool.tool_type !== 'endCall';
    return matchesCategory && isMine && notEndCall;
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
      case 'endCall':
        return (
          <div className="text-sm text-gray-600">
            El mensaje de despedida se edita en la sección Parámetros. Esta herramienta no es editable ni removible.
          </div>
        );
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
          <h3 className="text-lg font-medium text-slate-900">Herramientas</h3>
          <p className="text-sm text-slate-600">
            Selecciona de la librería o crea tus propias herramientas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500">
            {selectedTools.length} seleccionada{selectedTools.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm hover:from-emerald-600 hover:to-teal-700"
          >
            Nueva herramienta
          </button>
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
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setOwnerFilter('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${ownerFilter==='all'?'bg-slate-900 text-white':'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            Todas
          </button>
          <button
            onClick={() => setOwnerFilter('mine')}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${ownerFilter==='mine'?'bg-slate-900 text-white':'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            Mis herramientas
          </button>
        </div>
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
                    {tool.tool_type !== 'endCall' && (
                      <>
                        <button
                          onClick={() => setEditingTool(editingTool === tool.id ? null : tool.id)}
                          className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
                        >
                          {editingTool === tool.id ? 'Cerrar' : 'Configurar'}
                        </button>
                        <button
                          onClick={() => toggleTool(tool as any)}
                          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                        >
                          Remover
                        </button>
                      </>
                    )}
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

      {/* Squad Tools Section */}
      {squadEnabled && squadMembers.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-slate-900">Herramientas del Squad</h4>
          <div className="space-y-4">
            {squadMembers.map((member, index) => {
              const memberTools = member.assistant?.tools || [];
              const isDetectedMember = member.id.startsWith('member-');
              
              return (
                <div key={member.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-white text-xs ${
                      isDetectedMember ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-blue-500 to-purple-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h5 className="font-medium text-slate-900 dark:text-white">{member.name}</h5>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {memberTools.length} herramienta{memberTools.length !== 1 ? 's' : ''}
                        {isDetectedMember && ' • Auto-detectado'}
                      </p>
                    </div>
                  </div>
                  
                  {memberTools.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {memberTools.map((tool: any, toolIndex: number) => (
                        <div key={toolIndex} className="bg-white dark:bg-slate-700 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                              <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <h6 className="font-medium text-slate-900 dark:text-white text-sm">
                              {tool.name || tool.type || `Tool ${toolIndex + 1}`}
                            </h6>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {tool.description || 'Sin descripción'}
                          </p>
                          <div className="mt-2">
                            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                              {tool.type || 'function'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      No hay herramientas configuradas para este miembro
                    </p>
                  )}
                </div>
              );
            })}
          </div>
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
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                }`}
                onClick={() => !isSelected && toggleTool(tool)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h5 className="text-sm font-medium text-slate-900">{tool.name}</h5>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        tool.complexity === 'simple' ? 'bg-green-100 text-green-700' :
                        tool.complexity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {tool.complexity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-2">{tool.description}</p>
                    {tool.tool_type === 'function' && (
                      <p className="text-[11px] text-slate-500">{tool.config?.server?.url || 'sin servidor'}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {tool.keywords.slice(0, 3).map((keyword, idx) => (
                        <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="ml-3">
                    {isSelected ? (
                      <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    ) : (
                      <div className="w-6 h-6 border-2 border-slate-300 rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No hay herramientas disponibles para esta categoría.
          </div>
        )}
      </div>

      {/* Modal Crear Herramienta */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-slate-900">Nueva herramienta</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input className="w-full px-3 py-2 border rounded-md" value={newToolData.name} onChange={e=>setNewToolData({...newToolData,name:e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select className="w-full px-3 py-2 border rounded-md" value={newToolData.tool_type} onChange={e=>setNewToolData({...newToolData,tool_type:e.target.value as any})}>
                    <option value="function">Función</option>
                    <option value="transferCall">Transferencia</option>
                    <option value="endCall">End Call</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                  <select className="w-full px-3 py-2 border rounded-md" value={newToolData.category} onChange={e=>setNewToolData({...newToolData,category:e.target.value})}>
                    {toolCategories.filter(t=>t.id!=='all').map(t=> (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <textarea className="w-full px-3 py-2 border rounded-md" rows={2} value={newToolData.description} onChange={e=>setNewToolData({...newToolData,description:e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Config (JSON)</label>
                <textarea className="w-full px-3 py-2 border rounded-md font-mono text-xs" rows={6} value={newToolData.configText} onChange={e=>setNewToolData({...newToolData,configText:e.target.value})} />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button className="px-4 py-2 bg-slate-100 rounded-md" onClick={()=>setShowCreateModal(false)}>Cancelar</button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-md" onClick={async ()=>{
                try {
                  const cfg = JSON.parse(newToolData.configText||'{}');
                  await createTool({
                    name: newToolData.name,
                    tool_type: newToolData.tool_type,
                    category: newToolData.category,
                    description: newToolData.description,
                    config: cfg,
                    complexity: 'medium',
                    keywords: [],
                    use_cases: []
                  }, user?.id);
                  setShowCreateModal(false);
                  setNewToolData({ name:'', tool_type:'function', category:'communication', description:'', configText:'{\n  \n}' });
                  await loadAvailableTools();
                } catch (e) {
                  alert('Config JSON inválido');
                }
              }}>Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsSelector;
