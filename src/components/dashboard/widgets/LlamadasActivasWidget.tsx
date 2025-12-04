/**
 * Widget de Llamadas Activas
 * Muestra llamadas activas ordenadas por checkpoint (más avanzadas primero)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Phone, ChevronRight, Loader2, TrendingUp } from 'lucide-react';
import { liveMonitorService, type LiveCallData } from '../../../services/liveMonitorService';
import { analysisSupabase } from '../../../config/analysisSupabase';
import { RedirectToLiveMonitor } from './RedirectToLiveMonitor';
import { notificationSoundService } from '../../../services/notificationSoundService';

interface LlamadasActivasWidgetProps {
  userId?: string;
}

// Función helper para obtener número de checkpoint
const getCheckpointNumber = (checkpoint?: string | number): number => {
  if (!checkpoint) return 0;
  if (typeof checkpoint === 'number') return checkpoint;
  
  const match = checkpoint.toString().match(/\d+/);
  return match ? parseInt(match[0]) : 0;
};

export const LlamadasActivasWidget: React.FC<LlamadasActivasWidgetProps> = ({ userId }) => {
  const [llamadas, setLlamadas] = useState<LiveCallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<LiveCallData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const channelRef = useRef<any>(null);
  const processedCallsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  const loadLlamadas = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await liveMonitorService.getActiveCalls(userId);
      
      // Filtrar SOLO llamadas activas (excluir finalizadas, transferidas, perdidas)
      const soloActivas = data.filter(call => call.call_status === 'activa');
      
      // Ordenar por checkpoint (más avanzadas primero)
      const sorted = soloActivas.sort((a, b) => {
        const checkpointA = getCheckpointNumber(a.checkpoint_venta_actual);
        const checkpointB = getCheckpointNumber(b.checkpoint_venta_actual);
        return checkpointB - checkpointA; // Mayor checkpoint primero
      });

      const top5 = sorted.slice(0, 5);
      
      // Marcar todas las llamadas iniciales como procesadas para evitar sonidos en carga inicial
      if (isInitialLoadRef.current) {
        top5.forEach(call => {
          if (call.call_id) processedCallsRef.current.add(call.call_id);
        });
        isInitialLoadRef.current = false;
      }
      
      setLlamadas(top5);
    } catch (error) {
      setLlamadas([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadLlamadas();
    
    // Suscripción realtime a llamadas_ventas (escuchar todos los cambios)
    const channel = analysisSupabase
      .channel(`llamadas-activas-dashboard-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'llamadas_ventas'
        },
        (payload) => {
          const newCall = payload.new as any;
          // Solo recargar si la nueva llamada es activa y no ha sido procesada antes
          if (newCall?.call_status === 'activa' && newCall?.call_id && !processedCallsRef.current.has(newCall.call_id)) {
            processedCallsRef.current.add(newCall.call_id);
            // Reproducir sonido de notificación
            notificationSoundService.playNotification('call');
            loadLlamadas();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'llamadas_ventas'
        },
        (payload) => {
          const newCall = payload.new as any;
          const oldCall = payload.old as any;
          
          // Si cambió el estado de activa a otra cosa, o viceversa, recargar
          if ((oldCall?.call_status === 'activa' && newCall?.call_status !== 'activa') ||
              (oldCall?.call_status !== 'activa' && newCall?.call_status === 'activa')) {
            // Reproducir sonido solo si se convirtió en activa (nueva llamada activa) y no ha sido procesada antes
            if (oldCall?.call_status !== 'activa' && newCall?.call_status === 'activa' && 
                newCall?.call_id && !processedCallsRef.current.has(newCall.call_id)) {
              processedCallsRef.current.add(newCall.call_id);
              notificationSoundService.playNotification('call');
            }
            loadLlamadas();
          }
          // Si sigue siendo activa pero cambió checkpoint u otros datos importantes, actualizar sin recargar todo
          else if (newCall?.call_status === 'activa') {
            setLlamadas(prev => {
              const exists = prev.find(c => c.call_id === newCall.call_id);
              if (exists) {
                // Actualizar llamada existente sin recargar todo
                const updated = prev.map(c => 
                  c.call_id === newCall.call_id 
                    ? { ...c, ...newCall, checkpoint_venta_actual: newCall.checkpoint_venta_actual }
                    : c
                ).filter(c => c.call_status === 'activa')
                .sort((a, b) => {
                  const checkpointA = getCheckpointNumber(a.checkpoint_venta_actual);
                  const checkpointB = getCheckpointNumber(b.checkpoint_venta_actual);
                  return checkpointB - checkpointA;
                });
                return updated.slice(0, 5);
              } else {
                // Agregar nueva llamada activa sin recargar todo
                const updated = [...prev, newCall as LiveCallData]
                  .filter(c => c.call_status === 'activa')
                  .sort((a, b) => {
                    const checkpointA = getCheckpointNumber(a.checkpoint_venta_actual);
                    const checkpointB = getCheckpointNumber(b.checkpoint_venta_actual);
                    return checkpointB - checkpointA;
                  });
                return updated.slice(0, 5);
              }
            });
          }
          // Si dejó de ser activa, removerla sin recargar todo
          else if (oldCall?.call_status === 'activa' && newCall?.call_status !== 'activa') {
            setLlamadas(prev => prev.filter(c => c.call_id !== newCall.call_id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [userId, loadLlamadas]);

  const formatCheckpoint = (checkpoint?: string | number): string => {
    if (!checkpoint) return 'Sin checkpoint';
    if (typeof checkpoint === 'number') return `Checkpoint ${checkpoint}`;
    return checkpoint.toString();
  };

  const handleCallClick = (llamada: LiveCallData) => {
    setSelectedCall(llamada);
    setShowModal(true);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-500" />
              Llamadas Activas
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
              <Phone className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No hay llamadas activas
              </p>
            </div>
          ) : (
            llamadas.map((llamada, index) => (
              <motion.div
                key={llamada.call_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleCallClick(llamada)}
                className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {llamada.nombre_completo || llamada.nombre_whatsapp || 'Sin nombre'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                        <TrendingUp className="w-3 h-3" />
                        {formatCheckpoint(llamada.checkpoint_venta_actual)}
                      </span>
                    </div>
                    {llamada.destino_preferido && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Destino: {Array.isArray(llamada.destino_preferido) 
                          ? llamada.destino_preferido.join(', ')
                          : llamada.destino_preferido}
                      </p>
                    )}
                    {llamada.tamano_grupo && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Grupo: {llamada.tamano_grupo} personas
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Redirigir a LiveMonitor al hacer clic */}
      {selectedCall && showModal && (
        <RedirectToLiveMonitor callId={selectedCall.call_id} onClose={() => {
          setShowModal(false);
          setSelectedCall(null);
        }} />
      )}
    </>
  );
};
