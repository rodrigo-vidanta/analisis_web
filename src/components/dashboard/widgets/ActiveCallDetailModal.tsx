/**
 * Modal de Detalle de Llamada Activa para Dashboard
 * Versión optimizada del modal de LiveMonitor con suscripciones realtime
 * 
 * ACTUALIZACIÓN: Añadido monitoreo de audio en tiempo real vía WebSocket VAPI
 * Formato: PCM 16-bit signed little-endian @ 16kHz mono (o μ-law 8kHz)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Phone, User, Globe, MessageSquare, 
  TrendingUp, Calendar,
  ArrowRightLeft, RotateCcw, CheckCircle, Loader2, Wand2,
  Headphones, Volume2, VolumeX, Waves
} from 'lucide-react';
import { analysisSupabase } from '../../../config/analysisSupabase';
import { type LiveCallData } from '../../../services/liveMonitorService';
import { Avatar } from '../../shared/Avatar';
import { PhoneDisplay } from '../../shared/PhoneDisplay';
import { convertUTCToMexicoTime } from '../../../utils/timezoneHelper';
import { getAuthHeaders } from '../../../utils/authHelpers';

// ============================================
// CONSTANTES DE CONFIGURACIÓN DE AUDIO
// ============================================
const AUDIO_CONFIG = {
  // VAPI envía PCM 16-bit estéreo intercalado
  SAMPLE_RATE: 16000,
  // Tamaño mínimo de chunk para procesar
  MIN_CHUNK_SIZE: 320,
  // Volumen por defecto (master)
  DEFAULT_VOLUME: 1.0,
  // Ganancia por defecto por canal (escala 1-10)
  // Canal Izquierdo = HUMANO: 1-10 donde 1=300%, 10=800% → multiplicador = 3.0 + (slider-1) * (5.0/9)
  // Canal Derecho = IA: 0-10 donde 5=50% → multiplicador = slider * 0.1
  DEFAULT_HUMAN_SLIDER: 5,   // Canal izquierdo: Humano (5 = ~522%)
  DEFAULT_IA_SLIDER: 5,      // Canal derecho: IA (5 = 50%)
  // Latency hint para AudioContext
  LATENCY_HINT: 'interactive' as AudioContextLatencyCategory,
  // Keys para localStorage
  STORAGE_KEY_HUMAN: 'pqnc_audio_human_slider',
  STORAGE_KEY_IA: 'pqnc_audio_ia_slider',
};

// Funciones de conversión de slider (1-10) a multiplicador real
// IA: 0-10 donde 5 = 50% (0.5x)
const sliderToIAGain = (slider: number): number => slider * 0.1;
// Humano: 1-10 donde 1=300% (3.0x), 10=800% (8.0x) - rango lineal
const sliderToHumanGain = (slider: number): number => 3.0 + (slider - 1) * (5.0 / 9);

/**
 * Obtiene la ganancia guardada en localStorage o el valor por defecto
 */
const getStoredGain = (key: string, defaultValue: number): number => {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const value = parseFloat(stored);
      if (!isNaN(value) && value >= 0 && value <= 10) {
        return value;
      }
    }
  } catch {
    // localStorage no disponible
  }
  return defaultValue;
};

/**
 * Guarda la ganancia en localStorage
 */
const setStoredGain = (key: string, value: number): void => {
  try {
    localStorage.setItem(key, value.toString());
  } catch {
    // localStorage no disponible
  }
};

// Tabla de conversión μ-law a PCM lineal (si el audio viene en ese formato)
const MULAW_TO_LINEAR: Int16Array = new Int16Array([
  -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956,
  -23932, -22908, -21884, -20860, -19836, -18812, -17788, -16764,
  -15996, -15484, -14972, -14460, -13948, -13436, -12924, -12412,
  -11900, -11388, -10876, -10364, -9852, -9340, -8828, -8316,
  -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
  -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
  -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
  -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
  -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
  -1372, -1308, -1244, -1180, -1116, -1052, -988, -924,
  -876, -844, -812, -780, -748, -716, -684, -652,
  -620, -588, -556, -524, -492, -460, -428, -396,
  -372, -356, -340, -324, -308, -292, -276, -260,
  -244, -228, -212, -196, -180, -164, -148, -132,
  -120, -112, -104, -96, -88, -80, -72, -64,
  -56, -48, -40, -32, -24, -16, -8, 0,
  32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
  23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
  15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
  11900, 11388, 10876, 10364, 9852, 9340, 8828, 8316,
  7932, 7676, 7420, 7164, 6908, 6652, 6396, 6140,
  5884, 5628, 5372, 5116, 4860, 4604, 4348, 4092,
  3900, 3772, 3644, 3516, 3388, 3260, 3132, 3004,
  2876, 2748, 2620, 2492, 2364, 2236, 2108, 1980,
  1884, 1820, 1756, 1692, 1628, 1564, 1500, 1436,
  1372, 1308, 1244, 1180, 1116, 1052, 988, 924,
  876, 844, 812, 780, 748, 716, 684, 652,
  620, 588, 556, 524, 492, 460, 428, 396,
  372, 356, 340, 324, 308, 292, 276, 260,
  244, 228, 212, 196, 180, 164, 148, 132,
  120, 112, 104, 96, 88, 80, 72, 64,
  56, 48, 40, 32, 24, 16, 8, 0
]);

/**
 * Decodifica audio μ-law a PCM lineal 16-bit
 */
const decodeMulaw = (mulawData: Uint8Array): Int16Array => {
  const pcmData = new Int16Array(mulawData.length);
  for (let i = 0; i < mulawData.length; i++) {
    pcmData[i] = MULAW_TO_LINEAR[mulawData[i]];
  }
  return pcmData;
};

/**
 * VAPI/Twilio SIEMPRE envía audio en formato μ-law (G.711 PCMU) a 8kHz
 * Este es el estándar de telefonía. No necesitamos detectar formato.
 */

