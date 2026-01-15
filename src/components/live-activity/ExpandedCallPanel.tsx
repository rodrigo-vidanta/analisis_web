/**
 * ============================================
 * PANEL EXPANDIDO - PANEL LATERAL
 * ============================================
 * 
 * Vista expandida que muestra información completa de una llamada:
 * - Datos del prospecto
 * - Datos de discovery
 * - Transcripción en tiempo real
 * - Controles de audio
 */

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Headphones, 
  ArrowRightLeft,
  ChevronLeft,
  Users,
  Plane,
  Calendar,
  DollarSign,
  Building,
  MessageSquare,
  Wifi,
  Volume2,
  VolumeX
} from 'lucide-react';
import type { WidgetCallData, TranscriptEntry } from '../../stores/liveActivityStore';

interface ExpandedCallPanelProps {
  call: WidgetCallData;
  transcription: TranscriptEntry[];
  onClose: () => void;
  onListen: () => void;
  onTransfer: () => void;
  isListening: boolean;
  onStopListening: () => void;
}

// Configuración de checkpoints
const CHECKPOINT_CONFIG: Record<string, { label: string; title: string; color: string; bgColor: string }> = {
  'checkpoint #1': { label: 'CP1', title: 'Saludo de Continuación', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  'checkpoint #2': { label: 'CP2', title: 'Conexión Emocional', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  'checkpoint #3': { label: 'CP3', title: 'Introducción al Paraíso', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  'checkpoint #4': { label: 'CP4', title: 'Urgencia Natural', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  'checkpoint #5': { label: 'CP5', title: 'Presentación de Oportunidad', color: 'text-red-400', bgColor: 'bg-red-500/20' }
};

const getCheckpointConfig = (checkpoint: string | undefined) => {
  if (!checkpoint) return null;
  const key = Object.keys(CHECKPOINT_CONFIG).find(k => 
    checkpoint.toLowerCase().includes(k)
  );
  return key ? CHECKPOINT_CONFIG[key] : null;
};

const formatDuration = (seconds: number | undefined): string => {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const ExpandedCallPanel: React.FC<ExpandedCallPanelProps> = ({
  call,
  transcription,
  onClose,
  onListen,
  onTransfer,
  isListening,
  onStopListening
}) => {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Asegurar que transcription siempre sea un array
  const safeTranscription = Array.isArray(transcription) ? transcription : [];
  
  const checkpointConfig = useMemo(() => 
    getCheckpointConfig(call.checkpoint_venta_actual), 
    [call.checkpoint_venta_actual]
  );
  
  const displayName = useMemo(() => {
    return call.nombre_completo || call.nombre_whatsapp || 'Prospecto';
  }, [call.nombre_completo, call.nombre_whatsapp]);

  // Auto-scroll de transcripción
  useEffect(() => {
    if (autoScroll && transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [safeTranscription, autoScroll]);

  // Detectar scroll manual para desactivar auto-scroll
  const handleTranscriptScroll = () => {
    if (!transcriptRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = transcriptRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  // Extraer datos de discovery
  const discoveryData = useMemo(() => {
    const data: { label: string; value: string; icon: React.ReactNode }[] = [];
    
    if (call.destino_preferido) {
      data.push({ label: 'Destino', value: call.destino_preferido, icon: <Plane className="w-4 h-4" /> });
    }
    if (call.composicion_familiar_numero) {
      data.push({ label: 'Grupo', value: `${call.composicion_familiar_numero} personas`, icon: <Users className="w-4 h-4" /> });
    }
    if (call.numero_noches) {
      data.push({ label: 'Noches', value: `${call.numero_noches} noches`, icon: <Calendar className="w-4 h-4" /> });
    }
    if (call.mes_preferencia) {
      data.push({ label: 'Mes', value: call.mes_preferencia, icon: <Calendar className="w-4 h-4" /> });
    }
    if (call.propuesta_economica_ofrecida) {
      data.push({ label: 'Propuesta', value: `$${call.propuesta_economica_ofrecida.toLocaleString()}`, icon: <DollarSign className="w-4 h-4" /> });
    }
    if (call.resort_ofertado) {
      data.push({ label: 'Resort', value: call.resort_ofertado, icon: <Building className="w-4 h-4" /> });
    }
    if (call.habitacion_ofertada) {
      data.push({ label: 'Habitación', value: call.habitacion_ofertada, icon: <Building className="w-4 h-4" /> });
    }
    
    return data;
  }, [call]);

  return (
    <div
      className="w-full h-full bg-gray-900/98 backdrop-blur-xl border-l border-t border-b border-gray-600/50 rounded-l-2xl shadow-2xl flex flex-col overflow-hidden"
      style={{
        borderRight: 'none',
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0
      }}
    >
      {/* Header */}
      <div className="relative p-4 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
        {/* Indicador de llamada activa */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 animate-pulse" />
        
        <div className="flex items-center gap-3">
          {/* Botón cerrar */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 bg-gray-700/50 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white truncate">
              {displayName}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Wifi className="w-3 h-3 text-green-400 animate-pulse" />
              <span>En llamada</span>
              <span className="text-gray-600">|</span>
              <Clock className="w-3 h-3" />
              <span>{formatDuration(call.duracion_segundos)}</span>
            </div>
          </div>
          
          {/* Checkpoint badge */}
          {checkpointConfig && (
            <div className={`px-3 py-1 rounded-lg text-xs font-bold ${checkpointConfig.bgColor} ${checkpointConfig.color}`}>
              <div>{checkpointConfig.label}</div>
              <div className="text-[10px] opacity-75">{checkpointConfig.title}</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Contenido en 2 columnas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Columna izquierda: Info del prospecto y discovery */}
        <div className="w-1/3 border-r border-gray-700/30 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {/* Datos del prospecto */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Información del Prospecto
            </h4>
            <div className="space-y-2">
              {call.telefono_principal && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300">{call.telefono_principal}</span>
                </div>
              )}
              {call.whatsapp && call.whatsapp !== call.telefono_principal && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-green-500" />
                  <span className="text-gray-300">{call.whatsapp}</span>
                </div>
              )}
              {call.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300 truncate">{call.email}</span>
                </div>
              )}
              {call.ciudad_residencia && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300">{call.ciudad_residencia}</span>
                </div>
              )}
              {call.estado_civil && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300">{call.estado_civil}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Discovery Data */}
          {discoveryData.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Discovery
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {discoveryData.map((item, idx) => (
                  <div key={idx} className="bg-gray-800/50 rounded-lg p-2">
                    <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                      {item.icon}
                      <span className="text-[10px] uppercase">{item.label}</span>
                    </div>
                    <div className="text-sm text-white font-medium truncate">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Objeciones */}
          {call.principales_objeciones && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Objeciones
              </h4>
              <p className="text-sm text-orange-300 bg-orange-500/10 p-2 rounded-lg">
                {call.principales_objeciones}
              </p>
            </div>
          )}
        </div>
        
        {/* Columna derecha: Transcripción */}
        <div className="w-2/3 flex flex-col p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Transcripción en Vivo
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="font-semibold">EN VIVO</span>
            </div>
          </div>
          
          <div 
            ref={transcriptRef}
            onScroll={handleTranscriptScroll}
            className="flex-1 overflow-y-auto bg-gray-800/30 rounded-xl p-4 space-y-3 custom-scrollbar"
          >
            {safeTranscription.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
                <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-medium">Esperando transcripción...</p>
                <p className="text-xs text-gray-600 mt-1">La conversación aparecerá aquí en tiempo real</p>
              </div>
            ) : (
              safeTranscription.map((entry, idx) => (
                <div 
                  key={idx}
                  className={`text-sm rounded-lg p-3 ${
                    entry.role === 'assistant' 
                      ? 'bg-blue-500/10 border-l-3 border-blue-500 text-blue-100 ml-4' 
                      : 'bg-green-500/10 border-l-3 border-green-500 text-green-100 mr-4'
                  }`}
                >
                  <div className="text-[10px] text-gray-500 mb-1 font-medium">
                    {entry.role === 'assistant' ? '🤖 Agente IA' : '👤 Cliente'}
                    {entry.timestamp && ` · ${entry.timestamp}`}
                  </div>
                  <p className="leading-relaxed">{entry.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Footer con acciones */}
      <div className="p-4 border-t border-gray-700/50 bg-gray-800/50">
        <div className="flex items-center gap-2">
          {/* Botón Escuchar/Detener */}
          {isListening ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStopListening}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors"
            >
              <VolumeX className="w-4 h-4" />
              <span>Detener</span>
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onListen}
              disabled={!call.monitor_url}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              <Headphones className="w-4 h-4" />
              <span>Escuchar</span>
            </motion.button>
          )}
          
          {/* Botón Transferir */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onTransfer}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Transferir</span>
          </motion.button>
        </div>
        
        {/* Estado de audio */}
        {isListening && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-green-400">
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span>Escuchando audio en vivo...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandedCallPanel;
