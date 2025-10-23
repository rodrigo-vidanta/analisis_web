/**
 * ============================================
 * EDITOR DE AGENTES - MÓDULO PQNC HUMANS
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/admin/README_PQNC_HUMANS.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/admin/README_PQNC_HUMANS.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/admin/CHANGELOG_PQNC_HUMANS.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import React, { useState } from 'react';
import { type AgentTemplate } from '../../config/supabase';
import SystemMessageEditor from './SystemMessageEditor';
import ToolsSelector from './ToolsSelector';
import ParametersEditor from './ParametersEditor';
import SquadEditor from './SquadEditor';
import JsonOutput from './JsonOutput';
import { saveAgentPrompts, saveAgentTools, saveAgentVapiConfig, createAgentFromEditor, type SimpleMessage } from '../../services/supabaseService';
import { useAuth } from '../../contexts/AuthContext';

// Declaración global para el callback de squad
declare global {
  interface Window {
    squadConfigDetected?: (squadMembers: any[]) => void;
  }
}

interface AgentEditorProps {
  template: AgentTemplate;
  onBack: () => void;
}

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
}

interface ExtendedAgentTemplate extends AgentTemplate {
  systemMessages?: any[];
  defaultTools?: any[];
  defaultParameters?: any;
}

const AgentEditor: React.FC<AgentEditorProps> = ({ template, onBack }) => {
  const [activeTab, setActiveTab] = useState<'prompts' | 'tools' | 'parameters' | 'squads' | 'json'>('prompts');
  const [agentData, setAgentData] = useState<ExtendedAgentTemplate>({
    ...template,
    systemMessages: [],
    defaultTools: [],
    defaultParameters: {}
  });
  const [squadEnabled, setSquadEnabled] = useState(false);
  const [squadMembers, setSquadMembers] = useState<SquadMember[]>([]);
  const [squadConfigDetected, setSquadConfigDetected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastBuiltJson, setLastBuiltJson] = useState<any>(null);
  const [workingAgentId, setWorkingAgentId] = useState<string | null>(null); // draft agent id
  const { user } = useAuth();

  // Detectar automáticamente si el agente tiene configuración de squad
  React.useEffect(() => {
    const detectSquadConfig = async () => {
      if (!template.vapi_config) return;
      
      const jsonData = template.vapi_config;
      if (jsonData.squad && jsonData.squad.members && jsonData.squad.members.length > 0) {
        console.log('🔥 Squad detectado automáticamente en AgentEditor');
        setSquadEnabled(true);
        setSquadConfigDetected(true);
        
        // Configurar los miembros del squad
        const members = jsonData.squad.members.map((member: any, index: number) => {
          const memberData = member.assistant || member;
          const messages = memberData.model?.messages || [];
          console.log(`👤 Miembro ${index}:`, memberData.name, '- Mensajes:', messages.length);
          
          return {
            id: `member-${index}`,
            name: memberData.name || `Miembro ${index + 1}`,
            template: undefined, // Se configurará después
            transferConfig: {
              phoneNumber: '',
              extension: '',
              message: `Transferir a ${memberData.name}`,
              conditions: ['escalation', 'specific_request']
            },
            originalMessages: messages // Agregar mensajes originales
          };
        });
        
        setSquadMembers(members);
        console.log('👥 Miembros del squad configurados:', members.length);
        console.log('📋 Detalles de miembros:', members.map((m: any) => `${m.name}: ${m.originalMessages?.length || 0} mensajes`));
      }
    };
    
    detectSquadConfig();
  }, [template]);

  // Configurar callback global para detectar squad desde SystemMessageEditor
  React.useEffect(() => {
    window.squadConfigDetected = (squadMembers: any[]) => {
      console.log('🔔 Squad detectado desde SystemMessageEditor:', squadMembers.length);
      if (!squadConfigDetected) {
        setSquadEnabled(true);
        setSquadConfigDetected(true);
        
        const members = squadMembers.map((member: any, index: number) => {
          console.log(`🔔 Callback miembro ${index}:`, member.name, '- Mensajes:', member.messages?.length || 0);
          return {
            id: member.id || `member-${index}`,
            name: member.name || `Miembro ${index + 1}`,
            template: undefined,
            transferConfig: {
              phoneNumber: '',
              extension: '',
              message: `Transferir a ${member.name}`,
              conditions: ['escalation', 'specific_request']
            },
            originalMessages: member.messages || [] // Agregar mensajes originales
          };
        });
        
        setSquadMembers(members);
        console.log('🔔 Miembros actualizados desde callback:', members.map((m: any) => `${m.name}: ${m.originalMessages?.length || 0} mensajes`));
      }
    };
    
    return () => {
      delete window.squadConfigDetected;
    };
  }, [squadConfigDetected]);

  const tabs = [
    {
      id: 'prompts',
      name: 'Prompts del Sistema',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      description: 'Personaliza la identidad y flujos de conversación'
    },
    {
      id: 'tools',
      name: 'Herramientas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 8.172V5L8 4z" />
        </svg>
      ),
      description: 'Selecciona y configura las funciones del agente'
    },
    {
      id: 'parameters',
      name: 'Parámetros',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      ),
      description: 'Ajusta configuraciones de voz, modelo y comportamiento'
    },
    {
      id: 'squads',
      name: 'Squads',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      description: 'Configura agentes especializados en equipo'
    },
    {
      id: 'json',
      name: 'JSON Final',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      description: 'Revisa y exporta la configuración completa'
    }
  ];

  const updateAgentData = (updates: Partial<ExtendedAgentTemplate>) => {
    setAgentData(prev => ({ ...prev, ...updates }));
  };

  // Construir JSON final tomando en cuenta parámetros, prompts, tools y squad
  const buildVapiConfig = (): any => {
    const params = agentData.defaultParameters || {};
    const messages = (agentData.systemMessages || []) as SimpleMessage[];
    const tools = (agentData.defaultTools || []).map((t: any) => {
      // Mapear herramientas a forma simple
      if (t.tool_type === 'transferCall') {
        return {
          type: 'transferCall',
          parameters: {
            destination: t.customConfig?.destination || { type: 'phone', value: '' },
            extension: t.customConfig?.extension || '',
            message: t.customConfig?.message || ''
          }
        };
      }
      if (t.tool_type === 'endCall') {
        return {
          type: 'endCall',
          parameters: {
            message: params?.behavior?.endCallMessage || 'Gracias por tu llamada.'
          }
        };
      }
      return {
        type: 'function',
        name: t.name,
        config: t.customConfig || {}
      };
    });

    if (squadEnabled && squadMembers.length > 0) {
      return {
        squad: {
          name: agentData.name || 'Squad',
          members: squadMembers.map((m) => ({
            assistant: {
              name: m.name,
              model: {
                messages: (m as any).originalMessages || []
              }
            }
          }))
        },
        tools,
        parameters: params
      };
    }

    return {
      assistant: {
        name: agentData.name,
        model: {
          messages
        }
      },
      tools,
      parameters: params
    };
  };

  const saveAllChanges = async () => {
    setIsSaving(true);
    try {
      // Guardado tradicional sobre plantilla (modo legacy). No recomendado para flujos nuevos.
      const messages = (agentData.systemMessages || []) as SimpleMessage[];
      await saveAgentPrompts(template.id, messages);
      await saveAgentTools(template.id, (agentData as any).defaultTools || []);
      const built = buildVapiConfig();
      setLastBuiltJson(built);
      await saveAgentVapiConfig(template.id, built);
    } catch (err) {
      console.error('❌ Error guardando cambios:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Guardar como borrador: crear o actualizar un agente propio sin tocar la plantilla base
  const saveAsDraft = async () => {
    if (!user) {
      console.warn('No user in context');
      return;
    }
    setIsSaving(true);
    try {
      const built = buildVapiConfig();
      setLastBuiltJson(built);

      // Crear borrador si no existe
      if (!workingAgentId) {
        const payload = {
          name: `${agentData.name} (Borrador)`,
          description: agentData.description || '',
          category_id: typeof agentData.category === 'string' ? agentData.category : agentData.category_id,
          difficulty: agentData.difficulty,
          estimated_time: agentData.estimated_time || '',
          keywords: agentData.keywords || [],
          use_cases: agentData.use_cases || [],
          agent_type: (agentData as any).agent_type || 'inbound',
          vapi_config: built
        } as any;

        const created = await createAgentFromEditor(payload, user.id, { draft: true, isPublic: false });
        setWorkingAgentId(created.id);

        // Guardar prompts y tools del borrador
        const messages = (agentData.systemMessages || []) as SimpleMessage[];
        await saveAgentPrompts(created.id, messages);
        await saveAgentTools(created.id, (agentData as any).defaultTools || []);
      } else {
        // Actualizar borrador existente
        await saveAgentVapiConfig(workingAgentId, built);
        const messages = (agentData.systemMessages || []) as SimpleMessage[];
        await saveAgentPrompts(workingAgentId, messages);
        await saveAgentTools(workingAgentId, (agentData as any).defaultTools || []);
      }
    } catch (err) {
      console.error('❌ Error guardando borrador:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Generar agente final (aparece en plantillas generales y en "Mis agentes")
  const generateAgent = async () => {
    if (!user) {
      console.warn('No user in context');
      return;
    }
    setIsSaving(true);
    try {
      const built = buildVapiConfig();
      setLastBuiltJson(built);

      const payload = {
        name: agentData.name,
        description: agentData.description || '',
        category_id: typeof agentData.category === 'string' ? agentData.category : agentData.category_id,
        difficulty: agentData.difficulty,
        estimated_time: agentData.estimated_time || '',
        keywords: agentData.keywords || [],
        use_cases: agentData.use_cases || [],
        agent_type: (agentData as any).agent_type || 'inbound',
        vapi_config: built
      } as any;

      const created = await createAgentFromEditor(payload, user.id, { draft: false, isPublic: true });
      // Guardar prompts y tools
      const messages = (agentData.systemMessages || []) as SimpleMessage[];
      await saveAgentPrompts(created.id, messages);
      await saveAgentTools(created.id, (agentData as any).defaultTools || []);
    } catch (err) {
      console.error('❌ Error generando agente:', err);
    } finally {
      setIsSaving(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header con navegación de regreso */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Volver al Dashboard</span>
            </button>
            
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-600"></div>
            
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {agentData.name}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                {agentData.description}
              </p>
            </div>
          </div>

          {/* Indicadores de progreso */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Auto-guardado</span>
            </div>
            
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Tiempo estimado: {agentData.estimated_time}
            </div>
          </div>
        </div>

        {/* Navegación por tabs */}
        <div className="glass-card mb-6">
          <div className="border-b border-slate-200 dark:border-slate-700">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
          
          {/* Descripción del tab activo */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
        </div>

        {/* Contenido del tab activo */}
        <div className="space-y-6">
          {activeTab === 'prompts' && (
            <SystemMessageEditor
              systemMessages={agentData.systemMessages || []}
              onUpdate={(messages: any[]) => updateAgentData({ systemMessages: messages })}
              agentTemplateId={template.id}
            />
          )}
          
          {activeTab === 'tools' && (
            <ToolsSelector
              selectedTools={agentData.defaultTools || []}
              category={typeof agentData.category === 'string' ? agentData.category : agentData.category?.name || ''}
              onUpdate={(tools: any[]) => updateAgentData({ defaultTools: tools })}
              squadMembers={squadMembers}
              squadEnabled={squadEnabled}
            />
          )}
          
          {activeTab === 'parameters' && (
            <ParametersEditor
              parameters={agentData.defaultParameters}
              onUpdate={(parameters: any) => updateAgentData({ defaultParameters: parameters })}
              squadEnabled={squadEnabled}
            />
          )}

          {activeTab === 'squads' && (
                        <SquadEditor 
              isEnabled={squadEnabled}
              onToggle={setSquadEnabled}
              squadMembers={squadMembers}
              onSquadChange={setSquadMembers}
              mainAgentTemplate={template}
              mainAgentPrompts={agentData.systemMessages}
            />
          )}
          
          {activeTab === 'json' && (
            <JsonOutput
              agentData={agentData}
              builtJson={lastBuiltJson || buildVapiConfig()}
              onExport={() => {
                const blob = new Blob([
                  JSON.stringify(lastBuiltJson || buildVapiConfig(), null, 2)
                ], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${agentData.slug || agentData.name || 'agent'}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            />
          )}
        </div>

        {/* Barra de acciones flotante */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="glass-card px-6 py-3 shadow-xl">
            <div className="flex items-center space-x-4">
              <button
                onClick={async () => { try { await saveAsDraft(); } catch {} }}
                disabled={isSaving}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-60"
              >
                {isSaving ? 'Guardando...' : 'Guardar como Borrador'}
              </button>
              
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>

              <button
                onClick={async () => { try { await generateAgent(); setActiveTab('json'); } catch {} }}
                disabled={isSaving}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60"
              >
                {isSaving ? 'Generando...' : 'Generar Agente'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentEditor;
