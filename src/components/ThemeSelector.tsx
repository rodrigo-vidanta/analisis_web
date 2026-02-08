/**
 * ============================================
 * SELECTOR DE TEMA CON 3 OPCIONES
 * ============================================
 * 
 * Selector minimalista para cambiar entre 3 temas:
 * - Light (Claro)
 * - Twilight (Crepúsculo) 🆕
 * - Dark (Oscuro)
 * 
 * Usa el nuevo sistema de tokens de diseño.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, CloudMoon } from 'lucide-react';
import { ANIMATION_DURATIONS, SPRING_PHYSICS } from '../styles/tokens';

// ============================================
// TIPOS
// ============================================

export type ThemeMode = 'light' | 'dark';

export interface ThemeSelectorProps {
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  variant?: 'default' | 'compact';
}

// ============================================
// ICONOS ANIMADOS
// ============================================

// Sol giratorio con rayos animados
const AnimatedSunIcon: React.FC = () => (
  <motion.div className="relative w-5 h-5 flex items-center justify-center">
    {/* Rayos sutiles girando */}
    <motion.div
      className="absolute inset-0"
      animate={{ rotate: 360 }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
    >
      <svg className="w-full h-full" viewBox="0 0 20 20" fill="none">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <motion.line
            key={i}
            x1="10"
            y1="10"
            x2={10 + Math.cos((angle * Math.PI) / 180) * 8}
            y2={10 + Math.sin((angle * Math.PI) / 180) * 8}
            stroke="#D4A854"
            strokeWidth="1.5"
            strokeLinecap="round"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </svg>
    </motion.div>
    
    {/* Centro del sol */}
    <motion.div
      className="relative w-2.5 h-2.5 rounded-full bg-amber-400/90 z-10"
      animate={{ 
        scale: [1, 1.08, 1],
        boxShadow: [
          '0 0 4px rgba(217, 168, 84, 0.3)',
          '0 0 8px rgba(217, 168, 84, 0.5)',
          '0 0 4px rgba(217, 168, 84, 0.3)'
        ]
      }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

// Luna con estrellas titilantes (animación original restaurada)
const AnimatedMoonIcon: React.FC = () => (
  <motion.div className="relative w-5 h-5">
    {/* Estrellas titilantes alrededor */}
    {[
      { x: -9, y: -5, size: 2, delay: 0 },
      { x: 8, y: -7, size: 1.5, delay: 0.3 },
      { x: 7, y: 6, size: 2, delay: 0.6 },
      { x: -7, y: 5, size: 1.5, delay: 0.9 },
      { x: 0, y: -9, size: 1.5, delay: 0.2 },
    ].map((star, i) => (
      <motion.div
        key={i}
        className="absolute bg-gray-400 dark:bg-gray-300 rounded-full"
        style={{ 
          left: `calc(50% + ${star.x}px)`,
          top: `calc(50% + ${star.y}px)`,
          width: star.size,
          height: star.size
        }}
        animate={{ 
          opacity: [0.3, 1, 0.3],
          scale: [0.8, 1.2, 0.8]
        }}
        transition={{ duration: 1.5, repeat: Infinity, delay: star.delay }}
      />
    ))}
    
    {/* Luna balanceándose */}
    <motion.svg 
      className="w-5 h-5 text-gray-400 dark:text-gray-300" 
      fill="currentColor" 
      viewBox="0 0 20 20"
      animate={{ rotate: [0, 3, -3, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </motion.svg>
  </motion.div>
);

// Crepúsculo - Atardecer hermoso con horizonte y sol poniéndose
const AnimatedTwilightIcon: React.FC = () => (
  <motion.div className="relative w-5 h-5 overflow-hidden rounded">
    {/* Cielo con gradiente de atardecer (arriba a abajo) */}
    <motion.div
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(180deg, #2d3748 0%, #4a5568 30%, #ed8936 60%, #f6ad55 80%, #fbd38d 100%)',
      }}
      animate={{
        opacity: [0.8, 1, 0.8],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />

    {/* Nubes sutiles deslizándose */}
    {[0, 1].map((i) => (
      <motion.div
        key={`cloud-${i}`}
        className="absolute h-1 rounded-full bg-white/20"
        style={{
          width: `${8 + i * 2}px`,
          top: `${20 + i * 15}%`,
        }}
        animate={{
          x: [-20, 25, -20],
        }}
        transition={{
          duration: 8 + i * 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    ))}

    {/* Sol poniéndose en el horizonte */}
    <motion.div
      className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full"
      style={{
        background: 'radial-gradient(circle, #fbbf24 0%, #f59e0b 50%, #ed8936 100%)',
        boxShadow: '0 0 8px rgba(251, 191, 36, 0.6)',
      }}
      animate={{
        bottom: ['25%', '20%', '25%'],
        boxShadow: [
          '0 0 6px rgba(251, 191, 36, 0.5)',
          '0 0 10px rgba(251, 191, 36, 0.8)',
          '0 0 6px rgba(251, 191, 36, 0.5)',
        ],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />

    {/* Línea del horizonte */}
    <div 
      className="absolute bottom-0 left-0 right-0 h-px"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(237, 137, 63, 0.6) 50%, transparent 100%)',
      }}
    />

    {/* Rayos del sol */}
    {[0, 1, 2].map((i) => (
      <motion.div
        key={`ray-${i}`}
        className="absolute left-1/2 -translate-x-1/2 w-px h-2"
        style={{
          bottom: '25%',
          background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.4), transparent)',
          transformOrigin: 'bottom center',
        }}
        animate={{
          rotate: [-15 + i * 15, -15 + i * 15],
          opacity: [0.3, 0.6, 0.3],
          scaleY: [0.8, 1.2, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: i * 0.3,
          ease: 'easeInOut',
        }}
      />
    ))}

    {/* Partículas de luz flotando suavemente */}
    {[...Array(3)].map((_, i) => (
      <motion.div
        key={`particle-${i}`}
        className="absolute w-0.5 h-0.5 rounded-full bg-amber-200/60"
        style={{
          left: `${30 + i * 20}%`,
          top: `${40 + i * 10}%`,
        }}
        animate={{
          y: [0, -8, 0],
          opacity: [0, 0.8, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          delay: i * 0.8,
          ease: 'easeInOut',
        }}
      />
    ))}
  </motion.div>
);

// ============================================
// CONFIGURACIÓN DE TEMAS
// ============================================

const THEMES = [
  {
    id: 'light' as const,
    label: 'Claro',
    icon: AnimatedSunIcon,
    color: 'text-amber-500',
    bgActive: 'bg-amber-50 dark:bg-amber-900/20',
    borderActive: 'border-amber-200 dark:border-amber-700',
  },
  {
    id: 'dark' as const,
    label: 'Oscuro',
    icon: AnimatedMoonIcon,
    color: 'text-gray-400',
    bgActive: 'bg-gray-100 dark:bg-gray-800',
    borderActive: 'border-gray-300 dark:border-gray-600',
  },
] as const;

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onThemeChange,
  variant = 'default',
}) => {
  const [showLabel, setShowLabel] = useState(false);

  const isCompact = variant === 'compact';

  return (
    <div 
      className="relative"
      onMouseEnter={() => !isCompact && setShowLabel(true)}
      onMouseLeave={() => setShowLabel(false)}
    >
      {/* Container de botones */}
      <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        {THEMES.map((theme) => {
          const IconComponent = theme.icon;
          const isActive = currentTheme === theme.id;

          return (
            <motion.button
              key={theme.id}
              onClick={() => onThemeChange(theme.id)}
              className={`
                relative px-3 py-1.5 rounded-md transition-all duration-200
                ${isActive 
                  ? `bg-white dark:bg-neutral-700 shadow-sm ${theme.borderActive} border` 
                  : 'hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                }
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING_PHYSICS.soft}
              title={theme.label}
            >
              {/* Icono animado */}
              <div className="flex items-center justify-center">
                <IconComponent />
              </div>

              {/* Indicador activo */}
              {isActive && (
                <motion.div
                  layoutId="activeTheme"
                  className="absolute inset-0 -z-10"
                  transition={SPRING_PHYSICS.normal}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Label flotante (solo en variant default) */}
      <AnimatePresence>
        {showLabel && !isCompact && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: ANIMATION_DURATIONS.fast }}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-neutral-900 dark:bg-neutral-700 text-white text-xs font-medium rounded-lg whitespace-nowrap shadow-lg"
          >
            {THEMES.find(t => t.id === currentTheme)?.label}
            
            {/* Flecha */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-900 dark:bg-neutral-700 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSelector;

