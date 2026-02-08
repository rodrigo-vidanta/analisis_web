import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Phone, User, Users, Trash2, PhoneForwarded, PhoneCall, Voicemail, PhoneMissed, PhoneOff, Calendar } from 'lucide-react';
import type { ScheduledCall } from '../../../services/scheduledCallsService';
import { ProspectAvatar } from '../../analysis/ProspectAvatar';
import { DeleteCallConfirmationModal } from '../../shared/DeleteCallConfirmationModal';
import { scheduledCallsService } from '../../../services/scheduledCallsService';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { analysisSupabase } from '../../../config/analysisSupabase';
import { classifyCallStatus, CALL_STATUS_CONFIG, type CallStatusGranular } from '../../../services/callStatusClassifier';

interface DailyViewProps {
  calls: ScheduledCall[];
  selectedDate: Date;
  onCallClick: (call: ScheduledCall) => void;
  onProspectClick?: (prospectoId: string) => void;
  onDateChange?: (date: Date) => void;
  showNavigation?: boolean;
  onCallDeleted?: () => void;
}

export const DailyView: React.FC<DailyViewProps> = ({
  calls,
  selectedDate,
  onCallClick,
  onProspectClick,
  showNavigation = true,
  onCallDeleted
}) => {
  const { user } = useAuth();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCallForDelete, setSelectedCallForDelete] = useState<ScheduledCall | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingCallId, setDeletingCallId] = useState<string | null>(null);
  // Filtrar llamadas del día seleccionado SIEMPRE en zona horaria de Guadalajara (America/Mexico_City, UTC-6)
  const dayCalls = useMemo(() => {
    // selectedDate viene del calendario y ya tiene el día correcto seleccionado
    // NO aplicar conversión a selectedDate, solo extraer año/mes/día
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();
    const selectedDay = selectedDate.getDate();
    
    // Filtrado de llamadas por fecha - silencioso
    
    // Para las llamadas (que vienen en UTC desde la BD), convertir a Guadalajara
    const filtered = calls.filter(call => {
      if (!call.fecha_programada) return false;
      
      // fecha_programada está en UTC, convertir a Guadalajara (UTC-6)
      const callDateUTC = new Date(call.fecha_programada);
      const mexicoTimestamp = callDateUTC.getTime() - (6 * 60 * 60 * 1000);
      const callDateMexico = new Date(mexicoTimestamp);
      
      // Extraer fecha en Guadalajara usando getUTC* (porque ya ajustamos el timestamp)
      const callYear = callDateMexico.getUTCFullYear();
      const callMonth = callDateMexico.getUTCMonth();
      const callDay = callDateMexico.getUTCDate();
      
      return callYear === selectedYear && 
             callMonth === selectedMonth && 
             callDay === selectedDay;
    });
    
    // Llamadas filtradas - silencioso
    
    return filtered.sort((a, b) => {
      const timeA = new Date(a.fecha_programada).getTime();
      const timeB = new Date(b.fecha_programada).getTime();
      return timeA - timeB;
    });
  }, [calls, selectedDate]);

  // Agrupar por hora (usando zona horaria local de Puerto Vallarta)
  const callsByHour = useMemo(() => {
    const grouped: Record<number, ScheduledCall[]> = {};
    
    dayCalls.forEach(call => {
      // Convertir a hora de México (UTC-6) consistente con el filtrado
      const callDate = new Date(call.fecha_programada);
      const mexicoTs = callDate.getTime() - (6 * 60 * 60 * 1000);
      const mexicoDate = new Date(mexicoTs);
      const hour = mexicoDate.getUTCHours();
      if (!grouped[hour]) {
        grouped[hour] = [];
      }
      grouped[hour].push(call);
    });

    return grouped;
  }, [dayCalls]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    // Formatear usando zona horaria de Puerto Vallarta (America/Mexico_City)
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Mexico_City'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Estado para almacenar el call_status real de llamadas ejecutadas
  const [callStatusMap, setCallStatusMap] = useState<Record<string, CallStatusGranular>>({});

  // Cargar call_status real de las llamadas ejecutadas
  useEffect(() => {
    const loadCallStatuses = async () => {
      const executedCalls = dayCalls.filter(c => 
        (c.estatus === 'ejecutada' || c.estatus === 'no_contesto' || c.estatus?.toLowerCase() === 'no contesto') && 
        c.llamada_ejecutada
      );
      
      if (executedCalls.length === 0) return;
      
      const callIds = executedCalls.map(c => c.llamada_ejecutada).filter(Boolean);
      
      try {
        const { data: callsData } = await analysisSupabase
          .from('llamadas_ventas')
          .select('call_id, call_status, duracion_segundos, audio_ruta_bucket, monitor_url, datos_llamada, fecha_llamada')
          .in('call_id', callIds);
        
        if (callsData) {
          const statusMap: Record<string, CallStatusGranular> = {};
          callsData.forEach(call => {
            const status = classifyCallStatus({
              call_id: call.call_id,
              call_status: call.call_status,
              fecha_llamada: call.fecha_llamada,
              duracion_segundos: call.duracion_segundos,
              audio_ruta_bucket: call.audio_ruta_bucket,
              monitor_url: call.monitor_url,
              datos_llamada: typeof call.datos_llamada === 'string' 
                ? JSON.parse(call.datos_llamada) 
                : call.datos_llamada
            });
            statusMap[call.call_id] = status;
          });
          setCallStatusMap(statusMap);
        }
      } catch (error) {
        console.error('Error loading call statuses:', error);
      }
    };
    
    loadCallStatuses();
  }, [dayCalls]);

  // Obtener estado visual para una llamada
  const getCallDisplayStatus = (call: ScheduledCall): { status: string; config: typeof CALL_STATUS_CONFIG[CallStatusGranular] } => {
    // Si está programada o cancelada, usar estado original
    if (call.estatus === 'programada') {
      return { 
        status: 'programada', 
        config: { 
          label: 'Programada', 
          color: 'bg-blue-500', 
          bgLight: 'bg-blue-100 dark:bg-blue-900/20',
          textColor: 'text-blue-700 dark:text-blue-300',
          description: 'Llamada pendiente de ejecutar'
        }
      };
    }
    if (call.estatus === 'cancelada') {
      return { 
        status: 'cancelada', 
        config: { 
          label: 'Cancelada', 
          color: 'bg-gray-500', 
          bgLight: 'bg-gray-100 dark:bg-gray-900/20',
          textColor: 'text-gray-700 dark:text-gray-300',
          description: 'Llamada cancelada'
        }
      };
    }
    
    // Si fue ejecutada, obtener estado real
    if (call.llamada_ejecutada && callStatusMap[call.llamada_ejecutada]) {
      const realStatus = callStatusMap[call.llamada_ejecutada];
      return { status: realStatus, config: CALL_STATUS_CONFIG[realStatus] };
    }
    
    // Fallback basado en estatus original
    if (call.estatus === 'ejecutada') {
      return { status: 'atendida', config: CALL_STATUS_CONFIG.atendida };
    }
    if (call.estatus === 'no_contesto' || call.estatus?.toLowerCase() === 'no contesto') {
      return { status: 'no_contestada', config: CALL_STATUS_CONFIG.no_contestada };
    }
    
    return { 
      status: call.estatus || 'desconocido', 
      config: { 
        label: call.estatus || 'Desconocido', 
        color: 'bg-gray-500', 
        bgLight: 'bg-gray-100 dark:bg-gray-900/20',
        textColor: 'text-gray-700 dark:text-gray-300',
        description: ''
      }
    };
  };

  // Icono según estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'programada':
        return <Calendar className="w-3.5 h-3.5" />;
      case 'transferida':
        return <PhoneForwarded className="w-3.5 h-3.5" />;
      case 'atendida':
        return <PhoneCall className="w-3.5 h-3.5" />;
      case 'buzon':
        return <Voicemail className="w-3.5 h-3.5" />;
      case 'no_contestada':
        return <PhoneMissed className="w-3.5 h-3.5" />;
      case 'perdida':
        return <PhoneOff className="w-3.5 h-3.5" />;
      default:
        return <Phone className="w-3.5 h-3.5" />;
    }
  };

  const getStatusColor = (estatus: string) => {
    switch (estatus) {
      case 'programada':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'ejecutada':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelada':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'no_contesto':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Horario laboral: 9am a 8pm (9-20)
  const hours = Array.from({ length: 12 }, (_, i) => i + 9);

  const handleDeleteClick = (e: React.MouseEvent, call: ScheduledCall) => {
    e.stopPropagation();
    setSelectedCallForDelete(call);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedCallForDelete) return;
    
    setIsDeleting(true);
    setDeletingCallId(selectedCallForDelete.id);
    
    try {
      await scheduledCallsService.deleteScheduledCall(
        selectedCallForDelete.id,
        {
          prospecto_id: selectedCallForDelete.prospecto,
          user_id: user?.id || null,
          justificacion: selectedCallForDelete.justificacion_llamada,
          fecha_programada: selectedCallForDelete.fecha_programada,
          customer_phone: selectedCallForDelete.prospecto_whatsapp,
          customer_name: selectedCallForDelete.prospecto_nombre,
          conversation_id: undefined
        }
      );
      
      toast.success('Llamada eliminada exitosamente');
      
      // Esperar a que termine la animación de éxito antes de cerrar
      setTimeout(() => {
        setDeleteModalOpen(false);
        setSelectedCallForDelete(null);
        setIsDeleting(false);
        setDeletingCallId(null);
        if (onCallDeleted) {
          onCallDeleted();
        }
      }, 1500);
    } catch (error: any) {
      console.error('Error eliminando llamada:', error);
      const errorMessage = error?.message || 'Error al eliminar la llamada';
      toast.error(errorMessage.includes('Timeout') ? 'El webhook tardó demasiado en responder (máximo 15 segundos)' : errorMessage);
      setIsDeleting(false);
      setDeletingCallId(null);
      throw error; // Re-lanzar para que el modal maneje el error
    }
  };

  const handleReprogram = () => {
    if (!selectedCallForDelete) return;
    setDeleteModalOpen(false);
    setSelectedCallForDelete(null);
    onCallClick(selectedCallForDelete);
  };

  return (
    <div className="w-full h-full p-6">
      <div className="relative">
        {/* Línea vertical del timeline */}
        <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/30 via-purple-500/30 to-transparent"></div>

        {/* Header del día */}
        <div className="mb-8 ml-20">
          <div className="flex items-center mb-2">
            <div className="w-16 h-px bg-gray-200 dark:bg-gray-700"></div>
            <div className="ml-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                {formatDate(selectedDate)}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {dayCalls.length} llamada{dayCalls.length !== 1 ? 's' : ''} programada{dayCalls.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline por horas */}
        {dayCalls.length === 0 ? (
          <div className="text-center py-24 ml-20">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p className="text-lg text-gray-600 dark:text-gray-400">
              No hay llamadas programadas para este día
            </p>
          </div>
        ) : (
          <div className="ml-20 space-y-12">
            {hours.map(hour => {
              const hourCalls = callsByHour[hour] || [];

              return (
                <motion.div
                  key={hour}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative"
                >
                  {/* Hora en la línea */}
                  <div className="absolute -left-12 top-0 flex items-center justify-center w-8 h-8">
                    <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800 shadow-lg z-10" />
                    <div className="absolute left-4 top-1/2 h-[1px] bg-gray-200 dark:bg-gray-700 w-4" />
                  </div>

                  {/* Etiqueta de hora */}
                  <div className="mb-4">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {String(hour).padStart(2, '0')}:00
                    </span>
                  </div>

                  {/* Cards de llamadas */}
                  {hourCalls.length > 0 && (
                    <div className="space-y-4">
                      {hourCalls.map((call, index) => {
                        const displayStatus = getCallDisplayStatus(call);
                        const isExecuted = call.estatus === 'ejecutada' || call.estatus === 'no_contesto' || call.estatus?.toLowerCase() === 'no contesto';
                        
                        // Colores para el gradiente de hover según estado real
                        const getHoverGradient = () => {
                          switch (displayStatus.status) {
                            case 'transferida':
                              return 'linear-gradient(to left, rgba(59, 130, 246, 0.25) 0%, rgba(59, 130, 246, 0.15) 30%, transparent 60%)'; // blue
                            case 'atendida':
                              return 'linear-gradient(to left, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.15) 30%, transparent 60%)'; // amber
                            case 'buzon':
                              return 'linear-gradient(to left, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.15) 30%, transparent 60%)'; // purple
                            case 'no_contestada':
                              return 'linear-gradient(to left, rgba(249, 115, 22, 0.25) 0%, rgba(249, 115, 22, 0.15) 30%, transparent 60%)'; // orange
                            case 'perdida':
                              return 'linear-gradient(to left, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.15) 30%, transparent 60%)'; // red
                            default:
                              return 'linear-gradient(to left, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.15) 30%, transparent 60%)'; // green
                          }
                        };
                        
                        return (
                        <motion.div
                          key={call.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => onCallClick(call)}
                          className="group cursor-pointer relative"
                        >
                          <div className="relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-lg bg-white dark:bg-gray-800 group">
                            {isExecuted && (
                              <div
                                className="absolute inset-0 rounded-xl pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform translate-x-full group-hover:translate-x-0"
                                style={{ background: getHoverGradient() }}
                              />
                            )}
                            <div className="p-4 relative z-0">
                              <div className="flex items-start gap-4">
                                {/* Avatar - Clickable para abrir sidebar */}
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onProspectClick) {
                                      onProspectClick(call.prospecto);
                                    }
                                  }}
                                  className="cursor-pointer"
                                >
                                  <ProspectAvatar
                                    nombreCompleto={call.prospecto_nombre}
                                    nombreWhatsapp={call.prospecto_nombre}
                                    size="md"
                                  />
                                </div>

                                {/* Información */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onProspectClick) {
                                          onProspectClick(call.prospecto);
                                        }
                                      }}
                                      className="text-base font-semibold text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    >
                                      {call.prospecto_nombre}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                      {(() => {
                                        const displayStatus = getCallDisplayStatus(call);
                                        return (
                                          <span 
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium relative z-30 ${displayStatus.config.bgLight} ${displayStatus.config.textColor}`}
                                            title={displayStatus.config.description}
                                          >
                                            {getStatusIcon(displayStatus.status)}
                                            {displayStatus.config.label}
                                          </span>
                                        );
                                      })()}
                                      {call.estatus === 'programada' && (
                                        <motion.button
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={(e) => handleDeleteClick(e, call)}
                                          disabled={deletingCallId === call.id}
                                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative z-30"
                                          title="Eliminar llamada programada"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </motion.button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-4 h-4" />
                                      <span className="font-medium">{formatTime(call.fecha_programada)}</span>
                                    </div>
                                    {call.prospecto_whatsapp && (
                                      <div className="flex items-center gap-1.5">
                                        <Phone className="w-4 h-4" />
                                        <span className="font-mono text-xs">{call.prospecto_whatsapp}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Asignación */}
                                  {(call.coordinacion_nombre || call.ejecutivo_nombre) && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {call.coordinacion_nombre && (
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                                          <Users className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                          <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                            {call.coordinacion_nombre}
                                          </span>
                                        </div>
                                      )}
                                      {call.ejecutivo_nombre && (
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                          <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                            {call.ejecutivo_nombre}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Justificación preview */}
                                  {call.justificacion_llamada && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                                      {call.justificacion_llamada}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      <DeleteCallConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalOpen(false);
            setSelectedCallForDelete(null);
          }
        }}
        call={selectedCallForDelete}
        onDelete={handleDelete}
        onReprogram={handleReprogram}
        isDeleting={isDeleting}
      />
    </div>
  );
};

