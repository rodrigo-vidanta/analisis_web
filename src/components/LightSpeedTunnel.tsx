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
      console.log('🚀 TÚNEL - Iniciando timer de llegada al final del túnel (3.5 segundos)');
      
      // Primero: efecto de llegada al final del túnel (anillos se abren)
      const tunnelExitTimer = setTimeout(() => {
        console.log('🚀 TÚNEL - Llegando al final del túnel, abriendo anillos');
        setShowTunnelExit(true);
      }, 3500);
      
      // Segundo: fadeout negro al dashboard (1 segundo después)
      const fadeoutTimer = setTimeout(() => {
        console.log('🚀 TÚNEL - Iniciando fadeout negro al dashboard');
        setShowFadeout(true);
        setTimeout(() => {
          console.log('🚀 TÚNEL - Fadeout completado, finalizando animación');
          onComplete();
        }, 1000);
      }, 4500); // 4.5 segundos total
      
      return () => {
        clearTimeout(tunnelExitTimer);
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
          {/* Fondo negro */}
          <motion.div
            className="absolute inset-0 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />

          {/* Anillos concéntricos del túnel */}
          <div className="relative w-96 h-96">
            {/* Anillo 1 - Más pequeño (50px) */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-12 h-12 border-2 border-white rounded-full"
              style={{
                margin: '-24px 0 0 -24px',
                boxShadow: '0 0 4px #3B82F6, 0 0 20px #3B82F6, inset 0 0 4px #3B82F6, inset 0 0 20px #3B82F6'
              }}
              animate={{
                scale: showTunnelExit ? [1, 1.5, 2, 3, 4] : [0, 1, 1.2, 1.5, 1.8],
                opacity: showTunnelExit ? [1, 0.8, 0.6, 0.4, 0] : [0, 0.8, 1, 0.8, 0.6],
                rotate: showTunnelExit ? [0, 180, 360, 540, 720] : [0, 90, 180, 270, 360]
              }}
              transition={{
                duration: showTunnelExit ? 1 : 4,
                ease: "easeInOut",
                delay: showTunnelExit ? 0 : 0
              }}
            />

            {/* Anillo 2 (64px) */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-16 h-16 border-2 border-white rounded-full"
              style={{
                margin: '-32px 0 0 -32px',
                boxShadow: '0 0 4px #8B5CF6, 0 0 20px #8B5CF6, inset 0 0 4px #8B5CF6, inset 0 0 20px #8B5CF6'
              }}
              animate={{
                scale: showTunnelExit ? [1, 1.5, 2, 3, 4] : [0, 1, 1.2, 1.5, 1.8],
                opacity: showTunnelExit ? [1, 0.8, 0.6, 0.4, 0] : [0, 0.8, 1, 0.8, 0.6],
                rotate: showTunnelExit ? [0, -180, -360, -540, -720] : [0, -90, -180, -270, -360]
              }}
              transition={{
                duration: showTunnelExit ? 1 : 4,
                ease: "easeInOut",
                delay: showTunnelExit ? 0.1 : 0.1
              }}
            />

            {/* Anillo 3 (78px) */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-20 h-20 border-2 border-white rounded-full"
              style={{
                margin: '-40px 0 0 -40px',
                boxShadow: '0 0 4px #06B6D4, 0 0 20px #06B6D4, inset 0 0 4px #06B6D4, inset 0 0 20px #06B6D4'
              }}
              animate={{
                scale: showTunnelExit ? [1, 1.5, 2, 3, 4] : [0, 1, 1.2, 1.5, 1.8],
                opacity: showTunnelExit ? [1, 0.8, 0.6, 0.4, 0] : [0, 0.8, 1, 0.8, 0.6],
                rotate: showTunnelExit ? [0, 180, 360, 540, 720] : [0, 90, 180, 270, 360]
              }}
              transition={{
                duration: showTunnelExit ? 1 : 4,
                ease: "easeInOut",
                delay: showTunnelExit ? 0.2 : 0.2
              }}
            />

            {/* Anillo 4 (92px) */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-white rounded-full"
              style={{
                margin: '-48px 0 0 -48px',
                boxShadow: '0 0 4px #10B981, 0 0 20px #10B981, inset 0 0 4px #10B981, inset 0 0 20px #10B981'
              }}
              animate={{
                scale: showTunnelExit ? [1, 1.5, 2, 3, 4] : [0, 1, 1.2, 1.5, 1.8],
                opacity: showTunnelExit ? [1, 0.8, 0.6, 0.4, 0] : [0, 0.8, 1, 0.8, 0.6],
                rotate: showTunnelExit ? [0, -180, -360, -540, -720] : [0, -90, -180, -270, -360]
              }}
              transition={{
                duration: showTunnelExit ? 1 : 4,
                ease: "easeInOut",
                delay: showTunnelExit ? 0.3 : 0.3
              }}
            />

            {/* Anillo 5 (104px) */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-28 h-28 border-2 border-white rounded-full"
              style={{
                margin: '-56px 0 0 -56px',
                boxShadow: '0 0 4px #F59E0B, 0 0 20px #F59E0B, inset 0 0 4px #F59E0B, inset 0 0 20px #F59E0B'
              }}
              animate={{
                scale: showTunnelExit ? [1, 1.5, 2, 3, 4] : [0, 1, 1.2, 1.5, 1.8],
                opacity: showTunnelExit ? [1, 0.8, 0.6, 0.4, 0] : [0, 0.8, 1, 0.8, 0.6],
                rotate: showTunnelExit ? [0, 180, 360, 540, 720] : [0, 90, 180, 270, 360]
              }}
              transition={{
                duration: showTunnelExit ? 1 : 4,
                ease: "easeInOut",
                delay: showTunnelExit ? 0.4 : 0.4
              }}
            />

            {/* Anillo 6 - Más grande (118px) */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-32 h-32 border-2 border-white rounded-full"
              style={{
                margin: '-64px 0 0 -64px',
                boxShadow: '0 0 4px #EF4444, 0 0 20px #EF4444, inset 0 0 4px #EF4444, inset 0 0 20px #EF4444'
              }}
              animate={{
                scale: showTunnelExit ? [1, 1.5, 2, 3, 4] : [0, 1, 1.2, 1.5, 1.8],
                opacity: showTunnelExit ? [1, 0.8, 0.6, 0.4, 0] : [0, 0.8, 1, 0.8, 0.6],
                rotate: showTunnelExit ? [0, -180, -360, -540, -720] : [0, -90, -180, -270, -360]
              }}
              transition={{
                duration: showTunnelExit ? 1 : 4,
                ease: "easeInOut",
                delay: showTunnelExit ? 0.5 : 0.5
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
                scale: showTunnelExit ? [1, 2, 4, 8, 16] : [0, 1, 1.5, 2, 2.5],
                opacity: showTunnelExit ? [1, 0.8, 0.6, 0.4, 0] : [0, 1, 1, 0.8, 0.6]
              }}
              transition={{
                duration: showTunnelExit ? 1 : 4,
                ease: "easeInOut"
              }}
            />

            {/* Texto de transición */}
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-2xl font-bold text-center z-10"
              animate={{
                opacity: showTunnelExit ? [1, 0] : [0, 1, 0],
                y: showTunnelExit ? [0, -50] : [30, 0, -30],
                scale: showTunnelExit ? [1, 0.8] : [0.8, 1, 0.8]
              }}
              transition={{
                duration: showTunnelExit ? 0.5 : 3,
                ease: "easeInOut",
                times: showTunnelExit ? [0, 1] : [0, 0.5, 1]
              }}
            >
              {type === 'login' ? (
                <>
                  <div className="text-4xl mb-2">🚀</div>
                  <div>Entrando al túnel de velocidad luz...</div>
                  <div className="text-sm mt-1 opacity-70">Sumergiéndose en la interfaz</div>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2">👋</div>
                  <div>Saliendo del sistema...</div>
                </>
              )}
            </motion.div>
          </div>

          {/* Efecto de fadeout negro al dashboard */}
          {showFadeout && type === 'login' && (
            <motion.div
              className="absolute inset-0 bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LightSpeedTunnel;