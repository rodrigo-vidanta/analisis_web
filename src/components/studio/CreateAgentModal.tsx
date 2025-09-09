// Modal de creación de agentes individuales
// Wizard simplificado pero completo para crear agentes

import React, { useState } from 'react';
import { useAgentStudio } from '../../hooks/useAgentStudio';
import type { AgentTemplate, Tool } from '../../services/agentStudioService';

interface CreateAgentModalProps {
  onClose: () => void;
  onCreate: (agent: Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<AgentTemplate>;
}

const CreateAgentModal: React.FC<CreateAgentModalProps> = ({
  onClose,
  onCreate
}) => {
  const { getReusableTools } = useAgentStudio();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'custom',
    keywords: [] as string[],
    use_cases: [] as string[],
    role: 'Asistente Virtual',
    system_prompts: ['Eres un asistente virtual especializado y útil.'],
    selected_tools: [] as string[],
    model_config: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7,
      fallback_models: ['gpt-4-0125-preview', 'gpt-3.5-turbo']
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedToolObjects = reusableTools.filter(tool => 
        formData.selected_tools.includes(tool.name)
      );

      const agentData: Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at'> = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        keywords: formData.keywords,
        use_cases: formData.use_cases,
        is_squad: false,
        single_agent_config: {
          name: formData.name,
          role: formData.role,
          description: formData.description,
          model_config: formData.model_config,
          voice_config: formData.voice_config,
          system_prompts: formData.system_prompts
        },
        tools: selectedToolObjects,
        created_by: '', // Se asigna en el hook
        usage_count: 0,
        success_rate: 0,
        is_active: true
      };

      await onCreate(agentData);
      onClose();
    } catch (error) {
      alert('Error al crear agente: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleToolToggle = (toolName: string) => {
    const tools = formData.selected_tools.includes(toolName)
      ? formData.selected_tools.filter(t => t !== toolName)
      : [...formData.selected_tools, toolName];
    
    setFormData(prev => ({ ...prev, selected_tools: tools }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Crear Nuevo Agente
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Paso {step} de 4
            </p>
          </div>
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

        {/* Progress bar */}
        <div className="px-6 py-2">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stepNum <= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 4 && (
                  <div className={`w-12 h-1 mx-2 rounded ${
                    stepNum < step
                      ? 'bg-blue-600'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
            {/* Paso 1: Información Básica */}
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Información Básica
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
                      placeholder="Ej: Asistente de Ventas"
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
                      placeholder="Ej: Especialista en Ventas"
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
                    placeholder="Describe el propósito y funcionalidad del agente..."
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
                      placeholder="ventas, atención, soporte"
                    />
                    <p className="text-xs text-slate-500 mt-1">Separar con comas</p>
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
                      placeholder="Atención 24/7, Calificación de leads"
                    />
                    <p className="text-xs text-slate-500 mt-1">Separar con comas</p>
                  </div>
                </div>
              </div>
            )}

            {/* Paso 2: Configuración del Modelo */}
            {step === 2 && (
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
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Preciso</span>
                      <span>Creativo</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Prompt del Sistema
                  </label>
                  <textarea
                    value={formData.system_prompts[0] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      system_prompts: [e.target.value]
                    }))}
                    rows={8}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Define la personalidad, rol y comportamiento del agente..."
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Este prompt define cómo se comportará tu agente
                  </p>
                </div>
              </div>
            )}

            {/* Paso 3: Configuración de Voz */}
            {step === 3 && (
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
                      placeholder="Ej: pNInz6obpgDQGcFmaJgB"
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

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">💡 Configuración de Voz</h4>
                  <ul className="text-blue-800 dark:text-blue-400 text-sm space-y-1">
                    <li>• <strong>Estabilidad:</strong> Mayor valor = voz más consistente</li>
                    <li>• <strong>Similitud:</strong> Mayor valor = más parecido a la voz original</li>
                    <li>• <strong>Velocidad:</strong> Controla qué tan rápido habla el agente</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Paso 4: Tools */}
            {step === 4 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Seleccionar Tools ({formData.selected_tools.length})
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
                        <div className="flex items-center space-x-2 mt-2">
                          {tool.is_async && (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-md">
                              Async
                            </span>
                          )}
                          <span className="text-xs text-slate-400">{tool.usage_count} usos</span>
                        </div>
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
                    <p className="text-sm text-slate-400 mt-2">Puedes crear tools desde la sección de gestión</p>
                  </div>
                )}

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">✅ Resumen del Agente</h4>
                  <div className="text-green-800 dark:text-green-400 text-sm space-y-1">
                    <p><strong>Nombre:</strong> {formData.name || 'Sin nombre'}</p>
                    <p><strong>Rol:</strong> {formData.role}</p>
                    <p><strong>Categoría:</strong> {formData.category}</p>
                    <p><strong>Modelo:</strong> {formData.model_config.provider} - {formData.model_config.model}</p>
                    <p><strong>Tools:</strong> {formData.selected_tools.length} seleccionadas</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer con navegación */}
          <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <button
              type="button"
              onClick={handlePrev}
              disabled={step === 1 || loading}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>

            <div className="text-sm text-slate-600 dark:text-slate-400">
              Paso {step} de 4
            </div>

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading || (step === 1 && !formData.name)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !formData.name}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>Crear Agente</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAgentModal;
