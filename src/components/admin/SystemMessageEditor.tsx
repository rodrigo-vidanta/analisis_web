import React, { useState, useEffect } from 'react';
import { supabaseMainAdmin as supabaseAdmin } from '../../config/supabase';

interface SystemPrompt {
  id: string;
  title: string;
  content: string;
  role: 'system' | 'user' | 'assistant';
  category: string;
  prompt_type: string;
  is_required: boolean;
  order_priority: number;
  variables: string[];
  is_customized?: boolean;
  custom_content?: string;
  order_index?: number;
  context_tags?: string[];
}

interface SquadConfig {
  name: string;
  isMainAgent: boolean;
  squadMembers: string[];
  transferRules: {
    conditions: string[];
    targetAgent: string;
    message: string;
  }[];
}

interface SystemMessageEditorProps {
  systemMessages: any[];
  onUpdate: (messages: any[]) => void;
  agentTemplateId?: string; // ID del agente para cargar solo sus prompts
}

const SystemMessageEditor: React.FC<SystemMessageEditorProps> = ({ systemMessages, onUpdate, agentTemplateId }) => {
  const [availablePrompts, setAvailablePrompts] = useState<SystemPrompt[]>([]);
  const [selectedPrompts, setSelectedPrompts] = useState<SystemPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isInitialized, setIsInitialized] = useState(false); // Para evitar loops
  const [squadConfig, setSquadConfig] = useState<SquadConfig | null>(null);
  const [showSquadConfig, setShowSquadConfig] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all'|'system'|'user'|'assistant'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPromptData, setNewPromptData] = useState<{title:string; role:'system'|'user'|'assistant'; content:string}>({
    title: 'Nuevo Prompt',
    role: 'system',
    content: ''
  });

  useEffect(() => {
    if (agentTemplateId) {
      setIsInitialized(false); // Resetear bandera cuando cambia el agente
      loadAvailablePrompts();
      detectSquadConfiguration();
    }
  }, [agentTemplateId]); // Solo cuando cambia el agente, NO systemMessages

  useEffect(() => {
    if (agentTemplateId && !isInitialized) {
      initializeSelectedPrompts();
    }
  }, [agentTemplateId, isInitialized]); // Solo cuando cambia el agente y no está inicializado

  const detectSquadConfiguration = async () => {
    if (!agentTemplateId) return;
    
    try {
      // Obtener el agente completo para revisar el JSON original
      const { data: agent, error } = await supabaseAdmin
        .from('agent_templates')
        .select('vapi_config')
        .eq('id', agentTemplateId)
        .maybeSingle();
      
      if (error || !agent?.vapi_config) {
        console.log('No se pudo obtener configuración del agente');
        return;
      }
      
      const jsonData = agent.vapi_config;
      
      // Detectar si es parte de un squad
      if (jsonData.squad && jsonData.squad.members && jsonData.squad.members.length > 0) {
        const squad = jsonData.squad;
        const squadMembers = squad.members?.map((member: any, index: number) => {
          const memberData = member.assistant || member;
          const messages = memberData.model?.messages || [];
          console.log(`🔍 SystemMessageEditor - Miembro ${index}:`, memberData.name, '- Mensajes:', messages.length);
          
          return {
            id: `member-${index}`,
            name: memberData.name || `Miembro ${index + 1}`,
            isMainAgent: index === 0,
            messages: messages
          };
        }) || [];
        
        console.log('🔍 Squad detectado:', {
          name: squad.name,
          members: squadMembers.length,
          mainAgent: squadMembers[0]?.name
        });
        console.log('🔍 Mensajes por miembro:', squadMembers.map((m: any) => `${m.name}: ${m.messages.length} mensajes`));
        
        setSquadConfig({
          name: squad.name || 'Squad sin nombre',
          isMainAgent: true,
          squadMembers: squadMembers.map((m: any) => m.name),
          transferRules: []
        });
        setShowSquadConfig(true);
        
        // Notificar al componente padre sobre la configuración de squad
        if (window.squadConfigDetected) {
          window.squadConfigDetected(squadMembers);
        }
      } else {
        setSquadConfig(null);
        setShowSquadConfig(false);
      }
    } catch (error) {
      console.error('Error detectando configuración de squad:', error);
    }
  };

  const loadAvailablePrompts = async () => {
    try {
      setIsLoading(true);
      
      if (agentTemplateId) {
        // Cargar prompts del agente específico usando la tabla de unión
        console.log('🔍 Cargando prompts para agente:', agentTemplateId);
        const { data, error } = await supabaseAdmin
          .from('agent_prompts')
          .select(`
            *,
            system_prompts:system_prompt_id (
              id,
              title,
              content,
              role,
              category,
              prompt_type,
              keywords,
              applicable_categories,
              context_tags,
              order_priority,
              is_required,
              is_editable,
              variables
            )
          `)
          .eq('agent_template_id', agentTemplateId)
          .order('order_index');
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error loading agent prompts:', error);
          setAvailablePrompts([]);
          setIsLoading(false);
          return;
        }
        
        // Transformar los datos para que coincidan con la interfaz esperada
        const transformedPrompts = (data || []).map(item => ({
          ...item.system_prompts,
          is_customized: item.is_customized,
          custom_content: item.custom_content,
          order_index: item.order_index
        }));
        
        console.log('📝 Prompts del agente cargados:', transformedPrompts.length);
        
        // Si hay configuración de squad, organizar los prompts por miembro
        if (squadConfig && squadConfig.squadMembers.length > 0) {
          console.log('🔍 Organizando prompts por miembro del squad');
          // Los prompts ya están organizados por el orden de importación
          // El primer miembro tiene los primeros prompts, el segundo los siguientes, etc.
          setAvailablePrompts(transformedPrompts);
        } else {
          setAvailablePrompts(transformedPrompts);
        }
        setIsLoading(false);
        return;
      }
      
      // Si no hay agente específico, cargar todos los prompts genéricos
      const { data, error } = await supabaseAdmin
        .from('system_prompts')
        .select('*')
        .is('agent_template_id', null) // Solo prompts genéricos
        .order('order_priority');
      
      if (error) {
        console.error('Error loading generic prompts:', error);
        // Si no hay datos en la BD, crear algunos prompts de ejemplo
        createSamplePrompts();
        return;
      }
      
      if (!data || data.length === 0) {
        console.log('No prompts found in database, creating samples...');
        createSamplePrompts();
        return;
      }
      
      setAvailablePrompts(data);
    } catch (error) {
      console.error('Error loading prompts:', error);
      createSamplePrompts();
    } finally {
      setIsLoading(false);
    }
  };

  const createSamplePrompts = async () => {
    const samplePrompts = [
      {
        title: 'Identidad Base',
        content: 'Eres un asistente virtual profesional y amigable.',
        role: 'system',
        category: 'identity',
        prompt_type: 'base',
        order_priority: 1,
        is_required: true,
        is_editable: true,
        variables: [],
        applicable_categories: ['general'],
        context_tags: ['identity'],
        language: 'es',
        tested_scenarios: ['general'],
        performance_notes: 'Prompt base para identidad del agente'
      },
      {
        title: 'Comportamiento Conversacional',
        content: 'Mantén un tono profesional pero cálido. Haz preguntas de seguimiento cuando sea necesario.',
        role: 'system',
        category: 'behavior',
        prompt_type: 'instruction',
        order_priority: 2,
        is_required: false,
        is_editable: true,
        variables: [],
        applicable_categories: ['general'],
        context_tags: ['behavior'],
        language: 'es',
        tested_scenarios: ['conversational'],
        performance_notes: 'Mejora la naturalidad de la conversación'
      }
    ];

    try {
      const { data, error } = await supabaseAdmin
        .from('system_prompts')
        .insert(samplePrompts)
        .select();
      
      if (error) {
        console.error('Error creating sample prompts:', error);
        // Si falla, usar prompts locales
        setAvailablePrompts(samplePrompts.map((prompt, index) => ({
          ...prompt,
          id: `sample-${index}`,
          role: prompt.role as 'system' | 'user' | 'assistant',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })));
      } else {
        setAvailablePrompts(data || []);
      }
    } catch (error) {
      console.error('Error creating sample prompts:', error);
      // Fallback a prompts locales
      setAvailablePrompts(samplePrompts.map((prompt, index) => ({
        ...prompt,
        id: `sample-${index}`,
        role: prompt.role as 'system' | 'user' | 'assistant',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })));
    }
  };

  const initializeSelectedPrompts = async () => {
    if (!agentTemplateId) {
      // Si no hay agente específico, usar systemMessages existentes
      if (systemMessages && systemMessages.length > 0) {
        const prompts = systemMessages.map((msg, index) => ({
          id: `temp-${index}`,
          title: `Prompt ${index + 1}`,
          content: msg.content || '',
          role: msg.role || 'system',
          category: 'imported',
          prompt_type: 'custom',
          is_required: false,
          order_priority: index,
          variables: [],
          is_customized: true,
          custom_content: msg.content || '',
          order_index: index
        }));
        setSelectedPrompts(prompts);
      }
      return;
    }
    
    try {
      console.log('🔄 Inicializando prompts seleccionados para agente:', agentTemplateId);
      
      // Primero verificar si el agente tiene configuración de squad
      const { data: agent, error: agentError } = await supabaseAdmin
        .from('agent_templates')
        .select('vapi_config')
        .eq('id', agentTemplateId)
        .maybeSingle();
      
      if (agentError || !agent?.vapi_config) {
        console.log('No se pudo obtener configuración del agente para prompts');
        setSelectedPrompts([]);
        onUpdate([]);
        setIsInitialized(true);
        return;
      }
      
      const jsonData = agent.vapi_config;
      let messagesToLoad = [];
      
      // Si es un squad, solo cargar los mensajes del primer miembro (agente principal)
      if (jsonData.squad && jsonData.squad.members && jsonData.squad.members.length > 0) {
        const firstMember = jsonData.squad.members[0];
        const memberData = firstMember.assistant || firstMember;
        messagesToLoad = memberData.model?.messages || [];
        console.log('📝 Cargando prompts del agente principal del squad:', memberData.name, '- Prompts:', messagesToLoad.length);
      } else {
        // Si no es squad, cargar desde la base de datos normal
        const { data, error } = await supabaseAdmin
          .from('agent_prompts')
          .select(`
            *,
            system_prompts:system_prompt_id (
              id,
              title,
              content,
              role,
              category,
              prompt_type,
              keywords,
              applicable_categories,
              context_tags,
              order_priority,
              is_required,
              is_editable,
              variables
            )
          `)
          .eq('agent_template_id', agentTemplateId)
          .order('order_index');
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error loading selected prompts:', error);
          setSelectedPrompts([]);
          onUpdate([]);
          setIsInitialized(true);
          return;
        }
        
        // Transformar los datos
        const transformedPrompts = (data || []).map(item => ({
          ...item.system_prompts,
          is_customized: item.is_customized,
          custom_content: item.custom_content,
          order_index: item.order_index
        }));
        
        setSelectedPrompts(transformedPrompts);
        setIsInitialized(true);
        
        if (transformedPrompts.length > 0) {
          const messages = transformedPrompts.map(prompt => ({
            role: prompt.role,
            content: prompt.custom_content || prompt.content
          }));
          onUpdate(messages);
        } else {
          onUpdate([]);
        }
        return;
      }
      
      // Procesar mensajes del squad (solo el primer miembro)
      if (messagesToLoad.length > 0) {
        const prompts = messagesToLoad.map((msg: any, index: number) => ({
          id: `squad-${index}`,
          title: `Prompt ${index + 1}`,
          content: msg.content || '',
          role: (msg.role || 'system') as 'system' | 'user' | 'assistant',
          category: 'squad',
          prompt_type: 'imported',
          is_required: false,
          order_priority: index,
          variables: [],
          is_customized: true,
          custom_content: msg.content || '',
          order_index: index
        }));
        
        console.log('✅ Prompts del agente principal inicializados:', prompts.length);
        setSelectedPrompts(prompts);
        
        const messages = prompts.map((prompt: any) => ({
          role: prompt.role,
          content: prompt.custom_content || prompt.content
        }));
        onUpdate(messages);
      } else {
        console.log('⚠️ No se encontraron prompts para el agente principal');
        setSelectedPrompts([]);
        onUpdate([]);
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing selected prompts:', error);
      setSelectedPrompts([]);
      onUpdate([]);
      setIsInitialized(true);
    }
  };

  const addPrompt = (prompt: SystemPrompt) => {
    const newPrompts = [...selectedPrompts, { 
      ...prompt, 
      order_index: selectedPrompts.length,
      is_customized: false 
    }];
    setSelectedPrompts(newPrompts);
    updateMessages(newPrompts);
  };

  const removePrompt = (promptId: string) => {
    const newPrompts = selectedPrompts.filter(p => p.id !== promptId);
    // Reindexar
    newPrompts.forEach((prompt, index) => {
      prompt.order_index = index;
    });
    setSelectedPrompts(newPrompts);
    updateMessages(newPrompts);
  };

  const movePrompt = (fromIndex: number, toIndex: number) => {
    const newPrompts = [...selectedPrompts];
    const [movedPrompt] = newPrompts.splice(fromIndex, 1);
    newPrompts.splice(toIndex, 0, movedPrompt);
    
    // Actualizar order_index
    newPrompts.forEach((prompt, index) => {
      prompt.order_index = index;
    });
    
    setSelectedPrompts(newPrompts);
    updateMessages(newPrompts);
  };

  const updatePromptContent = (promptId: string, newContent: string) => {
    const newPrompts = selectedPrompts.map(p => 
      p.id === promptId 
        ? { ...p, content: newContent, is_customized: true, custom_content: newContent }
        : p
    );
    setSelectedPrompts(newPrompts);
    updateMessages(newPrompts);
  };

  const updateMessages = (prompts: SystemPrompt[]) => {
    const messages = prompts.map(p => ({
      role: p.role,
      content: p.is_customized ? (p.custom_content || p.content) : p.content
    }));
    
    onUpdate(messages);
  };

  const filteredPrompts = availablePrompts.filter(prompt => {
    const matchesSearch = prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory;
    const notSelected = !selectedPrompts.find(sp => sp.id === prompt.id);
    const matchesRole = roleFilter === 'all' || prompt.role === roleFilter;
    
    return matchesSearch && matchesCategory && notSelected && matchesRole;
  });

  const categories = [
    { value: 'all', label: 'Todas las categorías' },
    { value: 'identity', label: 'Identidad' },
    { value: 'behavior', label: 'Comportamiento' },
    { value: 'context', label: 'Contexto' },
    { value: 'instructions', label: 'Instrucciones' },
    { value: 'security', label: 'Seguridad' },
    { value: 'vocalization', label: 'Vocalización' }
  ];

  if (isLoading) {
    return (
      <div className="glass-card p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-slate-600 dark:text-slate-400">Cargando configuración...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header mejorado */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Prompts del Sistema
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Personaliza la identidad y flujos de conversación de tu agente
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Filtro por rol */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-1 flex">
              {(['all','system','user','assistant'] as const).map(r => (
                <button key={r}
                  onClick={()=>setRoleFilter(r)}
                  className={`px-3 py-1 rounded-md text-sm ${roleFilter===r?'bg-indigo-600 text-white':'text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >{r==='all'?'Todos':r}</button>
              ))}
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm hover:from-indigo-600 hover:to-purple-700"
            >
              Nuevo prompt
            </button>
            {squadConfig && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-200/50 dark:border-purple-500/30">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  Squad: {squadConfig.name}
                </span>
              </div>
              <button
                onClick={() => setShowSquadConfig(!showSquadConfig)}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title={showSquadConfig ? "Ocultar configuración de squad" : "Mostrar configuración de squad"}
              >
                <svg className={`w-4 h-4 transition-transform ${showSquadConfig ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>)}
          </div>
        </div>

        {/* Squad Configuration Panel */}
        {squadConfig && showSquadConfig && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-lg border border-blue-200/50 dark:border-purple-500/30">
            <div className="flex items-center space-x-2 mb-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="font-medium text-slate-900 dark:text-white">Configuración del Squad Principal</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Nombre:</span>
                <p className="text-slate-600 dark:text-slate-400">{squadConfig.name}</p>
              </div>
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Miembros:</span>
                <p className="text-slate-600 dark:text-slate-400">{squadConfig.squadMembers.length} agentes</p>
              </div>
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Rol:</span>
                <p className="text-slate-600 dark:text-slate-400">Agente Principal</p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-blue-100/50 dark:bg-slate-800/50 rounded border border-blue-200/30 dark:border-slate-600">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                ℹ️ Esta es la configuración del squad principal. Para editar miembros adicionales y reglas de transferencia, ve a la pestaña "Squads".
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Prompts Configurados */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                Prompts Configurados
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selectedPrompts.length} prompts activos
              </p>
            </div>
          </div>
          
          {selectedPrompts.length > 0 && (
            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span>Arrastra para reordenar</span>
            </div>
          )}
        </div>
        
        {selectedPrompts.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center justify-center w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4">
              <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-2 font-medium">No hay prompts configurados</p>
            <p className="text-sm text-slate-500 dark:text-slate-500">Agrega prompts desde el catálogo para comenzar</p>
          </div>
        ) : (
          <div className="space-y-6">
            {squadConfig && squadConfig.squadMembers.length > 0 ? (
              // Mostrar prompts organizados por miembro del squad
              squadConfig.squadMembers.map((memberName, memberIndex) => {
                // Calcular el rango de prompts para este miembro
                const promptsPerMember = Math.ceil(selectedPrompts.length / squadConfig.squadMembers.length);
                const startIndex = memberIndex * promptsPerMember;
                const endIndex = Math.min(startIndex + promptsPerMember, selectedPrompts.length);
                const memberPrompts = selectedPrompts.slice(startIndex, endIndex).filter(p => roleFilter === 'all' || p.role === roleFilter);
                
                if (memberPrompts.length === 0) return null;
                
                return (
                  <div key={memberIndex} className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-white text-xs ${
                        memberIndex === 0 ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gradient-to-r from-green-500 to-emerald-600'
                      }`}>
                        {memberIndex + 1}
                      </div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {memberName} ({memberPrompts.length} roles)
                      </h4>
                      {memberIndex > 0 && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                          Auto-detectado
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      {memberPrompts.map((prompt, promptIndex) => (
                        <div key={prompt.id} className="group relative bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-md transition-all duration-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center justify-center w-7 h-7 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-lg font-semibold">
                                  {startIndex + promptIndex + 1}
                                </div>
                                <h5 className="font-semibold text-slate-900 dark:text-white">{prompt.title}</h5>
                                
                                <div className="flex items-center gap-2">
                                  {prompt.is_required && (
                                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full font-medium">
                                      Requerido
                                    </span>
                                  )}
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
                                value={prompt.is_customized ? (prompt.custom_content || prompt.content) : prompt.content}
                                onChange={(e) => updatePromptContent(prompt.id, e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-sm resize-vertical focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white transition-colors"
                                rows={4}
                                placeholder="Contenido del prompt..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              // Mostrar prompts normalmente (sin squad)
              selectedPrompts.filter(p=> roleFilter==='all' || p.role===roleFilter).map((prompt, index) => (
              <div key={prompt.id} className="group relative bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center justify-center w-7 h-7 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-lg font-semibold">
                        {index + 1}
                      </div>
                      <h5 className="font-semibold text-slate-900 dark:text-white">{prompt.title}</h5>
                      {prompt.context_tags?.find(t=>t.startsWith('member:')) && (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">{prompt.context_tags.find(t=>t.startsWith('member:'))?.replace('member:','Miembro: ')}</span>
                      )}
                      
                      <div className="flex items-center gap-2">
                        {prompt.is_required && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full font-medium">
                            Requerido
                          </span>
                        )}
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
                      value={prompt.is_customized ? (prompt.custom_content || prompt.content) : prompt.content}
                      onChange={(e) => updatePromptContent(prompt.id, e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-sm resize-vertical focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white transition-colors"
                      rows={4}
                      placeholder="Contenido del prompt..."
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    {index > 0 && (
                      <button
                        onClick={() => movePrompt(index, index - 1)}
                        className="flex items-center justify-center w-8 h-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Mover arriba"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                    )}
                    {index < selectedPrompts.length - 1 && (
                      <button
                        onClick={() => movePrompt(index, index + 1)}
                        className="flex items-center justify-center w-8 h-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Mover abajo"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => removePrompt(prompt.id)}
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
            ))
            )}
          </div>
        )}
      </div>

      {/* Catálogo de Prompts */}
      <div className="glass-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
              Catálogo de Prompts
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {availablePrompts.length} prompts disponibles
            </p>
          </div>
        </div>
        
        {/* Filtros mejorados */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white transition-colors"
            />
          </div>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white transition-colors appearance-none"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Lista de Prompts Disponibles mejorada */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredPrompts.map(prompt => (
            <div key={prompt.id} className="group bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h5 className="font-semibold text-slate-900 dark:text-white">{prompt.title}</h5>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full font-medium">
                      {prompt.category}
                    </span>
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full font-medium">
                      {prompt.role}
                    </span>
                    {prompt.is_required && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full font-medium">
                        Requerido
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                    {prompt.content.length > 150 
                      ? `${prompt.content.substring(0, 150)}...` 
                      : prompt.content
                    }
                  </p>
                  {prompt.variables.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Variables:</span>
                      {prompt.variables.map((variable, index) => (
                        <span key={`${prompt.id}-${variable}-${index}`} className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded font-medium">
                          {variable}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => addPrompt(prompt)}
                  className="ml-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 text-sm font-medium transition-all duration-200 transform group-hover:scale-105"
                >
                  <span className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Agregar</span>
                  </span>
                </button>
              </div>
            </div>
          ))}
          
          {filteredPrompts.length === 0 && (
            <div className="text-center py-12">
              <div className="flex items-center justify-center w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">No se encontraron prompts</p>
              <p className="text-sm text-slate-500 dark:text-slate-500">Intenta cambiar los criterios de búsqueda</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear Prompt */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-slate-900">Nuevo prompt</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                <input className="w-full px-3 py-2 border rounded-md" value={newPromptData.title} onChange={e=>setNewPromptData({...newPromptData,title:e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                  <select className="w-full px-3 py-2 border rounded-md" value={newPromptData.role} onChange={e=>setNewPromptData({...newPromptData,role:e.target.value as any})}>
                    <option value="system">system</option>
                    <option value="user">user</option>
                    <option value="assistant">assistant</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contenido</label>
                <textarea className="w-full px-3 py-2 border rounded-md" rows={6} value={newPromptData.content} onChange={e=>setNewPromptData({...newPromptData,content:e.target.value})} />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button className="px-4 py-2 bg-slate-100 rounded-md" onClick={()=>setShowCreateModal(false)}>Cancelar</button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-md" onClick={() => { if(newPromptData.content.trim()) { const np = { id: `temp-${Date.now()}`, title: newPromptData.title.trim()||'Nuevo Prompt', content: newPromptData.content, role: newPromptData.role, category: 'custom', prompt_type: 'custom', is_required: false, order_priority: (selectedPrompts.length + 1), variables: [], is_customized: true, custom_content: newPromptData.content, order_index: selectedPrompts.length } as any; const list = [...selectedPrompts, np]; setSelectedPrompts(list); updateMessages(list); setShowCreateModal(false);} else { alert('Contenido requerido'); } }}>Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemMessageEditor;
