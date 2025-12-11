import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Phone, User, Users, Trash2 } from 'lucide-react';
import type { ScheduledCall } from '../../../services/scheduledCallsService';
import { ProspectAvatar } from '../../analysis/ProspectAvatar';
import { DeleteCallConfirmationModal } from '../../shared/DeleteCallConfirmationModal';
import { scheduledCallsService } from '../../../services/scheduledCallsService';
import toast from 'react-hot-toast';

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCallForDelete, setSelectedCallForDelete] = useState<ScheduledCall | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingCallId, setDeletingCallId] = useState<string | null>(null);
  // Filtrar llamadas del día seleccionado usando zona horaria de Puerto Vallarta (America/Mexico_City, UTC-6)
  const dayCalls = useMemo(() => {
    // Obtener año, mes y día de la fecha seleccionada en zona horaria local
    const selectedDateLocal = new Date(selectedDate);
    const selectedYear = selectedDateLocal.getFullYear();
    const selectedMonth = selectedDateLocal.getMonth();
    const selectedDay = selectedDateLocal.getDate();
    
    // Crear fecha de inicio del día en zona horaria local (00:00:00)
    const startOfDayLocal = new Date(selectedYear, selectedMonth, selectedDay, 0, 0, 0, 0);
    // Crear fecha de fin del día en zona horaria local (23:59:59.999)
    const endOfDayLocal = new Date(selectedYear, selectedMonth, selectedDay, 23, 59, 59, 999);
    
    return calls
      .filter(call => {
        if (!call.fecha_programada) return false;
        
        // Convertir fecha programada (que viene en UTC desde la BD) a zona horaria local
        const callDate = new Date(call.fecha_programada);
        
        // Obtener año, mes y día de la fecha de la llamada en zona horaria local
        const callYear = callDate.getFullYear();
        const callMonth = callDate.getMonth();
        const callDay = callDate.getDate();
        
        // Comparar solo año, mes y día (ignorar hora)
        return callYear === selectedYear && 
               callMonth === selectedMonth && 
               callDay === selectedDay;
      })
      .sort((a, b) => {
        const timeA = new Date(a.fecha_programada).getTime();
        const timeB = new Date(b.fecha_programada).getTime();
        return timeA - timeB;
      });
  }, [calls, selectedDate]);

  // Agrupar por hora (usando zona horaria local de Puerto Vallarta)
  const callsByHour = useMemo(() => {
    const grouped: Record<number, ScheduledCall[]> = {};
    
    dayCalls.forEach(call => {
      // Convertir a hora local de Puerto Vallarta (UTC-6)
      const callDate = new Date(call.fecha_programada);
      // getHours() ya devuelve la hora en zona horaria local del navegador
      // Para Puerto Vallarta, necesitamos ajustar manualmente si el navegador no está en esa zona
      const hour = callDate.getHours();
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
      await scheduledCallsService.deleteScheduledCall(selectedCallForDelete.id);
      
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
    } catch (error) {
      console.error('Error eliminando llamada:', error);
      toast.error('Error al eliminar la llamada');
      setIsDeleting(false);
      setDeletingCallId(null);
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
                      {hourCalls.map((call, index) => (
                        <motion.div
                          key={call.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => onCallClick(call)}
                          className="group cursor-pointer relative"
                        >
                          <div className="relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-lg bg-white dark:bg-gray-800 group">
                            {(call.estatus === 'ejecutada' || call.estatus === 'no_contesto' || call.estatus?.toLowerCase() === 'no contesto') && (
                              <div
                                className="absolute inset-0 rounded-xl pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform translate-x-full group-hover:translate-x-0"
                                style={{
                                  background: call.estatus === 'ejecutada'
                                    ? 'linear-gradient(to left, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.15) 30%, transparent 60%)'
                                    : 'linear-gradient(to left, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.15) 30%, transparent 60%)',
                                }}
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
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium relative z-30 ${getStatusColor(call.estatus)}`}>
                                        {call.estatus}
                                      </span>
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
                      ))}
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

