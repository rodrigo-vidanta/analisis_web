import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, User, Users, Trash2 } from 'lucide-react';
import type { ScheduledCall } from '../../../services/scheduledCallsService';
import { DeleteCallConfirmationModal } from '../../shared/DeleteCallConfirmationModal';
import { scheduledCallsService } from '../../../services/scheduledCallsService';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface WeeklyViewProps {
  calls: ScheduledCall[];
  selectedDate: Date;
  onCallClick: (call: ScheduledCall) => void;
  onProspectClick?: (prospectoId: string) => void;
  onCallDeleted?: () => void;
}

export const WeeklyView: React.FC<WeeklyViewProps> = ({
  calls,
  selectedDate,
  onCallClick,
  onProspectClick,
  onCallDeleted
}) => {
  const { user } = useAuth();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCallForDelete, setSelectedCallForDelete] = useState<ScheduledCall | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingCallId, setDeletingCallId] = useState<string | null>(null);

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
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday
    startOfWeek.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  }, [selectedDate]);

  const callsByDay = useMemo(() => {
    const grouped: Record<string, ScheduledCall[]> = {};
    
    weekDays.forEach(day => {
      const dateString = day.toISOString().split('T')[0];
      grouped[dateString] = calls.filter(call => {
        const callDate = new Date(call.fecha_programada).toISOString().split('T')[0];
        return callDate === dateString;
      }).sort((a, b) => {
        const timeA = new Date(a.fecha_programada).getTime();
        const timeB = new Date(b.fecha_programada).getTime();
        return timeA - timeB;
      });
    });

    return grouped;
  }, [calls, weekDays]);

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('es-MX', { weekday: 'short' });
  };

  const formatDayNumber = (date: Date) => {
    return date.getDate();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getStatusColor = (estatus: string) => {
    switch (estatus) {
      case 'programada':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'ejecutada':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'no_contesto':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200 dark:border-gray-800';
    }
  };

  return (
    <div className="flex gap-1 sm:gap-1.5 md:gap-2 h-full px-1 sm:px-2 md:px-3 py-2 w-full">
        {weekDays.map((day, dayIndex) => {
          const dateString = day.toISOString().split('T')[0];
          const dayCalls = callsByDay[dateString] || [];
          const isTodayDate = isToday(day);

          return (
            <motion.div
              key={dateString}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dayIndex * 0.1 }}
              className="flex-shrink-0 w-[calc((100%-12px)/7)] sm:w-[calc((100%-24px)/7)] md:w-[calc((100%-36px)/7)] flex flex-col"
            >
              {/* Header de la columna - ultra compacto */}
              <div className={`mb-1 p-0.5 sm:p-1 rounded border flex-shrink-0 ${
                isTodayDate
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
              }`}>
                <div className="text-center">
                  <div className="text-[7px] sm:text-[8px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 leading-tight">
                    {formatDayName(day)}
                  </div>
                  <div className={`text-xs sm:text-sm md:text-base font-bold ${
                    isTodayDate
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {formatDayNumber(day)}
                  </div>
                  <div className="text-[7px] sm:text-[8px] text-gray-500 dark:text-gray-400">
                    {dayCalls.length}
                  </div>
                </div>
              </div>

              {/* Lista de llamadas */}
              <div className="flex-1 overflow-y-auto space-y-1 md:space-y-1.5 min-h-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`
                  .weekly-view-scroll::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                <div className="weekly-view-scroll">
                {dayCalls.length === 0 ? (
                  <div className="text-center py-3 text-gray-400 dark:text-gray-500 text-[9px] sm:text-[10px]">
                    Sin llamadas
                  </div>
                ) : (
                  dayCalls.map((call, index) => (
                    <motion.div
                      key={call.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => onCallClick(call)}
                      className="group cursor-pointer relative"
                    >
                      <div className="bg-white dark:bg-gray-800 rounded transition-colors transition-all duration-200 hover:shadow-sm p-0.5 sm:p-1 md:p-1.5 relative group">
                        {(call.estatus === 'ejecutada' || call.estatus === 'no_contesto' || call.estatus?.toLowerCase() === 'no contesto') && (
                          <div
                            className="absolute inset-0 rounded pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform translate-x-full group-hover:translate-x-0"
                            style={{
                              background: call.estatus === 'ejecutada'
                                ? 'linear-gradient(to left, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.15) 30%, transparent 60%)'
                                : 'linear-gradient(to left, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.15) 30%, transparent 60%)',
                            }}
                          />
                        )}
                        {/* Hora y estatus en una línea ultra compacta */}
                        <div className="flex items-center justify-between gap-0.5 mb-0.5 relative z-0">
                          <div className="flex items-center gap-0.5 min-w-0 flex-1">
                            <Clock className="w-1.5 h-1.5 sm:w-2 sm:h-2 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                            <span className="text-[8px] sm:text-[9px] font-medium text-gray-900 dark:text-white truncate">
                              {formatTime(call.fecha_programada)}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <span className={`inline-flex items-center px-0.5 py-0.5 rounded text-[7px] sm:text-[8px] font-medium border flex-shrink-0 relative z-30 ${getStatusColor(call.estatus)}`}>
                              {call.estatus === 'programada' ? 'P' : call.estatus === 'ejecutada' ? 'E' : call.estatus === 'cancelada' ? 'C' : 'N'}
                            </span>
                            {call.estatus === 'programada' && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => handleDeleteClick(e, call)}
                                disabled={deletingCallId === call.id}
                                className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative z-30 flex-shrink-0"
                                title="Eliminar llamada programada"
                              >
                                <Trash2 className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                              </motion.button>
                            )}
                          </div>
                        </div>

                        {/* Nombre del prospecto - ultra compacto - Clickable */}
                        <h4
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onProspectClick) {
                              onProspectClick(call.prospecto);
                            }
                          }}
                          className="text-[8px] sm:text-[9px] md:text-[10px] font-semibold text-gray-900 dark:text-white truncate leading-tight cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {call.prospecto_nombre}
                        </h4>
                      </div>
                    </motion.div>
                  ))
                )}
                </div>
              </div>
            </motion.div>
          );
        })}

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

