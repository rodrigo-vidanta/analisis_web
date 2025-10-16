import React, { useState, useEffect, useRef } from 'react';
import { analysisSupabase } from '../../config/analysisSupabase';
import { liveMonitorService, type LiveCallData, type Agent, type FeedbackData } from '../../services/liveMonitorService';
import { useTheme } from '../../hooks/useTheme';

// Función para reproducir sonido de checkpoint completado (4 repeticiones)
const playCheckpointCompleteSound = () => {
  try {
    // Crear un contexto de audio
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Crear una secuencia de tonos para simular una campana
    const playTone = (frequency: number, duration: number, delay: number = 0) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const compressor = audioContext.createDynamicsCompressor();
        
        // Cadena de audio: oscillator -> gain -> compressor -> destination
        oscillator.connect(gainNode);
        gainNode.connect(compressor);
        compressor.connect(audioContext.destination);
        
        // Configurar compressor para sonido más potente
        compressor.threshold.setValueAtTime(-10, audioContext.currentTime);
        compressor.knee.setValueAtTime(20, audioContext.currentTime);
        compressor.ratio.setValueAtTime(8, audioContext.currentTime);
        compressor.attack.setValueAtTime(0.01, audioContext.currentTime);
        compressor.release.setValueAtTime(0.1, audioContext.currentTime);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';
        
        // Envelope para sonido de campana (volumen aumentado)
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.8, audioContext.currentTime + 0.01); // Aumentado de 0.3 a 0.8
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      }, delay);
    };
    
    // Reproducir secuencia 4 veces
    for (let i = 0; i < 4; i++) {
      const baseDelay = i * 800; // 800ms entre cada repetición
      playTone(800, 0.5, baseDelay);     // Tono principal
      playTone(1000, 0.3, baseDelay + 100);  // Armónico
      playTone(600, 0.4, baseDelay + 200);   // Tono grave
    }
    
  } catch (error) {
    console.warn('No se pudo reproducir el sonido de checkpoint:', error);
  }
};

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
  conversacion_completa?: any;
}

