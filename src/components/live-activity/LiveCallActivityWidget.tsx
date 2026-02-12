/**
 * ============================================
 * PANEL LATERAL DE LLAMADAS EN VIVO
 * ============================================
 * 
 * Panel global que muestra llamadas activas en tiempo real
 * como pestañas en el borde derecho. Se superpone a todo el 
 * contenido de la aplicación.
 * 
 * Características:
 * - Animaciones de entrada/salida suaves
 * - Cards colapsadas que se apilan como pestañas
 * - Panel expandido con transcripción en vivo
 * - Audio en tiempo real
 * - Scroll cuando hay muchas llamadas
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveActivityStore } from '../../stores/liveActivityStore';
import type { WidgetCallData } from '../../stores/liveActivityStore';
import { CallCard } from './CallCard';
import { ExpandedCallPanel } from './ExpandedCallPanel';
import { MinimizedCallTab } from './MinimizedCallTab';
import { TransferModal } from '../analysis/TransferModal';
import type { TransferCallData } from '../analysis/TransferModal';

// Tiempo para auto-minimizar llamadas si el usuario no interactúa (10 segundos)
const AUTO_MINIMIZE_DELAY_MS = 10000;

// Configuración de audio WebSocket
const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000,
  LATENCY_HINT: 'interactive' as AudioContextLatencyCategory
};

export const LiveCallActivityWidget: React.FC = () => {
  const { user, canAccessLiveMonitor } = useAuth();
  const {
    widgetCalls,
    expandedCallId,
    minimizedCallIds,
    permanentOpenCallIds,
    isWidgetEnabled,
    isWidgetVisible,
    isLoading,
    liveTranscriptions,
    initialize,
    cleanup,
    expandCall,
    collapseCall,
    minimizeCall,
    restoreCall,
    updateTranscription
  } = useLiveActivityStore();
  
  // Estado de audio
  const [isListening, setIsListening] = useState(false);
  const [listeningCallId, setListeningCallId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWebSocketRef = useRef<WebSocket | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  
  // Estado del modal de transferencia
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferCall, setTransferCall] = useState<TransferCallData | null>(null);
  
  // Inicializar store cuando el usuario está autenticado
  useEffect(() => {
    if (user?.id && user?.role_name && canAccessLiveMonitor()) {
      initialize(user.id, user.role_name);
    }
    
    return () => {
      cleanup();
      stopAudioMonitoring();
    };
  }, [user?.id, user?.role_name, canAccessLiveMonitor, initialize, cleanup]);
  
  // Polling ELIMINADO - Realtime via RealtimeHub cubre todos los escenarios:
  // - Nueva llamada: INSERT → debouncedLoadActiveCalls() (2s)
  // - Update en progreso: UPDATE → updateCall() incremental (0 queries)
  // - Llamada finaliza: UPDATE → grace period 5s → removeCall()
  
  // Auto-minimizar llamadas después de 10 segundos si el usuario no interactuó
  // Ref para trackear cuando aparecieron las llamadas
  const callAppearanceTimesRef = useRef<Map<string, number>>(new Map());
  
  useEffect(() => {
    if (!isWidgetEnabled) return;
    
    const now = Date.now();
    
    // Registrar nuevas llamadas
    widgetCalls.forEach(call => {
      if (!callAppearanceTimesRef.current.has(call.call_id)) {
        callAppearanceTimesRef.current.set(call.call_id, now);
      }
    });
    
    // Limpiar llamadas que ya no existen
    const currentIds = new Set(widgetCalls.map(c => c.call_id));
    callAppearanceTimesRef.current.forEach((_, callId) => {
      if (!currentIds.has(callId)) {
        callAppearanceTimesRef.current.delete(callId);
      }
    });
    
    // Verificar cuáles deben auto-minimizarse
    const checkAutoMinimize = () => {
      const currentTime = Date.now();
      const state = useLiveActivityStore.getState();
      
      widgetCalls.forEach(call => {
        const appearanceTime = callAppearanceTimesRef.current.get(call.call_id);
        if (!appearanceTime) return;
        
        const elapsed = currentTime - appearanceTime;
        const isMinimized = state.minimizedCallIds.has(call.call_id);
        const isPermanent = state.permanentOpenCallIds.has(call.call_id);
        const isExpanded = state.expandedCallId === call.call_id;
        
        // Auto-minimizar si:
        // - Han pasado más de 10 segundos
        // - No está minimizada
        // - No está marcada como permanente
        // - No está expandida
        if (elapsed >= AUTO_MINIMIZE_DELAY_MS && !isMinimized && !isPermanent && !isExpanded) {
          minimizeCall(call.call_id);
        }
      });
    };
    
    // Revisar cada segundo
    const interval = setInterval(checkAutoMinimize, 1000);
    
    return () => clearInterval(interval);
  }, [isWidgetEnabled, widgetCalls, minimizeCall]);
  
  // Inicializar AudioContext
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      return audioContextRef.current;
    }
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({
        latencyHint: AUDIO_CONFIG.LATENCY_HINT
      });
      
      const gainNode = ctx.createGain();
      gainNode.gain.value = 1.0;
      gainNode.connect(ctx.destination);
      
      audioContextRef.current = ctx;
      gainNodeRef.current = gainNode;
      
      return ctx;
    } catch (error) {
      console.error('[LiveActivityWidget] Error initializing AudioContext:', error);
      return null;
    }
  }, []);
  
  // Programar reproducción de audio
  const scheduleAudioPlayback = useCallback((audioBuffer: AudioBuffer) => {
    const ctx = audioContextRef.current;
    const gainNode = gainNodeRef.current;
    
    if (!ctx || !gainNode) return;
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainNode);
    
    const now = ctx.currentTime;
    const startTime = Math.max(now, nextPlayTimeRef.current);
    
    source.start(startTime);
    nextPlayTimeRef.current = startTime + audioBuffer.duration;
  }, []);
  
  // Procesar chunk de audio
  const processAudioChunk = useCallback(async (audioData: ArrayBuffer) => {
    const ctx = audioContextRef.current;
    
    if (!ctx) return;
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    try {
      const pcmSamples = new Int16Array(audioData);
      const totalSamples = pcmSamples.length;
      
      if (totalSamples < 2) return;
      
      const samplesPerChannel = Math.floor(totalSamples / 2);
      const audioBuffer = ctx.createBuffer(2, samplesPerChannel, AUDIO_CONFIG.SAMPLE_RATE);
      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel = audioBuffer.getChannelData(1);
      
      for (let i = 0; i < samplesPerChannel; i++) {
        leftChannel[i] = (pcmSamples[i * 2] / 32768.0) * 5.0; // Humano
        rightChannel[i] = (pcmSamples[i * 2 + 1] / 32768.0) * 0.5; // IA
      }
      
      scheduleAudioPlayback(audioBuffer);
    } catch (error) {
      console.error('[LiveActivityWidget] Error processing audio chunk:', error);
    }
  }, [scheduleAudioPlayback]);
  
  // Iniciar monitoreo de audio
  const startAudioMonitoring = useCallback(async (monitorUrl: string, callId: string) => {
    if (!monitorUrl) return;
    
    const ctx = initAudioContext();
    if (!ctx) return;
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    try {
      const ws = new WebSocket(monitorUrl);
      ws.binaryType = 'arraybuffer';
      
      ws.onopen = () => {
        setIsListening(true);
        setListeningCallId(callId);
        nextPlayTimeRef.current = 0;
      };
      
      ws.onmessage = async (event) => {
        if (event.data instanceof ArrayBuffer) {
          await processAudioChunk(event.data);
        }
      };
      
      ws.onerror = () => {
        setIsListening(false);
        setListeningCallId(null);
      };
      
      ws.onclose = () => {
        setIsListening(false);
        setListeningCallId(null);
      };
      
      audioWebSocketRef.current = ws;
    } catch (error) {
      console.error('[LiveActivityWidget] Error starting audio monitoring:', error);
    }
  }, [initAudioContext, processAudioChunk]);
  
  // Detener monitoreo de audio
  const stopAudioMonitoring = useCallback(() => {
    if (audioWebSocketRef.current) {
      audioWebSocketRef.current.close(1000, 'User stopped monitoring');
      audioWebSocketRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    gainNodeRef.current = null;
    setIsListening(false);
    setListeningCallId(null);
  }, []);
  
  // Handlers
  const handleExpand = useCallback((callId: string) => {
    expandCall(callId);
  }, [expandCall]);
  
  const handleCollapse = useCallback(() => {
    collapseCall();
    stopAudioMonitoring();
  }, [collapseCall, stopAudioMonitoring]);
  
  const handleMinimize = useCallback((callId: string) => {
    minimizeCall(callId);
  }, [minimizeCall]);
  
  const handleRestore = useCallback((callId: string) => {
    restoreCall(callId);
  }, [restoreCall]);
  
  const handleListen = useCallback((call: { call_id: string; monitor_url?: string }) => {
    if (call.monitor_url) {
      startAudioMonitoring(call.monitor_url, call.call_id);
    } else {
      toast.error('No hay URL de monitoreo disponible para esta llamada', {
        duration: 3000,
        position: 'top-right'
      });
    }
  }, [startAudioMonitoring]);
  
  // Abrir modal de transferencia
  const handleTransfer = useCallback((call: WidgetCallData) => {
    console.log('[LiveActivityWidget] handleTransfer llamado:', { 
      call_id: call.call_id,
      control_url: call.control_url
    });
    
    // Convertir WidgetCallData a TransferCallData
    const transferData: TransferCallData = {
      call_id: call.call_id,
      control_url: call.control_url,
      prospecto_id: call.prospecto_id,
      nombre_completo: call.nombre_completo,
      nombre_whatsapp: call.nombre_whatsapp,
      whatsapp: call.whatsapp,
      checkpoint_venta_actual: call.checkpoint_venta_actual,
      destino_preferido: call.destino_preferido,
      principales_objeciones: call.principales_objeciones,
      fecha_llamada: call.fecha_llamada,
      duracion_segundos: call.duracion_segundos
    };
    
    setTransferCall(transferData);
    setShowTransferModal(true);
  }, []);
  
  // Cerrar modal de transferencia
  const closeTransferModal = useCallback(() => {
    setShowTransferModal(false);
    setTransferCall(null);
  }, []);
  
  // Callback cuando la transferencia es exitosa
  const handleTransferSuccess = useCallback(() => {
    toast.success('Llamada transferida exitosamente', {
      duration: 3000,
      position: 'top-right'
    });
  }, []);
  
  // No renderizar si no está habilitado o no tiene acceso
  if (!isWidgetEnabled || !canAccessLiveMonitor() || !user) {
    return null;
  }
  
  // No renderizar si no está visible
  if (!isWidgetVisible) {
    return null;
  }
  
  // No renderizar si no hay llamadas
  if (widgetCalls.length === 0 && !isLoading) {
    return null;
  }
  
  const expandedCall = expandedCallId 
    ? widgetCalls.find(c => c.call_id === expandedCallId) 
    : null;
  
  // Parsear transcripción correctamente
  const getTranscription = (call: WidgetCallData): { role: string; content: string; timestamp: string }[] => {
    // Primero intentar liveTranscriptions del store
    if (liveTranscriptions[call.call_id] && Array.isArray(liveTranscriptions[call.call_id])) {
      return liveTranscriptions[call.call_id];
    }
    
    // Luego intentar conversacion_completa del call
    if (call.conversacion_completa) {
      try {
        let conversacionData = call.conversacion_completa;
        
        // Si es string, parsearlo
        if (typeof conversacionData === 'string') {
          conversacionData = JSON.parse(conversacionData);
        }
        
        // Si es un objeto con campo 'conversacion' (formato de la BD)
        if (conversacionData && typeof conversacionData === 'object' && 'conversacion' in conversacionData) {
          const conversacionText = (conversacionData as { conversacion: string }).conversacion;
          
          // Parsear el texto formateado: [hora] Rol: mensaje
          const lines = conversacionText.split('\n\n');
          const messages: { role: string; content: string; timestamp: string }[] = [];
          
          for (const line of lines) {
            const match = line.match(/^\[([^\]]+)\]\s*(Agente|Cliente):\s*(.+)$/s);
            if (match) {
              const [, timestamp, role, content] = match;
              messages.push({
                role: role === 'Agente' ? 'assistant' : 'user',
                content: content.trim(),
                timestamp: timestamp
              });
            }
          }
          
          return messages;
        }
        
        // Si ya es array, usarlo directamente
        if (Array.isArray(conversacionData)) {
          return conversacionData;
        }
      } catch (e) {
        console.error('[LiveActivityWidget] Error parsing transcription:', e);
      }
    }
    
    return [];
  };
  
  // Renderizar en portal para estar sobre todo
  return createPortal(
    <>
      {/* Modal de Transferencia Reutilizable - z-index 200 para estar sobre el panel expandido */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={closeTransferModal}
        call={transferCall}
        onTransferSuccess={handleTransferSuccess}
        zIndex={200}
      />
      
      {/* Panel expandido - pegado al borde derecho */}
      <AnimatePresence>
        {expandedCall && (
          <motion.div
            key="expanded-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none"
          >
            {/* Backdrop semi-transparente */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
              onClick={handleCollapse}
            />
            
            {/* Panel pegado al borde derecho - animación de expansión */}
            <motion.div
              initial={{ 
                width: '320px',
                height: '200px',
                top: '80px',
                right: 0,
                opacity: 0.8
              }}
              animate={{ 
                width: '55vw',
                height: '70vh',
                top: '15vh',
                right: 0,
                opacity: 1
              }}
              exit={{ 
                width: '320px',
                height: '200px',
                top: '80px',
                right: 0,
                opacity: 0
              }}
              transition={{ 
                type: 'spring', 
                stiffness: 300, 
                damping: 30 
              }}
              className="fixed pointer-events-auto"
              style={{ 
                minWidth: '700px',
                maxWidth: '900px',
                minHeight: '500px',
                maxHeight: '85vh'
              }}
            >
              <ExpandedCallPanel
                call={expandedCall}
                transcription={getTranscription(expandedCall)}
                onClose={handleCollapse}
                onListen={() => handleListen(expandedCall)}
                onTransfer={() => handleTransfer(expandedCall)}
                isListening={isListening && listeningCallId === expandedCall.call_id}
                onStopListening={stopAudioMonitoring}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Cards colapsadas y cuñas minimizadas - mismo contenedor para mantener posición */}
      <div 
        className="fixed top-0 right-0 bottom-0 z-50 pointer-events-none"
        style={{ width: '320px' }}
      >
        <AnimatePresence>
          {!expandedCall && (
          <motion.div
            key="cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col pt-20 pb-4 overflow-y-auto"
            style={{ maxHeight: '100vh', paddingRight: 0 }}
          >
            {/* Renderizar todas las llamadas en orden, ya sea como Card o como Tab minimizado */}
            <div className="flex flex-col items-end gap-3 pointer-events-none">
              <AnimatePresence mode="popLayout">
                {widgetCalls.slice(0, 10).map((call) => {
                  const isMinimized = minimizedCallIds.has(call.call_id);
                  
                  return (
                    <motion.div 
                      key={call.call_id} 
                      layout
                      className="pointer-events-auto w-full flex justify-end"
                      transition={{
                        layout: { type: 'spring', stiffness: 400, damping: 30 }
                      }}
                    >
                      {isMinimized ? (
                        <MinimizedCallTab
                          call={call}
                          onRestore={() => handleRestore(call.call_id)}
                        />
                      ) : (
                        <CallCard
                          call={call}
                          isExpanded={false}
                          isListening={isListening && listeningCallId === call.call_id}
                          onExpand={() => handleExpand(call.call_id)}
                          onListen={() => handleListen(call)}
                          onStopListening={stopAudioMonitoring}
                          onTransfer={() => handleTransfer(call)}
                          onMinimize={() => handleMinimize(call.call_id)}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {/* Indicador de más llamadas */}
              {widgetCalls.length > 10 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="pointer-events-auto bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-l-lg text-sm text-gray-300 border-l border-t border-b border-gray-700 mr-0"
                >
                  +{widgetCalls.length - 10} llamadas más
                </motion.div>
              )}
            </div>
          </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>,
    document.body
  );
};

export default LiveCallActivityWidget;
