import React, { useState, useEffect } from 'react';
import { Tool } from '../data/database-structure';

interface ToolsEditorProps {
  tools: Tool[];
  onToolsChange: (tools: Tool[]) => void;
  selectedTemplate?: any;
}

type ToolType = 'function' | 'transferCall' | 'endCall';
type ToolCategory = 'communication' | 'data_collection' | 'business_logic' | 'external_api';

const ToolsEditor: React.FC<ToolsEditorProps> = ({ 
  tools, 
  onToolsChange, 
  selectedTemplate 
}) => {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('communication');
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [showAddTool, setShowAddTool] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<ToolType>('function');

  const categories = [
    { 
      id: 'communication' as ToolCategory, 
      name: 'Comunicación', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      color: 'blue',
      description: 'Herramientas para transferir llamadas y finalizar conversaciones'
    },
    { 
      id: 'data_collection' as ToolCategory, 
      name: 'Recolección de Datos', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'green',
      description: 'Herramientas para validar y recopilar información del cliente'
    },
    { 
      id: 'business_logic' as ToolCategory, 
      name: 'Lógica de Negocio', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      color: 'purple',
      description: 'Herramientas para procesar ventas, cobranza y operaciones'
    },
    { 
      id: 'external_api' as ToolCategory, 
      name: 'APIs Externas', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      color: 'orange',
      description: 'Integraciones con servicios externos y APIs'
    }
  ];

  const toolTypes = [
    { 
      id: 'function' as ToolType, 
      name: 'Función', 
      icon: '⚙️',
      description: 'Ejecuta funciones personalizadas con parámetros'
    },
    { 
      id: 'transferCall' as ToolType, 
      name: 'Transferir Llamada', 
      icon: '📞',
      description: 'Transfiere la llamada a un número o agente específico'
    },
    { 
      id: 'endCall' as ToolType, 
      name: 'Finalizar Llamada', 
      icon: '📵',
      description: 'Termina la llamada con un mensaje de despedida'
    }
  ];

  const filteredTools = tools.filter(tool => {
    const matchesCategory = tool.category === activeCategory;
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || tool.type === selectedType;
    return matchesCategory && matchesSearch && matchesType;
  });

  const handleAddTool = () => {
    const newTool: Tool = {
      id: `tool_${Date.now()}`,
      name: 'Nueva Herramienta',
      type: selectedType,
      category: activeCategory,
      description: '',
      icon: '🔧',
      complexity: 'simple',
      async: false,
      messages: [],
      usageExamples: [],
      businessContext: '',
      compatibleCategories: ['atencion_clientes', 'ventas', 'cobranza', 'soporte_tecnico']
    };
    setEditingTool(newTool);
    setShowAddTool(false);
  };

  const handleEditTool = (tool: Tool) => {
    setEditingTool(tool);
  };

  const handleSaveTool = (updatedTool: Tool) => {
    const isNew = !tools.find(t => t.id === updatedTool.id);
    let updatedTools;
    
    if (isNew) {
      updatedTools = [...tools, updatedTool];
    } else {
      updatedTools = tools.map(t => t.id === updatedTool.id ? updatedTool : t);
    }
    
    onToolsChange(updatedTools);
    setEditingTool(null);
  };

  const handleDeleteTool = (toolId: string) => {
    const updatedTools = tools.filter(t => t.id !== toolId);
    onToolsChange(updatedTools);
  };

  const handleDuplicateTool = (tool: Tool) => {
    const duplicatedTool: Tool = {
      ...tool,
      id: `tool_${Date.now()}`,
      name: `${tool.name} (Copia)`
    };
    onToolsChange([...tools, duplicatedTool]);
  };

  const renderToolCard = (tool: Tool) => (
    <div key={tool.id} className="glass-card p-6 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{tool.icon}</div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">
              {tool.name}
            </h4>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                {tool.type}
              </span>
              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                {tool.complexity}
              </span>
              {tool.async && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                  Async
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleEditTool(tool)}
            className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => handleDuplicateTool(tool)}
            className="p-2 text-slate-400 hover:text-green-500 transition-colors"
            title="Duplicar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => handleDeleteTool(tool.id)}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Eliminar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
        {tool.description}
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex space-x-1">
          {tool.compatibleCategories.slice(0, 2).map((category, idx) => (
            <span key={idx} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
              {category}
            </span>
          ))}
          {tool.compatibleCategories.length > 2 && (
            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
              +{tool.compatibleCategories.length - 2}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-xs text-slate-500">
            {tool.usageExamples.length} ejemplos
          </span>
          <span className="text-xs text-slate-500">
            {tool.messages.length} mensajes
          </span>
        </div>
      </div>
    </div>
  );

  const renderToolForm = () => {
    if (!editingTool) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              {editingTool.id.startsWith('tool_') && !tools.find(t => t.id === editingTool.id) ? 'Nueva Herramienta' : 'Editar Herramienta'}
            </h3>
          </div>
          
          <div className="p-6">
            <ToolForm 
              tool={editingTool}
              onSave={handleSaveTool}
              onCancel={() => setEditingTool(null)}
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
            Editor de Herramientas
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestiona las herramientas disponibles para tu agente
          </p>
        </div>
        <button
          onClick={handleAddTool}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
        >
          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nueva Herramienta
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar herramientas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>
        <div className="flex space-x-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ToolType)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">Todos los tipos</option>
            {toolTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.icon} {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTools.map(renderToolCard)}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No hay herramientas en esta categoría
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {searchTerm ? 'No se encontraron herramientas que coincidan con tu búsqueda' : 'Crea tu primera herramienta para esta categoría'}
          </p>
          <button
            onClick={handleAddTool}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
          >
            Crear Primera Herramienta
          </button>
        </div>
      )}

      {/* Tool Form Modal */}
      {renderToolForm()}
    </div>
  );
};

