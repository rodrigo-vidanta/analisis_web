/**
 * ============================================
 * BOTON FLOTANTE DE MARCACION
 * ============================================
 *
 * FAB (Floating Action Button) en esquina inferior derecha.
 * Visible en toda la plataforma excepto:
 * - WhatsApp (live-chat)
 * - Campanas (campaigns)
 * - Dashboard (dashboard)
 * - Administracion (admin)
 *
 * Animacion heartbeat elegante.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Phone } from 'lucide-react';

interface FloatingDialerButtonProps {
  onClick: () => void;
  /** Current app module to determine visibility */
  appMode: string;
}

/** Modules where the FAB is hidden */
const HIDDEN_MODULES = new Set(['live-chat', 'campaigns', 'dashboard', 'admin']);

export const FloatingDialerButton: React.FC<FloatingDialerButtonProps> = ({
  onClick,
  appMode,
}) => {
  if (HIDDEN_MODULES.has(appMode)) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0, y: 20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.3 }}
      onClick={onClick}
      className="fixed bottom-8 right-8 z-40 group"
      aria-label="Iniciar llamada"
    >
      {/* Outer pulse rings */}
      <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
      <span className="absolute inset-[-4px] rounded-full bg-emerald-500/10 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />

      {/* Main button */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1, 1.03, 1],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700
                   shadow-lg shadow-emerald-600/40 flex items-center justify-center
                   group-hover:from-emerald-400 group-hover:to-emerald-600
                   group-hover:shadow-emerald-500/50 group-hover:shadow-xl
                   group-active:scale-95 transition-all duration-200"
      >
        <Phone className="w-6 h-6 text-white" />
      </motion.div>

      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-3 px-3 py-1.5 bg-gray-900 text-white text-xs
                       rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity
                       pointer-events-none shadow-lg border border-gray-700/50">
        Nueva llamada
        <div className="absolute top-full right-5 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px]
                        border-l-transparent border-r-transparent border-t-gray-900" />
      </div>
    </motion.button>
  );
};

export default FloatingDialerButton;
