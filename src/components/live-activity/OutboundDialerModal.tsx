/**
 * ============================================
 * MODAL SOFTPHONE - MARCACION SALIENTE
 * ============================================
 *
 * Modal tipo softphone para iniciar llamadas salientes.
 * Visualmente IDENTICO al VoiceSoftphoneModal.
 *
 * Features:
 * - Busqueda de prospectos filtrada por permisos
 * - Dialer con teclado numerico
 * - Simulacion de llamada con controles (hold, transfer, conference)
 * - Draggable dentro de la pantalla
 * - "Funcion en desarrollo" al marcar
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  PhoneOutgoing,
  Mic,
  MicOff,
  User,
  MapPin,
  X,
  Minimize2,
  Maximize2,
  GripVertical,
  Search,
  Hash,
  Delete,
  MessageSquare,
  ArrowRightLeft,
  Users,
  Loader2,
  Construction,
  Music,
  Mail,
  Heart,
  Plane,
  Calendar,
  Eye,
  Lightbulb,
  FileText,
  AlertTriangle,
  Target,
  CheckCircle2,
  ClipboardList,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { analysisSupabase } from '../../config/analysisSupabase';

// ============================================
// TYPES
// ============================================

interface ProspectoResult {
  id: string;
  nombre_completo: string;
  whatsapp: string | null;
  telefono_principal: string | null;
  email: string | null;
  ciudad_residencia: string | null;
  etapa: string | null;
  ejecutivo_id: string | null;
  ejecutivo_nombre?: string | null;
  estado_civil?: string | null;
  edad?: number | null;
  viaja_con?: string | null;
  tamano_grupo?: number | null;
  destino_preferencia?: string[] | null;
  observaciones?: string | null;
  score?: number | null;
}

interface WhatsAppMsg {
  id: string;
  mensaje: string | null;
  rol: string;
  fecha_hora: string;
  adjuntos: Record<string, unknown> | null;
  status_delivery?: string | null;
}

interface ParsedObservaciones {
  insight?: string;
  situacion?: string;
  objeciones?: string;
  accion?: string;
  pendientes?: string;
  raw?: string;
}

function parseObservaciones(text?: string | null): ParsedObservaciones {
  if (!text) return {};
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
// SOUND ENGINE (Web Audio API)
// ============================================

/** DTMF-like tone for dialer keypresses */
function playDTMF(digit: string) {
  // Standard DTMF frequency pairs (row + col)
  const freqMap: Record<string, [number, number]> = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
    '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
  };
  const freqs = freqMap[digit];
  if (!freqs) return;
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    gain.connect(ctx.destination);
    freqs.forEach(f => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    });
    setTimeout(() => ctx.close(), 200);
  } catch { /* silent */ }
}

/** Ringing tone — soft dual-tone ring, 1s on / 3s off */
interface RingingEngine {
  ctx: AudioContext;
  intervalId: ReturnType<typeof setInterval>;
}

function startRinging(): RingingEngine | null {
  try {
    const ctx = new AudioContext();

    const playRingBurst = () => {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, ctx.currentTime + 0.4);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      gain.connect(ctx.destination);

      // Two gentle sine tones (440Hz + 480Hz = US ring)
      [440, 480].forEach(f => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        osc.connect(gain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      });

      // Second burst after brief pause
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0, ctx.currentTime + 0.6);
      gain2.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.65);
      gain2.gain.setValueAtTime(0.08, ctx.currentTime + 1.0);
      gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.1);
      gain2.connect(ctx.destination);

      [440, 480].forEach(f => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        osc.connect(gain2);
        osc.start(ctx.currentTime + 0.6);
        osc.stop(ctx.currentTime + 1.1);
      });
    };

    playRingBurst();
    const intervalId = setInterval(playRingBurst, 4000);

    return { ctx, intervalId };
  } catch {
    return null;
  }
}

function stopRinging(engine: RingingEngine | null) {
  if (!engine) return;
  try {
    clearInterval(engine.intervalId);
    engine.ctx.close();
  } catch { /* silent */ }
}

/** Connected chime — two ascending soft tones */
function playConnectedChime() {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    gain.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 523.25; // C5
    osc1.connect(gain);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.07, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    gain2.connect(ctx.destination);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 659.25; // E5
    osc2.connect(gain2);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.4);

    setTimeout(() => ctx.close(), 600);
  } catch { /* silent */ }
}

/** Hangup tone — soft descending tone */
function playHangupTone() {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);

    setTimeout(() => ctx.close(), 500);
  } catch { /* silent */ }
}

