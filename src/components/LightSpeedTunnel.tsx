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

  // Efecto de fadeout al final
  useEffect(() => {
    if (isVisible && type === 'login') {
      console.log('🚀 TÚNEL - Iniciando animación de anillos apareciendo uno por uno');
      
      // Solo anillos flotantes - Sin fadeout
      const fadeoutTimer = setTimeout(() => {
        console.log('🚀 ANILLOS - Finalizando animación de anillos flotantes');
        onComplete();
      }, 1600); // 1.6 segundos total (solo anillos)
      
      return () => {
        clearTimeout(fadeoutTimer);
      };
    } else if (isVisible && type === 'logout') {
      console.log('🚀 TÚNEL - Iniciando timer para logout');
      const timer = setTimeout(() => {
        console.log('🚀 TÚNEL - Completando logout');
        onComplete();
      }, 2000);
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
          {/* Sin fondo negro - Solo anillos */}

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
                scale: [0, 1, 1.5, 2, 3, 4, 0],
                opacity: [0, 0.8, 1, 0.8, 0.6, 0.4, 0],
                rotate: [0, 45, 90, 135, 180, 225, 270]
              }}
              transition={{
                duration: 1.4,
                ease: "easeInOut",
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
                scale: [0, 1, 1.5, 2, 3, 4, 0],
                opacity: [0, 0.8, 1, 0.8, 0.6, 0.4, 0],
                rotate: [0, -45, -90, -135, -180, -225, -270]
              }}
              transition={{
                duration: 1.4,
                ease: "easeInOut",
                delay: 0.1
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
                scale: [0, 1, 1.5, 2, 3, 4, 0],
                opacity: [0, 0.8, 1, 0.8, 0.6, 0.4, 0],
                rotate: [0, 45, 90, 135, 180, 225, 270]
              }}
              transition={{
                duration: 1.4,
                ease: "easeInOut",
                delay: 0.2
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
                scale: [0, 1, 1.5, 2, 3, 4, 0],
                opacity: [0, 0.8, 1, 0.8, 0.6, 0.4, 0],
                rotate: [0, -45, -90, -135, -180, -225, -270]
              }}
              transition={{
                duration: 1.4,
                ease: "easeInOut",
                delay: 0.3
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
                scale: [0, 1, 1.5, 2, 3, 4, 0],
                opacity: [0, 0.8, 1, 0.8, 0.6, 0.4, 0],
                rotate: [0, 45, 90, 135, 180, 225, 270]
              }}
              transition={{
                duration: 1.4,
                ease: "easeInOut",
                delay: 0.4
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
                scale: [0, 1, 1.5, 2, 3, 4, 0],
                opacity: [0, 0.8, 1, 0.8, 0.6, 0.4, 0],
                rotate: [0, -45, -90, -135, -180, -225, -270]
              }}
              transition={{
                duration: 1.4,
                ease: "easeInOut",
                delay: 0.5
              }}
            />

            {/* Sin centro negro - Solo anillos flotantes */}
          </div>

          {/* Sin fadeout - Solo anillos flotantes */}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LightSpeedTunnel;