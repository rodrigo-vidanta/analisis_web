/**
 * ============================================
 * COMPONENTE KANBAN PRINCIPAL - MÓDULO LIVE MONITOR
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/analysis/README_LIVEMONITOR.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/analysis/README_LIVEMONITOR.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/analysis/CHANGELOG_LIVEMONITOR.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, MapPin, Users, Globe, Volume2, VolumeX, FileText, CheckCircle, XCircle, Clock, Send, PhoneCall, RotateCcw, MessageSquare, ArrowRightLeft, Eye, Star, DollarSign, Wand2, Mail, Search, Filter, Calendar, BarChart3, TrendingUp, Play, Pause, Download, AlertTriangle, ChevronRight, Loader2, Plane, Headphones, Waves } from 'lucide-react';
import Chart from 'chart.js/auto';
import { analysisSupabase } from '../../config/analysisSupabase';
import { liveMonitorService, type LiveCallData, type Agent, type FeedbackData } from '../../services/liveMonitorService';
import { liveMonitorKanbanOptimized } from '../../services/liveMonitorKanbanOptimized';
import { classifyCallStatus, CALL_STATUS_CONFIG, type CallStatusGranular } from '../../services/callStatusClassifier';
import { useTheme } from '../../hooks/useTheme';
import { FinalizationModal } from './FinalizationModal';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
import { ParaphraseModal } from '../chat/ParaphraseModal';
import { AssignmentBadge } from './AssignmentBadge';
import { useAuth } from '../../contexts/AuthContext';
import { BackupBadgeWrapper } from '../shared/BackupBadgeWrapper';
import { ProspectAvatar } from './ProspectAvatar';
import { ScheduledCallsSection } from '../shared/ScheduledCallsSection';
import { Avatar } from '../shared/Avatar';
import { useNotifications } from '../../hooks/useNotifications';
import { useNotificationStore } from '../../stores/notificationStore';
import { useLiveActivityStore } from '../../stores/liveActivityStore';
import { coordinacionService } from '../../services/coordinacionService';
import { permissionsService } from '../../services/permissionsService';
import ReactMarkdown from 'react-markdown';
import { CallDetailModalSidebar } from '../chat/CallDetailModalSidebar';
import { ProspectoSidebar } from '../prospectos/ProspectosManager';
import { createPortal } from 'react-dom';
import { convertUTCToMexicoTime } from '../../utils/timezoneHelper';

/**
 * ============================================
 * GLOSARIO DE COMPONENTES COMPARTIDOS
 * ============================================
 * 
 * Este módulo utiliza componentes compartidos que deben mantenerse actualizados
 * en todos los módulos donde se usan. A continuación se listan los componentes
 * y dónde se deben actualizar:
 * 
 * 1. ProspectoSidebar
 *    - Archivo fuente: src/components/prospectos/ProspectosManager.tsx
 *    - Export: export { ProspectoSidebar }
 *    - Módulos que lo usan:
 *      - src/components/prospectos/ProspectosManager.tsx (origen)
 *      - src/components/analysis/LiveMonitorKanban.tsx (este archivo)
 *      - src/components/chat/ProspectDetailSidebar.tsx
 *      - src/components/dashboard/widgets/ConversacionesWidget.tsx
 *      - src/components/dashboard/widgets/ProspectosNuevosWidget.tsx
 *      - src/components/scheduled-calls/ScheduledCallsManager.tsx
 * 
 * 2. CallDetailModalSidebar
 *    - Archivo fuente: src/components/chat/CallDetailModalSidebar.tsx
 *    - Export: export { CallDetailModalSidebar }
 *    - Módulos que lo usan:
 *      - src/components/prospectos/ProspectosManager.tsx
 *      - src/components/analysis/LiveMonitorKanban.tsx (este archivo)
 *      - src/components/chat/ProspectDetailSidebar.tsx
 *      - src/components/dashboard/widgets/ConversacionesWidget.tsx
 *      - src/components/dashboard/widgets/ProspectosNuevosWidget.tsx
 *      - src/components/scheduled-calls/ScheduledCallsManager.tsx
 * 
 * ⚠️ IMPORTANTE: Al actualizar estos componentes, asegúrate de actualizarlos
 *    en TODOS los módulos listados arriba para mantener la consistencia.
 * 
 * Nota: El sonido de checkpoint #5 se reproduce desde el Sidebar para evitar duplicación
 * cuando se está en el módulo Live Monitor. El Sidebar reproduce el sonido independientemente
 * del módulo activo, por lo que no es necesario reproducirlo aquí también.
 */

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

// Usar el servicio optimizado para clasificación automática
const USE_OPTIMIZED_VIEW = true; // Toggle para activar/desactivar la vista optimizada
const DEBUG_MIXED_SOURCES = true; // Debug para ver qué datos se están mostrando

// ⚠️ ProspectoSidebar LOCAL ELIMINADO - Ahora se usa el componente actualizado importado desde ProspectosManager.tsx
// Ver glosario al inicio del archivo para más información sobre componentes compartidos

// ============================================
// CONFIGURACIÓN DE AUDIO EN TIEMPO REAL
// ============================================
const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000,
  MIN_CHUNK_SIZE: 320,
  DEFAULT_VOLUME: 1.0,
  // Ganancia por defecto por canal (escala 1-10)
  // Canal Izquierdo = HUMANO: 1-10 donde 1=300%, 10=800% → multiplicador = 3.0 + (slider-1) * (5.0/9)
  // Canal Derecho = IA: 0-10 donde 5=50% → multiplicador = slider * 0.1
  DEFAULT_HUMAN_SLIDER: 5,   // Canal izquierdo: Humano (5 = ~522%)
  DEFAULT_IA_SLIDER: 5,      // Canal derecho: IA (5 = 50%)
  LATENCY_HINT: 'interactive' as AudioContextLatencyCategory,
  STORAGE_KEY_HUMAN: 'pqnc_audio_human_slider',
  STORAGE_KEY_IA: 'pqnc_audio_ia_slider',
};

// Funciones de conversión de slider a multiplicador real
// IA: 0-10 donde 5 = 50% (0.5x)
const sliderToIAGain = (slider: number): number => slider * 0.1;
// Humano: 1-10 donde 1=300% (3.0x), 10=800% (8.0x) - rango lineal
const sliderToHumanGain = (slider: number): number => 3.0 + (slider - 1) * (5.0 / 9);

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

const getStoredGain = (key: string, defaultValue: number): number => {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const value = parseFloat(stored);
      if (!isNaN(value) && value >= 0 && value <= 10) return value;
    }
  } catch {}
  return defaultValue;
};

const setStoredGain = (key: string, value: number): void => {
  try { localStorage.setItem(key, value.toString()); } catch {}
};

