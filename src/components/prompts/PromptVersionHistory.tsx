import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { promptsDbService } from '../../services/promptsDbService';
import { n8nLocalProxyService } from '../../services/n8nLocalProxyService';

interface PromptVersionHistoryProps {
  workflowId: string;
  workflowName: string;
  nodeId: string;
  onRestore?: (version: any) => void;
}

interface VersionEntry {
  id: string;
  version_number: number;
  prompt_content: string;
  vapi_config: any;
  tools_config: any;
  voice_config: any;
  transcriber_config: any;
  created_at: string;
  created_by: string;
  change_description: string;
  is_active: boolean;
  performance_score?: number;
  execution_count?: number;
}

const PromptVersionHistory: React.FC<PromptVersionHistoryProps> = ({
  workflowId,
  workflowName,
  nodeId,
  onRestore
}) => {
  const { user } = useAuth();
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<VersionEntry | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [compareVersions, setCompareVersions] = useState<[VersionEntry | null, VersionEntry | null]>([null, null]);

  useEffect(() => {
    loadVersionHistory();
  }, [workflowId, nodeId]);

  const loadVersionHistory = async () => {
    setLoading(true);
    try {
      // Temporalmente deshabilitado hasta crear las tablas en System_UI
      console.log('Historial de versiones temporalmente deshabilitado - tablas no creadas');
      setVersions([]);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const restoreVersion = async (version: VersionEntry) => {
    if (!user?.id) return;

    try {
      // Obtener el workflow actual
      const workflowResult = await n8nLocalProxyService.getWorkflow(workflowId);
      if (!workflowResult.success || !workflowResult.workflow) {
        throw new Error('No se pudo obtener el workflow');
      }

      // Restaurar la configuración VAPI completa
      const restoredConfig = {
        assistant: version.vapi_config?.assistant || {},
        voice: version.voice_config || {},
        transcriber: version.transcriber_config || {},
        tools: version.tools_config || []
      };

      // Actualizar en n8n
      const workflowData = workflowResult.workflow;
      const nodeIndex = workflowData.data.nodes.findIndex((n: any) => n.id === nodeId);
      
      if (nodeIndex !== -1) {
        const node = workflowData.data.nodes[nodeIndex];
        
        if (node.type === 'n8n-nodes-base.httpRequest') {
          const updatedJsonBody = JSON.stringify(restoredConfig, null, 2);
          workflowData.data.nodes[nodeIndex].parameters.jsonBody = `=${updatedJsonBody}`;
        } else if (node.type === 'n8n-nodes-base.respondToWebhook') {
          const updatedResponseBody = JSON.stringify(restoredConfig, null, 2);
          workflowData.data.nodes[nodeIndex].parameters.responseBody = `=${updatedResponseBody}`;
        }

        const updateResult = await n8nLocalProxyService.updateWorkflow(workflowId, workflowData.data);
        
        if (updateResult.success) {
          // Crear nueva versión activa
          await promptsDbService.savePromptVersion({
            workflow_id: workflowId,
            node_id: nodeId,
            version_number: Math.max(...versions.map(v => v.version_number)) + 1,
            prompt_content: version.prompt_content,
            vapi_config: version.vapi_config,
            tools_config: version.tools_config,
            voice_config: version.voice_config,
            transcriber_config: version.transcriber_config,
            created_by: user.id,
            change_description: `Restaurado desde versión ${version.version_number}`,
            is_active: true
          });

          alert('✅ Versión restaurada exitosamente!');
          onRestore?.(restoredConfig);
          loadVersionHistory();
        }
      }
    } catch (error) {
      console.error('Error restaurando versión:', error);
      alert(`❌ Error restaurando versión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChangeTypeIcon = (description: string) => {
    if (description.includes('Restaurado')) return '🔄';
    if (description.includes('Checkpoint')) return '📝';
    if (description.includes('Tools')) return '🔧';
    if (description.includes('Voice')) return '🎤';
    return '✏️';
  };

  const getPerformanceColor = (score?: number) => {
    if (!score) return 'text-slate-500';
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Historial de Versiones
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {workflowName} • {versions.length} versiones
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDiff(!showDiff)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showDiff
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {showDiff ? 'Ocultar Diff' : 'Comparar'}
            </button>
            
            <button
              onClick={loadVersionHistory}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {versions.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-500 dark:text-slate-400">
              No hay versiones guardadas aún
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  version.is_active
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : selectedVersion?.id === version.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg">
                        {getChangeTypeIcon(version.change_description)}
                      </span>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-slate-900 dark:text-white">
                            Versión {version.version_number}
                          </span>
                          
                          {version.is_active && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                              Activa
                            </span>
                          )}
                          
                          {version.performance_score && (
                            <span className={`text-sm font-medium ${getPerformanceColor(version.performance_score)}`}>
                              {version.performance_score}% éxito
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {version.change_description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{formatDate(version.created_at)}</span>
                      
                      {version.execution_count && (
                        <span>{version.execution_count} ejecuciones</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {showDiff && (
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (!compareVersions[0]) {
                              setCompareVersions([version, null]);
                            } else if (!compareVersions[1] && compareVersions[0].id !== version.id) {
                              setCompareVersions([compareVersions[0], version]);
                            }
                          } else {
                            if (compareVersions[0]?.id === version.id) {
                              setCompareVersions([compareVersions[1], null]);
                            } else if (compareVersions[1]?.id === version.id) {
                              setCompareVersions([compareVersions[0], null]);
                            }
                          }
                        }}
                        checked={compareVersions[0]?.id === version.id || compareVersions[1]?.id === version.id}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    )}
                    
                    <button
                      onClick={() => setSelectedVersion(selectedVersion?.id === version.id ? null : version)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    
                    {!version.is_active && (
                      <button
                        onClick={() => restoreVersion(version)}
                        className="px-3 py-1.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        Restaurar
                      </button>
                    )}
                  </div>
                </div>
                
                {selectedVersion?.id === version.id && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-white mb-2">Configuración VAPI</h4>
                        <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded text-xs overflow-x-auto">
                          {JSON.stringify(version.vapi_config, null, 2)}
                        </pre>
                      </div>
                      
                      {version.tools_config && (
                        <div>
                          <h4 className="font-medium text-slate-900 dark:text-white mb-2">Tools</h4>
                          <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded text-xs overflow-x-auto">
                            {JSON.stringify(version.tools_config, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {showDiff && compareVersions[0] && compareVersions[1] && (
          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
            <h4 className="font-medium text-slate-900 dark:text-white mb-3">
              Comparación: v{compareVersions[0].version_number} vs v{compareVersions[1].version_number}
            </h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Versión {compareVersions[0].version_number}
                </h5>
                <pre className="bg-white dark:bg-slate-800 p-3 rounded text-xs overflow-x-auto border">
                  {JSON.stringify(compareVersions[0].vapi_config, null, 2)}
                </pre>
              </div>
              
              <div>
                <h5 className="font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Versión {compareVersions[1].version_number}
                </h5>
                <pre className="bg-white dark:bg-slate-800 p-3 rounded text-xs overflow-x-auto border">
                  {JSON.stringify(compareVersions[1].vapi_config, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptVersionHistory;
