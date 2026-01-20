/**
 * ============================================
 * COMPONENTE: Indicador de Estado de Red
 * ============================================
 * 
 * Muestra una notificación sutil cuando se pierde la conexión
 * y un mensaje de reconexión cuando se restaura.
 * 
 * @author Team PQNC
 * @since 2026-01-20
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface NetworkStatusIndicatorProps {
  /** Posición del indicador */
  position?: 'top' | 'bottom';
  /** Mostrar siempre o solo cuando hay problemas */
  showWhenOnline?: boolean;
}

/**
 * Indicador visual del estado de conexión a internet
 * 
 * @example
 * ```tsx
 * // En App.tsx o layout principal
 * <NetworkStatusIndicator position="bottom" />
 * ```
 */
export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  position = 'bottom',
  showWhenOnline = false,
}) => {
  const { isOnline, justReconnected, offlineDuration } = useNetworkStatus();

  // Formatear duración offline
  const formatDuration = (ms: number): string => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  };

  const positionClasses = position === 'top'
    ? 'top-4 left-1/2 -translate-x-1/2'
    : 'bottom-4 left-1/2 -translate-x-1/2';

  return (
    <AnimatePresence>
      {/* Indicador de Offline */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: position === 'top' ? -20 : 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === 'top' ? -20 : 20, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`fixed ${positionClasses} z-[9999] flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-full shadow-lg`}
        >
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">
            Sin conexión a internet
            {offlineDuration > 5000 && (
              <span className="ml-1 opacity-80">
                ({formatDuration(offlineDuration)})
              </span>
            )}
          </span>
          <RefreshCw className="w-4 h-4 animate-spin opacity-70" />
        </motion.div>
      )}

      {/* Indicador de Reconexión */}
      {justReconnected && (
        <motion.div
          initial={{ opacity: 0, y: position === 'top' ? -20 : 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === 'top' ? -20 : 20, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`fixed ${positionClasses} z-[9999] flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-full shadow-lg`}
        >
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">Conexión restaurada</span>
        </motion.div>
      )}

      {/* Indicador de Online (opcional) */}
      {showWhenOnline && isOnline && !justReconnected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          className={`fixed ${positionClasses} z-[9998] flex items-center gap-1.5 px-3 py-1.5 bg-gray-900/70 text-white/80 rounded-full`}
        >
          <Wifi className="w-3 h-3" />
          <span className="text-xs">Online</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NetworkStatusIndicator;