interface ActiveCallDetailModalProps {
  call: LiveCallData;
  isOpen: boolean;
  onClose: () => void;
}

interface ConversationMessage {
  speaker: string;
  message: string;
  timestamp: string;
}

export const ActiveCallDetailModal: React.FC<ActiveCallDetailModalProps> = ({
  call,
  isOpen,
  onClose
}) => {
  const [currentCall, setCurrentCall] = useState<LiveCallData>(call);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const conversationScrollRef = useRef<HTMLDivElement>(null);
  const userScrolledAwayRef = useRef<boolean>(false);
  const realtimeChannelRef = useRef<any>(null);
  
  // ============================================
  // ESTADOS DE MONITOREO DE AUDIO
  // ============================================
  const [isListening, setIsListening] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioVolume, setAudioVolume] = useState(AUDIO_CONFIG.DEFAULT_VOLUME);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioStats, setAudioStats] = useState({ chunks: 0 });
  // Sliders de volumen por canal (persistidos en localStorage)
  // Canal Izquierdo = HUMANO, Canal Derecho = IA
  const [humanSlider, setHumanSlider] = useState(() => 
    getStoredGain(AUDIO_CONFIG.STORAGE_KEY_HUMAN, AUDIO_CONFIG.DEFAULT_HUMAN_SLIDER)
  );
  const [iaSlider, setIaSlider] = useState(() => 
    getStoredGain(AUDIO_CONFIG.STORAGE_KEY_IA, AUDIO_CONFIG.DEFAULT_IA_SLIDER)
  );
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  
  // Refs para audio
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWebSocketRef = useRef<WebSocket | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioChunkCountRef = useRef(0);
  // Sistema de buffering para reproducción fluida
  const nextPlayTimeRef = useRef<number>(0);
  const isBufferingRef = useRef<boolean>(true);
  const audioBufferQueueRef = useRef<AudioBuffer[]>([]);
  const BUFFER_THRESHOLD = 3; // Acumular 3 chunks antes de empezar (~60ms)
  // Refs para ganancia por canal (para acceso en tiempo real)
  // Refs: Canal Izquierdo = HUMANO, Canal Derecho = IA
  const leftGainRef = useRef(sliderToHumanGain(humanSlider));  // Izquierdo = Humano
  const rightGainRef = useRef(sliderToIAGain(iaSlider));       // Derecho = IA
  
  // Estados para transferencia
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [selectedPresetReason, setSelectedPresetReason] = useState('');
  const [customTransferMessage, setCustomTransferMessage] = useState('');
  const [loadingCustomMessage, setLoadingCustomMessage] = useState(false);
  const [customMessageError, setCustomMessageError] = useState<string | null>(null);
  const [autoGeneratedMessage, setAutoGeneratedMessage] = useState<string | null>(null);
  
  // Mensajes predefinidos para transferencia
  const transferReasons = [
    {
      short: 'Mejor precio exclusivo',
      full: 'Mi supervisor puede ofrecerle un mejor precio exclusivo que tengo autorización limitada'
    },
    {
      short: 'Caso especial',
      full: 'Mi supervisor maneja casos especiales como el suyo y quiere atenderle personalmente'
    },
    {
      short: 'Beneficios adicionales',
      full: 'Tengo un supervisor especializado en su destino que puede darle beneficios adicionales'
    },
    {
      short: 'Disponibilidad limitada',
      full: 'Mi supervisor tiene disponibilidad muy limitada solo para hoy y quiere hablar con usted'
    },
    {
      short: 'Oferta especial',
      full: 'Como mostró tanto interés, mi supervisor quiere ofrecerle algo especial que yo no puedo autorizar'
    },
    {
      short: 'Beneficio exclusivo',
      full: 'Mi supervisor estaba escuchando la llamada y quiere darle un beneficio exclusivo inmediatamente'
    }
  ];

  // ============================================
  // FUNCIONES DE AUDIO EN TIEMPO REAL
  // ============================================
  
  /**
   * Inicializa el AudioContext con configuración optimizada para VoIP
   * NO especificamos sample rate - dejamos que el navegador use su nativo (típicamente 48kHz)
   * El resampling de 8kHz a 48kHz se hace al crear el AudioBuffer
   */
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      return audioContextRef.current;
    }
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      // NO especificamos sampleRate - el navegador usará su nativo (48kHz típicamente)
      // Esto permite que el resampling sea manejado correctamente
      const ctx = new AudioContextClass({
        latencyHint: AUDIO_CONFIG.LATENCY_HINT
      });
      
      console.log(`[AudioMonitor] AudioContext creado @ ${ctx.sampleRate}Hz`);
      
      // Crear nodo de ganancia para control de volumen
      const gainNode = ctx.createGain();
      gainNode.gain.value = audioVolume;
      gainNode.connect(ctx.destination);
      
      audioContextRef.current = ctx;
      gainNodeRef.current = gainNode;
      
      return ctx;
    } catch (error) {
      console.error('[AudioMonitor] Error inicializando AudioContext:', error);
      setAudioError('No se pudo inicializar el sistema de audio');
      return null;
    }
  }, [audioVolume]);

  /**
   * Programa la reproducción de un AudioBuffer con timing preciso
   * Evita gaps entre chunks usando scheduling del AudioContext
   */
  const scheduleAudioPlayback = useCallback((audioBuffer: AudioBuffer) => {
    const ctx = audioContextRef.current;
    const gainNode = gainNodeRef.current;
    
    if (!ctx || !gainNode) return;
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainNode);
    
    // Calcular el tiempo de inicio preciso
    const now = ctx.currentTime;
    const startTime = Math.max(now, nextPlayTimeRef.current);
    
    // Programar reproducción
    source.start(startTime);
    
    // Actualizar el próximo tiempo de reproducción
    nextPlayTimeRef.current = startTime + audioBuffer.duration;
    
    // Indicador visual
    setIsAudioPlaying(true);
  }, []);

  /**
   * Procesa la cola de buffers acumulados
   */
  const processBufferQueue = useCallback(() => {
    while (audioBufferQueueRef.current.length > 0) {
      const buffer = audioBufferQueueRef.current.shift();
      if (buffer) {
        scheduleAudioPlayback(buffer);
      }
    }
  }, [scheduleAudioPlayback]);

  /**
   * Procesa y reproduce un chunk de audio PCM ESTÉREO INTERCALADO
   * VAPI envía PCM 16-bit signed little-endian estéreo:
   * - Canal Izquierdo (samples pares): Agente IA
   * - Canal Derecho (samples impares): Cliente
   * 
   * Usa buffering y scheduling preciso para reproducción fluida
   */
  const processAudioChunk = useCallback(async (audioData: ArrayBuffer) => {
    const ctx = audioContextRef.current;
    const gainNode = gainNodeRef.current;
    
    if (!ctx || !gainNode) return;
    
    // Asegurarse de que el contexto está activo
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    try {
      const chunkSize = audioData.byteLength;
      
      // Ignorar chunks muy pequeños (pueden ser metadata o control)
      if (chunkSize < AUDIO_CONFIG.MIN_CHUNK_SIZE) {
        return;
      }
      
      // Actualizar estadísticas (cada 100 chunks para no saturar)
      audioChunkCountRef.current++;
      if (audioChunkCountRef.current % 100 === 0) {
        setAudioStats({ chunks: audioChunkCountRef.current });
      }
      
      // PCM 16-bit signed little-endian ESTÉREO INTERCALADO
      const pcmSamples = new Int16Array(audioData);
      const totalSamples = pcmSamples.length;
      
      if (totalSamples < 2) return;
      
      // Calcular samples por canal (estéreo intercalado: L R L R L R...)
      const samplesPerChannel = Math.floor(totalSamples / 2);
      
      // Crear buffer de audio ESTÉREO (2 canales)
      const audioBuffer = ctx.createBuffer(2, samplesPerChannel, AUDIO_CONFIG.SAMPLE_RATE);
      const leftChannel = audioBuffer.getChannelData(0);  // Agente IA
      const rightChannel = audioBuffer.getChannelData(1); // Cliente
      
      // Separar canales intercalados y convertir a float32
      // Usar refs para obtener valores actualizados en tiempo real
      const currentLeftGain = leftGainRef.current;
      const currentRightGain = rightGainRef.current;
      
      for (let i = 0; i < samplesPerChannel; i++) {
        // Canal izquierdo (Agente IA) - samples en posiciones pares
        let leftSample = (pcmSamples[i * 2] / 32768.0) * currentLeftGain;
        // Canal derecho (Cliente/Humano) - samples en posiciones impares
        let rightSample = (pcmSamples[i * 2 + 1] / 32768.0) * currentRightGain;
        
        // Soft clipping para evitar distorsión
        leftSample = Math.max(-0.98, Math.min(0.98, leftSample));
        rightSample = Math.max(-0.98, Math.min(0.98, rightSample));
        
        leftChannel[i] = leftSample;
        rightChannel[i] = rightSample;
      }
      
      // Sistema de buffering para reproducción fluida
      if (isBufferingRef.current) {
        // Acumular en la cola
        audioBufferQueueRef.current.push(audioBuffer);
        
        // Cuando tengamos suficientes chunks, empezar reproducción
        if (audioBufferQueueRef.current.length >= BUFFER_THRESHOLD) {
          isBufferingRef.current = false;
          nextPlayTimeRef.current = ctx.currentTime + 0.05; // Pequeño delay inicial
          processBufferQueue();
        }
      } else {
        // Reproducción directa con scheduling
        scheduleAudioPlayback(audioBuffer);
      }
      
    } catch (error) {
      console.error('[AudioMonitor] Error procesando chunk de audio:', error);
    }
  }, [scheduleAudioPlayback, processBufferQueue]);

  /**
   * Inicia la conexión WebSocket para escuchar el audio de la llamada
   */
  const startAudioMonitoring = useCallback(async () => {
    // Verificar que tenemos monitor_url
    const monitorUrl = currentCall.monitor_url;
    
    if (!monitorUrl) {
      setAudioError('Esta llamada no tiene URL de monitoreo disponible');
      return;
    }
    
    // Limpiar error anterior
    setAudioError(null);
    
    // Inicializar AudioContext
    const ctx = initAudioContext();
    if (!ctx) return;
    
    // Asegurarse de que el contexto está activo (requiere interacción del usuario)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    try {
      // Crear conexión WebSocket
      const ws = new WebSocket(monitorUrl);
      ws.binaryType = 'arraybuffer';
      
      ws.onopen = () => {
        console.log(`[AudioMonitor] ✅ Conexión WebSocket establecida - PCM estéreo @ ${AUDIO_CONFIG.SAMPLE_RATE}Hz con buffering`);
        setIsListening(true);
        audioChunkCountRef.current = 0;
        setAudioStats({ chunks: 0 });
        // Resetear sistema de buffering
        isBufferingRef.current = true;
        audioBufferQueueRef.current = [];
        nextPlayTimeRef.current = 0;
      };
      
      ws.onmessage = async (event) => {
        if (event.data instanceof ArrayBuffer) {
          // Audio binario directo
          await processAudioChunk(event.data);
        } else if (event.data instanceof Blob) {
          // Convertir Blob a ArrayBuffer
          const arrayBuffer = await event.data.arrayBuffer();
          await processAudioChunk(arrayBuffer);
        } else {
          // Mensaje de control JSON (ignorar silenciosamente)
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'error') {
              console.warn('[AudioMonitor] Error del servidor:', msg.message);
            }
          } catch {
            // No es JSON, ignorar
          }
        }
      };
      
      ws.onerror = (error) => {
        console.error('[AudioMonitor] ❌ Error WebSocket:', error);
        setAudioError('Error en la conexión de audio. La llamada puede haber terminado.');
        setIsListening(false);
      };
      
      ws.onclose = (event) => {
        console.log('[AudioMonitor] WebSocket cerrado:', event.code, event.reason);
        setIsListening(false);
        audioWebSocketRef.current = null;
        
        // Si se cerró inesperadamente, mostrar mensaje
        if (event.code !== 1000 && event.code !== 1001) {
          setAudioError('La conexión de audio se cerró inesperadamente');
        }
      };
      
      audioWebSocketRef.current = ws;
      
    } catch (error) {
      console.error('[AudioMonitor] Error iniciando monitoreo:', error);
      setAudioError('No se pudo iniciar el monitoreo de audio');
    }
  }, [currentCall.monitor_url, initAudioContext, processAudioChunk]);

  /**
   * Detiene el monitoreo de audio y limpia recursos
   */
  const stopAudioMonitoring = useCallback(() => {
    // Cerrar WebSocket
    if (audioWebSocketRef.current) {
      audioWebSocketRef.current.close(1000, 'Usuario detuvo el monitoreo');
      audioWebSocketRef.current = null;
    }
    
    // Cerrar AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    gainNodeRef.current = null;
    setIsListening(false);
    setIsAudioPlaying(false);
    setAudioError(null);
    audioChunkCountRef.current = 0;
  }, []);

  /**
   * Toggle del monitoreo de audio
   */
  const toggleAudioMonitoring = useCallback(() => {
    if (isListening) {
      stopAudioMonitoring();
    } else {
      startAudioMonitoring();
    }
  }, [isListening, startAudioMonitoring, stopAudioMonitoring]);

  /**
   * Actualizar volumen master en tiempo real
   */
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = audioVolume;
    }
  }, [audioVolume]);

  /**
   * Sincronizar refs de ganancia por canal y guardar en localStorage
   */
  // Sincronizar: Canal Izquierdo = HUMANO
  useEffect(() => {
    leftGainRef.current = sliderToHumanGain(humanSlider);
    setStoredGain(AUDIO_CONFIG.STORAGE_KEY_HUMAN, humanSlider);
  }, [humanSlider]);

  // Sincronizar: Canal Derecho = IA
  useEffect(() => {
    rightGainRef.current = sliderToIAGain(iaSlider);
    setStoredGain(AUDIO_CONFIG.STORAGE_KEY_IA, iaSlider);
  }, [iaSlider]);

  /**
   * Cleanup al cerrar el modal
   */
  useEffect(() => {
    return () => {
      stopAudioMonitoring();
    };
  }, [stopAudioMonitoring]);

  // Parsear conversación desde el campo conversacion_completa
  // Formato esperado: { conversacion: "[timestamp] speaker: message\n..." }
  const parseConversation = useCallback((conversacionCompleta: any): ConversationMessage[] => {
    if (!conversacionCompleta) return [];
    
    try {
      let conversationData;
      
      // Si es string, parsear JSON
      if (typeof conversacionCompleta === 'string') {
        conversationData = JSON.parse(conversacionCompleta);
      } else {
        conversationData = conversacionCompleta;
      }
      
      const conversationText = conversationData.conversacion || '';
      if (!conversationText) return [];
      
      // Dividir por líneas y parsear cada mensaje
      const lines = conversationText.split('\n').filter((line: string) => line.trim());
      const messages: ConversationMessage[] = [];
      
      for (const line of lines) {
        // Buscar patrón [timestamp] Speaker: message
        const match = line.match(/^\[(.+?)\]\s+(\w+):\s+(.+)$/);
        if (match) {
          const [, timestamp, speaker, message] = match;
          // Convertir timestamp de UTC a hora de México (UTC-6)
          const mexicoTimestamp = convertUTCToMexicoTime(timestamp.trim());
          messages.push({
            speaker: speaker.toLowerCase(),
            message: message.trim(),
            timestamp: mexicoTimestamp
          });
        }
      }
      
      return messages;
    } catch {
      return [];
    }
  }, []);

  // Actualizar conversación sin parpadeos
  const updateConversation = useCallback((newConversation: ConversationMessage[]) => {
    setConversation(prev => {
      // Si no hay cambios, no actualizar
      if (JSON.stringify(prev) === JSON.stringify(newConversation)) {
        return prev;
      }
      
      // Auto-scroll si el usuario no ha hecho scroll manual
      if (!userScrolledAwayRef.current && conversationScrollRef.current) {
        setTimeout(() => {
          conversationScrollRef.current?.scrollTo({
            top: conversationScrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }, 100);
      }
      
      return newConversation;
    });
  }, []);

  // Efecto para suscribirse a cambios en tiempo real de la llamada
  useEffect(() => {
    // Limpiar canal anterior
    try {
      realtimeChannelRef.current?.unsubscribe?.();
    } catch {}
    realtimeChannelRef.current = null;

    if (!isOpen || !call.call_id || call.call_status !== 'activa') {
      setConversation([]);
      return;
    }

    // Cargar estado inicial
    setCurrentCall(call);
    updateConversation(parseConversation(call.conversacion_completa));

    // Suscribirse a cambios de la llamada específica
    const channel = analysisSupabase
      .channel(`dashboard-call-${call.call_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'llamadas_ventas',
        filter: `call_id=eq.${call.call_id}`
      }, (payload) => {
        const rec = payload.new as any;
        if (!rec) return;
        
        // Actualizar conversación
        const newConversation = parseConversation(rec.conversacion_completa);
        updateConversation(newConversation);
        
        // Parsear datos_proceso si es string
        let datosProcesoActualizados = rec.datos_proceso;
        if (typeof rec.datos_proceso === 'string') {
          try {
            datosProcesoActualizados = JSON.parse(rec.datos_proceso);
          } catch (e) {
            datosProcesoActualizados = currentCall.datos_proceso;
          }
        }
        
        // Parsear datos_llamada para obtener resumen actualizado
        let datosLlamadaActualizados = rec.datos_llamada;
        if (typeof rec.datos_llamada === 'string') {
          try {
            datosLlamadaActualizados = JSON.parse(rec.datos_llamada);
          } catch (e) {
            datosLlamadaActualizados = currentCall.datos_llamada;
          }
        }
        
        // Extraer campos específicos de datos_proceso para actualización en tiempo real
        // (igual que LiveMonitorKanban - líneas 1401-1409)
        const composicionFamiliarNumero = datosProcesoActualizados?.numero_personas || 
          rec.composicion_familiar_numero || 
          currentCall.composicion_familiar_numero;
        
        const destinoPreferido = rec.destino_preferido || 
          datosProcesoActualizados?.destino_preferencia || 
          currentCall.destino_preferido;
        
        const tipoActividades = datosProcesoActualizados?.tipo_actividades || 
          (currentCall as any).tipo_actividades;
        
        // Actualizar datos de la llamada con preferencias extraídas
        setCurrentCall(prev => ({
          ...prev,
          ...rec,
          datos_proceso: datosProcesoActualizados,
          datos_llamada: datosLlamadaActualizados,
          // Actualizar campos específicos de preferencias desde datos_proceso
          composicion_familiar_numero: composicionFamiliarNumero,
          destino_preferido: destinoPreferido,
          // Mantener otros campos existentes si no vienen en la actualización
          tamano_grupo: rec.tamano_grupo || prev.tamano_grupo,
          ciudad_residencia: rec.ciudad_residencia || prev.ciudad_residencia,
          nivel_interes: rec.nivel_interes || prev.nivel_interes,
          nivel_interes_detectado: (rec as any).nivel_interes_detectado || (prev as any).nivel_interes_detectado
        }));
        
        // Si la llamada ya no está activa, cerrar el modal
        if (rec.call_status !== 'activa') {
          onClose();
        }
      })
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      try {
        channel.unsubscribe();
      } catch {}
      realtimeChannelRef.current = null;
    };
  }, [call.call_id, call.call_status, isOpen]);

  // Helper para renderizar campos
  const renderField = (label: string, value: any, formatter?: (val: any) => string) => {
    if (value === null || value === undefined || value === '') return null;
    const displayValue = formatter ? formatter(value) : String(value);
    return (
      <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-900 dark:text-white text-right max-w-[60%] truncate" title={displayValue}>
          {displayValue}
        </span>
      </div>
    );
  };

  // Obtener datos dinámicos de datos_proceso
  const getDynamicData = useCallback(() => {
    try {
      const datosProc = typeof currentCall.datos_proceso === 'string'
        ? JSON.parse(currentCall.datos_proceso)
        : currentCall.datos_proceso;
      return datosProc || {};
    } catch {
      return {};
    }
  }, [currentCall.datos_proceso]);

  // Obtener resumen de datos_llamada
  const getResumen = useCallback(() => {
    try {
      const datosLlamada = typeof currentCall.datos_llamada === 'string'
        ? JSON.parse(currentCall.datos_llamada)
        : currentCall.datos_llamada;
      return datosLlamada?.resumen || currentCall.resumen_llamada || null;
    } catch {
      return currentCall.resumen_llamada || null;
    }
  }, [currentCall.datos_llamada, currentCall.resumen_llamada]);

  const dynamicData = getDynamicData();
  const resumen = getResumen();

  // Función para solicitar mensaje personalizado del webhook
  const handleRequestCustomMessage = async (prospectId: string): Promise<string | null> => {
    setLoadingCustomMessage(true);
    setCustomMessageError(null);
    
    try {
      // Llamar al webhook con el prospect_id
      // Usar Edge Function de Supabase (requiere JWT de usuario autenticado)
      const edgeFunctionUrl = `${import.meta.env.VITE_EDGE_FUNCTIONS_URL}/functions/v1/transfer-request-proxy`;
      const authHeaders = await getAuthHeaders();
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          prospect_id: prospectId
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => `Error ${response.status}: ${response.statusText}`);
        setCustomMessageError(`Error al solicitar mensaje: ${response.status} - ${errorText.substring(0, 100)}`);
        setLoadingCustomMessage(false);
        return null;
      }

      // Esperar respuesta con mensaje personalizado
      const contentType = response.headers.get('content-type');
      let responseData: any;
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const textResponse = await response.text();
        try {
          responseData = JSON.parse(textResponse);
        } catch {
          responseData = { message: textResponse };
        }
      }

      // El webhook debe devolver un objeto con el campo 'message' o 'transfer_message'
      const personalizedMessage = responseData.message || responseData.transfer_message || responseData.text;
      
      if (!personalizedMessage || typeof personalizedMessage !== 'string') {
        setCustomMessageError('El webhook no devolvió un mensaje válido. Formato esperado: { "message": "texto del mensaje" }');
        setLoadingCustomMessage(false);
        return null;
      }

      setLoadingCustomMessage(false);
      return personalizedMessage;
      
    } catch (error) {
      setCustomMessageError(`Error al solicitar mensaje: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setLoadingCustomMessage(false);
      return null;
    }
  };

  // Función para abrir el modal y cargar el mensaje automáticamente
  const handleOpenTransferModal = async () => {
    if (!currentCall?.prospecto_id) {
      alert('No se encontró ID del prospecto');
      return;
    }

    // Abrir el modal primero
    setShowTransferModal(true);
    setSelectedPresetReason('');
    setCustomTransferMessage('');
    setAutoGeneratedMessage(null);
    setCustomMessageError(null);

    // Cargar mensaje automáticamente en segundo plano y seleccionarlo por defecto
    const message = await handleRequestCustomMessage(currentCall.prospecto_id);
    if (message) {
      setAutoGeneratedMessage(message);
      setCustomTransferMessage(message); // Seleccionar automáticamente el mensaje generado
    }
  };

  // Función para transferir llamada
  const handleTransferCall = async (reason: string) => {
    if (!currentCall?.call_id) {
      alert('No se encontró ID de llamada');
      return;
    }

    setTransferLoading(true);
    
    try {
      // Extraer contexto adicional de datos_llamada y datos_proceso
      let contextData = {};
      try {
        if (currentCall.datos_llamada) {
          const datosLlamada = typeof currentCall.datos_llamada === 'string' 
            ? JSON.parse(currentCall.datos_llamada) 
            : currentCall.datos_llamada;
          contextData = { ...contextData, ...datosLlamada };
        }
        
        if (currentCall.datos_proceso) {
          const datosProc = typeof currentCall.datos_proceso === 'string' 
            ? JSON.parse(currentCall.datos_proceso) 
            : currentCall.datos_proceso;
          contextData = { ...contextData, datos_proceso: datosProc };
        }
      } catch (e) {
        // No se pudo extraer contexto adicional
      }

      const finalMessage = reason;

      // Verificar que control_url esté disponible, si no, intentar obtenerlo de la BD
      let controlUrl = currentCall.control_url;
      
      if (!controlUrl) {
        try {
          const { data: callData, error } = await analysisSupabase
            .from('llamadas_ventas')
            .select('control_url')
            .eq('call_id', currentCall.call_id)
            .single();
          
          if (error || !callData?.control_url) {
            alert('Error: No se encontró la URL de control de la llamada. La llamada puede haber finalizado.');
            setTransferLoading(false);
            return;
          }
          
          controlUrl = callData.control_url;
          
          // Actualizar currentCall con el control_url obtenido
          setCurrentCall(prev => ({ ...prev, control_url: controlUrl }));
        } catch (err) {
          alert('Error: No se pudo obtener la URL de control de la llamada. La llamada puede haber finalizado.');
          setTransferLoading(false);
          return;
        }
      }

      const transferData = {
        action: "transfer",
        call_id: currentCall.call_id,
        control_url: controlUrl,
        message: finalMessage,
        destination: {
          number: "+523222264000",
          extension: "60973"
        },
        call_context: {
          fecha_llamada: currentCall.fecha_llamada,
          duracion_segundos: currentCall.duracion_segundos,
          call_status: currentCall.call_status,
          nivel_interes: currentCall.nivel_interes,
          tipo_llamada: currentCall.tipo_llamada,
          precio_ofertado: currentCall.precio_ofertado,
          costo_total: currentCall.costo_total,
          prospecto_id: currentCall.prospecto_id,
          nombre_completo: currentCall.nombre_completo,
          nombre_whatsapp: currentCall.nombre_whatsapp,
          whatsapp: currentCall.whatsapp,
          email: currentCall.email,
          ciudad_residencia: currentCall.ciudad_residencia,
          estado_civil: currentCall.estado_civil,
          edad: currentCall.edad,
          checkpoint_venta_actual: currentCall.checkpoint_venta_actual,
          composicion_familiar_numero: currentCall.composicion_familiar_numero,
          destino_preferido: currentCall.destino_preferido,
          preferencia_vacaciones: currentCall.preferencia_vacaciones,
          numero_noches: currentCall.numero_noches,
          mes_preferencia: currentCall.mes_preferencia,
          propuesta_economica_ofrecida: currentCall.propuesta_economica_ofrecida,
          habitacion_ofertada: currentCall.habitacion_ofertada,
          resort_ofertado: currentCall.resort_ofertado,
          principales_objeciones: currentCall.principales_objeciones,
          resumen_llamada: currentCall.resumen_llamada,
          ...contextData
        }
      };

      // Usar Edge Function de Supabase (requiere JWT de usuario autenticado)
      const edgeFunctionUrl = `${import.meta.env.VITE_EDGE_FUNCTIONS_URL}/functions/v1/tools-proxy`;
      const toolsAuthHeaders = await getAuthHeaders();
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: toolsAuthHeaders,
        body: JSON.stringify(transferData)
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            await response.json();
          } catch (e) {
            // Error parseando JSON
          }
        } else {
          await response.text();
        }
        
        setShowTransferModal(false);
        setSelectedPresetReason('');
        setCustomTransferMessage('');
        
        alert('Transferencia solicitada exitosamente');
      } else {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = `Error ${response.status}: ${response.statusText}`;
        }
        alert(`Error al transferir la llamada: ${response.status} - ${errorText.substring(0, 100)}`);
      }
    } catch (error) {
      alert(`Error al transferir la llamada: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setTransferLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800"
        >
          {/* Header */}
          <div className="relative px-6 py-5 bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar con indicador de llamada activa */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="relative"
                >
                  <div className="relative">
                    <Avatar
                      name={currentCall.nombre_completo || currentCall.nombre_whatsapp}
                      size="xl"
                      showIcon={false}
                      className="rounded-xl"
                    />
                  </div>
                  {/* Indicador pulsante de llamada activa */}
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 shadow-lg">
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                  </div>
                </motion.div>

                <div className="flex-1 min-w-0">
                  <motion.h3
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xl font-bold text-gray-900 dark:text-white truncate"
                  >
                    {currentCall.nombre_completo || currentCall.nombre_whatsapp || 'Sin nombre'}
                  </motion.h3>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center gap-3 mt-1"
                  >
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                      <Phone className="w-3 h-3" />
                      Llamada Activa
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      <TrendingUp className="w-3 h-3" />
                      {currentCall.checkpoint_venta_actual || 'Checkpoint #1'}
                    </span>
                  </motion.div>
                </div>
              </div>

              <motion.button
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
            {/* Resumen en tiempo real */}
            {resumen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Resumen
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    En vivo
                  </div>
                </div>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  {resumen}
                </p>
              </motion.div>
            )}

            {/* Grid de información */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Información del Prospecto */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    Prospecto
                  </h4>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50">
                    <span className="text-gray-500 dark:text-gray-400">Teléfono</span>
                    <PhoneDisplay
                      phone={currentCall.whatsapp}
                      prospecto={{
                        id_dynamics: currentCall.id_dynamics,
                        etapa: currentCall.etapa,
                      }}
                      size="xs"
                      copyable
                      textClassName="font-medium text-gray-900 dark:text-white"
                    />
                  </div>
                  {renderField('Ciudad', currentCall.ciudad_residencia)}
                  {renderField('Campaña', currentCall.campana_origen)}
                </div>
              </motion.div>

              {/* Información del Viaje */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-purple-500" />
                    Viaje
                  </h4>
                </div>
                <div className="space-y-1 text-xs">
                  {renderField('Destino', 
                    currentCall.destino_preferido || 
                    dynamicData.destino_preferencia ||
                    (Array.isArray(currentCall.destino_preferencia) ? currentCall.destino_preferencia.join(', ') : currentCall.destino_preferencia)
                  )}
                  {renderField('Grupo', 
                    dynamicData.numero_personas || 
                    currentCall.composicion_familiar_numero || 
                    currentCall.tamano_grupo,
                    (val) => `${val} personas`
                  )}
                  {renderField('Actividades', 
                    dynamicData.tipo_actividades || 
                    (currentCall as any).tipo_actividades
                  )}
                  {renderField('Menores', currentCall.cantidad_menores)}
                </div>
              </motion.div>
            </div>

            {/* Conversación en Tiempo Real */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                  Conversación en Tiempo Real
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  En vivo
                </div>
              </div>
              
              <div 
                ref={conversationScrollRef}
                className="max-h-64 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                  userScrolledAwayRef.current = distanceFromBottom > 100;
                }}
              >
                {conversation.length > 0 ? (
                  <div className="space-y-3">
                    {conversation.map((msg, index) => (
                      <motion.div
                        key={`${msg.timestamp}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`flex ${msg.speaker === 'agente' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                          msg.speaker === 'agente'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 rounded-tl-sm'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100 rounded-tr-sm'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium opacity-75">
                              {msg.speaker === 'agente' ? '🤖 IA' : '👤 Cliente'}
                            </span>
                            <span className="text-xs opacity-50">{msg.timestamp}</span>
                          </div>
                          <p className="text-sm leading-relaxed">{msg.message}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Esperando conversación...
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                {currentCall.duracion_segundos && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {Math.floor(currentCall.duracion_segundos / 60)}:{(currentCall.duracion_segundos % 60).toString().padStart(2, '0')}
                  </span>
                )}
                {currentCall.nivel_interes && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    currentCall.nivel_interes === 'Alto' || currentCall.nivel_interes === 'MUY_ALTO'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : currentCall.nivel_interes === 'Medio' || currentCall.nivel_interes === 'MEDIO'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    Interés: {currentCall.nivel_interes}
                  </span>
                )}
                
                {/* Estadísticas de audio cuando está escuchando */}
                {isListening && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  >
                    <Waves className={`w-3 h-3 ${isAudioPlaying ? 'animate-pulse' : ''}`} />
                    {audioStats.chunks > 0 && `${audioStats.chunks} chunks`}
                  </motion.span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {/* Panel de Control de Audio (solo visible cuando está escuchando) */}
                {isListening && (
                  <motion.div 
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex items-center gap-3"
                  >
                    {/* Botón para mostrar/ocultar controles avanzados */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowAudioSettings(!showAudioSettings)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        showAudioSettings 
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'
                      }`}
                      title="Configuración de audio por canal"
                    >
                      <Waves className="w-4 h-4" />
                    </motion.button>
                    
                    {/* Controles avanzados por canal */}
                    <AnimatePresence>
                      {showAudioSettings && (
                        <motion.div
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="flex items-center gap-4 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl"
                        >
                          {/* Agente IA (0-10, donde 5=50%) - Canal Derecho */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">🤖 IA</span>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              step="1"
                              value={iaSlider}
                              onChange={(e) => setIaSlider(parseFloat(e.target.value))}
                              className="w-16 h-1.5 bg-blue-200 dark:bg-blue-900 rounded-full appearance-none cursor-pointer accent-blue-500"
                              title={`Agente IA: ${iaSlider}/10 (${Math.round(sliderToIAGain(iaSlider) * 100)}%)`}
                            />
                            <span className="text-xs text-gray-500 w-6">{iaSlider}</span>
                          </div>
                          
                          {/* Cliente/Humano (1-10, donde 1=300%, 10=800%) - Canal Izquierdo */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">👤 Humano</span>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              step="1"
                              value={humanSlider}
                              onChange={(e) => setHumanSlider(parseFloat(e.target.value))}
                              className="w-16 h-1.5 bg-emerald-200 dark:bg-emerald-900 rounded-full appearance-none cursor-pointer accent-emerald-500"
                              title={`Humano: ${humanSlider}/10 (${Math.round(sliderToHumanGain(humanSlider) * 100)}%)`}
                            />
                            <span className="text-xs text-gray-500 w-6">{humanSlider}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Volumen Master */}
                    <div className="flex items-center gap-1">
                      <VolumeX className="w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={audioVolume}
                        onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                        className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-gray-500"
                        title={`Master: ${Math.round(audioVolume * 100)}%`}
                      />
                      <Volume2 className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </motion.div>
                )}
                
                {/* Botón de Monitoreo de Audio - Siempre visible para llamadas activas */}
                {currentCall.call_status === 'activa' && (
                  <motion.button
                    whileHover={{ scale: currentCall.monitor_url ? 1.02 : 1 }}
                    whileTap={{ scale: currentCall.monitor_url ? 0.98 : 1 }}
                    onClick={currentCall.monitor_url ? toggleAudioMonitoring : undefined}
                    disabled={!currentCall.monitor_url}
                    className={`px-4 py-2 text-sm font-medium rounded-xl shadow-lg transition-all duration-200 flex items-center gap-2 ${
                      !currentCall.monitor_url
                        ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-70'
                        : isListening
                        ? 'text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25'
                        : 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                    }`}
                    title={!currentCall.monitor_url ? 'Esperando URL de monitoreo...' : isListening ? 'Detener escucha' : 'Escuchar llamada en tiempo real'}
                  >
                    {!currentCall.monitor_url ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Obteniendo URL...
                      </>
                    ) : isListening ? (
                      <>
                        <Headphones className={`w-4 h-4 ${isAudioPlaying ? 'animate-pulse' : ''}`} />
                        Escuchando...
                      </>
                    ) : (
                      <>
                        <Headphones className="w-4 h-4" />
                        Escuchar
                      </>
                    )}
                  </motion.button>
                )}
                
                {/* Botón de Solicitar Transferencia - Solo para llamadas activas */}
                {currentCall.call_status === 'activa' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleOpenTransferModal}
                    disabled={transferLoading || loadingCustomMessage}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center gap-2"
                  >
                    {loadingCustomMessage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generando mensaje...
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="w-4 h-4" />
                        {transferLoading ? 'Transfiriendo...' : 'Solicitar Transferencia'}
                      </>
                    )}
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cerrar
                </motion.button>
              </div>
            </div>
            
            {/* Mensaje de error de audio */}
            <AnimatePresence>
              {audioError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-2"
                >
                  <VolumeX className="w-4 h-4 flex-shrink-0" />
                  {audioError}
                  <button
                    onClick={() => setAudioError(null)}
                    className="ml-auto text-amber-500 hover:text-amber-700 dark:hover:text-amber-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>

      {/* Modal de Transferencia */}
      <AnimatePresence>
      {showTransferModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTransferModal(false);
              setSelectedPresetReason('');
              setCustomTransferMessage('');
              setCustomMessageError(null);
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <motion.h3
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-2xl font-bold text-gray-900 dark:text-white mb-1 flex items-center"
                  >
                    <ArrowRightLeft className="w-6 h-6 mr-2 text-blue-500" />
                    Solicitar Transferencia
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed"
                  >
                    Selecciona una razón o usa el mensaje personalizado generado
                  </motion.p>
                </div>
                <motion.button
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedPresetReason('');
                    setCustomTransferMessage('');
                    setCustomMessageError(null);
                    setAutoGeneratedMessage(null);
                  }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group flex-shrink-0"
                  title="Cerrar"
                >
                  <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 py-6 overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {/* Razones Predefinidas */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Razones Rápidas
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {transferReasons.map((reason, index) => (
                    <motion.button
                      key={reason.short}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.25 + index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedPresetReason(reason.short);
                        setCustomTransferMessage('');
                      }}
                      className={`px-5 py-4 text-sm font-medium rounded-xl transition-all duration-200 text-left ${
                        selectedPresetReason === reason.short
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 border-2 border-blue-500'
                          : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{reason.short}</span>
                        {selectedPresetReason === reason.short && (
                          <CheckCircle className="w-5 h-5" />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Mensaje Personalizado */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="border-t border-gray-200 dark:border-gray-700 pt-6"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center">
                    <Wand2 className="w-4 h-4 mr-2 text-purple-500" />
                    Mensaje Personalizado
                  </h4>
                </div>
                
                {loadingCustomMessage && !autoGeneratedMessage && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center py-8"
                  >
                    <Loader2 className="w-5 h-5 animate-spin text-purple-500 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Generando mensaje personalizado...</span>
                  </motion.div>
                )}
                
                {customMessageError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-3"
                  >
                    <p className="text-xs text-red-700 dark:text-red-300">{customMessageError}</p>
                  </motion.div>
                )}
                
                {/* Mostrar mensaje generado automáticamente (siempre seleccionado por defecto) */}
                {loadingCustomMessage && !autoGeneratedMessage && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center py-8"
                  >
                    <Loader2 className="w-5 h-5 animate-spin text-purple-500 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Generando mensaje personalizado...</span>
                  </motion.div>
                )}
                
                {autoGeneratedMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-3"
                  >
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        setCustomTransferMessage(autoGeneratedMessage);
                        setSelectedPresetReason('');
                      }}
                      className={`w-full px-5 py-4 rounded-xl border-2 shadow-lg text-left transition-all duration-200 ${
                        customTransferMessage === autoGeneratedMessage
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-500 shadow-purple-500/25'
                          : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Wand2 className={`w-4 h-4 ${customTransferMessage === autoGeneratedMessage ? 'text-white' : 'text-purple-500'}`} />
                          <span className="font-semibold">Mensaje Generado</span>
                        </div>
                        {customTransferMessage === autoGeneratedMessage && (
                          <CheckCircle className="w-5 h-5" />
                        )}
                      </div>
                      <p className={`text-sm mt-2 leading-relaxed ${
                        customTransferMessage === autoGeneratedMessage ? 'opacity-90' : 'opacity-75'
                      }`}>
                        {autoGeneratedMessage}
                      </p>
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedPresetReason('');
                  setCustomTransferMessage('');
                  setCustomMessageError(null);
                  setAutoGeneratedMessage(null);
                }}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                Cancelar
              </motion.button>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  let finalReason = '';
                  if (selectedPresetReason) {
                    const preset = transferReasons.find(r => r.short === selectedPresetReason);
                    finalReason = preset ? preset.full : selectedPresetReason;
                  } else if (customTransferMessage) {
                    finalReason = customTransferMessage;
                  }
                  
                  if (!finalReason || !finalReason.trim()) {
                    alert('Por favor, selecciona una razón o escribe un mensaje personalizado');
                    return;
                  }
                  
                  handleTransferCall(finalReason);
                }}
                disabled={transferLoading || (!selectedPresetReason && !customTransferMessage)}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {transferLoading ? 'Transfiriendo...' : 'Transferir'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
};

