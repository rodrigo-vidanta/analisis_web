// Modal de edición de squads con gestión completa de roles y transferencias
// Identificación clara de roles por squad y manejo de tools

import React, { useState, useEffect } from 'react';
import { useAgentStudio } from '../../hooks/useAgentStudio';
import type { AgentTemplate, SquadMember, Tool } from '../../services/agentStudioService';

interface SquadEditorModalProps {
  squad: AgentTemplate | null; // null para crear nuevo
  onClose: () => void;
  onCreate?: (squad: Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<AgentTemplate>;
  onUpdate?: (updates: Partial<AgentTemplate>) => Promise<AgentTemplate>;
}

const SquadEditorModal: React.FC<SquadEditorModalProps> = ({
  squad,
  onClose,
  onCreate,
  onUpdate
}) => {
  const { tools, getReusableTools } = useAgentStudio();
  const isEditing = !!squad;

  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'custom',
    keywords: [] as string[],
    use_cases: [] as string[],
    members: [] as SquadMember[]
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'tools'>('info');
  const [selectedMember, setSelectedMember] = useState<SquadMember | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);

  useEffect(() => {
    if (squad && squad.squad_config) {
      setFormData({
        name: squad.name,
        description: squad.description,
        category: squad.category,
        keywords: squad.keywords,
        use_cases: squad.use_cases,
        members: squad.squad_config.members
      });
    }
  }, [squad]);

