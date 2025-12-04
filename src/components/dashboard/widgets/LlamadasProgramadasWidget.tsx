/**
 * Widget de Llamadas Programadas
 * Muestra TODAS las llamadas programadas del día actual
 * Independientemente de quién las agendó (bot o ejecutivo)
 * Con suscripciones realtime para actualizaciones en tiempo real
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { analysisSupabase } from '../../../config/analysisSupabase';
import { ManualCallModal } from '../../shared/ManualCallModal';
import { systemNotificationService } from '../../../services/systemNotificationService';

interface LlamadasProgramadasWidgetProps {
  userId?: string; // Mantenido para compatibilidad pero ya no se usa para filtrar
}

export const LlamadasProgramadasWidget: React.FC<LlamadasProgramadasWidgetProps> = ({ userId }) => {
  const [llamadas, setLlamadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState<any>(null);

  const loadLlamadas = useCallback(async () => {
    try {
      // No mostrar loading en recargas por realtime para evitar parpadeos
      if (llamadas.length === 0) {
        setLoading(true);
      }
      
      // Consultar directamente TODAS las llamadas programadas del día actual
      // Sin filtros de usuario - mostrar todas independientemente de quién las agendó
      // Usar comparación por fecha (solo día) para evitar problemas de zona horaria
      const hoy = new Date();
      const fechaHoy = hoy.toISOString().split('T')[0]; // Formato: YYYY-MM-DD
      
      // Obtener todas las llamadas programadas y filtrar por fecha después
      // Esto evita problemas de zona horaria al comparar timestamps
      const { data: callsData, error } = await analysisSupabase
        .from('llamadas_programadas')
        .select(`
          id,
          fecha_programada,
          prospecto,
          estatus,
          justificacion_llamada,
          creada,
          llamada_ejecutada,
          id_llamada_dynamics,
          programada_por_id,
          programada_por_nombre
        `)
        .eq('estatus', 'programada')
        .order('fecha_programada', { ascending: true });

      if (error) {
        console.error('❌ Error obteniendo llamadas programadas:', error);
        setLlamadas([]);
        return;
      }

      if (!callsData || callsData.length === 0) {
        setLlamadas([]);
        return;
      }

      // Filtrar por fecha del día actual (comparar solo la fecha, no la hora)
      // Esto maneja correctamente las zonas horarias
      const llamadasDelDia = callsData.filter(call => {
        if (!call.fecha_programada) {
          return false;
        }
        const callDate = new Date(call.fecha_programada);
        const callDateString = callDate.toISOString().split('T')[0];
        const matches = callDateString === fechaHoy;
        
        if (!matches) {
          console.log(`📅 [Widget] Llamada ${call.id} filtrada: fecha ${callDateString} !== hoy ${fechaHoy}`);
        }
        
        return matches;
      });
      
      console.log('📊 [Widget] Llamadas del día después de filtrar:', {
        totalObtenidas: callsData.length,
        delDia: llamadasDelDia.length,
        fechaHoy
      });

      if (llamadasDelDia.length === 0) {
        setLlamadas([]);
        return;
      }

      // Enriquecer con datos de prospectos
      const prospectoIds = [...new Set(llamadasDelDia.map(call => call.prospecto).filter(Boolean))];
      
      let prospectosMap = new Map();
      
      if (prospectoIds.length > 0) {
        const { data: prospectosData, error: prospectosError } = await analysisSupabase
          .from('prospectos')
          .select('id, nombre_completo, nombre_whatsapp, whatsapp')
          .in('id', prospectoIds);
        
        if (!prospectosError && prospectosData) {
          prospectosMap = new Map(
            prospectosData.map(p => [p.id, p])
          );
        }
      }

      // Mapear y enriquecer datos
      const enrichedCalls = llamadasDelDia.map(call => {
        const prospecto = prospectosMap.get(call.prospecto);
        return {
          ...call,
          prospecto_nombre: prospecto?.nombre_completo || prospecto?.nombre_whatsapp || null,
          prospecto_whatsapp: prospecto?.whatsapp || null
        };
      });
      setLlamadas(enrichedCalls.slice(0, 5)); // Solo mostrar 5
    } catch (error: any) {
      console.error('Error cargando llamadas programadas:', error);
      setLlamadas([]);
    } finally {
      setLoading(false);
    }
  }, [llamadas.length]);

  useEffect(() => {
    loadLlamadas();
    
    // Recarga automática cada 30 segundos como fallback si realtime no funciona
    const reloadInterval = setInterval(() => {
      console.log('🔄 [Widget] Recarga automática de llamadas programadas');
      loadLlamadas();
    }, 30000);
    
    // Suscripción realtime - mostrar TODAS las llamadas programadas sin filtros de usuario
    const channelName = `llamadas-programadas-dashboard-${Date.now()}`;
    console.log('🔌 [Widget] Creando canal realtime:', channelName);
    
    const channel = analysisSupabase
      .channel(channelName)
      // Escuchar INSERT de nuevas llamadas programadas
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'llamadas_programadas'
        },
        async (payload) => {
          const newCall = payload.new as any;
          console.log('🔔 [Widget] INSERT recibido:', {
            id: newCall.id,
            fecha_programada: newCall.fecha_programada,
            estatus: newCall.estatus,
            prospecto: newCall.prospecto
          });
          
          // Verificar si es del día actual y está programada (SIN filtros de usuario)
          // Usar comparación por fecha (solo día) para evitar problemas de zona horaria
          const hoy = new Date();
          const fechaHoy = hoy.toISOString().split('T')[0];
          
          if (!newCall.fecha_programada) {
            console.log('⚠️ [Widget] Llamada sin fecha_programada, ignorando');
            return;
          }
          
          const callDate = new Date(newCall.fecha_programada);
          const callDateString = callDate.toISOString().split('T')[0];
          const isToday = callDateString === fechaHoy;
          
          console.log('📅 [Widget] Comparación de fechas:', {
            fechaHoy,
            callDateString,
            isToday,
            estatus: newCall.estatus,
            cumpleCondiciones: isToday && newCall.estatus === 'programada'
          });
          
          if (isToday && newCall.estatus === 'programada') {
            // Enriquecer con datos de prospecto si es necesario
            let enrichedCall = newCall;
            if (newCall.prospecto) {
              try {
                const { data: prospectoData } = await analysisSupabase
                  .from('prospectos')
                  .select('id, nombre_completo, nombre_whatsapp, whatsapp')
                  .eq('id', newCall.prospecto)
                  .single();
                
                if (prospectoData) {
                  enrichedCall = {
                    ...newCall,
                    prospecto_nombre: prospectoData.nombre_completo || prospectoData.nombre_whatsapp || null,
                    prospecto_whatsapp: prospectoData.whatsapp || null
                  };
                }
              } catch (e) {
                // Si falla, usar el call sin enriquecer
              }
            }
            
            // Agregar directamente sin recargar toda la lista
            setLlamadas(prev => {
              // Verificar si ya existe (evitar duplicados)
              if (prev.find(c => c.id === enrichedCall.id)) {
                console.log('⚠️ [Widget] Llamada ya existe en la lista, ignorando duplicado');
                return prev;
              }
              
              console.log('✅ [Widget] Agregando llamada a la lista:', enrichedCall.id);
              
              // Mostrar notificación del sistema
              const prospectName = enrichedCall.prospecto_nombre || enrichedCall.prospecto_whatsapp || 'Prospecto';
              systemNotificationService.showScheduledCallNotification({
                prospectName,
                scheduledTime: enrichedCall.fecha_programada,
                callId: enrichedCall.id,
                prospectId: enrichedCall.prospecto
              });
              
              // Agregar y ordenar por hora
              const updated = [...prev, enrichedCall].sort((a, b) => {
                const timeA = new Date(a.fecha_programada).getTime();
                const timeB = new Date(b.fecha_programada).getTime();
                return timeA - timeB;
              });
              
              // Mantener solo las 5 más tempranas
              const result = updated.slice(0, 5);
              console.log('📋 [Widget] Total llamadas después de agregar:', result.length);
              return result;
            });
          } else {
            console.log('❌ [Widget] Llamada no cumple condiciones (no es hoy o no está programada)');
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
          
          // Verificar si es del día actual (SIN filtros de usuario)
          // Usar comparación por fecha (solo día) para evitar problemas de zona horaria
          const hoy = new Date();
          const fechaHoy = hoy.toISOString().split('T')[0];
          
          if (!updatedCall.fecha_programada) return;
          const callDate = new Date(updatedCall.fecha_programada);
          const callDateString = callDate.toISOString().split('T')[0];
          const isToday = callDateString === fechaHoy;
          
          // Si cambió el estatus o la fecha
          if (updatedCall.estatus !== oldCall.estatus || 
              updatedCall.fecha_programada !== oldCall.fecha_programada) {
            
            setLlamadas(prev => {
              const exists = prev.find(c => c.id === updatedCall.id);
              
              if (exists) {
                // Si ya no está programada o no es de hoy, removerla
                if (updatedCall.estatus !== 'programada' || !isToday) {
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
              
              // Si no existe y ahora está programada para hoy, agregarla (SIN filtros de usuario)
              if (isToday && updatedCall.estatus === 'programada') {
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
          // Remover de la lista si existe (SIN filtros de usuario)
          setLlamadas(prev => prev.filter(c => c.id !== deletedCall.id));
        }
      )
      .subscribe((status) => {
        console.log('📡 [Widget] Estado de suscripción realtime:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Widget] Suscripción realtime activa para llamadas_programadas');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [Widget] Error en suscripción realtime de llamadas_programadas');
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ [Widget] Timeout en suscripción realtime de llamadas_programadas');
        }
      });

    channelRef.current = channel;

    return () => {
      clearInterval(reloadInterval);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [loadLlamadas]);

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
              onClick={() => {
                setSelectedCall(llamada);
                setShowScheduleModal(true);
              }}
              className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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

      {/* Modal de Programar Llamada */}
      {selectedCall && (
        <ManualCallModal
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedCall(null);
          }}
          prospectoId={selectedCall.prospecto}
          prospectoNombre={selectedCall.prospecto_nombre || selectedCall.prospecto_whatsapp}
          onSuccess={() => {
            loadLlamadas();
            setShowScheduleModal(false);
            setSelectedCall(null);
          }}
        />
      )}
    </div>
  );
};
