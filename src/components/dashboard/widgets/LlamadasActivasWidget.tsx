/**
 * Widget de Llamadas Activas
 * Muestra llamadas activas ordenadas por checkpoint (más avanzadas primero)
 * Con modal de detalle y suscripciones realtime
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Phone, ChevronRight, Loader2, TrendingUp, Users, MapPin, Sparkles, Heart, Plane } from 'lucide-react';
import { liveMonitorService, type LiveCallData } from '../../../services/liveMonitorService';
import { analysisSupabase } from '../../../config/analysisSupabase';
import { ActiveCallDetailModal } from './ActiveCallDetailModal';
import { notificationSoundService } from '../../../services/notificationSoundService';
import { systemNotificationService } from '../../../services/systemNotificationService';
import { classifyCallStatus, isCallReallyActive } from '../../../services/callStatusClassifier';

// Helper para parsear datos_proceso
const parseDatosProceso = (datos: any): any => {
  if (!datos) return {};
  try {
    return typeof datos === 'string' ? JSON.parse(datos) : datos;
  } catch {
    return {};
  }
};

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
      
      // Filtrar SOLO llamadas realmente activas usando el nuevo clasificador
      // Esto verifica: sin grabación, sin razón de finalización, sin fin_llamada, etc.
      const soloActivas = data.filter(call => {
        // Primero verificar el status de BD
        if (call.call_status !== 'activa') return false;
        
        // Luego usar el clasificador avanzado para confirmar que está realmente activa
        return isCallReallyActive({
          call_id: call.call_id,
          fecha_llamada: call.fecha_llamada,
          duracion_segundos: call.duracion_segundos,
          audio_ruta_bucket: call.audio_ruta_bucket,
          monitor_url: call.monitor_url,
          datos_llamada: call.datos_llamada
        });
      });
      
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
            
            // Mostrar notificación del sistema
            const prospectName = newCall.prospecto_nombre || newCall.customer_name || 'Prospecto';
            systemNotificationService.showCallNotification({
              prospectName,
              callStatus: newCall.call_status || 'En curso',
              callId: newCall.call_id,
              prospectId: newCall.prospecto
            });
            
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
              
              // Mostrar notificación del sistema
              const prospectName = newCall.prospecto_nombre || newCall.customer_name || 'Prospecto';
              systemNotificationService.showCallNotification({
                prospectName,
                callStatus: newCall.call_status || 'En curso',
                callId: newCall.call_id,
                prospectId: newCall.prospecto
              });
            }
            loadLlamadas();
          }
          // Si sigue siendo activa pero cambió checkpoint u otros datos importantes, actualizar sin recargar todo
          else if (newCall?.call_status === 'activa') {
            setLlamadas(prev => {
              const exists = prev.find(c => c.call_id === newCall.call_id);
              
              // Parsear datos_proceso con manejo de errores
              let datosProcesoActualizados = newCall.datos_proceso;
              if (typeof newCall.datos_proceso === 'string') {
                try {
                  datosProcesoActualizados = JSON.parse(newCall.datos_proceso);
                } catch (e) {
                  datosProcesoActualizados = exists?.datos_proceso || null;
                }
              }
              
              // Parsear datos_llamada con manejo de errores
              let datosLlamadaActualizados = newCall.datos_llamada;
              if (typeof newCall.datos_llamada === 'string') {
                try {
                  datosLlamadaActualizados = JSON.parse(newCall.datos_llamada);
                } catch (e) {
                  datosLlamadaActualizados = exists?.datos_llamada || null;
                }
              }
              
              // Extraer campos específicos de datos_proceso para actualización en tiempo real
              // (igual que LiveMonitorKanban - líneas 1401-1409)
              const composicionFamiliarNumero = datosProcesoActualizados?.numero_personas || 
                newCall.composicion_familiar_numero || 
                exists?.composicion_familiar_numero;
              
              const destinoPreferido = newCall.destino_preferido || 
                datosProcesoActualizados?.destino_preferencia || 
                exists?.destino_preferido;
              
              const tipoActividades = datosProcesoActualizados?.tipo_actividades || 
                exists?.tipo_actividades;
              
              const parsedCall = {
                ...newCall,
                datos_proceso: datosProcesoActualizados,
                datos_llamada: datosLlamadaActualizados,
                // Actualizar campos específicos de preferencias desde datos_proceso
                composicion_familiar_numero: composicionFamiliarNumero,
                destino_preferido: destinoPreferido,
                // Mantener otros campos existentes si no vienen en la actualización
                tamano_grupo: newCall.tamano_grupo || exists?.tamano_grupo,
                ciudad_residencia: newCall.ciudad_residencia || exists?.ciudad_residencia,
                nivel_interes: newCall.nivel_interes || exists?.nivel_interes,
                nivel_interes_detectado: newCall.nivel_interes_detectado || exists?.nivel_interes_detectado
              };
              
              if (exists) {
                // Actualizar llamada existente sin recargar todo
                // Usar clasificador centralizado para determinar si sigue activa
                const updated = prev.map(c => 
                  c.call_id === newCall.call_id 
                    ? { ...c, ...parsedCall }
                    : c
                ).filter(c => isCallReallyActive({
                  call_id: c.call_id,
                  fecha_llamada: c.fecha_llamada,
                  duracion_segundos: c.duracion_segundos,
                  audio_ruta_bucket: c.audio_ruta_bucket,
                  monitor_url: c.monitor_url,
                  datos_llamada: c.datos_llamada
                }))
                .sort((a, b) => {
                  const checkpointA = getCheckpointNumber(a.checkpoint_venta_actual);
                  const checkpointB = getCheckpointNumber(b.checkpoint_venta_actual);
                  return checkpointB - checkpointA;
                });
                return updated.slice(0, 5);
              } else {
                // Agregar nueva llamada activa sin recargar todo
                // Verificar con clasificador centralizado
                const updatedCall = parsedCall as LiveCallData;
                const isReallyActive = isCallReallyActive({
                  call_id: updatedCall.call_id,
                  fecha_llamada: updatedCall.fecha_llamada,
                  duracion_segundos: updatedCall.duracion_segundos,
                  audio_ruta_bucket: updatedCall.audio_ruta_bucket,
                  monitor_url: updatedCall.monitor_url,
                  datos_llamada: updatedCall.datos_llamada
                });
                
                if (!isReallyActive) return prev;
                
                const updated = [...prev, updatedCall]
                  .filter(c => isCallReallyActive({
                    call_id: c.call_id,
                    fecha_llamada: c.fecha_llamada,
                    duracion_segundos: c.duracion_segundos,
                    audio_ruta_bucket: c.audio_ruta_bucket,
                    monitor_url: c.monitor_url,
                    datos_llamada: c.datos_llamada
                  }))
                  .sort((a, b) => {
                    const checkpointA = getCheckpointNumber(a.checkpoint_venta_actual);
                    const checkpointB = getCheckpointNumber(b.checkpoint_venta_actual);
                    return checkpointB - checkpointA;
                  });
                return updated.slice(0, 5);
              }
            });
          }
          // Si dejó de ser activa o el clasificador determina que ya no está activa, removerla
          else if (oldCall?.call_status === 'activa' && newCall?.call_status !== 'activa') {
            setLlamadas(prev => prev.filter(c => c.call_id !== newCall.call_id));
          }
          // También verificar con el clasificador si la llamada ya terminó (aunque BD diga activa)
          else if (newCall?.call_status === 'activa') {
            const stillActive = isCallReallyActive({
              call_id: newCall.call_id,
              fecha_llamada: newCall.fecha_llamada,
              duracion_segundos: newCall.duracion_segundos,
              audio_ruta_bucket: newCall.audio_ruta_bucket,
              monitor_url: newCall.monitor_url,
              datos_llamada: typeof newCall.datos_llamada === 'string' 
                ? JSON.parse(newCall.datos_llamada) 
                : newCall.datos_llamada
            });
            
            if (!stillActive) {
              setLlamadas(prev => prev.filter(c => c.call_id !== newCall.call_id));
            }
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
            llamadas.map((llamada, index) => {
              // Parsear datos dinámicos de datos_proceso (igual que LiveMonitorKanban)
              const datosProceso = parseDatosProceso(llamada.datos_proceso);
              // Prioridad: datos_proceso.numero_personas > composicion_familiar_numero > tamano_grupo
              const numeroPersonas = datosProceso.numero_personas || 
                llamada.composicion_familiar_numero || 
                llamada.tamano_grupo;
              const actividades = datosProceso.tipo_actividades;
              // Prioridad: destino_preferido > datos_proceso.destino_preferencia > destino_preferencia
              const destino = llamada.destino_preferido || 
                datosProceso.destino_preferencia ||
                (Array.isArray(llamada.destino_preferencia) ? llamada.destino_preferencia[0] : llamada.destino_preferencia);
              const ciudad = llamada.ciudad_residencia;
              const nivelInteres = llamada.nivel_interes || llamada.nivel_interes_detectado;
              
              return (
                <motion.div
                  key={llamada.call_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleCallClick(llamada)}
                  className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800/50 hover:from-emerald-50 hover:to-white dark:hover:from-emerald-900/20 dark:hover:to-gray-800/50 cursor-pointer transition-all border border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-700 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Nombre y checkpoint */}
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {llamada.nombre_completo || llamada.nombre_whatsapp || 'Sin nombre'}
                        </p>
                        {/* Indicador pulsante de llamada activa */}
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0"></div>
                      </div>
                      
                      {/* Tags principales */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {/* Checkpoint */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                          <TrendingUp className="w-3 h-3" />
                          {formatCheckpoint(llamada.checkpoint_venta_actual)}
                        </span>
                        
                        {/* Nivel de Interés */}
                        {nivelInteres && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                            nivelInteres === 'Alto' || nivelInteres === 'MUY_ALTO'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : nivelInteres === 'Medio' || nivelInteres === 'MEDIO'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}>
                            <Heart className="w-3 h-3" />
                            {nivelInteres}
                          </span>
                        )}
                        
                        {/* Composición familiar */}
                        {numeroPersonas && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            <Users className="w-3 h-3" />
                            {numeroPersonas}p
                          </span>
                        )}
                      </div>
                      
                      {/* Información secundaria */}
                      <div className="space-y-1">
                        {/* Ciudad origen */}
                        {ciudad && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{ciudad}</span>
                          </div>
                        )}
                        
                        {/* Destino preferido */}
                        {destino && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <Plane className="w-3 h-3 flex-shrink-0 text-purple-500" />
                            <span className="truncate">{destino.replace('_', ' ')}</span>
                          </div>
                        )}
                        
                        {/* Actividades preferidas */}
                        {actividades && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <Sparkles className="w-3 h-3 flex-shrink-0 text-amber-500" />
                            <span className="truncate">{actividades}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 flex-shrink-0 ml-2 transition-colors" />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de detalle de llamada activa */}
      {selectedCall && (
        <ActiveCallDetailModal 
          call={selectedCall}
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedCall(null);
          }}
        />
      )}
    </>
  );
};
