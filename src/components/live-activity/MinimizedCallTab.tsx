/**
 * ============================================
 * CUÑA MINIMIZADA - PANEL LATERAL
 * ============================================
 * 
 * Versión compacta de una llamada activa que mantiene
 * la altura del card original pero se colapsa a una
 * pestaña delgada al costado de la pantalla.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, ChevronLeft, Clock } from 'lucide-react';
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

  // Estado para la duración que se actualiza cada segundo
  const [duration, setDuration] = useState('00:00');
  
  // Actualizar duración cada segundo
  useEffect(() => {
    const updateDuration = () => {
      if (!call.fecha_llamada) {
        setDuration('--:--');
        return;
      }
      const start = new Date(call.fecha_llamada);
      const now = new Date();
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
      if (diff < 0) {
        setDuration('00:00');
        return;
      }
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setDuration(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };
    
    // Actualizar inmediatamente
    updateDuration();
    
    // Luego cada segundo
    const interval = setInterval(updateDuration, 1000);
    
    return () => clearInterval(interval);
  }, [call.fecha_llamada]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, width: 320 }}
      animate={{ opacity: 1, x: 0, width: 48 }}
      exit={{ opacity: 0, x: 50, width: 320 }}
      whileHover={{ width: 56, x: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 30,
        width: { duration: 0.3 }
      }}
      onClick={onRestore}
      className="relative cursor-pointer group"
      style={{
        marginRight: '-1px',
        height: '180px' // Altura similar al CallCard
      }}
    >
      {/* Cuña principal - pestaña vertical */}
      <div className="
        h-full flex flex-col items-center justify-between py-4 px-2
        bg-gray-900/95 backdrop-blur-xl
        border-l border-t border-b border-gray-600/50
        rounded-l-xl shadow-xl
        hover:border-l-green-500/70 hover:border-t-green-500/50 hover:border-b-green-500/50
        hover:shadow-green-500/20
        transition-all duration-200
      ">
        {/* Indicador pulsante vertical */}
        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-green-400 via-emerald-500 to-green-400 rounded-l animate-pulse" />
        
        {/* Flecha para expandir */}
        <div className="text-gray-400 group-hover:text-green-400 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </div>
        
        {/* Avatar mini con iniciales */}
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
          <span className="text-xs font-bold text-white">{displayName}</span>
        </div>
        
        {/* Icono de teléfono con indicador en vivo */}
        <div className="relative">
          <Phone className="w-5 h-5 text-green-400" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
        </div>
        
        {/* Duración vertical */}
        <div className="flex flex-col items-center gap-0.5">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[10px] text-gray-400 font-mono writing-mode-vertical">
            {duration}
          </span>
        </div>
      </div>
      
      {/* Tooltip en hover */}
      <div className="
        absolute right-full top-1/2 -translate-y-1/2 mr-3
        opacity-0 group-hover:opacity-100
        transition-opacity duration-200
        pointer-events-none z-10
      ">
        <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap border border-gray-700">
          <div className="font-medium text-gray-100">
            {call.nombre_completo || call.nombre_whatsapp || 'Llamada activa'}
          </div>
          <div className="text-gray-400 mt-0.5 text-[10px]">
            Clic para expandir
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MinimizedCallTab;
