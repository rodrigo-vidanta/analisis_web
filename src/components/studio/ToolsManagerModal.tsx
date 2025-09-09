// Modal de gestión de tools
// Crear, editar, eliminar y reutilizar tools

import React, { useState } from 'react';
import { useAgentStudio } from '../../hooks/useAgentStudio';
import { useAuth } from '../../contexts/AuthContext';
import type { Tool } from '../../services/agentStudioService';

interface ToolsManagerModalProps {
  onClose: () => void;
}

const ToolsManagerModal: React.FC<ToolsManagerModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { tools, createTool, updateTool, deleteTool, getMyTools, getReusableTools } = useAgentStudio();
  
  const [activeTab, setActiveTab] = useState<'my-tools' | 'reusable' | 'create'>('my-tools');
  const [loading, setLoading] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'custom',
    function_schema: {
      name: '',
      description: '',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    server_url: '',
    is_async: false,
    is_reusable: true,
    messages: [] as any[]
  });

  const categories = ['custom', 'api', 'database', 'notification', 'analysis', 'utility'];
  const myTools = getMyTools();
  const reusableTools = getReusableTools();

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'custom',
      function_schema: {
        name: '',
        description: '',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      server_url: '',
      is_async: false,
      is_reusable: true,
      messages: []
    });
    setEditingTool(null);
  };

  const handleEdit = (tool: Tool) => {
    setFormData({
      name: tool.name,
      description: tool.description,
      category: tool.category,
      function_schema: tool.function_schema,
      server_url: tool.server_url,
      is_async: tool.is_async,
      is_reusable: tool.is_reusable,
      messages: tool.messages || []
    });
    setEditingTool(tool);
    setActiveTab('create');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const toolData = {
        ...formData,
        function_schema: {
          ...formData.function_schema,
          name: formData.name // Sincronizar nombres
        }
      };

      if (editingTool) {
        await updateTool(editingTool.id!, toolData);
      } else {
        await createTool(toolData);
      }

      resetForm();
      setActiveTab('my-tools');
    } catch (error) {
      alert('Error al guardar tool: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tool: Tool) => {
    if (!confirm(`¿Estás seguro de eliminar la tool "${tool.name}"?`)) return;

    try {
      await deleteTool(tool.id!);
    } catch (error) {
      alert('Error al eliminar tool: ' + error);
    }
  };

  const addParameter = () => {
    const paramName = prompt('Nombre del parámetro:');
    if (!paramName) return;

    const paramType = prompt('Tipo del parámetro (string, number, boolean, array, object):', 'string');
    if (!paramType) return;

    const paramDescription = prompt('Descripción del parámetro:') || '';

    setFormData(prev => ({
      ...prev,
      function_schema: {
        ...prev.function_schema,
        parameters: {
          ...prev.function_schema.parameters,
          properties: {
            ...prev.function_schema.parameters.properties,
            [paramName]: {
              type: paramType,
              description: paramDescription
            }
          }
        }
      }
    }));
  };

  const removeParameter = (paramName: string) => {
    const newProperties = { ...formData.function_schema.parameters.properties };
    delete newProperties[paramName];

    setFormData(prev => ({
      ...prev,
      function_schema: {
        ...prev.function_schema,
        parameters: {
          ...prev.function_schema.parameters,
          properties: newProperties,
          required: prev.function_schema.parameters.required.filter(r => r !== paramName)
        }
      }
    }));
  };

  const toggleRequired = (paramName: string) => {
    const required = formData.function_schema.parameters.required.includes(paramName)
      ? formData.function_schema.parameters.required.filter(r => r !== paramName)
      : [...formData.function_schema.parameters.required, paramName];

    setFormData(prev => ({
      ...prev,
      function_schema: {
        ...prev.function_schema,
        parameters: {
          ...prev.function_schema.parameters,
          required
        }
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Gestión de Tools
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
            <div className="p-4 space-y-2">
              <button
                onClick={() => setActiveTab('my-tools')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'my-tools'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                🔧 Mis Tools ({myTools.length})
              </button>
              <button
                onClick={() => setActiveTab('reusable')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'reusable'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                🌐 Reutilizables ({reusableTools.length})
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setActiveTab('create');
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'create'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                ➕ {editingTool ? 'Editar Tool' : 'Nueva Tool'}
              </button>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="flex-1 overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="p-6">
              {/* Tab: Mis Tools */}
              {activeTab === 'my-tools' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Mis Tools ({myTools.length})
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myTools.map((tool) => (
                      <div key={tool.id} className="bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="p-1 bg-indigo-100 dark:bg-indigo-900 rounded-md">
                              <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{tool.name}</h4>
                              <p className="text-xs text-slate-600 dark:text-slate-400">{tool.category}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleEdit(tool)}
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Editar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(tool)}
                              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                              title="Eliminar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                          {tool.description}
                        </p>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            {tool.is_async && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md">
                                Async
                              </span>
                            )}
                            {tool.is_reusable && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md">
                                Reutilizable
                              </span>
                            )}
                          </div>
                          <span className="text-slate-500 dark:text-slate-500">
                            {tool.usage_count} usos
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {myTools.length === 0 && (
                    <div className="text-center py-12">
                      <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      </svg>
                      <p className="text-slate-500 dark:text-slate-400 mb-4">No has creado ninguna tool aún</p>
                      <button
                        onClick={() => setActiveTab('create')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Crear tu primera tool
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Tools Reutilizables */}
              {activeTab === 'reusable' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Tools Reutilizables ({reusableTools.length})
                  </h3>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">ℹ️ Tools Reutilizables</h4>
                    <p className="text-blue-800 dark:text-blue-400 text-sm">
                      Estas son tools que pueden ser utilizadas por cualquier agente. Incluye tanto las tuyas marcadas como 
                      reutilizables como las de otros usuarios que han compartido sus tools.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reusableTools.map((tool) => (
                      <div key={tool.id} className="bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="p-1 bg-indigo-100 dark:bg-indigo-900 rounded-md">
                              <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{tool.name}</h4>
                              <p className="text-xs text-slate-600 dark:text-slate-400">{tool.category}</p>
                            </div>
                          </div>
                          
                          {tool.created_by === user?.id && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-md">
                              Mía
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                          {tool.description}
                        </p>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-1">
                            {tool.is_async && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md">
                                Async
                              </span>
                            )}
                          </div>
                          <span className="text-slate-500 dark:text-slate-500">
                            {tool.usage_count} usos
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: Crear/Editar Tool */}
              {activeTab === 'create' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {editingTool ? 'Editar Tool' : 'Crear Nueva Tool'}
                  </h3>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Información básica */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Nombre de la Tool *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ej: send_email, get_weather"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Categoría
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Descripción *
                      </label>
                      <textarea
                        required
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Describe qué hace esta tool y cuándo usarla..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        URL del Servidor *
                      </label>
                      <input
                        type="url"
                        required
                        value={formData.server_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, server_url: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://api.ejemplo.com/webhook"
                      />
                    </div>

                    {/* Parámetros */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Parámetros ({Object.keys(formData.function_schema.parameters.properties).length})
                        </label>
                        <button
                          type="button"
                          onClick={addParameter}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                        >
                          + Agregar Parámetro
                        </button>
                      </div>

                      <div className="space-y-3">
                        {Object.entries(formData.function_schema.parameters.properties).map(([paramName, paramConfig]: [string, any]) => (
                          <div key={paramName} className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-slate-900 dark:text-white">{paramName}</span>
                                <span className="px-2 py-1 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400 text-xs rounded-md">
                                  {paramConfig.type}
                                </span>
                                <label className="flex items-center space-x-1">
                                  <input
                                    type="checkbox"
                                    checked={formData.function_schema.parameters.required.includes(paramName)}
                                    onChange={() => toggleRequired(paramName)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-slate-600 dark:text-slate-400">Requerido</span>
                                </label>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeParameter(paramName)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Eliminar
                              </button>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {paramConfig.description || 'Sin descripción'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Configuraciones adicionales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="is_async"
                          checked={formData.is_async}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_async: e.target.checked }))}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="is_async" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Ejecución asíncrona
                        </label>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="is_reusable"
                          checked={formData.is_reusable}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_reusable: e.target.checked }))}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="is_reusable" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Tool reutilizable
                        </label>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={resetForm}
                        disabled={loading}
                        className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !formData.name || !formData.description || !formData.server_url}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                      >
                        {loading && (
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        <span>{editingTool ? 'Actualizar Tool' : 'Crear Tool'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsManagerModal;