const LiveMonitorKanban: React.FC = () => {
  const [activeCalls, setActiveCalls] = useState<KanbanCall[]>([]);
  const [transferredCalls, setTransferredCalls] = useState<KanbanCall[]>([]);  // Renombrado de finishedCalls
  const [failedCalls, setFailedCalls] = useState<KanbanCall[]>([]);
  const [selectedTab, setSelectedTab] = useState<'active' | 'transferred' | 'failed' | 'all'>('active');  // Renombrado finished -> transferred
  const [allCalls, setAllCalls] = useState<KanbanCall[]>([]);
  const [selectedCall, setSelectedCall] = useState<KanbanCall | null>(null);
  const [viewedCalls, setViewedCalls] = useState<Set<string>>(new Set()); // Track de llamadas vistas en modal
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Estados para sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  // Hook de tema para aplicar estilos
  const { getThemeClasses, isLinearTheme } = useTheme();

  // Componente SortableHeader
  const SortableHeader: React.FC<{
    field: string;
    children: React.ReactNode;
    className?: string;
  }> = ({ field, children, className = "" }) => {
    const handleSort = () => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === field && sortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setSortConfig({ key: field, direction });
    };

    return (
      <th 
        className={`px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors ${className}`}
        onClick={handleSort}
      >
        <div className="flex items-center space-x-1">
          <span>{children}</span>
          <div className="flex flex-col">
            <svg 
              className={`w-3 h-3 ${sortConfig?.key === field && sortConfig.direction === 'asc' ? 'text-blue-500' : 'text-slate-400'}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <svg 
              className={`w-3 h-3 -mt-1 ${sortConfig?.key === field && sortConfig.direction === 'desc' ? 'text-blue-500' : 'text-slate-400'}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </th>
    );
  };

  // Función para ordenar datos
  const sortData = (data: KanbanCall[]) => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';

      switch (sortConfig.key) {
        case 'cliente':
          aValue = a.nombre_completo || a.nombre_whatsapp || '';
          bValue = b.nombre_completo || b.nombre_whatsapp || '';
          break;
        case 'agente':
          aValue = a.agent_name || '';
          bValue = b.agent_name || '';
          break;
        case 'telefono':
          aValue = a.whatsapp || '';
          bValue = b.whatsapp || '';
          break;
        case 'duracion':
          aValue = a.duracion_segundos || 0;
          bValue = b.duracion_segundos || 0;
          break;
        case 'fecha':
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        case 'checkpoint':
          aValue = a.checkpoint_venta_actual || '';
          bValue = b.checkpoint_venta_actual || '';
          break;
        case 'estado':
          aValue = a.call_status || '';
          bValue = b.call_status || '';
          break;
        case 'precio':
          aValue = a.precio_paquete || 0;
          bValue = b.precio_paquete || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };
  
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
  
  // Estados para texto personalizado de transferencia
  const [customTransferText, setCustomTransferText] = useState('');
  const [useCustomText, setUseCustomText] = useState(false);
  
  // Estado para mostrar indicador de actualización
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [hasRecentChanges, setHasRecentChanges] = useState(false);
  
  // Estado para conversación en tiempo real
  const [currentConversation, setCurrentConversation] = useState<Array<{speaker: string, message: string, timestamp: string}>>([]);
  const conversationScrollRef = useRef<HTMLDivElement>(null);
  const userScrolledAwayInModalRef = useRef<boolean>(false);
  const detailRealtimeChannelRef = useRef<any>(null);
  const [conversationUpdateTime, setConversationUpdateTime] = useState<Date>(new Date());

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
      await loadCalls(true, true); // preserveRealtimeData=true
      
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

  // Función para sanitizar texto personalizado para API VAPI
  const sanitizeTransferText = (text: string): string => {
    return text
      // Remover caracteres especiales y números
      .replace(/[^a-zA-Z\s]/g, '')
      // Remover espacios múltiples
      .replace(/\s+/g, ' ')
      // Trim espacios al inicio y final
      .trim()
      // Limitar longitud para evitar problemas con API
      .substring(0, 200);
  };

  // Función para parsear conversación en tiempo real
  const parseConversation = (conversacionCompleta: any): Array<{speaker: string, message: string, timestamp: string}> => {
    if (!conversacionCompleta) return [];
    
    try {
      let conversationData;
      
      // Si es string, parsear JSON
      if (typeof conversacionCompleta === 'string') {
        conversationData = JSON.parse(conversacionCompleta);
      } else {
        conversationData = conversacionCompleta;
      }
      
      const conversation = conversationData.conversacion || '';
      if (!conversation) return [];
      
      // Dividir por líneas y parsear cada mensaje
      const lines = conversation.split('\n').filter(line => line.trim());
      const messages = [];
      
      for (const line of lines) {
        // Buscar patrón [timestamp] Speaker: message
        const match = line.match(/^\[(.+?)\]\s+(\w+):\s+(.+)$/);
        if (match) {
          const [, timestamp, speaker, message] = match;
          messages.push({
            speaker: speaker.toLowerCase(),
            message: message.trim(),
            timestamp: timestamp.trim()
          });
        }
      }
      
      return messages;
    } catch (error) {
      console.error('Error parseando conversación:', error);
      return [];
    }
  };

  // Función para actualizar conversación de manera suave
  const updateConversation = (newConversation: Array<{speaker: string, message: string, timestamp: string}>) => {
    setCurrentConversation(prevConversation => {
      // Si no hay cambios, no actualizar
      if (JSON.stringify(prevConversation) === JSON.stringify(newConversation)) {
        return prevConversation;
      }
      
      // Si hay nuevos mensajes, actualizar suavemente
      if (newConversation.length > prevConversation.length) {
        // Auto-scroll al final si el usuario no se ha desplazado manualmente hacia arriba
        if (!userScrolledAwayInModalRef.current) {
          requestAnimationFrame(() => {
            if (conversationScrollRef.current) {
              conversationScrollRef.current.scrollTop = conversationScrollRef.current.scrollHeight;
            }
          });
        }
        setConversationUpdateTime(new Date());
      }
      
      return newConversation;
    });
  };

  // Función para renderizar campo condicionalmente
  const renderField = (label: string, value: any, formatter?: (val: any) => string) => {
    if (!value && value !== 0) return null;
    
    const displayValue = formatter ? formatter(value) : value;
    
    return (
      <div className="flex justify-between">
        <span className="text-slate-500 dark:text-slate-400">{label}:</span>
        <span className="font-medium text-slate-900 dark:text-white text-right">
          {displayValue}
        </span>
      </div>
    );
  };

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

      // Usar texto personalizado si está habilitado y tiene contenido
      const finalMessage = useCustomText && customTransferText.trim() 
        ? sanitizeTransferText(customTransferText)
        : reason;

      const transferData = {
        action: "transfer",
        call_id: selectedCall.call_id,
        control_url: selectedCall.control_url,
        message: finalMessage,
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
        await loadCalls(true, true); // preserveRealtimeData=true
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
        await loadCalls(true, true); // preserveRealtimeData=true
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
  const loadCalls = async (isRefresh = false, preserveRealtimeData = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      } else {
        setIsUpdating(true);
      }
      
      const allCalls = await liveMonitorService.getActiveCalls() as KanbanCall[];
      
      // Si preserveRealtimeData=true, mantener datos actualizados por Realtime
      let finalCalls = allCalls;
      if (preserveRealtimeData) {
        console.log('🔒 [PRESERVE] Manteniendo datos de Realtime, solo agregando llamadas nuevas');
        
        // Crear mapa de llamadas existentes con datos de Realtime
        const existingCallsMap = new Map<string, KanbanCall>();
        [...activeCalls, ...transferredCalls, ...failedCalls].forEach(call => {
          existingCallsMap.set(call.call_id, call);
        });
        
        // Solo actualizar con nuevas llamadas, preservar existentes
        finalCalls = allCalls.map(newCall => {
          const existingCall = existingCallsMap.get(newCall.call_id);
          if (existingCall) {
            // Mantener datos de Realtime, solo actualizar campos que no vienen de tools
            return {
              ...existingCall,
              // Solo actualizar campos "estáticos" que no cambian por tools
              fecha_llamada: newCall.fecha_llamada,
              monitor_url: newCall.monitor_url,
              control_url: newCall.control_url,
              call_sid: newCall.call_sid,
              // NO actualizar: datos_proceso, composicion_familiar_numero, etc.
            };
          }
          return newCall; // Llamada nueva, usar datos completos
        });
      }
      
      // Log minimal para refreshes
      if (!isRefresh) {
        console.log(`🔍 [LIVE MONITOR] Carga inicial: ${allCalls.length} llamadas`);
      }
      
      // Clasificar llamadas por estado con nueva lógica
      const active: KanbanCall[] = [];
      const transferred: KanbanCall[] = [];
      const failed: KanbanCall[] = [];
      
      finalCalls.forEach(call => {
        const hasFeedback = call.tiene_feedback === true;
        const wasViewed = viewedCalls.has(call.call_id);
        
        // Debug: Log de llamadas sospechosas
        if (!isRefresh && call.call_status === 'activa') {
          try {
            const razon = call.datos_llamada?.razon_finalizacion || 
                         (typeof call.datos_llamada === 'string' ? JSON.parse(call.datos_llamada)?.razon_finalizacion : null);
            if (razon) {
              console.log(`🔍 [DEBUG] Llamada ${call.call_id.slice(-8)} status='activa' pero razon='${razon}' - debería estar finalizada`);
            }
          } catch (e) {}
        }
        
        // NUEVA LÓGICA DE CLASIFICACIÓN BASADA EN DATOS REALES:
        
        // Extraer razon_finalizacion de datos_llamada
        let razonFinalizacion = null;
        try {
          if (call.datos_llamada && typeof call.datos_llamada === 'object') {
            razonFinalizacion = call.datos_llamada.razon_finalizacion;
          } else if (call.datos_llamada && typeof call.datos_llamada === 'string') {
            const parsed = JSON.parse(call.datos_llamada);
            razonFinalizacion = parsed.razon_finalizacion;
          }
        } catch (e) {
          // Ignorar errores de parsing
        }
        
        const hasEndReason = razonFinalizacion && razonFinalizacion !== '';
        const hasDuration = call.duracion_segundos && call.duracion_segundos > 0;
        
        // 1. LLAMADAS REALMENTE ACTIVAS: 
        // - SOLO call_status = 'activa' Y NO tienen razon_finalizacion Y NO tienen duración
        if (call.call_status === 'activa' && !hasEndReason && !hasDuration) {
          active.push(call);
        }
        
        // 1.5. LLAMADAS QUE PARECEN ACTIVAS PERO YA FINALIZARON (DETECCIÓN AUTOMÁTICA)
        else if (call.call_status === 'activa' && (hasEndReason || hasDuration)) {
          console.log(`🚨 [AUTO-DETECT] Llamada ${call.call_id.slice(-8)} parece activa pero ya finalizó - reclasificando`);
          
          // Clasificar según razón de finalización
          if (razonFinalizacion === 'assistant-forwarded-call') {
            console.log(`📋 [AUTO-DETECT] → Moviendo a TRANSFERIDAS (${razonFinalizacion})`);
            transferred.push(call);
          } else if (razonFinalizacion === 'customer-ended-call') {
            console.log(`❌ [AUTO-DETECT] → Moviendo a FALLIDAS (${razonFinalizacion})`);
            failed.push(call);
          } else if (hasDuration) {
            console.log(`⏱️ [AUTO-DETECT] → Moviendo a FALLIDAS (tiene duración: ${call.duracion_segundos}s)`);
            failed.push(call);
          } else {
            console.log(`❓ [AUTO-DETECT] → Moviendo a FALLIDAS (estado desconocido)`);
            failed.push(call);
          }
        }
        
        // 2. LLAMADAS TRANSFERIDAS:
        // - call_status = 'transferida' (todas las transferidas van aquí)
        // - razon_finalizacion = 'assistant-forwarded-call' (todas las transferidas van aquí)
        else if (
          (call.call_status === 'transferida' || razonFinalizacion === 'assistant-forwarded-call') &&
          !hasFeedback
        ) {
          transferred.push(call);
        }
        
        // 3. LLAMADAS QUE PARECEN ACTIVAS PERO YA TERMINARON:
        // Estas ya deberían estar corregidas en la BD, pero por si acaso
        else if (call.call_status === 'activa' && hasEndReason) {
          // Cualquier llamada "activa" con razon_finalizacion va a fallidas
          if (!hasFeedback) {
            failed.push(call);
          }
        }
        
        // 4. LLAMADAS FALLIDAS:
        // - call_status = 'colgada', 'perdida'
        // - razon_finalizacion indica falla: 'customer-busy', 'customer-did-not-answer', etc.
        else if (
          call.call_status === 'colgada' ||
          call.call_status === 'perdida' ||
          (hasEndReason && [
            'customer-busy',
            'customer-did-not-answer', 
            'customer-ended-call',
            'assistant-ended-call'
          ].includes(razonFinalizacion))
        ) {
          // Solo mostrar si NO tienen feedback
          if (!hasFeedback) {
            failed.push(call);
          }
        }
        
        // 5. LLAMADAS FINALIZADAS EXITOSAS:
        // - call_status = 'finalizada', 'exitosa'
        // - Tienen duración > 0
        // Estas NO aparecen en pestañas activas, solo en historial con feedback
      });
      
      // Actualización inteligente que detecta cambios sin re-render innecesario
      if (isRefresh) {
        // Crear mapas completos de todas las llamadas (activas, transferidas, fallidas)
        const currentAllCalls = new Map();
        [...activeCalls, ...transferredCalls, ...failedCalls].forEach(call => {
          currentAllCalls.set(call.call_id, {
            status: call.call_status,
            checkpoint: call.checkpoint_venta_actual,
            duration: call.duracion_segundos,
            hasFeedback: call.tiene_feedback
          });
        });
        
        const newAllCalls = new Map();
        [...active, ...transferred, ...failed].forEach(call => {
          newAllCalls.set(call.call_id, {
            status: call.call_status,
            checkpoint: call.checkpoint_venta_actual,
            duration: call.duracion_segundos,
            hasFeedback: call.tiene_feedback
          });
        });
        
        // Detectar cambios específicos
        let hasChanges = false;
        const changes = [];
        
        // 1. Verificar llamadas que cambiaron de activa a finalizada
        for (const [callId, currentState] of currentAllCalls) {
          const newState = newAllCalls.get(callId);
          
          if (newState) {
            // La llamada sigue existiendo, verificar cambios de estado
            if (currentState.status === 'activa' && newState.status !== 'activa') {
              hasChanges = true;
              changes.push(`📞 Llamada ${callId.slice(-8)} cambió de activa a ${newState.status}`);
            }
            // Verificar cambios de checkpoint
            if (currentState.checkpoint !== newState.checkpoint) {
              hasChanges = true;
              changes.push(`🔄 Llamada ${callId.slice(-8)} cambió checkpoint: ${currentState.checkpoint} → ${newState.checkpoint}`);
            }
            // Verificar cambios de duración (llamada finalizada)
            if (currentState.duration !== newState.duration && newState.duration > 0) {
              hasChanges = true;
              changes.push(`⏱️ Llamada ${callId.slice(-8)} finalizada con duración: ${newState.duration}s`);
            }
          } else {
            // La llamada ya no existe en la nueva consulta (posiblemente finalizada y movida)
            if (currentState.status === 'activa') {
              hasChanges = true;
              changes.push(`📞 Llamada ${callId.slice(-8)} desapareció de activas (posiblemente finalizada)`);
            }
          }
        }
        
        // 2. Verificar nuevas llamadas activas
        for (const [callId, newState] of newAllCalls) {
          if (!currentAllCalls.has(callId) && newState.status === 'activa') {
            hasChanges = true;
            changes.push(`🆕 Nueva llamada activa: ${callId.slice(-8)}`);
          }
        }
        
        // Log de cambios si los hay
        if (hasChanges && changes.length > 0) {
          console.log('🔄 Cambios detectados:', changes);
          setLastUpdateTime(new Date());
          setHasRecentChanges(true);
          // Reset indicador después de 2 segundos
          setTimeout(() => setHasRecentChanges(false), 2000);
        }
        
        // Solo actualizar si hay cambios detectados
        if (hasChanges) {
          setActiveCalls(active);
          setTransferredCalls(transferred);
          setFailedCalls(failed);
        }
        
        // Filtrar llamadas COMPLETAMENTE procesadas para pestaña "Historial"
        const completedCalls = allCalls.filter(call => {
          const hasFeedback = call.tiene_feedback === true;
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
        setTransferredCalls(transferred);
        setFailedCalls(failed);
      }
      
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
      
      // Log resumen solo en carga inicial
      if (!isRefresh) {
        console.log('📊 [LIVE MONITOR] Clasificación:', {
        activas: active.length,
        transferidas: transferred.length,
        fallidas: failed.length,
        historial: completedCalls.length
      });
        
        // Log detallado de estados para debugging
        const statusCount = allCalls.reduce((acc, call) => {
          acc[call.call_status || 'null'] = (acc[call.call_status || 'null'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('📊 [DEBUG] Estados reales en BD:', statusCount);
        console.log('📊 [DEBUG] Llamadas vistas en modal:', viewedCalls.size);
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
    // Realtime: escuchar updates en llamadas_ventas para refrescar al instante
    const channel = analysisSupabase
      .channel('live-monitor-calls')
      // INSERT: nuevas llamadas deben aparecer inmediatamente
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'llamadas_ventas'
      }, async (payload) => {
        console.log('📨 Nueva llamada insertada:', payload.new?.call_id);
        try {
          await loadCalls(true, true); // preserveRealtimeData=true para no sobrescribir
        } catch (e) {
          console.error('Error refreshing calls on realtime (INSERT):', e);
        }
      })
      // UPDATE: cambios de checkpoint/estado - CRÍTICO para movimiento entre checkpoints
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'llamadas_ventas'
      }, async (payload) => {
        const rec = payload.new as any;
        const oldRec = payload.old as any;
        
        if (rec && oldRec) {
          // Log específico para cambios de checkpoint
          if (rec.checkpoint_venta_actual !== oldRec.checkpoint_venta_actual) {
            console.log(`🔄 Checkpoint actualizado: ${rec.call_id?.slice(-8)} ${oldRec.checkpoint_venta_actual} → ${rec.checkpoint_venta_actual}`);
            
            // Sonido cuando llega al último checkpoint
            if (rec.checkpoint_venta_actual === 'checkpoint #5') {
              console.log('🔔 Llamada llegó al último checkpoint, reproduciendo sonido...');
              playCheckpointCompleteSound();
            }
          }
          
          // Log para cambios de call_status
          if (rec.call_status !== oldRec.call_status) {
            console.log(`📞 Estado actualizado: ${rec.call_id?.slice(-8)} ${oldRec.call_status} → ${rec.call_status}`);
            
            // RECLASIFICACIÓN AUTOMÁTICA cuando llamada cambia de activa → finalizada
            if (oldRec.call_status === 'activa' && rec.call_status === 'finalizada') {
              console.log(`🎯 [AUTO-CLASSIFY] Llamada ${rec.call_id?.slice(-8)} finalizó - reclasificando automáticamente`);
              
              // Extraer razon_finalizacion para clasificar correctamente
              let razonFinalizacion = null;
              try {
                const datosLlamada = typeof rec.datos_llamada === 'string' 
                  ? JSON.parse(rec.datos_llamada) 
                  : rec.datos_llamada;
                razonFinalizacion = datosLlamada?.razon_finalizacion;
              } catch (e) {
                console.warn('Error parsing datos_llamada para razon_finalizacion');
              }
              
              console.log(`🔍 [AUTO-CLASSIFY] Razón de finalización: ${razonFinalizacion}`);
              
              // Forzar reclasificación inmediata después de actualizar datos locales
              setTimeout(() => {
                console.log(`🔄 [AUTO-CLASSIFY] Ejecutando reclasificación automática para ${rec.call_id?.slice(-8)}`);
                loadCalls(true, true); // preserveRealtimeData=true
              }, 500);
            }
          }
          
          // Actualización inteligente de datos en todas las listas
          const updateCallData = (calls: KanbanCall[]) => {
            return calls.map(call => {
              if (call.call_id === rec.call_id) {
                console.log(`📊 [REALTIME] Actualizando llamada ${rec.call_id?.slice(-8)} - checkpoint: ${rec.checkpoint_venta_actual}`);
                
                // Parsear datos_proceso para obtener datos familiares actualizados
                let datosProcesoActualizados = rec.datos_proceso;
                if (typeof rec.datos_proceso === 'string') {
                  try {
                    datosProcesoActualizados = JSON.parse(rec.datos_proceso);
                    console.log(`📊 [REALTIME] datos_proceso parseado:`, datosProcesoActualizados);
                  } catch (e) {
                    datosProcesoActualizados = call.datos_proceso;
                  }
                }
                
                // Parsear datos_llamada también
                let datosLlamadaActualizados = rec.datos_llamada;
                if (typeof rec.datos_llamada === 'string') {
                  try {
                    datosLlamadaActualizados = JSON.parse(rec.datos_llamada);
                  } catch (e) {
                    datosLlamadaActualizados = call.datos_llamada;
                  }
                }
                
                const updatedCall = { 
                  ...call, 
                  ...rec,
                  datos_proceso: datosProcesoActualizados,
                  datos_llamada: datosLlamadaActualizados
                };
                
                console.log(`📊 [REALTIME] Llamada actualizada con datos:`, {
                  checkpoint: updatedCall.checkpoint_venta_actual,
                  numero_personas: datosProcesoActualizados?.numero_personas,
                  tipo_actividades: datosProcesoActualizados?.tipo_actividades,
                  composicion_familiar_numero: updatedCall.composicion_familiar_numero
                });
                
                return updatedCall;
              }
              return call;
            });
          };
          
          setActiveCalls(updateCallData);
          setTransferredCalls(updateCallData);
          setFailedCalls(updateCallData);
        }
        
        // NO hacer loadCalls para evitar sobrescribir datos actualizados con datos viejos del prospecto
        // La actualización local ya maneja todos los cambios necesarios
        console.log(`✅ [REALTIME] Datos actualizados localmente para ${rec.call_id?.slice(-8)} - NO sobrescribiendo con prospecto`);
        
        // Solo hacer loadCalls si hay cambios de estado que requieren reclasificación
        if (rec && oldRec && rec.call_status !== oldRec.call_status) {
          console.log(`🔄 [REALTIME] Reclasificando por cambio de estado: ${oldRec.call_status} → ${rec.call_status}`);
          try {
            await loadCalls(true, true); // preserveRealtimeData=true
          } catch (e) {
            console.error('Error refreshing calls on realtime (UPDATE):', e);
          }
        }
      })
      .subscribe((status) => {
        console.log('📡 Estado de suscripción Realtime:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Live Monitor conectado a Realtime - detectará cambios de checkpoint automáticamente');
        }
      });

    // Los datos familiares se actualizan en llamadas_ventas, no en prospectos
    // La suscripción principal ya maneja estos cambios

    // NO usar polling frecuente - Realtime es suficiente para updates dinámicos
    // Solo polling lento para detectar llamadas completamente nuevas que no lleguen por Realtime
    const interval = setInterval(() => {
      console.log('🔄 [POLLING] Verificación lenta de nuevas llamadas (preservando datos RT)');
      loadCalls(true, true); // isRefresh=true, preserveRealtimeData=true
    }, 30000); // Cada 30 segundos, no cada 3
    
    return () => {
      clearInterval(interval);
      try { channel.unsubscribe(); } catch {}
    };
  }, []);

  // Manejar apertura del modal de detalle
  const handleCallSelect = (call: KanbanCall) => {
    setSelectedCall(call);
    
    // Marcar llamada como vista para la lógica de transferencia
    setViewedCalls(prev => new Set(prev).add(call.call_id));
    
    console.log(`👁️ Modal abierto para llamada: ${call.call_id.slice(-8)} (checkpoint: ${call.checkpoint_venta_actual}, status: ${call.call_status})`);
  };

  // Manejar cierre del modal de detalle
  const handleModalClose = () => {
    const currentCall = selectedCall;
    setSelectedCall(null);
    
    if (currentCall) {
      console.log(`🚪 Modal cerrado para llamada: ${currentCall.call_id.slice(-8)}`);
      
      // LÓGICA ESPECÍFICA: Si está en checkpoint #5, mover automáticamente a "Transferidas"
      if (currentCall.checkpoint_venta_actual === 'checkpoint #5') {
        console.log('🎯 [CHECKPOINT #5] Llamada en Presentación de Oportunidad - moviendo automáticamente a Transferidas');
        
        // Marcar como vista para que se mueva a transferidas
        setViewedCalls(prev => new Set([...prev, currentCall.call_id]));
        
        // Forzar reclasificación inmediata
        setTimeout(() => loadCalls(true, true), 200);
        return;
      }
      
      // Verificar estado actual de la llamada en BD antes de reclasificar (para otros casos)
      const checkAndReclassify = async () => {
        try {
          const { data } = await analysisSupabase
            .from('llamadas_ventas')
            .select('call_status, checkpoint_venta_actual, datos_llamada')
            .eq('call_id', currentCall.call_id)
            .single();
          
          if (data) {
            console.log(`📊 Estado actual en BD: ${data.call_status}, checkpoint: ${data.checkpoint_venta_actual}`);
            
            // Si la llamada cambió de estado, reclasificar
            const razonFinalizacion = data.datos_llamada?.razon_finalizacion;
            
            if (
              data.call_status !== 'activa' ||
              razonFinalizacion === 'assistant-forwarded-call' ||
              razonFinalizacion === 'customer-ended-call' ||
              razonFinalizacion === 'assistant-ended-call'
            ) {
              console.log('🔄 Reclasificando llamada después de verificar BD...');
              setTimeout(() => loadCalls(true, true), 100); // preserveRealtimeData=true
            }
          }
        } catch (error) {
          console.warn('Error verificando estado de llamada:', error);
          // Fallback: reclasificar de todos modos
          setTimeout(() => loadCalls(true, true), 100); // preserveRealtimeData=true
        }
      };
      
      checkAndReclassify();
    }
  };

  // Efecto para actualizar conversación en tiempo real (sin parpadeos)
  useEffect(() => {
    // Limpiar canal anterior
    try { detailRealtimeChannelRef.current?.unsubscribe?.(); } catch {}
    detailRealtimeChannelRef.current = null;

    if (!selectedCall || selectedCall.call_status !== 'activa') {
      setCurrentConversation([]);
      return;
    }

    // Cargar estado inicial
    updateConversation(parseConversation(selectedCall.conversacion_completa));

    // Suscribirse a cambios de la fila específica de la llamada activa
    const channel = analysisSupabase
      .channel(`live-monitor-call-${selectedCall.call_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'llamadas_ventas',
        filter: `call_id=eq.${selectedCall.call_id}`
      }, (payload) => {
        const rec = payload.new as any;
        if (!rec) return;
        
        // Detectar cambio de checkpoint para reproducir sonido
        const oldCheckpoint = selectedCall.checkpoint_venta_actual;
        const newCheckpoint = rec.checkpoint_venta_actual;
        
        if (oldCheckpoint !== newCheckpoint && newCheckpoint === 'checkpoint #5') {
          console.log('🔔 Llamada llegó al último checkpoint, reproduciendo sonido...');
          playCheckpointCompleteSound();
        }
        
        // Actualizar conversación
        const newConversation = parseConversation(rec.conversacion_completa);
        updateConversation(newConversation);
        
        // Actualizar el selectedCall con los nuevos datos (incluyendo resumen y datos_proceso)
        setSelectedCall(prev => {
          if (prev && prev.call_id === rec.call_id) {
            console.log(`📊 Actualizando datos completos de llamada seleccionada: ${rec.call_id?.slice(-8)}`);
            
            // Parsear datos_proceso si es string
            let datosProcesoActualizados = rec.datos_proceso;
            if (typeof rec.datos_proceso === 'string') {
              try {
                datosProcesoActualizados = JSON.parse(rec.datos_proceso);
              } catch (e) {
                datosProcesoActualizados = prev.datos_proceso;
              }
            }
            
            // Parsear datos_llamada para obtener resumen actualizado
            let datosLlamadaActualizados = rec.datos_llamada;
            if (typeof rec.datos_llamada === 'string') {
              try {
                datosLlamadaActualizados = JSON.parse(rec.datos_llamada);
              } catch (e) {
                datosLlamadaActualizados = prev.datos_llamada;
              }
            }
            
            return { 
              ...prev, 
              ...rec,
              datos_proceso: datosProcesoActualizados,
              datos_llamada: datosLlamadaActualizados
            };
          }
          return prev;
        });
      })
      .subscribe();

    detailRealtimeChannelRef.current = channel;

    return () => {
      try { channel.unsubscribe(); } catch {}
      detailRealtimeChannelRef.current = null;
    };
  }, [selectedCall?.call_id, selectedCall?.call_status]);

  // Efecto para reclasificar cuando cambie el conjunto de llamadas vistas
  useEffect(() => {
    if (viewedCalls.size > 0) {
      console.log(`👁️ Llamadas vistas: ${viewedCalls.size}, reclasificando...`);
      setTimeout(() => loadCalls(true, true), 500); // preserveRealtimeData=true
    }
  }, [viewedCalls.size]);

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
        onClick={() => handleCallSelect(call)}
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

          {/* Información clave */}
        <div className="space-y-1">
          {/* Destino */}
          {(call.destino_preferido || call.destino_preferencia) && (
            <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
              <svg className="w-3 h-3 mr-1 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span className="truncate font-medium text-blue-600 dark:text-blue-400">
                {call.destino_preferido?.replace('_', ' ') || call.destino_preferencia?.join(', ')}
              </span>
            </div>
          )}
          
          {/* Grupo familiar - PRIORIZAR datos_proceso.numero_personas */}
          {(() => {
            // Extraer número de personas con prioridad correcta
            let numeroPersonas = null;
            let esActualizado = false;
            
            try {
              // 1. PRIORIDAD MÁXIMA: datos_proceso.numero_personas (tiempo real)
              const datosProc = typeof call.datos_proceso === 'string' 
                ? JSON.parse(call.datos_proceso) 
                : call.datos_proceso;
              
              if (datosProc?.numero_personas) {
                numeroPersonas = datosProc.numero_personas;
                esActualizado = true;
                console.log(`👨‍👩‍👧‍👦 [DEBUG] Usando datos_proceso.numero_personas: ${numeroPersonas} para llamada ${call.call_id.slice(-8)}`);
              }
            } catch (e) {
              // Ignorar errores de parsing
            }
            
            // 2. SEGUNDA PRIORIDAD: composicion_familiar_numero (campo de llamada)
            if (!numeroPersonas && call.composicion_familiar_numero) {
              numeroPersonas = call.composicion_familiar_numero;
              console.log(`👨‍👩‍👧‍👦 [DEBUG] Usando composicion_familiar_numero: ${numeroPersonas} para llamada ${call.call_id.slice(-8)}`);
            }
            
            // 3. ÚLTIMA PRIORIDAD: tamano_grupo (campo del prospecto - puede estar desactualizado)
            if (!numeroPersonas && call.tamano_grupo) {
              numeroPersonas = call.tamano_grupo;
              console.log(`👨‍👩‍👧‍👦 [DEBUG] Fallback a tamano_grupo: ${numeroPersonas} para llamada ${call.call_id.slice(-8)} (PUEDE ESTAR DESACTUALIZADO)`);
            }
            
            return numeroPersonas ? (
              <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
                <svg className="w-3 h-3 mr-1 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <span className={`font-semibold ${esActualizado ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
                  {numeroPersonas}p
                </span>
                {esActualizado && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(RT)</span>
                )}
              </div>
            ) : null;
          })()}
          
          {/* Mes preferencia - Solo si está actualizado */}
          {call.mes_preferencia && (
            <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
              <svg className="w-3 h-3 mr-1 flex-shrink-0 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                Mes {call.mes_preferencia}
              </span>
              <svg className="w-3 h-3 ml-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          )}
          
          {/* Actividades preferidas */}
          {call.preferencia_vacaciones && call.preferencia_vacaciones.length > 0 && (
            <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
              <svg className="w-3 h-3 mr-1 flex-shrink-0 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="truncate font-medium text-purple-600 dark:text-purple-400">
                {call.preferencia_vacaciones.join(', ')}
              </span>
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
      {/* Estilos CSS personalizados para animaciones de checkpoint y chat */}
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
        
        /* Animaciones para chat en tiempo real */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
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
        <div className="text-center relative">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Live Monitor - Vista Kanban
          </h1>
          <div className="text-slate-600 dark:text-slate-400 flex items-center justify-center space-x-2">
            <span>Gestión visual del proceso de ventas por checkpoints</span>
            {hasRecentChanges && (
              <span className="inline-flex items-center text-xs text-green-600 dark:text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                Actualizado
              </span>
            )}
          </div>
          
          {/* Botón de refresh manual */}
          <button
            onClick={() => loadCalls(true, false)} // Manual refresh SÍ puede sobrescribir
            disabled={isUpdating}
            className="absolute top-0 right-0 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-3 py-1 rounded-lg text-sm font-medium flex items-center space-x-1 transition-colors"
          >
            <svg 
              className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isUpdating ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="corp-card corp-glow overflow-hidden">
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
              onClick={() => setSelectedTab('transferred')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                selectedTab === 'transferred'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-b-2 border-green-500'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Transferidas</span>
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {transferredCalls.length}
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

            {selectedTab === 'transferred' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <SortableHeader field="cliente" className="w-64">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Cliente</span>
                        </div>
                      </SortableHeader>
                      <SortableHeader field="agente" className="w-48">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          <span>Agente</span>
                        </div>
                      </SortableHeader>
                      <SortableHeader field="telefono" className="w-32">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>Teléfono</span>
                        </div>
                      </SortableHeader>
                      <SortableHeader field="duracion" className="w-24">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Duración</span>
                        </div>
                      </SortableHeader>
                      <SortableHeader field="checkpoint" className="w-40">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Checkpoint</span>
                        </div>
                      </SortableHeader>
                      <SortableHeader field="fecha" className="w-32">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Fecha</span>
                        </div>
                      </SortableHeader>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider w-20">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {sortData(transferredCalls).map((call) => (
                      <tr 
                        key={call.call_id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        onClick={() => handleCallSelect(call)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {(call.nombre_completo || call.nombre_whatsapp || 'U').charAt(0).toUpperCase()}
                      </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {call.nombre_completo || call.nombre_whatsapp || 'Sin nombre'}
                      </div>
                    </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 dark:text-white">
                            {call.agent_name || 'No asignado'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 dark:text-white">
                            {call.whatsapp || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 dark:text-white">
                            {Math.floor((call.duracion_segundos || 0) / 60)}:{String((call.duracion_segundos || 0) % 60).padStart(2, '0')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {call.checkpoint_venta_actual || 'No definido'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 dark:text-white">
                            {call.created_at ? new Date(call.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {call.es_venta_exitosa !== null ? (
                            call.es_venta_exitosa ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                                Exitosa
                              </span>
                        ) : (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                                No cerrada
                              </span>
                            )
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                              Pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {transferredCalls.length === 0 && (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-slate-500 dark:text-slate-400">No hay llamadas transferidas</p>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'failed' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <SortableHeader field="cliente" className="w-64">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Cliente</span>
                        </div>
                      </SortableHeader>
                      <SortableHeader field="agente" className="w-48">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          <span>Agente</span>
                        </div>
                      </SortableHeader>
                      <SortableHeader field="telefono" className="w-32">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>Teléfono</span>
                        </div>
                      </SortableHeader>
                      <SortableHeader field="estado" className="w-32">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Estado</span>
                        </div>
                      </SortableHeader>
                      <SortableHeader field="fecha" className="w-32">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Fecha</span>
                        </div>
                      </SortableHeader>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider w-20">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {sortData(failedCalls).map((call) => (
                      <tr 
                    key={call.call_id} 
                        className="hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                    onClick={() => {
                      handleCallSelect(call);
                      handleFeedbackRequest('perdida');
                    }}
                  >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {(call.nombre_completo || call.nombre_whatsapp || 'U').charAt(0).toUpperCase()}
                      </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {call.nombre_completo || call.nombre_whatsapp || 'Sin nombre'}
                      </div>
                    </div>
                    </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 dark:text-white">
                            {call.agent_name || 'No asignado'}
                  </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 dark:text-white">
                            {call.whatsapp || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            {call.call_status || 'Fallida'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 dark:text-white">
                            {call.created_at ? new Date(call.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Marcar perdida
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {failedCalls.length === 0 && (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                      <SortableHeader field="cliente" className="w-64">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Cliente</span>
                        </div>
                      </SortableHeader>
                      <SortableHeader field="estado" className="w-32">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Estado</span>
                        </div>
                      </SortableHeader>
                      <SortableHeader field="checkpoint" className="w-40">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Checkpoint</span>
                        </div>
                      </SortableHeader>
                      <SortableHeader field="duracion" className="w-24">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Duración</span>
                        </div>
                      </SortableHeader>
                      <SortableHeader field="precio" className="w-24">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          <span>Precio</span>
                        </div>
                      </SortableHeader>
                      <SortableHeader field="fecha" className="w-32">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Fecha</span>
                        </div>
                      </SortableHeader>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider w-20">
                        Feedback
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {sortData(allCalls).map((call) => (
                      <tr 
                        key={call.call_id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        onClick={() => handleCallSelect(call)}
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
               onClick={(e) => e.target === e.currentTarget && handleModalClose()}>
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
                    onClick={handleModalClose}
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
                {/* Resumen de la llamada - Al top */}
                {(() => {
                  let resumen = selectedCall.resumen_llamada;
                  
                  // PRIORIZAR datos_llamada.resumen (tiempo real) sobre resumen_llamada
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
                  
                  // Si no hay resumen en datos_llamada, usar resumen_llamada
                  if (!resumen && selectedCall.resumen_llamada) {
                    resumen = selectedCall.resumen_llamada;
                  }
                  
                  // Si aún no hay resumen para llamadas activas, mostrar mensaje dinámico
                  if (!resumen && selectedCall.call_status === 'activa') {
                    resumen = 'Llamada en progreso - el resumen se actualiza conforme avanza la conversación';
                  }
                  
                  // Si no hay resumen para llamadas finalizadas, mostrar estado
                  if (!resumen) {
                    resumen = `Llamada ${selectedCall.call_status} - sin resumen disponible`;
                  }
                  
                  return resumen ? (
                    <div className="mb-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
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
                
                {/* Grid de información: Personal, Viaje, Detalles */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                  
                  {/* Información Personal Completa */}
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center">
                      <svg className="w-3 h-3 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Información Personal
                    </h4>
                    <div className="space-y-1 text-xs">
                      {renderField('Nombre Completo', selectedCall.nombre_completo)}
                      {renderField('WhatsApp', selectedCall.nombre_whatsapp)}
                      {renderField('Teléfono', selectedCall.whatsapp)}
                      {renderField('Email', selectedCall.email)}
                      {renderField('Ciudad', selectedCall.ciudad_residencia)}
                      {renderField('Estado Civil', selectedCall.estado_civil)}
                      {renderField('Edad', selectedCall.edad)}
                      {renderField('Etapa', selectedCall.etapa)}
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
                      {renderField('Checkpoint', selectedCall.checkpoint_venta_actual, (val) => val || 'checkpoint #1')}
                      {renderField('Grupo', 
                        (() => {
                          // Priorizar datos_proceso.numero_personas (tiempo real) sobre campos estáticos
                          try {
                            const datosProc = typeof selectedCall.datos_proceso === 'string' 
                              ? JSON.parse(selectedCall.datos_proceso) 
                              : selectedCall.datos_proceso;
                            return datosProc?.numero_personas || selectedCall.composicion_familiar_numero || selectedCall.tamano_grupo;
                          } catch (e) {
                            return selectedCall.composicion_familiar_numero || selectedCall.tamano_grupo;
                          }
                        })(), 
                        (val) => `${val}p`
                      )}
                      {renderField('Actividades Preferidas', 
                        (() => {
                          try {
                            const datosProc = typeof selectedCall.datos_proceso === 'string' 
                              ? JSON.parse(selectedCall.datos_proceso) 
                              : selectedCall.datos_proceso;
                            return datosProc?.tipo_actividades;
                          } catch (e) {
                            return null;
                          }
                        })()
                      )}
                      {renderField('Viaja con', selectedCall.viaja_con)}
                      {renderField('Destino', selectedCall.destino_preferido?.replace('_', ' ') || selectedCall.destino_preferencia?.join(', '))}
                      {renderField('Menores', selectedCall.cantidad_menores)}
                      {renderField('Noches', selectedCall.numero_noches)}
                      {renderField('Mes Preferencia', selectedCall.mes_preferencia)}
                      {renderField('Interés Principal', selectedCall.interes_principal)}
                      {renderField('Campaña', selectedCall.campana_origen)}
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
                      {renderField('Duración', selectedCall.duracion_segundos, (val) => val ? `${Math.floor(val / 60)}:${(val % 60).toString().padStart(2, '0')}` : 'En curso')}
                      {renderField('Nivel Interés', selectedCall.nivel_interes, (val) => val || 'En evaluación')}
                      {renderField('Resort', selectedCall.resort_ofertado)}
                      {renderField('Habitación', selectedCall.habitacion_ofertada)}
                      {renderField('Tipo Llamada', selectedCall.tipo_llamada)}
                      {renderField('Oferta Presentada', selectedCall.oferta_presentada, (val) => val ? 'Sí' : 'No')}
                      {renderField('Costo Total', selectedCall.costo_total, (val) => `$${val}`)}
                      {renderField('Objeciones', selectedCall.principales_objeciones, (val) => val || 'Sin objeciones')}
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
                          className="corp-button-primary bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center"
                        >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Contestada
                          </button>
                        <button
                          onClick={() => handleFeedbackRequest('perdida')}
                          className="corp-button-primary bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center"
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

                
                {/* Conversación en Tiempo Real - Solo para llamadas activas */}
                {selectedCall.call_status === 'activa' && (
                      <div className="mt-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
                          <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        Conversación en Tiempo Real
                          </div>
                      <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
                        En vivo
                            </div>
                        </h4>
                    
                    <div ref={conversationScrollRef} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 max-h-80 overflow-y-auto"
                         onScroll={(e) => {
                           const el = e.currentTarget as HTMLDivElement;
                           const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                           userScrolledAwayInModalRef.current = distanceFromBottom > 120;
                         }}>
                      <div className="p-3 space-y-3">
                        {currentConversation.length > 0 ? (
                          currentConversation.map((msg, index) => (
                            <div 
                              key={`${msg.timestamp}-${index}`} 
                              className={`flex ${msg.speaker === 'agente' ? 'justify-start' : 'justify-end'} transition-all duration-300 ease-in-out`}
                              style={{
                                animation: `fadeInUp 0.3s ease-out ${index * 0.1}s both`
                              }}
                            >
                              <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg transition-all duration-200 ${
                                msg.speaker === 'agente' 
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-900/40' 
                                  : 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-900/40'
                              }`}>
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-xs font-medium opacity-75">
                                    {msg.speaker === 'agente' ? '🤖 Agente IA' : '👤 Cliente'}
                                  </span>
                                  <span className="text-xs opacity-60">
                                    {msg.timestamp}
                                  </span>
                                </div>
                                <p className="text-sm leading-relaxed">
                                  {msg.message}
                          </p>
                        </div>
                      </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <div className="flex items-center justify-center space-x-2 text-slate-500 dark:text-slate-400">
                              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
                            <p className="text-sm mt-2">
                              Esperando conversación...
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
                  Selecciona el motivo de la transferencia o escribe un mensaje personalizado:
                </p>
                
                {/* Opción de texto personalizado */}
                <div className="mb-4">
                  <label className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={useCustomText}
                      onChange={(e) => setUseCustomText(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Usar mensaje personalizado
                    </span>
                  </label>
                  
                  {useCustomText && (
                    <div className="mt-2">
                      <textarea
                        value={customTransferText}
                        onChange={(e) => setCustomTransferText(e.target.value)}
                        placeholder="Escribe tu mensaje personalizado para la transferencia (solo letras y espacios)..."
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        rows={3}
                        maxLength={200}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Solo se permiten letras y espacios. Máximo 200 caracteres.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Opciones predefinidas - Solo mostrar si no se usa texto personalizado */}
                {!useCustomText && (
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
                )}
                
                {/* Botón para enviar texto personalizado */}
                {useCustomText && (
                  <div className="mb-6">
                    <button
                      onClick={() => handleTransferCall(customTransferText)}
                      disabled={transferLoading || !customTransferText.trim()}
                      className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      {transferLoading ? 'Transfiriendo...' : 'Enviar Transferencia Personalizada'}
                    </button>
                  </div>
                )}
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowTransferModal(false);
                      setUseCustomText(false);
                      setCustomTransferText('');
                      setTransferReason('');
                    }}
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
