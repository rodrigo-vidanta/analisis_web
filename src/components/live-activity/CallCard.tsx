/**
 * ============================================
 * TARJETA DE LLAMADA - PANEL LATERAL
 * ============================================
 *
 * Tarjeta individual colapsada que muestra información resumida
 * de una llamada activa en el panel lateral derecho.
 *
 * 3 estados de transicion:
 * 1. normal: Escuchar + Transferir (llamada VAPI activa)
 * 2. incoming: Llamada entrante de transferencia → Contestar + Rechazar
 * 3. active: En llamada VoIP con prospecto → Colgar + Mute
 */

import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  User,
  MapPin,
  Clock,
  Headphones,
  ArrowRightLeft,
  ChevronRight,
  PhoneCall,
  UserCheck,
  PhoneIncoming,
  PhoneOff,
  Mic,
  MicOff,
  X
} from 'lucide-react';
import type { WidgetCallData } from '../../stores/liveActivityStore';

interface CallCardProps {
  call: WidgetCallData;
  isExpanded: boolean;
  isListening?: boolean;
  onExpand: () => void;
  onListen: () => void;
  onStopListening?: () => void;
  onTransfer: () => void;
  onMinimize: () => void;
  // Voice SDK transfer callbacks
  onAcceptTransfer?: () => void;
  onRejectTransfer?: () => void;
  onHangupVoice?: () => void;
  onToggleMute?: () => void;
  isVoiceMuted?: boolean;
  // Team transfer (supervisor/coordinador)
  canTransferHere?: boolean;
  canOnlyListen?: boolean;
  onTransferHere?: () => void;
  currentHolderName?: string;
}

