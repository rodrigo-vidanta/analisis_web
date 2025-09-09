import React, { useState, useEffect } from 'react';
import { supabaseMainAdmin } from '../config/supabase';
import type { AgentTemplate } from '../config/supabase';
// DeleteTemplateModal eliminado - funcionalidad integrada en TemplateManager

interface AgentCVProps {
  template: AgentTemplate;
  onBack: () => void;
  onDelete?: () => void;
}

const AgentCV: React.FC<AgentCVProps> = ({ template, onBack, onDelete }) => {
  const [agentPrompts, setAgentPrompts] = useState<any[]>([]);
  const [agentTools, setAgentTools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadAgentData();
  }, [template]);

  const loadAgentData = async () => {
    try {
      setIsLoading(true);

      // Cargar prompts del agente
      const { data: promptsData, error: promptsError } = await supabaseMainAdmin
        .from('agent_prompts')
        .select(`
          *,
          system_prompts(*)
        `)
        .eq('agent_template_id', template.id)
        .order('order_index', { ascending: true });

      if (promptsError) throw promptsError;

      // Cargar herramientas del agente
      const { data: toolsData, error: toolsError } = await supabaseMainAdmin
        .from('agent_tools')
        .select(`
          *,
          tools_catalog(*)
        `)
        .eq('agent_template_id', template.id);

      if (toolsError) throw toolsError;

      setAgentPrompts(promptsData || []);
      setAgentTools(toolsData || []);
    } catch (error) {
      console.error('Error loading agent data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getVapiConfigInfo = () => {
    const config = template.vapi_config;
    if (!config) return null;

    // Si es un squad, tomar la configuración del primer miembro
    if (config.squad && config.squad.members && config.squad.members.length > 0) {
      const firstMember = config.squad.members[0];
      const assistant = firstMember.assistant;
      
      return {
        model: assistant?.model?.model || 'No especificado',
        voice: assistant?.voice?.voiceId || 'No especificado',
        transcriber: assistant?.transcriber?.model || 'No especificado',
        firstMessage: assistant?.firstMessage || 'No especificado',
        maxDuration: assistant?.maxDurationSeconds || 'No especificado'
      };
    }

    // Si es configuración directa
    return {
      model: config.model?.model || 'No especificado',
      voice: config.voice?.voiceId || 'No especificado',
      transcriber: config.transcriber?.model || 'No especificado',
      firstMessage: config.firstMessage || 'No especificado',
      maxDuration: config.maxDurationSeconds || 'No especificado'
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Cargando CV del agente...</p>
        </div>
      </div>
    );
  }

  const vapiInfo = getVapiConfigInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {template.name}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {template.description}
            </p>
          </div>
          <div className="flex gap-3">
            {/* Por ahora mostramos el botón de eliminar para todas las plantillas */}
            {/* TODO: Filtrar por usuario cuando tengamos autenticación */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Eliminar
            </button>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Volver al Catálogo
            </button>
          </div>
        </div>

        {/* Información básica */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Categoría</h3>
            <p className="text-slate-600 dark:text-slate-400">
              {template.agent_categories?.name || 'Sin categoría'}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Tipo</h3>
            <p className="text-slate-600 dark:text-slate-400">
              {template.agent_type || 'No especificado'}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Dificultad</h3>
            <p className="text-slate-600 dark:text-slate-400">
              {template.difficulty || 'No especificada'}
            </p>
          </div>
        </div>
      </div>

      {/* Configuración VAPI */}
      {vapiInfo && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Configuración Técnica
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 dark:text-white mb-2">Modelo LLM</h4>
              <p className="text-slate-600 dark:text-slate-400">{vapiInfo.model}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 dark:text-white mb-2">Voz</h4>
              <p className="text-slate-600 dark:text-slate-400">{vapiInfo.voice}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 dark:text-white mb-2">Transcriber</h4>
              <p className="text-slate-600 dark:text-slate-400">{vapiInfo.transcriber}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 dark:text-white mb-2">Mensaje Inicial</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {vapiInfo.firstMessage.length > 100 
                  ? `${vapiInfo.firstMessage.substring(0, 100)}...` 
                  : vapiInfo.firstMessage}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 dark:text-white mb-2">Duración Máxima</h4>
              <p className="text-slate-600 dark:text-slate-400">{vapiInfo.maxDuration} segundos</p>
            </div>
          </div>
        </div>
      )}

      {/* Roles/Prompts */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Roles del Sistema ({agentPrompts.length})
        </h3>
        {agentPrompts.length > 0 ? (
          <div className="space-y-4">
            {agentPrompts.map((prompt, index) => (
              <div key={prompt.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-slate-900 dark:text-white">
                    {prompt.system_prompts?.name || `Rol ${index + 1}`}
                  </h4>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                    Orden {prompt.order_index}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  {prompt.custom_content || prompt.system_prompts?.content || 'Sin contenido'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">No hay roles configurados</p>
        )}
      </div>

      {/* Squad Information */}
      {template.vapi_config?.squad && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Squad ({template.vapi_config.squad.members?.length || 0} miembros)
          </h3>
          {template.vapi_config.squad.members && template.vapi_config.squad.members.length > 0 ? (
            <div className="space-y-4">
              {template.vapi_config.squad.members.map((member: any, index: number) => (
                <div key={index} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h4 className="font-medium text-slate-900 dark:text-white">
                      {member.name || `Miembro ${index + 1}`}
                    </h4>
                    <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                      Miembro {index + 1}
                    </span>
                  </div>
                  
                  {member.assistant?.model?.messages && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Roles del Sistema ({member.assistant.model.messages.length})
                      </h5>
                      <div className="space-y-2">
                        {member.assistant.model.messages.slice(0, 3).map((msg: any, msgIndex: number) => (
                          <div key={msgIndex} className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700 p-2 rounded border">
                            <span className="font-medium">Rol {msgIndex + 1}:</span> {msg.content?.substring(0, 100)}...
                          </div>
                        ))}
                        {member.assistant.model.messages.length > 3 && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                            ... y {member.assistant.model.messages.length - 3} roles más
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {member.assistant?.tools && (
                    <div>
                      <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Herramientas ({member.assistant.tools.length})
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {member.assistant.tools.map((tool: any, toolIndex: number) => (
                          <span key={toolIndex} className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                            {tool.name || tool.type || `Tool ${toolIndex + 1}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">No hay miembros en el squad</p>
          )}
        </div>
      )}

      {/* Herramientas */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Herramientas ({agentTools.length})
        </h3>
        {agentTools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentTools.map((tool) => (
              <div key={tool.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-slate-900 dark:text-white">
                    {tool.tools_catalog?.name || 'Herramienta sin nombre'}
                  </h4>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  {tool.tools_catalog?.description || 'Sin descripción'}
                </p>
                <div className="mt-2">
                  <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                    {tool.tools_catalog?.type || 'function'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">No hay herramientas configuradas</p>
        )}
      </div>

      {/* Tags y casos de uso */}
      {(template.keywords?.length > 0 || template.use_cases?.length > 0) && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Información Adicional
          </h3>
          
          {template.keywords?.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-slate-900 dark:text-white mb-2">Palabras Clave</h4>
              <div className="flex flex-wrap gap-2">
                {template.keywords.map((keyword, index) => (
                  <span key={index} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {template.use_cases?.length > 0 && (
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white mb-2">Casos de Uso</h4>
              <ul className="list-disc list-inside space-y-1">
                {template.use_cases.map((useCase, index) => (
                  <li key={index} className="text-slate-600 dark:text-slate-400 text-sm">
                    {useCase}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Delete Modal - Funcionalidad integrada en TemplateManager */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Eliminar Plantilla
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Esta funcionalidad se ha movido al gestor de plantillas principal.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentCV;
