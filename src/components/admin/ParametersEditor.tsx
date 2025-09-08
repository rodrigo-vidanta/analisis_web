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
  const [activeSection, setActiveSection] = useState<'identity'|'model'|'voice'|'transcriber'|'behavior'|'call'|'squad'>('identity');

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
    <div className="glass-card">
      <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[480px]">
        {/* Nav lateral */}
        <div className="lg:col-span-1 border-r border-slate-200 dark:border-slate-700 p-6 space-y-2">
          {[
            {id:'identity',label:'Identidad',icon:(
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 1118.364 4.56 9 9 0 015.12 17.804z"/></svg>
            )},
            {id:'model',label:'Modelo',icon:(
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            )},
            {id:'voice',label:'Voz',icon:(
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5l-7 7 7 7M21 5l-7 7 7 7"/></svg>
            )},
            {id:'transcriber',label:'Transcripción',icon:(
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
            )},
            {id:'behavior',label:'Comportamiento',icon:(
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/></svg>
            )},
            {id:'call',label:'Llamada',icon:(
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h2l3.6 7.59-1.35 2.44A2 2 0 009 18h9"/></svg>
            )},
            ...(squadEnabled ? [{id:'squad',label:'Squad',icon:(
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M12 14a5 5 0 100-10 5 5 0 000 10z"/></svg>
            )}] : [])
          ].map((s:any)=> (
            <button key={s.id} onClick={()=>setActiveSection(s.id)} className={`w-full text-left px-4 py-3 rounded-lg transition ${activeSection===s.id? 'bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200 dark:border-purple-500 text-purple-700 dark:text-purple-300':'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}` }>
              <div className="flex items-center gap-3">
                {s.icon}
                <span className="font-medium">{s.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="lg:col-span-3 p-6 space-y-6">
        {activeSection==='identity' && (
          <div className="glass-card p-6">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Identidad del Agente</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nombre del Agente
            </label>
            <input
              type="text"
              value={agentIdentity.name}
              onChange={(e) => updateAgentIdentity('name', e.target.value)}
              placeholder="Ej: Ana - Asistente de Ventas"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Primer Mensaje
            </label>
            <input
              type="text"
              value={agentIdentity.firstMessage}
              onChange={(e) => updateAgentIdentity('firstMessage', e.target.value)}
              placeholder="Mensaje de saludo inicial"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Descripción del Agente
            </label>
            <textarea
              value={agentIdentity.description}
              onChange={(e) => updateAgentIdentity('description', e.target.value)}
              placeholder="Breve descripción de qué hace este agente"
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Instrucciones Personalizadas
            </label>
            <textarea
              value={agentIdentity.customInstructions}
              onChange={(e) => updateAgentIdentity('customInstructions', e.target.value)}
              placeholder="Instrucciones específicas para este agente..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white"
            />
          </div>
            </div>
          </div>
        )}

        {activeSection==='model' && (
          <div className="glass-card p-6">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Modelo de IA</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Proveedor</label>
            <select
              value={currentParams.model?.provider || 'openai'}
              onChange={(e) => updateParameter('model', 'provider', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Modelo</label>
            <select
              value={currentParams.model?.model || 'gpt-4o'}
              onChange={(e) => updateParameter('model', 'model', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white"
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4-0125-preview">GPT-4 Preview</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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
        )}

        {activeSection==='voice' && (
          <div className="glass-card p-6">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Voz</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Proveedor</label>
                <select
                  value={currentParams.voice?.provider || '11labs'}
                  onChange={(e) => updateParameter('voice', 'provider', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white"
                >
                  <option value="11labs">11labs</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Voice ID</label>
                <input className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white" value={currentParams.voice?.voiceId || 'default'} onChange={(e)=>updateParameter('voice','voiceId',e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {activeSection==='transcriber' && (
          <div className="glass-card p-6">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Transcripción</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Proveedor</label>
                <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white" value={currentParams.transcriber?.provider || 'deepgram'} onChange={(e)=>updateParameter('transcriber','provider',e.target.value)}>
                  <option value="deepgram">Deepgram</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Modelo</label>
                <input className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white" value={currentParams.transcriber?.model || 'nova-3'} onChange={(e)=>updateParameter('transcriber','model',e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {activeSection==='behavior' && (
          <div className="glass-card p-6">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Comportamiento</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-slate-700">Sonido de Fondo</label>
                  <p className="text-sm text-slate-500">Ambiente sonoro durante la llamada</p>
                </div>
                <select
                  value={currentParams.behavior?.backgroundSound || 'office'}
                  onChange={(e) => updateParameter('behavior', 'backgroundSound', e.target.value)}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white"
                >
                  <option value="office">Oficina</option>
                  <option value="none">Sin sonido</option>
                  <option value="cafe">Café</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-slate-700">Duración Máxima (segundos)</label>
                  <p className="text-sm text-slate-500">Tiempo máximo de llamada</p>
                </div>
                <input
                  type="number"
                  min="300"
                  max="3600"
                  step="60"
                  value={currentParams.behavior?.maxDurationSeconds || 1800}
                  onChange={(e) => updateParameter('behavior', 'maxDurationSeconds', parseInt(e.target.value))}
                  className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {activeSection==='call' && (
          <div className="glass-card p-6">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Llamada</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mensaje de fin de llamada (End Call)</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  value={currentParams.behavior?.endCallMessage || ''}
                  onChange={(e)=>updateParameter('behavior','endCallMessage', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {activeSection==='squad' && squadEnabled && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-4">⭐ Configuración de Squad</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">Tipo de Transferencia</label>
              <select
                value={squadConfig.transferType}
                onChange={(e) => updateSquadConfig('transferType', e.target.value)}
                className="w-full px-3 py-2 border border-amber-300 dark:border-amber-600 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 dark:text-white"
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
                  className="w-full px-3 py-2 border border-amber-300 dark:border-amber-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">Mensaje de Transferencia</label>
              <textarea
                value={squadConfig.transferMessage}
                onChange={(e) => updateSquadConfig('transferMessage', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-amber-300 dark:border-amber-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-slate-800 dark:text-white"
                placeholder="Mensaje que dirá el agente antes de transferir..."
              />
            </div>
          </div>
        </div>
        )}

        </div>
      </div>
    </div>
  );
};

export default ParametersEditor;
