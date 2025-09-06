import React, { useState, useEffect } from 'react';

interface ParametersEditorProps {
  parameters: any;
  onUpdate: (parameters: any) => void;
  squadEnabled?: boolean;
}

type ParameterSection = 'identity' | 'model' | 'voice' | 'transcriber' | 'behavior' | 'call' | 'squad';

const ParametersEditorImproved: React.FC<ParametersEditorProps> = ({ 
  parameters, 
  onUpdate, 
  squadEnabled = false 
}) => {
  const [currentParams, setCurrentParams] = useState(parameters || {});
  const [activeSection, setActiveSection] = useState<ParameterSection>('identity');
  const [agentIdentity, setAgentIdentity] = useState({
    name: '',
    description: '',
    firstMessage: 'Hola, ¿en qué puedo ayudarte hoy?',
    endCallPhrases: ['hasta luego', 'adiós', 'terminar llamada'],
    customInstructions: ''
  });

  const sections = [
    {
      id: 'identity' as ParameterSection,
      label: 'Identidad',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: 'blue'
    },
    {
      id: 'model' as ParameterSection,
      label: 'Modelo',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'purple'
    },
    {
      id: 'voice' as ParameterSection,
      label: 'Voz',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      color: 'green'
    },
    {
      id: 'transcriber' as ParameterSection,
      label: 'Transcripción',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      color: 'orange'
    },
    {
      id: 'behavior' as ParameterSection,
      label: 'Comportamiento',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      ),
      color: 'red'
    },
    {
      id: 'call' as ParameterSection,
      label: 'Llamada',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      color: 'indigo'
    },
    ...(squadEnabled ? [{
      id: 'squad' as ParameterSection,
      label: 'Squad',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M12 14a5 5 0 100-10 5 5 0 000 10z" />
        </svg>
      ),
      color: 'pink'
    }] : [])
  ];

  useEffect(() => {
    initializeParameters();
  }, []);

  const initializeParameters = () => {
    if (!parameters || Object.keys(parameters).length === 0) {
      const defaultParams = {
        model: {
          provider: "openai",
          model: "gpt-4o",
          temperature: 0.75,
          fallbackModels: ["gpt-4-0125-preview", "gpt-3.5-turbo"]
        },
        voice: {
          provider: "11labs",
          voiceId: "default",
          model: "eleven_turbo_v2_5",
          stability: 0.35,
          similarityBoost: 0.75,
          speed: 1.0
        },
        transcriber: {
          provider: "deepgram",
          model: "nova-3",
          language: "multi",
          endpointing: 180,
          confidenceThreshold: 0.75
        },
        behavior: {
          backgroundSound: "office",
          maxDurationSeconds: 1800,
          backgroundDenoisingEnabled: true,
          endCallMessage: 'Gracias por tu llamada. ¡Que tengas un excelente día!'
        }
      };
      setCurrentParams(defaultParams);
      onUpdate(defaultParams);
    }
  };

  const updateParameter = (section: string, key: string, value: any) => {
    const newParams = {
      ...currentParams,
      [section]: {
        ...currentParams[section],
        [key]: value
      }
    };
    setCurrentParams(newParams);
    onUpdate(newParams);
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'identity':
        return (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Identidad del Agente
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Nombre del Agente
                  </label>
                  <input
                    type="text"
                    value={agentIdentity.name}
                    onChange={(e) => setAgentIdentity({...agentIdentity, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="Ej: Asistente de Ventas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={agentIdentity.description}
                    onChange={(e) => setAgentIdentity({...agentIdentity, description: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="Breve descripción del agente"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'model':
        return (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Configuración del Modelo
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Proveedor
                  </label>
                  <select
                    value={currentParams.model?.provider || 'openai'}
                    onChange={(e) => updateParameter('model', 'provider', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Modelo
                  </label>
                  <select
                    value={currentParams.model?.model || 'gpt-4o'}
                    onChange={(e) => updateParameter('model', 'model', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4-0125-preview">GPT-4 Preview</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Temperature: {currentParams.model?.temperature || 0.75}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={currentParams.model?.temperature || 0.75}
                    onChange={(e) => updateParameter('model', 'temperature', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span>Conservador (0)</span>
                    <span>Creativo (1)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'voice':
        return (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Configuración de Voz
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Proveedor
                  </label>
                  <select
                    value={currentParams.voice?.provider || '11labs'}
                    onChange={(e) => updateParameter('voice', 'provider', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="11labs">11Labs</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Modelo
                  </label>
                  <select
                    value={currentParams.voice?.model || 'eleven_turbo_v2_5'}
                    onChange={(e) => updateParameter('voice', 'model', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="eleven_turbo_v2_5">Eleven Turbo v2.5</option>
                    <option value="eleven_flash_v2_5">Eleven Flash v2.5</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Estabilidad: {currentParams.voice?.stability || 0.35}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={currentParams.voice?.stability || 0.35}
                    onChange={(e) => updateParameter('voice', 'stability', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Velocidad: {currentParams.voice?.speed || 1.0}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={currentParams.voice?.speed || 1.0}
                    onChange={(e) => updateParameter('voice', 'speed', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="glass-card p-6">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {sections.find(s => s.id === activeSection)?.label}
            </h4>
            <p className="text-slate-600 dark:text-slate-400">
              Configuración de {sections.find(s => s.id === activeSection)?.label.toLowerCase()} en desarrollo.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          Parámetros del Agente
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Configura los parámetros técnicos y de comportamiento de tu agente
        </p>
      </div>

      {/* Navigation */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 overflow-x-auto">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center space-x-2 px-4 py-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeSection === section.id
                ? `bg-${section.color}-100 text-${section.color}-700 dark:bg-${section.color}-900/20 dark:text-${section.color}-300`
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {section.icon}
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {renderSectionContent()}
    </div>
  );
};

export default ParametersEditorImproved;
