import React, { useState, useEffect } from 'react';
import { liveMonitorService, type LiveCallData, type Agent, type FeedbackData } from '../../services/liveMonitorService';
import { useTheme } from '../../hooks/useTheme';

// Definición de checkpoints del proceso de venta
const CHECKPOINTS = {
  'checkpoint #1': {
    title: 'Saludo de Continuación',
    description: 'Establecer conexión inicial y confirmar interés',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  'checkpoint #2': {
    title: 'Conexión Emocional Inmediata',
    description: 'Crear rapport y conexión personal',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800'
  },
  'checkpoint #3': {
    title: 'Introducción al Paraíso',
    description: 'Presentar el destino y generar emoción',
    color: 'bg-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  'checkpoint #4': {
    title: 'Urgencia Natural',
    description: 'Crear sensación de oportunidad limitada',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  'checkpoint #5': {
    title: 'Presentación de Oportunidad',
    description: 'Presentar oferta final y cerrar venta',
    color: 'bg-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800'
  }
} as const;

type CheckpointKey = keyof typeof CHECKPOINTS;

interface KanbanCall extends LiveCallData {
  checkpoint_venta_actual?: string;
  composicion_familiar_numero?: number;
  destino_preferido?: string;
  preferencia_vacaciones?: string[];
  numero_noches?: number;
  mes_preferencia?: string;
  edad?: number;
  propuesta_economica_ofrecida?: number;
  habitacion_ofertada?: string;
  resort_ofertado?: string;
  principales_objeciones?: string;
  resumen_llamada?: string;
}

const LiveMonitorKanban: React.FC = () => {
  const [activeCalls, setActiveCalls] = useState<KanbanCall[]>([]);
  const [finishedCalls, setFinishedCalls] = useState<KanbanCall[]>([]);
  const [failedCalls, setFailedCalls] = useState<KanbanCall[]>([]);
  const [selectedTab, setSelectedTab] = useState<'active' | 'finished' | 'failed' | 'all'>('active');
  const [allCalls, setAllCalls] = useState<KanbanCall[]>([]);
  const [selectedCall, setSelectedCall] = useState<KanbanCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Hook de tema para aplicar estilos
  const { getThemeClasses, isLinearTheme } = useTheme();
  
  // Estados para feedback y controles
  const [agents, setAgents] = useState<Agent[]>([]);
  const [nextAgent, setNextAgent] = useState<Agent | null>(null);
  const [showGlobalFeedbackModal, setShowGlobalFeedbackModal] = useState(false);
  const [globalFeedbackType, setGlobalFeedbackType] = useState<'contestada' | 'perdida' | 'transferida' | 'colgada' | null>(null);
  const [globalFeedbackComment, setGlobalFeedbackComment] = useState('');
  
  // Estados para controles de llamada
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [hangupLoading, setHangupLoading] = useState(false);

  // Función para ejecutar feedback
  const executeGlobalFeedback = async () => {
    if (!globalFeedbackType || !globalFeedbackComment.trim()) {
      alert('Por favor, proporciona un comentario sobre la llamada');
      return;
    }

    if (!selectedCall) {
      console.error('❌ No hay llamada seleccionada');
      return;
    }

    const feedbackData: FeedbackData = {
      call_id: selectedCall.call_id,
      prospect_id: selectedCall.prospecto_id,
      user_email: nextAgent?.agent_email || 'sistema@livemonitor.com',
      resultado: globalFeedbackType,
      comentarios: globalFeedbackComment,
      fecha_feedback: new Date().toISOString()
    };

    try {
      await liveMonitorService.saveFeedback(feedbackData);
      
      // Actualizar estado de la llamada
      if (selectedCall.call_id) {
        const statusToUpdate = globalFeedbackType === 'contestada' ? 'exitosa' : 'perdida';
        await liveMonitorService.updateCallStatus(selectedCall.call_id, statusToUpdate);
      }
      
      // Esperar y actualizar lista
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadCalls(true);
      
      // Cerrar modales
      setShowGlobalFeedbackModal(false);
      setGlobalFeedbackType(null);
      setGlobalFeedbackComment('');
      setSelectedCall(null);
      
    } catch (error) {
      console.error('Error guardando feedback:', error);
      alert('Error al guardar el feedback. Intenta nuevamente.');
    }
  };

  const handleFeedbackRequest = (resultado: 'contestada' | 'perdida') => {
    setGlobalFeedbackType(resultado);
    setShowGlobalFeedbackModal(true);
    setGlobalFeedbackComment('');
  };

  // Mensajes predefinidos para transferencia
  const transferReasons = [
    "Mi supervisor puede ofrecerle un mejor precio exclusivo que tengo autorización limitada",
    "Mi supervisor maneja casos especiales como el suyo y quiere atenderle personalmente", 
    "Tengo un supervisor especializado en su destino que puede darle beneficios adicionales",
    "Mi supervisor tiene disponibilidad muy limitada solo para hoy y quiere hablar con usted",
    "Como mostró tanto interés, mi supervisor quiere ofrecerle algo especial que yo no puedo autorizar",
    "Mi supervisor estaba escuchando la llamada y quiere darle un beneficio exclusivo inmediatamente"
  ];

  // Función para transferir llamada a través de webhook de Railway
  const handleTransferCall = async (reason: string) => {
    if (!selectedCall?.call_id) {
      alert('No se encontró ID de llamada');
      return;
    }

    setTransferLoading(true);
    
    try {
      // Extraer contexto adicional de datos_llamada y datos_proceso
      let contextData = {};
      try {
        if (selectedCall.datos_llamada) {
          const datosLlamada = typeof selectedCall.datos_llamada === 'string' 
            ? JSON.parse(selectedCall.datos_llamada) 
            : selectedCall.datos_llamada;
          contextData = { ...contextData, ...datosLlamada };
        }
        
        if (selectedCall.datos_proceso) {
          const datosProc = typeof selectedCall.datos_proceso === 'string' 
            ? JSON.parse(selectedCall.datos_proceso) 
            : selectedCall.datos_proceso;
          contextData = { ...contextData, datos_proceso: datosProc };
        }
      } catch (e) {
        console.log('No se pudo extraer contexto adicional');
      }

      const transferData = {
        action: "transfer",
        call_id: selectedCall.call_id,
        control_url: selectedCall.control_url,
        message: reason,
        destination: {
          number: "+523222264000",
          extension: "60973"
        },
        // Contexto completo de la llamada
        call_context: {
          // Datos básicos de la llamada
          fecha_llamada: selectedCall.fecha_llamada,
          duracion_segundos: selectedCall.duracion_segundos,
          call_status: selectedCall.call_status,
          nivel_interes: selectedCall.nivel_interes,
          tipo_llamada: selectedCall.tipo_llamada,
          precio_ofertado: selectedCall.precio_ofertado,
          costo_total: selectedCall.costo_total,
          
          // Información del prospecto
          prospecto_id: selectedCall.prospecto_id,
          nombre_completo: selectedCall.nombre_completo,
          nombre_whatsapp: selectedCall.nombre_whatsapp,
          whatsapp: selectedCall.whatsapp,
          email: selectedCall.email,
          ciudad_residencia: selectedCall.ciudad_residencia,
          estado_civil: selectedCall.estado_civil,
          edad: selectedCall.edad,
          
          // Información de viaje actualizada
          checkpoint_venta_actual: selectedCall.checkpoint_venta_actual,
          composicion_familiar_numero: selectedCall.composicion_familiar_numero,
          destino_preferido: selectedCall.destino_preferido,
          preferencia_vacaciones: selectedCall.preferencia_vacaciones,
          numero_noches: selectedCall.numero_noches,
          mes_preferencia: selectedCall.mes_preferencia,
          propuesta_economica_ofrecida: selectedCall.propuesta_economica_ofrecida,
          habitacion_ofertada: selectedCall.habitacion_ofertada,
          resort_ofertado: selectedCall.resort_ofertado,
          principales_objeciones: selectedCall.principales_objeciones,
          resumen_llamada: selectedCall.resumen_llamada,
          
          // Contexto adicional extraído
          ...contextData
        }
      };

      const response = await fetch('https://primary-dev-d75a.up.railway.app/webhook/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transferData)
      });

      if (response.ok) {
        setShowTransferModal(false);
        // Abrir modal de feedback para transferencia
        setGlobalFeedbackType('transferida' as any);
        setShowGlobalFeedbackModal(true);
        setGlobalFeedbackComment('');
        // Actualizar estado en BD
        await liveMonitorService.updateCallStatus(selectedCall.call_id, 'transferida');
        await loadCalls(true);
      } else {
        alert('Error al transferir la llamada');
      }
    } catch (error) {
      console.error('Error en transferencia:', error);
      alert('Error al transferir la llamada');
    } finally {
      setTransferLoading(false);
    }
  };

  // Función para colgar llamada a través de webhook de Railway
  const handleHangupCall = async () => {
    if (!selectedCall?.call_id) {
      alert('No se encontró ID de llamada');
      return;
    }

    setHangupLoading(true);
    
    try {
      // Extraer contexto de la llamada para el backend
      let contextData = {};
      try {
        if (selectedCall.datos_llamada) {
          const datosLlamada = typeof selectedCall.datos_llamada === 'string' 
            ? JSON.parse(selectedCall.datos_llamada) 
            : selectedCall.datos_llamada;
          contextData = { ...contextData, ...datosLlamada };
        }
        
        if (selectedCall.datos_proceso) {
          const datosProc = typeof selectedCall.datos_proceso === 'string' 
            ? JSON.parse(selectedCall.datos_proceso) 
            : selectedCall.datos_proceso;
          contextData = { ...contextData, datos_proceso: datosProc };
        }
      } catch (e) {
        console.log('No se pudo extraer contexto adicional');
      }

      const hangupData = {
        action: "hangup",
        call_id: selectedCall.call_id,
        control_url: selectedCall.control_url,
        // Contexto completo de la llamada
        call_context: {
          // Datos básicos
          fecha_llamada: selectedCall.fecha_llamada,
          duracion_segundos: selectedCall.duracion_segundos,
          call_status: selectedCall.call_status,
          nivel_interes: selectedCall.nivel_interes,
          tipo_llamada: selectedCall.tipo_llamada,
          
          // Información del prospecto
          prospecto_id: selectedCall.prospecto_id,
          nombre_completo: selectedCall.nombre_completo,
          nombre_whatsapp: selectedCall.nombre_whatsapp,
          whatsapp: selectedCall.whatsapp,
          
          // Checkpoint y progreso
          checkpoint_venta_actual: selectedCall.checkpoint_venta_actual,
          composicion_familiar_numero: selectedCall.composicion_familiar_numero,
          destino_preferido: selectedCall.destino_preferido,
          propuesta_economica_ofrecida: selectedCall.propuesta_economica_ofrecida,
          
          // Contexto adicional extraído
          ...contextData
        }
      };

      const response = await fetch('https://primary-dev-d75a.up.railway.app/webhook/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(hangupData)
      });

      if (response.ok) {
        // Abrir modal de feedback para colgar
        setGlobalFeedbackType('colgada' as any);
        setShowGlobalFeedbackModal(true);
        setGlobalFeedbackComment('');
        // Actualizar estado en BD
        await liveMonitorService.updateCallStatus(selectedCall.call_id, 'colgada');
        await loadCalls(true);
      } else {
        alert('Error al colgar la llamada');
      }
    } catch (error) {
      console.error('Error al colgar:', error);
      alert('Error al colgar la llamada');
    } finally {
      setHangupLoading(false);
    }
  };

  // Cargar llamadas desde la BD
  const loadCalls = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      } else {
        setIsUpdating(true);
      }
      
      const allCalls = await liveMonitorService.getActiveCalls() as KanbanCall[];
      
      // Actualización silenciosa en background
      
      // Clasificar llamadas por estado
      const active: KanbanCall[] = [];
      const finished: KanbanCall[] = [];
      const failed: KanbanCall[] = [];
      
      allCalls.forEach(call => {
        const hasDuration = call.duracion_segundos && call.duracion_segundos > 0;
        const hasRecording = call.audio_ruta_bucket && call.audio_ruta_bucket.length > 0;
        const isZeroDuration = call.duracion_segundos === 0;
        const hasNoRecording = !call.audio_ruta_bucket;
        const hasFeedback = call.tiene_feedback === true;
        
        // LÓGICA CORREGIDA DE CLASIFICACIÓN:
        
        // 1. LLAMADAS ACTIVAS: call_status = 'activa'
        if (call.call_status === 'activa') {
          active.push(call);
        }
        
        // 2. LLAMADAS FINALIZADAS: Estados finalizados O duración + grabación
        else if (
          call.call_status === 'finalizada' || 
          call.call_status === 'transferida' || 
          call.call_status === 'colgada' ||
          call.call_status === 'exitosa' ||
          (hasDuration && hasRecording)
        ) {
          // Solo mostrar si NO tienen feedback (requieren feedback para desaparecer)
          if (!hasFeedback) {
            finished.push(call);
          }
        }
        
        // 3. LLAMADAS FALLIDAS: call_status = 'perdida' O sin conexión
        else if (
          call.call_status === 'perdida' ||
          (isZeroDuration && hasNoRecording)
        ) {
          // Solo mostrar si NO tienen feedback
          if (!hasFeedback) {
            failed.push(call);
          }
        }
        
        // 4. FALLBACK: Casos no clasificados van a activas
        else if (!hasFeedback) {
          active.push(call);
        }
      });
      
      // Actualización inteligente que detecta cambios en checkpoints
      if (isRefresh) {
        // Comparar no solo call_ids sino también checkpoints para detectar movimientos
        const activeIds = active.map(c => `${c.call_id}:${c.checkpoint_venta_actual}`);
        const currentActiveIds = activeCalls.map(c => `${c.call_id}:${c.checkpoint_venta_actual}`);
        
        const finishedIds = finished.map(c => c.call_id);
        const currentFinishedIds = finishedCalls.map(c => c.call_id);
        
        const failedIds = failed.map(c => c.call_id);
        const currentFailedIds = failedCalls.map(c => c.call_id);
        
        const activeChanged = JSON.stringify(activeIds) !== JSON.stringify(currentActiveIds);
        const finishedChanged = JSON.stringify(finishedIds) !== JSON.stringify(currentFinishedIds);
        const failedChanged = JSON.stringify(failedIds) !== JSON.stringify(currentFailedIds);
        
        if (activeChanged) setActiveCalls(active);
        if (finishedChanged) setFinishedCalls(finished);
        if (failedChanged) setFailedCalls(failed);
        // Filtrar llamadas COMPLETAMENTE procesadas para pestaña "Historial"
        const completedCalls = allCalls.filter(call => {
          const hasFeedback = call.tiene_feedback === true; // Solo feedback completo, no pendiente
          const isCompleted = call.call_status === 'finalizada' || 
                             call.call_status === 'transferida' || 
                             call.call_status === 'colgada' ||
                             call.call_status === 'exitosa' ||
                             call.call_status === 'perdida';
          
          return hasFeedback && isCompleted;
        });
        
        setAllCalls(completedCalls);
      } else {
        setActiveCalls(active);
        setFinishedCalls(finished);
        setFailedCalls(failed);
        
        // Filtrar llamadas COMPLETAMENTE procesadas para pestaña "Historial"
        const completedCalls = allCalls.filter(call => {
          const hasFeedback = call.tiene_feedback === true; // Solo feedback completo, no pendiente
          const isCompleted = call.call_status === 'finalizada' || 
                             call.call_status === 'transferida' || 
                             call.call_status === 'colgada' ||
                             call.call_status === 'exitosa' ||
                             call.call_status === 'perdida';
          
          return hasFeedback && isCompleted;
        });
        
        setAllCalls(completedCalls);
      }
      
    } catch (error) {
      console.error('Error cargando llamadas:', error);
    } finally {
      if (!isRefresh) {
        setLoading(false);
      } else {
        setIsUpdating(false);
      }
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [callsData, agentsData] = await Promise.all([
          liveMonitorService.getActiveCalls(),
          liveMonitorService.getActiveAgents()
        ]);
        
        setAgents(agentsData);
        if (agentsData.length > 0) {
          setNextAgent(agentsData[0]);
        }
        
        await loadCalls();
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        setLoading(false);
      }
    };

    loadInitialData();
    // Actualizar cada 3 segundos para mayor responsividad a cambios de checkpoint
    const interval = setInterval(() => loadCalls(true), 3000);
    return () => clearInterval(interval);
  }, []);

  // Agrupar llamadas activas por checkpoint con ordenamiento
  const groupCallsByCheckpoint = (calls: KanbanCall[]) => {
    const groups: Record<CheckpointKey, KanbanCall[]> = {
      'checkpoint #1': [],
      'checkpoint #2': [],
      'checkpoint #3': [],
      'checkpoint #4': [],
      'checkpoint #5': []
    };

    calls.forEach(call => {
      // Usar directamente checkpoint_venta_actual de la BD (ya está actualizado)
      const checkpoint = (call.checkpoint_venta_actual || 'checkpoint #1') as CheckpointKey;
      
      if (groups[checkpoint]) {
        groups[checkpoint].push(call);
      } else {
        groups['checkpoint #1'].push(call);
      }
    });

    // Ordenar llamadas dentro de cada grupo por progreso (mayor a menor)
    Object.keys(groups).forEach(checkpointKey => {
      groups[checkpointKey as CheckpointKey].sort((a, b) => {
        const aCheckpoint = parseInt(a.checkpoint_venta_actual?.replace('checkpoint #', '') || '1');
        const bCheckpoint = parseInt(b.checkpoint_venta_actual?.replace('checkpoint #', '') || '1');
        
        if (aCheckpoint !== bCheckpoint) {
          return bCheckpoint - aCheckpoint;
        }
        
        const aPrice = a.propuesta_economica_ofrecida || 0;
        const bPrice = b.propuesta_economica_ofrecida || 0;
        
        if (aPrice !== bPrice) {
          return bPrice - aPrice;
        }
        
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
    });

    return groups;
  };

  // Crear filas horizontales que se extiendan por todas las columnas
  const createHorizontalRows = (groupedCalls: Record<CheckpointKey, KanbanCall[]>) => {
    const maxRows = Math.max(...Object.values(groupedCalls).map(calls => calls.length));
    const rows: (KanbanCall | null)[][] = [];
    
    for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
      const row: (KanbanCall | null)[] = [];
      Object.keys(CHECKPOINTS).forEach(checkpointKey => {
        const calls = groupedCalls[checkpointKey as CheckpointKey];
        row.push(calls[rowIndex] || null);
      });
      rows.push(row);
    }
    
    return rows;
  };

  const renderCallCard = (call: KanbanCall) => {
    // Usar directamente checkpoint_venta_actual de la BD
    const checkpointNumber = parseInt(call.checkpoint_venta_actual?.replace('checkpoint #', '') || '1');
    
    // Clases de animación personalizadas más intensas
    const progressBgColors = {
      1: 'bg-slate-100/30 dark:bg-slate-700/20 hover:bg-slate-100/50 dark:hover:bg-slate-700/30',
      2: 'checkpoint-pulse-blue',
      3: 'checkpoint-pulse-yellow', 
      4: 'checkpoint-pulse-orange',
      5: 'checkpoint-pulse-red'
    };

    return (
      <div
        key={call.call_id}
        className={`cursor-pointer transition-all duration-300 hover:bg-white/50 dark:hover:bg-slate-600/30 rounded-lg p-2 ${progressBgColors[checkpointNumber as keyof typeof progressBgColors] || progressBgColors[1]}`}
        onClick={() => setSelectedCall(call)}
      >
        {/* Cliente - Compacto */}
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {(call.nombre_completo || call.nombre_whatsapp || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {call.nombre_completo || call.nombre_whatsapp || 'Sin nombre'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {call.whatsapp}
            </p>
          </div>
        </div>

          {/* Información clave - PRIORIZAR llamadas_ventas sobre prospectos */}
        <div className="space-y-1">
          {/* Destino - Datos dinámicos de llamadas_ventas primero */}
          {(call.destino_preferido || call.destino_preferencia) && (
            <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
              <svg className="w-3 h-3 mr-1 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span className="truncate font-medium text-blue-600 dark:text-blue-400">
                {call.destino_preferido?.replace('_', ' ') || call.destino_preferencia?.join(', ')}
              </span>
              {call.destino_preferido && <span className="text-xs text-blue-600 ml-1">🔄</span>}
            </div>
          )}
          
          {/* Grupo familiar - PRIORIZAR llamadas_ventas (dinámico) */}
          {(call.composicion_familiar_numero || call.tamano_grupo) && (
            <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
              <svg className="w-3 h-3 mr-1 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <span className={`font-semibold ${call.composicion_familiar_numero ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}`}>
                {call.composicion_familiar_numero || call.tamano_grupo}p
              </span>
              {call.composicion_familiar_numero && <span className="text-xs text-green-600 ml-1">🔄</span>}
            </div>
          )}
          
          {/* Mes preferencia - Solo si está actualizado */}
          {call.mes_preferencia && (
            <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
              <svg className="w-3 h-3 mr-1 flex-shrink-0 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                Mes {call.mes_preferencia}
              </span>
              <span className="text-xs text-indigo-600 ml-1">🔄</span>
            </div>
          )}
          
          {/* Preferencias de vacaciones - Solo si están actualizadas */}
          {call.preferencia_vacaciones && call.preferencia_vacaciones.length > 0 && (
            <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
              <svg className="w-3 h-3 mr-1 flex-shrink-0 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="truncate font-medium text-purple-600 dark:text-purple-400">
                {call.preferencia_vacaciones.join(', ')}
              </span>
              <span className="text-xs text-purple-600 ml-1">🔄</span>
            </div>
          )}
          
          {/* Precio ofertado */}
          {(call.propuesta_economica_ofrecida || call.precio_ofertado) && (
            <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
              <svg className="w-3 h-3 mr-1 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span>${(call.propuesta_economica_ofrecida || call.precio_ofertado)?.toLocaleString()}</span>
            </div>
          )}
          
          {/* Nivel de interés */}
          {call.nivel_interes && (
            <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
              <svg className="w-3 h-3 mr-1 flex-shrink-0 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="truncate">{call.nivel_interes}</span>
            </div>
          )}
          
          {/* Estado civil */}
          {call.estado_civil && call.estado_civil !== 'no_especificado' && (
            <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
              <svg className="w-3 h-3 mr-1 flex-shrink-0 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="truncate">{call.estado_civil}</span>
            </div>
          )}
        </div>

        {/* Tiempo - Footer compacto */}
        <div className="mt-2 text-center">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {liveMonitorService.getTimeElapsed(call.updated_at)}
          </span>
        </div>
      </div>
    );
  };

  const renderKanbanColumn = (checkpointKey: CheckpointKey, calls: KanbanCall[]) => {
    const checkpoint = CHECKPOINTS[checkpointKey];
    
    return (
      <div key={checkpointKey} className="flex flex-col h-full">
        {/* Header de columna compacto */}
        <div className={`${checkpoint.bgColor} p-3 border-b border-slate-200 dark:border-slate-700`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white text-xs leading-tight">
                {checkpoint.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-tight">
                {checkpoint.description}
              </p>
            </div>
            <div className={`w-6 h-6 ${checkpoint.color} rounded-full flex items-center justify-center text-white text-xs font-bold ml-2 flex-shrink-0`}>
              {calls.length}
            </div>
          </div>
        </div>

        {/* Lista de llamadas - estilo tabla sin bordes */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {calls.map((call) => renderCallCard(call))}
          </div>
          
          {calls.length === 0 && (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m0 0V9a2 2 0 012-2h2m0 0V6a2 2 0 012-2h2.5" />
              </svg>
              <p className="text-xs">Sin llamadas</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Cargando llamadas...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const groupedActiveCalls = groupCallsByCheckpoint(activeCalls);
  const horizontalRows = createHorizontalRows(groupedActiveCalls);

  const themeClasses = getThemeClasses();

  return (
    <div className={`min-h-screen ${themeClasses.background} p-4 transition-colors duration-300`}>
      {/* Estilos CSS personalizados para animaciones de checkpoint */}
      <style>{`
        .checkpoint-pulse-blue {
          background: rgba(59, 130, 246, 0.15);
          animation: checkpoint-pulse-blue 2s ease-in-out infinite;
        }
        .checkpoint-pulse-yellow {
          background: rgba(245, 158, 11, 0.2);
          animation: checkpoint-pulse-yellow 1.5s ease-in-out infinite;
        }
        .checkpoint-pulse-orange {
          background: rgba(249, 115, 22, 0.25);
          animation: checkpoint-pulse-orange 1s ease-in-out infinite;
        }
        .checkpoint-pulse-red {
          background: rgba(239, 68, 68, 0.3);
          animation: checkpoint-pulse-red 0.8s ease-in-out infinite;
        }
        
        @keyframes checkpoint-pulse-blue {
          0%, 100% { background-color: rgba(59, 130, 246, 0.15); }
          50% { background-color: rgba(59, 130, 246, 0.25); }
        }
        @keyframes checkpoint-pulse-yellow {
          0%, 100% { background-color: rgba(245, 158, 11, 0.2); }
          50% { background-color: rgba(245, 158, 11, 0.35); }
        }
        @keyframes checkpoint-pulse-orange {
          0%, 100% { background-color: rgba(249, 115, 22, 0.25); }
          50% { background-color: rgba(249, 115, 22, 0.45); }
        }
        @keyframes checkpoint-pulse-red {
          0%, 100% { background-color: rgba(239, 68, 68, 0.3); }
          50% { background-color: rgba(239, 68, 68, 0.6); }
        }
        
        /* Asegurar que el texto esté por encima del sombreado */
        .checkpoint-pulse-blue *, 
        .checkpoint-pulse-yellow *, 
        .checkpoint-pulse-orange *, 
        .checkpoint-pulse-red * {
          position: relative;
          z-index: 10;
        }
      `}</style>
      
      <div className="max-w-[95vw] mx-auto space-y-4">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Live Monitor - Vista Kanban
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gestión visual del proceso de ventas por checkpoints
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-4 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSelectedTab('active')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                selectedTab === 'active'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Llamadas Activas</span>
                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {activeCalls.length}
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedTab('finished')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                selectedTab === 'finished'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-b-2 border-green-500'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Finalizadas</span>
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {finishedCalls.length}
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedTab('failed')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                selectedTab === 'failed'
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-b-2 border-red-500'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Fallidas</span>
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {failedCalls.length}
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                selectedTab === 'all'
                  ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-b-2 border-purple-500'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Historial</span>
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {allCalls.length}
                </span>
              </div>
            </button>
          </div>

          {/* Contenido de tabs */}
          <div className="p-6">
            {selectedTab === 'active' && (
              <div className="rounded-lg overflow-hidden" style={{ minHeight: 'calc(100vh - 280px)' }}>
                {/* Headers de columnas */}
                <div className="grid grid-cols-5 gap-0">
                  {Object.entries(CHECKPOINTS).map(([checkpointKey, checkpoint]) => (
                    <div key={checkpointKey} className={`${checkpoint.bgColor} p-3 border-b border-slate-200 dark:border-slate-700`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white text-xs leading-tight">
                            {checkpoint.title}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-tight">
                            {checkpoint.description}
                          </p>
                        </div>
                        <div className={`w-6 h-6 ${checkpoint.color} rounded-full flex items-center justify-center text-white text-xs font-bold ml-2 flex-shrink-0`}>
                          {groupedActiveCalls[checkpointKey as CheckpointKey].length}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Filas horizontales con franjas grisáceas */}
                <div className="space-y-0">
                  {horizontalRows.map((row, rowIndex) => {
                    // Determinar el checkpoint más alto en esta fila para el color de fondo
                    const maxCheckpoint = Math.max(...row.filter(call => call).map(call => 
                      parseInt(call!.checkpoint_venta_actual?.replace('checkpoint #', '') || '1')
                    ));
                    
                    const rowBgColors = {
                      1: 'bg-slate-50/20 dark:bg-slate-800/20',
                      2: 'bg-slate-50/30 dark:bg-slate-800/30 animate-pulse',
                      3: 'bg-slate-50/40 dark:bg-slate-800/40 animate-pulse',
                      4: 'bg-slate-50/50 dark:bg-slate-800/50 animate-pulse',
                      5: 'bg-slate-50/60 dark:bg-slate-800/60 animate-pulse'
                    };
                    
                    return (
                      <div 
                        key={rowIndex} 
                        className={`grid grid-cols-5 gap-0 min-h-[80px] ${rowBgColors[maxCheckpoint as keyof typeof rowBgColors] || rowBgColors[1]} transition-all duration-500`}
                      >
                        {row.map((call, colIndex) => (
                          <div key={`${rowIndex}-${colIndex}`} className="p-2 border-r border-slate-100/50 dark:border-slate-700/30 last:border-r-0">
                            {call ? renderCallCard(call) : (
                              <div className="h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                                {/* Celda vacía */}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedTab === 'finished' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {finishedCalls.map(call => (
                  <div key={call.call_id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                       onClick={() => setSelectedCall(call)}>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {(call.nombre_completo || call.nombre_whatsapp || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {call.nombre_completo || call.nombre_whatsapp || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Finalizada • {call.duracion_segundos ? `${Math.floor(call.duracion_segundos / 60)}:${(call.duracion_segundos % 60).toString().padStart(2, '0')}` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    {call.es_venta_exitosa !== null && (
                      <div className="flex items-center text-xs">
                        {call.es_venta_exitosa ? (
                          <>
                            <svg className="w-3 h-3 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-green-600 dark:text-green-400">Venta Exitosa</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3 mr-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="text-red-600 dark:text-red-400">No Cerrada</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {finishedCalls.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-slate-500 dark:text-slate-400">No hay llamadas finalizadas</p>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'failed' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {failedCalls.map(call => (
                  <div 
                    key={call.call_id} 
                    className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    onClick={() => {
                      setSelectedCall(call);
                      handleFeedbackRequest('perdida');
                    }}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {(call.nombre_completo || call.nombre_whatsapp || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {call.nombre_completo || call.nombre_whatsapp || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          No contestó • 0:00
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-xs text-red-600 dark:text-red-400">
                      <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Clic para marcar como perdida
                    </div>
                  </div>
                ))}
                
                {failedCalls.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-slate-500 dark:text-slate-400">No hay llamadas fallidas</p>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'all' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                        Checkpoint
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                        Duración
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                        Precio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                        Feedback
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {allCalls.map((call) => (
                      <tr 
                        key={call.call_id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        onClick={() => setSelectedCall(call)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                              {(call.nombre_completo || call.nombre_whatsapp || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-slate-900 dark:text-white">
                                {call.nombre_completo || call.nombre_whatsapp || 'Sin nombre'}
                              </div>
                              <div className="text-sm text-slate-500 dark:text-slate-400">
                                {call.whatsapp}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            call.call_status === 'activa' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            call.call_status === 'transferida' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                            call.call_status === 'finalizada' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' :
                            call.call_status === 'perdida' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}>
                            {call.call_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          {call.checkpoint_venta_actual || 'checkpoint #1'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          {call.duracion_segundos ? `${Math.floor(call.duracion_segundos / 60)}:${(call.duracion_segundos % 60).toString().padStart(2, '0')}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          ${(call.propuesta_economica_ofrecida || call.precio_ofertado)?.toLocaleString() || 'Sin precio'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {new Date(call.fecha_llamada).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {call.tiene_feedback ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Completado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {allCalls.length === 0 && (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-slate-500 dark:text-slate-400">No hay llamadas registradas</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal de detalles completo */}
        {selectedCall && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
               onClick={(e) => e.target === e.currentTarget && setSelectedCall(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                      selectedCall.call_status === 'activa' 
                        ? 'bg-gradient-to-br from-green-500 to-blue-600' 
                        : selectedCall.duracion_segundos === 0
                        ? 'bg-gradient-to-br from-red-500 to-red-700'
                        : 'bg-gradient-to-br from-gray-400 to-gray-600'
                    }`}>
                      {(selectedCall.nombre_completo || selectedCall.nombre_whatsapp || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {selectedCall.nombre_completo || selectedCall.nombre_whatsapp || 'Sin nombre'}
                      </h3>
                      <p className={`text-sm font-medium ${
                        selectedCall.call_status === 'activa' ? 'text-green-600 dark:text-green-400' : 
                        selectedCall.duracion_segundos === 0 ? 'text-red-600 dark:text-red-400' : 
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {selectedCall.call_status === 'activa' ? 'Llamada Activa' : 
                         selectedCall.duracion_segundos === 0 ? 'Llamada Fallida' : 'Llamada Finalizada'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCall(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Contenido del modal */}
              <div className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  
                  {/* Información Personal Completa */}
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center">
                      <svg className="w-3 h-3 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Información Personal
                    </h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Nombre Completo:</span>
                        <span className="font-medium text-slate-900 dark:text-white text-right">
                          {selectedCall.nombre_completo || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">WhatsApp:</span>
                        <span className="font-medium text-slate-900 dark:text-white text-right">
                          {selectedCall.nombre_whatsapp || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Teléfono:</span>
                        <span className="font-medium text-slate-900 dark:text-white">{selectedCall.whatsapp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Email:</span>
                        <span className="font-medium text-slate-900 dark:text-white text-right">
                          {selectedCall.email || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Ciudad:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedCall.ciudad_residencia || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Estado Civil:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedCall.estado_civil || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Edad:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedCall.edad || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Etapa:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedCall.etapa || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Información de Viaje */}
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center">
                      <svg className="w-3 h-3 mr-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Información de Viaje
                    </h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Checkpoint:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedCall.checkpoint_venta_actual || 'checkpoint #1'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Grupo:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedCall.composicion_familiar_numero ? `${selectedCall.composicion_familiar_numero}p` : 
                           selectedCall.tamano_grupo ? `${selectedCall.tamano_grupo}p` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Viaja con:</span>
                        <span className="font-medium text-slate-900 dark:text-white text-right">
                          {selectedCall.viaja_con || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Destino:</span>
                        <span className="font-medium text-slate-900 dark:text-white text-right">
                          {selectedCall.destino_preferido?.replace('_', ' ') || 
                           selectedCall.destino_preferencia?.join(', ') || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Menores:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedCall.cantidad_menores !== null ? selectedCall.cantidad_menores : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Noches:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedCall.numero_noches || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Mes Preferencia:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedCall.mes_preferencia || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Interés Principal:</span>
                        <span className="font-medium text-slate-900 dark:text-white text-right">
                          {selectedCall.interes_principal || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Campaña:</span>
                        <span className="font-medium text-slate-900 dark:text-white text-right">
                          {selectedCall.campana_origen || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Información de Llamada */}
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center">
                      <svg className="w-3 h-3 mr-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Detalles de Llamada
                    </h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Duración:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedCall.duracion_segundos ? `${Math.floor(selectedCall.duracion_segundos / 60)}:${(selectedCall.duracion_segundos % 60).toString().padStart(2, '0')}` : 'En curso'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Nivel Interés:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedCall.nivel_interes || 'En evaluación'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Precio Ofertado:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          ${(selectedCall.propuesta_economica_ofrecida || selectedCall.precio_ofertado)?.toLocaleString() || 'Sin oferta'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Resort:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedCall.resort_ofertado || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Habitación:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedCall.habitacion_ofertada || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Tipo Llamada:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedCall.tipo_llamada || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Oferta Presentada:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedCall.oferta_presentada ? 'Sí' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Costo Total:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          ${selectedCall.costo_total || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Objeciones:</span>
                        <span className="font-medium text-slate-900 dark:text-white text-right">
                          {selectedCall.principales_objeciones || 'Sin objeciones'}
                        </span>
                      </div>
                    </div>

                    {/* Grabación para llamadas finalizadas */}
                    {selectedCall.call_status !== 'activa' && selectedCall.audio_ruta_bucket && (
                      <div className="mt-4">
                        <h5 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">Grabación:</h5>
                        <audio 
                          controls 
                          controlsList="nodownload noremoteplayback"
                          className="w-full"
                          preload="metadata"
                        >
                          <source src={selectedCall.audio_ruta_bucket} type="audio/wav" />
                          Tu navegador no soporta audio HTML5.
                        </audio>
                      </div>
                    )}

                    {/* Controles para llamadas activas */}
                    {selectedCall.call_status === 'activa' && (
                      <div className="mt-4 space-y-2">
                        <h5 className="text-xs font-semibold text-slate-900 dark:text-white">Controles de Llamada:</h5>
                        
                        {/* Escuchar llamada */}
                        <button
                          disabled
                          className="w-full bg-gray-400 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center opacity-50"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728" />
                          </svg>
                          Escuchar Llamada (En desarrollo)
                        </button>

                        {/* Transferir llamada */}
                        <button
                          onClick={() => setShowTransferModal(true)}
                          disabled={transferLoading}
                          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          {transferLoading ? 'Transfiriendo...' : 'Solicitar Transferencia'}
                        </button>

                        {/* Colgar llamada */}
                        <button
                          onClick={handleHangupCall}
                          disabled={hangupLoading}
                          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2v12a4 4 0 01-4 4H6a4 4 0 01-4-4V6a4 4 0 014-4h4m8 0V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0h2m-2 0v2m-2-2v2" />
                          </svg>
                          {hangupLoading ? 'Colgando...' : 'Colgar Llamada'}
                        </button>
                      </div>
                    )}

                    {/* Botones de feedback - Solo si no tiene feedback completo */}
                    {!selectedCall.tiene_feedback && (
                      <div className="mt-4">
                        <h5 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">Resultado:</h5>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleFeedbackRequest('contestada')}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Contestada
                          </button>
                          <button
                            onClick={() => handleFeedbackRequest('perdida')}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Perdida
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Mostrar feedback existente si ya lo tiene */}
                    {selectedCall.tiene_feedback && (
                      <div className="mt-4 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                        <h5 className="text-xs font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Feedback Completado:
                        </h5>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-green-700 dark:text-green-300">Resultado:</span>
                            <span className="font-medium text-green-800 dark:text-green-200">
                              {selectedCall.feedback_resultado}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700 dark:text-green-300">Usuario:</span>
                            <span className="font-medium text-green-800 dark:text-green-200">
                              {selectedCall.feedback_user_email}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700 dark:text-green-300">Fecha:</span>
                            <span className="font-medium text-green-800 dark:text-green-200">
                              {selectedCall.feedback_fecha ? new Date(selectedCall.feedback_fecha).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          {selectedCall.feedback_comentarios && (
                            <div className="mt-2">
                              <span className="text-green-700 dark:text-green-300">Comentarios:</span>
                              <p className="text-green-800 dark:text-green-200 mt-1 p-2 bg-green-100 dark:bg-green-900/30 rounded text-xs">
                                {selectedCall.feedback_comentarios}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resumen de la llamada - Abarcar solo las primeras 2 columnas */}
                <div className="lg:col-span-2">
                  {(() => {
                    let resumen = selectedCall.resumen_llamada;
                    
                    // PRIORIZAR datos_llamada.resumen (tiempo real)
                    if (selectedCall.datos_llamada) {
                      try {
                        const datosLlamada = typeof selectedCall.datos_llamada === 'string' 
                          ? JSON.parse(selectedCall.datos_llamada) 
                          : selectedCall.datos_llamada;
                        
                        if (datosLlamada.resumen) {
                          resumen = datosLlamada.resumen;
                        }
                      } catch (e) {
                        console.log('Error parseando datos_llamada para resumen');
                      }
                    }
                    
                    // Si sigue sin resumen para llamadas activas, mostrar mensaje de estado
                    if (!resumen && selectedCall.call_status === 'activa') {
                      resumen = 'Llamada en progreso - el resumen se actualiza conforme avanza la conversación';
                    }
                    
                    return resumen ? (
                      <div className="mt-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Resumen de la Llamada
                          </div>
                          {selectedCall.call_status === 'activa' && (
                            <div className="flex items-center text-xs text-emerald-600 dark:text-emerald-400">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1 animate-pulse"></div>
                              Tiempo real
                            </div>
                          )}
                        </h4>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {resumen}
                          </p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Transferencia */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-[90] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Solicitar Transferencia
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Selecciona el motivo de la transferencia:
                </p>
                
                <div className="space-y-2 mb-6">
                  {transferReasons.map((reason, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setTransferReason(reason);
                        handleTransferCall(reason);
                      }}
                      disabled={transferLoading}
                      className="w-full text-left p-3 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-xs text-slate-900 dark:text-white transition-colors disabled:opacity-50"
                    >
                      <span className="font-medium text-blue-600 dark:text-blue-400">Opción {index + 1}:</span>
                      <br />
                      {reason}
                    </button>
                  ))}
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowTransferModal(false)}
                    disabled={transferLoading}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Feedback Global */}
        {showGlobalFeedbackModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-[80] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Feedback Obligatorio - {
                    globalFeedbackType === 'contestada' ? 'Llamada Contestada' :
                    globalFeedbackType === 'perdida' ? 'Llamada Perdida' :
                    globalFeedbackType === 'transferida' ? 'Llamada Transferida' :
                    globalFeedbackType === 'colgada' ? 'Llamada Finalizada' : 'Feedback'
                  }
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Comentarios sobre la llamada: *
                  </label>
                  <textarea
                    value={globalFeedbackComment}
                    onChange={(e) => setGlobalFeedbackComment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder={
                      globalFeedbackType === 'transferida' ? 'Explica por qué se transfirió la llamada, contexto del prospecto, motivo específico...' :
                      globalFeedbackType === 'colgada' ? 'Explica por qué se finalizó la llamada, resultado obtenido, observaciones...' :
                      'Describe qué pasó en la llamada, calidad del prospecto, observaciones importantes...'
                    }
                    autoFocus
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowGlobalFeedbackModal(false);
                      setGlobalFeedbackType(null);
                      setGlobalFeedbackComment('');
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executeGlobalFeedback}
                    disabled={!globalFeedbackComment.trim()}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg"
                  >
                    Guardar Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveMonitorKanban;
