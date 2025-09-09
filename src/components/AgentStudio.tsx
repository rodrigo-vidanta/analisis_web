import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAgentStudio } from '../hooks/useAgentStudio';
import type { AgentTemplate, AgentCategory, SystemPrompt, Tool } from '../services/agentStudioService';

// Tipos importados desde el servicio

interface NewAgentConfig {
  name: string;
  description: string;
  category_id: string;
  agent_type: 'inbound' | 'outbound';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_time: string;
  keywords: string[];
  use_cases: string[];
  selectedPrompts: string[];
  selectedTools: string[];
  vapi_config: any;
}

const AgentStudio: React.FC = () => {
  const { user } = useAuth();
  const {
    templates,
    categories,
    prompts,
    tools,
    loading,
    error,
    createAgent,
    updateAgent,
    deleteAgent,
    duplicateAgent,
    filterTemplates,
    getStats
  } = useAgentStudio();
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState<'gallery' | 'create' | 'manage'>('gallery');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para creación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAgent, setNewAgent] = useState<NewAgentConfig>({
    name: '',
    description: '',
    category_id: '',
    agent_type: 'inbound',
    difficulty: 'beginner',
    estimated_time: '15 minutos',
    keywords: [],
    use_cases: [],
    selectedPrompts: [],
    selectedTools: [],
    vapi_config: {}
  });
  
  // Estados para edición
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Obtener plantillas filtradas
  const filteredTemplates = filterTemplates(searchTerm, selectedCategory);

  // Obtener estadísticas
  const stats = getStats();

  // Crear nuevo agente usando el hook
  const handleCreateAgent = async () => {
    const success = await createAgent(newAgent);
    if (success) {
      setShowCreateModal(false);
      resetNewAgent();
    } else {
      alert('Error al crear el agente. Por favor intenta de nuevo.');
    }
  };

  // Resetear formulario
  const resetNewAgent = () => {
    setNewAgent({
      name: '',
      description: '',
      category_id: '',
      agent_type: 'inbound',
      difficulty: 'beginner',
      estimated_time: '15 minutos',
      keywords: [],
      use_cases: [],
      selectedPrompts: [],
      selectedTools: [],
      vapi_config: {}
    });
  };

  // Eliminar agente usando el hook
  const handleDeleteAgent = async (template: AgentTemplate) => {
    if (!confirm(`¿Estás seguro de eliminar "${template.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    const success = await deleteAgent(template.id);
    if (!success) {
      alert('Error al eliminar el agente.');
    }
  };

  // Obtener icono de dificultad
  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '🟢';
      case 'intermediate': return '🟡';
      case 'advanced': return '🔴';
      default: return '⚪';
    }
  };

  // Obtener color de categoría
  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#6B7280';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Agent Studio
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Crea, gestiona y despliega agentes de IA inteligentes
              </p>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 flex items-center space-x-2 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Crear Agente</span>
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalTemplates}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Plantillas
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalUsage}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Usos Totales
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {Math.round(stats.avgSuccessRate * 100)}%
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Éxito Promedio
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {categories.length}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Categorías
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
            {[
              { id: 'gallery', label: 'Galería', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
              { id: 'create', label: 'Crear', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
              { id: 'manage', label: 'Gestionar', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-md transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filtros para Galería */}
        {activeTab === 'gallery' && (
          <div className="mb-6 space-y-4">
            {/* Búsqueda */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar plantillas por nombre, descripción o palabras clave..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
              />
            </div>

            {/* Filtros por categoría */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                Todas las Categorías
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                    selectedCategory === category.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Contenido por Tab */}
        {activeTab === 'gallery' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-slate-200 dark:bg-slate-700 rounded-xl h-64"></div>
                </div>
              ))
            ) : filteredTemplates.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  No se encontraron plantillas
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Ajusta los filtros o crea una nueva plantilla
                </p>
              </div>
            ) : (
              filteredTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  category={categories.find(c => c.id === template.category_id)}
                  onEdit={() => {
                    setSelectedTemplate(template);
                    setShowEditModal(true);
                  }}
                  onDelete={() => handleDeleteAgent(template)}
                  onDuplicate={async () => {
                    const newName = prompt('Nombre para la copia:', `${template.name} (Copia)`);
                    if (newName) {
                      const success = await duplicateAgent(template.id, newName);
                      if (!success) {
                        alert('Error al duplicar el agente.');
                      }
                    }
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* Modal de Creación */}
        {showCreateModal && (
          <CreateAgentModal
            newAgent={newAgent}
            setNewAgent={setNewAgent}
            categories={categories}
            prompts={prompts}
            tools={tools}
            onSave={handleCreateAgent}
            onClose={() => {
              setShowCreateModal(false);
              resetNewAgent();
            }}
            loading={loading}
          />
        )}

        {/* Modal de Edición */}
        {showEditModal && selectedTemplate && (
          <EditAgentModal
            template={selectedTemplate}
            categories={categories}
            prompts={prompts}
            tools={tools}
            onSave={async (updatedTemplate) => {
              // Implementar actualización
              console.log('Updating template:', updatedTemplate);
              await loadTemplates();
              setShowEditModal(false);
              setSelectedTemplate(null);
            }}
            onClose={() => {
              setShowEditModal(false);
              setSelectedTemplate(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

// Componente TemplateCard
interface TemplateCardProps {
  template: AgentTemplate;
  category?: AgentCategory;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ 
  template, 
  category, 
  onEdit, 
  onDelete, 
  onDuplicate 
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all duration-200 group">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: category?.color || '#6B7280' }}
            >
              {template.icon || category?.icon || '🤖'}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {template.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {category?.name || 'Sin categoría'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
              {template.difficulty}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              template.agent_type === 'inbound' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
            }`}>
              {template.agent_type}
            </span>
          </div>
        </div>

        <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2">
          {template.description}
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="space-y-4">
          {/* Estadísticas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {template.usage_count || 0}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Usos
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {Math.round((template.success_rate || 0) * 100)}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Éxito
              </div>
            </div>
          </div>

          {/* Keywords */}
          {template.keywords && template.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.keywords.slice(0, 3).map(keyword => (
                <span
                  key={keyword}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs"
                >
                  {keyword}
                </span>
              ))}
              {template.keywords.length > 3 && (
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs">
                  +{template.keywords.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Tiempo estimado */}
          <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{template.estimated_time}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 pb-6">
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            Editar
          </button>
          <button
            onClick={onDuplicate}
            className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente CreateAgentModal
interface CreateAgentModalProps {
  newAgent: NewAgentConfig;
  setNewAgent: React.Dispatch<React.SetStateAction<NewAgentConfig>>;
  categories: AgentCategory[];
  prompts: SystemPrompt[];
  tools: Tool[];
  onSave: () => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

const CreateAgentModal: React.FC<CreateAgentModalProps> = ({
  newAgent,
  setNewAgent,
  categories,
  prompts,
  tools,
  onSave,
  onClose,
  loading
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(newAgent.name && newAgent.description && newAgent.category_id);
      case 2:
        return newAgent.selectedPrompts.length > 0;
      case 3:
        return newAgent.selectedTools.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const addKeyword = (keyword: string) => {
    if (keyword.trim() && !newAgent.keywords.includes(keyword.trim())) {
      setNewAgent(prev => ({
        ...prev,
        keywords: [...prev.keywords, keyword.trim()]
      }));
    }
  };

  const removeKeyword = (keyword: string) => {
    setNewAgent(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const addUseCase = (useCase: string) => {
    if (useCase.trim() && !newAgent.use_cases.includes(useCase.trim())) {
      setNewAgent(prev => ({
        ...prev,
        use_cases: [...prev.use_cases, useCase.trim()]
      }));
    }
  };

  const removeUseCase = (useCase: string) => {
    setNewAgent(prev => ({
      ...prev,
      use_cases: prev.use_cases.filter(u => u !== useCase)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                Crear Nuevo Agente
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Paso {currentStep} de {totalSteps}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-cyan-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {currentStep === 1 && (
            <Step1BasicInfo 
              newAgent={newAgent}
              setNewAgent={setNewAgent}
              categories={categories}
              addKeyword={addKeyword}
              removeKeyword={removeKeyword}
              addUseCase={addUseCase}
              removeUseCase={removeUseCase}
            />
          )}

          {currentStep === 2 && (
            <Step2SystemPrompts
              newAgent={newAgent}
              setNewAgent={setNewAgent}
              prompts={prompts}
            />
          )}

          {currentStep === 3 && (
            <Step3Tools
              newAgent={newAgent}
              setNewAgent={setNewAgent}
              tools={tools}
            />
          )}

          {currentStep === 4 && (
            <Step4Review
              newAgent={newAgent}
              categories={categories}
              prompts={prompts}
              tools={tools}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            
            <div className="flex space-x-3">
              {currentStep < totalSteps ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!isStepValid(currentStep)}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={onSave}
                  disabled={loading || !isStepValid(currentStep)}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span>{loading ? 'Creando...' : 'Crear Agente'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componentes de pasos (implementación básica - se pueden expandir)
const Step1BasicInfo: React.FC<any> = ({ newAgent, setNewAgent, categories, addKeyword, removeKeyword, addUseCase, removeUseCase }) => {
  const [keywordInput, setKeywordInput] = useState('');
  const [useCaseInput, setUseCaseInput] = useState('');

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
        Información Básica
      </h4>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Nombre del Agente *
          </label>
          <input
            type="text"
            value={newAgent.name}
            onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
            placeholder="Ej: Asistente de Ventas"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Categoría *
          </label>
          <select
            value={newAgent.category_id}
            onChange={(e) => setNewAgent(prev => ({ ...prev, category_id: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
          >
            <option value="">Seleccionar categoría...</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Tipo de Agente
          </label>
          <select
            value={newAgent.agent_type}
            onChange={(e) => setNewAgent(prev => ({ ...prev, agent_type: e.target.value as any }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
          >
            <option value="inbound">Inbound (Recibe llamadas)</option>
            <option value="outbound">Outbound (Realiza llamadas)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Dificultad
          </label>
          <select
            value={newAgent.difficulty}
            onChange={(e) => setNewAgent(prev => ({ ...prev, difficulty: e.target.value as any }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
          >
            <option value="beginner">🟢 Principiante</option>
            <option value="intermediate">🟡 Intermedio</option>
            <option value="advanced">🔴 Avanzado</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Descripción *
        </label>
        <textarea
          value={newAgent.description}
          onChange={(e) => setNewAgent(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
          placeholder="Describe qué hace este agente y para qué casos de uso está optimizado..."
        />
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Palabras Clave
        </label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addKeyword(keywordInput);
                setKeywordInput('');
              }
            }}
            className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
            placeholder="Agregar palabra clave..."
          />
          <button
            onClick={() => {
              addKeyword(keywordInput);
              setKeywordInput('');
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Agregar
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {newAgent.keywords.map(keyword => (
            <span
              key={keyword}
              className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm flex items-center space-x-2"
            >
              <span>{keyword}</span>
              <button
                onClick={() => removeKeyword(keyword)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const Step2SystemPrompts: React.FC<any> = ({ newAgent, setNewAgent, prompts }) => {
  const togglePrompt = (promptId: string) => {
    setNewAgent((prev: any) => ({
      ...prev,
      selectedPrompts: prev.selectedPrompts.includes(promptId)
        ? prev.selectedPrompts.filter((id: string) => id !== promptId)
        : [...prev.selectedPrompts, promptId]
    }));
  };

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
        Prompts del Sistema
      </h4>
      <p className="text-slate-600 dark:text-slate-400">
        Selecciona los prompts que definirán el comportamiento de tu agente
      </p>

      <div className="space-y-3">
        {prompts.map(prompt => (
          <div
            key={prompt.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
              newAgent.selectedPrompts.includes(prompt.id)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
            }`}
            onClick={() => togglePrompt(prompt.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={newAgent.selectedPrompts.includes(prompt.id)}
                    onChange={() => togglePrompt(prompt.id)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <h5 className="font-medium text-slate-900 dark:text-white">
                      {prompt.title}
                    </h5>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {prompt.content.substring(0, 150)}...
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded">
                        {prompt.category}
                      </span>
                      {prompt.is_required && (
                        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-1 rounded">
                          Requerido
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Step3Tools: React.FC<any> = ({ newAgent, setNewAgent, tools }) => {
  const toggleTool = (toolId: string) => {
    setNewAgent((prev: any) => ({
      ...prev,
      selectedTools: prev.selectedTools.includes(toolId)
        ? prev.selectedTools.filter((id: string) => id !== toolId)
        : [...prev.selectedTools, toolId]
    }));
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
        Herramientas y Funciones
      </h4>
      <p className="text-slate-600 dark:text-slate-400">
        Selecciona las herramientas que tu agente podrá utilizar
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map(tool => (
          <div
            key={tool.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
              newAgent.selectedTools.includes(tool.id)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
            }`}
            onClick={() => toggleTool(tool.id)}
          >
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={newAgent.selectedTools.includes(tool.id)}
                onChange={() => toggleTool(tool.id)}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <h5 className="font-medium text-slate-900 dark:text-white">
                  {tool.name}
                </h5>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {tool.description}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${getComplexityColor(tool.complexity)}`}>
                    {tool.complexity}
                  </span>
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded">
                    {tool.category}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Step4Review: React.FC<any> = ({ newAgent, categories, prompts, tools }) => {
  const selectedCategory = categories.find(c => c.id === newAgent.category_id);
  const selectedPrompts = prompts.filter(p => newAgent.selectedPrompts.includes(p.id));
  const selectedTools = tools.filter(t => newAgent.selectedTools.includes(t.id));

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
        Revisar Configuración
      </h4>

      <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium text-slate-900 dark:text-white mb-2">Información Básica</h5>
            <div className="space-y-2 text-sm">
              <div><span className="text-slate-500">Nombre:</span> {newAgent.name}</div>
              <div><span className="text-slate-500">Categoría:</span> {selectedCategory?.name}</div>
              <div><span className="text-slate-500">Tipo:</span> {newAgent.agent_type}</div>
              <div><span className="text-slate-500">Dificultad:</span> {newAgent.difficulty}</div>
            </div>
          </div>
          
          <div>
            <h5 className="font-medium text-slate-900 dark:text-white mb-2">Configuración</h5>
            <div className="space-y-2 text-sm">
              <div><span className="text-slate-500">Prompts:</span> {selectedPrompts.length}</div>
              <div><span className="text-slate-500">Herramientas:</span> {selectedTools.length}</div>
              <div><span className="text-slate-500">Keywords:</span> {newAgent.keywords.length}</div>
              <div><span className="text-slate-500">Casos de uso:</span> {newAgent.use_cases.length}</div>
            </div>
          </div>
        </div>

        <div>
          <h5 className="font-medium text-slate-900 dark:text-white mb-2">Descripción</h5>
          <p className="text-sm text-slate-600 dark:text-slate-400">{newAgent.description}</p>
        </div>

        {selectedPrompts.length > 0 && (
          <div>
            <h5 className="font-medium text-slate-900 dark:text-white mb-2">Prompts Seleccionados</h5>
            <div className="space-y-2">
              {selectedPrompts.map(prompt => (
                <div key={prompt.id} className="text-sm bg-white dark:bg-slate-800 rounded p-3">
                  <div className="font-medium">{prompt.title}</div>
                  <div className="text-slate-600 dark:text-slate-400 mt-1">
                    {prompt.content.substring(0, 100)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTools.length > 0 && (
          <div>
            <h5 className="font-medium text-slate-900 dark:text-white mb-2">Herramientas Seleccionadas</h5>
            <div className="flex flex-wrap gap-2">
              {selectedTools.map(tool => (
                <span
                  key={tool.id}
                  className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm"
                >
                  {tool.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Modal de edición (implementación básica)
const EditAgentModal: React.FC<any> = ({ template, onSave, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            Editar: {template.name}
          </h3>
        </div>
        <div className="p-6">
          <p className="text-slate-600 dark:text-slate-400">
            Funcionalidad de edición en desarrollo...
          </p>
        </div>
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentStudio;
