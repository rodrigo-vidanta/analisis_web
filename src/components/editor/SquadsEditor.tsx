import React, { useState, useEffect } from 'react';
import type { AgentTemplate } from '../../config/supabase';

interface SquadsEditorProps {
  template: AgentTemplate;
  onUpdate: (updates: Partial<AgentTemplate>) => void;
}

const SquadsEditor: React.FC<SquadsEditorProps> = ({ template, onUpdate }) => {
  const [squad, setSquad] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);

  useEffect(() => {
    if (template.vapi_config?.squad) {
      setSquad(template.vapi_config.squad);
    }
  }, [template]);

  const handleSquadUpdate = (updates: any) => {
    const newSquad = { ...squad, ...updates };
    setSquad(newSquad);
    
    onUpdate({
      vapi_config: {
        ...template.vapi_config,
        squad: newSquad
      }
    });
  };

  const handleMemberUpdate = (memberIndex: number, updates: any) => {
    if (!squad) return;
    
    const newMembers = [...squad.members];
    newMembers[memberIndex] = {
      ...newMembers[memberIndex],
      assistant: {
        ...newMembers[memberIndex].assistant,
        ...updates
      }
    };
    
    handleSquadUpdate({ members: newMembers });
  };

  const handleAddMember = () => {
    if (!squad) return;
    
    const newMember = {
      assistant: {
        name: `Nuevo Miembro ${squad.members.length + 1}`,
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.7
        },
        voice: {
          provider: 'elevenlabs',
          voiceId: '',
          stability: 0.5,
          speed: 1
        },
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: 'es'
        },
        firstMessage: 'Hola, ¿en qué puedo ayudarte?',
        firstMessageMode: 'assistant-speaks-first',
        backgroundSound: 'office',
        maxDurationSeconds: 900,
        backgroundDenoisingEnabled: true,
        endCallFunctionEnabled: true,
        recordingEnabled: true,
        messages: [],
        tools: [],
        assistantDestinations: []
      },
      assistantDestinations: []
    };
    
    handleSquadUpdate({ members: [...squad.members, newMember] });
  };

  const handleRemoveMember = (memberIndex: number) => {
    if (!squad || !confirm('¿Estás seguro de que quieres eliminar este miembro?')) return;
    
    const newMembers = squad.members.filter((_: any, index: number) => index !== memberIndex);
    handleSquadUpdate({ members: newMembers });
  };

  const handleAddDestination = (memberIndex: number) => {
    if (!squad) return;
    
    const newMembers = [...squad.members];
    newMembers[memberIndex].assistantDestinations = [
      ...newMembers[memberIndex].assistantDestinations,
      {
        type: 'assistant',
        assistantName: '',
        message: '',
        description: ''
      }
    ];
    
    handleSquadUpdate({ members: newMembers });
  };

  const handleRemoveDestination = (memberIndex: number, destinationIndex: number) => {
    if (!squad) return;
    
    const newMembers = [...squad.members];
    newMembers[memberIndex].assistantDestinations = newMembers[memberIndex].assistantDestinations.filter(
      (_: any, index: number) => index !== destinationIndex
    );
    
    handleSquadUpdate({ members: newMembers });
  };

  const handleDestinationUpdate = (memberIndex: number, destinationIndex: number, updates: any) => {
    if (!squad) return;
    
    const newMembers = [...squad.members];
    newMembers[memberIndex].assistantDestinations[destinationIndex] = {
      ...newMembers[memberIndex].assistantDestinations[destinationIndex],
      ...updates
    };
    
    handleSquadUpdate({ members: newMembers });
  };

  if (!squad) {
    return (
      <div className="glass-card p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No es un Squad
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Este agente no está configurado como un squad. Los squads permiten múltiples asistentes trabajando en conjunto.
          </p>
          <button
            onClick={() => {
              const newSquad = {
                name: `${template.name} Squad`,
                members: []
              };
              handleSquadUpdate(newSquad);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Convertir a Squad
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Configuración del Squad
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Gestiona los miembros y transferencias del squad
            </p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {isEditing ? 'Vista' : 'Editar'}
          </button>
        </div>
      </div>

      {/* Squad Info */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={squad.name}
                onChange={(e) => handleSquadUpdate({ name: e.target.value })}
                className="text-xl font-semibold text-slate-900 dark:text-white bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:outline-none"
              />
            ) : (
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {squad.name}
              </h2>
            )}
            <p className="text-slate-600 dark:text-slate-400">
              {squad.members?.length || 0} miembros
            </p>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-medium text-slate-900 dark:text-white">
            Miembros del Squad
          </h4>
          <button
            onClick={handleAddMember}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            + Agregar Miembro
          </button>
        </div>

        {squad.members?.length > 0 ? (
          <div className="space-y-4">
            {squad.members.map((member: any, index: number) => (
              <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={member.assistant.name}
                          onChange={(e) => handleMemberUpdate(index, { name: e.target.value })}
                          className="font-medium text-slate-900 dark:text-white bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:outline-none"
                        />
                      ) : (
                        <h5 className="font-medium text-slate-900 dark:text-white">
                          {member.assistant.name}
                        </h5>
                      )}
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {member.assistant.model?.model} • {member.assistant.voice?.provider}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedMember(selectedMember === index ? null : index)}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      {selectedMember === index ? 'Ocultar' : 'Ver'}
                    </button>
                    <button
                      onClick={() => handleRemoveMember(index)}
                      className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Member Details */}
                {selectedMember === index && (
                  <div className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Modelo
                        </label>
                        <select
                          value={member.assistant.model?.model || 'gpt-4o'}
                          onChange={(e) => handleMemberUpdate(index, { 
                            model: { ...member.assistant.model, model: e.target.value }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="gpt-4o">GPT-4o</option>
                          <option value="gpt-4-turbo">GPT-4 Turbo</option>
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Temperatura
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={member.assistant.model?.temperature || 0.7}
                          onChange={(e) => handleMemberUpdate(index, { 
                            model: { ...member.assistant.model, temperature: parseFloat(e.target.value) }
                          })}
                          className="w-full"
                        />
                        <div className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
                          {member.assistant.model?.temperature || 0.7}
                        </div>
                      </div>
                    </div>

                    {/* First Message */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Mensaje Inicial
                      </label>
                      <textarea
                        value={member.assistant.firstMessage || ''}
                        onChange={(e) => handleMemberUpdate(index, { firstMessage: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                      />
                    </div>

                    {/* Destinations */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Transferencias
                        </label>
                        <button
                          onClick={() => handleAddDestination(index)}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                        >
                          + Agregar
                        </button>
                      </div>
                      
                      {member.assistantDestinations?.length > 0 ? (
                        <div className="space-y-2">
                          {member.assistantDestinations.map((destination: any, destIndex: number) => (
                            <div key={destIndex} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded">
                              <input
                                type="text"
                                value={destination.assistantName}
                                onChange={(e) => handleDestinationUpdate(index, destIndex, { assistantName: e.target.value })}
                                placeholder="Nombre del asistente"
                                className="flex-1 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm"
                              />
                              <input
                                type="text"
                                value={destination.message}
                                onChange={(e) => handleDestinationUpdate(index, destIndex, { message: e.target.value })}
                                placeholder="Mensaje de transferencia"
                                className="flex-1 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm"
                              />
                              <button
                                onClick={() => handleRemoveDestination(index, destIndex)}
                                className="p-1 text-red-500 hover:text-red-600 rounded"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          No hay transferencias configuradas
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-slate-500 dark:text-slate-400">No hay miembros en el squad</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SquadsEditor;
