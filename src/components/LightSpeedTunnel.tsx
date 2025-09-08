import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LightSpeedTunnelProps {
  isVisible: boolean;
  onComplete: () => void;
  type: 'login' | 'logout';
}

const LightSpeedTunnel: React.FC<LightSpeedTunnelProps> = ({ 
  isVisible, 
  onComplete, 
  type 
}) => {
  const [showFadeout, setShowFadeout] = useState(false);
  const [showTunnelExit, setShowTunnelExit] = useState(false);

  // Efecto de fadeout al final - VELOCIDAD EQUILIBRADA Y FLUIDA
  useEffect(() => {
    if (isVisible && type === 'login') {
      console.log('🚀 TÚNEL - Iniciando animación de anillos fluida y rápida');
      
      // VELOCIDAD EQUILIBRADA: suave y fluida
      const fadeoutTimer = setTimeout(() => {
        console.log('🚀 TÚNEL - Iniciando fadeout suave');
        setShowFadeout(true);
        setTimeout(() => {
          console.log('🚀 TÚNEL - Fadeout completado, finalizando animación');
          onComplete();
        }, 200); // Tiempo para suavidad
      }, 1300); // Tiempo ajustado para la nueva duración más suave (1.1s + 0.2s overlap)
      
      return () => {
        clearTimeout(fadeoutTimer);
      };
    } else if (isVisible && type === 'logout') {
      console.log('🚀 TÚNEL - Iniciando timer para logout');
      const timer = setTimeout(() => {
        console.log('🚀 TÚNEL - Completando logout');
        onComplete();
      }, 1000); // Equilibrado
      return () => clearTimeout(timer);
    }
  }, [isVisible, type, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Fondo negro con fade-in correcto (de afuera hacia adentro) */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,1) 100%)'
            }}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 1, 1, 0]
            }}
            transition={{ 
              duration: 1.4, // Ajustado para la nueva duración de anillos
              ease: [0.25, 0.1, 0.25, 1], // Misma curva suave que los anillos
              times: [0, 0.5, 0.85, 1] // Timing suave y coordinado
            }}
          />

          {/* Anillos concéntricos del túnel - Movidos arriba y más rápidos */}
          <div className="relative w-96 h-96" style={{ transform: 'translateY(-20px)' }}>
            {/* Anillo 1 - Más pequeño (incrementado 150%) */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-18 h-18 border-2 border-white rounded-full"
              style={{
                margin: '-36px 0 0 -36px',
                boxShadow: '0 0 4px #3B82F6, 0 0 20px #3B82F6, inset 0 0 4px #3B82F6, inset 0 0 20px #3B82F6'
              }}
              animate={{
                scale: [0, 0.8, 1.5, 2.2, 3.2, 4.5, 6, 4, 2, 0], // Transición más suave con más pasos
                opacity: [0, 0.4, 0.7, 0.9, 1, 0.9, 0.7, 0.5, 0.3, 0],
                rotate: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270] // Rotación muy gradual
              }}
              transition={{
                duration: 1.1, // Más tiempo para mayor suavidad
                ease: [0.25, 0.1, 0.25, 1], // Curva bezier muy suave
                delay: 0
              }}
            />

            {/* Anillo 2 (incrementado 150%) */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-white rounded-full"
              style={{
                margin: '-48px 0 0 -48px',
                boxShadow: '0 0 4px #8B5CF6, 0 0 20px #8B5CF6, inset 0 0 4px #8B5CF6, inset 0 0 20px #8B5CF6'
              }}
              animate={{
                scale: [0, 0.8, 1.5, 2.2, 3.2, 4.5, 6, 4, 2, 0], // Transición más suave
                opacity: [0, 0.4, 0.7, 0.9, 1, 0.9, 0.7, 0.5, 0.3, 0],
                rotate: [0, -30, -60, -90, -120, -150, -180, -210, -240, -270] // Rotación muy gradual
              }}
              transition={{
                duration: 1.1, // Más tiempo para mayor suavidad
                ease: [0.25, 0.1, 0.25, 1], // Curva bezier muy suave
                delay: 0.04 // Delay más corto para mayor overlap
              }}
            />

            {/* Anillo 3 (incrementado 150%) */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-30 h-30 border-2 border-white rounded-full"
              style={{
                margin: '-60px 0 0 -60px',
                boxShadow: '0 0 4px #06B6D4, 0 0 20px #06B6D4, inset 0 0 4px #06B6D4, inset 0 0 20px #06B6D4'
              }}
              animate={{
                scale: [0, 0.8, 1.5, 2.2, 3.2, 4.5, 6, 4, 2, 0], // Transición más suave
                opacity: [0, 0.4, 0.7, 0.9, 1, 0.9, 0.7, 0.5, 0.3, 0],
                rotate: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270] // Rotación muy gradual
              }}
              transition={{
                duration: 1.1, // Más tiempo para mayor suavidad
                ease: [0.25, 0.1, 0.25, 1], // Curva bezier muy suave
                delay: 0.08 // Delay más corto para mayor overlap
              }}
            />

            {/* Anillo 4 (incrementado 150%) */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-36 h-36 border-2 border-white rounded-full"
              style={{
                margin: '-72px 0 0 -72px',
                boxShadow: '0 0 4px #10B981, 0 0 20px #10B981, inset 0 0 4px #10B981, inset 0 0 20px #10B981'
              }}
              animate={{
                scale: [0, 0.8, 1.5, 2.2, 3.2, 4.5, 6, 4, 2, 0], // Transición más suave
                opacity: [0, 0.4, 0.7, 0.9, 1, 0.9, 0.7, 0.5, 0.3, 0],
                rotate: [0, -30, -60, -90, -120, -150, -180, -210, -240, -270] // Rotación muy gradual
              }}
              transition={{
                duration: 1.1, // Más tiempo para mayor suavidad
                ease: [0.25, 0.1, 0.25, 1], // Curva bezier muy suave
                delay: 0.12 // Delay más corto para mayor overlap
              }}
            />

            {/* Anillo 5 (incrementado 150%) */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-42 h-42 border-2 border-white rounded-full"
              style={{
                margin: '-84px 0 0 -84px',
                boxShadow: '0 0 4px #F59E0B, 0 0 20px #F59E0B, inset 0 0 4px #F59E0B, inset 0 0 20px #F59E0B'
              }}
              animate={{
                scale: [0, 0.8, 1.5, 2.2, 3.2, 4.5, 6, 4, 2, 0], // Transición más suave
                opacity: [0, 0.4, 0.7, 0.9, 1, 0.9, 0.7, 0.5, 0.3, 0],
                rotate: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270] // Rotación muy gradual
              }}
              transition={{
                duration: 1.1, // Más tiempo para mayor suavidad
                ease: [0.25, 0.1, 0.25, 1], // Curva bezier muy suave
                delay: 0.16 // Delay más corto para mayor overlap
              }}
            />

            {/* Anillo 6 - Más grande (incrementado 150%) */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-48 h-48 border-2 border-white rounded-full"
              style={{
                margin: '-96px 0 0 -96px',
                boxShadow: '0 0 4px #EF4444, 0 0 20px #EF4444, inset 0 0 4px #EF4444, inset 0 0 20px #EF4444'
              }}
              animate={{
                scale: [0, 0.8, 1.5, 2.2, 3.2, 4.5, 6, 4, 2, 0], // Transición más suave
                opacity: [0, 0.4, 0.7, 0.9, 1, 0.9, 0.7, 0.5, 0.3, 0],
                rotate: [0, -30, -60, -90, -120, -150, -180, -210, -240, -270] // Rotación muy gradual
              }}
              transition={{
                duration: 1.1, // Más tiempo para mayor suavidad
                ease: [0.25, 0.1, 0.25, 1], // Curva bezier muy suave
                delay: 0.2 // Delay más corto para mayor overlap
              }}
            />

            {/* Sin centro negro - Solo anillos concéntricos */}
          </div>

          {/* Efecto de desvanecido simple del negro al transparente */}
          {showFadeout && type === 'login' && (
            <motion.div
              className="absolute inset-0 bg-black"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }} // SUAVE Y EQUILIBRADO
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LightSpeedTunnel;