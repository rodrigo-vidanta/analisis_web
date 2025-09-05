import React, { useState, useEffect } from 'react';
import { type AgentTemplate } from '../../config/supabase';
import { getAgentTemplates } from '../../services/supabaseService';
import { supabaseMainAdmin as supabaseAdmin } from '../../config/supabase';

interface SquadMember {
  id: string;
  name: string;
  template?: AgentTemplate;
  transferConfig?: {
    phoneNumber: string;
    extension?: string;
    message: string;
    conditions: string[];
  };
  transferConditions?: string; // Legacy support
  transferMessage?: string; // Legacy support
  isEditMode?: boolean;
  originalMessages?: any[]; // Para miembros auto-detectados
}

interface SquadEditorProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  squadMembers: SquadMember[];
  onSquadChange: (members: SquadMember[]) => void;
  mainAgentTemplate?: AgentTemplate;
  mainAgentPrompts?: any[];
}

type ActiveView = 'transfers' | 'roles';

const SquadEditor: React.FC<SquadEditorProps> = ({
  isEnabled,
  onToggle,
  squadMembers,
  onSquadChange,
  mainAgentTemplate,
  mainAgentPrompts = []
}) => {
  const [availableTemplates, setAvailableTemplates] = useState<AgentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('transfers');
  const [selectedMemberForRoles, setSelectedMemberForRoles] = useState<string | null>(null);
  const [memberPrompts, setMemberPrompts] = useState<{[key: string]: any[]}>({});

  // Efecto para cargar datos cuando se habilita
  useEffect(() => {
    if (isEnabled) {
      console.log('⚡ SquadEditor useEffect - isEnabled:', isEnabled, '- squadMembers:', squadMembers.length);
      console.log('⚡ SquadMembers recibidos:', squadMembers.map(m => `${m.name}: ${m.originalMessages?.length || 0} originalMessages`));
      loadAvailableTemplates();
      loadMemberPrompts();
    }
  }, [isEnabled, squadMembers]);

  // Efecto para agregar automáticamente el agente principal cuando se habilita el squad por primera vez
  useEffect(() => {
    if (isEnabled && squadMembers.length === 0 && mainAgentTemplate) {
      console.log('🎯 Agregando agente principal automáticamente:', mainAgentTemplate.name);
      const mainAgentMember: SquadMember = {
        id: 'main-agent',
        name: mainAgentTemplate.name,
        template: mainAgentTemplate,
        transferConfig: {
          phoneNumber: '',
          extension: '',
          message: 'Agente principal - no transferible',
          conditions: []
        },
        originalMessages: mainAgentPrompts,
        isEditMode: false
      };
      onSquadChange([mainAgentMember]);
    }
  }, [isEnabled, squadMembers.length, mainAgentTemplate, mainAgentPrompts, onSquadChange]);

  const loadAvailableTemplates = async () => {
    setIsLoading(true);
    try {
      const allTemplates = await getAgentTemplates();
      
      // Filtrar solo plantillas que NO tengan configuración de squad
      // y que sean agentes individuales
      const filteredTemplates = allTemplates.filter(template => {
        if (!template.vapi_config) return true;
        
        const jsonData = template.vapi_config;
        // Excluir agentes que tienen configuración de squad
        if (jsonData.squad && jsonData.squad.members && jsonData.squad.members.length > 0) {
          console.log('🚫 Excluyendo plantilla con squad:', template.name);
          return false;
        }
        
        return true;
      });
      
      console.log('📋 Plantillas disponibles para squad:', filteredTemplates.length, 'de', allTemplates.length);
      setAvailableTemplates(filteredTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMemberPrompts = async () => {
    const prompts: {[key: string]: any[]} = {};
    
    console.log('🔄 Cargando prompts para', squadMembers.length, 'miembros del squad');
    
    for (const member of squadMembers) {
      console.log('📝 Procesando miembro:', member.name, 'ID:', member.id);
      console.log('📋 originalMessages:', member.originalMessages?.length || 0);
      
      if (member.id === 'main-agent') {
        // Para el agente principal, usar los prompts principales
        console.log('🎯 Cargando prompts del agente principal:', mainAgentPrompts.length);
        prompts[member.id] = mainAgentPrompts.map((msg: any, index: number) => ({
          id: `${member.id}-prompt-${index}`,
          title: `Prompt ${index + 1} - ${member.name}`,
          content: msg.content || '',
          role: msg.role || 'system',
          category: 'main',
          prompt_type: 'main_agent',
          is_required: false,
          order_priority: index,
          variables: [],
          is_customized: false,
          order_index: index
        }));
      } else if (member.originalMessages && member.originalMessages.length > 0) {
        // Para miembros auto-detectados, usar los mensajes originales
        console.log('✅ Cargando', member.originalMessages.length, 'prompts para', member.name);
        prompts[member.id] = member.originalMessages.map((msg: any, index: number) => ({
          id: `${member.id}-prompt-${index}`,
          title: `Prompt ${index + 1} - ${member.name}`,
          content: msg.content || '',
          role: msg.role || 'system',
          category: 'squad',
          prompt_type: 'original',
          is_required: false,
          order_priority: index,
          variables: [],
          is_customized: false,
          order_index: index
        }));
      } else if (member.template) {
        // Para miembros con plantilla, cargar desde la plantilla
        console.log('📄 Miembro tiene plantilla:', member.template.name);
        prompts[member.id] = [];
      } else {
        console.log('⚠️ Miembro sin prompts ni plantilla:', member.name);
        prompts[member.id] = [];
      }
    }
    
    console.log('📊 Prompts cargados:', Object.keys(prompts).map(key => `${key}: ${prompts[key].length}`));
    setMemberPrompts(prompts);
  };

  const addSquadMember = () => {
    // Contar solo miembros no detectados automáticamente
    const manualMembers = squadMembers.filter(m => !m.id.startsWith('member-'));
    
    if (manualMembers.length >= 2) {
      alert('Máximo 2 miembros adicionales de squad permitidos');
      return;
    }

    const newMember: SquadMember = {
      id: `squad_${Date.now()}`,
      name: `Especialista ${squadMembers.length + 1}`,
      transferConfig: {
        phoneNumber: '',
        message: 'Te voy a conectar con mi colega especialista que te puede ayudar mejor con esto.',
        conditions: []
      },
      isEditMode: true
    };

    onSquadChange([...squadMembers, newMember]);
  };

  const removeSquadMember = (memberId: string) => {
    const updatedMembers = squadMembers.filter(member => member.id !== memberId);
    onSquadChange(updatedMembers);
  };

  const updateSquadMember = (memberId: string, updates: Partial<SquadMember>) => {
    const updatedMembers = squadMembers.map(member =>
      member.id === memberId ? { ...member, ...updates } : member
    );
    onSquadChange(updatedMembers);
  };

  const selectTemplateForMember = (memberId: string, templateId: string) => {
    const template = availableTemplates.find(t => t.id === templateId);
    if (template) {
      updateSquadMember(memberId, { 
        template,
        name: template.name
      });
    }
  };

  const toggleEditMode = (memberId: string) => {
    const member = squadMembers.find(m => m.id === memberId);
    if (member) {
      updateSquadMember(memberId, { isEditMode: !member.isEditMode });
    }
  };

  const updateMemberPrompts = (memberId: string, prompts: any[]) => {
    setMemberPrompts(prev => ({
      ...prev,
      [memberId]: prompts
    }));
  };

  const addPromptToMember = (memberId: string) => {
    const currentPrompts = memberPrompts[memberId] || [];
    const newPrompt = {
      id: `${memberId}-prompt-${currentPrompts.length}`,
      title: `Prompt ${currentPrompts.length + 1}`,
      content: '',
      role: 'system',
      category: 'squad',
      prompt_type: 'custom',
      is_required: false,
      order_priority: currentPrompts.length,
      variables: [],
      is_customized: true,
      order_index: currentPrompts.length
    };
    
    updateMemberPrompts(memberId, [...currentPrompts, newPrompt]);
  };

  const removePromptFromMember = (memberId: string, promptId: string) => {
    const currentPrompts = memberPrompts[memberId] || [];
    const updatedPrompts = currentPrompts.filter(p => p.id !== promptId);
    // Reindexar
    updatedPrompts.forEach((prompt, index) => {
      prompt.order_index = index;
    });
    updateMemberPrompts(memberId, updatedPrompts);
  };

  const updatePromptContent = (memberId: string, promptId: string, content: string) => {
    const currentPrompts = memberPrompts[memberId] || [];
    const updatedPrompts = currentPrompts.map(p => 
      p.id === promptId 
        ? { ...p, content, is_customized: true }
        : p
    );
    updateMemberPrompts(memberId, updatedPrompts);
  };

  if (isLoading) {
    return (
      <div className="glass-card p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-slate-600 dark:text-slate-400">Cargando configuración de squad...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con Toggle */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Configuración de Squad
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Gestiona transferencias inteligentes y roles de agentes especializados
            </p>
          </div>
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isEnabled}
                onChange={(e) => onToggle(e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Layout con submenú lateral */}
      {isEnabled && (
        <div className="glass-card">
          <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[600px]">
            {/* Submenú lateral izquierdo */}
            <div className="lg:col-span-1 border-r border-slate-200 dark:border-slate-700 p-6">
              <div className="space-y-2">
                <button
                  onClick={() => setActiveView('transfers')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeView === 'transfers'
                      ? 'bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <div>
                      <p className="font-medium">Transferencias</p>
                      <p className="text-xs opacity-75">Configurar flujos</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveView('roles')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeView === 'roles'
                      ? 'bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <div>
                      <p className="font-medium">Roles Adicionales</p>
                      <p className="text-xs opacity-75">Editar prompts</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Resumen del squad */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-lg border border-blue-200/50 dark:border-purple-500/30">
                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                  📋 Resumen del Squad
                </h4>
                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <p><strong>Miembros totales:</strong> {squadMembers.length}</p>
                  <p><strong>Auto-detectados:</strong> {squadMembers.filter(m => m.id.startsWith('member-')).length}</p>
                  <p><strong>Manuales:</strong> {squadMembers.filter(m => !m.id.startsWith('member-')).length}</p>
                </div>
              </div>
            </div>

            {/* Contenido principal */}
            <div className="lg:col-span-3 p-6">
              {activeView === 'transfers' && (
                <div className="space-y-6">
                  {/* Header de transferencias */}
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Configuración de Transferencias
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Define cuándo y cómo transferir entre miembros del squad
                      </p>
                    </div>
                  </div>

                  {/* Miembros del squad para transferencias */}
                  <div className="space-y-4">
                                         {squadMembers.map((member, index) => {
                       const isDetectedMember = member.id.startsWith('member-');
                       const isMainAgent = member.id === 'main-agent' || index === 0;
                       const transferConditions = member.transferConfig?.conditions?.join(', ') || member.transferConditions || '';
                       const transferMessage = member.transferConfig?.message || member.transferMessage || '';
                       
                       return (
                        <div key={member.id} className="group relative bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-md transition-all duration-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-4">
                                <div className={`flex items-center justify-center w-7 h-7 rounded-lg font-semibold text-white text-xs ${
                                  isDetectedMember ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-blue-500 to-purple-600'
                                }`}>
                                  {index + 1}
                                </div>
                                <h5 className="font-semibold text-slate-900 dark:text-white">{member.name || `Especialista ${index + 1}`}</h5>
                                
                                <div className="flex items-center gap-2">
                                                                     {isDetectedMember && (
                                     <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
                                       Auto-detectado
                                     </span>
                                   )}
                                   {isMainAgent && (
                                     <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full font-medium">
                                       Principal
                                     </span>
                                   )}
                                </div>
                              </div>
                              
                              {member.isEditMode ? (
                                <div className="space-y-4">
                                  {!isDetectedMember && !isMainAgent && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                          Plantilla de Agente
                                        </label>
                                        <select
                                          value={member.template?.id || ''}
                                          onChange={(e) => selectTemplateForMember(member.id, e.target.value)}
                                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white"
                                        >
                                          <option value="">Seleccionar plantilla...</option>
                                          {availableTemplates.map(template => (
                                            <option key={template.id} value={template.id}>
                                              {template.name} ({template.category_name || 'Sin categoría'})
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                          Nombre del Especialista
                                        </label>
                                        <input
                                          type="text"
                                          value={member.name}
                                          onChange={(e) => updateSquadMember(member.id, { name: e.target.value })}
                                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white"
                                          placeholder="Nombre del agente especialista..."
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* Configuración de transferencia */}
                                  <div className="space-y-3">
                                    <h6 className="text-sm font-medium text-slate-700 dark:text-slate-300">Configuración de Transferencia</h6>
                                    
                                    <div>
                                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Condiciones de Transferencia
                                      </label>
                                      <input
                                        type="text"
                                        value={transferConditions}
                                        onChange={(e) => {
                                          const conditions = e.target.value.split(',').map(c => c.trim()).filter(c => c);
                                          updateSquadMember(member.id, { 
                                            transferConfig: {
                                              ...member.transferConfig,
                                              phoneNumber: member.transferConfig?.phoneNumber || '',
                                              message: member.transferConfig?.message || transferMessage,
                                              conditions
                                            }
                                          });
                                        }}
                                                                                 className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white"
                                         placeholder={isMainAgent ? "Ej: escalation, soporte avanzado, supervisor" : "Ej: ventas, precios, cotización, soporte técnico"}
                                         disabled={false}
                                      />
                                                                             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                         {isMainAgent 
                                           ? 'Palabras clave que activarán transferencias desde el agente principal a los especialistas'
                                           : 'Palabras clave separadas por comas que activarán la transferencia'
                                         }
                                       </p>
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Mensaje de Transferencia
                                      </label>
                                      <textarea
                                        value={transferMessage}
                                        onChange={(e) => {
                                          updateSquadMember(member.id, { 
                                            transferConfig: {
                                              ...member.transferConfig,
                                              phoneNumber: member.transferConfig?.phoneNumber || '',
                                              conditions: member.transferConfig?.conditions || [],
                                              message: e.target.value
                                            }
                                          });
                                        }}
                                        rows={3}
                                                                                 className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white"
                                         placeholder={isMainAgent ? "Mensaje que dirá antes de transferir a un especialista..." : "Mensaje que dirá el agente antes de transferir..."}
                                         disabled={false}
                                      />
                                                                             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                         {isMainAgent 
                                           ? 'Este mensaje se dirá antes de transferir la conversación a un especialista'
                                           : 'Este mensaje se dirá justo antes de realizar la transferencia'
                                         }
                                       </p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Condiciones:</p>
                                      <p className="text-sm text-slate-600 dark:text-slate-400">{transferConditions || 'Sin configurar'}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Plantilla:</p>
                                      <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {member.template ? member.template.name : (isDetectedMember ? 'Original del squad' : 'Sin plantilla')}
                                      </p>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Mensaje de transferencia:</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{transferMessage || 'Sin configurar'}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                                                         <div className="flex flex-col gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button
                                 onClick={() => toggleEditMode(member.id)}
                                 className="flex items-center justify-center w-8 h-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                 title={isMainAgent 
                                   ? (member.isEditMode ? "Guardar transferencias" : "Editar transferencias") 
                                   : (member.isEditMode ? "Guardar" : "Editar")
                                 }
                               >
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={member.isEditMode ? "M5 13l4 4L19 7" : "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"} />
                                 </svg>
                               </button>
                               {!isDetectedMember && !isMainAgent && (
                                 <button
                                   onClick={() => removeSquadMember(member.id)}
                                   className="flex items-center justify-center w-8 h-8 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                   title="Eliminar"
                                 >
                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                   </svg>
                                 </button>
                               )}
                             </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Botón agregar miembro */}
                  {(() => {
                    const manualMembers = squadMembers.filter(m => !m.id.startsWith('member-'));
                    const detectedMembers = squadMembers.filter(m => m.id.startsWith('member-'));
                    const canAddMore = manualMembers.length < 2;
                    
                    return canAddMore && (
                      <button
                        onClick={addSquadMember}
                        disabled={isLoading}
                        className="w-full p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:border-purple-400 hover:text-purple-600 transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-2xl">+</span>
                          <span className="font-medium">Agregar Especialista al Squad</span>
                        </div>
                        <p className="text-sm mt-2 text-slate-500 dark:text-slate-400">
                          {detectedMembers.length > 0 && (
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {detectedMembers.length} miembro{detectedMembers.length > 1 ? 's' : ''} auto-detectado{detectedMembers.length > 1 ? 's' : ''} • 
                            </span>
                          )}
                          {manualMembers.length === 0 
                            ? ' Máximo 2 especialistas adicionales' 
                            : ` ${2 - manualMembers.length} especialista${2 - manualMembers.length > 1 ? 's' : ''} restante${2 - manualMembers.length > 1 ? 's' : ''}`
                          }
                        </p>
                      </button>
                    );
                  })()}
                </div>
              )}

              {activeView === 'roles' && (
                <div className="space-y-6">
                  {/* Header de roles */}
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Roles Adicionales del Squad
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Edita los prompts de los miembros adicionales (excepto el agente principal)
                      </p>
                    </div>
                  </div>

                  {/* Selector de miembro */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      Seleccionar miembro del squad para editar
                    </label>
                                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                       {squadMembers.filter((member) => member.id !== 'main-agent' && !member.id.startsWith('member-0')).map((member, index) => {
                        const isSelected = selectedMemberForRoles === member.id;
                        const isDetectedMember = member.id.startsWith('member-');
                        const promptCount = memberPrompts[member.id]?.length || 0;
                        
                        return (
                          <button
                            key={member.id}
                            onClick={() => setSelectedMemberForRoles(member.id)}
                            className={`p-4 text-left rounded-lg border transition-all duration-200 ${
                              isSelected
                                ? 'border-purple-300 bg-purple-50 dark:border-purple-500 dark:bg-purple-900/20'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-purple-200 dark:hover:border-purple-600'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`flex items-center justify-center w-8 h-8 rounded-lg font-semibold text-white text-xs ${
                                isDetectedMember ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-blue-500 to-purple-600'
                              }`}>
                                {index + 2}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-slate-900 dark:text-white">{member.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {promptCount} prompt{promptCount !== 1 ? 's' : ''}
                                  {isDetectedMember && ' • Auto-detectado'}
                                </p>
                              </div>
                              {isSelected && (
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Editor de prompts para el miembro seleccionado */}
                  {selectedMemberForRoles && (() => {
                    const selectedMember = squadMembers.find(m => m.id === selectedMemberForRoles);
                    const prompts = memberPrompts[selectedMemberForRoles] || [];
                    const isDetectedMember = selectedMemberForRoles.startsWith('member-');
                    
                    if (!selectedMember) return null;
                    
                    return (
                      <div className="space-y-4">
                        {/* Header del miembro seleccionado */}
                        <div className="bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`flex items-center justify-center w-8 h-8 rounded-lg font-semibold text-white text-xs ${
                                isDetectedMember ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-blue-500 to-purple-600'
                              }`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                              </div>
                              <div>
                                <h5 className="font-semibold text-slate-900 dark:text-white">{selectedMember.name}</h5>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  {prompts.length} prompt{prompts.length !== 1 ? 's' : ''} configurado{prompts.length !== 1 ? 's' : ''}
                                  {isDetectedMember && ' • Auto-detectado del JSON original'}
                                </p>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => addPromptToMember(selectedMemberForRoles)}
                              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 text-sm font-medium transition-all duration-200"
                            >
                              <span className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Agregar Prompt</span>
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Lista de prompts */}
                        {prompts.length === 0 ? (
                          <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center justify-center w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4">
                              <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                              </svg>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 mb-2 font-medium">No hay prompts configurados</p>
                            <p className="text-sm text-slate-500 dark:text-slate-500">Agrega prompts para definir el comportamiento de este miembro del squad</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {prompts.map((prompt, index) => (
                              <div key={prompt.id} className="group relative bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-md transition-all duration-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                      <div className="flex items-center justify-center w-7 h-7 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs rounded-lg font-semibold">
                                        {index + 1}
                                      </div>
                                      <h6 className="font-semibold text-slate-900 dark:text-white">{prompt.title}</h6>
                                      
                                      <div className="flex items-center gap-2">
                                        {prompt.is_customized && (
                                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full font-medium">
                                            Personalizado
                                          </span>
                                        )}
                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full font-medium">
                                          {prompt.role}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <textarea
                                      value={prompt.content}
                                      onChange={(e) => updatePromptContent(selectedMemberForRoles, prompt.id, e.target.value)}
                                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-sm resize-vertical focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white transition-colors"
                                      rows={4}
                                      placeholder="Contenido del prompt..."
                                    />
                                  </div>
                                  
                                  <div className="flex flex-col gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => removePromptFromMember(selectedMemberForRoles, prompt.id)}
                                      className="flex items-center justify-center w-8 h-8 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                      title="Eliminar"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                                     {/* Mensaje informativo si no hay miembros adicionales */}
                   {squadMembers.filter((member) => member.id !== 'main-agent' && !member.id.startsWith('member-0')).length === 0 && (
                     <div className="text-center py-12">
                       <div className="flex items-center justify-center w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4">
                         <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                         </svg>
                       </div>
                       <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Sin miembros adicionales</p>
                       <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                         Ve a la sección "Transferencias" para agregar miembros al squad
                       </p>
                     </div>
                   )}

                                     {!selectedMemberForRoles && squadMembers.filter((member) => member.id !== 'main-agent' && !member.id.startsWith('member-0')).length > 0 && (
                     <div className="text-center py-12">
                       <div className="flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full mx-auto mb-4">
                         <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                         </svg>
                       </div>
                       <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Selecciona un miembro</p>
                       <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                         Elige un miembro del squad para editar sus prompts
                       </p>
                     </div>
                   )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SquadEditor;
