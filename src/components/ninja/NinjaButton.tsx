/**
 * ============================================
 * NINJA BUTTON
 * ============================================
 * 
 * Botón con estrellas ninja animadas que aparece solo para administradores.
 * Al pasar el mouse, las estrellas se "lanzan" con animación.
 * Al hacer clic, abre el modal de selección de modo ninja.
 * 
 * @version 1.0.0
 * @date 2026-01-21
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// PROPS
// ============================================

interface NinjaButtonProps {
  onClick: () => void;
  className?: string;
}

// ============================================
// COMPONENTE DE ESTRELLA NINJA
// ============================================

const NinjaStar = ({ 
  index, 
  isHovered, 
  size = 'md' 
}: { 
  index: number; 
  isHovered: boolean;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };
  
  // Direcciones de lanzamiento únicas para cada estrella
  const throwDirections = [
    { x: -60, y: -30, rotate: 720 },
    { x: 40, y: -50, rotate: -540 },
    { x: 60, y: 20, rotate: 360 },
    { x: -40, y: 40, rotate: -720 },
    { x: 0, y: -60, rotate: 540 },
  ];
  
  const direction = throwDirections[index % throwDirections.length];
  
  return (
    <motion.svg
      className={`${sizes[size]} absolute`}
      viewBox="0 0 24 24"
      fill="currentColor"
      initial={{ 
        x: 0, 
        y: 0, 
        rotate: 0, 
        scale: 1,
        opacity: 1 
      }}
      animate={isHovered ? {
        x: direction.x,
        y: direction.y,
        rotate: direction.rotate,
        scale: [1, 1.2, 0],
        opacity: [1, 1, 0],
      } : {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        opacity: 1,
      }}
      transition={{
        duration: isHovered ? 0.6 : 0.3,
        delay: isHovered ? index * 0.05 : 0,
        ease: isHovered ? [0.25, 0.46, 0.45, 0.94] : 'easeOut',
      }}
    >
      {/* Estrella ninja de 4 puntas (shuriken) */}
      <path d="M12 2L9.5 9.5L2 12L9.5 14.5L12 22L14.5 14.5L22 12L14.5 9.5L12 2Z" />
    </motion.svg>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const NinjaButton: React.FC<NinjaButtonProps> = ({ onClick, className = '' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showStars, setShowStars] = useState(true);
  
  // Manejar el hover para lanzar estrellas
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    // Después de lanzar, regenerar estrellas
    setTimeout(() => {
      setShowStars(false);
      setTimeout(() => {
        setShowStars(true);
        setIsHovered(false);
      }, 100);
    }, 600);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    // Solo resetear si no está en animación
    if (!isHovered) {
      setShowStars(true);
    }
  }, [isHovered]);
  
  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative group ${className}`}
      whileTap={{ scale: 0.95 }}
    >
      {/* Container principal - sin fondo ni borde */}
      <motion.div
        className="relative w-10 h-10 rounded-xl flex items-center justify-center overflow-visible transition-colors duration-300"
      >
        {/* Estrellas ninja giratorias de fondo */}
        <AnimatePresence>
          {showStars && (
            <>
              {/* Estrellas principales que se lanzan */}
              <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                {[0, 1, 2, 3, 4].map((i) => (
                  <NinjaStar key={i} index={i} isHovered={isHovered} size="sm" />
                ))}
              </div>
              
              {/* Estrella central estática */}
              <motion.div
                className="relative z-10 text-red-400 group-hover:text-red-300 transition-colors"
                animate={!isHovered ? { rotate: 360 } : { rotate: 0 }}
                transition={{ 
                  duration: 8, 
                  repeat: Infinity, 
                  ease: 'linear',
                  repeatType: 'loop'
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L9.5 9.5L2 12L9.5 14.5L12 22L14.5 14.5L22 12L14.5 9.5L12 2Z" />
                </svg>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        
        {/* Efecto de brillo sutil en hover */}
        <motion.div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
        
        {/* Partículas de brillo */}
        <AnimatePresence>
          {isHovered && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  className="absolute w-1 h-1 bg-gray-600 rounded-full"
                  initial={{ 
                    opacity: 0, 
                    scale: 0,
                    x: 0,
                    y: 0
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: (Math.random() - 0.5) * 40,
                    y: (Math.random() - 0.5) * 40,
                  }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.05,
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.button>
  );
};

// ============================================
// COMPONENTE DE INDICADOR MODO NINJA ACTIVO
// ============================================

export const NinjaModeIndicator: React.FC<{
  userName: string;
  onExit: () => void;
}> = ({ userName, onExit }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 rounded-xl"
    >
      {/* Icono ninja pulsante */}
      <motion.span
        className="text-lg"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        🥷
      </motion.span>
      
      {/* Nombre del usuario suplantado */}
      <div className="hidden md:block">
        <span className="text-xs text-red-400">Modo Ninja:</span>
        <span className="ml-1 text-sm font-medium text-red-300">{userName}</span>
      </div>
      
      {/* Botón salir */}
      <motion.button
        onClick={onExit}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-300 hover:text-white transition-colors"
        title="Salir del Modo Ninja"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </motion.button>
    </motion.div>
  );
};

// ============================================
// AVATAR NINJA
// ============================================

export const NinjaAvatar: React.FC<{
  initial: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ initial, size = 'md' }) => {
  const sizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };
  
  return (
    <motion.div
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-500 flex items-center justify-center relative overflow-hidden`}
      animate={{ 
        boxShadow: ['0 0 10px rgba(239, 68, 68, 0.3)', '0 0 20px rgba(239, 68, 68, 0.5)', '0 0 10px rgba(239, 68, 68, 0.3)']
      }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      {/* Cara ninja simplificada */}
      <svg className="w-full h-full" viewBox="0 0 24 24">
        {/* Fondo */}
        <circle cx="12" cy="12" r="10" fill="none" />
        
        {/* Banda del ninja (máscara) */}
        <rect x="4" y="9" width="16" height="6" rx="1" fill="#1f2937" />
        
        {/* Ojos */}
        <circle cx="8" cy="12" r="1.5" fill="#fff" />
        <circle cx="16" cy="12" r="1.5" fill="#fff" />
        
        {/* Pupilas */}
        <circle cx="8" cy="12" r="0.7" fill="#000" />
        <circle cx="16" cy="12" r="0.7" fill="#000" />
        
        {/* Brillo en los ojos */}
        <circle cx="8.5" cy="11.5" r="0.3" fill="#fff" opacity="0.8" />
        <circle cx="16.5" cy="11.5" r="0.3" fill="#fff" opacity="0.8" />
      </svg>
      
      {/* Inicial como fallback superpuesta sutilmente */}
      <span className="absolute bottom-0 right-0 w-3 h-3 bg-black/50 rounded-full text-[8px] flex items-center justify-center text-red-300 font-bold">
        {initial}
      </span>
    </motion.div>
  );
};

export default NinjaButton;
