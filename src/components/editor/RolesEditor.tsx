import React, { useState, useEffect } from 'react';
import { supabaseMainAdmin } from '../../config/supabase';
import type { AgentTemplate } from '../../config/supabase';

interface RolesEditorProps {
  template: AgentTemplate;
  onUpdate: (updates: Partial<AgentTemplate>) => void;
}

const RolesEditor: React.FC<RolesEditorProps> = ({ template, onUpdate }) => {
  const [systemPrompts, setSystemPrompts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [newPromptContent, setNewPromptContent] = useState('');

  useEffect(() => {
    loadSystemPrompts();
  }, [template]);

  const loadSystemPrompts = async () => {
    try {
      setIsLoading(true);
      
      // Cargar solo los prompts específicos de este agente
      const { data, error } = await supabaseMainAdmin
        .from('agent_prompts')
        .select(`
          *,
          system_prompts(*)
        `)
        .eq('agent_template_id', template.id)
        .order('order_index', { ascending: true });

      if (error) throw error;

      // Procesar los prompts del agente
      const agentPrompts = (data || []).map(ap => ({
        id: ap.id,
        name: ap.system_prompts?.name || 'Prompt sin nombre',
        content: ap.custom_content || ap.system_prompts?.content || '',
        description: ap.system_prompts?.description || '',
        orderIndex: ap.order_index,
        isCustomized: ap.is_customized,
        systemPromptId: ap.system_prompt_id
      }));

      setSystemPrompts(agentPrompts);
    } catch (error) {
      console.error('Error loading agent prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPrompt = (promptId: string, currentContent: string) => {
    setEditingPrompt(promptId);
    setNewPromptContent(currentContent);
  };

  const handleSavePrompt = async (promptId: string) => {
    try {
      // Actualizar el prompt en la base de datos
      const { error } = await supabaseMainAdmin
        .from('agent_prompts')
        .upsert({
          agent_template_id: template.id,
          system_prompt_id: promptId,
          custom_content: newPromptContent,
          is_customized: true,
          order_index: systemPrompts.findIndex(p => p.id === promptId)
        });

      if (error) throw error;

      // Actualizar el estado local
      setSystemPrompts(prev => 
        prev.map(p => 
          p.id === promptId 
            ? { ...p, customContent: newPromptContent, isCustomized: true }
            : p
        )
      );

      setEditingPrompt(null);
      setNewPromptContent('');
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Error al guardar el prompt');
    }
  };

  const handleAddNewPrompt = async () => {
    try {
      const { data, error } = await supabaseMainAdmin
        .from('system_prompts')
        .insert({
          title: 'Nuevo Prompt Personalizado',
          content: newPromptContent,
          role: 'system',
          category: 'custom',
          prompt_type: 'custom',
          keywords: [],
          applicable_categories: [template.category?.slug || ''],
          context_tags: [],
          order_priority: systemPrompts.length + 1,
          is_required: false,
          is_editable: true,
          variables: [],
          language: 'es',
          tested_scenarios: []
        })
        .select()
        .single();

      if (error) throw error;

      // Agregar a la plantilla
      const { error: agentPromptError } = await supabaseMainAdmin
        .from('agent_prompts')
        .insert({
          agent_template_id: template.id,
          system_prompt_id: data.id,
          custom_content: newPromptContent,
          is_customized: true,
          order_index: systemPrompts.length
        });

      if (agentPromptError) throw agentPromptError;

      setSystemPrompts(prev => [...prev, { ...data, isCustomized: true, customContent: newPromptContent }]);
      setNewPromptContent('');
    } catch (error) {
      console.error('Error adding new prompt:', error);
      alert('Error al agregar el nuevo prompt');
    }
  };

  const handleRemovePrompt = async (promptId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este prompt?')) return;

    try {
      const { error } = await supabaseMainAdmin
        .from('agent_prompts')
        .delete()
        .eq('agent_template_id', template.id)
        .eq('system_prompt_id', promptId);

      if (error) throw error;

      setSystemPrompts(prev => prev.filter(p => p.id !== promptId));
    } catch (error) {
      console.error('Error removing prompt:', error);
      alert('Error al eliminar el prompt');
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Roles y Prompts del Sistema
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona los mensajes del sistema que definen la personalidad y comportamiento del agente
            </p>
          </div>
          <button
            onClick={() => setNewPromptContent('')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            + Nuevo Prompt
          </button>
        </div>
      </div>

      {/* Lista de Prompts */}
      <div className="space-y-4">
        {systemPrompts.map((prompt, index) => (
          <div key={prompt.id} className="glass-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-sm">
                    #{index + 1}
                  </span>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {prompt.title}
                  </h4>
                  <span className={`px-2 py-1 rounded text-xs ${
                    prompt.category === 'identity' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                    prompt.category === 'workflow' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    prompt.category === 'communication' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {prompt.category}
                  </span>
                  {prompt.isCustomized && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded text-xs">
                      Personalizado
                    </span>
                  )}
                </div>
                
                {editingPrompt === prompt.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={newPromptContent}
                      onChange={(e) => setNewPromptContent(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Contenido del prompt..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSavePrompt(prompt.id)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => {
                          setEditingPrompt(null);
                          setNewPromptContent('');
                        }}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {prompt.customContent || prompt.content}
                      </pre>
                    </div>
                    
                    {prompt.variables && prompt.variables.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Variables:</span>
                        {prompt.variables.map((variable: string) => (
                          <span key={variable} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs">
                            {`{{${variable}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditPrompt(prompt.id, prompt.customContent || prompt.content)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleRemovePrompt(prompt.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nuevo Prompt */}
      {newPromptContent !== null && (
        <div className="glass-card p-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">
            Nuevo Prompt Personalizado
          </h4>
          <div className="space-y-3">
            <textarea
              value={newPromptContent}
              onChange={(e) => setNewPromptContent(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Escribe el contenido del nuevo prompt..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddNewPrompt}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Agregar Prompt
              </button>
              <button
                onClick={() => setNewPromptContent('')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesEditor;
