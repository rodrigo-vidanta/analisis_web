import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface Tool {
  type: string;
  function?: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  };
  server?: {
    url: string;
    headers?: Record<string, string>;
  };
}

interface ToolsEditorProps {
  tools: Tool[];
  onChange: (tools: Tool[]) => void;
  onSave?: () => void;
}

const ToolsEditor: React.FC<ToolsEditorProps> = ({ tools, onChange, onSave }) => {
  const { user } = useAuth();
  const [selectedTool, setSelectedTool] = useState<number | null>(null);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [showAddTool, setShowAddTool] = useState(false);

  const toolTemplates = [
    {
      name: 'Actualizar Información Prospecto',
      template: {
        type: 'function',
        function: {
          name: 'actualizar_informacion_prospecto',
          description: 'Actualiza la información del prospecto en la base de datos',
          parameters: {
            type: 'object',
            properties: {
              nombre: { type: 'string', description: 'Nombre completo del prospecto' },
              telefono: { type: 'string', description: 'Número de teléfono' },
              email: { type: 'string', description: 'Correo electrónico' },
              composicion_familiar: { type: 'string', description: 'Composición familiar' },
              checkpoint_actual: { type: 'number', description: 'Checkpoint actual en el proceso' }
            },
            required: ['nombre', 'checkpoint_actual']
          }
        }
      }
    },
    {
      name: 'Objection Slayer',
      template: {
        type: 'function',
        function: {
          name: 'objectionSlayer',
          description: 'Sistema avanzado de manejo de objeciones',
          parameters: {
            type: 'object',
            properties: {
              objecion_tipo: { type: 'string', description: 'Tipo de objeción detectada' },
              contexto: { type: 'string', description: 'Contexto de la objeción' },
              intensidad: { type: 'number', description: 'Intensidad de la objeción (1-10)' }
            },
            required: ['objecion_tipo', 'contexto']
          }
        }
      }
    },
    {
      name: 'Ninja Closer',
      template: {
        type: 'function',
        function: {
          name: 'ninjaCloser',
          description: 'Sistema de cierre avanzado para detectar señales de compra',
          parameters: {
            type: 'object',
            properties: {
              señal_tipo: { type: 'string', description: 'Tipo de señal detectada' },
              nivel_interes: { type: 'number', description: 'Nivel de interés (1-10)' },
              accion_recomendada: { type: 'string', description: 'Acción recomendada' }
            },
            required: ['señal_tipo', 'nivel_interes']
          }
        }
      }
    },
    {
      name: 'Chameleon Whisperer',
      template: {
        type: 'function',
        function: {
          name: 'chameleonWhisperer',
          description: 'Adaptación de personalidad según el perfil del cliente',
          parameters: {
            type: 'object',
            properties: {
              perfil_cliente: { type: 'string', description: 'Perfil psicológico del cliente' },
              tono_requerido: { type: 'string', description: 'Tono de comunicación requerido' },
              estrategia: { type: 'string', description: 'Estrategia de comunicación' }
            },
            required: ['perfil_cliente', 'tono_requerido']
          }
        }
      }
    }
  ];

  const addTool = (template?: Tool) => {
    const newTool = template || {
      type: 'function',
      function: {
        name: 'nueva_funcion',
        description: 'Descripción de la nueva función',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    };

    onChange([...tools, newTool]);
    setSelectedTool(tools.length);
    setEditingTool(newTool);
    setShowAddTool(false);
  };

  const updateTool = (index: number, updatedTool: Tool) => {
    const newTools = [...tools];
    newTools[index] = updatedTool;
    onChange(newTools);
    setEditingTool(updatedTool);
  };

  const deleteTool = (index: number) => {
    const newTools = tools.filter((_, i) => i !== index);
    onChange(newTools);
    setSelectedTool(null);
    setEditingTool(null);
  };

  const getToolIcon = (tool: Tool) => {
    const name = tool.function?.name || '';
    if (name.includes('actualizar')) return '📝';
    if (name.includes('objection')) return '🛡️';
    if (name.includes('ninja') || name.includes('closer')) return '🎯';
    if (name.includes('chameleon')) return '🦎';
    if (name.includes('reporte')) return '📊';
    return '🔧';
  };

  const getToolStatus = (tool: Tool) => {
    if (!tool.function?.name || !tool.function?.description) return 'incomplete';
    if (!tool.function?.parameters?.properties || Object.keys(tool.function.parameters.properties).length === 0) return 'warning';
    return 'complete';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300';
      case 'warning': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'incomplete': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300';
      default: return 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Editor de Tools
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tools.length} tools configurados
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddTool(!showAddTool)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              + Agregar Tool
            </button>
            
            {onSave && (
              <button
                onClick={onSave}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Guardar Cambios
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[600px]">
        {/* Lista de Tools */}
        <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
          <div className="p-4 space-y-2">
            {tools.map((tool, index) => {
              const status = getToolStatus(tool);
              return (
                <div
                  key={index}
                  onClick={() => {
                    setSelectedTool(index);
                    setEditingTool(tool);
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedTool === index
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
                      : 'bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getToolIcon(tool)}</span>
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                          {tool.function?.name || 'Sin nombre'}
                        </h4>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(status)}`}>
                          {status === 'complete' ? 'Completo' : status === 'warning' ? 'Incompleto' : 'Error'}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTool(index);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {tool.function?.description || 'Sin descripción'}
                  </p>
                </div>
              );
            })}
            
            {tools.length === 0 && (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-slate-500 dark:text-slate-400">
                  No hay tools configurados
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Editor de Tool */}
        <div className="flex-1 overflow-y-auto">
          {editingTool ? (
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nombre de la Función
                </label>
                <input
                  type="text"
                  value={editingTool.function?.name || ''}
                  onChange={(e) => {
                    const updated = {
                      ...editingTool,
                      function: {
                        ...editingTool.function!,
                        name: e.target.value
                      }
                    };
                    setEditingTool(updated);
                    if (selectedTool !== null) updateTool(selectedTool, updated);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="nombre_de_la_funcion"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Descripción
                </label>
                <textarea
                  value={editingTool.function?.description || ''}
                  onChange={(e) => {
                    const updated = {
                      ...editingTool,
                      function: {
                        ...editingTool.function!,
                        description: e.target.value
                      }
                    };
                    setEditingTool(updated);
                    if (selectedTool !== null) updateTool(selectedTool, updated);
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Descripción de lo que hace esta función..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Parámetros (JSON)
                </label>
                <textarea
                  value={JSON.stringify(editingTool.function?.parameters || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parameters = JSON.parse(e.target.value);
                      const updated = {
                        ...editingTool,
                        function: {
                          ...editingTool.function!,
                          parameters
                        }
                      };
                      setEditingTool(updated);
                      if (selectedTool !== null) updateTool(selectedTool, updated);
                    } catch (error) {
                      // Ignore JSON parse errors while typing
                    }
                  }}
                  rows={12}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  placeholder='{\n  "type": "object",\n  "properties": {\n    "parametro": {\n      "type": "string",\n      "description": "Descripción del parámetro"\n    }\n  },\n  "required": ["parametro"]\n}'
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-slate-500 dark:text-slate-400">
                  Selecciona un tool para editarlo
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para agregar tool */}
      {showAddTool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Agregar Nuevo Tool
                </h3>
                <button
                  onClick={() => setShowAddTool(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {toolTemplates.map((template, index) => (
                  <div
                    key={index}
                    onClick={() => addTool(template.template)}
                    className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{getToolIcon(template.template)}</span>
                      <h4 className="font-medium text-slate-900 dark:text-white">
                        {template.name}
                      </h4>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {template.template.function?.description}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={() => addTool()}
                  className="px-6 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  + Crear Tool Personalizado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsEditor;
