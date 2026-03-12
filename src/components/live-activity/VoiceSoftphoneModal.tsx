/**
 * ============================================
 * MODAL SOFTPHONE - LLAMADA VOIP ACTIVA
 * ============================================
 *
 * Modal tipo softphone que se abre al contestar una llamada
 * transferida via Twilio Voice SDK.
 *
 * Tabs:
 * 1. Llamada: Contacto, info personal, preferencias viaje, propuesta
 * 2. Observaciones: Insight, situacion, objeciones, accion, pendientes
 * 3. Chat: Historial de mensajes WhatsApp del prospecto (mensajes_whatsapp)
 *
 * Features:
 * - Badge WhatsApp para identificar origen
 * - Mute = pausa mic + musica de espera (Web Audio API)
 * - Vista minimizable a barra flotante
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  User,
  MapPin,
  Clock,
  X,
  Minimize2,
  Maximize2,
  GripVertical,
  MessageSquare,
  Eye,
  Music,
  Mail,
  Users,
  Plane,
  Calendar,
  Heart,
  Thermometer,
  AlertTriangle,
  Lightbulb,
  Target,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Image as ImageIcon,
  ArrowRightLeft
} from 'lucide-react';
import type { WidgetCallData } from '../../stores/liveActivityStore';
import { analysisSupabase } from '../../config/analysisSupabase';

// ============================================
// HOLD MUSIC ENGINE (Web Audio API)
// ============================================

interface HoldMusicEngine {
  audioCtx: AudioContext;
  masterGain: GainNode;
  oscillators: OscillatorNode[];
  lfo: OscillatorNode;
}

function createHoldMusic(): HoldMusicEngine | null {
  try {
    const audioCtx = new AudioContext();
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.12;
    masterGain.connect(audioCtx.destination);

    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    lfo.start();

    const oscillators: OscillatorNode[] = [];
    const frequencies = [130.81, 164.81, 196.00, 246.94];
    frequencies.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const oscGain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = (i - 1.5) * 3;
      oscGain.gain.value = i === 0 ? 0.35 : 0.2;
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start();
      oscillators.push(osc);
    });

    const highOsc = audioCtx.createOscillator();
    const highGain = audioCtx.createGain();
    highOsc.type = 'sine';
    highOsc.frequency.value = 523.25;
    highGain.gain.value = 0.08;
    highOsc.connect(highGain);
    highGain.connect(masterGain);
    highOsc.start();
    oscillators.push(highOsc);

    return { audioCtx, masterGain, oscillators, lfo };
  } catch {
    return null;
  }
}

function stopHoldMusic(engine: HoldMusicEngine | null) {
  if (!engine) return;
  try {
    engine.oscillators.forEach(osc => { try { osc.stop(); } catch { /* */ } });
    try { engine.lfo.stop(); } catch { /* */ }
    engine.audioCtx.close();
  } catch { /* */ }
}

// ============================================
// OBSERVACIONES PARSER
// ============================================

interface ParsedObservaciones {
  insight?: string;
  situacion?: string;
  objeciones?: string;
  accion?: string;
  pendientes?: string;
  raw?: string;
}

