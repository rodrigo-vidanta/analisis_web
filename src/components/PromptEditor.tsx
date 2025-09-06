import React, { useState, useEffect } from 'react';
import { SystemMessage } from '../data/database-structure';

interface PromptEditorProps {
  prompts: SystemMessage[];
  onPromptsChange: (prompts: SystemMessage[]) => void;
  selectedTemplate?: any;
}

type PromptCategory = 'identity' | 'workflow' | 'restrictions' | 'communication' | 'protection';

const PromptEditor: React.FC<PromptEditorProps> = ({ 
  prompts, 
  onPromptsChange, 
  selectedTemplate 
}) => {
  const [activeCategory, setActiveCategory] = useState<PromptCategory>('identity');
  const [editingPrompt, setEditingPrompt] = useState<SystemMessage | null>(null);
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { 
      id: 'identity' as PromptCategory, 
      name: 'Identidad', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: 'blue',
      description: 'Definición de la identidad y rol del agente'
    },
    { 
      id: 'workflow' as PromptCategory, 
      name: 'Flujo de Trabajo', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'green',
      description: 'Procesos y flujos de trabajo específicos'
    },
    { 
      id: 'restrictions' as PromptCategory, 
      name: 'Restricciones', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      color: 'red',
      description: 'Limitaciones y restricciones del agente'
    },
    { 
      id: 'communication' as PromptCategory, 
      name: 'Comunicación', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      color: 'purple',
      description: 'Estilo y tono de comunicación'
    },
    { 
      id: 'protection' as PromptCategory, 
      name: 'Protección', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      color: 'orange',
      description: 'Protección contra manipulación y seguridad'
    }
  ];

  const filteredPrompts = prompts.filter(prompt => {
    const matchesCategory = prompt.category === activeCategory;
    const matchesSearch = prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddPrompt = () => {
    const newPrompt: SystemMessage = {
      id: `prompt_${Date.now()}`,
      order: prompts.length + 1,
      role: 'system',
      title: 'Nuevo Prompt',
      content: '',
      category: activeCategory,
      isRequired: false,
      isEditable: true,
      variables: []
    };
    setEditingPrompt(newPrompt);
    setShowAddPrompt(false);
  };

  const handleEditPrompt = (prompt: SystemMessage) => {
    setEditingPrompt(prompt);
  };

  const handleSavePrompt = (updatedPrompt: SystemMessage) => {
    const isNew = !prompts.find(p => p.id === updatedPrompt.id);
    let updatedPrompts;
    
    if (isNew) {
      updatedPrompts = [...prompts, updatedPrompt];
    } else {
      updatedPrompts = prompts.map(p => p.id === updatedPrompt.id ? updatedPrompt : p);
    }
    
    onPromptsChange(updatedPrompts);
    setEditingPrompt(null);
  };

  const handleDeletePrompt = (promptId: string) => {
    const updatedPrompts = prompts.filter(p => p.id !== promptId);
    onPromptsChange(updatedPrompts);
  };

  const handleDuplicatePrompt = (prompt: SystemMessage) => {
    const duplicatedPrompt: SystemMessage = {
      ...prompt,
      id: `prompt_${Date.now()}`,
      title: `${prompt.title} (Copia)`,
      order: prompts.length + 1
    };
    onPromptsChange([...prompts, duplicatedPrompt]);
  };

  const renderPromptCard = (prompt: SystemMessage) => (
    <div key={prompt.id} className="glass-card p-6 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h4 className="font-semibold text-slate-900 dark:text-white">
              {prompt.title}
            </h4>
            <div className="flex items-center space-x-2">
              {prompt.isRequired && (
                <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 px-2 py-1 rounded">
                  Requerido
                </span>
              )}
              {!prompt.isEditable && (
                <span className="text-xs bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-2 py-1 rounded">
                  Solo lectura
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
            {prompt.content}
          </p>
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleEditPrompt(prompt)}
            className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => handleDuplicatePrompt(prompt)}
            className="p-2 text-slate-400 hover:text-green-500 transition-colors"
            title="Duplicar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          {prompt.isEditable && (
            <button
              onClick={() => handleDeletePrompt(prompt.id)}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="Eliminar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {prompt.variables.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {prompt.variables.map((variable, idx) => (
            <span key={idx} className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
              {`{{${variable}}}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const renderPromptForm = () => {
    if (!editingPrompt) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              {editingPrompt.id.startsWith('prompt_') && !prompts.find(p => p.id === editingPrompt.id) ? 'Nuevo Prompt' : 'Editar Prompt'}
            </h3>
          </div>
          
          <div className="p-6">
            <PromptForm 
              prompt={editingPrompt}
              onSave={handleSavePrompt}
              onCancel={() => setEditingPrompt(null)}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            Editor de Prompts
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestiona los prompts del sistema para tu agente
          </p>
        </div>
        <button
          onClick={handleAddPrompt}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
        >
          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo Prompt
        </button>
      </div>

      {/* Category Navigation */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              activeCategory === category.id
                ? `bg-${category.color}-100 text-${category.color}-700 dark:bg-${category.color}-900/20 dark:text-${category.color}-300`
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {category.icon}
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      {/* Category Description */}
      <div className="glass-card p-4">
        <div className="flex items-center space-x-3">
          {categories.find(c => c.id === activeCategory)?.icon}
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white">
              {categories.find(c => c.id === activeCategory)?.name}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {categories.find(c => c.id === activeCategory)?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar prompts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        />
      </div>

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPrompts.map(renderPromptCard)}
      </div>

      {filteredPrompts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No hay prompts en esta categoría
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {searchTerm ? 'No se encontraron prompts que coincidan con tu búsqueda' : 'Crea tu primer prompt para esta categoría'}
          </p>
          <button
            onClick={handleAddPrompt}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
          >
            Crear Primer Prompt
          </button>
        </div>
      )}

      {/* Prompt Form Modal */}
      {renderPromptForm()}
    </div>
  );
};

// Componente para el formulario de prompt
interface PromptFormProps {
  prompt: SystemMessage;
  onSave: (prompt: SystemMessage) => void;
  onCancel: () => void;
}

const PromptForm: React.FC<PromptFormProps> = ({ prompt, onSave, onCancel }) => {
  const [formData, setFormData] = useState<SystemMessage>(prompt);
  const [newVariable, setNewVariable] = useState('');

  const handleInputChange = (field: keyof SystemMessage, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddVariable = () => {
    if (newVariable.trim() && !formData.variables.includes(newVariable.trim())) {
      setFormData(prev => ({
        ...prev,
        variables: [...prev.variables, newVariable.trim()]
      }));
      setNewVariable('');
    }
  };

  const handleRemoveVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v !== variable)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Título del Prompt *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Categoría
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="identity">Identidad</option>
            <option value="workflow">Flujo de Trabajo</option>
            <option value="restrictions">Restricciones</option>
            <option value="communication">Comunicación</option>
            <option value="protection">Protección</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Contenido del Prompt *
        </label>
        <textarea
          value={formData.content}
          onChange={(e) => handleInputChange('content', e.target.value)}
          rows={8}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
          placeholder="Escribe el contenido del prompt aquí..."
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isRequired}
              onChange={(e) => handleInputChange('isRequired', e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
              Prompt requerido
            </span>
          </label>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isEditable}
              onChange={(e) => handleInputChange('isEditable', e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
              Editable por usuarios
            </span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Variables Dinámicas
        </label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={newVariable}
            onChange={(e) => setNewVariable(e.target.value)}
            placeholder="Nombre de variable (ej: agentName)"
            className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddVariable())}
          />
          <button
            type="button"
            onClick={handleAddVariable}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Agregar
          </button>
        </div>
        
        {formData.variables.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.variables.map((variable, idx) => (
              <span
                key={idx}
                className="inline-flex items-center space-x-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm"
              >
                <span>{`{{${variable}}}`}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveVariable(variable)}
                  className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
        >
          Guardar Prompt
        </button>
      </div>
    </form>
  );
};

export default PromptEditor;
