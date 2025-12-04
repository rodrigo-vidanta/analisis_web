/**
 * Widget de Llamadas Programadas
 * Muestra llamadas programadas del día actual asignadas al usuario
 * Con suscripciones realtime para actualizaciones en tiempo real
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const channelRef = useRef<any>(null);

  const loadLlamadas = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setLlamadas([]);
      return;
    }

    try {
      // No mostrar loading en recargas por realtime para evitar parpadeos
      if (llamadas.length === 0) {
        setLoading(true);
      }
      
      // Usar el servicio igual que ScheduledCallsManager - obtener todas y filtrar después
      const allData = await scheduledCallsService.getScheduledCalls(userId, {
        estatus: 'all' // Obtener todas y filtrar después (igual que ScheduledCallsManager)
      });

      if (!allData || allData.length === 0) {
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

      // Ordenar por hora (más tempranas primero) - igual que DailyView
      const sorted = delDiaActual.sort((a, b) => {
        const timeA = new Date(a.fecha_programada).getTime();
        const timeB = new Date(b.fecha_programada).getTime();
        return timeA - timeB;
      });

      setLlamadas(sorted.slice(0, 5)); // Solo mostrar 5
    } catch (error: any) {
      // Si es un error de permisos, mostrar array vacío
      setLlamadas([]);
    } finally {
      setLoading(false);
    }
  }, [userId, llamadas.length]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadLlamadas();
    
    // Suscripción realtime mejorada
    const channel = analysisSupabase
      .channel(`llamadas-programadas-dashboard-${Date.now()}`)
      // Escuchar INSERT de nuevas llamadas programadas
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'llamadas_programadas'
        },
        (payload) => {
          const newCall = payload.new as any;
          
          // Verificar si es del día actual y está programada
          const hoy = new Date().toISOString().split('T')[0];
          const callDate = new Date(newCall.fecha_programada).toISOString().split('T')[0];
          
          // Verificar si está asignada al usuario actual (si hay userId)
          const isAssignedToUser = !userId || 
            newCall.programada_por === userId || 
            newCall.ejecutivo_id === userId ||
            newCall.coordinacion_id === userId;
          
          if (callDate === hoy && newCall.estatus === 'programada' && isAssignedToUser) {
            // Agregar directamente sin recargar toda la lista
            setLlamadas(prev => {
              // Verificar si ya existe (evitar duplicados)
              if (prev.find(c => c.id === newCall.id)) {
                return prev;
              }
              
              // Agregar y ordenar por hora
              const updated = [...prev, newCall].sort((a, b) => {
                const timeA = new Date(a.fecha_programada).getTime();
                const timeB = new Date(b.fecha_programada).getTime();
                return timeA - timeB;
              });
              
              // Mantener solo las 5 más tempranas
              return updated.slice(0, 5);
            });
          }
        }
      )
      // Escuchar UPDATE de cambios de estatus
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'llamadas_programadas'
        },
        (payload) => {
          const updatedCall = payload.new as any;
          const oldCall = payload.old as any;
          
          // Verificar si es del día actual
          const hoy = new Date().toISOString().split('T')[0];
          const callDate = new Date(updatedCall.fecha_programada).toISOString().split('T')[0];
          const isToday = callDate === hoy;
          
          // Verificar si está asignada al usuario actual
          const isAssignedToUser = !userId || 
            updatedCall.programada_por === userId || 
            updatedCall.ejecutivo_id === userId ||
            updatedCall.coordinacion_id === userId;
          
          // Si cambió el estatus o la fecha
          if (updatedCall.estatus !== oldCall.estatus || 
              updatedCall.fecha_programada !== oldCall.fecha_programada) {
            
            setLlamadas(prev => {
              const exists = prev.find(c => c.id === updatedCall.id);
              
              if (exists) {
                // Si ya no está programada o no es de hoy, removerla
                if (updatedCall.estatus !== 'programada' || !isToday || !isAssignedToUser) {
                  return prev.filter(c => c.id !== updatedCall.id);
                }
                // Actualizar la llamada y reordenar
                const updated = prev.map(c => c.id === updatedCall.id ? { ...c, ...updatedCall } : c);
                return updated.sort((a, b) => {
                  const timeA = new Date(a.fecha_programada).getTime();
                  const timeB = new Date(b.fecha_programada).getTime();
                  return timeA - timeB;
                }).slice(0, 5);
              }
              
              // Si no existe y ahora está programada para hoy y asignada al usuario, agregarla
              if (isToday && updatedCall.estatus === 'programada' && isAssignedToUser) {
                const updated = [...prev, updatedCall].sort((a, b) => {
                  const timeA = new Date(a.fecha_programada).getTime();
                  const timeB = new Date(b.fecha_programada).getTime();
                  return timeA - timeB;
                });
                return updated.slice(0, 5);
              }
              
              return prev;
            });
          } else {
            // Si solo cambió otro campo (no estatus ni fecha), actualizar sin reordenar
            setLlamadas(prev => {
              const exists = prev.find(c => c.id === updatedCall.id);
              if (exists) {
                return prev.map(c => c.id === updatedCall.id ? { ...c, ...updatedCall } : c);
              }
              return prev;
            });
          }
        }
      )
      // Escuchar DELETE
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'llamadas_programadas'
        },
        (payload) => {
          const deletedCall = payload.old as any;
          // Remover de la lista si existe
          setLlamadas(prev => prev.filter(c => c.id !== deletedCall.id));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscripción realtime activa para llamadas_programadas');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en suscripción realtime de llamadas_programadas');
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ Timeout en suscripción realtime de llamadas_programadas');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [userId, loadLlamadas]);

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
