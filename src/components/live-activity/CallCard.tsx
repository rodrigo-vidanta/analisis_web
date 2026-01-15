/**
 * ============================================
 * TARJETA DE LLAMADA - PANEL LATERAL
 * ============================================
 * 
 * Tarjeta individual colapsada que muestra información resumida
 * de una llamada activa en el panel lateral derecho.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, 
  User, 
  MapPin, 
  Clock, 
  Headphones, 
  ArrowRightLeft,
  ChevronRight,
  Wifi
} from 'lucide-react';
import type { WidgetCallData } from '../../stores/liveActivityStore';

interface CallCardProps {
  call: WidgetCallData;
  isExpanded: boolean;
  onExpand: () => void;
  onListen: () => void;
  onTransfer: () => void;
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

const formatDuration = (seconds: number | undefined): string => {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const CallCard: React.FC<CallCardProps> = ({
  call,
  isExpanded,
  onExpand,
  onListen,
  onTransfer
}) => {
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

  const handleListenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onListen();
  };

  const handleTransferClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTransfer();
  };

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
        relative w-80 bg-gray-900/98 backdrop-blur-xl 
        border-l border-t border-b border-gray-600/50 
        rounded-l-2xl shadow-2xl cursor-pointer overflow-hidden
        hover:border-l-blue-500/70 hover:border-t-blue-500/50 hover:border-b-blue-500/50
        hover:shadow-blue-500/10 hover:shadow-3xl
        transition-all duration-300
        ${isExpanded ? 'ring-2 ring-blue-500 ring-offset-0' : ''}
      `}
      style={{
        // Pestaña conectada al borde derecho
        marginRight: '-1px',
        borderRight: 'none',
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      }}
    >
      {/* Indicador de llamada activa - barra lateral izquierda */}
      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-green-400 via-emerald-500 to-green-400 animate-pulse" />
      
      {/* Indicador superior */}
      <div className="absolute top-0 left-1.5 right-0 h-0.5 bg-gradient-to-r from-green-500/80 to-transparent" />
      
      {/* Header con nombre y checkpoint */}
      <div className="p-4 pb-3 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Avatar más grande */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <User className="w-6 h-6 text-white" />
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
          
          {/* Checkpoint badge más prominente */}
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
          {/* Duración */}
          <div className="flex items-center gap-1.5 text-gray-300">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="font-medium">{formatDuration(call.duracion_segundos)}</span>
          </div>
          
          {/* Teléfono */}
          <div className="flex items-center gap-1.5 text-gray-400 flex-1 min-w-0">
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="truncate">{call.whatsapp || call.telefono_principal || 'N/A'}</span>
          </div>
          
          {/* Indicador en vivo más prominente */}
          <div className="flex items-center gap-1.5 text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-xs font-semibold">EN VIVO</span>
          </div>
        </div>
      </div>
      
      {/* Datos adicionales si hay */}
      {(call.destino_preferido || call.composicion_familiar_numero) && (
        <div className="px-4 pb-3 pl-5">
          <div className="flex items-center gap-2 text-sm">
            {call.destino_preferido && (
              <span className="bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-lg font-medium">
                📍 {call.destino_preferido}
              </span>
            )}
            {call.composicion_familiar_numero && (
              <span className="bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-lg font-medium">
                👥 {call.composicion_familiar_numero} personas
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Acciones rápidas */}
      <div className="px-4 pb-4 pl-5 flex items-center gap-2">
        {/* Botón Escuchar */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleListenClick}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
          disabled={!call.monitor_url}
        >
          <Headphones className="w-4 h-4" />
          <span>Escuchar</span>
        </motion.button>
        
        {/* Botón Transferir */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleTransferClick}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Transferir</span>
        </motion.button>
        
        {/* Botón Expandir */}
        <motion.button
          whileHover={{ scale: 1.1, x: 2 }}
          whileTap={{ scale: 0.9 }}
          onClick={onExpand}
          className="p-2.5 bg-gray-700/70 hover:bg-gray-600 text-white rounded-xl transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default CallCard;
