/**
 * Modal reutilizable para iniciar/programar llamadas manuales
 * Usado en LiveChat, LiveMonitor, Prospectos y otros módulos
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, MessageSquare, Calendar, Clock, AlertCircle, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { analysisSupabase } from '../../config/analysisSupabase';

interface ScheduledCall {
  id: string;
  prospecto: string;
  fecha_programada: string;
  motivo: string;
  estatus?: string;
}

interface ManualCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospectoId: string;
  prospectoNombre?: string;
  customerPhone?: string;
  customerName?: string;
  conversationId?: string;
  onSuccess?: () => void;
}

type ScheduleType = 'now' | 'scheduled';

export const ManualCallModal: React.FC<ManualCallModalProps> = ({
  isOpen,
  onClose,
  prospectoId,
  prospectoNombre,
  customerPhone,
  customerName,
  conversationId,
  onSuccess
}) => {
  const { user } = useAuth();
  const [justificacion, setJustificacion] = useState('Mejor momento de llamada');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ justificacion?: string; fecha?: string; hora?: string }>({});

  // Justificaciones predefinidas
  const justificacionesPredefinidas = [
    'Mejor momento de llamada',
    'Requerido por el ejecutivo',
    'Requerido por el cliente',
    'Seguimiento de venta'
  ];
  
  // Estados para manejar INSERT vs UPDATE
  const [action, setAction] = useState<'INSERT' | 'UPDATE'>('INSERT');
  const [existingCall, setExistingCall] = useState<ScheduledCall | null>(null);
  const [checkingExistingCall, setCheckingExistingCall] = useState(false);

  // Verificar si hay llamada programada existente al abrir el modal
  useEffect(() => {
    if (isOpen && prospectoId) {
      checkExistingScheduledCall();
    }
  }, [isOpen, prospectoId]);

  // Resetear formulario al abrir/cerrar
  useEffect(() => {
    if (!isOpen) {
      setJustificacion('Mejor momento de llamada');
      setScheduleType('now');
      setScheduledDate('');
      setScheduledTime('');
      setErrors({});
      setAction('INSERT');
      setExistingCall(null);
    }
  }, [isOpen]);

  // Función para verificar si hay una llamada programada pendiente
  const checkExistingScheduledCall = async () => {
    setCheckingExistingCall(true);
    try {
      // Consultar TODAS las llamadas programadas (sin filtrar por fecha)
      // para asegurarnos de encontrar cualquier llamada con estatus 'programada'
      const { data, error } = await analysisSupabase
        .from('llamadas_programadas')
        .select('*')
        .eq('prospecto', prospectoId)
        .eq('estatus', 'programada')
        .order('fecha_programada', { ascending: true });

      if (error) {
        console.error('❌ Error verificando llamada programada:', error);
        setAction('INSERT');
        setExistingCall(null);
        setCheckingExistingCall(false);
        return;
      }

      // Filtrar solo las que están en el futuro o son "ahora"
      const now = new Date();
      const futureCalls = (data || []).filter(call => {
        if (!call.fecha_programada) return true; // Si no tiene fecha, considerar válida
        const callDate = new Date(call.fecha_programada);
        return callDate >= now;
      });

      if (futureCalls.length > 0) {
        // Hay una llamada programada existente → modo UPDATE
        const existingCallData = futureCalls[0]; // Tomar la primera
        
        setAction('UPDATE');
        setExistingCall(existingCallData);
        
        // Cargar datos de la llamada existente en el formulario
        // Si la justificación existe en las predefinidas, usarla; si no, usar la primera por defecto
        const existingJustificacion = existingCallData.motivo || existingCallData.justificacion_llamada || '';
        setJustificacion(
          justificacionesPredefinidas.includes(existingJustificacion) 
            ? existingJustificacion 
            : 'Mejor momento de llamada'
        );
        
        // Si tiene fecha programada, cargarla
        if (existingCallData.fecha_programada) {
          const fechaProgramada = new Date(existingCallData.fecha_programada);
          const fechaStr = fechaProgramada.toISOString().split('T')[0];
          const horaStr = fechaProgramada.toTimeString().split(' ')[0].substring(0, 5);
          
          setScheduledDate(fechaStr);
          setScheduledTime(horaStr);
          setScheduleType('scheduled');
        } else {
          setScheduleType('now');
        }
      } else {
        // No hay llamada programada → modo INSERT
        setAction('INSERT');
        setExistingCall(null);
      }
    } catch (error) {
      console.error('❌ Error verificando llamada programada:', error);
      setAction('INSERT');
      setExistingCall(null);
    } finally {
      setCheckingExistingCall(false);
    }
  };

  // Validar horarios según día de la semana
  const isValidScheduleTime = (date: Date, time: string): boolean => {
    const dayOfWeek = date.getDay(); // 0 = domingo, 6 = sábado
    const [hours, minutes] = time.split(':').map(Number);
    const hour = hours + minutes / 60;

    // Lunes a Viernes (1-5): 9am - 9pm
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return hour >= 9 && hour <= 21;
    }
    
    // Sábado y Domingo (0, 6): 9am - 6pm
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return hour >= 9 && hour <= 18;
    }

    return false;
  };

  // Validar fecha seleccionada
  const validateScheduledDateTime = (): boolean => {
    const newErrors: { fecha?: string; hora?: string } = {};

    if (scheduleType === 'scheduled') {
      if (!scheduledDate) {
        newErrors.fecha = 'Debes seleccionar una fecha';
        setErrors(newErrors);
        return false;
      }

      if (!scheduledTime) {
        newErrors.hora = 'Debes seleccionar una hora';
        setErrors(newErrors);
        return false;
      }

      const selectedDate = new Date(`${scheduledDate}T${scheduledTime}`);
      const now = new Date();
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

      // No fechas en el pasado
      if (selectedDate < now) {
        newErrors.fecha = 'No puedes programar llamadas en el pasado';
        setErrors(newErrors);
        return false;
      }

      // Máximo 1 mes en el futuro
      if (selectedDate > oneMonthFromNow) {
        newErrors.fecha = 'No puedes programar llamadas más de 1 mes en el futuro';
        setErrors(newErrors);
        return false;
      }

      // Validar horarios según día de la semana
      if (!isValidScheduleTime(selectedDate, scheduledTime)) {
        const dayOfWeek = selectedDate.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          newErrors.hora = 'Lunes a Viernes: 9:00 AM - 9:00 PM';
        } else {
          newErrors.hora = 'Sábados y Domingos: 9:00 AM - 6:00 PM';
        }
        setErrors(newErrors);
        return false;
      }
    }

    setErrors(newErrors);
    return true;
  };

  const handleSubmit = async () => {
    // Validar justificación (obligatoria)
    if (!justificacion.trim()) {
      setErrors({ justificacion: 'Debes seleccionar una justificación' });
      toast.error('Debes seleccionar una justificación para la llamada');
      return;
    }

    // Validar fecha/hora si es programada
    if (scheduleType === 'scheduled' && !validateScheduledDateTime()) {
      return;
    }

    // Validación adicional: Si es INSERT, verificar nuevamente que no haya llamada programada
    if (action === 'INSERT') {
      try {
        const { data: checkData, error: checkError } = await analysisSupabase
          .from('llamadas_programadas')
          .select('id')
          .eq('prospecto', prospectoId)
          .eq('estatus', 'programada')
          .limit(1)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error verificando antes de insertar:', checkError);
        }

        if (checkData) {
          // Hay una llamada programada que no detectamos antes
          toast.error('Ya existe una llamada programada para este prospecto. Por favor, actualiza la existente.');
          // Recargar para cambiar a modo UPDATE
          await checkExistingScheduledCall();
          return;
        }
      } catch (error) {
        console.error('Error en validación final:', error);
        // Continuar con el INSERT si hay error en la validación
      }
    }

    setLoading(true);
    setErrors({});

    try {
      // Calcular timestamp
      let scheduledTimestamp: string;
      if (scheduleType === 'now') {
        scheduledTimestamp = new Date().toISOString();
      } else {
        scheduledTimestamp = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      // Construir payload
      const payload: any = {
        action: action, // 'INSERT' o 'UPDATE'
        prospecto_id: prospectoId,
        user_id: user?.id || null, // ID del usuario que programa la llamada
        justificacion: justificacion.trim(),
        scheduled_timestamp: scheduledTimestamp,
        schedule_type: scheduleType,
        customer_phone: customerPhone,
        customer_name: customerName || prospectoNombre,
        conversation_id: conversationId
      };

      // Si es UPDATE, agregar el ID de la llamada programada existente
      if (action === 'UPDATE' && existingCall?.id) {
        payload.llamada_programada_id = existingCall.id;
      }

      // Enviar al webhook
      const response = await fetch('https://primary-dev-d75a.up.railway.app/webhook/trigger-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Auth': 'wFRpkQv4cdmAg976dzEfTDML86vVlGLZmBUIMgftO0rkwhfJHkzVRuQa51W0tXTV'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Error desconocido');
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      // Éxito
      await response.json().catch(() => ({}));

      toast.success(
        action === 'UPDATE'
          ? 'Llamada programada actualizada exitosamente'
          : scheduleType === 'now' 
            ? 'Llamada iniciada exitosamente' 
            : 'Llamada programada exitosamente'
      );

      // Resetear y cerrar
      setJustificacion('Mejor momento de llamada');
      setScheduleType('now');
      setScheduledDate('');
      setScheduledTime('');
      setErrors({});
      
      onClose();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('❌ Error programando llamada:', error);
      toast.error(
        error instanceof Error 
          ? `Error: ${error.message}` 
          : 'Error al programar la llamada. Intenta nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Obtener fecha mínima (hoy) y máxima (1 mes desde hoy)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    return oneMonthFromNow.toISOString().split('T')[0];
  };

  // Obtener día de la semana de la fecha seleccionada
  const getSelectedDayOfWeek = () => {
    if (!scheduledDate) return null;
    const date = new Date(scheduledDate);
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  };

  const selectedDay = getSelectedDayOfWeek();
  const isWeekend = selectedDay === 'Sábado' || selectedDay === 'Domingo';
  const timeRange = isWeekend ? '9:00 AM - 6:00 PM' : '9:00 AM - 9:00 PM';

  // Renderizar el modal usando portal para asegurar que esté por encima de todo
  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="manual-call-modal-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
          onClick={() => {
            if (!loading) {
              onClose();
            }
          }}
        >
          <motion.div
            key="manual-call-modal-content"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <motion.h3
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
                  >
                    {checkingExistingCall ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full"
                        />
                        <span>Verificando...</span>
                      </>
                    ) : action === 'UPDATE' ? (
                      <>
                        <Edit className="w-6 h-6 text-purple-500" />
                        Actualizar Llamada Programada
                      </>
                    ) : (
                      <>
                        <Phone className="w-6 h-6 text-green-500" />
                        Iniciar Llamada
                      </>
                    )}
                  </motion.h3>
                  {prospectoNombre && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="text-sm text-gray-500 dark:text-gray-400 mt-1"
                    >
                      {prospectoNombre}
                    </motion.p>
                  )}
                  {action === 'UPDATE' && existingCall && !checkingExistingCall && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mt-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg"
                    >
                      <p className="text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2">
                        <AlertCircle className="w-3 h-3" />
                        Actualizando llamada programada existente
                      </p>
                    </motion.div>
                  )}
                </div>
                <motion.button
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.25 }}
                  onClick={onClose}
                  disabled={loading}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {checkingExistingCall ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Verificando llamadas programadas...
                  </p>
                </div>
              ) : (
              <div className="space-y-6">
                {/* Sección: Justificación */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Justificación
                    </h4>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <span>Selecciona una justificación *</span>
                    </label>
                    {justificacionesPredefinidas.map((justif, index) => (
                      <motion.button
                        key={justif}
                        type="button"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        onClick={() => {
                          setJustificacion(justif);
                          if (errors.justificacion) {
                            setErrors(prev => ({ ...prev, justificacion: undefined }));
                          }
                        }}
                        disabled={loading}
                        className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                          justificacion === justif
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${
                            justificacion === justif
                              ? 'text-blue-700 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {justif}
                          </span>
                          {justificacion === justif && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"
                            >
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </motion.div>
                          )}
                        </div>
                      </motion.button>
                    ))}
                    {errors.justificacion && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        {errors.justificacion}
                      </p>
                    )}
                  </div>
                </motion.div>

                {/* Sección: Programación */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-4"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Programación
                    </h4>
                  </div>

                  {/* Opciones: Ahora o Programar */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setScheduleType('now');
                        setScheduledDate('');
                        setScheduledTime('');
                        setErrors(prev => ({ ...prev, fecha: undefined, hora: undefined }));
                      }}
                      disabled={loading}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        scheduleType === 'now'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className={`w-5 h-5 ${
                          scheduleType === 'now' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-gray-400'
                        }`} />
                        <span className={`font-medium ${
                          scheduleType === 'now'
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          Ahora
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-left">
                        Iniciar llamada inmediatamente
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setScheduleType('scheduled');
                      }}
                      disabled={loading}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        scheduleType === 'scheduled'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className={`w-5 h-5 ${
                          scheduleType === 'scheduled' 
                            ? 'text-purple-600 dark:text-purple-400' 
                            : 'text-gray-400'
                        }`} />
                        <span className={`font-medium ${
                          scheduleType === 'scheduled'
                            ? 'text-purple-700 dark:text-purple-300'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          Programar
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-left">
                        Seleccionar fecha y hora
                      </p>
                    </button>
                  </div>

                  {/* Campos de fecha y hora (solo si es programada) */}
                  {scheduleType === 'scheduled' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="grid grid-cols-2 gap-4 pt-2"
                    >
                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <Calendar className="w-4 h-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                          <span>Fecha *</span>
                        </label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => {
                            setScheduledDate(e.target.value);
                            setScheduledTime(''); // Resetear hora al cambiar fecha
                            setErrors(prev => ({ ...prev, fecha: undefined }));
                          }}
                          min={getMinDate()}
                          max={getMaxDate()}
                          disabled={loading}
                          className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed ${
                            errors.fecha 
                              ? 'border-red-300 dark:border-red-700' 
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        />
                        {errors.fecha && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                            {errors.fecha}
                          </p>
                        )}
                        {scheduledDate && selectedDay && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {selectedDay} - Horario permitido: {timeRange}
                          </p>
                        )}
                      </div>

                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <Clock className="w-4 h-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                          <span>Hora *</span>
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => {
                            setScheduledTime(e.target.value);
                            setErrors(prev => ({ ...prev, hora: undefined }));
                          }}
                          disabled={loading || !scheduledDate}
                          className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed ${
                            errors.hora 
                              ? 'border-red-300 dark:border-red-700' 
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        />
                        {errors.hora && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                            {errors.hora}
                          </p>
                        )}
                        {scheduledDate && !errors.hora && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {timeRange}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Cancelar
              </button>
              <motion.button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !justificacion.trim()}
                whileHover={!loading && justificacion.trim() ? { scale: 1.02 } : {}}
                whileTap={!loading && justificacion.trim() ? { scale: 0.98 } : {}}
                className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg flex items-center gap-2 ${
                  scheduleType === 'now'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-green-500/25'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-purple-500/25'
                }`}
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    <span>
                      {action === 'UPDATE' 
                        ? 'Actualizando...' 
                        : scheduleType === 'now' 
                          ? 'Iniciando...' 
                          : 'Programando...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    <span>
                      {action === 'UPDATE' 
                        ? 'Actualizar Llamada' 
                        : scheduleType === 'now' 
                          ? 'Iniciar Llamada' 
                          : 'Programar Llamada'}
                    </span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Renderizar usando portal para asegurar que esté por encima de todo
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  
  return modalContent;
};

