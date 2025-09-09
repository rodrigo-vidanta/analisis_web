// Modal de edición de agentes individuales
// Edición completa de configuración de agente

import React, { useState, useEffect } from 'react';
import { useAgentStudio } from '../../hooks/useAgentStudio';
import type { AgentTemplate, Tool } from '../../services/agentStudioService';

interface EditAgentModalProps {
  template: AgentTemplate;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<AgentTemplate>) => Promise<AgentTemplate>;
}

const EditAgentModal: React.FC<EditAgentModalProps> = ({
  template,
  onClose,
  onUpdate
}) => {
  const { getReusableTools } = useAgentStudio();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'model' | 'voice' | 'tools'>('info');

  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'custom',
    keywords: [] as string[],
    use_cases: [] as string[],
    role: 'Asistente Virtual',
    system_prompts: [''],
    selected_tools: [] as string[],
    model_config: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7,
      fallback_models: [] as string[]
    },
    voice_config: {
      provider: '11labs',
      voice_id: '',
      model: 'eleven_turbo_v2_5',
      stability: 0.5,
      similarity_boost: 0.8,
      speed: 1.0
    }
  });

  const categories = ['custom', 'ventas', 'soporte', 'atencion', 'marketing', 'otros'];
  const reusableTools = getReusableTools();

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description,
        category: template.category,
        keywords: template.keywords,
        use_cases: template.use_cases,
        role: template.single_agent_config?.role || 'Asistente Virtual',
        system_prompts: template.single_agent_config?.system_prompts || [''],
        selected_tools: template.tools.map(t => t.name),
        model_config: template.single_agent_config?.model_config || {
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.7,
          fallback_models: []
        },
        voice_config: template.single_agent_config?.voice_config || {
          provider: '11labs',
          voice_id: '',
          model: 'eleven_turbo_v2_5',
          stability: 0.5,
          similarity_boost: 0.8,
          speed: 1.0
        }
      });
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedToolObjects = reusableTools.filter(tool => 
        formData.selected_tools.includes(tool.name)
      );

      const updates: Partial<AgentTemplate> = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        keywords: formData.keywords,
        use_cases: formData.use_cases,
        single_agent_config: {
          name: formData.name,
          role: formData.role,
          description: formData.description,
          model_config: formData.model_config,
          voice_config: formData.voice_config,
          system_prompts: formData.system_prompts
        },
        tools: selectedToolObjects
      };

      await onUpdate(template.id!, updates);
      onClose();
    } catch (error) {
      alert('Error al actualizar agente: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleToolToggle = (toolName: string) => {
    const tools = formData.selected_tools.includes(toolName)
      ? formData.selected_tools.filter(t => t !== toolName)
      : [...formData.selected_tools, toolName];
    
    setFormData(prev => ({ ...prev, selected_tools: tools }));
  };

  const addSystemPrompt = () => {
    setFormData(prev => ({
      ...prev,
      system_prompts: [...prev.system_prompts, '']
    }));
  };

  const removeSystemPrompt = (index: number) => {
    setFormData(prev => ({
      ...prev,
      system_prompts: prev.system_prompts.filter((_, i) => i !== index)
    }));
  };

  const updateSystemPrompt = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      system_prompts: prev.system_prompts.map((prompt, i) => i === index ? value : prompt)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Editar Agente: {template.name}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex">
            {/* Sidebar de navegación */}
            <div className="w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
              <div className="p-4 space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'info'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  📋 Información General
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('model')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'model'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  🧠 Modelo y Prompts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('voice')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'voice'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  🎤 Configuración de Voz
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tools')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'tools'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  🛠️ Tools ({formData.selected_tools.length})
                </button>
              </div>
            </div>

            {/* Contenido principal */}
            <div className="flex-1 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="p-6">
                {/* Tab: Información General */}
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Información General
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Nombre del Agente *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Rol/Especialización *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.role}
                          onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
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

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Descripción
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Palabras Clave
                        </label>
                        <input
                          type="text"
                          value={formData.keywords.join(', ')}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                          }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Casos de Uso
                        </label>
                        <input
                          type="text"
                          value={formData.use_cases.join(', ')}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            use_cases: e.target.value.split(',').map(u => u.trim()).filter(u => u)
                          }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Modelo y Prompts */}
                {activeTab === 'model' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Configuración del Modelo
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Proveedor
                        </label>
                        <select
                          value={formData.model_config.provider}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            model_config: { ...prev.model_config, provider: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="openai">OpenAI</option>
                          <option value="anthropic">Anthropic</option>
                          <option value="google">Google</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Modelo
                        </label>
                        <select
                          value={formData.model_config.model}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            model_config: { ...prev.model_config, model: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="gpt-4o">GPT-4o</option>
                          <option value="gpt-4-0125-preview">GPT-4 Turbo</option>
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Temperatura ({formData.model_config.temperature})
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={formData.model_config.temperature}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            model_config: { ...prev.model_config, temperature: parseFloat(e.target.value) }
                          }))}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Prompts del Sistema ({formData.system_prompts.length})
                        </label>
                        <button
                          type="button"
                          onClick={addSystemPrompt}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                        >
                          + Agregar Prompt
                        </button>
                      </div>

                      <div className="space-y-4">
                        {formData.system_prompts.map((prompt, index) => (
                          <div key={index} className="relative">
                            <textarea
                              value={prompt}
                              onChange={(e) => updateSystemPrompt(index, e.target.value)}
                              rows={6}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder={`Prompt del sistema ${index + 1}...`}
                            />
                            {formData.system_prompts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSystemPrompt(index)}
                                className="absolute top-2 right-2 p-1 text-red-600 hover:text-red-800 bg-white dark:bg-slate-700 rounded-md shadow-sm"
                                title="Eliminar prompt"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Configuración de Voz */}
                {activeTab === 'voice' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Configuración de Voz
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Proveedor de Voz
                        </label>
                        <select
                          value={formData.voice_config.provider}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            voice_config: { ...prev.voice_config, provider: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="11labs">ElevenLabs</option>
                          <option value="openai">OpenAI</option>
                          <option value="azure">Azure</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          ID de Voz
                        </label>
                        <input
                          type="text"
                          value={formData.voice_config.voice_id}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            voice_config: { ...prev.voice_config, voice_id: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Estabilidad ({formData.voice_config.stability})
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={formData.voice_config.stability}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            voice_config: { ...prev.voice_config, stability: parseFloat(e.target.value) }
                          }))}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Similitud ({formData.voice_config.similarity_boost})
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={formData.voice_config.similarity_boost}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            voice_config: { ...prev.voice_config, similarity_boost: parseFloat(e.target.value) }
                          }))}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Velocidad ({formData.voice_config.speed})
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={formData.voice_config.speed}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            voice_config: { ...prev.voice_config, speed: parseFloat(e.target.value) }
                          }))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Tools */}
                {activeTab === 'tools' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Tools del Agente ({formData.selected_tools.length})
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                      {reusableTools.map((tool) => (
                        <label key={tool.id} className="flex items-start space-x-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.selected_tools.includes(tool.name)}
                            onChange={() => handleToolToggle(tool.name)}
                            className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{tool.name}</p>
                              <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400 text-xs rounded-md">
                                {tool.category}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{tool.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {reusableTools.length === 0 && (
                      <div className="text-center py-12">
                        <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        </svg>
                        <p className="text-slate-500 dark:text-slate-400">No hay tools reutilizables disponibles</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer con acciones */}
          <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {formData.selected_tools.length} tools seleccionadas
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>Actualizar Agente</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAgentModal;
