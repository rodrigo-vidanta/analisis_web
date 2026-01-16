/**
 * ============================================
 * CUÑA MINIMIZADA - PANEL LATERAL
 * ============================================
 * 
 * Versión ultra-compacta de una llamada activa.
 * Aparece como una pequeña pestaña en el borde derecho
 * que el usuario puede expandir haciendo clic.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Phone, User } from 'lucide-react';
import type { WidgetCallData } from '../../stores/liveActivityStore';

interface MinimizedCallTabProps {
  call: WidgetCallData;
  onRestore: () => void;
}

export const MinimizedCallTab: React.FC<MinimizedCallTabProps> = ({
  call,
  onRestore
}) => {
  const displayName = useMemo(() => {
    const name = call.nombre_completo || call.nombre_whatsapp || 'Prospecto';
    // Obtener iniciales o primeras 2-3 letras
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2).toUpperCase();
  }, [call.nombre_completo, call.nombre_whatsapp]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.8 }}
      whileHover={{ scale: 1.05, x: -5 }}
      whileTap={{ scale: 0.95 }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 25 
      }}
      onClick={onRestore}
      className="relative cursor-pointer group"
      style={{
        marginRight: '-1px'
      }}
    >
      {/* Cuña principal */}
      <div className="
        flex items-center gap-2 px-3 py-3
        bg-gray-900/95 backdrop-blur-xl
        border-l border-t border-b border-gray-600/50
        rounded-l-xl shadow-xl
        hover:border-l-green-500/70 hover:border-t-green-500/50 hover:border-b-green-500/50
        hover:shadow-green-500/20
        transition-all duration-200
      ">
        {/* Indicador pulsante */}
        <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-green-400 via-emerald-500 to-green-400 rounded-l animate-pulse" />
        
        {/* Avatar mini con iniciales */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg ml-1">
          <span className="text-xs font-bold text-white">{displayName}</span>
        </div>
        
        {/* Icono de teléfono con indicador en vivo */}
        <div className="relative">
          <Phone className="w-4 h-4 text-green-400" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        </div>
      </div>
      
      {/* Tooltip en hover */}
      <div className="
        absolute right-full top-1/2 -translate-y-1/2 mr-2
        opacity-0 group-hover:opacity-100
        transition-opacity duration-200
        pointer-events-none
      ">
        <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
          {call.nombre_completo || call.nombre_whatsapp || 'Llamada activa'}
        </div>
      </div>
    </motion.div>
  );
};

export default MinimizedCallTab;
