import React, { useState, useEffect } from 'react';
import { liveMonitorOptimizedService, type LiveMonitorViewData } from '../../services/liveMonitorOptimizedService';
import { useTheme } from '../../hooks/useTheme';

/**
 * Ejemplo de componente usando la vista optimizada
 * Demuestra cómo usar el nuevo sistema sin JOINs manuales
 */
const LiveMonitorOptimizedExample: React.FC = () => {
  const [calls, setCalls] = useState<LiveMonitorViewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const { theme } = useTheme();

  // Cargar datos optimizados
  useEffect(() => {
    const loadOptimizedData = async () => {
      try {
        console.log('🚀 [EXAMPLE] Cargando datos desde vista optimizada...');
        
        // UNA SOLA consulta obtiene TODO
        const optimizedCalls = await liveMonitorOptimizedService.getOptimizedCalls(20);
        setCalls(optimizedCalls);
        
        // Estadísticas rápidas
        const quickStats = await liveMonitorOptimizedService.getQuickStats();
        setStats(quickStats);
        
        console.log('✅ [EXAMPLE] Datos cargados sin JOINs manuales');
      } catch (error) {
        console.error('❌ [EXAMPLE] Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOptimizedData();
  }, []);

  // Configurar realtime optimizado
  useEffect(() => {
    const setupRealtime = async () => {
      console.log('📡 [EXAMPLE] Configurando realtime optimizado...');
      
      const subscription = await liveMonitorOptimizedService.subscribeToChanges(
        (newCall) => {
          console.log('📨 [EXAMPLE] Nueva llamada:', newCall.call_id);
          setCalls(prev => [newCall, ...prev].slice(0, 20));
        },
        (updatedCall) => {
          console.log('🔄 [EXAMPLE] Llamada actualizada:', updatedCall.call_id);
          setCalls(prev => 
            prev.map(call => 
              call.call_id === updatedCall.call_id ? updatedCall : call
            )
          );
        },
        (deletedCallId) => {
          console.log('🗑️ [EXAMPLE] Llamada eliminada:', deletedCallId);
          setCalls(prev => prev.filter(call => call.call_id !== deletedCallId));
        }
      );

      return () => {
        try {
          subscription?.unsubscribe?.();
        } catch (e) {
          console.warn('Warning al desconectar realtime:', e);
        }
      };
    };

    if (!loading) {
      setupRealtime();
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando vista optimizada...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          🚀 Live Monitor Optimizado - Ejemplo
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Datos obtenidos desde vista optimizada sin JOINs manuales
        </p>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.activas}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Realmente Activas
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.perdidas}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Perdidas
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.transferidas}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Transferidas
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.finalizadas}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Finalizadas
            </div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.reclasificadas}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Auto-corregidas
            </div>
          </div>
        </div>
      )}

      {/* Lista de llamadas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Últimas 20 Llamadas - Vista Optimizada
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Prospecto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Estado BD → Inteligente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Checkpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tiempo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Razón
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {calls.map((call) => (
                <tr key={call.call_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {call.nombre_completo || call.nombre_whatsapp}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {call.whatsapp}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        call.call_status_bd === 'activa' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {call.call_status_bd}
                      </span>
                      {call.call_status_bd !== call.call_status_inteligente && (
                        <>
                          <span>→</span>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            call.call_status_inteligente === 'activa' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : call.call_status_inteligente === 'perdida'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          }`}>
                            {call.call_status_inteligente}
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {call.checkpoint_venta_actual || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {Math.round(call.minutos_transcurridos || 0)} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {call.razon_finalizacion || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer informativo */}
      <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        <p>
          💡 <strong>Nota:</strong> Este componente usa la vista optimizada <code>live_monitor_view</code> 
          que combina automáticamente datos de <code>llamadas_ventas</code> y <code>prospectos</code> 
          con auto-clasificación inteligente de estados.
        </p>
        <p className="mt-2">
          ⚡ <strong>Performance:</strong> Sin JOINs manuales, sin lógica de reclasificación en frontend, 
          con realtime optimizado y estados automáticamente corregidos.
        </p>
      </div>
    </div>
  );
};

export default LiveMonitorOptimizedExample;
