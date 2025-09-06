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
      
      // Solo la segunda parte: anillos aparecen uno por uno y desaparecen
      const fadeoutTimer = setTimeout(() => {
        console.log('🚀 TÚNEL - Iniciando fadeout degradado al dashboard');
        setShowFadeout(true);
        setTimeout(() => {
          console.log('🚀 TÚNEL - Fadeout completado, finalizando animación');
          onComplete();
        }, 300);
      }, 1800); // 1.8 segundos total (más rápido)
      
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
          {/* Fondo negro con fade-in correcto (de afuera hacia adentro) */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,1) 100%)'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
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

            {/* Centro negro del túnel - Punto de fuga */}
            <motion.div
              className="absolute top-1/2 left-1/2 bg-black rounded-full"
              style={{ 
                margin: '-16px 0 0 -16px',
                width: '32px',
                height: '32px',
                boxShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.6), 0 0 60px rgba(0,0,0,0.4)'
              }}
              animate={{
                scale: [0, 1, 1.2, 1.4, 1.6, 1.8, 2.0],
                opacity: [0, 1, 1, 0.9, 0.8, 0.7, 0.6]
              }}
              transition={{
                duration: 1.4,
                ease: "easeInOut"
              }}
            />
          </div>

          {/* Efecto de desvanecido simple del negro al transparente */}
          {showFadeout && type === 'login' && (
            <motion.div
              className="absolute inset-0 bg-black"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LightSpeedTunnel;