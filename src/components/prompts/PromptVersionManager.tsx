import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { promptsDbService } from '../../services/promptsDbService';
import { n8nService } from '../../services/n8nService';
import { type PromptVersion, type PromptChangeLog } from '../../config/supabaseSystemUI';

interface PromptVersionManagerProps {
  workflowId: string;
  workflowName: string;
  nodeId: string;
  nodeName: string;
  currentPrompt: string;
  onPromptUpdated?: () => void;
}

const PromptVersionManager: React.FC<PromptVersionManagerProps> = ({
  workflowId,
  workflowName,
  nodeId,
  nodeName,
  currentPrompt,
  onPromptUpdated
}) => {
  const { user } = useAuth();
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [changeLog, setChangeLog] = useState<PromptChangeLog[]>([]);
  const [newPrompt, setNewPrompt] = useState(currentPrompt);
  const [changeDescription, setChangeDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'versions' | 'history'>('edit');

  useEffect(() => {
    loadVersions();
    loadChangeLog();
  }, [workflowId, nodeId]);

  const loadVersions = async () => {
    try {
      const result = await promptsDbService.getPromptVersions(workflowId, nodeId);
      if (result.success && result.versions) {
        setVersions(result.versions);
      }
    } catch (error) {
      console.error('Error cargando versiones:', error);
    }
  };

  const loadChangeLog = async () => {
    try {
      const result = await promptsDbService.getPromptChangeLog();
      if (result.success && result.changes) {
        // Filtrar cambios relacionados con este prompt
        const relatedChanges = result.changes.filter(change => 
          versions.some(version => version.id === change.prompt_version_id)
        );
        setChangeLog(relatedChanges);
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
    }
  };

  const saveNewVersion = async () => {
    if (!user?.id || !newPrompt.trim() || !changeDescription.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      // Calcular nuevo número de versión
      const nextVersion = versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) + 1 : 1;

      // Guardar nueva versión
      const result = await promptsDbService.savePromptVersion({
        workflow_id: workflowId,
        workflow_name: workflowName,
        node_id: nodeId,
        node_name: nodeName,
        prompt_content: newPrompt,
        version_number: nextVersion,
        created_by: user.id,
        is_active: false, // Nueva versión inicia inactiva
        change_description: changeDescription
      });

      if (result.success) {
        alert('Nueva versión guardada exitosamente');
        setChangeDescription('');
        await loadVersions();
        onPromptUpdated?.();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error guardando versión:', error);
      alert('Error guardando nueva versión');
    } finally {
      setLoading(false);
    }
  };

  const activateVersion = async (versionId: string) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const result = await promptsDbService.activatePromptVersion(versionId, user.id);
      
      if (result.success) {
        alert('Versión activada exitosamente');
        await loadVersions();
        await loadChangeLog();
        onPromptUpdated?.();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error activando versión:', error);
      alert('Error activando versión');
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 75) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    if (score >= 75) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
    if (score >= 60) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {nodeName}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {versions.length} versiones • Workflow: {workflowName}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {versions.find(v => v.is_active) && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                getPerformanceBadge(versions.find(v => v.is_active)?.performance_score || 0)
              }`}>
                Score: {(versions.find(v => v.is_active)?.performance_score || 0).toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navegación */}
      <div className="px-6 pt-4">
        <nav className="flex space-x-8">
          {[
            { id: 'edit', label: 'Editor', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
            { id: 'versions', label: 'Versiones', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            { id: 'history', label: 'Historial', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
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

      {/* Contenido */}
      <div className="p-6">
        
        {/* Tab: Editor */}
        {activeTab === 'edit' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Contenido del Prompt
              </label>
              <textarea
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="Escribe o modifica el prompt aquí..."
                className="w-full h-64 p-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              />
              <div className="flex items-center justify-between mt-2 text-sm text-slate-500 dark:text-slate-400">
                <span>{newPrompt.length} caracteres</span>
                <span>Versión actual: {versions.find(v => v.is_active)?.version_number || 'Sin versión'}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Descripción del Cambio
              </label>
              <input
                type="text"
                value={changeDescription}
                onChange={(e) => setChangeDescription(e.target.value)}
                placeholder="Describe qué cambios realizaste..."
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={saveNewVersion}
                disabled={loading || !newPrompt.trim() || !changeDescription.trim()}
                className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span>Guardar Nueva Versión</span>
              </button>
              
              <button
                onClick={() => {
                  setNewPrompt(currentPrompt);
                  setChangeDescription('');
                }}
                className="px-4 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Resetear
              </button>
            </div>
          </div>
        )}

        {/* Tab: Versiones */}
        {activeTab === 'versions' && (
          <div className="space-y-4">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  version.is_active
                    ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      version.is_active
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      v{version.version_number}
                    </span>
                    
                    {version.is_active && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                        Activa
                      </span>
                    )}
                    
                    {version.performance_score !== undefined && (
                      <span className={`px-2 py-1 text-xs rounded-full ${getPerformanceBadge(version.performance_score)}`}>
                        {version.performance_score.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!version.is_active && (
                      <button
                        onClick={() => activateVersion(version.id)}
                        disabled={loading}
                        className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
                      >
                        Activar
                      </button>
                    )}
                    
                    <button
                      onClick={() => setNewPrompt(version.prompt_content)}
                      className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Usar como Base
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    {version.change_description || 'Sin descripción'}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                    <span>Creado: {new Date(version.created_at).toLocaleDateString()}</span>
                    {version.total_executions !== undefined && (
                      <span>Ejecuciones: {version.total_executions}</span>
                    )}
                    {version.success_rate !== undefined && (
                      <span>Éxito: {version.success_rate.toFixed(1)}%</span>
                    )}
                  </div>
                </div>

                <details className="group">
                  <summary className="cursor-pointer text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200">
                    Ver contenido completo
                  </summary>
                  <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-900 rounded-lg">
                    <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {version.prompt_content}
                    </pre>
                  </div>
                </details>
              </div>
            ))}

            {versions.length === 0 && (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-500 dark:text-slate-400">
                  No hay versiones guardadas para este prompt
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Historial */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {changeLog.map((change) => (
              <div
                key={change.id}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      change.change_type === 'create' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                      change.change_type === 'update' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                      change.change_type === 'activate' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' :
                      'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {change.change_type}
                    </span>
                    
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {change.change_description}
                    </span>
                  </div>
                  
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(change.changed_at).toLocaleString()}
                  </span>
                </div>

                {change.impact_score !== undefined && (
                  <div className="mt-2">
                    <span className={`text-sm ${getPerformanceColor(change.impact_score)}`}>
                      Impacto: {change.impact_score.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            ))}

            {changeLog.length === 0 && (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-slate-500 dark:text-slate-400">
                  No hay historial de cambios disponible
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default PromptVersionManager;
