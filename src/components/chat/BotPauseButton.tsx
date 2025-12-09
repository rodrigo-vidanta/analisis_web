import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BotPauseButtonProps {
  uchatId: string;
  isPaused: boolean;
  timeRemaining: number | null; // segundos restantes
  onPause: (uchatId: string, durationMinutes: number | null, force: boolean) => Promise<boolean>;
  onResume: (uchatId: string) => Promise<boolean>;
  showUpward?: boolean; // Si true, el dropdown aparece hacia arriba
  fullWidth?: boolean; // Si true, el botón ocupa todo el ancho disponible
}

const PAUSE_OPTIONS = [
  { label: '5 min', minutes: 5, color: 'from-amber-400 to-yellow-500' },
  { label: '15 min', minutes: 15, color: 'from-orange-400 to-amber-500' },
  { label: '30 min', minutes: 30, color: 'from-red-400 to-orange-500' },
  { label: '1 hora', minutes: 60, color: 'from-purple-400 to-pink-500' },
  { label: 'Indefinido', minutes: null, color: 'from-slate-400 to-gray-500' },
];

const BotPauseButton: React.FC<BotPauseButtonProps> = ({
  uchatId,
  isPaused,
  timeRemaining,
  onPause,
  onResume,
  showUpward = false,
  fullWidth = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayTime, setDisplayTime] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Formatear tiempo para mostrar en el botón
  const formatCompactTime = (seconds: number | null): string => {
    if (seconds === null || seconds <= 0) return '';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${secs}s`;
  };

  // Actualizar tiempo mostrado cada segundo
  useEffect(() => {
    if (isPaused && timeRemaining !== null && timeRemaining > 0) {
      setDisplayTime(formatCompactTime(timeRemaining));
      
      const interval = setInterval(() => {
        setDisplayTime(prev => {
          const currentSeconds = timeRemaining - Math.floor((Date.now() - Date.now()) / 1000);
          return formatCompactTime(currentSeconds > 0 ? currentSeconds : 0);
        });
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      setDisplayTime('');
    }
  }, [isPaused, timeRemaining]);

  // Detectar si el botón está cerca del borde inferior para mostrar dropdown hacia arriba
  const [shouldShowUpward, setShouldShowUpward] = useState(showUpward);

  useEffect(() => {
    if (isOpen && buttonRef.current && !showUpward) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const dropdownHeight = 200; // Altura aproximada del dropdown
      
      // Si hay menos de 220px de espacio debajo, mostrar hacia arriba
      setShouldShowUpward(spaceBelow < dropdownHeight + 20);
    } else {
      setShouldShowUpward(showUpward);
    }
  }, [isOpen, showUpward]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMainButtonClick = async () => {
    if (isPaused) {
      // Si está pausado, reactivar
      setIsLoading(true);
      await onResume(uchatId);
      setIsLoading(false);
    } else {
      // Si no está pausado, abrir/cerrar opciones
      setIsOpen(!isOpen);
    }
  };

  const handlePauseSelect = async (minutes: number | null) => {
    setIsLoading(true);
    setIsOpen(false);
    await onPause(uchatId, minutes, true);
    setIsLoading(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${fullWidth ? 'w-full' : ''}`}>
      {/* Botón principal */}
      <motion.button
        ref={buttonRef}
        key={isPaused ? 'paused' : 'active'}
        onClick={handleMainButtonClick}
        disabled={isLoading}
        className={`relative ${fullWidth ? 'w-full' : 'w-10'} ${fullWidth ? 'py-2.5' : 'aspect-square'} rounded-xl flex items-center justify-center overflow-hidden ${
          isPaused
            ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/40'
            : isOpen
              ? 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30'
              : 'bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ rotate: { duration: 1, repeat: Infinity, ease: 'linear' } }}
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
            />
          ) : isPaused ? (
            <motion.div
              key="paused"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex flex-col items-center justify-center"
            >
              {/* Contador circular */}
              <svg className="w-9 h-9 absolute" viewBox="0 0 36 36">
                <motion.circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="3"
                />
                <motion.circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="94.2"
                  strokeDashoffset={94.2 * (1 - (timeRemaining || 0) / ((timeRemaining || 1) + 1))}
                  transform="rotate(-90 18 18)"
                  initial={{ strokeDashoffset: 0 }}
                  animate={{ strokeDashoffset: 94.2 }}
                  transition={{ duration: timeRemaining || 60, ease: 'linear' }}
                />
              </svg>
              <span className="text-white text-[10px] font-bold z-10">
                {displayTime || '∞'}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {/* Icono de pausa */}
              <svg 
                className={`w-5 h-5 ${isOpen ? 'text-white' : 'text-slate-500 dark:text-gray-400'}`} 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Indicador de pausa activa (pulso) */}
        <AnimatePresence>
          {isPaused && (
            <motion.div
              className="absolute inset-0 rounded-xl bg-orange-500"
              initial={{ opacity: 0.5, scale: 1 }}
              animate={{ opacity: 0, scale: 1.5 }}
              exit={{ opacity: 0, scale: 1 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown de opciones */}
      <AnimatePresence>
        {isOpen && !isPaused && (
          <motion.div
            initial={{ opacity: 0, y: shouldShowUpward ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: shouldShowUpward ? 10 : -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute ${shouldShowUpward ? 'bottom-full right-0 mb-2' : 'top-full right-0 mt-2'} w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-slate-200 dark:border-gray-700 overflow-hidden z-50`}
          >
            <div className="p-1.5">
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
                Pausar Bot
              </div>
              {PAUSE_OPTIONS.map((option, index) => (
                <motion.button
                  key={option.label}
                  onClick={() => handlePauseSelect(option.minutes)}
                  className="w-full px-3 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-gray-200 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 group"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ x: 4 }}
                >
                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${option.color} group-hover:scale-125 transition-transform`} />
                  {option.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BotPauseButton;