const LiveMonitorKanban: React.FC = () => {
  const { user } = useAuth();
  const { triggerCallNotification } = useNotificationStore();
  
  // Live Activity Widget store
  const { isWidgetEnabled, toggleWidget } = useLiveActivityStore();
  
  // Marcar notificaciones de Live Monitor como leídas al entrar al módulo
  useNotifications({ currentModule: 'live-monitor' });
  

  const [activeCalls, setActiveCalls] = useState<KanbanCall[]>([]);
  const [selectedTab, setSelectedTab] = useState<'active' | 'all'>('active');
  const [allCalls, setAllCalls] = useState<KanbanCall[]>([]);
  const [allCallsWithAnalysis, setAllCallsWithAnalysis] = useState<any[]>([]); // Llamadas combinadas con análisis IA
  const [selectedCall, setSelectedCall] = useState<KanbanCall | null>(null);
  const [viewedCalls, setViewedCalls] = useState<Set<string>>(new Set()); // Track de llamadas vistas en modal
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Ref para mantener checkpoints anteriores entre renders (para detectar cambios)
  const previousCheckpointsRef = React.useRef<Map<string, string>>(new Map());
  
  // Estados para sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  // Estados para filtros de Historial (AnalysisIAComplete)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [interestFilter, setInterestFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ejecutivoFilter, setEjecutivoFilter] = useState('');
  const [filteredHistoryCalls, setFilteredHistoryCalls] = useState<any[]>([]);
  // Estados para infinite scroll del historial
  const [allHistoryCallsLoaded, setAllHistoryCallsLoaded] = useState<any[]>([]);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [totalHistoryCount, setTotalHistoryCount] = useState(0);
  const HISTORY_BATCH_SIZE = 200;
  const historyScrollContainerRef = useRef<HTMLDivElement>(null);
  const isLoadingHistoryRef = useRef(false);
  const currentPageHistoryRef = useRef(0); // Usar ref para evitar problemas de estado asíncrono
  const hasInitialLoadRef = useRef(false); // Prevenir múltiples cargas iniciales
  const [uniqueInterests, setUniqueInterests] = useState<string[]>([]);
  const [uniqueEjecutivos, setUniqueEjecutivos] = useState<Array<{id: string, name: string}>>([]);
  const [quickFilters, setQuickFilters] = useState<{
    destino?: string;
    estadoCivil?: string;
    interes?: string;
    perdida?: boolean;
    noTransferida?: boolean;
    transferida?: boolean;
  }>({});
  
  // Estados para agrupamiento de llamadas - solo un grupo expandido a la vez
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupedCalls, setGroupedCalls] = useState<Record<string, any[]>>({});
  
  // Estados para sorting
  const [historySortField, setHistorySortField] = useState<string>('created_at');
  const [historySortDirection, setHistorySortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Estados para modal de detalle de análisis IA
  const [showAnalysisDetailModal, setShowAnalysisDetailModal] = useState(false);
  const [selectedCallForAnalysis, setSelectedCallForAnalysis] = useState<any | null>(null);
  const [transcript, setTranscript] = useState<any[]>([]);
  const radarChartRef = useRef<Chart | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [highlightedSegment, setHighlightedSegment] = useState<number | null>(null);
  // Ref para verificar si hay modal abierto (evitar rerenders durante actualización periódica)
  const isModalOpenRef = useRef<boolean>(false);
  const [selectedProspectoData, setSelectedProspectoData] = useState<any | null>(null);
  
  // ============================================
  // ESTADOS DE MONITOREO DE AUDIO EN TIEMPO REAL
  // ============================================
  const [isListeningLive, setIsListeningLive] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioVolume, setAudioVolume] = useState(AUDIO_CONFIG.DEFAULT_VOLUME);
  const [isLiveAudioPlaying, setIsLiveAudioPlaying] = useState(false);
  const [audioStats, setAudioStats] = useState({ chunks: 0 });
  // Canal Izquierdo = HUMANO, Canal Derecho = IA
  const [humanSlider, setHumanSlider] = useState(() => getStoredGain(AUDIO_CONFIG.STORAGE_KEY_HUMAN, AUDIO_CONFIG.DEFAULT_HUMAN_SLIDER));
  const [iaSlider, setIaSlider] = useState(() => getStoredGain(AUDIO_CONFIG.STORAGE_KEY_IA, AUDIO_CONFIG.DEFAULT_IA_SLIDER));
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  
  // Refs para audio en tiempo real
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWebSocketRef = useRef<WebSocket | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioChunkCountRef = useRef(0);
  const nextPlayTimeRef = useRef<number>(0);
  const isBufferingRef = useRef<boolean>(true);
  const audioBufferQueueRef = useRef<AudioBuffer[]>([]);
  // Refs: Canal Izquierdo = HUMANO, Canal Derecho = IA
  const leftGainRef = useRef(sliderToHumanGain(humanSlider));  // Izquierdo = Humano
  const rightGainRef = useRef(sliderToIAGain(iaSlider));       // Derecho = IA
  const BUFFER_THRESHOLD = 3;
  
  // Refs para optimización de rendimiento del audio
  const lastUpdateTimeRef = useRef<number>(0);
  const lastSegmentRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const [ejecutivosMap, setEjecutivosMap] = useState<Record<string, any>>({});
  const [coordinacionesMap, setCoordinacionesMap] = useState<Record<string, any>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoordinador, setIsCoordinador] = useState(false);
  const [isEjecutivo, setIsEjecutivo] = useState(false);
  const [isAdminOperativo, setIsAdminOperativo] = useState(false);
  const [modalTab, setModalTab] = useState<'details' | 'analysis'>('details');
  
  // ============================================
  // FUNCIONES DE AUDIO EN TIEMPO REAL
  // ============================================
  
  /**
   * Inicializa el AudioContext para reproducción de audio
   */
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
      gainNode.gain.value = audioVolume;
      gainNode.connect(ctx.destination);
      
      audioContextRef.current = ctx;
      gainNodeRef.current = gainNode;
      
      return ctx;
    } catch (error) {
      console.error('[LiveMonitor Audio] Error inicializando AudioContext:', error);
      setAudioError('No se pudo inicializar el sistema de audio');
      return null;
    }
  }, [audioVolume]);

  /**
   * Programa la reproducción de un AudioBuffer con timing preciso
   */
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
    
    setIsLiveAudioPlaying(true);
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
   */
  const processAudioChunk = useCallback(async (audioData: ArrayBuffer) => {
    const ctx = audioContextRef.current;
    const gainNode = gainNodeRef.current;
    
    if (!ctx || !gainNode) return;
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    try {
      const chunkSize = audioData.byteLength;
      
      if (chunkSize < AUDIO_CONFIG.MIN_CHUNK_SIZE) {
        return;
      }
      
      audioChunkCountRef.current++;
      if (audioChunkCountRef.current % 100 === 0) {
        setAudioStats({ chunks: audioChunkCountRef.current });
      }
      
      const pcmSamples = new Int16Array(audioData);
      const totalSamples = pcmSamples.length;
      
      if (totalSamples < 2) return;
      
      const samplesPerChannel = Math.floor(totalSamples / 2);
      
      const audioBuffer = ctx.createBuffer(2, samplesPerChannel, AUDIO_CONFIG.SAMPLE_RATE);
      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel = audioBuffer.getChannelData(1);
      
      const currentLeftGain = leftGainRef.current;
      const currentRightGain = rightGainRef.current;
      
      for (let i = 0; i < samplesPerChannel; i++) {
        let leftSample = (pcmSamples[i * 2] / 32768.0) * currentLeftGain;
        let rightSample = (pcmSamples[i * 2 + 1] / 32768.0) * currentRightGain;
        
        leftSample = Math.max(-0.98, Math.min(0.98, leftSample));
        rightSample = Math.max(-0.98, Math.min(0.98, rightSample));
        
        leftChannel[i] = leftSample;
        rightChannel[i] = rightSample;
      }
      
      if (isBufferingRef.current) {
        audioBufferQueueRef.current.push(audioBuffer);
        
        if (audioBufferQueueRef.current.length >= BUFFER_THRESHOLD) {
          isBufferingRef.current = false;
          nextPlayTimeRef.current = ctx.currentTime + 0.05;
          processBufferQueue();
        }
      } else {
        scheduleAudioPlayback(audioBuffer);
      }
      
    } catch (error) {
      console.error('[LiveMonitor Audio] Error procesando chunk:', error);
    }
  }, [scheduleAudioPlayback, processBufferQueue]);

  /**
   * Inicia el monitoreo de audio para una llamada específica
   */
  const startAudioMonitoring = useCallback(async (monitorUrl: string) => {
    if (!monitorUrl) {
      setAudioError('Esta llamada no tiene URL de monitoreo disponible');
      return;
    }
    
    setAudioError(null);
    
    const ctx = initAudioContext();
    if (!ctx) return;
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    try {
      const ws = new WebSocket(monitorUrl);
      ws.binaryType = 'arraybuffer';
      
      ws.onopen = () => {
        setIsListeningLive(true);
        audioChunkCountRef.current = 0;
        setAudioStats({ chunks: 0 });
        isBufferingRef.current = true;
        audioBufferQueueRef.current = [];
        nextPlayTimeRef.current = 0;
      };
      
      ws.onmessage = async (event) => {
        if (event.data instanceof ArrayBuffer) {
          await processAudioChunk(event.data);
        } else if (event.data instanceof Blob) {
          const arrayBuffer = await event.data.arrayBuffer();
          await processAudioChunk(arrayBuffer);
        } else {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'error') {
              console.warn('[LiveMonitor Audio] Error del servidor:', msg.message);
            }
          } catch {
            // No es JSON, ignorar
          }
        }
      };
      
      ws.onerror = (error) => {
        console.error('[LiveMonitor Audio] ❌ Error WebSocket:', error);
        setAudioError('Error en la conexión de audio.');
      };
      
      ws.onclose = (event) => {
        if (event.code !== 1000) {
          setAudioError('Conexión de audio finalizada.');
        }
        setIsListeningLive(false);
        setIsLiveAudioPlaying(false);
      };
      
      audioWebSocketRef.current = ws;
      
    } catch (error) {
      console.error('[LiveMonitor Audio] Error al conectar:', error);
      setAudioError('No se pudo conectar al audio de la llamada');
      setIsListeningLive(false);
    }
  }, [initAudioContext, processAudioChunk]);

  /**
   * Detiene el monitoreo de audio
   */
  const stopAudioMonitoring = useCallback(() => {
    if (audioWebSocketRef.current) {
      audioWebSocketRef.current.close(1000, 'Usuario detuvo el monitoreo');
      audioWebSocketRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    gainNodeRef.current = null;
    setIsListeningLive(false);
    setIsLiveAudioPlaying(false);
    setAudioError(null);
    audioChunkCountRef.current = 0;
  }, []);

  /**
   * Toggle del monitoreo de audio
   */
  const toggleAudioMonitoring = useCallback((monitorUrl?: string) => {
    if (isListeningLive) {
      stopAudioMonitoring();
    } else if (monitorUrl) {
      startAudioMonitoring(monitorUrl);
    }
  }, [isListeningLive, startAudioMonitoring, stopAudioMonitoring]);

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
  
  // Actualizar volumen master en tiempo real
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = audioVolume;
    }
  }, [audioVolume]);
  
  // Ref para almacenar la llamada del widget (evita abrir modal de detalle)
  const widgetTransferCallRef = React.useRef<KanbanCall | null>(null);
  
  // Listener para transferencias desde el Panel Lateral (widget global)
  useEffect(() => {
    const handleWidgetTransfer = async (event: CustomEvent<{ callId: string }>) => {
      const { callId } = event.detail;
      
      // Buscar la llamada en las llamadas activas
      const call = activeCalls.find(c => c.call_id === callId);
      
      if (call) {
        // Guardar en ref (NO en selectedCall para evitar abrir modal de detalle)
        widgetTransferCallRef.current = call;
        
        // Abrir modal de transferencia directamente
        if (call.prospecto_id) {
          setShowTransferModal(true);
          setSelectedPresetReason('');
          setCustomTransferMessage('');
          setCustomTransferText('');
          setAutoGeneratedMessage(null);
          setCustomMessageError(null);
          
          // Cargar mensaje automáticamente
          setLoadingCustomMessage(true);
          const message = await handleRequestCustomMessage(call.prospecto_id);
          if (message) {
            setAutoGeneratedMessage(message);
            setCustomTransferMessage(message);
            setCustomTransferText(message);
          }
        }
      } else {
        console.warn('[LiveMonitorKanban] Llamada no encontrada para transferencia:', callId);
      }
    };
    
    window.addEventListener('live-activity-transfer', handleWidgetTransfer as EventListener);
    
    return () => {
      window.removeEventListener('live-activity-transfer', handleWidgetTransfer as EventListener);
    };
  }, [activeCalls]);
  
  // Función para cargar transcripción
  const loadTranscript = async (callId: string, voiceSpeed: number = 1.04) => {
    try {
      const { data, error } = await analysisSupabase
        .from('llamadas_ventas')
        .select('conversacion_completa')
        .eq('call_id', callId)
        .single();

      if (error) throw error;

      // Parsear conversación a segmentos con cálculo de tiempo basado en velocidad de voz
      const segments = parseConversationToSegments(data?.conversacion_completa, callId, voiceSpeed);
      setTranscript(segments);
      // Reset refs cuando se carga nueva transcripción
      lastSegmentRef.current = null;
      lastUpdateTimeRef.current = 0;
    } catch (err) {
      console.error('Error loading transcript:', err);
      setTranscript([]);
    }
  };

  // Handler optimizado para onTimeUpdate con throttling y optimizaciones
  const handleAudioTimeUpdate = useCallback(() => {
    if (!audioRef.current || transcript.length === 0) return;
    
    const now = performance.now();
    // Throttling: solo procesar cada ~100ms (en lugar de cada frame)
    if (now - lastUpdateTimeRef.current < 100) return;
    lastUpdateTimeRef.current = now;
    
    const currentTime = audioRef.current.currentTime;
    setCurrentAudioTime(audioRef.current.volume * 100);
    
    // Optimización: empezar búsqueda desde el último segmento conocido
    let currentSegment = -1;
    const startIndex = lastSegmentRef.current !== null ? Math.max(0, lastSegmentRef.current - 1) : 0;
    
    // Buscar segmento actual (empezar desde el último conocido para optimizar)
    for (let i = startIndex; i < transcript.length; i++) {
      const segment = transcript[i];
      if (segment.startTime !== undefined && segment.endTime !== undefined) {
        if (currentTime >= segment.startTime && currentTime <= segment.endTime) {
          currentSegment = i;
          break;
        }
        // Si ya pasamos el tiempo de este segmento, podemos continuar
        if (currentTime < segment.startTime) {
          // Si el tiempo actual es menor que el startTime, el segmento anterior podría ser el correcto
          if (i > 0) {
            const prevSegment = transcript[i - 1];
            if (prevSegment.endTime !== undefined && currentTime <= prevSegment.endTime) {
              currentSegment = i - 1;
            }
          }
          break;
        }
      }
    }
    
    // Fallback: cálculo proporcional solo si no se encontró
    if (currentSegment === -1 && transcript.length > 0) {
      const lastSegment = transcript[transcript.length - 1];
      const totalDuration = lastSegment.endTime || selectedCallForAnalysis?.duracion_segundos || 1;
      currentSegment = Math.floor((currentTime / totalDuration) * transcript.length);
      currentSegment = Math.min(Math.max(0, currentSegment), transcript.length - 1);
    }
    
    // Solo actualizar si cambió el segmento
    if (currentSegment >= 0 && currentSegment !== lastSegmentRef.current) {
      lastSegmentRef.current = currentSegment;
      setHighlightedSegment(currentSegment);
      
      // Scroll optimizado: usar requestAnimationFrame y evitar múltiples scrolls
      if (scrollTimeoutRef.current !== null) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = requestAnimationFrame(() => {
        if (transcriptContainerRef.current && currentSegment < transcript.length) {
          const segmentElement = transcriptContainerRef.current.children[currentSegment] as HTMLElement;
          if (segmentElement) {
            segmentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        scrollTimeoutRef.current = null;
      });
    }
  }, [transcript, selectedCallForAnalysis]);

  // Función para crear gráfica radar
  const createRadarChart = (callId: string, calificaciones: Record<string, string>) => {
    // Esperar un poco más para asegurar que el canvas esté en el DOM
    setTimeout(() => {
      const canvas = document.getElementById(`radar-chart-${callId}`) as HTMLCanvasElement;
      if (!canvas) {
        console.warn(`Canvas not found for radar chart: radar-chart-${callId}`);
        return;
      }

      // Destruir gráfica anterior si existe
      if (radarChartRef.current) {
        radarChartRef.current.destroy();
        radarChartRef.current = null;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Convertir calificaciones a scores numéricos
      const labelMap: Record<string, string> = {
        'continuidad_whatsapp': 'Continuidad WhatsApp',
        'tratamiento_formal': 'Tratamiento Formal',
        'control_narrativo': 'Control Narrativo',
        'discovery_familiar': 'Discovery Familiar',
        'deteccion_interes': 'Detección Interés',
        'manejo_objeciones': 'Manejo Objeciones',
        'cumplimiento_reglas': 'Cumplimiento Reglas'
      };
      
      const filteredEntries = Object.entries(calificaciones).filter(([key]) => key !== 'calidad_cierre');
      const labels = filteredEntries.map(([key]) => 
        labelMap[key] || key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      );
      
      const data = filteredEntries.map(([, value]) => {
        switch (value) {
          case 'PERFECTO': return 100;
          case 'BUENO': case 'BUENA': return 80;
          case 'DEFICIENTE': return 25;
          case 'NO_APLICABLE': return 50;
          case 'REGULAR': return 60;
          case 'CONTROLADO': return 90;
          case 'PARCIAL': return 60;
          case 'DESCONTROLADO': return 20;
          case 'COMPLETO': return 100;
          case 'INCOMPLETO': return 40;
          case 'NO_REALIZADO': return 10;
          case 'PRECISA': return 95;
          case 'TARDÍA': return 70;
          case 'TEMPRANA': return 80;
          case 'IMPRECISA': return 30;
          case 'EXCELENTE': return 100;
          case 'BÁSICO': return 50;
          case 'NO_HUBO': return 75;
          case 'MALO': return 20;
          default: return 50;
        }
      });

      radarChartRef.current = new Chart(ctx, {
        type: 'radar',
        data: {
          labels,
          datasets: [{
            label: 'Evaluación de Continuidad y Discovery',
            data,
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderColor: 'rgba(16, 185, 129, 0.8)',
            borderWidth: 3,
            pointBackgroundColor: 'rgba(16, 185, 129, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 7,
            pointHoverRadius: 10,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              min: 0,
              ticks: {
                stepSize: 25,
                color: 'rgba(148, 163, 184, 0.8)',
                font: {
                  size: 10
                }
              },
              grid: {
                color: 'rgba(148, 163, 184, 0.2)'
              },
              angleLines: {
                color: 'rgba(148, 163, 184, 0.2)'
              },
              pointLabels: {
                color: 'rgba(71, 85, 105, 1)',
                font: {
                  size: 11,
                  weight: 500
                }
              }
            }
          },
          elements: {
            point: {
              hoverRadius: 8
            }
          }
        }
      });
    }, 100); // Pequeño delay para asegurar que el canvas esté renderizado
  };

  // Efecto para crear gráfica radar cuando se abre el modal o se cambia a la pestaña de análisis
  useEffect(() => {
    if (showAnalysisDetailModal && selectedCallForAnalysis?.calificaciones && modalTab === 'analysis') {
      // Destruir gráfica anterior si existe
      if (radarChartRef.current) {
        radarChartRef.current.destroy();
        radarChartRef.current = null;
      }
      
      const timer = setTimeout(() => {
        createRadarChart(selectedCallForAnalysis.call_id, selectedCallForAnalysis.calificaciones);
      }, 300);
      
      return () => {
        clearTimeout(timer);
        if (radarChartRef.current) {
          radarChartRef.current.destroy();
          radarChartRef.current = null;
        }
      };
    }
    
    // Limpiar gráfica cuando se cierra el modal o se cambia de pestaña
    if ((!showAnalysisDetailModal || modalTab !== 'analysis') && radarChartRef.current) {
      radarChartRef.current.destroy();
      radarChartRef.current = null;
    }
  }, [showAnalysisDetailModal, selectedCallForAnalysis, modalTab]);

  // Limpiar audio cuando se cierra el modal
  useEffect(() => {
    if (!showAnalysisDetailModal) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsAudioPlaying(false);
      setCurrentAudioTime(0);
      setHighlightedSegment(null);
      // Limpiar refs de optimización
      lastSegmentRef.current = null;
      lastUpdateTimeRef.current = 0;
      if (scrollTimeoutRef.current !== null) {
        cancelAnimationFrame(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    }
  }, [showAnalysisDetailModal]);

  // Función optimizada para calcular tiempo de habla basado en análisis de datos reales
  // Análisis de datos reales (tiempos medidos):
  // - Mensaje 1 (150 chars): 9.44s → ~15.9 chars/seg
  // - Mensaje 2 (130 chars): 8.80s → ~14.8 chars/seg  
  // - Mensaje 3 (200 chars): 14.0s → ~14.3 chars/seg
  // Promedio real: ~15.0 chars/segundo (con speed 1.04)
  // 
  // AJUSTE CRÍTICO: Si el audio se queda atrás ~4 segundos, significa que estamos
  // sobreestimando el tiempo. Necesitamos aumentar la velocidad base significativamente.
  // Usar velocidad más alta (~17-18 chars/seg) para compensar el desfase.
  const calculateSpeechTime = (text: string, voiceSpeed: number = 1.04): number => {
    if (!text || text.length === 0) return 0;
    
    const charCount = text.length;
    
    // Velocidad base aumentada para compensar desfase de ~4 segundos
    // Usar ~17.5 chars/seg (más alto que el promedio para compensar sobreestimación)
    // speed 1.04 significa que habla 1.04x más rápido
    const baseCharsPerSecond = 17.5 / voiceSpeed; // ~16.8 chars/seg efectivos
    
    // Factor 1: Puntuación (pausas mínimas para evitar sobreestimación)
    const punctuationPause = (text.match(/[.!?]/g) || []).length * 0.1; // Muy reducido
    const commaPause = (text.match(/[,;]/g) || []).length * 0.05; // Muy reducido
    
    // Factor 2: Palabras largas (penalización mínima)
    const longWords = text.split(/\s+/).filter(w => w.length > 6).length;
    const longWordPenalty = longWords * 0.03; // Mínimo
    
    // Factor 3: Números (penalización mínima)
    const numberMatches = text.match(/\d+/g) || [];
    const numberCount = numberMatches.length;
    const numberPenalty = numberCount * 0.05; // Mínimo
    
    // Factor 4: Preguntas (pausa mínima)
    const isQuestion = text.includes('?');
    const questionPause = isQuestion ? 0.05 : 0; // Mínimo
    
    // Cálculo final: tiempo base + pausas mínimas
    const baseTime = charCount / baseCharsPerSecond;
    const totalTime = baseTime + punctuationPause + commaPause + longWordPenalty + numberPenalty + questionPause;
    
    return Math.max(totalTime, 0.2); // Mínimo 0.2 segundos por mensaje
  };

  const parseConversationToSegments = (conversacionData: any, callId: string, voiceSpeed: number = 1.04): any[] => {
    try {
      let conversationText = '';
      
      if (typeof conversacionData === 'string') {
        const parsed = JSON.parse(conversacionData);
        conversationText = parsed.conversacion || '';
      } else if (conversacionData?.conversacion) {
        conversationText = conversacionData.conversacion;
      }
      
      if (!conversationText) return [];
      
      const lines = conversationText.split('\n').filter((line: string) => line.trim());
      const segments: any[] = [];
      let accumulatedTime = 0; // Tiempo acumulado desde el inicio
      
      lines.forEach((line: string, index: number) => {
        const match = line.match(/^\[(.+?)\]\s+(\w+):\s+(.+)$/);
        if (match) {
          const [, timestamp, speaker, content] = match;
          const speechTime = calculateSpeechTime(content.trim(), voiceSpeed);
          const segmentStartTime = accumulatedTime;
          accumulatedTime += speechTime;
          
          // Convertir timestamp de UTC a hora de México (UTC-6)
          const mexicoTimestamp = convertUTCToMexicoTime(timestamp.trim());
          
          segments.push({
            id: `${callId}-${index}`,
            call_id: callId,
            segment_index: index,
            speaker: speaker.toLowerCase(),
            content: content.trim(),
            timestamp: mexicoTimestamp,
            confidence: 1.0,
            startTime: segmentStartTime,
            endTime: accumulatedTime,
            duration: speechTime
          });
        }
      });
      
      return segments;
    } catch (error) {
      console.error('Error parsing conversation:', error);
      return [];
    }
  };
  
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

  // Función para cargar historial de llamadas desde la misma fuente que AnalysisIAComplete
  const loadHistoryCalls = useCallback(async (reset: boolean = false) => {
    // Prevenir ejecuciones simultáneas
    if (isLoadingHistoryRef.current) {
      return;
    }
    
    isLoadingHistoryRef.current = true;
    
    try {
      // Si es reset, resetear estados (el COUNT total ya se calcula en el useEffect inicial)
      if (reset) {
        currentPageHistoryRef.current = 0;
        setAllHistoryCallsLoaded([]);
        setHasMoreHistory(true);
        hasInitialLoadRef.current = false;
        // NOTA: No reseteamos totalHistoryCount aquí - se mantiene el valor calculado por el useEffect
      }
      
      const pageToLoad = reset ? 0 : currentPageHistoryRef.current;
      
      // Solo mostrar loading si no hay datos previos (evitar parpadeos en actualizaciones)
      if (allHistoryCallsLoaded.length === 0 || reset) {
        setLoading(true);
      } else {
        setLoadingMoreHistory(true);
      }
      
      // Determinar permisos del usuario
      let ejecutivoFilter: string | null = null;
      let coordinacionesFilter: string[] | null = null;
      let isAdminCheck = false;
      
      if (user?.id) {
        const permissionsServiceModule = await import('../../services/permissionsService');
        const permissions = await permissionsServiceModule.permissionsService.getUserPermissions(user.id);
        
        // Administrador Operativo NO puede ver historial - retornar vacío
        if (permissions?.role === 'administrador_operativo') {
          setIsAdminOperativo(true);
          setAllCallsWithAnalysis([]);
          setAllCalls([]);
          setLoading(false);
          // Si está en la pestaña de historial, cambiar a activas
          if (selectedTab === 'all') {
            setSelectedTab('active');
          }
          return;
        }
        
        setIsAdminOperativo(false);
        isAdminCheck = permissions?.role === 'admin';
        setIsAdmin(isAdminCheck);
        
        if (!isAdminCheck) {
          ejecutivoFilter = await permissionsServiceModule.permissionsService.getEjecutivoFilter(user.id);
          coordinacionesFilter = await permissionsServiceModule.permissionsService.getCoordinacionesFilter(user.id);
          const esCoordinadorCalidad = await permissionsServiceModule.permissionsService.isCoordinadorCalidad(user.id);
          setIsEjecutivo(!!ejecutivoFilter);
          // Coordinador de Calidad también se considera coordinador (pero con acceso completo)
          setIsCoordinador((!!coordinacionesFilter && coordinacionesFilter.length > 0) || esCoordinadorCalidad);
          
          // Si es ejecutivo, verificar si tiene prospectos asignados ANTES de cargar llamadas
          // Incluir prospectos de ejecutivos donde es backup
          if (ejecutivoFilter) {
            // Obtener IDs de ejecutivos donde este ejecutivo es backup
            const { supabaseSystemUI } = await import('../../config/supabaseSystemUI');
            const { data: ejecutivosConBackup, error: backupError } = await supabaseSystemUI
              .from('auth_users')
              .select('id')
              .eq('backup_id', ejecutivoFilter)
              .eq('has_backup', true);
            
            if (backupError) {
              console.error('❌ Error obteniendo ejecutivos donde es backup:', backupError);
            }
            
            const ejecutivosIds = [ejecutivoFilter]; // Sus propios prospectos
            if (ejecutivosConBackup && ejecutivosConBackup.length > 0) {
              ejecutivosIds.push(...ejecutivosConBackup.map(e => e.id));
            }
            
            const { data: prospectosEjecutivo, error: prospectosError } = await analysisSupabase
              .from('prospectos')
              .select('id')
              .in('ejecutivo_id', ejecutivosIds)
              .not('ejecutivo_id', 'is', null)
              .limit(1);
            
            if (prospectosError) {
              console.error('Error verificando prospectos del ejecutivo:', prospectosError);
            }
            
            // Si no tiene prospectos asignados (ni propios ni de backups), retornar vacío sin cargar llamadas
            if (!prospectosEjecutivo || prospectosEjecutivo.length === 0) {
              setAllCallsWithAnalysis([]);
              setAllCalls([]);
              setLoading(false);
              return;
            }
          }
        }
      }
      
      // Cargar llamadas desde llamadas_ventas (fuente principal)
      // Infinite scroll: cargar en bloques de 200
      const from = pageToLoad * HISTORY_BATCH_SIZE;
      const to = from + HISTORY_BATCH_SIZE - 1;
      
      // NOTA: El conteo total se calcula DESPUÉS de aplicar filtros de permisos
      // para mostrar solo las llamadas a las que el usuario tiene acceso
      
      const { data: allLlamadasData, error: allLlamadasError } = await analysisSupabase
        .from('llamadas_ventas')
        .select('call_id, fecha_llamada, duracion_segundos, call_status, prospecto, datos_proceso, datos_llamada, audio_ruta_bucket')
        .order('fecha_llamada', { ascending: false })
        .range(from, to);
      
      if (allLlamadasError) {
        console.error('Error loading llamadas_ventas:', allLlamadasError);
        throw allLlamadasError;
      }
      
      // Cargar análisis desde call_analysis_summary para enriquecer los datos
      const callIds = allLlamadasData?.map(l => l.call_id).filter(Boolean) || [];
      let analysisData: any[] = [];
      let analysisError: any = null;
      
      if (callIds.length > 0) {
        const result = await analysisSupabase
        .from('call_analysis_summary')
        .select('*')
          .in('call_id', callIds)
        .order('created_at', { ascending: false });
        analysisData = result.data || [];
        analysisError = result.error;
      }
      
      if (analysisError) {
        console.error('Error loading analysis data:', analysisError);
        // Continuar sin análisis si hay error
      }
      
      // Crear mapa de análisis por call_id para lookup rápido
      const analysisMap = new Map(analysisData?.map(a => [a.call_id, a]) || []);
      
      // Crear datos combinados: todas las llamadas con sus análisis si existen
      const combinedAnalysisData = (allLlamadasData || []).map(llamada => {
        const analysis = analysisMap.get(llamada.call_id);
        if (analysis) {
          // Si hay análisis, usar sus datos
          return analysis;
        } else {
          // Si no hay análisis, crear entrada básica desde llamadas_ventas
          return {
            call_id: llamada.call_id,
            created_at: llamada.fecha_llamada || new Date().toISOString(),
            // Campos básicos que pueden no existir
            score_general: null,
            categoria_desempeno: null,
            checkpoint_alcanzado: null,
            nivel_interes_detectado: null,
            calificaciones: null,
          } as any;
        }
      });
      
      // Inicializar enrichedData fuera del bloque condicional
      let enrichedData: any[] = [];
      
      // Usar directamente allLlamadasData que ya tiene todos los datos necesarios
      if (allLlamadasData && allLlamadasData.length > 0) {
        const llamadasData = allLlamadasData;
        
          // Obtener IDs de prospectos únicos
          const prospectoIds = llamadasData.map(l => l.prospecto).filter(Boolean);
          
          // Cargar datos de prospectos con filtros de permisos
          let prospectosData: any[] = [];
        
          if (prospectoIds.length > 0) {
            // FIX: Cargar prospectos en batches para evitar error 400 por URL muy larga
            const BATCH_SIZE = 100;
            const loadProspectosInBatches = async (ids: string[]): Promise<any[]> => {
              const results: any[] = [];
              for (let i = 0; i < ids.length; i += BATCH_SIZE) {
                const batch = ids.slice(i, i + BATCH_SIZE);
                const { data, error } = await analysisSupabase
                  .from('prospectos')
                  .select('*')
                  .in('id', batch);
                if (!error && data) {
                  results.push(...data);
                } else if (error) {
                  console.error(`❌ [LiveMonitorKanban] Error cargando prospectos batch ${i / BATCH_SIZE + 1}:`, error);
                }
              }
              return results;
            };
            
            // Cargar todos los prospectos en batches
            const allProspectosLoaded = await loadProspectosInBatches(prospectoIds);
            
            // FIX: Usar los prospectos ya cargados en batches en lugar de ejecutar una query con muchos IDs
            // Los filtros de permisos se aplican sobre allProspectosLoaded
            let prospectosResult = allProspectosLoaded;
            let prospectosError = null;
            
            // Aplicar filtros de permisos manualmente sobre los datos ya cargados
            if (user?.id) {
              const permissionsServiceModule = await import('../../services/permissionsService');
              const permissions = await permissionsServiceModule.permissionsService.getUserPermissions(user.id);
              const isCalidad = await permissionsServiceModule.permissionsService.isCoordinadorCalidad(user.id);
              
              if (permissions?.role === 'administrador_operativo') {
                prospectosResult = []; // Admin operativo no puede ver historial
              } else if (!isAdminCheck && !isCalidad) {
                if (ejecutivoFilter) {
                  // Ejecutivo: obtener IDs de ejecutivos donde es backup
                  const { supabaseSystemUI } = await import('../../config/supabaseSystemUI');
                  const { data: ejecutivosConBackup } = await supabaseSystemUI
                    .from('auth_users')
                    .select('id')
                    .eq('backup_id', ejecutivoFilter)
                    .eq('has_backup', true);
                  
                  const ejecutivosIds = [ejecutivoFilter];
                  if (ejecutivosConBackup && ejecutivosConBackup.length > 0) {
                    ejecutivosIds.push(...ejecutivosConBackup.map(e => e.id));
                  }
                  
                  // Filtrar por ejecutivo_id en memoria
                  prospectosResult = prospectosResult.filter((p: any) => 
                    p.ejecutivo_id && ejecutivosIds.includes(p.ejecutivo_id)
                  );
                } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
                  // Coordinador: filtrar por coordinacion_id en memoria
                  prospectosResult = prospectosResult.filter((p: any) => 
                    p.coordinacion_id && coordinacionesFilter.includes(p.coordinacion_id)
                  );
                } else {
                  prospectosResult = []; // Sin permisos válidos
                }
              }
              // Admin y Coordinadores de Calidad: sin filtros adicionales
            }
            
            if (!prospectosError && prospectosResult && prospectosResult.length > 0) {
              // Filtrar adicionalmente en el código para asegurar que ejecutivos solo vean prospectos con ejecutivo_id asignado
              // Incluir prospectos de ejecutivos donde es backup
              // OPTIMIZACIÓN: Pre-cargar datos de backup antes de verificar permisos (igual que ProspectosManager)
              if (ejecutivoFilter && prospectosResult.length > 0) {
                const ejecutivosUnicos = [...new Set(prospectosResult.map((p: any) => p.ejecutivo_id).filter(Boolean))] as string[];
                if (ejecutivosUnicos.length > 0) {
                  await permissionsService.preloadBackupData(ejecutivosUnicos);
                }
                
                // Filtrar prospectos usando el servicio de permisos (verifica prospect_assignments)
                // OPTIMIZACIÓN: Procesar en batches de 50 para evitar saturación
                const BATCH_SIZE_PERMISSIONS = 50;
                const prospectosFiltrados: any[] = [];
                
                for (let i = 0; i < prospectosResult.length; i += BATCH_SIZE_PERMISSIONS) {
                  const batch = prospectosResult.slice(i, i + BATCH_SIZE_PERMISSIONS);
                  const batchResults = await Promise.all(
                    batch.map(async (prospecto: any) => {
                      try {
                        const permissionCheck = await permissionsService.canUserAccessProspect(ejecutivoFilter, prospecto.id);
                        return permissionCheck.canAccess ? prospecto : null;
                      } catch (error) {
                        console.error(`❌ Error verificando permiso para prospecto ${prospecto.id}:`, error);
                        return null;
                      }
                    })
                  );
                  prospectosFiltrados.push(...batchResults.filter((p: any) => p !== null));
                }
                
                prospectosData = prospectosFiltrados;
              } else {
                prospectosData = prospectosResult;
              }
              
              // Cargar datos de ejecutivos y coordinaciones únicos
              const ejecutivoIds = [...new Set(prospectosResult.map(p => p.ejecutivo_id).filter(Boolean))];
              const coordinacionIds = [...new Set(prospectosResult.map(p => p.coordinacion_id).filter(Boolean))];
              
              // ⚡ OPTIMIZACIÓN POST-MIGRACIÓN: Batch loading con 1 query en lugar de N queries
              const [ejecutivosData, coordinacionesData] = await Promise.all([
                ejecutivoIds.length > 0 ? (async () => {
                  try {
                    // Usar auth_user_profiles (vista sin RLS) que ya incluye role_name
                    const { data: ejecutivosArray } = await supabaseSystemUI
                      .from('user_profiles_v2')
                      .select('id, email, full_name, first_name, last_name, phone, coordinacion_id, is_active, role_name')
                      .in('id', ejecutivoIds)
                      .eq('role_name', 'ejecutivo')
                      .eq('is_active', true);
                    
                    return Object.fromEntries((ejecutivosArray || []).map(e => [e.id, e]));
                  } catch (err) {
                    console.error('Error loading ejecutivos batch:', err);
                    return {};
                  }
                })() : {},
                coordinacionIds.length > 0 ? Promise.all(
                  coordinacionIds.map(async (coordId) => {
                  try {
                    const coordinacion = await coordinacionService.getCoordinacionById(coordId);
                      return coordinacion ? [coordId, coordinacion] : null;
                  } catch (err) {
                    console.error(`Error loading coordinacion ${coordId}:`, err);
                      return null;
                    }
                  })
                ).then(results => Object.fromEntries(results.filter(Boolean) as [string, any][])) : {}
              ]);
              
              setEjecutivosMap(ejecutivosData);
                setCoordinacionesMap(coordinacionesData);
            }
          }
          
          // Filtrar análisis para incluir solo los que tienen prospectos permitidos
        // Este bloque debe estar fuera del if (prospectoIds.length > 0) pero dentro del if (allLlamadasData...)
        if (prospectosData.length > 0) {
          const allowedProspectoIds = new Set(prospectosData.map(p => p.id));
          
          // Usar el filtro de ejecutivo ya obtenido arriba (no volver a consultar)
          const ejecutivoFilterForValidation = ejecutivoFilter;
          
          enrichedData = combinedAnalysisData.map((analysis: any) => {
            const llamada = llamadasData.find(l => l.call_id === analysis.call_id);
              const finalLlamada = llamada || allLlamadasData?.find(l => l.call_id === analysis.call_id);
              if (!finalLlamada) {
                return null; // Si no hay datos de llamada, excluir
              }
              const prospecto = prospectosData.find(p => p.id === finalLlamada?.prospecto);
            
            // Validación estricta: el prospecto debe existir en la lista permitida
            if (!finalLlamada?.prospecto || !allowedProspectoIds.has(finalLlamada.prospecto)) {
              return null;
            }
            
            // Validación adicional: el prospecto debe existir en prospectosData
            if (!prospecto) {
              return null; // Prospecto no encontrado en los datos permitidos
            }
            
            // Validación CRÍTICA para ejecutivos: el prospecto DEBE tener ejecutivo_id asignado y coincidir exactamente
            if (ejecutivoFilterForValidation) {
              // Validación estricta: el prospecto DEBE tener ejecutivo_id asignado (no null, no undefined, no string vacío)
              const ejecutivoId = prospecto.ejecutivo_id;
              if (!ejecutivoId || ejecutivoId === null || ejecutivoId === undefined || ejecutivoId === '') {
                return null; // Ejecutivo NO puede ver prospectos sin ejecutivo_id asignado
              }
              // Validación estricta: el ejecutivo_id DEBE coincidir exactamente con el ejecutivo actual
              if (String(ejecutivoId).trim() !== String(ejecutivoFilterForValidation).trim()) {
                return null; // Ejecutivo no puede ver prospectos asignados a otro ejecutivo
              }
            }
            
            // Parsear datos_proceso y datos_llamada
            let datosProceso = null;
            let datosLlamada = null;
            
            try {
                if (finalLlamada?.datos_proceso) {
                  datosProceso = typeof finalLlamada.datos_proceso === 'string' 
                    ? JSON.parse(finalLlamada.datos_proceso) 
                    : finalLlamada.datos_proceso;
                }
                if (finalLlamada?.datos_llamada) {
                  datosLlamada = typeof finalLlamada.datos_llamada === 'string' 
                    ? JSON.parse(finalLlamada.datos_llamada) 
                    : finalLlamada.datos_llamada;
              }
            } catch (e) {
              console.error('Error parsing datos_proceso/datos_llamada:', e);
            }
            
            // Usar clasificador centralizado para determinar el estado correcto
            const callStatus = classifyCallStatus({
              call_id: finalLlamada?.call_id,
              call_status: finalLlamada?.call_status,
              fecha_llamada: finalLlamada?.fecha_llamada || analysis.created_at,
              duracion_segundos: finalLlamada?.duracion_segundos,
              audio_ruta_bucket: finalLlamada?.audio_ruta_bucket,
              monitor_url: (finalLlamada as any)?.monitor_url,
              datos_llamada: datosLlamada
            });
            
            return {
              ...analysis,
                ...finalLlamada,
              // Datos del prospecto
              nombre_completo: prospecto?.nombre_completo || 
                               `${prospecto?.nombre || ''} ${prospecto?.apellido_paterno || ''} ${prospecto?.apellido_materno || ''}`.trim() ||
                               analysis.customer_name ||
                               'Prospecto sin nombre',
              nombre_whatsapp: prospecto?.nombre_completo || prospecto?.nombre || analysis.customer_name,
                whatsapp: prospecto?.whatsapp,
              prospecto_nombre: prospecto?.nombre_completo || 
                               `${prospecto?.nombre || ''} ${prospecto?.apellido_paterno || ''} ${prospecto?.apellido_materno || ''}`.trim() ||
                               'Prospecto sin nombre',
              prospecto_whatsapp: prospecto?.whatsapp,
              prospecto_ciudad: prospecto?.ciudad_residencia,
                prospecto_id: finalLlamada?.prospecto || prospecto?.id,
              // Campos combinados para fácil acceso
              score_general: analysis.score_general || null,
              categoria_desempeno: analysis.categoria_desempeno || null,
                checkpoint_alcanzado: analysis.checkpoint_alcanzado || parseInt((finalLlamada as any)?.checkpoint_venta_actual?.replace('checkpoint #', '') || '1'),
                nivel_interes_detectado: analysis.nivel_interes_detectado || (finalLlamada as any)?.nivel_interes,
              calificaciones: analysis.calificaciones || null,
              discovery_familiar: analysis.calificaciones?.discovery_familiar || null,
              continuidad_whatsapp: analysis.calificaciones?.continuidad_whatsapp || null,
              // Datos de discovery combinados (prioridad: datos_proceso > prospecto)
              datos_proceso: datosProceso,
              datos_llamada: datosLlamada,
              // Discovery familiar: de calificaciones (análisis IA) o datos_proceso
              composicion_familiar_numero: datosProceso?.numero_personas || prospecto?.tamano_grupo || null,
              // Destino preferencia: de datos_proceso o prospecto
              destino_preferencia: datosProceso?.destino_preferencia || prospecto?.destino_preferencia || null,
              // Estado civil: de datos_proceso o prospecto
              estado_civil: datosProceso?.estado_civil || prospecto?.estado_civil || null,
              // Mes preferencia: de datos_proceso
              mes_preferencia: datosProceso?.mes_preferencia || null,
              // Tipo de vacaciones: de datos_proceso (descanso, entretenimiento, mixto)
              tipo_vacaciones: datosProceso?.tipo_vacaciones || datosProceso?.preferencia_vacaciones || null,
              // Tamaño grupo y otros del prospecto
              tamano_grupo: prospecto?.tamano_grupo || null,
              cantidad_menores: prospecto?.cantidad_menores || null,
              viaja_con: prospecto?.viaja_con || null,
              // Todos los datos del prospecto para el modal
              prospecto_completo: prospecto,
              // Requiere atención humana del prospecto
              requiere_atencion_humana: prospecto?.requiere_atencion_humana || false,
              // IDs de asignación del prospecto
              ejecutivo_id: prospecto?.ejecutivo_id || null,
              coordinacion_id: prospecto?.coordinacion_id || null,
              // Estado de llamada corregido
              call_status: callStatus,
              // Análisis completo para el modal
              analysis: analysis,
            };
          }).filter((item): item is NonNullable<typeof item> => item !== null);
        } else {
          // Si no hay prospectos permitidos, no mostrar nada (seguridad)
          // Esto asegura que ejecutivos y coordinadores solo vean lo que tienen asignado
          enrichedData = [];
        }
      } else {
        // Si no hay llamadas, usar solo los análisis disponibles
        enrichedData = combinedAnalysisData.filter((item: any) => item !== null);
      }

      // Ordenar por defecto: más reciente primero
      enrichedData.sort((a, b) => {
        const dateA = new Date(a.created_at || a.fecha_llamada || 0);
        const dateB = new Date(b.created_at || b.fecha_llamada || 0);
        return dateB.getTime() - dateA.getTime();
      });

      // Verificar si hay más datos disponibles
      // IMPORTANTE: Usar allLlamadasData.length (datos crudos) en lugar de enrichedData.length (después de filtros)
      const rawLoadedCount = allLlamadasData?.length || 0;
      const enrichedCount = enrichedData.length;
      
      // Log solo en desarrollo y solo para batches importantes
      
      let finalData: any[];
      
      if (reset || pageToLoad === 0) {
        // Reset: reemplazar todos los datos
        setAllHistoryCallsLoaded(enrichedData);
        currentPageHistoryRef.current = 1; // Actualizar ref
        finalData = enrichedData; // Usar enrichedData para actualizar allCallsWithAnalysis
        
        // Verificar si hay más datos usando rawLoadedCount
        // NOTA: No usamos totalHistoryCount porque ese conteo no aplica filtros de permisos
        setHasMoreHistory(rawLoadedCount === HISTORY_BATCH_SIZE);
        
        // NO actualizar totalHistoryCount aquí - ya se seteo en reset con el COUNT total
        
        hasInitialLoadRef.current = true;
      } else {
        // Agregar a los existentes usando forma funcional de setState
        // CRÍTICO: Usar setState funcional para evitar problemas de closure stale
        let updatedData: any[] = [];
        setAllHistoryCallsLoaded(prev => {
          updatedData = [...prev, ...enrichedData];
          return updatedData;
        });
        
        currentPageHistoryRef.current = currentPageHistoryRef.current + 1; // Actualizar ref
        finalData = updatedData; // Usar updatedData para actualizar allCallsWithAnalysis
        
        // CRÍTICO: Si no se cargaron datos nuevos (0 llamadas), no hay más
        if (rawLoadedCount === 0 || enrichedCount === 0) {
          setHasMoreHistory(false);
          // NO actualizar totalHistoryCount - mantener el COUNT total
        } else {
          // Verificar si se cargaron menos que el batch size (significa que no hay más)
          const hasMore = rawLoadedCount === HISTORY_BATCH_SIZE;
          setHasMoreHistory(hasMore);
          // NO actualizar totalHistoryCount - mantener el COUNT total
          // Log solo cada 2 batches para evitar spam
        }
      }

      // OPTIMIZACIÓN: Solo actualizar allCallsWithAnalysis en reset, NO en cargas incrementales
      // Esto evita rerenders completos al cargar más datos
      if ((reset || pageToLoad === 0) && !isModalOpenRef.current) {
        // Solo actualizar en reset inicial
        React.startTransition(() => {
          setAllCallsWithAnalysis(finalData);
          setAllCalls(finalData);
        });
      }
      // Para cargas incrementales, los datos ya están en allHistoryCallsLoaded
      // y se aplicarán filtros automáticamente sin rerender completo
      
      // Diferir procesamiento pesado usando requestIdleCallback
      const processHeavyData = () => {
        // Extraer valores únicos para filtros solo de los nuevos datos
        const newInterests = [...new Set(enrichedData.map(c => c.nivel_interes_detectado || c.nivel_interes).filter(Boolean))];
        
        // Actualizar solo si hay cambios (merge con existentes)
        setUniqueInterests(prev => {
          const combined = [...new Set([...prev, ...newInterests])];
          return combined.length !== prev.length ? combined : prev;
        });
        
        // Actualizar grupos solo en reset (muy pesado, evitar en cargas incrementales)
        if (reset || pageToLoad === 0) {
          const groups = groupCallsByProspect(finalData);
          setGroupedCalls(groups);
        }
      };
      
      // Usar requestIdleCallback si está disponible, sino setTimeout con delay mayor
      if ('requestIdleCallback' in window) {
        requestIdleCallback(processHeavyData, { timeout: 2000 });
      } else {
        setTimeout(processHeavyData, 500);
      }
      
    } catch (error: any) {
      console.error('Error loading history calls:', error);
      setAllCallsWithAnalysis([]);
      setAllCalls([]);
      setAllHistoryCallsLoaded([]);
    } finally {
      setLoading(false);
      setLoadingMoreHistory(false);
      isLoadingHistoryRef.current = false;
      // Log solo en desarrollo - usar currentPageHistoryRef que siempre está disponible
      const currentPage = currentPageHistoryRef.current;
    }
  }, [user?.id, hasMoreHistory]); // Incluir hasMoreHistory para que se actualice cuando cambie

  // Función para aplicar filtros al historial
  // Función para agrupar llamadas por prospecto
  const groupCallsByProspect = (callsToGroup: any[]) => {
    const groups: Record<string, any[]> = {};
    
    callsToGroup.forEach(call => {
      const prospectKey = call.prospecto_nombre || call.nombre_completo || call.prospecto_id || 'Sin prospecto';
      
      if (!groups[prospectKey]) {
        groups[prospectKey] = [];
      }
      groups[prospectKey].push(call);
    });
    
    // Ordenar llamadas dentro de cada grupo (más reciente primero)
    Object.keys(groups).forEach(prospectKey => {
      groups[prospectKey].sort((a, b) => {
        const dateA = new Date(a.created_at || a.fecha_llamada || 0);
        const dateB = new Date(b.created_at || b.fecha_llamada || 0);
        return dateB.getTime() - dateA.getTime();
      });
    });
    
    setGroupedCalls(groups);
    return groups;
  };

  // Función para obtener llamadas expandidas para mostrar en el grid
  const getExpandedCalls = (groups: Record<string, any[]>) => {
    const expandedCalls: any[] = [];
    
    Object.entries(groups).forEach(([prospectKey, callsInGroup]) => {
      if (callsInGroup.length === 0) return;
      
      // Siempre mostrar la llamada más reciente (primera en el array ordenado)
      const mainCall = { ...callsInGroup[0], isGroupMain: true, groupSize: callsInGroup.length, prospectKey };
      expandedCalls.push(mainCall);
      
      // Si el grupo está expandido, mostrar el resto de llamadas
      if (expandedGroup === prospectKey) {
        callsInGroup.slice(1).forEach(call => {
          const subCall = { ...call, isGroupSub: true, groupSize: callsInGroup.length, prospectKey };
          expandedCalls.push(subCall);
        });
      }
    });
    
    return expandedCalls;
  };

  // Función para toggle de grupos - solo un grupo expandido a la vez
  const toggleGroup = (prospectKey: string) => {
    setExpandedGroup(prev => {
      // Si el grupo ya está expandido, colapsarlo
      if (prev === prospectKey) {
        return null;
      }
      // Si hay otro grupo expandido, colapsarlo y expandir el nuevo
      return prospectKey;
    });
  };

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const applyHistoryFilters = useCallback(() => {
    // OPTIMIZACIÓN: NUNCA vaciar filteredHistoryCalls durante cargas
    // Si no hay datos cargados O está cargando más, mantener datos actuales
    if (allHistoryCallsLoaded.length === 0) {
      return; // No limpiar si no hay datos
    }
    
    // Si está cargando más Y ya hay datos filtrados, NO aplicar filtros aún
    // Esperar a que termine de cargar para evitar que la tabla se vacíe
    if (loadingMoreHistory && filteredHistoryCalls.length > 0) {
      return; // Mantener datos actuales visibles
    }
    
    let filtered = [...allHistoryCallsLoaded];

    // Búsqueda mejorada por texto (ejecutivo, coordinación, nombre, estado, interés, fecha)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(call => {
        const prospecto = call.prospecto_completo || {};
        const ejecutivoId = prospecto.ejecutivo_id || call.ejecutivo_id;
        const coordinacionId = prospecto.coordinacion_id || call.coordinacion_id;
        const ejecutivo = ejecutivoId ? ejecutivosMap[ejecutivoId] : null;
        const coordinacion = coordinacionId ? coordinacionesMap[coordinacionId] : null;
        const ejecutivoNombre = ejecutivo?.full_name || ejecutivo?.nombre_completo || ejecutivo?.nombre || '';
        const coordinacionNombre = coordinacion?.nombre || coordinacion?.codigo || '';
        const nombreCompleto = call.nombre_completo || call.nombre_whatsapp || call.prospecto_nombre || '';
        const estado = call.call_status || '';
        const interes = call.nivel_interes_detectado || call.nivel_interes || '';
        const fecha = call.fecha_llamada ? new Date(call.fecha_llamada).toLocaleDateString('es-MX') : '';
        const fechaFormato2 = call.fecha_llamada ? new Date(call.fecha_llamada).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
        const fechaFormato3 = call.fecha_llamada ? new Date(call.fecha_llamada).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
        
        return (
          call.call_id?.toLowerCase().includes(query) ||
          nombreCompleto.toLowerCase().includes(query) ||
          call.whatsapp?.toLowerCase().includes(query) ||
          ejecutivoNombre.toLowerCase().includes(query) ||
          coordinacionNombre.toLowerCase().includes(query) ||
          estado.toLowerCase().includes(query) ||
          interes.toLowerCase().includes(query) ||
          fecha.toLowerCase().includes(query) ||
          fechaFormato2.toLowerCase().includes(query) ||
          fechaFormato3.toLowerCase().includes(query)
        );
      });
    }

    // Filtros de fecha
    if (dateFrom) {
      filtered = filtered.filter(call => 
        (call.fecha_llamada || call.created_at) && new Date(call.fecha_llamada || call.created_at) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      filtered = filtered.filter(call => 
        (call.fecha_llamada || call.created_at) && new Date(call.fecha_llamada || call.created_at) <= new Date(dateTo)
      );
    }

    // Filtro por ejecutivo asignado
    if (ejecutivoFilter) {
      filtered = filtered.filter(call => {
        const prospecto = call.prospecto_completo || {};
        const ejecutivoId = prospecto.ejecutivo_id || call.ejecutivo_id;
        return ejecutivoId === ejecutivoFilter;
      });
    }

    // Filtro por interés
    if (interestFilter) {
      filtered = filtered.filter(call => 
        (call.nivel_interes_detectado || call.nivel_interes) === interestFilter
      );
    }

    // Filtro por estado (usa clasificador centralizado)
    if (statusFilter) {
      filtered = filtered.filter(call => {
        const status = call.call_status || 'perdida';
        // Mapear estados legacy a nuevos estados
        if (statusFilter === 'contestada_no_transferida') {
          return status === 'atendida' || status === 'contestada_no_transferida';
        }
        return status === statusFilter;
      });
    }

    // Filtros rápidos por tags
    if (quickFilters.destino && quickFilters.destino.length > 0) {
      filtered = filtered.filter(call => {
        const prospecto = call.prospecto_completo || {};
        const datosProceso = call.datos_proceso || {};
        const destino = datosProceso?.destino_preferencia || prospecto.destino_preferencia;
        const destinoStr = Array.isArray(destino) ? destino[0] : destino;
        return destinoStr?.toLowerCase().includes(quickFilters.destino!.toLowerCase());
      });
    }

    if (quickFilters.estadoCivil) {
      filtered = filtered.filter(call => {
        const prospecto = call.prospecto_completo || {};
        const datosProceso = call.datos_proceso || {};
        const estadoCivil = datosProceso?.estado_civil || prospecto.estado_civil;
        return estadoCivil === quickFilters.estadoCivil;
      });
    }

    if (quickFilters.interes) {
      filtered = filtered.filter(call => 
        (call.nivel_interes_detectado || call.nivel_interes) === quickFilters.interes
      );
    }

    if (quickFilters.perdida) {
      // Incluir perdida, no_contestada y buzon como "no exitosas"
      filtered = filtered.filter(call => 
        call.call_status === 'perdida' || 
        call.call_status === 'no_contestada' || 
        call.call_status === 'buzon'
      );
    }

    if (quickFilters.noTransferida) {
      // Atendidas sin transferencia (legacy: contestada_no_transferida)
      filtered = filtered.filter(call => 
        call.call_status === 'atendida' || 
        call.call_status === 'contestada_no_transferida'
      );
    }

    if (quickFilters.transferida) {
      filtered = filtered.filter(call => call.call_status === 'transferida');
    }

    // Aplicar ordenamiento
    filtered.sort((a, b) => {
      const aValue = a[historySortField as keyof typeof a];
      const bValue = b[historySortField as keyof typeof b];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (historySortField === 'created_at' || historySortField === 'fecha_llamada') {
        const dateA = new Date(aValue as string);
        const dateB = new Date(bValue as string);
        return historySortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return historySortDirection === 'asc' ? 
          aValue.localeCompare(bValue) : 
          bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return historySortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    // FIX 2: Deshabilitar agrupamiento por prospecto - Mostrar TODAS las llamadas
    // Agrupar solo para estadísticas, pero NO para filtrar la vista
    const groups = groupCallsByProspect(filtered);
    // Ya NO usar getExpandedCalls que solo muestra 1 llamada por prospecto
    // Mostrar todas las llamadas filtradas directamente
    
    // OPTIMIZACIÓN: Actualizar inmediatamente sin RAF para evitar frames extras
    setFilteredHistoryCalls(filtered); // Usar 'filtered' en lugar de 'expandedCalls'
  }, [allHistoryCallsLoaded, debouncedSearchQuery, dateFrom, dateTo, interestFilter, statusFilter, ejecutivoFilter, quickFilters, historySortField, historySortDirection, expandedGroup, ejecutivosMap, coordinacionesMap]);

  // Infinite scroll: cargar más cuando se hace scroll cerca del final (75%)
  // Usar el mismo enfoque que ProspectosManager para consistencia
  useEffect(() => {
    if (selectedTab !== 'all' || !hasMoreHistory || loadingMoreHistory || isLoadingHistoryRef.current) {
      return;
    }

    const scrollContainer = historyScrollContainerRef.current;
    if (!scrollContainer) {
      return;
    }

    let lastScrollCheck = 0;
    let scrollCheckTimeout: NodeJS.Timeout | null = null;

    // Función para verificar si debemos cargar más (igual que ProspectosManager)
    const checkShouldLoad = () => {
      if (loadingMoreHistory || isLoadingHistoryRef.current || !hasMoreHistory) {
        return;
      }

      const containerHeight = scrollContainer.clientHeight;
      const scrollTop = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight;
      
      // Calcular porcentaje de scroll (0 = inicio, 100 = final)
      const scrollPercentage = ((scrollTop + containerHeight) / scrollHeight) * 100;
      
      // Solo loggear cada 10% para evitar spam
      const roundedPercentage = Math.floor(scrollPercentage / 10) * 10;
      if (roundedPercentage !== lastScrollCheck && roundedPercentage % 25 === 0) {
        lastScrollCheck = roundedPercentage;
      }
      
      // OPTIMIZACIÓN UX: Cargar al 75% del scroll (25% antes del final)
      // Esto hace la experiencia más suave y fluida
      if (scrollPercentage >= 75 && hasMoreHistory && !loadingMoreHistory && !isLoadingHistoryRef.current) {
        loadHistoryCalls(false);
        return;
      }
      
      // Si no hay suficiente scroll Y hay más datos, cargar automáticamente
      // Aumentar límite a 1000 para permitir más cargas automáticas
      if (scrollHeight <= containerHeight + 50 && hasMoreHistory && !loadingMoreHistory && !isLoadingHistoryRef.current && allHistoryCallsLoaded.length < 1000) {
        loadHistoryCalls(false);
        return;
      }
    };

    // Escuchar eventos de scroll con throttling
    const handleScroll = () => {
      if (scrollCheckTimeout) {
        clearTimeout(scrollCheckTimeout);
      }
      scrollCheckTimeout = setTimeout(() => {
        checkShouldLoad();
      }, 150); // Throttle de 150ms
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    // También verificar inmediatamente por si el contenido es pequeño
    const initialCheck = setTimeout(() => {
      checkShouldLoad();
    }, 800);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollCheckTimeout) clearTimeout(scrollCheckTimeout);
      clearTimeout(initialCheck);
    };
  }, [selectedTab, hasMoreHistory, loadingMoreHistory, filteredHistoryCalls.length, allHistoryCallsLoaded.length, loadHistoryCalls]);

  // Actualizar ref cuando cambia el estado del modal
  useEffect(() => {
    isModalOpenRef.current = showAnalysisDetailModal;
  }, [showAnalysisDetailModal]);

  // FIX 1: Cargar contador total al montar el componente (sin cargar todas las llamadas)
  // NOTA: El conteo total ahora se calcula después de aplicar filtros de permisos
  // El useEffect anterior que contaba todas las llamadas sin filtros fue removido
  // porque mostraba un total incorrecto para usuarios con permisos restringidos
  
  // Cargar historial cuando se cambia a la pestaña de historial (solo una vez)
  useEffect(() => {
    if (selectedTab === 'all' && user?.id && !hasInitialLoadRef.current) {
      hasInitialLoadRef.current = true;
      loadHistoryCalls(true); // Reset al cambiar a historial
    }
  }, [selectedTab, user?.id, loadHistoryCalls]);
  
  // Resetear hasInitialLoadRef cuando se cambia de tab
  useEffect(() => {
    if (selectedTab !== 'all') {
      hasInitialLoadRef.current = false;
    }
  }, [selectedTab]);

  // ============================================
  // COUNT TOTAL DEL HISTORIAL (INDEPENDIENTE DE LA PESTAÑA)
  // ============================================
  // Este useEffect obtiene el total de llamadas según los permisos del usuario
  // Se ejecuta al montar el componente, independientemente de la pestaña activa
  useEffect(() => {
    const fetchTotalHistoryCount = async () => {
      if (!user?.id || !analysisSupabase) {
        setTotalHistoryCount(0);
        return;
      }

      try {
        // Obtener permisos del usuario
        const permissions = await permissionsService.getUserPermissions(user.id);
        
        // Administrador Operativo NO puede ver historial
        if (permissions?.role === 'administrador_operativo') {
          setTotalHistoryCount(0);
          return;
        }
        
        const isAdminUser = permissions?.role === 'admin';
        
        if (isAdminUser) {
          // Admin ve todas las llamadas
          const { count, error } = await analysisSupabase
            .from('llamadas_ventas')
            .select('*', { count: 'exact', head: true });
          
          if (!error) {
            setTotalHistoryCount(count || 0);
          }
        } else {
          // Obtener filtros según rol
          const ejecutivoFilterId = await permissionsService.getEjecutivoFilter(user.id);
          const coordinacionesFilterIds = await permissionsService.getCoordinacionesFilter(user.id);
          const esCoordinadorCalidad = await permissionsService.isCoordinadorCalidad(user.id);
          
          // Coordinador de Calidad ve todas las llamadas (como admin)
          if (esCoordinadorCalidad) {
            const { count, error } = await analysisSupabase
              .from('llamadas_ventas')
              .select('*', { count: 'exact', head: true });
            
            if (!error) {
              setTotalHistoryCount(count || 0);
            }
            return;
          }
          
          // Si es ejecutivo, contar llamadas de sus prospectos (incluyendo backups)
          if (ejecutivoFilterId) {
            // Obtener IDs de ejecutivos donde este ejecutivo es backup
            const ejecutivosIds = [ejecutivoFilterId];
            
            if (supabaseSystemUI) {
              const { data: ejecutivosConBackup } = await supabaseSystemUI
                .from('auth_users')
                .select('id')
                .eq('backup_id', ejecutivoFilterId)
                .eq('has_backup', true);
              
              if (ejecutivosConBackup && ejecutivosConBackup.length > 0) {
                ejecutivosIds.push(...ejecutivosConBackup.map(e => e.id));
              }
            }
            
            // Primero obtener los prospectos del ejecutivo
            const { data: prospectos } = await analysisSupabase
              .from('prospectos')
              .select('id')
              .in('ejecutivo_id', ejecutivosIds);
            
            if (prospectos && prospectos.length > 0) {
              const prospectoIds = prospectos.map(p => p.id);
              
              // Contar llamadas de esos prospectos
              const { count, error } = await analysisSupabase
                .from('llamadas_ventas')
                .select('*', { count: 'exact', head: true })
                .in('prospecto', prospectoIds);
              
              if (!error) {
                setTotalHistoryCount(count || 0);
              }
            } else {
              setTotalHistoryCount(0);
            }
          } else if (coordinacionesFilterIds && coordinacionesFilterIds.length > 0) {
            // Coordinador: contar llamadas de prospectos en sus coordinaciones
            const { data: prospectos } = await analysisSupabase
              .from('prospectos')
              .select('id')
              .in('coordinacion_id', coordinacionesFilterIds);
            
            if (prospectos && prospectos.length > 0) {
              const prospectoIds = prospectos.map(p => p.id);
              
              const { count, error } = await analysisSupabase
                .from('llamadas_ventas')
                .select('*', { count: 'exact', head: true })
                .in('prospecto', prospectoIds);
              
              if (!error) {
                setTotalHistoryCount(count || 0);
              }
            } else {
              setTotalHistoryCount(0);
            }
          } else {
            setTotalHistoryCount(0);
          }
        }
      } catch (error) {
        console.error('Error calculando total de historial:', error);
        setTotalHistoryCount(0);
      }
    };

    fetchTotalHistoryCount();
  }, [user?.id]);

  // OPTIMIZACIÓN: Aplicar filtros solo cuando cambia allHistoryCallsLoaded
  // PERO SOLO si NO está cargando más (evita vaciar la tabla)
  // Usar un pequeño delay para asegurar que el estado se actualizó completamente
  useEffect(() => {
    if (selectedTab === 'all' && allHistoryCallsLoaded.length > 0 && !loadingMoreHistory) {
      // Delay mínimo para asegurar que el estado se sincronizó
      const timeoutId = setTimeout(() => {
        applyHistoryFilters();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedTab, allHistoryCallsLoaded.length, loadingMoreHistory, applyHistoryFilters]);

  // Aplicar filtros cuando cambien valores de filtrado
  // OPTIMIZACIÓN: NO aplicar durante cargas incrementales
  useEffect(() => {
    if (selectedTab === 'all' && !loadingMoreHistory) {
      applyHistoryFilters();
    }
  }, [selectedTab, debouncedSearchQuery, dateFrom, dateTo, interestFilter, statusFilter, ejecutivoFilter, quickFilters, historySortField, historySortDirection, loadingMoreHistory, applyHistoryFilters]);

  // Extraer valores únicos para filtros cuando cambie allCallsWithAnalysis (con diferimiento)
  // Usar ref para comparar y evitar procesamiento innecesario
  const previousCallsRef = useRef<string>('');
  useEffect(() => {
    if (allCallsWithAnalysis.length > 0) {
      // Crear hash de los call_ids para comparar si realmente cambió el contenido
      const callsHash = JSON.stringify(allCallsWithAnalysis.map(c => c.call_id).sort());
      
      // Solo procesar si realmente cambió el contenido
      if (previousCallsRef.current !== callsHash) {
        previousCallsRef.current = callsHash;
        
        // Diferir procesamiento pesado usando requestIdleCallback
        const processUniqueValues = () => {
          React.startTransition(() => {
            const interests = [...new Set(allCallsWithAnalysis.map(c => c.nivel_interes_detectado || c.nivel_interes).filter(Boolean))];
            
            // Solo actualizar si realmente cambió
            setUniqueInterests(prev => {
              const prevString = JSON.stringify(prev.sort());
              const newString = JSON.stringify(interests.sort());
              return prevString !== newString ? interests as string[] : prev;
            });
            
            // Extraer ejecutivos únicos
            const ejecutivosSet = new Set<string>();
            allCallsWithAnalysis.forEach(call => {
              const prospecto = call.prospecto_completo || {};
              const ejecutivoId = prospecto.ejecutivo_id || call.ejecutivo_id;
              if (ejecutivoId) {
                ejecutivosSet.add(ejecutivoId);
              }
            });
            
            // Cargar nombres de ejecutivos
            const ejecutivosList: Array<{id: string, name: string}> = [];
            ejecutivosSet.forEach((ejecId) => {
              if (ejecutivosMap[ejecId]) {
                const ejecutivo = ejecutivosMap[ejecId];
                ejecutivosList.push({
                  id: ejecId,
                  name: ejecutivo.full_name || ejecutivo.nombre_completo || ejecutivo.nombre || 'Sin nombre'
                });
              }
            });
            
            // Ordenar por nombre
            ejecutivosList.sort((a, b) => a.name.localeCompare(b.name));
            
            // Solo actualizar si realmente cambió
            setUniqueEjecutivos(prev => {
              const prevString = JSON.stringify(prev.map(e => e.id).sort());
              const newString = JSON.stringify(ejecutivosList.map(e => e.id).sort());
              return prevString !== newString ? ejecutivosList : prev;
            });
          });
        };
        
        if ('requestIdleCallback' in window) {
          requestIdleCallback(processUniqueValues, { timeout: 1000 });
        } else {
          setTimeout(processUniqueValues, 0);
        }
      }
    }
  }, [allCallsWithAnalysis, ejecutivosMap]);

  // Cerrar date picker al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  // Función para limpiar filtros
  const clearHistoryFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setInterestFilter('');
    setStatusFilter('');
    setEjecutivoFilter('');
    setQuickFilters({});
    setShowDatePicker(false);
  };

  const toggleQuickFilter = (type: 'destino' | 'estadoCivil' | 'interes' | 'perdida' | 'noTransferida' | 'transferida', value?: string) => {
    setQuickFilters(prev => {
      const newFilters = { ...prev };
      if (type === 'perdida' || type === 'noTransferida' || type === 'transferida') {
        if (newFilters[type]) {
          delete newFilters[type];
        } else {
          // Desactivar otros filtros de estado
          delete newFilters.perdida;
          delete newFilters.noTransferida;
          delete newFilters.transferida;
          newFilters[type] = true;
        }
      } else {
        if (newFilters[type] === value) {
          delete newFilters[type];
        } else {
          newFilters[type] = value;
        }
      }
      return newFilters;
    });
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
  const [selectedPresetReason, setSelectedPresetReason] = useState<string>('');
  const [customTransferMessage, setCustomTransferMessage] = useState('');
  const [showParaphraseModal, setShowParaphraseModal] = useState(false);
  const [loadingCustomMessage, setLoadingCustomMessage] = useState(false);
  const [customMessageError, setCustomMessageError] = useState<string | null>(null);
  const [autoGeneratedMessage, setAutoGeneratedMessage] = useState<string | null>(null);
  
  // Estados para modal de finalización de llamadas
  const [showFinalizationModal, setShowFinalizationModal] = useState(false);
  const [callToFinalize, setCallToFinalize] = useState<KanbanCall | null>(null);
  const [finalizationLoading, setFinalizationLoading] = useState(false);
  // finishedCalls eliminado - ahora usamos attendedCalls
  
  // Estado para mostrar indicador de actualización
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
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
      if (USE_OPTIMIZED_VIEW) {
        // TODO: Implementar saveFeedback en servicio optimizado
      } else {
        await liveMonitorService.saveFeedback(feedbackData);
      }
      
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
      alert('Error al guardar el feedback. Intenta nuevamente.');
    }
  };

  const handleFeedbackRequest = (resultado: 'contestada' | 'perdida') => {
    setGlobalFeedbackType(resultado);
    setShowGlobalFeedbackModal(true);
    setGlobalFeedbackComment('');
  };

  // Función para manejar finalización de llamadas desde DataGrid
  const handleCallFinalization = async (type: 'perdida' | 'finalizada' | 'mas-tarde') => {
    if (!callToFinalize) return;

    setFinalizationLoading(true);

    try {
      if (type === 'mas-tarde') {
        // Solo cerrar el modal, no hacer cambios
        setShowFinalizationModal(false);
        setCallToFinalize(null);
        return;
      }

      // Actualizar el estado de la llamada en la base de datos
      const statusToUpdate = type === 'finalizada' ? 'finalizada' : 'perdida';
      
      await analysisSupabase
        .from('llamadas_ventas')
        .update({ 
          call_status: statusToUpdate,
          feedback_resultado: type,
          feedback_comentarios: type === 'finalizada' ? 'Llamada finalizada exitosamente' : 'Llamada marcada como perdida',
          tiene_feedback: true,
          ended_at: new Date().toISOString()
        })
        .eq('call_id', callToFinalize.call_id);

      // Mover la llamada a la lista de finalizadas
      // La llamada se reclasificará automáticamente en la próxima carga
      
      // Removerla de las listas activas
      setActiveCalls(prev => prev.filter(c => c.id !== callToFinalize.id));

      // Cerrar el modal
      setShowFinalizationModal(false);
      setCallToFinalize(null);

      // Recargar las llamadas para mantener sincronización
      await loadCalls(true, true);
      
    } catch (error) {
      alert('Error al finalizar la llamada. Intenta nuevamente.');
    } finally {
      setFinalizationLoading(false);
    }
  };

  // Función para abrir el modal de finalización
  const openFinalizationModal = (call: KanbanCall) => {
    setCallToFinalize(call);
    setShowFinalizationModal(true);
  };

  // Mensajes predefinidos para transferencia - Conceptos resumidos y textos completos
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
      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}:</span>
        <span className="text-xs font-medium text-gray-900 dark:text-white text-right">
          {displayValue}
        </span>
      </div>
    );
  };

  // Función para solicitar mensaje personalizado del webhook
  const handleRequestCustomMessage = async (prospectId: string): Promise<string | null> => {
    if (!prospectId) {
      setCustomMessageError('No se encontró ID del prospecto para generar mensaje.');
      return null;
    }

    setLoadingCustomMessage(true);
    setCustomMessageError(null);
    setAutoGeneratedMessage(null);

    try {
      const response = await fetch('https://primary-dev-d75a.up.railway.app/webhook/transfer_request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: prospectId })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => `Error ${response.status}: ${response.statusText}`);
        setCustomMessageError(`Error al generar mensaje: ${response.status} - ${errorText.substring(0, 100)}`);
        setLoadingCustomMessage(false);
        return null;
      }

      const responseData = await response.json();
      const personalizedMessage = responseData.message || responseData.transfer_message || responseData.text;

      if (!personalizedMessage || typeof personalizedMessage !== 'string') {
        setCustomMessageError('El webhook no devolvió un mensaje válido. Formato esperado: { "message": "texto" }');
        setLoadingCustomMessage(false);
        return null;
      }
      
      setAutoGeneratedMessage(personalizedMessage);
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
    if (!selectedCall?.prospecto_id) {
      alert('No se encontró ID del prospecto');
      return;
    }

    // Abrir el modal primero
    setShowTransferModal(true);
    setSelectedPresetReason('');
    setCustomTransferMessage('');
    setCustomTransferText('');
    setAutoGeneratedMessage(null);
    setCustomMessageError(null);

    // Cargar mensaje automáticamente en segundo plano y seleccionarlo por defecto
    const message = await handleRequestCustomMessage(selectedCall.prospecto_id);
    if (message) {
      setAutoGeneratedMessage(message);
      setCustomTransferMessage(message); // Seleccionar automáticamente el mensaje generado
      setCustomTransferText(message);
    }
  };

  // Función para transferir llamada a través de webhook de Railway
  const handleTransferCall = async (reason: string) => {
    // Usar llamada del widget si no hay selectedCall (viene del Panel Lateral)
    const callToTransfer = selectedCall || widgetTransferCallRef.current;
    
    if (!callToTransfer?.call_id) {
      alert('No se encontró ID de llamada');
      return;
    }

    setTransferLoading(true);
    
    try {
      // Extraer contexto adicional de datos_llamada y datos_proceso
      let contextData = {};
      try {
        if (callToTransfer.datos_llamada) {
          const datosLlamada = typeof callToTransfer.datos_llamada === 'string' 
            ? JSON.parse(callToTransfer.datos_llamada) 
            : callToTransfer.datos_llamada;
          contextData = { ...contextData, ...datosLlamada };
        }
        
        if (callToTransfer.datos_proceso) {
          const datosProc = typeof callToTransfer.datos_proceso === 'string' 
            ? JSON.parse(callToTransfer.datos_proceso) 
            : callToTransfer.datos_proceso;
          contextData = { ...contextData, datos_proceso: datosProc };
        }
      } catch (e) {
        // No se pudo extraer contexto adicional
      }

      // Usar el texto proporcionado directamente (ya viene validado si es personalizado)
      const finalMessage = reason;

      // Verificar que control_url esté disponible, si no, intentar obtenerlo de la BD
      let controlUrl = callToTransfer.control_url;
      
      if (!controlUrl) {
        try {
          const { data: callData, error } = await analysisSupabase
            .from('llamadas_ventas')
            .select('control_url')
            .eq('call_id', callToTransfer.call_id)
            .single();
          
          if (error || !callData?.control_url) {
            alert('Error: No se encontró la URL de control de la llamada. La llamada puede haber finalizado.');
            setTransferLoading(false);
            return;
          }
          
          controlUrl = callData.control_url;
          
          // Actualizar ref si viene del widget, o selectedCall si viene del modal
          if (widgetTransferCallRef.current?.call_id === callToTransfer.call_id) {
            widgetTransferCallRef.current = { ...widgetTransferCallRef.current, control_url: controlUrl };
          } else {
            setSelectedCall(prev => prev ? { ...prev, control_url: controlUrl } : null);
          }
        } catch (err) {
          alert('Error: No se pudo obtener la URL de control de la llamada. La llamada puede haber finalizado.');
          setTransferLoading(false);
          return;
        }
      }

      const transferData = {
        action: "transfer",
        call_id: callToTransfer.call_id,
        control_url: controlUrl,
        message: finalMessage,
        destination: {
          number: "+523222264000",
          extension: "60973"
        },
        // Contexto completo de la llamada
        call_context: {
          // Datos básicos de la llamada
          fecha_llamada: callToTransfer.fecha_llamada,
          duracion_segundos: callToTransfer.duracion_segundos,
          call_status: callToTransfer.call_status,
          nivel_interes: callToTransfer.nivel_interes,
          tipo_llamada: callToTransfer.tipo_llamada,
          precio_ofertado: callToTransfer.precio_ofertado,
          costo_total: callToTransfer.costo_total,
          
          // Información del prospecto
          prospecto_id: callToTransfer.prospecto_id,
          nombre_completo: callToTransfer.nombre_completo,
          nombre_whatsapp: callToTransfer.nombre_whatsapp,
          whatsapp: callToTransfer.whatsapp,
          email: callToTransfer.email,
          ciudad_residencia: callToTransfer.ciudad_residencia,
          estado_civil: callToTransfer.estado_civil,
          edad: callToTransfer.edad,
          
          // Información de viaje actualizada
          checkpoint_venta_actual: callToTransfer.checkpoint_venta_actual,
          composicion_familiar_numero: callToTransfer.composicion_familiar_numero,
          destino_preferido: callToTransfer.destino_preferido,
          preferencia_vacaciones: callToTransfer.preferencia_vacaciones,
          numero_noches: callToTransfer.numero_noches,
          mes_preferencia: callToTransfer.mes_preferencia,
          propuesta_economica_ofrecida: callToTransfer.propuesta_economica_ofrecida,
          habitacion_ofertada: callToTransfer.habitacion_ofertada,
          resort_ofertado: callToTransfer.resort_ofertado,
          principales_objeciones: callToTransfer.principales_objeciones,
          resumen_llamada: callToTransfer.resumen_llamada,
          
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
        // Intentar leer la respuesta como JSON, si falla leer como texto
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
        // Reset estados después de transferir exitosamente
        setSelectedPresetReason('');
        setCustomTransferMessage('');
        setCustomTransferText('');
        setTransferReason('');
        setUseCustomText(false);
        
        // Limpiar ref del widget si se usó
        if (widgetTransferCallRef.current?.call_id === callToTransfer.call_id) {
          widgetTransferCallRef.current = null;
        }
        
        // Actualizar estado en BD (sin abrir modal de feedback)
        if (!USE_OPTIMIZED_VIEW) {
          try {
            await liveMonitorService.updateCallStatus(callToTransfer.call_id, 'transferida');
          } catch (updateError) {
            // No bloquear el flujo si falla la actualización del estado
          }
        }
        await loadCalls(true, true); // preserveRealtimeData=true
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
        // No se pudo extraer contexto adicional
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
        if (USE_OPTIMIZED_VIEW) {
          // TODO: Implementar updateCallStatus en servicio optimizado  
        } else {
          await liveMonitorService.updateCallStatus(selectedCall.call_id, 'colgada');
        }
        await loadCalls(true, true); // preserveRealtimeData=true
      } else {
        alert('Error al colgar la llamada');
      }
    } catch (error) {
      alert('Error al colgar la llamada');
    } finally {
      setHangupLoading(false);
    }
  };

  // Cargar llamadas desde la VISTA OPTIMIZADA
  // Funciones helper para separar llamadas por checkpoint (para DataGrid)
  const getStage5Calls = (calls: KanbanCall[]): KanbanCall[] => {
    return calls.filter(call => 
      call.checkpoint_venta_actual?.toLowerCase().includes('checkpoint #5')
    );
  };

  const getStages1to4Calls = (calls: KanbanCall[]): KanbanCall[] => {
    const calls1to4 = calls.filter(call => {
      const checkpoint = call.checkpoint_venta_actual?.toLowerCase() || '';
      return checkpoint.includes('checkpoint #1') ||
             checkpoint.includes('checkpoint #2') ||
             checkpoint.includes('checkpoint #3') ||
             checkpoint.includes('checkpoint #4');
    });

    // Ordenar de mayor a menor checkpoint (4, 3, 2, 1)
    return calls1to4.sort((a, b) => {
      const getCheckpointNum = (call: KanbanCall) => {
        const match = call.checkpoint_venta_actual?.match(/checkpoint #(\d+)/i);
        return match ? parseInt(match[1]) : 0;
      };
      return getCheckpointNum(b) - getCheckpointNum(a);
    });
  };

  const loadCalls = async (isRefresh = false, preserveRealtimeData = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      } else {
        setIsUpdating(true);
      }
      
      // NUEVA IMPLEMENTACIÓN: Usar servicio optimizado con clasificación automática
      if (USE_OPTIMIZED_VIEW) {
        const classifiedCalls = await liveMonitorKanbanOptimized.getClassifiedCalls();
        
        // Detectar cambios de checkpoint antes de actualizar (solo en refresh)
        if (isRefresh) {
          const allCallsToCheck = [...classifiedCalls.active];
          allCallsToCheck.forEach(call => {
            if (call.checkpoint_venta_actual) {
              const previousCheckpoint = previousCheckpointsRef.current.get(call.call_id);
              const currentCheckpoint = call.checkpoint_venta_actual;
              
              // Detectar cambio a checkpoint #5
              if (currentCheckpoint === 'checkpoint #5' || currentCheckpoint?.includes('checkpoint #5')) {
                if (previousCheckpoint !== 'checkpoint #5' && !previousCheckpoint?.includes('checkpoint #5') && previousCheckpoint) {
                  // Cambió a checkpoint #5 - solo notificación (el Sidebar reproducirá el sonido)
                  triggerCallNotification(call.call_id, currentCheckpoint);
                }
              }
              
              // Actualizar referencia
              previousCheckpointsRef.current.set(call.call_id, currentCheckpoint);
            }
          });
        } else {
          // En carga inicial, solo inicializar checkpoints sin disparar sonido
          const allCallsToCheck = [...classifiedCalls.active];
          allCallsToCheck.forEach(call => {
            if (call.checkpoint_venta_actual) {
              previousCheckpointsRef.current.set(call.call_id, call.checkpoint_venta_actual);
            }
          });
        }
        
        // Actualizar estados directamente desde la clasificación automática
        setActiveCalls(classifiedCalls.active);
        
        if (!isRefresh) {
          setLoading(false);
        } else {
          setIsUpdating(false);
        }
        
        return; // Salir temprano - no necesitamos el procesamiento manual
      }
      
      // CÓDIGO LEGACY: Solo se ejecuta si USE_OPTIMIZED_VIEW = false
      const allCalls = await liveMonitorService.getActiveCalls(user?.id) as KanbanCall[];
      
      // Este código solo se ejecuta en modo LEGACY
      
      // Si preserveRealtimeData=true, mantener datos actualizados por Realtime
      let finalCalls = allCalls;
      if (preserveRealtimeData) {
        // Crear mapa de llamadas existentes con datos de Realtime
        const existingCallsMap = new Map<string, KanbanCall>();
        [...activeCalls].forEach(call => {
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
      
      
      // Función helper para extraer razon_finalizacion
      const getRazonFinalizacion = (call: KanbanCall): string | null => {
        try {
          if (call.datos_llamada && typeof call.datos_llamada === 'object') {
            return call.datos_llamada.razon_finalizacion || null;
          } else if (call.datos_llamada && typeof call.datos_llamada === 'string') {
            const parsed = JSON.parse(call.datos_llamada);
            return parsed.razon_finalizacion || null;
          }
        } catch (e) {
          // Ignorar errores de parsing
        }
        return null;
      };

      // Función helper para determinar si tiene grabación
      const hasRecording = (call: KanbanCall): boolean => {
        return !!(call.audio_ruta_bucket && call.audio_ruta_bucket.length > 0);
      };

      // Razones de finalización que indican transferencia
      const TRANSFER_REASONS = [
        'assistant-forwarded-call',
        'call.ringing.hook-executed-transfer'
      ];

      // Razones de finalización que indican pérdida/no contestada
      const FAILED_REASONS = [
        'customer-did-not-answer',
        'customer-busy',
        'assistant-not-found',
        'assistant-not-valid',
        'assistant-not-provided',
        'assistant-join-timed-out',
        'twilio-failed-to-connect-call',
        'vonage-failed-to-connect-call',
        'vonage-rejected',
        'call.start.error-*',
        'voicemail'
      ];

      // Clasificar llamadas usando el nuevo clasificador de 6 estados
      const active: KanbanCall[] = [];
      
      finalCalls.forEach(call => {
        const hasFeedback = call.tiene_feedback === true;
        
        // Usar el nuevo clasificador para determinar el estado real
        const classifiedStatus = classifyCallStatus({
          call_id: call.call_id,
          call_status: call.call_status,
          fecha_llamada: call.fecha_llamada,
          duracion_segundos: call.duracion_segundos,
          audio_ruta_bucket: call.audio_ruta_bucket,
          monitor_url: call.monitor_url,
          datos_llamada: call.datos_llamada
        });
        
        // Agregar el estado clasificado a la llamada para uso en la UI
        (call as any).call_status_granular = classifiedStatus;
        
        // REGLA: Solo las llamadas clasificadas como 'activa' van al kanban de activas
        if (classifiedStatus === 'activa') {
          active.push(call);
          return;
        }
        
        // Las demás llamadas (transferida, atendida, no_contestada, buzon, perdida)
        // se mantienen en allCalls para el historial cuando tengan feedback
        // No necesitan mostrarse en el kanban de activas
      });
      
      // Actualización inteligente que detecta cambios sin re-render innecesario
      if (isRefresh) {
        // Crear mapas completos de todas las llamadas (activas, transferidas, atendidas, fallidas)
        const currentAllCalls = new Map();
        [...activeCalls].forEach(call => {
          currentAllCalls.set(call.call_id, {
            status: call.call_status,
            checkpoint: call.checkpoint_venta_actual,
            duration: call.duracion_segundos,
            hasFeedback: call.tiene_feedback
          });
        });
        
        const newAllCalls = new Map();
        [...active].forEach(call => {
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
          setLastUpdateTime(new Date());
        }
        
        // Solo actualizar si hay cambios detectados
        if (hasChanges) {
          // Detectar cambios de checkpoint antes de actualizar
          const allCallsToCheck = [...active];
          allCallsToCheck.forEach(call => {
            if (call.checkpoint_venta_actual) {
              const previousCheckpoint = previousCheckpointsRef.current.get(call.call_id);
              const currentCheckpoint = call.checkpoint_venta_actual;
              
              // Detectar cambio a checkpoint #5
              if (currentCheckpoint === 'checkpoint #5' || currentCheckpoint?.includes('checkpoint #5')) {
                if (previousCheckpoint !== 'checkpoint #5' && !previousCheckpoint?.includes('checkpoint #5') && previousCheckpoint) {
                  // Cambió a checkpoint #5 - solo notificación (el Sidebar reproducirá el sonido)
                  triggerCallNotification(call.call_id, currentCheckpoint);
                }
              }
              
              // Actualizar referencia
              previousCheckpointsRef.current.set(call.call_id, currentCheckpoint);
            }
          });
          
          setActiveCalls(active);
        }
        
        setActiveCalls(active);
      }
      
      // Actualizar solo llamadas activas
        setActiveCalls(active);
      
      // El historial se carga desde call_analysis_summary cuando se selecciona la pestaña 'all'
      
      
    } catch (error) {
      // Error cargando llamadas
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
          liveMonitorService.getActiveCalls(user?.id),
          liveMonitorService.getActiveAgents()
        ]);
        
        setAgents(agentsData);
        if (agentsData.length > 0) {
          setNextAgent(agentsData[0]);
        }
        
        await loadCalls();
      } catch (error) {
        setLoading(false);
      }
    };

    loadInitialData();
    
    // Realtime: Configuración diferente según si usamos vista optimizada o legacy
    let realtimeChannel: any = null;
    
    if (USE_OPTIMIZED_VIEW) {
      // MODO OPTIMIZADO: Intentar suscripción Realtime, pero no es crítico si falla
      // El polling cada 3 segundos se encargará de detectar cambios
      
      // Throttling mejorado y batching para la subscripción de Realtime
      let lastRealtimeUpdate = 0;
      const REALTIME_THROTTLE_MS = 500; // Aumentado a 500ms para reducir frecuencia
      let pendingUpdate: { classifiedCalls: any; payloadData: any } | null = null;
      let batchTimeout: number | null = null;
      
      const processPendingUpdate = () => {
        if (!pendingUpdate) return;
        
        const { classifiedCalls, payloadData } = pendingUpdate;
        pendingUpdate = null;
        batchTimeout = null;
        
        // Usar requestIdleCallback para diferir trabajo pesado cuando el navegador esté libre
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            // Detectar cambios de checkpoint solo para el payload específico (más eficiente)
        if (payloadData && payloadData.event === 'UPDATE') {
          const newCall = payloadData.new as any;
          const oldCall = payloadData.old as any;
          
          if (newCall) {
            const newCheckpoint = newCall.checkpoint_venta_actual;
            const oldCheckpoint = oldCall?.checkpoint_venta_actual || previousCheckpointsRef.current.get(newCall.call_id);
            
                // Detectar cambio a checkpoint #5 (solo para este call específico)
            if (newCheckpoint && 
                (newCheckpoint === 'checkpoint #5' || newCheckpoint?.includes('checkpoint #5')) &&
                oldCheckpoint !== 'checkpoint #5' && !oldCheckpoint?.includes('checkpoint #5')) {
              // Emitir notificación global para el sidebar (con animación de ringing y sonido)
              triggerCallNotification(newCall.call_id, newCheckpoint);
            }
            
            // Actualizar mapa de checkpoints anteriores
            if (newCheckpoint) {
              previousCheckpointsRef.current.set(newCall.call_id, newCheckpoint);
            }
          }
        }
        
            // Actualizar estados usando requestAnimationFrame para evitar bloqueos
            requestAnimationFrame(() => {
              setActiveCalls(classifiedCalls.active);
              setLastUpdateTime(new Date());
            });
          }, { timeout: 1000 });
        } else {
          // Fallback: usar setTimeout con delay más largo
          setTimeout(() => {
            if (payloadData && payloadData.event === 'UPDATE') {
              const newCall = payloadData.new as any;
              const oldCall = payloadData.old as any;
              
              if (newCall) {
                const newCheckpoint = newCall.checkpoint_venta_actual;
                const oldCheckpoint = oldCall?.checkpoint_venta_actual || previousCheckpointsRef.current.get(newCall.call_id);
                
                if (newCheckpoint && 
                    (newCheckpoint === 'checkpoint #5' || newCheckpoint?.includes('checkpoint #5')) &&
                    oldCheckpoint !== 'checkpoint #5' && !oldCheckpoint?.includes('checkpoint #5')) {
                  triggerCallNotification(newCall.call_id, newCheckpoint);
                }
                
                if (newCheckpoint) {
                  previousCheckpointsRef.current.set(newCall.call_id, newCheckpoint);
                }
              }
            }
            
            requestAnimationFrame(() => {
        setActiveCalls(classifiedCalls.active);
        setLastUpdateTime(new Date());
        });
          }, 100);
        }
      };
      
      liveMonitorKanbanOptimized.subscribeToChanges((classifiedCalls, payloadData) => {
        const now = performance.now();
        
        // Acumular actualizaciones en batch
        pendingUpdate = { classifiedCalls, payloadData };
        
        // Throttling: solo procesar si han pasado suficientes ms desde la última actualización
        if (now - lastRealtimeUpdate < REALTIME_THROTTLE_MS) {
          // Cancelar timeout anterior y crear uno nuevo para batch
          if (batchTimeout !== null) {
            clearTimeout(batchTimeout);
          }
          batchTimeout = window.setTimeout(processPendingUpdate, REALTIME_THROTTLE_MS);
          return; // Salir temprano, el batch se procesará después
        }
        
        lastRealtimeUpdate = now;
        
        // Procesar inmediatamente si no hay throttling
        processPendingUpdate();
      }).then((channel) => {
        realtimeChannel = channel;
        if (channel && channel.state === 'joined') {
          // Suscripción Realtime optimizada activa
        } else {
          // Realtime no disponible - usando polling cada 3 segundos (suficiente para detección)
        }
      }).catch((error) => {
        // No es crítico - el polling se encargará
        // Realtime no disponible - usando polling cada 3 segundos
      });
    } else {
      // MODO LEGACY: Suscripción directa a la tabla
      // Variables para throttling y batching (declaradas fuera del handler)
      let lastLegacyUpdate = 0;
      const LEGACY_THROTTLE_MS = 500;
      let pendingLegacyUpdate: { rec: any; oldRec: any } | null = null;
      let legacyBatchTimeout: number | null = null;
      
      const processLegacyUpdate = () => {
        if (!pendingLegacyUpdate) return;
        
        const { rec, oldRec } = pendingLegacyUpdate;
        pendingLegacyUpdate = null;
        legacyBatchTimeout = null;
        
        // Diferir procesamiento pesado usando requestIdleCallback
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
        if (rec) {
              // Detectar cambio de checkpoint (solo procesar si realmente cambió)
          const newCheckpoint = rec.checkpoint_venta_actual;
          const oldCheckpoint = oldRec?.checkpoint_venta_actual;
          
          if (newCheckpoint && newCheckpoint !== oldCheckpoint) {
            if (newCheckpoint === 'checkpoint #5' || newCheckpoint?.includes('checkpoint #5')) {
              if (!oldCheckpoint || oldCheckpoint !== 'checkpoint #5') {
                triggerCallNotification(rec.call_id, newCheckpoint);
              }
            }
          }
          
              // Actualización inteligente de datos usando requestAnimationFrame
              requestAnimationFrame(() => {
                const updateCallData = (calls: KanbanCall[]) => {
                  return calls.map(call => {
                    if (call.call_id === rec.call_id) {
                      // Parsear datos solo si es necesario (evitar parsing innecesario)
                      let datosProcesoActualizados = rec.datos_proceso;
                      if (typeof rec.datos_proceso === 'string') {
                        try {
                          datosProcesoActualizados = JSON.parse(rec.datos_proceso);
              } catch (e) {
                          datosProcesoActualizados = call.datos_proceso;
                        }
                      }
                      
                      let datosLlamadaActualizados = rec.datos_llamada;
                      if (typeof rec.datos_llamada === 'string') {
                        try {
                          datosLlamadaActualizados = JSON.parse(rec.datos_llamada);
                        } catch (e) {
                          datosLlamadaActualizados = call.datos_llamada;
                        }
                      }
                      
                      return { 
                        ...call, 
                        ...rec,
                        datos_proceso: datosProcesoActualizados,
                        datos_llamada: datosLlamadaActualizados
                      };
                    }
                    return call;
                  });
                };
                
                setActiveCalls(updateCallData);
              });
            }
            
            // Solo hacer loadCalls si hay cambio crítico de estado
            if (rec && oldRec && rec.call_status !== oldRec.call_status) {
              if (oldRec.call_status === 'activa' && rec.call_status === 'finalizada') {
                // Diferir loadCalls usando requestIdleCallback
                if ('requestIdleCallback' in window) {
                  requestIdleCallback(() => {
                    loadCalls(true, true).catch(() => {});
                  }, { timeout: 1000 });
                } else {
                  setTimeout(() => loadCalls(true, true).catch(() => {}), 500);
                }
              }
            }
          }, { timeout: 1000 });
        } else {
          // Fallback para navegadores sin requestIdleCallback
              setTimeout(() => {
            if (rec) {
              const newCheckpoint = rec.checkpoint_venta_actual;
              const oldCheckpoint = oldRec?.checkpoint_venta_actual;
              
              if (newCheckpoint && newCheckpoint !== oldCheckpoint) {
                if (newCheckpoint === 'checkpoint #5' || newCheckpoint?.includes('checkpoint #5')) {
                  if (!oldCheckpoint || oldCheckpoint !== 'checkpoint #5') {
                    triggerCallNotification(rec.call_id, newCheckpoint);
                  }
                }
              }
              
              requestAnimationFrame(() => {
          const updateCallData = (calls: KanbanCall[]) => {
            return calls.map(call => {
              if (call.call_id === rec.call_id) {
                let datosProcesoActualizados = rec.datos_proceso;
                if (typeof rec.datos_proceso === 'string') {
                  try {
                    datosProcesoActualizados = JSON.parse(rec.datos_proceso);
                  } catch (e) {
                    datosProcesoActualizados = call.datos_proceso;
                  }
                }
                
                let datosLlamadaActualizados = rec.datos_llamada;
                if (typeof rec.datos_llamada === 'string') {
                  try {
                    datosLlamadaActualizados = JSON.parse(rec.datos_llamada);
                  } catch (e) {
                    datosLlamadaActualizados = call.datos_llamada;
                  }
                }
                
                      return { 
                  ...call, 
                  ...rec,
                  datos_proceso: datosProcesoActualizados,
                  datos_llamada: datosLlamadaActualizados
                };
              }
              return call;
            });
          };
          
          setActiveCalls(updateCallData);
              });
        }
        
        if (rec && oldRec && rec.call_status !== oldRec.call_status) {
              if (oldRec.call_status === 'activa' && rec.call_status === 'finalizada') {
                setTimeout(() => loadCalls(true, true).catch(() => {}), 500);
              }
            }
          }, 100);
        }
      };
      
      realtimeChannel = analysisSupabase
      .channel('live-monitor-calls')
      // INSERT: nuevas llamadas deben aparecer inmediatamente
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'llamadas_ventas'
      }, async (payload) => {
        try {
          // Diferir carga usando requestIdleCallback
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
              loadCalls(true, true).catch(() => {}); // preserveRealtimeData=true para no sobrescribir
            }, { timeout: 500 });
          } else {
            setTimeout(() => loadCalls(true, true).catch(() => {}), 200);
          }
          } catch (e) {
            // Error refreshing calls on realtime
          }
      })
      // UPDATE: cambios de checkpoint/estado - CRÍTICO para movimiento entre checkpoints
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'llamadas_ventas'
      }, (payload) => {
        const rec = payload.new as any;
        const oldRec = payload.old as any;
        
        const now = performance.now();
        
        // Acumular actualizaciones en batch
        pendingLegacyUpdate = { rec, oldRec };
        
        // Throttling mejorado
        if (now - lastLegacyUpdate < LEGACY_THROTTLE_MS) {
          if (legacyBatchTimeout !== null) {
            clearTimeout(legacyBatchTimeout);
          }
          legacyBatchTimeout = window.setTimeout(processLegacyUpdate, LEGACY_THROTTLE_MS);
          return;
        }
        
        lastLegacyUpdate = now;
        processLegacyUpdate();
      })
      .subscribe((status) => {
        // Suscripción Realtime activa (silencioso)
      });
    }

    // Polling para detectar llamadas nuevas que no lleguen por Realtime
    // Aumentado a 5 segundos para reducir carga y violaciones de rendimiento
    // Esto asegura que incluso si Realtime falla, las llamadas aparecerán rápidamente
    const interval = setInterval(() => {
      // Solo hacer polling si no hay modal abierto y usar requestIdleCallback
      if (!isModalOpenRef.current) {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
      loadCalls(true, true); // isRefresh=true, preserveRealtimeData=true
          }, { timeout: 2000 });
        } else {
          setTimeout(() => loadCalls(true, true), 200);
        }
      }
    }, 5000); // Aumentado a 5 segundos para reducir carga
    
    return () => {
      clearInterval(interval);
      if (realtimeChannel) {
        try { 
          if (typeof realtimeChannel.unsubscribe === 'function') {
            realtimeChannel.unsubscribe(); 
          }
        } catch (e) {}
      }
    };
  }, []);

  // Manejar apertura del modal de detalle
  // Estados para el sidebar del prospecto
  const [showProspectoSidebar, setShowProspectoSidebar] = useState(false);
  const [selectedProspecto, setSelectedProspecto] = useState<any>(null);
  
  // Estados para el segundo sidebar (CallDetailModalSidebar)
  const [callDetailModalOpen, setCallDetailModalOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // Función para abrir el sidebar del prospecto
  const handleProspectoClick = async (call: KanbanCall) => {
    if (!user?.id) {
      alert('Debes estar autenticado para ver los detalles del prospecto');
      return;
    }

    // Intentar obtener el prospecto_id desde diferentes campos
    let prospectoId = null;
    
    // Si call tiene un campo prospecto_id directo
    if ((call as any).prospecto_id) {
      prospectoId = (call as any).prospecto_id;
    }
    // Si call tiene un campo prospecto (string UUID)
    else if ((call as any).prospecto) {
      prospectoId = (call as any).prospecto;
    }
    // Si call tiene un campo id
    else if ((call as any).id) {
      prospectoId = (call as any).id;
    }
    
    if (!prospectoId) {
      return;
    }
    
    try {
      // Verificar permisos antes de cargar el prospecto
      const permissionsServiceModule = await import('../../services/permissionsService');
      const permissionCheck = await permissionsServiceModule.permissionsService.canUserAccessProspect(
        user.id,
        prospectoId
      );

      if (!permissionCheck.canAccess) {
        alert(permissionCheck.reason || 'No tienes permiso para acceder a este prospecto');
        return;
      }

      // Si tiene permisos, cargar el prospecto
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .eq('id', prospectoId)
        .single();

      if (error) {
        console.error('Error loading prospecto:', error);
        alert('Error al cargar los datos del prospecto');
        return;
      }

      setSelectedProspecto(data);
      setShowProspectoSidebar(true);
    } catch (error) {
      console.error('Error loading prospecto:', error);
      alert('Error al verificar permisos o cargar el prospecto');
    }
  };
  
  // Función para abrir el CallDetailModalSidebar desde el ProspectoSidebar
  const handleOpenCallDetail = (callId: string) => {
    setSelectedCallId(callId);
    setCallDetailModalOpen(true);
  };

  const handleCallSelect = (call: KanbanCall) => {
    setSelectedCall(call);
    
    // Marcar llamada como vista para la lógica de transferencia
    setViewedCalls(prev => new Set(prev).add(call.call_id));
    
  };

  // Manejar cierre del modal de detalle
  const handleModalClose = () => {
    // Detener monitoreo de audio si está activo
    stopAudioMonitoring();
    
    const currentCall = selectedCall;
    setSelectedCall(null);
    
    if (currentCall) {
      // LÓGICA ESPECÍFICA: Si está en checkpoint #5, mover automáticamente a "Transferidas"
      if (currentCall.checkpoint_venta_actual === 'checkpoint #5') {
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
            // Si la llamada cambió de estado, reclasificar
            const razonFinalizacion = data.datos_llamada?.razon_finalizacion;
            
            if (
              data.call_status !== 'activa' ||
              razonFinalizacion === 'assistant-forwarded-call' ||
              razonFinalizacion === 'customer-ended-call' ||
              razonFinalizacion === 'assistant-ended-call'
            ) {
              setTimeout(() => loadCalls(true, true), 100); // preserveRealtimeData=true
            }
          }
        } catch (error) {
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
        
        // Solo disparar si cambió DE otro checkpoint A checkpoint #5
        if (oldCheckpoint !== newCheckpoint && 
            (newCheckpoint === 'checkpoint #5' || newCheckpoint?.includes('checkpoint #5')) && 
            oldCheckpoint !== 'checkpoint #5' && !oldCheckpoint?.includes('checkpoint #5')) {
          // Emitir notificación global para el sidebar (con animación de ringing y sonido)
          triggerCallNotification(rec.call_id, newCheckpoint);
        }
        
        // Actualizar conversación
        const newConversation = parseConversation(rec.conversacion_completa);
        updateConversation(newConversation);
        
        // Actualizar el selectedCall con los nuevos datos (incluyendo resumen y datos_proceso)
        setSelectedCall(prev => {
          if (prev && prev.call_id === rec.call_id) {
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
              // Preservar campos críticos que pueden no venir en el payload de realtime
              control_url: rec.control_url || prev.control_url,
              monitor_url: rec.monitor_url || prev.monitor_url,
              transport_url: rec.transport_url || prev.transport_url,
              call_sid: rec.call_sid || prev.call_sid,
              provider: rec.provider || prev.provider,
              account_sid: rec.account_sid || prev.account_sid,
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
          <ProspectAvatar
            nombreCompleto={call.nombre_completo}
            nombreWhatsapp={call.nombre_whatsapp}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {call.nombre_completo || call.nombre_whatsapp || 'Sin nombre'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {call.whatsapp}
            </p>
          </div>
        </div>

        {/* Información de Asignación */}
        {(call.coordinacion_codigo || call.ejecutivo_nombre) && (
          <div className="mb-2">
            <AssignmentBadge call={call} variant="compact" />
          </div>
        )}

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
              }
            } catch (e) {
              // Ignorar errores de parsing
            }
            
            // 2. SEGUNDA PRIORIDAD: composicion_familiar_numero (campo de llamada)
            if (!numeroPersonas && call.composicion_familiar_numero) {
              numeroPersonas = call.composicion_familiar_numero;
            }
            
            // 3. ÚLTIMA PRIORIDAD: tamano_grupo (campo del prospecto - puede estar desactualizado)
            if (!numeroPersonas && call.tamano_grupo) {
              numeroPersonas = call.tamano_grupo;
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

  // ELIMINADO: Early return con loading completo
  // Ahora el loading se maneja discretamente dentro de cada tab

  const groupedActiveCalls = groupCallsByCheckpoint(activeCalls);
  const horizontalRows = createHorizontalRows(groupedActiveCalls);

  const themeClasses = getThemeClasses();

  return (
    <div className={`min-h-screen ${themeClasses.background} p-2 sm:p-4 transition-colors duration-300 w-full`}>
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
      
      <div className="w-full space-y-3 sm:space-y-4">
        
        {/* Toggle Panel Lateral de Llamadas */}
        <div className="flex items-center justify-end px-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <span className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
              Panel Lateral
            </span>
            <div className="relative">
              <input
                type="checkbox"
                checked={isWidgetEnabled}
                onChange={(e) => toggleWidget(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:bg-emerald-500 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5" />
            </div>
            {isWidgetEnabled && (
              <span className="flex items-center gap-1 text-xs text-emerald-500">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Activado
              </span>
            )}
          </label>
        </div>

        {/* Tabs */}
        <div className="corp-card corp-glow w-full">
          <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-700">
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
            
            {!isAdminOperativo && (
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
                    {totalHistoryCount}
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Contenido de tabs */}
          <div className="p-3 sm:p-4 lg:p-6">
            {selectedTab === 'active' && (
              <div className="rounded-lg overflow-hidden" style={{ minHeight: 'calc(100vh - 280px)' }}>
                {/* Headers de columnas */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-0">
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
                        className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-0 min-h-[80px] ${rowBgColors[maxCheckpoint as keyof typeof rowBgColors] || rowBgColors[1]} transition-all duration-500`}
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



            {selectedTab === 'all' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Filtros Minimalistas - Siempre Visibles */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-3 sm:p-4"
                >
                  {/* Primera fila: Búsqueda y filtros principales */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-2 mb-3">
                    {/* Búsqueda ampliada */}
                    <div className="col-span-2 sm:col-span-4 lg:col-span-5">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200"
                        />
                      </div>
                    </div>
                    
                    {/* Rango de fechas - Calendario con rango */}
                    <div className="col-span-2 sm:col-span-2 lg:col-span-3 relative" ref={datePickerRef}>
                      <div 
                        className="relative cursor-pointer"
                        onClick={() => setShowDatePicker(!showDatePicker)}
                      >
                        <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <div className="flex items-center gap-2 pl-8 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-md hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                          <span className={`flex-1 ${!dateFrom && !dateTo ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                            {dateFrom && dateTo 
                              ? `${new Date(dateFrom).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })} - ${new Date(dateTo).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}`
                              : dateFrom
                                ? `${new Date(dateFrom).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })} - ...`
                                : 'Seleccionar rango'
                            }
                          </span>
                          <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform ${showDatePicker ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                      
                      {/* Calendario desplegable */}
                      {showDatePicker && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg p-4 min-w-[320px]">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Rango de fechas</span>
                              <button
                                onClick={() => {
                                  setDateFrom('');
                                  setDateTo('');
                                  setShowDatePicker(false);
                                }}
                                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              >
                                Limpiar
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Desde</label>
                                <input
                                  type="date"
                                  value={dateFrom}
                                  onChange={(e) => {
                                    setDateFrom(e.target.value);
                                    if (dateTo && e.target.value > dateTo) {
                                      setDateTo('');
                                    }
                                  }}
                                  max={dateTo || undefined}
                                  className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Hasta</label>
                                <input
                                  type="date"
                                  value={dateTo}
                                  onChange={(e) => {
                                    setDateTo(e.target.value);
                                    if (dateFrom && e.target.value < dateFrom) {
                                      setDateFrom('');
                                    }
                                  }}
                                  min={dateFrom || undefined}
                                  className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowDatePicker(false)}
                              className="mt-2 px-3 py-1.5 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                            >
                              Aplicar
                            </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Ejecutivo asignado */}
                    <div className="col-span-1 sm:col-span-1 lg:col-span-2 hidden sm:block">
                      <select
                        value={ejecutivoFilter}
                        onChange={(e) => setEjecutivoFilter(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Ejecutivo</option>
                        {uniqueEjecutivos.map(ejecutivo => (
                          <option key={ejecutivo.id} value={ejecutivo.id}>{ejecutivo.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Nivel de interés */}
                    <div className="col-span-1 lg:col-span-1 hidden lg:block">
                      <select
                        value={interestFilter}
                        onChange={(e) => setInterestFilter(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Interés</option>
                        {uniqueInterests.map(interest => (
                          <option key={interest} value={interest}>{interest}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Estado */}
                    <div className="col-span-1 lg:col-span-1 hidden lg:block">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Estado</option>
                        <option value="transferida">Transferida</option>
                        <option value="atendida">Atendida</option>
                        <option value="no_contestada">No contestó</option>
                        <option value="buzon">Buzón de voz</option>
                        <option value="perdida">Perdida</option>
                        <option value="activa">En llamada</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Segunda fila: Filtros rápidos por tags */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-hide">
                    <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Filtros:</span>
                    
                    {/* Estados rápidos */}
                    <button
                      onClick={() => toggleQuickFilter('perdida')}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        quickFilters.perdida 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-300 dark:border-red-700' 
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      Perdida
                    </button>
                    <button
                      onClick={() => toggleQuickFilter('noTransferida')}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        quickFilters.noTransferida 
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700' 
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      No Transferida
                    </button>
                    <button
                      onClick={() => toggleQuickFilter('transferida')}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        quickFilters.transferida 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700' 
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      Transferida
                    </button>
                    
                    {/* Intereses rápidos */}
                    {uniqueInterests.slice(0, 3).map(interest => (
                      <button
                        key={interest}
                        onClick={() => toggleQuickFilter('interes', interest)}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          quickFilters.interes === interest 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-300 dark:border-blue-700' 
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                    
                    {/* Botón limpiar */}
                    {(searchQuery || dateFrom || dateTo || interestFilter || statusFilter || ejecutivoFilter || Object.keys(quickFilters).length > 0) && (
                      <button
                        onClick={clearHistoryFilters}
                        className="ml-auto px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      >
                        Limpiar filtros
                      </button>
                    )}
              </div>
                </motion.div>

                {/* Tabla Principal estilo AnalysisIAComplete */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col"
                  style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '400px' }}
                >
              <div ref={historyScrollContainerRef} className="w-full overflow-y-auto scrollbar-hide flex-1" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                <table className="w-full divide-y divide-slate-200 dark:divide-slate-700 table-fixed">
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          <th 
                            className="w-[28%] px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                            onClick={() => {
                              if (historySortField === 'prospecto_nombre') {
                                setHistorySortDirection(historySortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setHistorySortField('prospecto_nombre');
                                setHistorySortDirection('asc');
                              }
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <span className="truncate">Prospecto</span>
                              {historySortField === 'prospecto_nombre' && (
                                <span className="flex-shrink-0">{historySortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                        </div>
                          </th>
                          <th 
                            className="w-[12%] px-2 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                            onClick={() => {
                              if (historySortField === 'fecha_llamada') {
                                setHistorySortDirection(historySortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setHistorySortField('fecha_llamada');
                                setHistorySortDirection('desc');
                              }
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <span className="truncate">Fecha</span>
                              {historySortField === 'fecha_llamada' && (
                                <span className="flex-shrink-0">{historySortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                        </div>
                          </th>
                          <th 
                            className="w-[8%] px-2 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                            onClick={() => {
                              if (historySortField === 'duracion_segundos') {
                                setHistorySortDirection(historySortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setHistorySortField('duracion_segundos');
                                setHistorySortDirection('desc');
                              }
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <span className="truncate">Dur.</span>
                              {historySortField === 'duracion_segundos' && (
                                <span className="flex-shrink-0">{historySortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                        </div>
                          </th>
                          <th 
                            className="w-[14%] px-2 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                            onClick={() => {
                              if (historySortField === 'call_status') {
                                setHistorySortDirection(historySortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setHistorySortField('call_status');
                                setHistorySortDirection('asc');
                              }
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <span className="truncate">Estado</span>
                              {historySortField === 'call_status' && (
                                <span className="flex-shrink-0">{historySortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                        </div>
                          </th>
                          <th 
                            className="w-[10%] px-2 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                            onClick={() => {
                              if (historySortField === 'nivel_interes_detectado') {
                                setHistorySortDirection(historySortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setHistorySortField('nivel_interes_detectado');
                                setHistorySortDirection('desc');
                              }
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <span className="truncate">Interés</span>
                              {historySortField === 'nivel_interes_detectado' && (
                                <span className="flex-shrink-0">{historySortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                        </div>
                          </th>
                          <th className="w-[18%] px-2 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <span className="truncate">Asignación</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {/* Loading discreto SOLO para carga inicial (cuando no hay datos) */}
                        {loading && filteredHistoryCalls.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center">
                              <div className="flex items-center justify-center gap-3">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                <span className="text-sm text-slate-600 dark:text-slate-400">Cargando historial...</span>
                              </div>
                            </td>
                          </tr>
                        ) : filteredHistoryCalls.length === 0 && !loadingMoreHistory ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center">
                              <div className="text-slate-500 dark:text-slate-400">
                                {allHistoryCallsLoaded.length === 0 ? 'No hay llamadas registradas' : 'No hay resultados que coincidan con los filtros'}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredHistoryCalls.map((call, index) => {
                            const prospectKey = call.prospecto_nombre || call.nombre_completo || 'Sin prospecto';
                            const isGroupMain = call.isGroupMain;
                            const isGroupSub = call.isGroupSub;
                            const groupSize = call.groupSize || 1;
                            
                            // Determinar si esta fila pertenece al grupo expandido
                            const belongsToExpandedGroup = expandedGroup && (prospectKey === expandedGroup);
                            const isOtherGroup = expandedGroup && prospectKey !== expandedGroup;
                            
                            return (
                              <tr 
                                key={`${call.call_id}-${index}`}
                                onClick={async () => {
                                  // Si se hace clic en una llamada de otro grupo (con blur), solo colapsar el grupo expandido
                                  if (expandedGroup && prospectKey !== expandedGroup) {
                                    setExpandedGroup(null);
                                    return; // No abrir el modal, solo colapsar
                                  }
                                  setSelectedCallForAnalysis(call);
                                  setShowAnalysisDetailModal(true);
                                  if (call.call_id) {
                                    await loadTranscript(call.call_id, 1.04);
                                    // Usar prospecto_completo si está disponible, sino cargar desde BD
                                    if (call.prospecto_completo) {
                                      setSelectedProspectoData(call.prospecto_completo);
                                    } else if (call.prospecto_id || call.prospecto) {
                                      try {
                                        const { data } = await analysisSupabase
                                          .from('prospectos')
                                          .select('*')
                                          .eq('id', call.prospecto_id || call.prospecto)
                                          .single();
                                        setSelectedProspectoData(data);
                                      } catch (err) {
                                        console.error('Error loading prospecto data:', err);
                                      }
                                    }
                                  }
                                }}
                                className={`cursor-pointer transition-all duration-200 ${
                                  belongsToExpandedGroup
                                    ? isGroupMain || isGroupSub
                                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 shadow-sm' 
                                      : 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 shadow-sm'
                                    : isOtherGroup
                                      ? 'opacity-40 blur-sm'
                                      : isGroupMain
                                        ? 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-l-4 border-blue-500' 
                                        : isGroupSub 
                                          ? 'hover:bg-slate-25 dark:hover:bg-slate-800/30 bg-slate-25 dark:bg-slate-800/20 border-l-4 border-slate-300 relative' 
                                          : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                                style={isGroupSub ? {
                                  borderLeft: '4px solid rgb(148 163 184)',
                                  paddingLeft: 'calc(1.5rem + 8px)',
                                  position: 'relative'
                                } : {}}
                  >
                        <td className="px-3 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {/* Botón de expansión/colapso para grupos con contador */}
                                    {isGroupMain && groupSize > 1 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleGroup(prospectKey);
                                        }}
                                        className={`relative px-2.5 py-1.5 rounded-md transition-all duration-200 border-2 ${
                                          expandedGroup === prospectKey
                                            ? 'bg-blue-500 dark:bg-blue-600 border-blue-600 dark:border-blue-700 hover:bg-blue-600 dark:hover:bg-blue-700'
                                            : 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-400 dark:hover:border-blue-600'
                                        }`}
                                        title={expandedGroup === prospectKey ? `Colapsar grupo` : `Expandir ${groupSize - 1} llamadas más`}
                                      >
                                        <span className={`text-xs font-semibold ${
                                          expandedGroup === prospectKey 
                                            ? 'text-white dark:text-white' 
                                            : 'text-blue-600 dark:text-blue-400'
                                        }`}>
                                          {groupSize}
                          </span>
                                      </button>
                                    )}
                                    
                                    {isGroupSub && (
                                      <div className="absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center">
                                        {/* Línea jerárquica vertical */}
                                        <div className="w-0.5 h-full bg-slate-300 dark:bg-slate-600"></div>
                                        {/* Punto de conexión */}
                                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full border-2 border-white dark:border-slate-800"></div>
                  </div>
                )}
                                    
                                    {!isGroupMain && !isGroupSub && (
                                      <div className="w-4"></div>
                                    )}
                                    
                                    {/* Avatar estilo AnalysisIAComplete con punto rojo si requiere atención humana */}
                                    <div className={`relative p-2 rounded-full flex-shrink-0 ${
                                      isGroupMain 
                                        ? 'bg-blue-50 dark:bg-blue-900/20' 
                                        : 'bg-slate-50 dark:bg-slate-800/50'
                                    }`}>
                                      <User size={16} className={
                                        isGroupMain 
                                          ? 'text-blue-600 dark:text-blue-400' 
                                          : 'text-slate-500 dark:text-slate-400'
                                      } />
                                      {/* Punto rojo solo en agrupador principal si requiere atención humana */}
                                      {isGroupMain && (() => {
                                        const prospecto = call.prospecto_completo || {};
                                        return prospecto.requiere_atencion_humana || call.requiere_atencion_humana;
                                      })() && (
                                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 shadow-sm"></div>
                                      )}
                        </div>
                                    
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <div className={`text-sm font-medium truncate ${
                                          isGroupMain 
                                            ? 'text-slate-900 dark:text-white' 
                                            : 'text-slate-600 dark:text-slate-300'
                                        }`} title={call.nombre_completo || call.nombre_whatsapp || 'Sin nombre'}>
                          {call.nombre_completo || call.nombre_whatsapp || 'Sin nombre'}
                        </div>
                                        {user?.id && call.ejecutivo_id && (
                                          <BackupBadgeWrapper
                                            currentUserId={user.id}
                                            prospectoEjecutivoId={call.ejecutivo_id}
                                            variant="compact"
                                          />
                                        )}
                                        {isGroupMain && groupSize > 1 && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                            {groupSize} llamadas
                          </span>
                                        )}
                        </div>
                                      {/* Tags de discovery - un solo color discreto, sin edad ni ingresos */}
                                      {!isGroupSub && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {(() => {
                                            const prospecto = call.prospecto_completo || {};
                                            const datosProceso = call.datos_proceso || {};
                                            
                                            return (
                                              <>
                                                {/* Ciudad con icono de pin */}
                                                {prospecto.ciudad_residencia && (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                    <MapPin className="w-3 h-3" />
                                                    {prospecto.ciudad_residencia}
                                                  </span>
                                                )}
                                                
                                                {/* Cumpleaños (ej: 28ENE) */}
                                                {prospecto.cumpleanos && (() => {
                                                  try {
                                                    const fecha = new Date(prospecto.cumpleanos);
                                                    const dia = fecha.getDate();
                                                    const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
                                                    const mes = meses[fecha.getMonth()];
                                                    return (
                                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                        {dia}{mes}
                                                      </span>
                                                    );
                                                  } catch (e) {
                                                    return null;
                                                  }
                                                })()}
                                                
                                                {/* Estado Civil */}
                                                {(datosProceso?.estado_civil || prospecto.estado_civil) && (() => {
                                                  const estadoCivil = datosProceso?.estado_civil || prospecto.estado_civil;
                                                  if (estadoCivil && estadoCivil !== 'no_especificado') {
                                                    return (
                                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                        {estadoCivil}
                                                      </span>
                                                    );
                                                  }
                                                  return null;
                                                })()}
                                                
                                                {/* Composición Familiar (ej: 4ADU 2MEN) */}
                                                {(() => {
                                                  const adultos = datosProceso?.numero_personas || prospecto.tamano_grupo;
                                                  const menores = prospecto.cantidad_menores;
                                                  if (adultos || menores) {
                                                    const partes = [];
                                                    if (adultos) partes.push(`${adultos}ADU`);
                                                    if (menores && menores > 0) partes.push(`${menores}MEN`);
                                                    if (partes.length > 0) {
                                                      return (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                          {partes.join(' ')}
                                                        </span>
                                                      );
                                                    }
                                                  }
                                                  return null;
                                                })()}
                                                
                                                {/* Destino Preferencia con icono de avión */}
                                                {(datosProceso?.destino_preferencia || prospecto.destino_preferencia) && (() => {
                                                  const destino = datosProceso?.destino_preferencia || prospecto.destino_preferencia;
                                                  const destinoStr = Array.isArray(destino) ? destino[0] : destino;
                                                  return (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                      <Plane className="w-3 h-3" />
                                                      {destinoStr}
                                                    </span>
                                                  );
                                                })()}
                                              </>
                                            );
                                          })()}
                        </div>
                                      )}
                        </div>
                        </div>
                        </td>
                              <td className="px-2 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                                <div className="truncate">
                                  {call.fecha_llamada ? new Date(call.fecha_llamada).toLocaleDateString('es-MX') : 'N/A'}
                                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {call.fecha_llamada ? new Date(call.fecha_llamada).toLocaleTimeString('es-MX', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    }) : ''}
                            </div>
                          </div>
                        </td>
                              <td className="px-2 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                                <span className="truncate">
                                  {call.duracion_segundos ? 
                                    `${Math.floor(call.duracion_segundos / 60)}:${(call.duracion_segundos % 60).toString().padStart(2, '0')}` : 
                                    'N/A'
                                  }
                                </span>
                        </td>
                              
                                {/* Estado mejorado - usa clasificador centralizado */}
                        <td className="px-2 py-3 whitespace-nowrap overflow-hidden">
                                  {(() => {
                                    // Usar configuración del clasificador centralizado
                                    const status = (call.call_status || 'perdida') as CallStatusGranular;
                                    const config = CALL_STATUS_CONFIG[status] || CALL_STATUS_CONFIG.perdida;
                                    
                                    return (
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                                        {config.label}
                          </span>
                                    );
                                  })()}
                        </td>
                                
                                {/* Nivel Interés */}
                        <td className="px-2 py-3 whitespace-nowrap overflow-hidden">
                                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                    (call.nivel_interes_detectado || call.nivel_interes) === 'Alto' || (call.nivel_interes_detectado || call.nivel_interes) === 'MUY_ALTO' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                    (call.nivel_interes_detectado || call.nivel_interes) === 'Medio' || (call.nivel_interes_detectado || call.nivel_interes) === 'MEDIO' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                  }`}>
                                    {call.nivel_interes_detectado || call.nivel_interes || 'N/A'}
                          </span>
                        </td>
                                
                                {/* Asignación según permisos */}
                        <td className="px-2 py-3 whitespace-nowrap overflow-hidden">
                                  {(() => {
                                    const prospecto = call.prospecto_completo || {};
                                    const ejecutivoId = prospecto.ejecutivo_id || call.ejecutivo_id;
                                    const coordinacionId = prospecto.coordinacion_id || call.coordinacion_id;
                                    
                                    if (isAdmin) {
                                      // Admin: mostrar ejecutivo y coordinación como tags
                                      const ejecutivo = ejecutivoId ? ejecutivosMap[ejecutivoId] : null;
                                      const coordinacion = coordinacionId ? coordinacionesMap[coordinacionId] : null;
                                      return (
                                        <div className="flex flex-col gap-1 min-w-0">
                                          {ejecutivo && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 max-w-full" title={ejecutivo.full_name || ejecutivo.nombre_completo || ejecutivo.nombre || 'N/A'}>
                                              <User className="w-3 h-3 flex-shrink-0" />
                                              <span className="truncate">{ejecutivo.full_name || ejecutivo.nombre_completo || ejecutivo.nombre || 'N/A'}</span>
                            </span>
                                          )}
                                          {coordinacion && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 max-w-full" title={coordinacion.nombre || coordinacion.codigo || 'N/A'}>
                                              <Users className="w-3 h-3 flex-shrink-0" />
                                              <span className="truncate">{coordinacion.nombre || coordinacion.codigo || 'N/A'}</span>
                            </span>
                          )}
                                          {!ejecutivo && !coordinacion && (
                                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                              Sin asignar
                                            </span>
                                          )}
                                        </div>
                                      );
                                    } else if (isCoordinador) {
                                      // Coordinador: mostrar ejecutivo asignado como tag
                                      const ejecutivo = ejecutivoId ? ejecutivosMap[ejecutivoId] : null;
                                      return ejecutivo ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 max-w-full" title={ejecutivo.full_name || ejecutivo.nombre_completo || ejecutivo.nombre || 'N/A'}>
                                          <User className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{ejecutivo.full_name || ejecutivo.nombre_completo || ejecutivo.nombre || 'N/A'}</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                          Sin ejecutivo
                                        </span>
                                      );
                                    } else if (isEjecutivo) {
                                      // Ejecutivo: mostrar coordinación asignada como tag
                                      const coordinacion = coordinacionId ? coordinacionesMap[coordinacionId] : null;
                                      return coordinacion ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 max-w-full" title={coordinacion.nombre || coordinacion.codigo || 'N/A'}>
                                          <Users className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{coordinacion.nombre || coordinacion.codigo || 'N/A'}</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                          Sin coordinación
                                        </span>
                                      );
                                    }
                                    return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">-</span>;
                                  })()}
                        </td>
                      </tr>
                            );
                          })
                        )}
                  </tbody>
                </table>
                  </div>
                  
                  {/* Indicador de carga y contador - SIEMPRE VISIBLE */}
                  <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Mostrando {filteredHistoryCalls.length} de {totalHistoryCount} llamadas
                      </span>
                    </div>
                    
                    {/* Indicador discreto SOLO cuando está cargando más Y ya hay datos visibles */}
                    {loadingMoreHistory && filteredHistoryCalls.length > 0 && (
                      <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-700">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Cargando más...</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de detalles completo */}
        <AnimatePresence>
          {selectedCall && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
              onClick={(e) => e.target === e.currentTarget && handleModalClose()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl lg:max-w-[85rem] xl:max-w-[90rem] max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
              >
                {/* Header */}
                <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1 min-w-0">
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                        onClick={() => handleProspectoClick(selectedCall)}
                        className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${
                          selectedCall.call_status === 'activa' 
                            ? 'from-green-500 via-blue-500 to-purple-500' 
                            : selectedCall.duracion_segundos === 0
                            ? 'from-red-500 via-red-600 to-red-700'
                            : 'from-gray-400 via-gray-500 to-gray-600'
                        } p-0.5 shadow-lg flex-shrink-0 group cursor-pointer`}
                        title="Ver información del prospecto"
                      >
                        <div className="w-full h-full rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                          <ProspectAvatar
                            nombreCompleto={selectedCall.nombre_completo}
                            nombreWhatsapp={selectedCall.nombre_whatsapp}
                            size="xl"
                            className="w-full h-full rounded-2xl"
                          />
                        </div>
                        {/* Lupa con animación heartbeat */}
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                          className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-gray-900 rounded-full shadow-lg border-2 border-blue-500"
                        >
                          <Eye size={12} className="text-blue-600 dark:text-blue-400" />
                        </motion.div>
                      </motion.button>
                      <div className="flex-1 min-w-0">
                        <motion.button
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          onClick={() => handleProspectoClick(selectedCall)}
                          className="text-2xl font-bold text-gray-900 dark:text-white mb-1 truncate text-left hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          {selectedCall.nombre_completo || selectedCall.nombre_whatsapp || 'Sin nombre'}
                        </motion.button>
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className={`text-sm font-medium ${
                            selectedCall.call_status === 'activa' ? 'text-green-600 dark:text-green-400' : 
                            selectedCall.duracion_segundos === 0 ? 'text-red-600 dark:text-red-400' : 
                            'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {selectedCall.call_status === 'activa' ? 'Llamada Activa' : 
                           selectedCall.duracion_segundos === 0 ? 'Llamada Fallida' : 'Llamada Finalizada'}
                        </motion.p>
                      </div>
                    </div>
                    <motion.button
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      transition={{ delay: 0.25 }}
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleModalClose}
                      className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                {/* Contenido del modal */}
                <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
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
                        // Error parseando datos_llamada para resumen
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
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center">
                            <FileText className="w-4 h-4 mr-2 text-emerald-500" />
                            Resumen de la Llamada
                          </h4>
                          {selectedCall.call_status === 'activa' && (
                            <div className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 ml-auto">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1 animate-pulse"></div>
                              Tiempo real
                            </div>
                          )}
                        </div>
                        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {resumen}
                          </p>
                        </div>
                      </motion.div>
                    ) : null;
                  })()}
                
                  {/* Grid de información: Personal, Viaje, Detalles */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    
                    {/* Información Personal Completa */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center">
                          <User className="w-4 h-4 mr-2 text-blue-500" />
                          Información Personal
                        </h4>
                      </div>
                      <div className="space-y-2 text-xs">
                        {renderField('Nombre Completo', selectedCall.nombre_completo)}
                        {renderField('WhatsApp', selectedCall.nombre_whatsapp)}
                        {renderField('Teléfono', selectedCall.whatsapp)}
                        {renderField('Email', selectedCall.email)}
                        {renderField('Ciudad', selectedCall.ciudad_residencia)}
                        {renderField('Estado Civil', selectedCall.estado_civil)}
                        {renderField('Edad', selectedCall.edad)}
                        {renderField('Etapa', selectedCall.etapa)}
                      </div>
                    </motion.div>

                    {/* Información de Viaje */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center">
                          <Globe className="w-4 h-4 mr-2 text-purple-500" />
                          Información de Viaje
                        </h4>
                      </div>
                      <div className="space-y-2 text-xs">
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
                    </motion.div>

                    {/* Información de Asignación */}
                    {(selectedCall.coordinacion_codigo || selectedCall.ejecutivo_nombre) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.22 }}
                        className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center">
                            <Users className="w-4 h-4 mr-2 text-purple-500" />
                            Asignación
                          </h4>
                        </div>
                        <AssignmentBadge call={selectedCall} variant="inline" />
                      </motion.div>
                    )}

                    {/* Información de Llamada */}
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 }}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-emerald-500" />
                          Detalles de Llamada
                        </h4>
                      </div>
                      <div className="space-y-2 text-xs">
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
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="mt-6"
                        >
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center">
                              <Volume2 className="w-4 h-4 mr-2 text-blue-500" />
                              Grabación
                            </h5>
                          </div>
                          <audio 
                            controls 
                            controlsList="nodownload noremoteplayback"
                            className="w-full rounded-xl"
                            preload="metadata"
                          >
                            <source src={selectedCall.audio_ruta_bucket} type="audio/wav" />
                            Tu navegador no soporta audio HTML5.
                          </audio>
                        </motion.div>
                      )}

                      {/* Controles para llamadas activas */}
                      {selectedCall.call_status === 'activa' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="mt-6 space-y-3"
                        >
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center">
                              <PhoneCall className="w-4 h-4 mr-2 text-blue-500" />
                              Controles de Llamada
                            </h5>
                          </div>
                          
                          {/* Escuchar llamada en tiempo real */}
                          {selectedCall.monitor_url ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => toggleAudioMonitoring(selectedCall.monitor_url)}
                                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center shadow-lg transition-all duration-200 ${
                                    isListeningLive
                                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/25'
                                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/25'
                                  }`}
                                >
                                  {isListeningLive ? (
                                    <>
                                      <VolumeX className="w-4 h-4 mr-2" />
                                      Detener Audio
                                    </>
                                  ) : (
                                    <>
                                      <Headphones className="w-4 h-4 mr-2" />
                                      Escuchar Llamada
                                    </>
                                  )}
                                </motion.button>
                                
                                {/* Toggle controles avanzados */}
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setShowAudioSettings(!showAudioSettings)}
                                  className={`p-2.5 rounded-xl transition-all duration-200 ${
                                    showAudioSettings 
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                  }`}
                                  title="Controles de volumen"
                                >
                                  <Waves className="w-4 h-4" />
                                </motion.button>
                              </div>
                              
                              {/* Controles de volumen por canal */}
                              <AnimatePresence>
                                {showAudioSettings && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-3">
                                      {/* Agente IA (0-10, donde 5=50%) - Canal Derecho */}
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 w-14">🤖 IA</span>
                                        <input
                                          type="range"
                                          min="0"
                                          max="10"
                                          step="1"
                                          value={iaSlider}
                                          onChange={(e) => setIaSlider(parseFloat(e.target.value))}
                                          className="flex-1 h-2 bg-blue-200 dark:bg-blue-900 rounded-full appearance-none cursor-pointer accent-blue-500"
                                          title={`IA: ${iaSlider}/10 (${Math.round(sliderToIAGain(iaSlider) * 100)}%)`}
                                        />
                                        <span className="text-xs text-gray-600 dark:text-gray-400 w-6 text-right">{iaSlider}</span>
                                      </div>
                                      
                                      {/* Cliente/Humano (1-10, donde 1=300%, 10=800%) - Canal Izquierdo */}
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 w-14">👤 Humano</span>
                                        <input
                                          type="range"
                                          min="1"
                                          max="10"
                                          step="1"
                                          value={humanSlider}
                                          onChange={(e) => setHumanSlider(parseFloat(e.target.value))}
                                          className="flex-1 h-2 bg-emerald-200 dark:bg-emerald-900 rounded-full appearance-none cursor-pointer accent-emerald-500"
                                          title={`Humano: ${humanSlider}/10 (${Math.round(sliderToHumanGain(humanSlider) * 100)}%)`}
                                        />
                                        <span className="text-xs text-gray-600 dark:text-gray-400 w-6 text-right">{humanSlider}</span>
                                      </div>
                                      
                                      {/* Info de referencia */}
                                      <p className="text-[10px] text-gray-500 dark:text-gray-500 text-center">
                                        IA: 5 = 50% • Humano: 1-10 = 300%-800%
                                      </p>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              
                              {/* Estado/Error */}
                              {audioError && (
                                <p className="text-xs text-red-500 dark:text-red-400 text-center">{audioError}</p>
                              )}
                              {isListeningLive && isLiveAudioPlaying && (
                                <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                  Reproduciendo audio en tiempo real
                                </div>
                              )}
                            </div>
                          ) : (
                          <motion.button
                            whileHover={{ scale: 1 }}
                            whileTap={{ scale: 1 }}
                            disabled
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center opacity-70 cursor-not-allowed"
                            title="Esperando URL de monitoreo..."
                          >
                            <Clock className="w-4 h-4 mr-2 animate-pulse" />
                            Obteniendo URL...
                          </motion.button>
                          )}

                          {/* Transferir llamada */}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleOpenTransferModal}
                            disabled={transferLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center shadow-lg shadow-blue-500/25 transition-all duration-200"
                          >
                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                            {transferLoading ? 'Transfiriendo...' : 'Solicitar Transferencia'}
                          </motion.button>

                        </motion.div>
                      )}
                      
                      {/* Mostrar feedback existente si ya lo tiene */}
                      {selectedCall.tiene_feedback && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.35 }}
                          className="mt-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800"
                        >
                          <div className="flex items-center space-x-2 mb-3">
                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <h5 className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                              Feedback Completado
                            </h5>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-emerald-200 dark:border-emerald-800">
                              <span className="text-emerald-700 dark:text-emerald-300">Resultado:</span>
                              <span className="font-medium text-emerald-800 dark:text-emerald-200">
                                {selectedCall.feedback_resultado}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-emerald-200 dark:border-emerald-800">
                              <span className="text-emerald-700 dark:text-emerald-300">Usuario:</span>
                              <span className="font-medium text-emerald-800 dark:text-emerald-200">
                                {selectedCall.feedback_user_email}
                              </span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-emerald-700 dark:text-emerald-300">Fecha:</span>
                              <span className="font-medium text-emerald-800 dark:text-emerald-200">
                                {selectedCall.feedback_fecha ? new Date(selectedCall.feedback_fecha).toLocaleString() : 'N/A'}
                              </span>
                            </div>
                            {selectedCall.feedback_comentarios && (
                              <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800">
                                <span className="text-emerald-700 dark:text-emerald-300 block mb-2">Comentarios:</span>
                                <p className="text-emerald-800 dark:text-emerald-200 p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-xs leading-relaxed">
                                  {selectedCall.feedback_comentarios}
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  </div>

                  
                  {/* Conversación en Tiempo Real - Solo para llamadas activas */}
                  {selectedCall.call_status === 'activa' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="mt-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center">
                          <MessageSquare className="w-4 h-4 mr-2 text-blue-500" />
                          Conversación en Tiempo Real
                        </h4>
                        <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 ml-auto">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
                          En vivo
                        </div>
                      </div>
                      
                      <div ref={conversationScrollRef} className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
                           onScroll={(e) => {
                             const el = e.currentTarget as HTMLDivElement;
                             const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                             userScrolledAwayInModalRef.current = distanceFromBottom > 120;
                           }}>
                        <div className="p-4 space-y-3">
                          {currentConversation.length > 0 ? (
                            currentConversation.map((msg, index) => (
                              <motion.div
                                key={`${msg.timestamp}-${index}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`flex ${msg.speaker === 'agente' ? 'justify-start' : 'justify-end'}`}
                              >
                                <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl transition-all duration-200 ${
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
                              </motion.div>
                            ))
                          ) : (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-center py-8"
                            >
                              <div className="flex items-center justify-center space-x-2 text-gray-500 dark:text-gray-400 mb-3">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Esperando conversación...
                              </p>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Transferencia */}
        <AnimatePresence>
          {showTransferModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-[90]"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowTransferModal(false);
                  // Reset estados al cerrar desde backdrop
                  setSelectedPresetReason('');
                  setCustomTransferMessage('');
                  setCustomTransferText('');
                  setTransferReason('');
                  setUseCustomText(false);
                  widgetTransferCallRef.current = null;
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
                        // Reset estados al cerrar
                        setSelectedPresetReason('');
                        setCustomTransferMessage('');
                        setCustomTransferText('');
                        setTransferReason('');
                        setUseCustomText(false);
                        setAutoGeneratedMessage(null);
                        setCustomMessageError(null);
                        widgetTransferCallRef.current = null;
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
                            setCustomTransferText('');
                            setTransferReason('');
                            setUseCustomText(false);
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
                      // Reset estados al cancelar
                      setSelectedPresetReason('');
                      setCustomTransferMessage('');
                      setCustomTransferText('');
                      setTransferReason('');
                      setUseCustomText(false);
                      setAutoGeneratedMessage(null);
                      setCustomMessageError(null);
                      widgetTransferCallRef.current = null;
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


        {/* Modal de Feedback Global */}
        <AnimatePresence>
          {showGlobalFeedbackModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-[80]"
              onClick={(e) => e.target === e.currentTarget && setShowGlobalFeedbackModal(false)}
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
                        {globalFeedbackType === 'contestada' && <CheckCircle className="w-6 h-6 mr-2 text-emerald-500" />}
                        {globalFeedbackType === 'perdida' && <XCircle className="w-6 h-6 mr-2 text-red-500" />}
                        {globalFeedbackType === 'transferida' && <ArrowRightLeft className="w-6 h-6 mr-2 text-blue-500" />}
                        {globalFeedbackType === 'colgada' && <RotateCcw className="w-6 h-6 mr-2 text-orange-500" />}
                        Feedback Obligatorio
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed"
                      >
                        {
                          globalFeedbackType === 'contestada' ? 'Llamada Contestada' :
                          globalFeedbackType === 'perdida' ? 'Llamada Perdida' :
                          globalFeedbackType === 'transferida' ? 'Llamada Transferida' :
                          globalFeedbackType === 'colgada' ? 'Llamada Finalizada' : 'Feedback'
                        }
                      </motion.p>
                    </div>
                    <motion.button
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      transition={{ delay: 0.2 }}
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setShowGlobalFeedbackModal(false);
                        setGlobalFeedbackType(null);
                        setGlobalFeedbackComment('');
                      }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-8 py-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6"
                  >
                    <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      <FileText className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <span>Comentarios sobre la llamada: *</span>
                    </label>
                    <textarea
                      value={globalFeedbackComment}
                      onChange={(e) => setGlobalFeedbackComment(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                      rows={4}
                      placeholder={
                        globalFeedbackType === 'transferida' ? 'Explica por qué se transfirió la llamada, contexto del prospecto, motivo específico...' :
                        globalFeedbackType === 'colgada' ? 'Explica por qué se finalizó la llamada, resultado obtenido, observaciones...' :
                        'Describe qué pasó en la llamada, calidad del prospecto, observaciones importantes...'
                      }
                      autoFocus
                    />
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
                      setShowGlobalFeedbackModal(false);
                      setGlobalFeedbackType(null);
                      setGlobalFeedbackComment('');
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
                    onClick={executeGlobalFeedback}
                    disabled={!globalFeedbackComment.trim()}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Guardar Feedback
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Finalización */}
        <FinalizationModal
          isOpen={showFinalizationModal}
          onClose={() => {
            setShowFinalizationModal(false);
            setCallToFinalize(null);
          }}
          onFinalize={handleCallFinalization}
          loading={finalizationLoading}
          callName={callToFinalize?.nombre_completo || callToFinalize?.nombre_whatsapp || 'sin nombre'}
        />

        {/* 
          ============================================
          SIDEBAR DEL PROSPECTO - AI CALL MONITOR
          ============================================
          Z-INDEX: z-[220] (backdrop) / z-[230] (sidebar)
          - Configurado para aparecer ENCIMA del CallDetailModalSidebar (z-[210])
          - Comportamiento ESPECIAL: ProspectoSidebar > CallDetailModalSidebar
          - Esto permite que al abrir una llamada desde el sidebar de prospecto,
            el CallDetailModalSidebar se abra debajo, y luego al hacer clic en el
            prospecto desde CallDetailModalSidebar, el ProspectoSidebar aparezca encima.
          ============================================
        */}
        {createPortal(
        <ProspectoSidebar
          prospecto={selectedProspecto}
          isOpen={showProspectoSidebar}
          onClose={() => setShowProspectoSidebar(false)}
          onOpenCallDetail={handleOpenCallDetail}
          zIndexBackdrop="z-[220]"
          zIndexSidebar="z-[230]"
          />,
          document.body
        )}
        
        {/* 
          ============================================
          SIDEBAR DE DETALLE DE LLAMADA - AI CALL MONITOR
          ============================================
          Z-INDEX: z-[200] (backdrop) / z-[210] (sidebar)
          - Configurado para aparecer DEBAJO del ProspectoSidebar (z-[230])
          - Comportamiento ESPECIAL: ProspectoSidebar > CallDetailModalSidebar
          - Esto permite el flujo: ProspectoSidebar → CallDetailModalSidebar → ProspectoSidebar
          ============================================
        */}
        {createPortal(
          <CallDetailModalSidebar
            callId={selectedCallId}
            isOpen={callDetailModalOpen}
            onClose={() => {
              setCallDetailModalOpen(false);
              setSelectedCallId(null);
            }}
            allCallsWithAnalysis={allCallsWithAnalysis}
            onProspectClick={(prospectId) => {
              // Si ya está abierto el sidebar del prospecto, no hacer nada
              if (selectedProspecto?.id === prospectId) {
                return;
              }
              // Cargar y abrir el sidebar del prospecto
              handleProspectoClick({ prospecto: prospectId } as any);
            }}
            onCallChange={(newCallId) => setSelectedCallId(newCallId)}
            zIndexBackdrop="z-[200]"
            zIndexSidebar="z-[210]"
          />,
          document.body
        )}

        {/* Modal de Parafraseo para Mensaje Personalizado */}
        <ParaphraseModal
          isOpen={showParaphraseModal}
          originalText={customTransferText || ''}
          context="transfer_request_message"
          onSelect={(paraphrasedText) => {
            // Solo guardar el mensaje si pasó la validación de IA
            setCustomTransferMessage(paraphrasedText);
            setShowParaphraseModal(false);
            setCustomTransferText(paraphrasedText);
          }}
          onCancel={() => {
            setShowParaphraseModal(false);
            // No limpiar customTransferText para que el usuario pueda intentar de nuevo
          }}
        />

        {/* 
          ============================================
          MODAL DE ANÁLISIS IA - AI CALL MONITOR
          ============================================
          Z-INDEX: z-[200] (backdrop) / z-[210] (sidebar)
          - Configurado para aparecer DEBAJO del ProspectoSidebar (z-[230])
          - Comportamiento ESPECIAL: ProspectoSidebar > CallDetailModalSidebar
          - Reemplaza el modal combinado de análisis IA + información de llamada
          ============================================
        */}
        {createPortal(
          <CallDetailModalSidebar
            callId={selectedCallForAnalysis?.call_id || null}
            isOpen={showAnalysisDetailModal}
            onClose={() => {
                            setShowAnalysisDetailModal(false);
                            setSelectedCallForAnalysis(null);
                            setTranscript([]);
              setModalTab('details');
            }}
            allCallsWithAnalysis={allCallsWithAnalysis}
            onProspectClick={(prospectId) => {
              handleProspectoClick({ prospecto: prospectId } as any);
            }}
            onCallChange={(newCallId) => {
              // Buscar la llamada en allCallsWithAnalysis y actualizar selectedCallForAnalysis
              const newCall = allCallsWithAnalysis.find((call: any) => call.call_id === newCallId);
              if (newCall) {
                setSelectedCallForAnalysis(newCall);
              }
            }}
            zIndexBackdrop="z-[200]"
            zIndexSidebar="z-[210]"
          />,
          document.body
                                )}
                              </div>
    </div>
  );
};

export default LiveMonitorKanban;
