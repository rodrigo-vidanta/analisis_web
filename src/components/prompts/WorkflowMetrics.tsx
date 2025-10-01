import React, { useState, useEffect } from 'react';
import { n8nService } from '../../services/n8nService';
import { promptsDbService } from '../../services/promptsDbService';
import { type WorkflowMetrics } from '../../config/supabaseSystemUI';

interface WorkflowMetricsProps {
  workflowId: string;
  workflowName: string;
}

const WorkflowMetricsComponent: React.FC<WorkflowMetricsProps> = ({
  workflowId,
  workflowName
}) => {
  const [metrics, setMetrics] = useState<WorkflowMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    loadMetrics();
  }, [workflowId, timeRange]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const result = await n8nService.getWorkflowMetrics(workflowId, timeRange);
      if (result.success && result.metrics) {
        setMetrics(result.metrics);
        
        // Guardar métricas en la BD
        await promptsDbService.updateWorkflowMetrics({
          workflow_id: workflowId,
          workflow_name: workflowName,
          ...result.metrics
        });
      }
    } catch (error) {
      console.error('Error cargando métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600 dark:text-green-400';
    if (rate >= 85) return 'text-yellow-600 dark:text-yellow-400';
    if (rate >= 70) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSuccessRateBg = (rate: number) => {
    if (rate >= 95) return 'bg-green-100 dark:bg-green-900/30';
    if (rate >= 85) return 'bg-yellow-100 dark:bg-yellow-900/30';
    if (rate >= 70) return 'bg-orange-100 dark:bg-orange-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 text-center">
        <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-slate-500 dark:text-slate-400">
          No hay métricas disponibles para este workflow
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Selector de rango temporal */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Métricas de Rendimiento
          </h3>
          
          <div className="flex items-center space-x-2">
            {[
              { value: 7, label: '7 días' },
              { value: 30, label: '30 días' },
              { value: 90, label: '90 días' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value as any)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  timeRange === option.value
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Tasa de éxito */}
        <div className={`p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${getSuccessRateBg(metrics.success_rate)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Tasa de Éxito</p>
              <p className={`text-2xl font-bold ${getSuccessRateColor(metrics.success_rate)}`}>
                {metrics.success_rate.toFixed(1)}%
              </p>
            </div>
            <div className={`p-3 rounded-full ${getSuccessRateBg(metrics.success_rate)}`}>
              <svg className={`w-6 h-6 ${getSuccessRateColor(metrics.success_rate)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total de ejecuciones */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Ejecuciones</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {metrics.total_executions.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Ejecuciones exitosas */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Exitosas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {metrics.successful_executions.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Ejecuciones fallidas */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Fallidas</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {metrics.failed_executions.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Información Detallada
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium text-slate-900 dark:text-white mb-2">Última Ejecución</h5>
            <p className="text-slate-600 dark:text-slate-400">
              {metrics.last_execution 
                ? new Date(metrics.last_execution).toLocaleString()
                : 'No disponible'
              }
            </p>
          </div>
          
          {metrics.avg_execution_time && (
            <div>
              <h5 className="font-medium text-slate-900 dark:text-white mb-2">Tiempo Promedio</h5>
              <p className="text-slate-600 dark:text-slate-400">
                {(metrics.avg_execution_time / 1000).toFixed(2)} segundos
              </p>
            </div>
          )}
        </div>

        {/* Barra de progreso de éxito */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Distribución de Resultados
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {metrics.total_executions} total
            </span>
          </div>
          
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
            <div 
              className="bg-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${metrics.success_rate}%` }}
            ></div>
          </div>
          
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-green-600 dark:text-green-400">
              {metrics.successful_executions} exitosas
            </span>
            <span className="text-red-600 dark:text-red-400">
              {metrics.failed_executions} fallidas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowMetricsComponent;