  // Manejadores de eventos
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const squadData: Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at'> = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        keywords: formData.keywords,
        use_cases: formData.use_cases,
        is_squad: true,
        squad_config: {
          name: formData.name,
          description: formData.description,
          members: formData.members
        },
        tools: getAllSquadTools(),
        created_by: '', // Se asigna en el hook
        usage_count: squad?.usage_count || 0,
        success_rate: squad?.success_rate || 0,
        is_active: true
      };

      if (isEditing && onUpdate) {
        await onUpdate(squadData);
      } else if (onCreate) {
        await onCreate(squadData);
      }

      onClose();
    } catch (error) {
      alert('Error al guardar squad: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const getAllSquadTools = (): Tool[] => {
    const toolNames = new Set<string>();
    formData.members.forEach(member => {
      member.tools.forEach(toolName => toolNames.add(toolName));
    });

    return tools.filter(tool => toolNames.has(tool.name));
  };

  const handleAddMember = () => {
    const newMember: SquadMember = {
      id: `member_${Date.now()}`,
      name: `Agente ${formData.members.length + 1}`,
      role: 'Asistente',
      description: '',
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
      },
      system_prompts: ['Eres un asistente virtual especializado.'],
      tools: [],
      destinations: []
    };

    setFormData(prev => ({
      ...prev,
      members: [...prev.members, newMember]
    }));
  };

  const handleEditMember = (member: SquadMember) => {
    setSelectedMember(member);
    setShowMemberModal(true);
  };

  const handleDeleteMember = (memberId: string) => {
    if (!confirm('¿Estás seguro de eliminar este miembro del squad?')) return;

    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== memberId)
    }));
  };

  const handleUpdateMember = (updatedMember: SquadMember) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === updatedMember.id ? updatedMember : m)
    }));
    setShowMemberModal(false);
    setSelectedMember(null);
  };

  const categories = ['custom', 'ventas', 'soporte', 'atencion', 'marketing', 'otros'];
  const reusableTools = getReusableTools();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEditing ? 'Editar Squad' : 'Crear Nuevo Squad'}
          </h2>
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

        <form onSubmit={handleSubmit}>
          <div className="flex">
            {/* Sidebar de navegación */}
            <div className="w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
              <div className="p-4 space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'info'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  📋 Información General
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('members')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'members'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  👥 Miembros ({formData.members.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tools')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'tools'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  🛠️ Tools ({getAllSquadTools().length})
                </button>
              </div>
            </div>

            {/* Contenido principal */}
            <div className="flex-1 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="p-6">
                {/* Tab: Información General */}
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        Información del Squad
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Nombre del Squad *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ej: Squad Atención al Cliente"
                          />
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
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Descripción
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Describe el propósito y funcionalidad del squad..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
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
                            placeholder="ventas, atención, soporte, multi-agente"
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
                            placeholder="Atención 24/7, Escalamiento, Especialización"
                          />
                          <p className="text-xs text-slate-500 mt-1">Separar con comas</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">💡 ¿Qué es un Squad?</h4>
                      <p className="text-blue-800 dark:text-blue-400 text-sm">
                        Un Squad es un equipo de agentes especializados que trabajan en conjunto. Cada miembro tiene un rol específico 
                        y pueden transferirse llamadas entre ellos para brindar la mejor atención posible.
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab: Miembros */}
                {activeTab === 'members' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Miembros del Squad ({formData.members.length})
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddMember}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Agregar Miembro</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formData.members.map((member, index) => (
                        <div key={member.id} className="bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white">{member.name}</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{member.role}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleEditMember(member)}
                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Editar miembro"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMember(member.id)}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                title="Eliminar miembro"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                            {member.description || 'Sin descripción'}
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500">
                            <span>{member.tools.length} tools</span>
                            <span>{member.destinations?.length || 0} transferencias</span>
                          </div>

                          {/* Indicador de orden */}
                          <div className="mt-2 flex items-center justify-center">
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-400 text-xs rounded-md">
                              Posición {index + 1}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {formData.members.length === 0 && (
                      <div className="text-center py-12">
                        <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">No hay miembros en el squad</p>
                        <button
                          type="button"
                          onClick={handleAddMember}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Agregar Primer Miembro
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Tools */}
                {activeTab === 'tools' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Tools del Squad ({getAllSquadTools().length})
                    </h3>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">ℹ️ Gestión Automática</h4>
                      <p className="text-yellow-800 dark:text-yellow-400 text-sm">
                        Las tools se agregan automáticamente cuando las asignas a los miembros del squad. 
                        Cada miembro puede tener sus propias tools especializadas.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getAllSquadTools().map((tool) => (
                        <div key={tool.id} className="bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <div className="p-1 bg-indigo-100 dark:bg-indigo-900 rounded-md">
                                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                </svg>
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{tool.name}</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400">{tool.category}</p>
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                            {tool.description}
                          </p>

                          {/* Mostrar qué miembros usan esta tool */}
                          <div className="flex flex-wrap gap-1">
                            {formData.members
                              .filter(member => member.tools.includes(tool.name))
                              .map(member => (
                                <span key={member.id} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-md">
                                  {member.name}
                                </span>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {getAllSquadTools().length === 0 && (
                      <div className="text-center py-12">
                        <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        </svg>
                        <p className="text-slate-500 dark:text-slate-400">No hay tools asignadas aún</p>
                        <p className="text-sm text-slate-400 mt-2">Asigna tools a los miembros del squad para verlas aquí</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer con acciones */}
          <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {formData.members.length} miembros • {getAllSquadTools().length} tools
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name || formData.members.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>{isEditing ? 'Actualizar Squad' : 'Crear Squad'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de edición de miembro */}
      {showMemberModal && selectedMember && (
        <MemberEditorModal
          member={selectedMember}
          availableTools={reusableTools}
          squadMembers={formData.members}
          onClose={() => {
            setShowMemberModal(false);
            setSelectedMember(null);
          }}
          onUpdate={handleUpdateMember}
        />
      )}
    </div>
  );
};

// Componente para editar miembros individuales
interface MemberEditorModalProps {
  member: SquadMember;
  availableTools: Tool[];
  squadMembers: SquadMember[];
  onClose: () => void;
  onUpdate: (member: SquadMember) => void;
}

const MemberEditorModal: React.FC<MemberEditorModalProps> = ({
  member,
  availableTools,
  squadMembers,
  onClose,
  onUpdate
}) => {
  const [formData, setFormData] = useState<SquadMember>({ ...member });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  const handleToolToggle = (toolName: string) => {
    const tools = formData.tools.includes(toolName)
      ? formData.tools.filter(t => t !== toolName)
      : [...formData.tools, toolName];
    
    setFormData(prev => ({ ...prev, tools }));
  };

  const handleAddDestination = () => {
    const newDestination = {
      type: 'assistant' as const,
      assistant_name: '',
      message: '',
      description: ''
    };

    setFormData(prev => ({
      ...prev,
      destinations: [...(prev.destinations || []), newDestination]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Editar Miembro: {member.name}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="Ej: Agente de Ventas, Soporte Técnico"
                />
              </div>
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
                placeholder="Describe las responsabilidades y especialización de este agente..."
              />
            </div>

            {/* Tools */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Tools Asignadas ({formData.tools.length})
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                {availableTools.map((tool) => (
                  <label key={tool.id} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <input
                      type="checkbox"
                      checked={formData.tools.includes(tool.name)}
                      onChange={() => handleToolToggle(tool.name)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{tool.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{tool.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Transferencias */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Transferencias ({formData.destinations?.length || 0})
                </label>
                <button
                  type="button"
                  onClick={handleAddDestination}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                >
                  + Agregar
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.destinations?.map((dest, index) => (
                  <div key={index} className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        value={dest.assistant_name || ''}
                        onChange={(e) => {
                          const newDests = [...(formData.destinations || [])];
                          newDests[index] = { ...dest, assistant_name: e.target.value };
                          setFormData(prev => ({ ...prev, destinations: newDests }));
                        }}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-600 text-slate-900 dark:text-white text-sm"
                      >
                        <option value="">Seleccionar agente...</option>
                        {squadMembers
                          .filter(m => m.id !== formData.id)
                          .map(m => (
                            <option key={m.id} value={m.name}>{m.name}</option>
                          ))}
                      </select>
                      
                      <input
                        type="text"
                        value={dest.message}
                        onChange={(e) => {
                          const newDests = [...(formData.destinations || [])];
                          newDests[index] = { ...dest, message: e.target.value };
                          setFormData(prev => ({ ...prev, destinations: newDests }));
                        }}
                        placeholder="Mensaje de transferencia..."
                        className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-600 text-slate-900 dark:text-white text-sm"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const newDests = formData.destinations?.filter((_, i) => i !== index) || [];
                        setFormData(prev => ({ ...prev, destinations: newDests }));
                      }}
                      className="mt-2 text-red-600 hover:text-red-800 text-sm"
                    >
                      Eliminar transferencia
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Actualizar Miembro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SquadEditorModal;
