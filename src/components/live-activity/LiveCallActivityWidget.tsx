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
import { CallCard } from './CallCard';
import { ExpandedCallPanel } from './ExpandedCallPanel';

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
    isWidgetEnabled,
    isWidgetVisible,
    isLoading,
    liveTranscriptions,
    initialize,
    cleanup,
    expandCall,
    collapseCall,
    updateTranscription
  } = useLiveActivityStore();
  
  // Estado de audio
  const [isListening, setIsListening] = useState(false);
  const [listeningCallId, setListeningCallId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWebSocketRef = useRef<WebSocket | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  
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
  
  // Polling para actualizar llamadas cada 3 segundos
  useEffect(() => {
    if (!isWidgetEnabled) return;
    
    const { loadActiveCalls } = useLiveActivityStore.getState();
    
    const interval = setInterval(() => {
      loadActiveCalls();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isWidgetEnabled]);
  
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
  
  const handleListen = useCallback((call: { call_id: string; monitor_url?: string }) => {
    console.log('[LiveActivityWidget] handleListen llamado:', { 
      call_id: call.call_id, 
      monitor_url: call.monitor_url 
    });
    
    if (call.monitor_url) {
      startAudioMonitoring(call.monitor_url, call.call_id);
    } else {
      console.warn('[LiveActivityWidget] No hay monitor_url disponible para esta llamada');
      toast.error('No hay URL de monitoreo disponible para esta llamada', {
        duration: 3000,
        position: 'top-right'
      });
    }
  }, [startAudioMonitoring]);
  
  const handleTransfer = useCallback((call: { call_id: string; control_url?: string }) => {
    console.log('[LiveActivityWidget] handleTransfer llamado:', { 
      call_id: call.call_id,
      control_url: call.control_url
    });
    
    // Emitir evento para que LiveMonitorKanban maneje la transferencia
    window.dispatchEvent(new CustomEvent('live-activity-transfer', { 
      detail: { callId: call.call_id } 
    }));
    
    // Mostrar toast informativo
    toast('Ve a Llamadas IA para completar la transferencia', {
      icon: '📞',
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#1f2937',
        color: '#fff',
        border: '1px solid #374151'
      }
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
      {/* Panel expandido - pegado al borde derecho */}
      <AnimatePresence>
        {expandedCall && (
          <motion.div
            key="expanded-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-none"
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
      
      {/* Cards colapsadas */}
      <div 
        className="fixed top-0 right-0 bottom-0 z-[100] pointer-events-none"
        style={{ width: '320px' }}
      >
        <AnimatePresence>
          {!expandedCall && (
          // Lista de cards colapsadas - pegadas al borde derecho
          <motion.div
            key="cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col items-end pt-20 pb-4 gap-3 overflow-y-auto pointer-events-none"
            style={{ maxHeight: '100vh', paddingRight: 0 }}
          >
            <AnimatePresence>
              {widgetCalls.slice(0, 10).map((call) => (
                <div key={call.call_id} className="pointer-events-auto w-full flex justify-end">
                  <CallCard
                    call={call}
                    isExpanded={false}
                    isListening={isListening && listeningCallId === call.call_id}
                    onExpand={() => handleExpand(call.call_id)}
                    onListen={() => handleListen(call)}
                    onStopListening={stopAudioMonitoring}
                    onTransfer={() => handleTransfer(call)}
                  />
                </div>
              ))}
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
          </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>,
    document.body
  );
};

export default LiveCallActivityWidget;
