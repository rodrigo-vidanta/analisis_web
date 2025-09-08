import React, { useState, useEffect } from 'react';
import { getAgentCategories, getAgentTemplates, deleteAgentTemplate, updateAgentTemplate } from '../services/supabaseService';
import { diagnoseDatabase } from '../utils/diagnoseDatabase';
import type { AgentCategory, AgentTemplate } from '../config/supabase';
import AgentTemplateCard from './admin/AgentTemplateCard';
import ImportAgentModal from './admin/ImportAgentModal';
import MyAgents from './admin/MyAgents';
import MyTools from './admin/MyTools';
import { supabaseMainAdmin as supabaseAdmin } from '../config/supabase';

interface TemplateManagerProps {
  onClose: () => void;
}

const TemplateManagerSimple: React.FC<TemplateManagerProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'prompts' | 'tools' | 'editor'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<AgentCategory[]>([]);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [allTemplates, setAllTemplates] = useState<AgentTemplate[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'catalogo'|'mis-agentes'|'mis-herramientas'>('catalogo');
  const [selectedTemplateObj, setSelectedTemplateObj] = useState<AgentTemplate | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory]);

  const loadData = async () => {
    try {
      const categoriesData = await getAgentCategories();
      setCategories(categoriesData);
      
      const allTemplatesData = await getAgentTemplates();
      setAllTemplates(allTemplatesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const categoryId = selectedCategory === 'all' ? undefined : selectedCategory;
      const templatesData = await getAgentTemplates(categoryId);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAgent = async (templateId: string) => {
    try {
      await deleteAgentTemplate(templateId);
      await loadTemplates();
      await loadData();
      console.log('✅ Agente eliminado y lista actualizada');
    } catch (error) {
      console.error('❌ Error eliminando agente:', error);
      alert('Error al eliminar el agente. Por favor intenta de nuevo.');
    }
  };

  const handleEditAgent = (templateId: string) => {
    console.log('✏️ Editing agent:', templateId);
    setSelectedTemplate(templateId);
    setActiveTab('editor');
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.keywords.some((keyword: string) => keyword.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate) || allTemplates.find(t => t.id === selectedTemplate) || selectedTemplateObj || null;

  const handleImportSuccess = () => {
    loadTemplates();
    loadData();
  };

  const getCategoryStats = (categorySlug: string) => {
    return allTemplates.filter(t => t.category?.slug === categorySlug).length;
  };


  // Iconos para las categorías (usando los datos de la BD)
  const getCategoryIcon = (categorySlug: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      'atencion_clientes': (
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      'ventas': (
        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      'cobranza': (
        <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      'soporte_tecnico': (
        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    };
    return iconMap[categorySlug] || (
      <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Editor Modular de Agentes
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Acelera la creación de agentes con plantillas optimizadas y herramientas reutilizables
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Volver al Original</span>
            </button>
          </div>

          {/* Contadores como botones de filtro */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`glass-card p-4 text-left transition-all hover:shadow-lg ${
                  selectedCategory === category.id
                    ? 'ring-2 ring-blue-500 bg-gradient-to-r from-blue-500/10 to-indigo-500/10'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: category.color + '20' }}>
                    {getCategoryIcon(category.slug)}
                  </div>
                  <span className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                    {getCategoryStats(category.slug)}
                  </span>
                </div>
                <h3 className="font-medium text-slate-900 dark:text-white text-sm">
                  {category.name}
                </h3>
              </button>
            ))}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            {[
              { 
                id: 'catalog', 
                label: 'Catálogo', 
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                )
              },
              { 
                id: 'prompts', 
                label: 'Prompts', 
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                )
              },
              { 
                id: 'tools', 
                label: 'Herramientas', 
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )
              },
              { 
                id: 'editor', 
                label: 'Editor', 
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                )
              }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/10'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'catalog' && (
          <>
            {/* Filtros y búsqueda */}
            <div className="glass-card p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Búsqueda */}
                <div className="flex-1">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Buscar plantillas por nombre, descripción o palabras clave..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Botón de importar */}
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Importar Agente</span>
                </button>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            )}

            {/* Grid de plantillas */}
            {!isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <AgentTemplateCard
                    key={template.id}
                    template={template}
                    onClick={() => setSelectedTemplate(template.id)}
                    onDelete={handleDeleteAgent}
                    onEdit={handleEditAgent}
                  />
                ))}
              </div>
            )}

            {/* Estado vacío */}
            {!isLoading && filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  No se encontraron plantillas
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  {templates.length === 0 
                    ? 'Aún no hay plantillas en la base de datos. Importa tu primer agente para comenzar.'
                    : 'Intenta cambiar los filtros o términos de búsqueda para encontrar lo que necesitas.'
                  }
                </p>
                {templates.length === 0 && (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={diagnoseDatabase}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm"
                    >
                      🔍 Diagnosticar BD
                    </button>
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      Importar Agente JSON
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'prompts' && (
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Prompts del Sistema
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Personaliza la identidad y flujos de conversación de tu agente
            </p>
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Editor de Prompts
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Funcionalidad de prompts en desarrollo
              </p>
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Herramientas del Sistema
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Herramientas disponibles para integrar en tus agentes
            </p>
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Editor de Herramientas
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Funcionalidad de herramientas en desarrollo
              </p>
            </div>
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="space-y-6">
            {/* Header del Editor */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Editor de Agentes
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    {selectedTemplateData ? `Editando: ${selectedTemplateData.name}` : 'Selecciona un agente para editar'}
                  </p>
                </div>
                {selectedTemplateData && (
                  <button
                    onClick={() => {
                      setSelectedTemplate(null);
                      setActiveTab('catalog');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Volver al Catálogo
                  </button>
                )}
              </div>
            </div>

            {selectedTemplateData ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Información del Agente */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                      Información General
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Nombre del Agente
                        </label>
                        <input
                          type="text"
                          value={selectedTemplateData.name}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Descripción
                        </label>
                        <textarea
                          value={selectedTemplateData.description || ''}
                          rows={3}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Categoría
                        </label>
                        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg">
                          {selectedTemplateData.category?.name || 'Sin categoría'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Configuración VAPI */}
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                      Configuración VAPI
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Modelo:</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {selectedTemplateData.vapi_config?.model || 'No configurado'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Voz:</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {selectedTemplateData.vapi_config?.voice || 'No configurado'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Transcripción:</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {selectedTemplateData.vapi_config?.transcriber || 'No configurado'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenido Principal */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Prompts del Sistema */}
                  <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Prompts del Sistema
                      </h3>
                      <button className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                        + Agregar Prompt
                      </button>
                    </div>
                    <div className="space-y-3">
                      {selectedTemplateData.system_prompts && selectedTemplateData.system_prompts.length > 0 ? (
                        selectedTemplateData.system_prompts.map((prompt: any, index: number) => (
                          <div key={index} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-slate-900 dark:text-white">
                                {prompt.name || `Prompt ${index + 1}`}
                              </h4>
                              <div className="flex gap-2">
                                <button className="text-blue-500 hover:text-blue-600 text-sm">Editar</button>
                                <button className="text-red-500 hover:text-red-600 text-sm">Eliminar</button>
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {prompt.content || 'Sin contenido'}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400">No hay prompts configurados</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Herramientas */}
                  <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Herramientas
                      </h3>
                      <button className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm">
                        + Agregar Herramienta
                      </button>
                    </div>
                    <div className="space-y-3">
                      {selectedTemplateData.tools && selectedTemplateData.tools.length > 0 ? (
                        selectedTemplateData.tools.map((tool: any, index: number) => (
                          <div key={index} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-slate-900 dark:text-white">
                                {tool.name || `Herramienta ${index + 1}`}
                              </h4>
                              <div className="flex gap-2">
                                <button className="text-blue-500 hover:text-blue-600 text-sm">Editar</button>
                                <button className="text-red-500 hover:text-red-600 text-sm">Eliminar</button>
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {tool.description || 'Sin descripción'}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400">No hay herramientas configuradas</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* JSON Configuration */}
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                      Configuración JSON
                    </h3>
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-sm">
                        {JSON.stringify(selectedTemplateData.vapi_config, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Selecciona un Agente
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  Ve al catálogo y selecciona un agente para editarlo
                </p>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Ir al Catálogo
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de importación */}
      <ImportAgentModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />

    </div>
  );
};

export default TemplateManagerSimple;
