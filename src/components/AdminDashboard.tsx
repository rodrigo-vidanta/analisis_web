import { useState, useEffect } from 'react';
import { getAgentCategories, getAgentTemplates, deleteAgentTemplate, updateAgentTemplate } from '../services/supabaseService';
import { diagnoseDatabase } from '../utils/diagnoseDatabase';

import type { AgentCategory, AgentTemplate } from '../config/supabase';
import AgentTemplateCard from './admin/AgentTemplateCard';
import AgentEditor from './admin/AgentEditor';
import ImportAgentModal from './admin/ImportAgentModal';
import EditAgentModal from './admin/EditAgentModal';


const AdminDashboard = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<AgentCategory[]>([]);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [allTemplates, setAllTemplates] = useState<AgentTemplate[]>([]); // Para contadores
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AgentTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      
      // Cargar todos los templates para contadores
      const allTemplatesData = await getAgentTemplates(); // Sin filtro de categoría
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
      // Recargar templates y contadores después de eliminar
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
    const template = allTemplates.find(t => t.id === templateId);
    if (template) {
      setEditingTemplate(template);
      setIsEditModalOpen(true);
    }
  };

  const handleSaveEdit = async (updates: Partial<AgentTemplate>) => {
    if (!editingTemplate) return;

    try {
      await updateAgentTemplate(editingTemplate.id, updates);
      // Recargar templates y contadores después de editar
      await loadTemplates();
      await loadData();
      console.log('✅ Agente editado y lista actualizada');
    } catch (error) {
      console.error('❌ Error editando agente:', error);
      throw error; // Re-throw para que el modal pueda manejarlo
    }
  };

  // Filtrar plantillas según búsqueda
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.keywords.some((keyword: string) => keyword.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  const handleImportSuccess = () => {
    loadTemplates(); // Recargar plantillas después de importar
    loadData(); // Recargar contadores también
  };

  const getCategoryStats = (categorySlug: string) => {
    return allTemplates.filter(t => t.category?.slug === categorySlug).length;
  };

  if (selectedTemplate && selectedTemplateData) {
    return (
      <AgentEditor 
        template={selectedTemplateData}
        onBack={() => setSelectedTemplate(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header de Admin */}
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

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {categories.map((category) => (
              <div key={category.id} className="glass-card p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: category.color + '20' }}>
                    <span className="text-2xl">{category.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{category.name}</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {getCategoryStats(category.slug)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

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

            {/* Filtros por categoría */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedCategory === 'all'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Todas las Categorías
              </button>
              
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                    selectedCategory === category.id
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
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
      </div>

      {/* Modal de importación */}
      <ImportAgentModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {/* Modal de edición */}
      {editingTemplate && (
        <EditAgentModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTemplate(null);
          }}
          onSave={handleSaveEdit}
          template={editingTemplate}
        />
      )}
    </div>
  );
};

export default AdminDashboard;