/**
 * Widget de Llamadas Programadas
 * Muestra llamadas programadas del día actual asignadas al usuario
 * Basado en ScheduledCallsManager
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { scheduledCallsService } from '../../../services/scheduledCallsService';
import { analysisSupabase } from '../../../config/analysisSupabase';

interface LlamadasProgramadasWidgetProps {
  userId?: string;
}

export const LlamadasProgramadasWidget: React.FC<LlamadasProgramadasWidgetProps> = ({ userId }) => {
  const [llamadas, setLlamadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadLlamadas();
    
    // Suscripción realtime
    const channel = analysisSupabase
      .channel(`llamadas-programadas-dashboard-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'llamadas_programadas'
        },
        () => {
          loadLlamadas();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  const loadLlamadas = async () => {
    if (!userId) {
      setLoading(false);
      setLlamadas([]);
      return;
    }

    try {
      setLoading(true);
      
      // Usar el servicio igual que ScheduledCallsManager - obtener todas y filtrar después
      const allData = await scheduledCallsService.getScheduledCalls(userId, {
        estatus: 'all' // Obtener todas y filtrar después (igual que ScheduledCallsManager)
      });

      if (!allData || allData.length === 0) {
        console.log('📅 [LlamadasProgramadasWidget] No hay datos del servicio');
        setLlamadas([]);
        return;
      }

      // Filtrar solo las del día actual con estatus 'programada' - igual que DailyView
      const hoy = new Date();
      const dateString = hoy.toISOString().split('T')[0]; // Solo fecha sin hora
      
      const delDiaActual = allData.filter(call => {
        if (call.estatus !== 'programada') return false;
        const callDate = new Date(call.fecha_programada).toISOString().split('T')[0];
        return callDate === dateString;
      });

      console.log('📅 [LlamadasProgramadasWidget] Total llamadas:', allData.length);
      console.log('📅 [LlamadasProgramadasWidget] Llamadas del día:', delDiaActual.length);
      console.log('📅 [LlamadasProgramadasWidget] Fecha buscada:', dateString);

      // Ordenar por hora (más tempranas primero) - igual que DailyView
      const sorted = delDiaActual.sort((a, b) => {
        const timeA = new Date(a.fecha_programada).getTime();
        const timeB = new Date(b.fecha_programada).getTime();
        return timeA - timeB;
      });

      setLlamadas(sorted.slice(0, 5)); // Solo mostrar 5
    } catch (error: any) {
      console.error('Error cargando llamadas programadas:', error);
      // Si es un error de permisos, mostrar array vacío
      if (error?.status === 401 || error?.code === 'PGRST301') {
        console.warn('⚠️ Error de permisos al cargar llamadas programadas');
      }
      setLlamadas([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Llamadas Programadas
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {llamadas.length}
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : llamadas.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No hay llamadas programadas hoy
            </p>
          </div>
        ) : (
          llamadas.map((llamada, index) => (
            <motion.div
              key={llamada.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {llamada.prospecto_nombre || llamada.prospecto_whatsapp || 'Sin nombre'}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {formatTime(llamada.fecha_programada)}
                    </span>
                  </div>
                  {llamada.justificacion_llamada && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2">
                      {llamada.justificacion_llamada}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
