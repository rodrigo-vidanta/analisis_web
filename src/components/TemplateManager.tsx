import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AgentTemplate, SystemMessage, Tool } from '../data/database-structure';
import { SYSTEM_MESSAGES_LIBRARY, TOOLS_LIBRARY, AGENT_TEMPLATES } from '../data/agent-templates';

interface TemplateManagerProps {
  onClose: () => void;
}

type ActiveTab = 'catalog' | 'prompts' | 'tools' | 'editor';

const TemplateManager: React.FC<TemplateManagerProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [templates, setTemplates] = useState<AgentTemplate[]>(AGENT_TEMPLATES);
  const [prompts, setPrompts] = useState<SystemMessage[]>(SYSTEM_MESSAGES_LIBRARY);
  const [tools, setTools] = useState<Tool[]>(TOOLS_LIBRARY);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'Todas', icon: '📋', color: 'slate' },
    { id: 'atencion_clientes', name: 'Atención al Cliente', icon: '🏢', color: 'blue' },
    { id: 'ventas', name: 'Ventas', icon: '💰', color: 'green' },
    { id: 'cobranza', name: 'Cobranza', icon: '💳', color: 'orange' },
    { id: 'soporte_tecnico', name: 'Soporte Técnico', icon: '🔧', color: 'purple' }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setActiveTab('editor');
  };

  const handleImportTemplate = () => {
    // Lógica para importar template desde JSON
    console.log('Importar template desde JSON');
  };

  const handleCreateNew = () => {
    // Lógica para crear nuevo template
    console.log('Crear nuevo template');
  };

  const renderCatalog = () => (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            Catálogo de Plantillas
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Selecciona una plantilla para personalizar o crear una nueva
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleImportTemplate}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Importar JSON
          </button>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nueva Plantilla
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar plantillas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>
        <div className="flex space-x-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? `bg-${category.color}-100 text-${category.color}-700 dark:bg-${category.color}-900/20 dark:text-${category.color}-300`
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span className="mr-1">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de plantillas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleTemplateSelect(template)}
            className="glass-card p-6 cursor-pointer hover:shadow-lg transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{template.icon}</div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {template.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {template.difficulty} • {template.estimatedTime}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                  {template.systemMessages.length} prompts
                </span>
                <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                  {template.defaultTools.length} tools
                </span>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
              {template.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex space-x-1">
                {template.tags.slice(0, 3).map((tag, idx) => (
                  <span key={idx} className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPrompts = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          Catálogo de Prompts
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Biblioteca de prompts reutilizables para tus agentes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {prompts.map((prompt) => (
          <div key={prompt.id} className="glass-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                  {prompt.title}
                </h4>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    prompt.category === 'identity' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' :
                    prompt.category === 'workflow' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
                    prompt.category === 'communication' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    {prompt.category}
                  </span>
                  {prompt.isRequired && (
                    <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 px-2 py-1 rounded">
                      Requerido
                    </span>
                  )}
                </div>
              </div>
              <button className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-3">
              {prompt.content}
            </p>
            
            {prompt.variables.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {prompt.variables.map((variable, idx) => (
                  <span key={idx} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                    {`{{${variable}}}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderTools = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          Catálogo de Herramientas
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Herramientas disponibles para integrar en tus agentes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tools.map((tool) => (
          <div key={tool.id} className="glass-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{tool.icon}</div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    {tool.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {tool.type} • {tool.complexity}
                  </p>
                </div>
              </div>
              <button className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              {tool.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex space-x-1">
                {tool.compatibleCategories.slice(0, 2).map((category, idx) => (
                  <span key={idx} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                    {category}
                  </span>
                ))}
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                tool.category === 'communication' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' :
                tool.category === 'data_collection' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
                tool.category === 'business_logic' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' :
                'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {tool.category}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEditor = () => (
    <div className="space-y-6">
      {selectedTemplate ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                Editor de Plantilla
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Personaliza la plantilla: {selectedTemplate.name}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('catalog')}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al Catálogo
            </button>
          </div>

          {/* Aquí iría el editor completo con tabs para prompts, tools, parámetros, etc. */}
          <div className="glass-card p-6">
            <p className="text-slate-600 dark:text-slate-400">
              Editor completo en desarrollo - Aquí se implementará la edición de prompts, tools y parámetros
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Selecciona una Plantilla
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Ve al catálogo y selecciona una plantilla para comenzar a editarla
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Gestor de Plantillas
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Crea, edita y gestiona plantillas de agentes
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          {[
            { id: 'catalog', label: 'Catálogo', icon: '📋' },
            { id: 'prompts', label: 'Prompts', icon: '💬' },
            { id: 'tools', label: 'Herramientas', icon: '🔧' },
            { id: 'editor', label: 'Editor', icon: '✏️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'catalog' && renderCatalog()}
          {activeTab === 'prompts' && renderPrompts()}
          {activeTab === 'tools' && renderTools()}
          {activeTab === 'editor' && renderEditor()}
        </div>
      </div>
    </div>
  );
};

export default TemplateManager;
