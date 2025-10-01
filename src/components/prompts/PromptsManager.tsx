import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { n8nService } from '../../services/n8nService';
import { promptsDbService } from '../../services/promptsDbService';
import { type PromptVersion, type WorkflowMetrics } from '../../config/supabaseSystemUI';

interface WorkflowWithPrompts {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
  prompts: any[];
  metrics?: WorkflowMetrics;
}

const PromptsManager: React.FC = () => {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowWithPrompts[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowWithPrompts | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'workflows' | 'versions' | 'metrics'>('workflows');

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      // Buscar workflows específicos de VAPI
      const vapiWorkflows = await n8nService.searchWorkflows('vapi');
      const nataliaWorkflows = await n8nService.searchWorkflows('natalia');
      
      if (vapiWorkflows.success && nataliaWorkflows.success) {
        const allWorkflows = [
          ...(vapiWorkflows.workflows || []),
          ...(nataliaWorkflows.workflows || [])
        ];

        // Eliminar duplicados
        const uniqueWorkflows = allWorkflows.filter((workflow, index, self) => 
          index === self.findIndex(w => w.id === workflow.id)
        );

        // Procesar workflows y extraer prompts
        const processedWorkflows = await Promise.all(
          uniqueWorkflows.map(async (workflow) => {
            const prompts = n8nService.extractPromptsFromWorkflow(workflow);
            
            // Obtener métricas
            const metricsResult = await n8nService.getWorkflowMetrics(workflow.id);
            
            return {
              id: workflow.id,
              name: workflow.name,
              active: workflow.active,
              tags: workflow.tags || [],
              prompts,
              metrics: metricsResult.success ? metricsResult.metrics : undefined
            };
          })
        );

        setWorkflows(processedWorkflows);
      }
    } catch (error) {
      console.error('Error cargando workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPromptVersions = async (workflowId: string, nodeId: string) => {
    try {
      const result = await promptsDbService.getPromptVersions(workflowId, nodeId);
      if (result.success && result.versions) {
        setPromptVersions(result.versions);
      }
    } catch (error) {
      console.error('Error cargando versiones:', error);
    }
  };

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workflow.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Cargando workflows de n8n...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Administración de Prompts
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Control de versiones y métricas para workflows de n8n
              </p>
            </div>
            
            <button
              onClick={loadWorkflows}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Navegación */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'workflows', label: 'Workflows', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
              { id: 'versions', label: 'Versiones', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { id: 'metrics', label: 'Métricas', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Buscador */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar workflows por nombre o tags..."
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Contenido principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Panel izquierdo: Lista de workflows */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Workflows VAPI ({filteredWorkflows.length})
                </h3>
              </div>
              
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {filteredWorkflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    onClick={() => setSelectedWorkflow(workflow)}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedWorkflow?.id === workflow.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
                        : 'bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                        {workflow.name}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          workflow.active ? 'bg-green-500' : 'bg-slate-400'
                        }`}></div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {workflow.prompts.length} prompts
                        </span>
                      </div>
                    </div>
                    
                    {workflow.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {workflow.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {workflow.tags.length > 3 && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            +{workflow.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {workflow.metrics && (
                      <div className="mt-2 flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                        <span>Éxito: {workflow.metrics.success_rate.toFixed(1)}%</span>
                        <span>Ejecuciones: {workflow.metrics.total_executions}</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {filteredWorkflows.length === 0 && (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-slate-500 dark:text-slate-400">
                      No se encontraron workflows VAPI
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panel derecho: Detalles del workflow seleccionado */}
          <div className="lg:col-span-2">
            {selectedWorkflow ? (
              <div className="space-y-6">
                
                {/* Header del workflow */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {selectedWorkflow.name}
                      </h2>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            selectedWorkflow.active ? 'bg-green-500' : 'bg-slate-400'
                          }`}></div>
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {selectedWorkflow.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {selectedWorkflow.prompts.length} prompts detectados
                        </span>
                      </div>
                    </div>
                    
                    {selectedWorkflow.metrics && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                          {selectedWorkflow.metrics.success_rate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Tasa de éxito
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedWorkflow.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedWorkflow.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lista de prompts */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Prompts del Workflow
                    </h3>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {selectedWorkflow.prompts.map((prompt, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setSelectedPrompt(prompt);
                          loadPromptVersions(selectedWorkflow.id, prompt.node_id);
                        }}
                        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedPrompt?.node_id === prompt.node_id
                            ? 'bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600'
                            : 'bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-white">
                              {prompt.node_name}
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {prompt.node_type} • {prompt.parameter_key}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                              v{promptVersions.find(v => v.node_id === prompt.node_id && v.is_active)?.version_number || 1}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                          {prompt.prompt_content}
                        </p>
                      </div>
                    ))}
                    
                    {selectedWorkflow.prompts.length === 0 && (
                      <div className="text-center py-8">
                        <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-slate-500 dark:text-slate-400">
                          No se detectaron prompts en este workflow
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  Selecciona un Workflow
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Elige un workflow de la lista para ver sus prompts y gestionar versiones
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PromptsManager;