// Configuración de checkpoints
const CHECKPOINT_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  'checkpoint #1': { label: 'CP1', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  'checkpoint #2': { label: 'CP2', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  'checkpoint #3': { label: 'CP3', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  'checkpoint #4': { label: 'CP4', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  'checkpoint #5': { label: 'CP5', color: 'text-red-400', bgColor: 'bg-red-500/20' }
};

const getCheckpointConfig = (checkpoint: string | undefined) => {
  if (!checkpoint) return null;
  const key = Object.keys(CHECKPOINT_CONFIG).find(k =>
    checkpoint.toLowerCase().includes(k)
  );
  return key ? CHECKPOINT_CONFIG[key] : null;
};

export const CallCard: React.FC<CallCardProps> = ({
  call,
  isExpanded,
  isListening = false,
  onExpand,
  onListen,
  onStopListening,
  onTransfer,
  onMinimize,
  onAcceptTransfer,
  onRejectTransfer,
  onHangupVoice,
  onToggleMute,
  isVoiceMuted = false,
  canTransferHere = false,
  canOnlyListen = false,
  onTransferHere,
  currentHolderName,
}) => {
  const voiceStatus = call.voiceTransferStatus || 'none';
  const isIncoming = voiceStatus === 'incoming';
  const isVoiceActive = voiceStatus === 'active';

  const checkpointConfig = useMemo(() =>
    getCheckpointConfig(call.checkpoint_venta_actual),
    [call.checkpoint_venta_actual]
  );

  const displayName = useMemo(() => {
    return call.nombre_completo || call.nombre_whatsapp || 'Prospecto';
  }, [call.nombre_completo, call.nombre_whatsapp]);

  const displayCity = useMemo(() => {
    return call.ciudad_residencia || 'Ciudad no especificada';
  }, [call.ciudad_residencia]);

  // Estado para la duración que se actualiza cada segundo
  const [liveDuration, setLiveDuration] = useState('0:00');

  // Actualizar duración cada segundo basándose en fecha_llamada
  useEffect(() => {
    const updateDuration = () => {
      if (!call.fecha_llamada) {
        if (call.duracion_segundos && call.duracion_segundos > 0) {
          const mins = Math.floor(call.duracion_segundos / 60);
          const secs = call.duracion_segundos % 60;
          setLiveDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
        } else {
          setLiveDuration('0:00');
        }
        return;
      }
      const start = new Date(call.fecha_llamada);
      const now = new Date();
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
      if (diff < 0) {
        setLiveDuration('0:00');
        return;
      }
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setLiveDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [call.fecha_llamada, call.duracion_segundos]);

  const handleListenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isListening && onStopListening) {
      onStopListening();
      return;
    }
    if (call.monitor_url) {
      onListen();
    }
  };

  const handleTransferClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTransfer();
  };

  // Determinar colores de la barra lateral segun estado
  const sideBarGradient = isIncoming
    ? 'from-amber-400 via-orange-500 to-amber-400'
    : isVoiceActive
      ? 'from-blue-400 via-cyan-500 to-blue-400'
      : 'from-green-400 via-emerald-500 to-green-400';

  const topBarColor = isIncoming
    ? 'from-amber-500/80'
    : isVoiceActive
      ? 'from-blue-500/80'
      : 'from-green-500/80';

  // Badge de estado
  const statusBadge = isIncoming
    ? { text: 'TRANSFERENCIA', color: 'text-amber-400', bg: 'bg-amber-500/10' }
    : isVoiceActive
      ? { text: 'EN LLAMADA', color: 'text-cyan-400', bg: 'bg-cyan-500/10' }
      : { text: 'EN VIVO', color: 'text-green-400', bg: 'bg-green-500/10' };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        layout: { duration: 0.3 }
      }}
      onClick={onExpand}
      className={`
        relative w-80 bg-gray-900/95 backdrop-blur-xl
        border-l border-t border-b border-gray-600/50
        rounded-l-2xl shadow-2xl cursor-pointer overflow-hidden
        hover:border-l-blue-500/70 hover:border-t-blue-500/50 hover:border-b-blue-500/50
        hover:shadow-blue-500/10 hover:shadow-2xl
        transition-all duration-300
        ${isExpanded ? 'ring-2 ring-blue-500 ring-offset-0' : ''}
        ${isIncoming ? 'ring-2 ring-amber-500/60 ring-offset-0' : ''}
      `}
      style={{
        marginRight: '-1px',
        borderRight: 'none',
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      }}
    >
      {/* Indicador de llamada activa - barra lateral izquierda */}
      <div className={`absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b ${sideBarGradient} animate-pulse`} />

      {/* Indicador superior */}
      <div className={`absolute top-0 left-1.5 right-0 h-0.5 bg-gradient-to-r ${topBarColor} to-transparent`} />

      {/* Header con nombre y checkpoint */}
      <div className="p-4 pb-3 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Avatar */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
              isIncoming
                ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                : isVoiceActive
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600'
                  : 'bg-gradient-to-br from-blue-500 to-purple-600'
            }`}>
              {isIncoming ? (
                <PhoneIncoming className="w-6 h-6 text-white animate-pulse" />
              ) : isVoiceActive ? (
                <Phone className="w-6 h-6 text-white" />
              ) : (
                <User className="w-6 h-6 text-white" />
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <h4 className="text-base font-semibold text-white truncate">
                {displayName}
              </h4>
              <div className="flex items-center gap-1.5 text-sm text-gray-400">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{displayCity}</span>
              </div>
            </div>
          </div>

          {/* Checkpoint badge */}
          {checkpointConfig && (
            <div className={`px-3 py-1 rounded-lg text-sm font-bold ${checkpointConfig.bgColor} ${checkpointConfig.color} shadow-lg`}>
              {checkpointConfig.label}
            </div>
          )}
        </div>
      </div>

      {/* Info de llamada */}
      <div className="px-4 pb-3 pl-5">
        <div className="flex items-center gap-4 text-sm">
          {/* Duración en tiempo real */}
          <div className="flex items-center gap-1.5 text-gray-300">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="font-medium font-mono">{liveDuration}</span>
          </div>

          {/* Teléfono */}
          <div className="flex items-center gap-1.5 text-gray-400 flex-1 min-w-0">
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="truncate">{call.whatsapp || call.telefono_principal || 'N/A'}</span>
          </div>

          {/* Indicador de estado */}
          <div className={`flex items-center gap-1.5 ${statusBadge.color} ${statusBadge.bg} px-2.5 py-1 rounded-full`}>
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isIncoming ? 'bg-amber-400' : isVoiceActive ? 'bg-cyan-400' : 'bg-green-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isIncoming ? 'bg-amber-500' : isVoiceActive ? 'bg-cyan-500' : 'bg-green-500'
              }`}></span>
            </span>
            <span className="text-xs font-semibold">{statusBadge.text}</span>
          </div>
        </div>
      </div>

      {/* Ejecutivo asignado */}
      {call.ejecutivo_nombre && (
        <div className="px-4 pb-2 pl-5">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5 bg-amber-500/15 text-amber-300 px-2.5 py-1 rounded-lg">
              <UserCheck className="w-3.5 h-3.5" />
              <span className="font-medium truncate max-w-[200px]">{call.ejecutivo_nombre}</span>
            </div>
          </div>
        </div>
      )}

      {/* Datos adicionales si hay */}
      {(call.destino_preferido || call.composicion_familiar_numero) && (
        <div className="px-4 pb-3 pl-5">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            {call.destino_preferido && (
              <span className="bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-lg font-medium">
                {call.destino_preferido}
              </span>
            )}
            {call.composicion_familiar_numero && (
              <span className="bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-lg font-medium">
                {call.composicion_familiar_numero} personas
              </span>
            )}
          </div>
        </div>
      )}

      {/* Holder badge (alguien mas tiene la llamada VoIP) */}
      {currentHolderName && (
        <div className="px-4 pb-2 pl-5">
          <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-2.5 py-1.5">
            <Phone className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-cyan-300">
              En llamada con <span className="font-semibold">{currentHolderName}</span>
            </span>
          </div>
        </div>
      )}

      {/* Acciones - cambian segun voiceTransferStatus */}
      <div className="px-4 pb-4 pl-5 flex items-center gap-2">
        <AnimatePresence mode="wait">
          {isIncoming ? (
            /* ============================================
             * ESTADO: INCOMING - Transferencia entrante
             * Botones: Contestar (verde) + Rechazar (rojo)
             * ============================================ */
            <motion.div
              key="incoming-actions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 w-full"
            >
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onAcceptTransfer?.();
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/30 animate-pulse"
              >
                <PhoneIncoming className="w-4 h-4" />
                <span>Contestar</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRejectTransfer?.();
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-red-500/20"
              >
                <X className="w-4 h-4" />
                <span>Rechazar</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1, x: 2 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMinimize();
                }}
                title="Minimizar"
                className="p-2.5 bg-gray-700/70 hover:bg-gray-600 text-white rounded-xl transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          ) : isVoiceActive ? (
            /* ============================================
             * ESTADO: ACTIVE - En llamada VoIP
             * Botones: Mute + Colgar
             * ============================================ */
            <motion.div
              key="active-actions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 w-full"
            >
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMute?.();
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-lg ${
                  isVoiceMuted
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20 text-white'
                    : 'bg-gray-600 hover:bg-gray-500 shadow-gray-500/20 text-white'
                }`}
              >
                {isVoiceMuted ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Sin Mic</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Mic On</span>
                  </>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onHangupVoice?.();
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-red-500/30"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Colgar</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1, x: 2 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMinimize();
                }}
                title="Minimizar"
                className="p-2.5 bg-gray-700/70 hover:bg-gray-600 text-white rounded-xl transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          ) : (
            /* ============================================
             * ESTADO: NORMAL - Llamada VAPI activa
             * Botones: Escuchar + Transferir + Minimizar
             * ============================================ */
            <motion.div
              key="normal-actions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 w-full"
            >
              <motion.button
                whileHover={{ scale: call.monitor_url || isListening ? 1.03 : 1 }}
                whileTap={{ scale: call.monitor_url || isListening ? 0.97 : 1 }}
                onClick={handleListenClick}
                disabled={!call.monitor_url && !isListening}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-lg ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-500/30 animate-pulse text-white'
                    : call.monitor_url
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20 text-white'
                      : 'bg-amber-600/80 shadow-amber-500/20 text-amber-100 cursor-not-allowed'
                }`}
              >
                {isListening ? (
                  <>
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                    <span>Escuchando...</span>
                  </>
                ) : call.monitor_url ? (
                  <>
                    <Headphones className="w-4 h-4" />
                    <span>Escuchar</span>
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-4 h-4 animate-pulse" />
                    <span>Marcando...</span>
                  </>
                )}
              </motion.button>

              {canTransferHere && !canOnlyListen && onTransferHere ? (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTransferHere();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Transferir Aqui</span>
                </motion.button>
              ) : !canOnlyListen ? (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleTransferClick}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Transferir</span>
                </motion.button>
              ) : null}

              <motion.button
                whileHover={{ scale: 1.1, x: 2 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMinimize();
                }}
                title="Minimizar"
                className="p-2.5 bg-gray-700/70 hover:bg-gray-600 text-white rounded-xl transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default CallCard;
