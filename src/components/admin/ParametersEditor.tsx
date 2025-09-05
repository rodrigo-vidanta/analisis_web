import React, { useState, useEffect } from 'react';

interface ParametersEditorProps {
  parameters: any;
  onUpdate: (parameters: any) => void;
  squadEnabled?: boolean;
}

const ParametersEditor: React.FC<ParametersEditorProps> = ({ 
  parameters, 
  onUpdate, 
  squadEnabled = false 
}) => {
  const [currentParams, setCurrentParams] = useState(parameters || {});
  const [agentIdentity, setAgentIdentity] = useState({
    name: '',
    description: '',
    firstMessage: 'Hola, ¿en qué puedo ayudarte hoy?',
    endCallPhrases: ['hasta luego', 'adiós', 'terminar llamada'],
    customInstructions: ''
  });
  const [squadConfig, setSquadConfig] = useState({
    transferType: 'assistant',
    destinationNumber: '',
    enableExtension: false,
    extensionNumber: '',
    transferMessage: 'Te voy a transferir con un especialista que te ayudará mejor.'
  });

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
          backgroundDenoisingEnabled: true
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

  const updateSquadConfig = (key: string, value: any) => {
    const newConfig = { ...squadConfig, [key]: value };
    setSquadConfig(newConfig);
    
    if (squadEnabled) {
      const newParams = {
        ...currentParams,
        squadTransfer: newConfig
      };
      setCurrentParams(newParams);
      onUpdate(newParams);
    }
  };

  const updateAgentIdentity = (field: string, value: any) => {
    const updated = { ...agentIdentity, [field]: value };
    setAgentIdentity(updated);
    
    // Actualizar los parámetros con la nueva identidad
    const updatedParams = {
      ...currentParams,
      identity: updated
    };
    setCurrentParams(updatedParams);
    onUpdate(updatedParams);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Parámetros del Agente</h3>
        <p className="text-sm text-gray-600 mb-6">
          Ajusta la configuración de voz, modelo y comportamiento
        </p>
      </div>

      {/* Identidad del Agente */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Identidad del Agente</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Agente
            </label>
            <input
              type="text"
              value={agentIdentity.name}
              onChange={(e) => updateAgentIdentity('name', e.target.value)}
              placeholder="Ej: Ana - Asistente de Ventas"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primer Mensaje
            </label>
            <input
              type="text"
              value={agentIdentity.firstMessage}
              onChange={(e) => updateAgentIdentity('firstMessage', e.target.value)}
              placeholder="Mensaje de saludo inicial"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción del Agente
            </label>
            <textarea
              value={agentIdentity.description}
              onChange={(e) => updateAgentIdentity('description', e.target.value)}
              placeholder="Breve descripción de qué hace este agente"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instrucciones Personalizadas
            </label>
            <textarea
              value={agentIdentity.customInstructions}
              onChange={(e) => updateAgentIdentity('customInstructions', e.target.value)}
              placeholder="Instrucciones específicas para este agente..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Configuración de Modelo */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Modelo de IA</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor</label>
            <select
              value={currentParams.model?.provider || 'openai'}
              onChange={(e) => updateParameter('model', 'provider', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
            <select
              value={currentParams.model?.model || 'gpt-4o'}
              onChange={(e) => updateParameter('model', 'model', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4-0125-preview">GPT-4 Preview</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature ({currentParams.model?.temperature || 0.75})
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={currentParams.model?.temperature || 0.75}
              onChange={(e) => updateParameter('model', 'temperature', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Configuración de Squad */}
      {squadEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h4 className="text-md font-semibold text-amber-900 mb-4">⭐ Configuración de Squad</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-2">Tipo de Transferencia</label>
              <select
                value={squadConfig.transferType}
                onChange={(e) => updateSquadConfig('transferType', e.target.value)}
                className="w-full px-3 py-2 border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="assistant">A otro agente del squad</option>
                <option value="phone">A número telefónico</option>
              </select>
            </div>
            
            {squadConfig.transferType === 'phone' && (
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-2">Número de Destino</label>
                <input
                  type="tel"
                  value={squadConfig.destinationNumber}
                  onChange={(e) => updateSquadConfig('destinationNumber', e.target.value)}
                  placeholder="Ej: +52 33 1234 5678"
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-2">Mensaje de Transferencia</label>
              <textarea
                value={squadConfig.transferMessage}
                onChange={(e) => updateSquadConfig('transferMessage', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-500"
                placeholder="Mensaje que dirá el agente antes de transferir..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Configuraciones Adicionales */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Configuraciones Adicionales</h4>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Sonido de Fondo</label>
              <p className="text-sm text-gray-500">Ambiente sonoro durante la llamada</p>
            </div>
            <select
              value={currentParams.behavior?.backgroundSound || 'office'}
              onChange={(e) => updateParameter('behavior', 'backgroundSound', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="office">Oficina</option>
              <option value="none">Sin sonido</option>
              <option value="cafe">Café</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Duración Máxima (segundos)</label>
              <p className="text-sm text-gray-500">Tiempo máximo de llamada</p>
            </div>
            <input
              type="number"
              min="300"
              max="3600"
              step="60"
              value={currentParams.behavior?.maxDurationSeconds || 1800}
              onChange={(e) => updateParameter('behavior', 'maxDurationSeconds', parseInt(e.target.value))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParametersEditor;