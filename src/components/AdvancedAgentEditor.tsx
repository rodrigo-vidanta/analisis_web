import React, { useState, useEffect } from 'react';
import { supabaseMainAdmin } from '../config/supabase';
import type { AgentTemplate } from '../config/supabase';
import ImportAgentModal from './admin/ImportAgentModal';
import AgentCV from './AgentCV';
import RolesEditor from './editor/RolesEditor';
import ToolsEditor from './editor/ToolsEditor';
import SquadsEditor from './editor/SquadsEditor';
import ParametersEditor from './editor/ParametersEditor';

interface AdvancedAgentEditorProps {
  onClose?: () => void;
}

const AdvancedAgentEditor: React.FC<AdvancedAgentEditorProps> = ({ onClose }) => {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [userTemplates, setUserTemplates] = useState<AgentTemplate[]>([]);
  const [userTools, setUserTools] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('catalog');
  const [activeEditorTab, setActiveEditorTab] = useState('roles');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadUserTemplates();
    loadUserTools();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabaseMainAdmin
        .from('agent_templates')
        .select(`
          *,
          agent_categories(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserTemplates = async () => {
    try {
      // Por ahora cargamos todas las plantillas como "del usuario"
      // TODO: Implementar filtro por usuario cuando tengamos autenticación
      const { data, error } = await supabaseMainAdmin
        .from('agent_templates')
        .select(`
          *,
          agent_categories(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserTemplates(data || []);
    } catch (error) {
      console.error('Error loading user templates:', error);
    }
  };

  const loadUserTools = async () => {
    try {
      // Por ahora cargamos todas las herramientas como "del usuario"
      // TODO: Implementar filtro por usuario cuando tengamos autenticación
      const { data, error } = await supabaseMainAdmin
        .from('tools_catalog')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setUserTools(data || []);
    } catch (error) {
      console.error('Error loading user tools:', error);
    }
  };

  const handleTemplateUpdate = (updates: Partial<AgentTemplate>) => {
    if (!selectedTemplate) return;
    
    const updatedTemplate = { ...selectedTemplate, ...updates };
    setSelectedTemplate(updatedTemplate);
    
    // Update in database
    supabaseMainAdmin
      .from('agent_templates')
      .update(updates)
      .eq('id', selectedTemplate.id)
      .then(({ error }) => {
        if (error) {
          console.error('Error updating template:', error);
          alert('Error al actualizar el template');
        }
      });
  };

  const handleImportAgent = async (agentData: any) => {
    try {
      // TODO: Implementar lógica de importación de agentes desde JSON
      // Esto incluirá:
      // 1. Validar estructura del JSON
      // 2. Separar roles, squads, tools, configuraciones
      // 3. Guardar en las tablas correspondientes
      // 4. Crear nueva plantilla
      console.log('Importing agent:', agentData);
      setShowImportModal(false);
    } catch (error) {
      console.error('Error importing agent:', error);
    }
  };

  const tabs = [
    {
      id: 'catalog',
      name: 'Catálogo',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      id: 'my-templates',
      name: 'Mis Plantillas',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'my-tools',
      name: 'Mis Herramientas',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      id: 'agent-cv',
      name: 'CV del Agente',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'wizard',
      name: 'Wizard',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      )
    }
  ];

  const editorTabs = [
    { 
      id: 'roles', 
      name: 'Roles', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    { 
      id: 'tools', 
      name: 'Herramientas', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      id: 'squads', 
      name: 'Squads', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    { 
      id: 'parameters', 
      name: 'Parámetros', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Cargando editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Editor Avanzado de Agentes
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Gestiona y personaliza tus agentes de IA
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="glass-card p-6 mb-6">
          <div className="flex space-x-1 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Tab */}
        {activeTab === 'catalog' && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Catálogo de Agentes
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Importar Agente
                </button>
                <button
                  onClick={() => setActiveTab('wizard')}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  + Nuevo Agente desde Plantilla
                </button>
              </div>
            </div>

            {templates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-6 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setActiveTab('agent-cv');
                    }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {template.name}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {template.category?.name || 'Sin categoría'}
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      {template.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(template.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(template);
                          setActiveTab('editor');
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  No hay agentes disponibles
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Crea tu primer agente para comenzar
                </p>
                <button
                  onClick={() => setShowGenerator(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Crear Agente
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mis Plantillas Tab */}
        {activeTab === 'my-templates' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Mis Plantillas
              </h2>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Importar Agente
              </button>
            </div>
            
            {userTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setActiveTab('editor');
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-slate-900 dark:text-white">
                        {template.name}
                      </h3>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        {template.agent_categories?.name || 'Sin categoría'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      {template.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(template.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(template);
                          setActiveTab('editor');
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  No tienes plantillas creadas
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Importa un agente desde JSON para crear tu primera plantilla
                </p>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Importar Agente
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mis Herramientas Tab */}
        {activeTab === 'my-tools' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Mis Herramientas
              </h2>
            </div>
            
            {userTools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-slate-900 dark:text-white">
                        {tool.name}
                      </h3>
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        {tool.type}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      {tool.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(tool.created_at).toLocaleDateString()}
                      </span>
                      <button
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                      >
                        Usar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  No tienes herramientas creadas
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Las herramientas se crean automáticamente al importar agentes
                </p>
              </div>
            )}
          </div>
        )}

        {/* Editor Tab */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            {selectedTemplate ? (
              <>
                {/* Editor Header */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        Editando: {selectedTemplate.name}
                      </h2>
                      <p className="text-slate-600 dark:text-slate-400">
                        {selectedTemplate.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveTab('catalog')}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        Volver al Catálogo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Editor Tabs */}
                <div className="glass-card p-6">
                  <div className="flex space-x-1 mb-6">
                    {editorTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveEditorTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          activeEditorTab === tab.id
                            ? 'bg-blue-500 text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Editor Content */}
                  <div className="min-h-[600px]">
                    {activeEditorTab === 'roles' && (
                      <RolesEditor
                        template={selectedTemplate}
                        onUpdate={handleTemplateUpdate}
                      />
                    )}
                    {activeEditorTab === 'tools' && (
                      <ToolsEditor
                        template={selectedTemplate}
                        onUpdate={handleTemplateUpdate}
                      />
                    )}
                    {activeEditorTab === 'squads' && (
                      <SquadsEditor
                        template={selectedTemplate}
                        onUpdate={handleTemplateUpdate}
                      />
                    )}
                    {activeEditorTab === 'parameters' && (
                      <ParametersEditor
                        template={selectedTemplate}
                        onUpdate={handleTemplateUpdate}
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  Selecciona un agente para editar
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Ve al catálogo y selecciona un agente para comenzar a editarlo
                </p>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Ir al Catálogo
                </button>
              </div>
            )}
          </div>
        )}

        {/* Agent CV Tab */}
        {activeTab === 'agent-cv' && selectedTemplate && (
          <AgentCV
            template={selectedTemplate}
            onBack={() => setActiveTab('catalog')}
            onDelete={() => {
              // Recargar plantillas después de eliminar
              loadTemplates();
              loadUserTemplates();
              setActiveTab('catalog');
            }}
          />
        )}

        {/* Wizard Tab */}
        {activeTab === 'wizard' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                Nuevo Agente desde Plantilla
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Selecciona una plantilla base para crear tu nuevo agente personalizado.
              </p>
              
              {templates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="p-6 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer border-2 border-transparent hover:border-blue-500"
                      onClick={() => {
                        setSelectedTemplate(template);
                        // TODO: Iniciar wizard con la plantilla seleccionada
                        console.log('Iniciando wizard con plantilla:', template.name);
                        alert('Wizard en desarrollo. Próximamente podrás crear agentes desde esta plantilla.');
                      }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {template.name}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {template.agent_categories?.name || 'Sin categoría'}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        {template.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {template.agent_type || 'No especificado'}
                        </span>
                        <button className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors">
                          Usar Plantilla
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 01-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                    No hay plantillas disponibles
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Importa un agente primero para crear plantillas
                  </p>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Importar Agente
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Import Agent Modal */}
        <ImportAgentModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={(template) => {
            setTemplates(prev => [template, ...prev]);
            setUserTemplates(prev => [template, ...prev]);
            setShowImportModal(false);
          }}
        />
      </div>
    </div>
  );
};

export default AdvancedAgentEditor;