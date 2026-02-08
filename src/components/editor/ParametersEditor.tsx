import React, { useState, useEffect } from 'react';
import type { AgentTemplate } from '../../config/supabase';

interface ParametersEditorProps {
  template: AgentTemplate;
  onUpdate: (updates: Partial<AgentTemplate>) => void;
}

const ParametersEditor: React.FC<ParametersEditorProps> = ({ template, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('model');
  const [parameters, setParameters] = useState<any>({});

  useEffect(() => {
    if (template.vapi_config) {
      setParameters(template.vapi_config);
    }
  }, [template]);

  const handleParameterChange = (path: string, value: any) => {
    const newParameters = { ...parameters };
    const keys = path.split('.');
    let current = newParameters;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setParameters(newParameters);
    
    onUpdate({
      vapi_config: newParameters
    });
  };

  const tabs = [
    { 
      id: 'model', 
      name: 'Modelo', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    },
    { 
      id: 'voice', 
      name: 'Voz', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      )
    },
    { 
      id: 'transcriber', 
      name: 'Transcripción', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      id: 'behavior', 
      name: 'Comportamiento', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      )
    },
    { 
      id: 'advanced', 
      name: 'Avanzado', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  const renderModelTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Proveedor
          </label>
          <select
            value={parameters.model?.provider || 'openai'}
            onChange={(e) => handleParameterChange('model.provider', e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Modelo
          </label>
          <select
            value={parameters.model?.model || 'gpt-4o'}
            onChange={(e) => handleParameterChange('model.model', e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="claude-3-opus">Claude 3 Opus</option>
            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Temperatura
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={parameters.model?.temperature || 0.7}
            onChange={(e) => handleParameterChange('model.temperature', parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Conservador (0)</span>
            <span className="font-medium">{parameters.model?.temperature || 0.7}</span>
            <span>Creativo (2)</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Duración Máxima (segundos)
          </label>
          <input
            type="number"
            value={parameters.maxDurationSeconds || 900}
            onChange={(e) => handleParameterChange('maxDurationSeconds', parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="60"
            max="3600"
          />
        </div>
      </div>
    </div>
  );

  const renderVoiceTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Proveedor de Voz
          </label>
          <select
            value={parameters.voice?.provider || 'elevenlabs'}
            onChange={(e) => handleParameterChange('voice.provider', e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="elevenlabs">ElevenLabs</option>
            <option value="openai">OpenAI</option>
            <option value="azure">Azure</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ID de Voz
          </label>
          <input
            type="text"
            value={parameters.voice?.voiceId || ''}
            onChange={(e) => handleParameterChange('voice.voiceId', e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: 21m00Tcm4TlvDq8ikWAM"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Estabilidad
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={parameters.voice?.stability || 0.5}
            onChange={(e) => handleParameterChange('voice.stability', parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Variable (0)</span>
            <span className="font-medium">{parameters.voice?.stability || 0.5}</span>
            <span>Estable (1)</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Velocidad
          </label>
          <input
            type="range"
            min="0.25"
            max="4"
            step="0.25"
            value={parameters.voice?.speed || 1}
            onChange={(e) => handleParameterChange('voice.speed', parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Lento (0.25x)</span>
            <span className="font-medium">{parameters.voice?.speed || 1}x</span>
            <span>Rápido (4x)</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTranscriberTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Proveedor
          </label>
          <select
            value={parameters.transcriber?.provider || 'deepgram'}
            onChange={(e) => handleParameterChange('transcriber.provider', e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="deepgram">Deepgram</option>
            <option value="openai">OpenAI</option>
            <option value="azure">Azure</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Modelo
          </label>
          <select
            value={parameters.transcriber?.model || 'nova-2'}
            onChange={(e) => handleParameterChange('transcriber.model', e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="nova-2">Nova-2</option>
            <option value="nova">Nova</option>
            <option value="enhanced">Enhanced</option>
            <option value="base">Base</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Idioma
          </label>
          <select
            value={parameters.transcriber?.language || 'es'}
            onChange={(e) => handleParameterChange('transcriber.language', e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="es">Español</option>
            <option value="en">Inglés</option>
            <option value="auto">Automático</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Formato Inteligente
          </label>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={parameters.transcriber?.smartFormat || false}
              onChange={(e) => handleParameterChange('transcriber.smartFormat', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Activar formato inteligente
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBehaviorTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sonido de Fondo
          </label>
          <select
            value={parameters.backgroundSound || 'office'}
            onChange={(e) => handleParameterChange('backgroundSound', e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="office">Oficina</option>
            <option value="cafe">Café</option>
            <option value="nature">Naturaleza</option>
            <option value="none">Ninguno</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Modo de Primer Mensaje
          </label>
          <select
            value={parameters.firstMessageMode || 'assistant-speaks-first'}
            onChange={(e) => handleParameterChange('firstMessageMode', e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="assistant-speaks-first">Asistente habla primero</option>
            <option value="user-speaks-first">Usuario habla primero</option>
            <option value="wait-for-user">Esperar al usuario</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reducción de Ruido
          </label>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={parameters.backgroundDenoisingEnabled || false}
              onChange={(e) => handleParameterChange('backgroundDenoisingEnabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Activar reducción de ruido
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Grabación Habilitada
          </label>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={parameters.recordingEnabled || false}
              onChange={(e) => handleParameterChange('recordingEnabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Permitir grabación
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Mensaje de Despedida
        </label>
        <textarea
          value={parameters.endCallMessage || ''}
          onChange={(e) => handleParameterChange('endCallMessage', e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          placeholder="Mensaje que se reproducirá al finalizar la llamada..."
        />
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            URL del Servidor
          </label>
          <input
            type="url"
            value={parameters.serverUrl || ''}
            onChange={(e) => handleParameterChange('serverUrl', e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://api.ejemplo.com/webhook"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Mensajes del Servidor
          </label>
          <input
            type="text"
            value={parameters.serverMessages?.join(', ') || ''}
            onChange={(e) => handleParameterChange('serverMessages', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="end-of-call-report, analysis-complete"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Frases de Finalización
        </label>
        <textarea
          value={parameters.endCallPhrases?.join('\n') || ''}
          onChange={(e) => handleParameterChange('endCallPhrases', e.target.value.split('\n').filter(s => s.trim()))}
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          placeholder="Cada frase en una línea separada..."
        />
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'model':
        return renderModelTab();
      case 'voice':
        return renderVoiceTab();
      case 'transcriber':
        return renderTranscriberTab();
      case 'behavior':
        return renderBehaviorTab();
      case 'advanced':
        return renderAdvancedTab();
      default:
        return renderModelTab();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Parámetros del Agente
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Configura el comportamiento y capacidades del agente
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card p-6">
        <div className="flex space-x-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {tab.icon}
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default ParametersEditor;