function parseObservaciones(text?: string): ParsedObservaciones {
  if (!text) return {};

  // Limpiar markdown bold (**) y convertir \n literales a newlines reales
  let clean = text.replace(/\*\*/g, '');
  clean = clean.replace(/\\n/g, '\n');

  const upper = clean.toUpperCase();
  const hasStructured = ['INSIGHT', 'SITUACION', 'SITUACIÓN', 'OBJECIONES', 'ACCION', 'ACCIÓN', 'PENDIENTES']
    .some(s => upper.includes(s));

  if (!hasStructured) return { raw: clean };

  const sections: ParsedObservaciones = {};
  const headers = 'INSIGHT|SITUACI[OÓ]N|OBJECIONES|ACCI[OÓ]N|PENDIENTES';
  const sectionPatterns: { key: keyof ParsedObservaciones; pattern: RegExp }[] = [
    { key: 'insight', pattern: new RegExp(`INSIGHT\\s*\\n([\\s\\S]*?)(?=\\n(?:${headers})|$)`, 'i') },
    { key: 'situacion', pattern: new RegExp(`SITUACI[OÓ]N\\s*\\n([\\s\\S]*?)(?=\\n(?:${headers})|$)`, 'i') },
    { key: 'objeciones', pattern: new RegExp(`OBJECIONES\\s*\\n([\\s\\S]*?)(?=\\n(?:${headers})|$)`, 'i') },
    { key: 'accion', pattern: new RegExp(`ACCI[OÓ]N\\s*\\n([\\s\\S]*?)(?=\\n(?:${headers})|$)`, 'i') },
    { key: 'pendientes', pattern: new RegExp(`PENDIENTES\\s*\\n([\\s\\S]*?)(?=\\n(?:${headers})|$)`, 'i') },
  ];
  for (const { key, pattern } of sectionPatterns) {
    const match = clean.match(pattern);
    if (match?.[1]) sections[key] = match[1].trim();
  }
  return sections;
}

// ============================================
// WHATSAPP MESSAGE TYPE
// ============================================

interface WhatsAppMsg {
  id: string;
  mensaje: string | null;
  rol: string; // 'Prospecto', 'Plantilla', 'AI', or agent name
  fecha_hora: string;
  adjuntos: Record<string, unknown> | null;
  status_delivery?: string | null;
}

// ============================================
// TYPES
// ============================================

type SoftphoneTab = 'llamada' | 'observaciones' | 'chat';

