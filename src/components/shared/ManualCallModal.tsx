/**
 * Modal reutilizable para iniciar/programar llamadas manuales
 * Usado en LiveChat, LiveMonitor, Prospectos y otros módulos
 * 
 * RESTRICCIONES:
 * 1. Llamada "Ahora" solo de 6am a 12am
 * 2. Llamada programada según horarios del sistema (config_horarios_base)
 * 3. No se puede llamar si el prospecto no tiene id_dynamics
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, MessageSquare, Calendar, Clock, AlertCircle, Edit, Ban, Sparkles, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { analysisSupabase } from '../../config/analysisSupabase';
import { horariosService, type HorarioBase } from '../../services/horariosService';
import { getApiToken } from '../../services/apiTokensService';
import { getAuthTokenOrThrow } from '../../utils/authToken';

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
  prospectoIdDynamics?: string | null; // ID en CRM Dynamics - si es null, no se puede llamar
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
  prospectoIdDynamics,
  onSuccess
}) => {
  const { user } = useAuth();
  const [justificacion, setJustificacion] = useState('Mejor momento de llamada');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ justificacion?: string; fecha?: string; hora?: string }>({});
  
  // Estados para validaciones de horario y CRM
  const [horariosBase, setHorariosBase] = useState<HorarioBase[]>([]);
  const [showNoCrmModal, setShowNoCrmModal] = useState(false);
  const [nowCallBlocked, setNowCallBlocked] = useState<{ blocked: boolean; reason?: string }>({ blocked: false });

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

  // Verificar restricciones al abrir el modal
  useEffect(() => {
    if (isOpen) {
      // 1. Verificar si tiene id_dynamics (buscar en prospectos y crm_data)
      checkCrmRegistration();
    }
  }, [isOpen, prospectoId, prospectoIdDynamics]);

  // Función para verificar registro en CRM (busca en prospectos y crm_data)
  const checkCrmRegistration = async () => {
    // Si ya viene en la prop, usarlo directamente
    if (prospectoIdDynamics) {
      setShowNoCrmModal(false);
      loadHorarios();
      const nowCheck = horariosService.isWithinMaxServiceHours();
      setNowCallBlocked({ blocked: !nowCheck.valid, reason: nowCheck.reason });
      return;
    }

    // Si no viene en la prop, buscar en prospectos primero
    try {
      const { data: prospectoData, error: prospectoError } = await analysisSupabase
        .from('prospectos')
        .select('id_dynamics')
        .eq('id', prospectoId)
        .maybeSingle();

      if (prospectoError) {
        console.error('Error verificando prospecto:', prospectoError);
      }

      // Si tiene id_dynamics en prospectos, usarlo
      if (prospectoData?.id_dynamics) {
        setShowNoCrmModal(false);
        loadHorarios();
        const nowCheck = horariosService.isWithinMaxServiceHours();
        setNowCallBlocked({ blocked: !nowCheck.valid, reason: nowCheck.reason });
        return;
      }

      // Si no tiene en prospectos, buscar en crm_data
      const { data: crmData, error: crmError } = await analysisSupabase
        .from('crm_data')
        .select('id_dynamics')
        .eq('prospecto_id', prospectoId)
        .maybeSingle();

      if (crmError) {
        console.error('Error verificando crm_data:', crmError);
      }

      // Si tiene id_dynamics en crm_data, permitir programar
      if (crmData?.id_dynamics) {
        setShowNoCrmModal(false);
        loadHorarios();
        const nowCheck = horariosService.isWithinMaxServiceHours();
        setNowCallBlocked({ blocked: !nowCheck.valid, reason: nowCheck.reason });
        return;
      }

      // Si no tiene en ninguno, mostrar modal de sin CRM
      setShowNoCrmModal(true);
    } catch (error) {
      console.error('Error verificando registro CRM:', error);
      // En caso de error, mostrar modal de sin CRM por seguridad
      setShowNoCrmModal(true);
    }
  };

  // Cargar horarios del sistema
  const loadHorarios = async () => {
    try {
      const horarios = await horariosService.getHorariosBase();
      setHorariosBase(horarios);
    } catch (error) {
      console.error('Error cargando horarios:', error);
    }
  };

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
  
  // Cuando cambia a modo 'scheduled', establecer fecha actual por defecto si no hay una
  useEffect(() => {
    if (isOpen && scheduleType === 'scheduled' && !scheduledDate) {
      const today = new Date();
      setScheduledDate(today.toISOString().split('T')[0]);
    }
  }, [isOpen, scheduleType, scheduledDate]);

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

  // Validar horarios según los horarios del sistema (config_horarios_base)
  const isValidScheduleTime = (date: Date, time: string): { valid: boolean; reason?: string } => {
    const dayOfWeek = date.getDay(); // 0 = domingo, 6 = sábado
    const [hours, minutes] = time.split(':').map(Number);
    const hourDecimal = hours + minutes / 60;

    // Buscar el horario para este día en los horarios del sistema
    const horarioDia = horariosBase.find(h => h.dia_semana === dayOfWeek);
    
    if (!horarioDia) {
      // Fallback si no hay horarios cargados: usar valores por defecto
      // Lunes a Viernes (1-5): 9am - 9pm
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const valid = hourDecimal >= 9 && hourDecimal <= 21;
        return { valid, reason: valid ? undefined : 'Lunes a Viernes: 9:00 AM - 9:00 PM' };
      }
      // Sábado y Domingo (0, 6): 9am - 6pm
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const valid = hourDecimal >= 9 && hourDecimal <= 18;
        return { valid, reason: valid ? undefined : 'Sábados y Domingos: 9:00 AM - 6:00 PM' };
      }
      return { valid: false, reason: 'Horario no válido' };
    }
    
    // Usar horarios del sistema
    if (!horarioDia.activo) {
      return { valid: false, reason: `El servicio no está disponible los ${horarioDia.dia_nombre}` };
    }
    
    if (hourDecimal < horarioDia.hora_inicio || hourDecimal >= horarioDia.hora_fin) {
      return { 
        valid: false, 
        reason: `${horarioDia.dia_nombre}: ${horariosService.formatHora(horarioDia.hora_inicio)} - ${horariosService.formatHora(horarioDia.hora_fin)}`
      };
    }
    
    return { valid: true };
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

      // Validar horarios según día de la semana (usando horarios del sistema)
      const scheduleValidation = isValidScheduleTime(selectedDate, scheduledTime);
      if (!scheduleValidation.valid) {
        newErrors.hora = scheduleValidation.reason || 'Horario fuera del rango permitido';
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

      // Usar Edge Function en lugar de webhook directo
      const edgeFunctionUrl = `${import.meta.env.VITE_EDGE_FUNCTIONS_URL}/functions/v1/trigger-manual-proxy`;
      
      // Obtener JWT del usuario autenticado (desde supabaseSystemUI donde está la sesión)
      const authToken = await getAuthTokenOrThrow();
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Error desconocido');
        console.error('❌ [ManualCallModal] Error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      // Éxito
      const result = await response.json().catch(() => ({}));

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
      
      // Mostrar información detallada del error
      let errorMessage = 'Error al programar la llamada';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Errores específicos
        if (errorMessage.includes('404')) {
          errorMessage = 'Edge Function no encontrada. Verifica que trigger-manual-proxy esté desplegada.';
        } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
          errorMessage = 'Error de autenticación. Por favor recarga la página.';
        } else if (errorMessage.includes('500')) {
          errorMessage = 'Error en el servidor. Verifica los logs de N8N.';
        } else if (errorMessage.includes('Failed to fetch')) {
          errorMessage = 'Error de red. Verifica tu conexión a internet.';
        }
      }
      
      toast.error(errorMessage);
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
  
  // Obtener horario del día seleccionado desde los horarios del sistema
  const getTimeRangeFromSystem = () => {
    if (!scheduledDate) return isWeekend ? '9:00 AM - 6:00 PM' : '9:00 AM - 9:00 PM';
    
    const date = new Date(scheduledDate);
    const dayOfWeek = date.getDay();
    const horarioDia = horariosBase.find(h => h.dia_semana === dayOfWeek);
    
    if (horarioDia && horarioDia.activo) {
      return `${horariosService.formatHora(horarioDia.hora_inicio)} - ${horariosService.formatHora(horarioDia.hora_fin)}`;
    }
    
    // Fallback
    return isWeekend ? '9:00 AM - 6:00 PM' : '9:00 AM - 9:00 PM';
  };
  
  const timeRange = getTimeRangeFromSystem();

  // Modal de "Sin CRM" - Se muestra cuando el prospecto no tiene id_dynamics
  const noCrmModal = (
    <AnimatePresence mode="wait">
      {isOpen && showNoCrmModal && (
        <motion.div
          key="no-crm-modal-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
          onClick={onClose}
        >
          <motion.div
            key="no-crm-modal-content"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-800"
          >
            {/* Header con gradiente */}
            <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-amber-900/20 border-b border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Prospecto sin registro en CRM
                    </h3>
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">
                      Discovery básico incompleto
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-amber-200/50 dark:hover:bg-amber-800/30 transition-colors text-amber-600 dark:text-amber-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="px-8 py-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    No se puede programar una llamada a este prospecto porque aún no ha sido registrado en el CRM (Dynamics).
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">
                    La IA necesita completar el <span className="font-semibold text-purple-600 dark:text-purple-400">discovery básico</span> para obtener la información necesaria y registrar al prospecto en el sistema.
                  </p>
                </div>
              </div>

              {/* Información adicional */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-purple-700 dark:text-purple-300 mb-1">
                      ¿Qué puedes hacer?
                    </p>
                    <ul className="text-purple-600 dark:text-purple-400 space-y-1">
                      <li>• Continúa la conversación para que la IA complete el discovery</li>
                      <li>• La IA registrará automáticamente al prospecto en CRM</li>
                      <li>• Una vez registrado, podrás programar llamadas</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-200"
              >
                Entendido
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Renderizar el modal usando portal para asegurar que esté por encima de todo
  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && !showNoCrmModal && (
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
                        if (nowCallBlocked.blocked) {
                          toast.error(nowCallBlocked.reason || 'Fuera de horario de servicio');
                          return;
                        }
                        setScheduleType('now');
                        setScheduledDate('');
                        setScheduledTime('');
                        setErrors(prev => ({ ...prev, fecha: undefined, hora: undefined }));
                      }}
                      disabled={loading || nowCallBlocked.blocked}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 relative ${
                        nowCallBlocked.blocked
                          ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 opacity-70 cursor-not-allowed'
                          : scheduleType === 'now'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      } disabled:cursor-not-allowed`}
                      title={nowCallBlocked.blocked ? nowCallBlocked.reason : undefined}
                    >
                      {nowCallBlocked.blocked && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                          <Ban className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className={`w-5 h-5 ${
                          nowCallBlocked.blocked
                            ? 'text-red-400'
                            : scheduleType === 'now' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-gray-400'
                        }`} />
                        <span className={`font-medium ${
                          nowCallBlocked.blocked
                            ? 'text-red-600 dark:text-red-400'
                            : scheduleType === 'now'
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          Ahora
                        </span>
                      </div>
                      <p className={`text-xs text-left ${
                        nowCallBlocked.blocked
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {nowCallBlocked.blocked 
                          ? 'No disponible fuera de horario (6am - 12am)'
                          : 'Iniciar llamada inmediatamente'
                        }
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setScheduleType('scheduled');
                        // Establecer fecha actual por defecto al cambiar a modo programado
                        if (!scheduledDate) {
                          setScheduledDate(getMinDate());
                        }
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
    // Si no tiene id_dynamics, mostrar el modal de "Sin CRM"
    if (showNoCrmModal) {
      return createPortal(noCrmModal, document.body);
    }
    return createPortal(modalContent, document.body);
  }
  
  return showNoCrmModal ? noCrmModal : modalContent;
};