/** Hold music — same as VoiceSoftphoneModal */
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
    [130.81, 164.81, 196.00, 246.94].forEach((freq, i) => {
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

type DialerState = 'idle' | 'dialing' | 'connected' | 'ended';
type DialerTab = 'buscar' | 'teclado';
type CallTab = 'llamada' | 'observaciones' | 'chat';

export interface OutboundDialerModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedProspecto?: {
    id: string;
    nombre: string;
    telefono: string;
  } | null;
  callType?: 'whatsapp' | 'telefonica';
}

// ============================================
// DIALER PAD (inline)
// ============================================

const DIALER_DIGITS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

// ============================================
// PROSPECT SEARCH (inline)
// ============================================

const ProspectSearch: React.FC<{
  onSelect: (p: ProspectoResult) => void;
  userId: string;
  roleName: string;
  coordinacionesIds: string[];
}> = ({ onSelect, userId, roleName, coordinacionesIds }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProspectoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchProspectos = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) { setResults([]); return; }
    setIsSearching(true);
    try {
      let q = analysisSupabase
        .from('prospectos')
        .select('id, nombre_completo, whatsapp, telefono_principal, email, ciudad_residencia, etapa, ejecutivo_id')
        .or(`nombre_completo.ilike.%${searchQuery}%,whatsapp.ilike.%${searchQuery}%,telefono_principal.ilike.%${searchQuery}%`)
        .limit(10);

      const isAdminRole = ['admin', 'admin_operativo', 'coordinador_calidad'].includes(roleName);
      if (!isAdminRole) {
        if (roleName === 'ejecutivo') {
          q = q.eq('ejecutivo_id', userId);
        } else if (['supervisor', 'coordinador'].includes(roleName) && coordinacionesIds.length > 0) {
          const { data: teamMembers } = await analysisSupabase
            .from('user_profiles_v2')
            .select('id')
            .in('coordinacion_id', coordinacionesIds);
          if (teamMembers && teamMembers.length > 0) {
            q = q.in('ejecutivo_id', teamMembers.map(m => m.id));
          }
        }
      }
      const { data, error } = await q;
      if (error) { console.error('[OutboundDialer] Search error:', error); setResults([]); return; }
      setResults(data ?? []);
    } catch (err) {
      console.error('[OutboundDialer] Search error:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [userId, roleName, coordinacionesIds]);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchProspectos(value), 300);
  }, [searchProspectos]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Buscar por nombre o telefono..."
          className="w-full bg-gray-800/60 border border-gray-700/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white
                     placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/40
                     transition-all"
          autoFocus
        />
        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />}
      </div>

      {results.length > 0 && (
        <div className="max-h-[180px] overflow-y-auto rounded-xl border border-gray-700/40 bg-gray-800/40 divide-y divide-gray-800/60 scrollbar-ultra-thin">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-700/40 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{p.nombre_completo}</p>
                <p className="text-[11px] text-gray-500 truncate">
                  {p.whatsapp || p.telefono_principal || 'Sin telefono'}
                  {p.ciudad_residencia ? ` · ${p.ciudad_residencia}` : ''}
                </p>
              </div>
              {p.etapa && (
                <span className="bg-purple-500/15 text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0">
                  {p.etapa}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && !isSearching && results.length === 0 && (
        <p className="text-[11px] text-gray-600 text-center py-3">No se encontraron prospectos</p>
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const OutboundDialerModal: React.FC<OutboundDialerModalProps> = ({
  isOpen,
  onClose,
  preSelectedProspecto,
  callType = 'telefonica',
}) => {
  const { user } = useAuth();
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const constraintRef = useRef<HTMLDivElement>(null);
  const prevIsOpenRef = useRef(false);
  const preSelectedRef = useRef(preSelectedProspecto);
  preSelectedRef.current = preSelectedProspecto;

  // Persisted position from localStorage
  const POSITION_KEY = 'outbound-dialer-position';
  const getPersistedPosition = (): { top: string; left: string } => {
    try {
      const saved = localStorage.getItem(POSITION_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { top: '4%', left: 'calc(50% - 210px)' };
  };

  const savePosition = useCallback(() => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    localStorage.setItem(POSITION_KEY, JSON.stringify({
      top: `${rect.top}px`,
      left: `${rect.left}px`,
    }));
  }, []);

  // State
  const [dialerState, setDialerState] = useState<DialerState>('idle');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedProspecto, setSelectedProspecto] = useState<ProspectoResult | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<DialerTab>('teclado');
  const [isMuted, setIsMuted] = useState(false);
  const [showDevMessage, setShowDevMessage] = useState(false);
  const [callTab, setCallTab] = useState<CallTab>('llamada');
  const [fullDataLoaded, setFullDataLoaded] = useState(false);
  const [whatsappMsgs, setWhatsappMsgs] = useState<WhatsAppMsg[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [msgsLoaded, setMsgsLoaded] = useState(false);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const ringingRef = useRef<RingingEngine | null>(null);
  const holdMusicRef = useRef<HoldMusicEngine | null>(null);
  const [isOnHold, setIsOnHold] = useState(false);

  const prospectName = selectedProspecto?.nombre_completo || phoneNumber || 'Nueva llamada';
  const isCallActive = dialerState === 'connected' || dialerState === 'dialing';
  const parsedObs = useMemo(() => parseObservaciones(selectedProspecto?.observaciones), [selectedProspecto?.observaciones]);

  const formatMsgDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }); }
    catch { return ''; }
  };
  const formatMsgTime = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };
  const isProspectMsg = (rol: string) => rol === 'Prospecto';

  const groupedMsgs = useMemo(() => {
    const groups: { date: string; messages: WhatsAppMsg[] }[] = [];
    let currentDate = '';
    for (const msg of whatsappMsgs) {
      const date = formatMsgDate(msg.fecha_hora);
      if (date !== currentDate) { currentDate = date; groups.push({ date, messages: [msg] }); }
      else { groups[groups.length - 1].messages.push(msg); }
    }
    return groups;
  }, [whatsappMsgs]);

  // Badge config matching VoiceSoftphoneModal
  const callTypeBadge = callType === 'whatsapp'
    ? { icon: <MessageSquare className="w-3 h-3" />, label: 'WhatsApp', cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' }
    : { icon: <Phone className="w-3 h-3" />, label: 'Telefonica', cls: 'bg-blue-500/15 border-blue-500/30 text-blue-400' };

  // Reset ONLY on open transition (false → true), not on every parent re-render
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (isOpen && !wasOpen) {
      // Fresh open — reset all state
      setDialerState('idle');
      setPhoneNumber('');
      setSelectedProspecto(null);
      setIsMinimized(false);
      setCallDuration(0);
      setActiveTab('teclado');
      setCallTab('llamada');
      setIsMuted(false);
      setIsOnHold(false);
      setShowDevMessage(false);
      setFullDataLoaded(false);
      setWhatsappMsgs([]);
      setMsgsLoaded(false);
      stopRinging(ringingRef.current); ringingRef.current = null;
      stopHoldMusic(holdMusicRef.current); holdMusicRef.current = null;

      // Apply pre-selected prospect from ref (stable, no re-trigger)
      const pre = preSelectedRef.current;
      if (pre) {
        setSelectedProspecto({
          id: pre.id,
          nombre_completo: pre.nombre,
          whatsapp: pre.telefono,
          telefono_principal: pre.telefono,
          email: null, ciudad_residencia: null, etapa: null, ejecutivo_id: null,
        });
        setPhoneNumber(pre.telefono);
      }
    } else if (!isOpen && wasOpen) {
      // Closing — cleanup
      if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
      stopRinging(ringingRef.current); ringingRef.current = null;
      stopHoldMusic(holdMusicRef.current); holdMusicRef.current = null;
    }
  }, [isOpen]);

  // Timer
  useEffect(() => {
    if (dialerState === 'connected') {
      callTimerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    } else {
      if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [dialerState]);

  // Cargar mensajes WhatsApp cuando se abre el tab chat
  useEffect(() => {
    if (callTab !== 'chat' || msgsLoaded || !selectedProspecto?.id) return;
    const loadMessages = async () => {
      setMsgsLoading(true);
      try {
        const { data, error } = await analysisSupabase
          .from('mensajes_whatsapp')
          .select('id, mensaje, rol, fecha_hora, adjuntos, status_delivery')
          .eq('prospecto_id', selectedProspecto.id)
          .order('fecha_hora', { ascending: true })
          .limit(100);
        if (error) console.error('[OutboundDialer] Error loading messages:', error);
        else setWhatsappMsgs(data || []);
      } catch (e) {
        console.error('[OutboundDialer] Error:', e);
      } finally { setMsgsLoading(false); setMsgsLoaded(true); }
    };
    loadMessages();
  }, [callTab, msgsLoaded, selectedProspecto?.id]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current && whatsappMsgs.length > 0) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [whatsappMsgs]);

  // Click fuera del panel = colapsar a burbuja (solo con llamada activa)
  useEffect(() => {
    if (!isOpen || isMinimized || !isCallActive) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        savePosition();
        setIsMinimized(true);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 300);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isMinimized, isCallActive, savePosition]);

  // Cambio de ventana, resize, o blur = colapsar (solo con llamada activa)
  useEffect(() => {
    if (!isOpen || isMinimized || !isCallActive) return;

    const goToBubble = () => { savePosition(); setIsMinimized(true); };
    const handleVisibility = () => { if (document.hidden) goToBubble(); };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', goToBubble);
    window.addEventListener('resize', goToBubble);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', goToBubble);
      window.removeEventListener('resize', goToBubble);
    };
  }, [isOpen, isMinimized, isCallActive, savePosition]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Load full prospect data when selected
  const loadFullProspectoData = useCallback(async (prospectoId: string) => {
    if (fullDataLoaded) return;
    try {
      const { data } = await analysisSupabase
        .from('prospectos')
        .select('id, nombre_completo, nombre_whatsapp, whatsapp, telefono_principal, email, ciudad_residencia, etapa, ejecutivo_id, estado_civil, edad, viaja_con, tamano_grupo, destino_preferencia, observaciones, score')
        .eq('id', prospectoId)
        .single();
      if (data) {
        // Fetch ejecutivo name
        let ejecutivoNombre: string | null = null;
        if (data.ejecutivo_id) {
          const { data: perfil } = await analysisSupabase
            .from('user_profiles_v2')
            .select('full_name')
            .eq('id', data.ejecutivo_id)
            .single();
          ejecutivoNombre = perfil?.full_name ?? null;
        }
        setSelectedProspecto(prev => prev ? { ...prev, ...data, ejecutivo_nombre: ejecutivoNombre } : prev);
        setFullDataLoaded(true);
      }
    } catch (err) {
      console.error('[OutboundDialer] Error loading prospect data:', err);
    }
  }, [fullDataLoaded]);

  // Auto-load full data when prospect is selected
  useEffect(() => {
    if (selectedProspecto?.id && !fullDataLoaded) {
      loadFullProspectoData(selectedProspecto.id);
    }
  }, [selectedProspecto?.id, fullDataLoaded, loadFullProspectoData]);

  // Handlers
  const handleDigitPress = useCallback((digit: string) => {
    playDTMF(digit);
    setPhoneNumber(prev => prev + digit);
  }, []);
  const handleDeleteDigit = useCallback(() => setPhoneNumber(prev => prev.slice(0, -1)), []);

  const handleSelectProspecto = useCallback((p: ProspectoResult) => {
    setSelectedProspecto(p);
    setPhoneNumber(p.whatsapp || p.telefono_principal || '');
    setFullDataLoaded(false);
  }, []);

  const handleDial = useCallback(() => {
    if (!phoneNumber && !selectedProspecto) return;
    setDialerState('dialing');
    setCallDuration(0);
    // Start ringing sound
    ringingRef.current = startRinging();
    setTimeout(() => {
      // Stop ringing, play connected chime
      stopRinging(ringingRef.current);
      ringingRef.current = null;
      playConnectedChime();
      setDialerState('connected');
      setTimeout(() => setShowDevMessage(true), 1500);
    }, 2000);
  }, [phoneNumber, selectedProspecto]);

  const handleHangup = useCallback(() => {
    // Stop all audio
    stopRinging(ringingRef.current);
    ringingRef.current = null;
    stopHoldMusic(holdMusicRef.current);
    holdMusicRef.current = null;
    setIsOnHold(false);
    playHangupTone();
    setDialerState('ended');
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    setTimeout(() => onClose(), 800);
  }, [onClose]);

  // Mute = hold music (same as VoiceSoftphoneModal)
  const handleToggleMute = useCallback(() => {
    if (!isMuted) {
      holdMusicRef.current = createHoldMusic();
      setIsOnHold(true);
      setIsMuted(true);
    } else {
      stopHoldMusic(holdMusicRef.current);
      holdMusicRef.current = null;
      setIsOnHold(false);
      setIsMuted(false);
    }
  }, [isMuted]);

  // Cleanup audio on unmount/close
  useEffect(() => {
    return () => {
      stopRinging(ringingRef.current);
      stopHoldMusic(holdMusicRef.current);
    };
  }, []);

  // Memoized permissions
  const userCoordinacionesIds = useMemo(() =>
    user?.coordinaciones_ids ?? (user?.coordinacion_id ? [user.coordinacion_id] : []),
    [user?.coordinaciones_ids, user?.coordinacion_id]
  );

  const eqHeights = useMemo(() => [1, 2, 3, 4, 5].map(() => 6 + Math.random() * 6), []);

  // Tabs — matches VoiceSoftphoneModal tab style
  const tabs: { id: DialerTab; label: string; icon: React.ReactNode }[] = [
    { id: 'teclado', label: 'Teclado', icon: <Hash className="w-3.5 h-3.5" /> },
    { id: 'buscar', label: 'Buscar', icon: <Search className="w-3.5 h-3.5" /> },
  ];

  if (!isOpen || !user) return null;

  // ============================================
  // MINIMIZED VIEW — IDENTICAL to VoiceSoftphoneModal
  // ============================================
  if (isMinimized && isCallActive) {
    return createPortal(
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.8 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto"
      >
        {/* Heartbeat ring */}
        <motion.div
          className={`absolute inset-0 rounded-2xl ${isMuted ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div
          className={`relative flex items-center gap-3 backdrop-blur-xl border rounded-2xl px-5 py-3 shadow-2xl shadow-black/40 cursor-pointer transition-colors ${
            isMuted
              ? 'bg-gray-900/95 border-amber-500/40 hover:border-amber-400/60'
              : 'bg-gray-900/95 border-emerald-500/40 hover:border-emerald-400/60'
          }`}
          onClick={() => setIsMinimized(false)}
        >
          {/* Pulsing dot */}
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isMuted ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isMuted ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          </span>

          {/* Badge */}
          <span className={`${callTypeBadge.cls} px-1.5 py-0.5 rounded text-[10px] font-bold border`}>
            {callType === 'whatsapp' ? 'WA' : 'TEL'}
          </span>

          <span className="text-white font-medium text-sm max-w-[140px] truncate">{prospectName}</span>
          <span className="text-gray-400 font-mono text-sm">{formatDuration(callDuration)}</span>

          {isMuted && (
            <span className="flex items-center gap-1 text-amber-400 text-xs">
              <Music className="w-3 h-3 animate-pulse" />
            </span>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); handleToggleMute(); }}
            className={`p-2 rounded-xl transition-all ${
              isMuted ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleHangup(); }}
            className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all"
            title="Expandir"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>,
      document.body
    );
  }

  // ============================================
  // FULL MODAL — IDENTICAL structure to VoiceSoftphoneModal
  // ============================================
  return createPortal(
    <>
      {/* Backdrop — same as VoiceSoftphoneModal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[89] bg-black/40 backdrop-blur-sm"
        onClick={() => {
          if (isCallActive) { savePosition(); setIsMinimized(true); }
          else onClose();
        }}
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
          onDragEnd={savePosition}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="pointer-events-auto absolute w-[420px] max-h-[85vh] bg-gray-900/98 backdrop-blur-xl border border-gray-700/60 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col"
          style={getPersistedPosition()}
        >
          {/* ---- HEADER (drag handle) — same gradient + layout ---- */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className={`relative bg-gradient-to-b ${
              dialerState === 'connected' && isMuted ? 'from-amber-900/40' :
              isCallActive ? 'from-emerald-900/40' : 'from-blue-900/30'
            } to-transparent px-5 pt-4 pb-3 transition-colors duration-500 cursor-grab active:cursor-grabbing select-none`}
          >
            {/* Top bar: grip + badge + window controls */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-600" />
                <span className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-md text-[10px] font-semibold ${callTypeBadge.cls}`}>
                  {callTypeBadge.icon}
                  {callTypeBadge.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {isCallActive && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => { savePosition(); setIsMinimized(true); }}
                    className="p-1 bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white rounded-md transition-all"
                    title="Minimizar"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => { if (isCallActive) { savePosition(); setIsMinimized(true); } else { savePosition(); onClose(); } }}
                  className="p-1 bg-gray-800/60 hover:bg-red-600/80 text-gray-400 hover:text-white rounded-md transition-all"
                  title="Cerrar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Compact header: avatar + info + timer/status */}
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 transition-all duration-500 ${
                dialerState === 'connected' && isMuted
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20'
                  : isCallActive
                    ? 'bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-emerald-500/20'
                    : 'bg-gradient-to-br from-blue-500 to-cyan-600 shadow-blue-500/20'
              }`}>
                {dialerState === 'connected' && isMuted ? (
                  <Music className="w-5 h-5 text-white animate-pulse" />
                ) : dialerState === 'dialing' ? (
                  <PhoneOutgoing className="w-5 h-5 text-white animate-pulse" />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{prospectName}</h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {(selectedProspecto?.whatsapp || phoneNumber) && (
                    <span className="text-gray-500 text-[11px]">{selectedProspecto?.whatsapp || phoneNumber}</span>
                  )}
                  {selectedProspecto?.ciudad_residencia && (
                    <span className="flex items-center gap-0.5 text-gray-500 text-[11px]">
                      <MapPin className="w-3 h-3" />{selectedProspecto.ciudad_residencia}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  {isCallActive && (
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isMuted ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isMuted ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    </span>
                  )}
                  <span className={`text-xs font-semibold ${
                    dialerState === 'connected' && isMuted ? 'text-amber-400' :
                    dialerState === 'connected' ? 'text-emerald-400' :
                    dialerState === 'dialing' ? 'text-amber-400' :
                    'text-gray-500'
                  }`}>
                    {dialerState === 'idle' ? 'Lista' :
                     dialerState === 'dialing' ? 'Marcando' :
                     isMuted ? 'Espera' : 'Activa'}
                  </span>
                </div>
                {isCallActive && (
                  <span className="font-mono text-base font-semibold text-gray-300">{formatDuration(callDuration)}</span>
                )}
              </div>
            </div>

            {/* Badges */}
            {selectedProspecto?.etapa && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="bg-purple-500/15 text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-medium">{selectedProspecto.etapa}</span>
              </div>
            )}
          </div>

          {/* ---- CONTROLES (during call) — same as VoiceSoftphoneModal ---- */}
          {dialerState === 'dialing' && (
            <div className="px-6 py-5 border-b border-gray-800/60">
              <div className="flex items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={handleHangup}
                    className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all shadow-xl shadow-red-500/40 text-white"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                  <span className="text-[11px] text-red-400">Cancelar</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-16 h-16 rounded-full bg-emerald-600/30 flex items-center justify-center shadow-xl shadow-emerald-500/20"
                  >
                    <PhoneCall className="w-7 h-7 text-emerald-400" />
                  </motion.div>
                  <span className="text-[11px] text-emerald-400 font-semibold">Marcando...</span>
                </div>
              </div>
            </div>
          )}

          {dialerState === 'connected' && (
            <>
              <div className="px-6 py-3 border-b border-gray-800/60">
                {/* Development message */}
                <AnimatePresence>
                  {showDevMessage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mb-3 flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2"
                    >
                      <Construction className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-300 text-xs font-medium">Funcion en desarrollo. Proximamente</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Active call controls — same sizes as VoiceSoftphoneModal */}
                <div className="flex items-center justify-center gap-5">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={handleToggleMute}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                        isMuted
                          ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/30 text-white ring-2 ring-amber-400/40'
                          : 'bg-gray-700 hover:bg-gray-600 shadow-gray-700/30 text-white'
                      }`}
                      title={isMuted ? 'Quitar espera' : 'Pausar'}
                    >
                      {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>
                    <span className={`text-[11px] ${isMuted ? 'text-amber-400 font-semibold' : 'text-gray-500'}`}>
                      {isMuted ? 'En espera' : 'Pausar'}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <button
                      className="w-14 h-14 rounded-full bg-blue-600/40 hover:bg-blue-600/60 flex items-center justify-center transition-all shadow-lg shadow-blue-500/10 text-blue-300 hover:text-white"
                      title="Transferir llamada"
                    >
                      <ArrowRightLeft className="w-6 h-6" />
                    </button>
                    <span className="text-[11px] text-blue-400">Transferir</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <button
                      className="w-14 h-14 rounded-full bg-cyan-600/30 hover:bg-cyan-600/50 flex items-center justify-center transition-all shadow-lg shadow-cyan-500/10 text-cyan-300 hover:text-white"
                      title="Conferencia"
                    >
                      <Users className="w-6 h-6" />
                    </button>
                    <span className="text-[11px] text-cyan-400">Conferencia</span>
                  </div>

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

                {isMuted && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2"
                  >
                    <Music className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span className="text-amber-300 text-xs font-medium">Musica de espera activa</span>
                    <div className="flex items-end gap-0.5 h-3.5 ml-1">
                      {[1, 2, 3, 4, 5].map((i, idx) => (
                        <motion.div
                          key={i}
                          className="w-0.5 bg-amber-400/60 rounded-full"
                          animate={{ height: ['3px', `${eqHeights[idx]}px`, '3px'] }}
                          transition={{ duration: 0.6 + i * 0.1, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* ---- TABS (Llamada / Notas / Chat) — same as VoiceSoftphoneModal ---- */}
              <div className="flex border-b border-gray-800/80 px-3">
                {([
                  { id: 'llamada' as CallTab, label: 'Llamada', icon: <Phone className="w-3.5 h-3.5" /> },
                  { id: 'observaciones' as CallTab, label: 'Notas', icon: <Eye className="w-3.5 h-3.5" />, badge: !!selectedProspecto?.observaciones },
                  { id: 'chat' as CallTab, label: 'Chat', icon: <MessageSquare className="w-3.5 h-3.5" /> },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setCallTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 relative ${
                      callTab === tab.id
                        ? 'text-white border-emerald-500'
                        : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.badge && callTab !== tab.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-2 right-2" />
                    )}
                  </button>
                ))}
              </div>

              {/* ---- TAB CONTENT ---- */}
              <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[45vh] scrollbar-ultra-thin">
                <AnimatePresence mode="wait">
                  {/* ===== TAB LLAMADA ===== */}
                  {callTab === 'llamada' && (
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
                          <InfoRow icon={<Phone className="w-4 h-4 text-emerald-500" />} label="WhatsApp" value={selectedProspecto?.whatsapp} />
                          {selectedProspecto?.telefono_principal && selectedProspecto.telefono_principal !== selectedProspecto.whatsapp && (
                            <InfoRow icon={<Phone className="w-4 h-4 text-gray-500" />} label="Telefono" value={selectedProspecto.telefono_principal} />
                          )}
                          <InfoRow icon={<Mail className="w-4 h-4 text-gray-500" />} label="Email" value={selectedProspecto?.email} />
                          <InfoRow icon={<MapPin className="w-4 h-4 text-gray-500" />} label="Ciudad" value={selectedProspecto?.ciudad_residencia} />
                        </div>
                      </div>

                      {(selectedProspecto?.estado_civil || selectedProspecto?.edad) && (
                        <div>
                          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Personal</h4>
                          <div className="space-y-1.5">
                            <InfoRow icon={<Heart className="w-4 h-4 text-pink-500" />} label="Estado civil" value={selectedProspecto.estado_civil} />
                            {selectedProspecto.edad && <InfoRow icon={<User className="w-4 h-4 text-gray-500" />} label="Edad" value={`${selectedProspecto.edad} años`} />}
                          </div>
                        </div>
                      )}

                      {(selectedProspecto?.destino_preferencia?.length || selectedProspecto?.viaja_con || selectedProspecto?.tamano_grupo) && (
                        <div>
                          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Viaje</h4>
                          <div className="space-y-1.5">
                            <InfoRow icon={<Plane className="w-4 h-4 text-blue-400" />} label="Destino" value={selectedProspecto.destino_preferencia?.join(', ')} />
                            <InfoRow icon={<Users className="w-4 h-4 text-gray-500" />} label="Viaja con" value={selectedProspecto.viaja_con} />
                            {selectedProspecto.tamano_grupo && (
                              <InfoRow icon={<Users className="w-4 h-4 text-gray-500" />} label="Grupo" value={`${selectedProspecto.tamano_grupo} personas`} />
                            )}
                          </div>
                        </div>
                      )}

                      {!selectedProspecto?.whatsapp && !selectedProspecto?.email && !selectedProspecto?.estado_civil && !selectedProspecto?.destino_preferencia?.length && (
                        <div className="text-center py-4">
                          <User className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Sin datos del prospecto aun</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* ===== TAB OBSERVACIONES (Notas) ===== */}
                  {callTab === 'observaciones' && (
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
                      {!selectedProspecto?.observaciones && (
                        <div className="text-center py-8">
                          <Eye className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Sin observaciones registradas</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* ===== TAB CHAT (Mensajes WhatsApp) ===== */}
                  {callTab === 'chat' && (
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
                              <div className="flex items-center justify-center my-2">
                                <span className="bg-gray-800/80 text-gray-500 text-[10px] px-3 py-0.5 rounded-full font-medium">{group.date}</span>
                              </div>
                              {group.messages.map((msg) => {
                                const fromProspect = isProspectMsg(msg.rol);
                                const hasAttachment = msg.adjuntos && Object.keys(msg.adjuntos).length > 0;
                                return (
                                  <div key={msg.id} className={`flex ${fromProspect ? 'justify-start' : 'justify-end'} mb-1`}>
                                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                                      fromProspect ? 'bg-gray-800/60 rounded-tl-sm' : 'bg-emerald-700/30 rounded-tr-sm'
                                    }`}>
                                      {!fromProspect && (
                                        <p className="text-[10px] text-emerald-400/70 font-medium mb-0.5">
                                          {msg.rol === 'AI' ? 'IA' : msg.rol === 'Plantilla' ? 'Plantilla' : msg.rol}
                                        </p>
                                      )}
                                      {hasAttachment && (
                                        <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
                                          <ImageIcon className="w-3 h-3" /><span>Adjunto</span>
                                        </div>
                                      )}
                                      {msg.mensaje && (
                                        <p className={`text-sm leading-relaxed ${fromProspect ? 'text-gray-300' : 'text-emerald-100/90'}`}>{msg.mensaje}</p>
                                      )}
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
            </>
          )}

          {dialerState === 'ended' && (
            <div className="px-6 py-8 flex flex-col items-center gap-3 border-b border-gray-800/60">
              <div className="w-16 h-16 rounded-full bg-gray-800/60 flex items-center justify-center">
                <PhoneOff className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400 text-sm">Llamada finalizada</p>
              {callDuration > 0 && (
                <p className="text-gray-500 text-xs font-mono">{formatDuration(callDuration)}</p>
              )}
            </div>
          )}

          {/* ---- TABS — same style as VoiceSoftphoneModal ---- */}
          {dialerState === 'idle' && (
            <>
              <div className="flex border-b border-gray-800/80 px-3">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 ${
                      activeTab === tab.id
                        ? 'text-white border-emerald-500'
                        : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ---- TAB CONTENT ---- */}
              <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[45vh] scrollbar-ultra-thin">
                <AnimatePresence mode="wait">
                  {/* Tab Buscar */}
                  {activeTab === 'buscar' && (
                    <motion.div
                      key="tab-buscar"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="px-5 py-4 space-y-4"
                    >
                      {/* Selected prospect */}
                      {selectedProspecto ? (
                        <div>
                          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Prospecto seleccionado</h4>
                          <div className="flex items-center gap-2.5 py-1.5">
                            <User className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-gray-600 uppercase tracking-wider">Nombre</span>
                              <p className="text-sm text-gray-300 truncate">{selectedProspecto.nombre_completo}</p>
                            </div>
                            <button
                              onClick={() => { setSelectedProspecto(null); setPhoneNumber(''); }}
                              className="p-1 bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white rounded-md transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {(selectedProspecto.whatsapp || phoneNumber) && (
                            <div className="flex items-center gap-2.5 py-1.5">
                              <Phone className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] text-gray-600 uppercase tracking-wider">Telefono</span>
                                <p className="text-sm text-gray-300">{selectedProspecto.whatsapp || phoneNumber}</p>
                              </div>
                            </div>
                          )}
                          {selectedProspecto.ciudad_residencia && (
                            <div className="flex items-center gap-2.5 py-1.5">
                              <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] text-gray-600 uppercase tracking-wider">Ciudad</span>
                                <p className="text-sm text-gray-300">{selectedProspecto.ciudad_residencia}</p>
                              </div>
                            </div>
                          )}

                          {/* Dial button */}
                          <button
                            onClick={handleDial}
                            className="w-full mt-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                          >
                            <PhoneOutgoing className="w-5 h-5" />
                            Marcar
                          </button>
                        </div>
                      ) : (
                        <ProspectSearch
                          onSelect={handleSelectProspecto}
                          userId={user.id}
                          roleName={user.role_name}
                          coordinacionesIds={userCoordinacionesIds}
                        />
                      )}
                    </motion.div>
                  )}

                  {/* Tab Teclado */}
                  {activeTab === 'teclado' && (
                    <motion.div
                      key="tab-teclado"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="px-5 py-4 flex flex-col items-center gap-3"
                    >
                      {/* Number display */}
                      <div className="w-full flex items-center justify-between bg-gray-800/40 rounded-xl px-4 py-3 border border-gray-700/40 min-h-[48px]">
                        <span className="text-white text-lg font-mono tracking-wider flex-1 text-center">
                          {phoneNumber || '+52'}
                        </span>
                        {phoneNumber && (
                          <button onClick={handleDeleteDigit} className="text-gray-500 hover:text-white transition-colors ml-2">
                            <Delete className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      {/* Grid */}
                      <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
                        {DIALER_DIGITS.flat().map((digit) => (
                          <button
                            key={digit}
                            onClick={() => handleDigitPress(digit)}
                            className="w-[72px] h-[72px] mx-auto rounded-full bg-gray-800/50 hover:bg-gray-700/70
                                       border border-gray-700/30 hover:border-gray-600/50
                                       text-white text-xl font-semibold transition-all duration-150
                                       active:scale-90 active:bg-gray-600/80 flex items-center justify-center
                                       shadow-lg shadow-black/20"
                          >
                            {digit}
                          </button>
                        ))}
                      </div>

                      {/* Dial button */}
                      <button
                        onClick={handleDial}
                        disabled={!phoneNumber}
                        className={`w-full mt-2 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                          phoneNumber
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-[0.98]'
                            : 'bg-gray-800/60 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        <PhoneOutgoing className="w-5 h-5" />
                        Marcar
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </>,
    document.body
  );
};

// ---- Helpers (same as VoiceSoftphoneModal) ----

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

export default OutboundDialerModal;