// Componente para el formulario de herramienta
interface ToolFormProps {
  tool: Tool;
  onSave: (tool: Tool) => void;
  onCancel: () => void;
}

const ToolForm: React.FC<ToolFormProps> = ({ tool, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Tool>(tool);
  const [newMessage, setNewMessage] = useState('');
  const [newExample, setNewExample] = useState('');

  const handleInputChange = (field: keyof Tool, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddMessage = () => {
    if (newMessage.trim()) {
      setFormData(prev => ({
        ...prev,
        messages: [...prev.messages, {
          type: 'request-start',
          content: newMessage.trim()
        }]
      }));
      setNewMessage('');
    }
  };

  const handleRemoveMessage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      messages: prev.messages.filter((_, i) => i !== index)
    }));
  };

  const handleAddExample = () => {
    if (newExample.trim()) {
      setFormData(prev => ({
        ...prev,
        usageExamples: [...prev.usageExamples, newExample.trim()]
      }));
      setNewExample('');
    }
  };

  const handleRemoveExample = (index: number) => {
    setFormData(prev => ({
      ...prev,
      usageExamples: prev.usageExamples.filter((_, i) => i !== index)
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
            Nombre de la Herramienta *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Tipo de Herramienta
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="function">Función</option>
            <option value="transferCall">Transferir Llamada</option>
            <option value="endCall">Finalizar Llamada</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Categoría
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="communication">Comunicación</option>
            <option value="data_collection">Recolección de Datos</option>
            <option value="business_logic">Lógica de Negocio</option>
            <option value="external_api">APIs Externas</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Complejidad
          </label>
          <select
            value={formData.complexity}
            onChange={(e) => handleInputChange('complexity', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="simple">Simple</option>
            <option value="medium">Medio</option>
            <option value="complex">Complejo</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Descripción *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
          placeholder="Describe qué hace esta herramienta..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Contexto de Negocio
        </label>
        <textarea
          value={formData.businessContext}
          onChange={(e) => handleInputChange('businessContext', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
          placeholder="Explica cuándo y por qué usar esta herramienta..."
        />
      </div>

      <div className="flex items-center space-x-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.async}
            onChange={(e) => handleInputChange('async', e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
            Ejecución asíncrona
          </span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Mensajes de la Herramienta
        </label>
        <div className="space-y-2">
          {formData.messages.map((message, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={message.content || ''}
                onChange={(e) => {
                  const newMessages = [...formData.messages];
                  newMessages[index] = { ...message, content: e.target.value };
                  handleInputChange('messages', newMessages);
                }}
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="Mensaje de la herramienta..."
              />
              <button
                type="button"
                onClick={() => handleRemoveMessage(index)}
                className="p-2 text-red-500 hover:text-red-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Agregar nuevo mensaje..."
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMessage())}
            />
            <button
              type="button"
              onClick={handleAddMessage}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Ejemplos de Uso
        </label>
        <div className="space-y-2">
          {formData.usageExamples.map((example, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md">
                {example}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveExample(index)}
                className="p-2 text-red-500 hover:text-red-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newExample}
              onChange={(e) => setNewExample(e.target.value)}
              placeholder="Agregar nuevo ejemplo..."
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExample())}
            />
            <button
              type="button"
              onClick={handleAddExample}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Agregar
            </button>
          </div>
        </div>
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
          Guardar Herramienta
        </button>
      </div>
    </form>
  );
};

export default ToolsEditor;