export interface VoiceSoftphoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: WidgetCallData | null;
  /** @deprecated Use tipoLlamada instead */
  isWhatsAppCall?: boolean;
  tipoLlamada?: string | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onHangup: () => void;
  onTransfer?: () => void;
  canTransfer?: boolean;
  hasIncomingCall?: boolean;
  onAcceptCall?: () => void;
  onRejectCall?: () => void;
  // Warm transfer conference mode
  isInConference?: boolean;
  warmTransferTargetName?: string;
  onCompleteTransfer?: () => void;
  onCancelTransfer?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export const VoiceSoftphoneModal: React.FC<VoiceSoftphoneModalProps> = ({
  isOpen,
  onClose,
  call,
  isWhatsAppCall = true,
  tipoLlamada: tipoLlamadaProp,
  isMuted,
  onToggleMute,
  onHangup,
  onTransfer,
  canTransfer = false,
  hasIncomingCall = false,
  onAcceptCall,
  onRejectCall,
  isInConference = false,
  warmTransferTargetName,
  onCompleteTransfer,
  onCancelTransfer,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<SoftphoneTab>('llamada');
  const [isOnHold, setIsOnHold] = useState(false);
  const holdMusicRef = useRef<HoldMusicEngine | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const constraintRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // WhatsApp messages state
  const [whatsappMsgs, setWhatsappMsgs] = useState<WhatsAppMsg[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [msgsLoaded, setMsgsLoaded] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const parsedObs = useMemo(() => parseObservaciones(call?.observaciones), [call?.observaciones]);
  const prospectName = call?.nombre_completo || call?.nombre_whatsapp || 'Prospecto';

  // Determinar tipo de llamada para badges/labels
  const tipoLlamada = tipoLlamadaProp ?? call?.tipo_llamada ?? null;
  const isOutboundTransfer = tipoLlamada === 'outbound_transfer';
  const isTransfer = tipoLlamada === 'transfer';
  const isInboundWhatsApp = tipoLlamada === 'inbound_whatsapp' || (isWhatsAppCall && !isOutboundTransfer);

  const formatMsgDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  // Agrupar mensajes por fecha (debe estar antes del early return)
  const groupedMsgs = useMemo(() => {
    const groups: { date: string; messages: WhatsAppMsg[] }[] = [];
    let currentDate = '';
    for (const msg of whatsappMsgs) {
      const date = formatMsgDate(msg.fecha_hora);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  }, [whatsappMsgs]);

  // Timer
  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      setIsMinimized(false);
      setActiveTab('llamada');
      setIsOnHold(false);
      setMsgsLoaded(false);
      setWhatsappMsgs([]);
      stopHoldMusic(holdMusicRef.current);
      holdMusicRef.current = null;
      return;
    }
    const interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Cargar mensajes WhatsApp cuando se abre el tab chat
  useEffect(() => {
    if (activeTab !== 'chat' || msgsLoaded || !call?.prospecto_id || !analysisSupabase) return;

    const loadMessages = async () => {
      setMsgsLoading(true);
      try {
        const { data, error } = await analysisSupabase
          .from('mensajes_whatsapp')
          .select('id, mensaje, rol, fecha_hora, adjuntos, status_delivery')
          .eq('prospecto_id', call.prospecto_id)
          .order('fecha_hora', { ascending: true })
          .limit(100);

        if (error) {
          console.error('[Softphone] Error loading messages:', error);
        } else {
          setWhatsappMsgs(data || []);
        }
      } catch (e) {
        console.error('[Softphone] Error:', e);
      } finally {
        setMsgsLoading(false);
        setMsgsLoaded(true);
      }
    };

    loadMessages();
  }, [activeTab, msgsLoaded, call?.prospecto_id]);

  // Auto-scroll chat al cargar
  useEffect(() => {
    if (chatScrollRef.current && whatsappMsgs.length > 0) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [whatsappMsgs]);

  // Cleanup hold music
  useEffect(() => {
    return () => {
      stopHoldMusic(holdMusicRef.current);
      holdMusicRef.current = null;
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMsgTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleHangup = useCallback(() => {
    stopHoldMusic(holdMusicRef.current);
    holdMusicRef.current = null;
    setIsOnHold(false);
    onHangup();
    onClose();
  }, [onHangup, onClose]);

  // Mute = pausa mic + hold music
  const handleToggleMute = useCallback(() => {
    onToggleMute();
    if (!isMuted) {
      holdMusicRef.current = createHoldMusic();
      setIsOnHold(true);
    } else {
      stopHoldMusic(holdMusicRef.current);
      holdMusicRef.current = null;
      setIsOnHold(false);
    }
  }, [isMuted, onToggleMute]);

  // Click fuera del panel = colapsar a burbuja
  useEffect(() => {
    if (!isOpen || isMinimized || !call) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsMinimized(true);
      }
    };

    // Delay para no disparar inmediatamente al abrir
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 300);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isMinimized, call]);

  // Cambio de ventana, resize, o blur = colapsar a burbuja
  useEffect(() => {
    if (!isOpen || isMinimized || !call) return;

    const goToBubble = () => setIsMinimized(true);

    const handleVisibility = () => {
      if (document.hidden) goToBubble();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', goToBubble);
    window.addEventListener('resize', goToBubble);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', goToBubble);
      window.removeEventListener('resize', goToBubble);
    };
  }, [isOpen, isMinimized, call]);

  if (!isOpen || !call) return null;

  // Temperatura badge
  const tempConfig: Record<string, { label: string; color: string; bg: string }> = {
    frio: { label: 'Frio', color: 'text-blue-400', bg: 'bg-blue-500/15' },
    tibio: { label: 'Tibio', color: 'text-amber-400', bg: 'bg-amber-500/15' },
    caliente: { label: 'Caliente', color: 'text-red-400', bg: 'bg-red-500/15' },
  };
  const temp = call.temperatura_prospecto ? tempConfig[call.temperatura_prospecto] : null;

  const tabs: { id: SoftphoneTab; label: string; icon: React.ReactNode; badge?: boolean }[] = [
    { id: 'llamada', label: 'Llamada', icon: <Phone className="w-3.5 h-3.5" /> },
    { id: 'observaciones', label: 'Notas', icon: <Eye className="w-3.5 h-3.5" />, badge: !!call.observaciones },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ];

  // Determinar si un mensaje es del prospecto
  const isProspectMsg = (rol: string) => rol === 'Prospecto';

  // ---- Vista minimizada (burbuja con heartbeat) ----
  if (isMinimized) {
    return createPortal(
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.8 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto"
      >
        {/* Heartbeat ring */}
        <motion.div
          className={`absolute inset-0 rounded-2xl ${isOnHold ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div
          className={`relative flex items-center gap-3 backdrop-blur-xl border rounded-2xl px-5 py-3 shadow-2xl shadow-black/40 cursor-pointer transition-colors ${
            isOnHold
              ? 'bg-gray-900/95 border-amber-500/40 hover:border-amber-400/60'
              : 'bg-gray-900/95 border-emerald-500/40 hover:border-emerald-400/60'
          }`}
          onClick={() => setIsMinimized(false)}
        >
          {/* Pulsing dot */}
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnHold ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isOnHold ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          </span>

          {isOutboundTransfer ? (
            <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-bold">OUT</span>
          ) : isTransfer ? (
            <span className="bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded text-[10px] font-bold">TRF</span>
          ) : isInboundWhatsApp ? (
            <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold">WA</span>
          ) : null}

          <span className="text-white font-medium text-sm max-w-[140px] truncate">{prospectName}</span>
          <span className="text-gray-400 font-mono text-sm">{formatDuration(callDuration)}</span>

          {isOnHold && (
            <span className="flex items-center gap-1 text-amber-400 text-xs">
              <Music className="w-3 h-3 animate-pulse" />
            </span>
          )}

          {hasIncomingCall && onAcceptCall ? (
            <>
              <button onClick={(e) => { e.stopPropagation(); onRejectCall?.(); }} className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all">
                <PhoneOff className="w-4 h-4" />
              </button>
              <motion.button
                onClick={(e) => { e.stopPropagation(); onAcceptCall(); }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all"
              >
                <Phone className="w-4 h-4" />
              </motion.button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleMute(); }}
                className={`p-2 rounded-xl transition-all ${
                  isMuted ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleHangup(); }} className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all">
                <PhoneOff className="w-4 h-4" />
              </button>
            </>
          )}

          <button onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }} className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all" title="Expandir">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>,
      document.body
    );
  }

  // ---- Vista completa (panel flotante draggable) ----
  return createPortal(
    <>
      {/* Backdrop overlay con blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[89] bg-black/40 backdrop-blur-sm"
        onClick={() => setIsMinimized(true)}
      />
      <div ref={constraintRef} className="fixed inset-0 z-[90] pointer-events-none overflow-hidden">
      <motion.div
        ref={panelRef}
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0.05}
        dragConstraints={constraintRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="pointer-events-auto absolute w-[420px] max-h-[85vh] bg-gray-900/98 backdrop-blur-xl border border-gray-700/60 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col"
        style={{ top: '4%', left: 'calc(50% - 380px)' }}
      >
          {/* ---- HEADER (drag handle) ---- */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className={`relative bg-gradient-to-b ${isOnHold ? 'from-amber-900/40' : 'from-emerald-900/40'} to-transparent px-5 pt-4 pb-3 transition-colors duration-500 cursor-grab active:cursor-grabbing select-none`}
          >
            {/* Drag indicator + window controls */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-600" />
                {isOutboundTransfer ? (
                  <span className="inline-flex items-center gap-1 bg-blue-500/15 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                    <Phone className="w-3 h-3" />
                    Outbound
                  </span>
                ) : isTransfer ? (
                  <span className="inline-flex items-center gap-1 bg-purple-500/15 border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                    <ArrowRightLeft className="w-3 h-3" />
                    Transferencia
                  </span>
                ) : isInboundWhatsApp ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                    <MessageSquare className="w-3 h-3" />
                    WhatsApp
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setIsMinimized(true)}
                  className="p-1 bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white rounded-md transition-all"
                  title="Minimizar"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setIsMinimized(true)}
                  className="p-1 bg-gray-800/60 hover:bg-red-600/80 text-gray-400 hover:text-white rounded-md transition-all"
                  title="Cerrar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Compact header: avatar + info + timer */}
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 transition-all duration-500 ${
                isOnHold
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20'
                  : 'bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-emerald-500/20'
              }`}>
                {isOnHold ? <Music className="w-5 h-5 text-white animate-pulse" /> : <User className="w-5 h-5 text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{prospectName}</h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {call.whatsapp && (
                    <span className="text-gray-500 text-[11px]">{call.whatsapp}</span>
                  )}
                  {call.ciudad_residencia && (
                    <span className="flex items-center gap-0.5 text-gray-500 text-[11px]">
                      <MapPin className="w-3 h-3" />{call.ciudad_residencia}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnHold ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnHold ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  </span>
                  <span className={`text-xs font-semibold ${isInConference ? 'text-cyan-400' : isOnHold ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {isInConference ? 'Conferencia' : isOnHold ? 'Espera' : 'Activa'}
                  </span>
                </div>
                <span className="font-mono text-base font-semibold text-gray-300">{formatDuration(callDuration)}</span>
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {call.ejecutivo_nombre && (
                <span className="bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-medium">{call.ejecutivo_nombre}</span>
              )}
              {call.checkpoint_venta_actual && (
                <span className="bg-blue-500/15 text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-medium">{call.checkpoint_venta_actual}</span>
              )}
              {temp && (
                <span className={`${temp.bg} ${temp.color} px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5`}>
                  <Thermometer className="w-2.5 h-2.5" />{temp.label}
                </span>
              )}
              {call.etapa && (
                <span className="bg-purple-500/15 text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-medium">{call.etapa}</span>
              )}
            </div>
          </div>

          {/* ---- CONTROLES (siempre visibles) ---- */}
          <div className="px-6 py-3 border-b border-gray-800/60">
            {hasIncomingCall && onAcceptCall ? (
              /* Incoming: Aceptar / Rechazar */
              <div className="flex items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={onRejectCall}
                    className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all shadow-xl shadow-red-500/40 text-white"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                  <span className="text-[11px] text-red-400">Rechazar</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <motion.button
                    onClick={onAcceptCall}
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center transition-all shadow-xl shadow-emerald-500/40 text-white"
                  >
                    <Phone className="w-7 h-7" />
                  </motion.button>
                  <span className="text-[11px] text-emerald-400 font-semibold">Aceptar</span>
                </div>
              </div>
            ) : isInConference ? (
              /* Conference mode: Completar / Cancelar / Colgar */
              <div className="space-y-3">
                {/* Conference indicator */}
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center justify-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-3 py-2"
                >
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-cyan-300 text-xs font-medium">
                    En conferencia con <span className="font-bold">{warmTransferTargetName}</span>
                  </span>
                  <span className="relative flex h-2 w-2 ml-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                  </span>
                </motion.div>

                <p className="text-[11px] text-gray-500 text-center">
                  El prospecto esta en espera. Briefea al destino y completa la transferencia.
                </p>

                <div className="flex items-center justify-center gap-4">
                  {/* Cancelar transferencia */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={onCancelTransfer}
                      className="w-14 h-14 rounded-full bg-gray-700 hover:bg-red-600/80 flex items-center justify-center transition-all shadow-lg text-gray-300 hover:text-white border border-gray-600 hover:border-red-500/50"
                      title="Cancelar transferencia (reconectar con prospecto)"
                    >
                      <X className="w-6 h-6" />
                    </button>
                    <span className="text-[11px] text-gray-500">Cancelar</span>
                  </div>

                  {/* Completar transferencia */}
                  <div className="flex flex-col items-center gap-1">
                    <motion.button
                      onClick={onCompleteTransfer}
                      animate={{ boxShadow: ['0 0 0 0 rgba(16, 185, 129, 0)', '0 0 0 8px rgba(16, 185, 129, 0.15)', '0 0 0 0 rgba(16, 185, 129, 0)'] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-[64px] h-[64px] rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center transition-all shadow-xl shadow-emerald-500/40 text-white"
                      title="Completar transferencia (conectar prospecto con destino)"
                    >
                      <CheckCircle2 className="w-7 h-7" />
                    </motion.button>
                    <span className="text-[11px] text-emerald-400 font-semibold">Completar</span>
                  </div>

                  {/* Colgar (emergencia) */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={handleHangup}
                      className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all shadow-lg shadow-red-500/30 text-white"
                      title="Colgar llamada"
                    >
                      <PhoneOff className="w-6 h-6" />
                    </button>
                    <span className="text-[11px] text-red-400">Colgar</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Activa: Mute / Transfer / Colgar */
              <div className="flex items-center justify-center gap-5">
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={handleToggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                      isMuted
                        ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/30 text-white ring-2 ring-amber-400/40'
                        : 'bg-gray-700 hover:bg-gray-600 shadow-gray-700/30 text-white'
                    }`}
                    title={isMuted ? 'Quitar espera' : 'Pausar (musica de espera)'}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>
                  <span className={`text-[11px] ${isMuted ? 'text-amber-400 font-semibold' : 'text-gray-500'}`}>
                    {isMuted ? 'En espera' : 'Pausar'}
                  </span>
                </div>

                {canTransfer && onTransfer && (
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={onTransfer}
                      className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center transition-all shadow-lg shadow-blue-500/30 text-white"
                      title="Transferir llamada"
                    >
                      <ArrowRightLeft className="w-6 h-6" />
                    </button>
                    <span className="text-[11px] text-blue-400">Transferir</span>
                  </div>
                )}

                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={handleHangup}
                    className="w-[64px] h-[64px] rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all shadow-xl shadow-red-500/40 hover:shadow-red-500/60 text-white"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                  <span className="text-[11px] text-red-400">Colgar</span>
                </div>
              </div>
            )}

            {isOnHold && !isInConference && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2"
              >
                <Music className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="text-amber-300 text-xs font-medium">Musica de espera activa</span>
                <div className="flex items-end gap-0.5 h-3.5 ml-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <motion.div
                      key={i}
                      className="w-0.5 bg-amber-400/60 rounded-full"
                      animate={{ height: ['3px', `${6 + Math.random() * 6}px`, '3px'] }}
                      transition={{ duration: 0.6 + i * 0.1, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* ---- TABS ---- */}
          <div className="flex border-b border-gray-800/80 px-3">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 relative ${
                  activeTab === tab.id
                    ? 'text-white border-emerald-500'
                    : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge && activeTab !== tab.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-2 right-2" />
                )}
              </button>
            ))}
          </div>

          {/* ---- TAB CONTENT ---- */}
          <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[45vh] scrollbar-ultra-thin">
            <AnimatePresence mode="wait">
              {/* ===== TAB LLAMADA ===== */}
              {activeTab === 'llamada' && (
                <motion.div
                  key="tab-llamada"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="px-5 py-4 space-y-4"
                >
                  <div>
                    <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Contacto</h4>
                    <div className="space-y-1.5">
                      <InfoRow icon={<Phone className="w-4 h-4 text-emerald-500" />} value={call.whatsapp} label="WhatsApp" />
                      {call.telefono_principal && call.telefono_principal !== call.whatsapp && (
                        <InfoRow icon={<Phone className="w-4 h-4 text-gray-500" />} value={call.telefono_principal} label="Telefono" />
                      )}
                      <InfoRow icon={<Mail className="w-4 h-4 text-gray-500" />} value={call.email} label="Email" />
                      <InfoRow icon={<MapPin className="w-4 h-4 text-gray-500" />} value={call.ciudad_residencia} label="Ciudad" />
                    </div>
                  </div>

                  {(call.estado_civil || call.edad) && (
                    <div>
                      <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Personal</h4>
                      <div className="space-y-1.5">
                        <InfoRow icon={<Heart className="w-4 h-4 text-pink-500" />} value={call.estado_civil} label="Estado civil" />
                        {call.edad && <InfoRow icon={<User className="w-4 h-4 text-gray-500" />} value={`${call.edad} años`} label="Edad" />}
                      </div>
                    </div>
                  )}

                  {(call.destino_preferido || call.destino_preferencia?.length || call.viaja_con || call.tamano_grupo || call.composicion_familiar_numero || call.numero_noches || call.mes_preferencia) && (
                    <div>
                      <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Viaje</h4>
                      <div className="space-y-1.5">
                        <InfoRow icon={<Plane className="w-4 h-4 text-blue-400" />} value={call.destino_preferido || call.destino_preferencia?.join(', ')} label="Destino" />
                        <InfoRow icon={<Users className="w-4 h-4 text-gray-500" />} value={call.viaja_con} label="Viaja con" />
                        {(call.tamano_grupo || call.composicion_familiar_numero) && (
                          <InfoRow icon={<Users className="w-4 h-4 text-gray-500" />} value={`${call.tamano_grupo || call.composicion_familiar_numero} personas`} label="Grupo" />
                        )}
                        {call.numero_noches && <InfoRow icon={<Calendar className="w-4 h-4 text-gray-500" />} value={`${call.numero_noches} noches`} label="Noches" />}
                        <InfoRow icon={<Calendar className="w-4 h-4 text-gray-500" />} value={call.mes_preferencia} label="Mes" />
                      </div>
                    </div>
                  )}

                  {call.propuesta_economica_ofrecida && (
                    <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/15">
                      <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Propuesta</h4>
                      <span className="text-xl font-bold text-emerald-400">${call.propuesta_economica_ofrecida.toLocaleString()}</span>
                      <span className="text-emerald-400/60 text-xs ml-1">USD</span>
                      {call.resort_ofertado && <p className="text-xs text-gray-400 mt-1">{call.resort_ofertado}</p>}
                      {call.habitacion_ofertada && <p className="text-xs text-gray-400">{call.habitacion_ofertada}</p>}
                    </div>
                  )}

                  {!call.whatsapp && !call.email && !call.estado_civil && !call.destino_preferido && (
                    <div className="text-center py-4">
                      <User className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Sin datos del prospecto aun</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ===== TAB OBSERVACIONES ===== */}
              {activeTab === 'observaciones' && (
                <motion.div
                  key="tab-obs"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="px-5 py-4 space-y-3"
                >
                  {parsedObs.insight && (
                    <ObsSection icon={<Lightbulb className="w-4 h-4 text-yellow-400" />} title="Insight" text={parsedObs.insight} color="yellow" />
                  )}
                  {parsedObs.situacion && (
                    <ObsSection icon={<FileText className="w-4 h-4 text-blue-400" />} title="Situacion" text={parsedObs.situacion} color="blue" />
                  )}
                  {parsedObs.objeciones && (
                    <ObsSection icon={<AlertTriangle className="w-4 h-4 text-amber-400" />} title="Objeciones" text={parsedObs.objeciones} color="amber" />
                  )}
                  {parsedObs.accion && (
                    <ObsSection icon={<Target className="w-4 h-4 text-emerald-400" />} title="Accion" text={parsedObs.accion} color="emerald" />
                  )}
                  {parsedObs.pendientes && (
                    <ObsSection icon={<CheckCircle2 className="w-4 h-4 text-purple-400" />} title="Pendientes" text={parsedObs.pendientes} color="purple" />
                  )}
                  {parsedObs.raw && (
                    <div className="bg-gray-800/40 rounded-xl p-3 border border-gray-700/40">
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{parsedObs.raw}</p>
                    </div>
                  )}

                  {call.resumen_llamada && (
                    <div>
                      <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5" />Resumen IA (esta llamada)
                      </h4>
                      <p className="text-sm text-gray-300 leading-relaxed bg-gray-800/40 rounded-xl p-3 border border-gray-700/40">{call.resumen_llamada}</p>
                    </div>
                  )}

                  {!call.observaciones && !call.resumen_llamada && (
                    <div className="text-center py-8">
                      <Eye className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Sin observaciones registradas</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ===== TAB CHAT (Mensajes WhatsApp) ===== */}
              {activeTab === 'chat' && (
                <motion.div
                  key="tab-chat"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col h-full"
                >
                  <div className="px-5 py-2 flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Mensajes WhatsApp
                    </h4>
                    {whatsappMsgs.length > 0 && (
                      <span className="text-[11px] text-gray-600">{whatsappMsgs.length} msgs</span>
                    )}
                  </div>

                  <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 scrollbar-ultra-thin">
                    {msgsLoading ? (
                      <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2 opacity-40" />
                        <p className="text-sm">Cargando mensajes...</p>
                      </div>
                    ) : whatsappMsgs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                        <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                        <p className="text-sm font-medium">Sin mensajes</p>
                        <p className="text-xs text-gray-600 mt-1">No hay historial de WhatsApp</p>
                      </div>
                    ) : (
                      groupedMsgs.map((group, gi) => (
                        <div key={gi}>
                          {/* Date separator */}
                          <div className="flex items-center justify-center my-2">
                            <span className="bg-gray-800/80 text-gray-500 text-[10px] px-3 py-0.5 rounded-full font-medium">
                              {group.date}
                            </span>
                          </div>

                          {group.messages.map((msg) => {
                            const fromProspect = isProspectMsg(msg.rol);
                            const hasAttachment = msg.adjuntos && Object.keys(msg.adjuntos).length > 0;

                            return (
                              <div key={msg.id} className={`flex ${fromProspect ? 'justify-start' : 'justify-end'} mb-1`}>
                                <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                                  fromProspect
                                    ? 'bg-gray-800/60 rounded-tl-sm'
                                    : 'bg-emerald-700/30 rounded-tr-sm'
                                }`}>
                                  {/* Sender label */}
                                  {!fromProspect && (
                                    <p className="text-[10px] text-emerald-400/70 font-medium mb-0.5">
                                      {msg.rol === 'AI' ? 'IA' : msg.rol === 'Plantilla' ? 'Plantilla' : msg.rol}
                                    </p>
                                  )}

                                  {/* Attachment indicator */}
                                  {hasAttachment && (
                                    <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
                                      <ImageIcon className="w-3 h-3" />
                                      <span>Adjunto</span>
                                    </div>
                                  )}

                                  {/* Message text */}
                                  {msg.mensaje && (
                                    <p className={`text-sm leading-relaxed ${fromProspect ? 'text-gray-300' : 'text-emerald-100/90'}`}>
                                      {msg.mensaje}
                                    </p>
                                  )}

                                  {/* Time + delivery status */}
                                  <div className={`flex items-center justify-end gap-1 mt-0.5 ${fromProspect ? 'text-gray-600' : 'text-emerald-400/40'}`}>
                                    <span className="text-[10px]">{formatMsgTime(msg.fecha_hora)}</span>
                                    {!fromProspect && msg.status_delivery && (
                                      <span className="text-[9px]">
                                        {msg.status_delivery === 'read' ? '✓✓' : msg.status_delivery === 'delivered' ? '✓✓' : msg.status_delivery === 'sent' ? '✓' : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
      </motion.div>
    </div>
    </>,
    document.body
  );
};

// ---- Helpers ----

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string | null }> = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className="flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider">{label}</span>
        <p className="text-sm text-gray-300 truncate">{value}</p>
      </div>
    </div>
  );
};

const ObsSection: React.FC<{ icon: React.ReactNode; title: string; text: string; color: string }> = ({ icon, title, text, color }) => {
  const bgMap: Record<string, string> = {
    yellow: 'bg-yellow-500/5 border-yellow-500/15',
    blue: 'bg-blue-500/5 border-blue-500/15',
    amber: 'bg-amber-500/5 border-amber-500/15',
    emerald: 'bg-emerald-500/5 border-emerald-500/15',
    purple: 'bg-purple-500/5 border-purple-500/15',
  };
  const textMap: Record<string, string> = {
    yellow: 'text-yellow-200/80',
    blue: 'text-blue-200/80',
    amber: 'text-amber-200/80',
    emerald: 'text-emerald-200/80',
    purple: 'text-purple-200/80',
  };
  return (
    <div className={`rounded-xl p-3 border ${bgMap[color] || bgMap.blue}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{title}</span>
      </div>
      <p className={`text-sm leading-relaxed ${textMap[color] || textMap.blue}`}>{text}</p>
    </div>
  );
};

export default VoiceSoftphoneModal;
