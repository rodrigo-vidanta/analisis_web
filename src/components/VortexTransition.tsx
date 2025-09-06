import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VortexTransitionProps {
  isVisible: boolean;
  onComplete: () => void;
  type: 'login' | 'logout';
}

const VortexTransition: React.FC<VortexTransitionProps> = ({ 
  isVisible, 
  onComplete, 
  type 
}) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);

  // Generar partículas estelares
  useEffect(() => {
    if (isVisible) {
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
        delay: Math.random() * 2
      }));
      setParticles(newParticles);
    }
  }, [isVisible]);

  // Configuración de animación según el tipo
  const getAnimationConfig = () => {
    if (type === 'login') {
      return {
        initial: { scale: 0, rotate: 0, opacity: 0 },
        animate: { 
          scale: [0, 1.2, 1], 
          rotate: [0, 360, 720], 
          opacity: [0, 1, 0.8] 
        },
        exit: { 
          scale: 0, 
          rotate: 1440, 
          opacity: 0 
        },
        transition: { 
          duration: 2.5, 
          ease: "easeInOut",
          times: [0, 0.6, 1]
        }
      };
    } else {
      return {
        initial: { scale: 1, rotate: 0, opacity: 0.8 },
        animate: { 
          scale: [1, 1.2, 0], 
          rotate: [0, -360, -720], 
          opacity: [0.8, 1, 0] 
        },
        exit: { 
          scale: 0, 
          rotate: -1440, 
          opacity: 0 
        },
        transition: { 
          duration: 2.5, 
          ease: "easeInOut",
          times: [0, 0.4, 1]
        }
      };
    }
  };

  const config = getAnimationConfig();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Fondo con gradiente estelar */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />

          {/* Vórtice principal */}
          <motion.div
            className="relative w-96 h-96"
            {...config}
            onAnimationComplete={() => {
              setTimeout(() => {
                onComplete();
              }, 500);
            }}
          >
            {/* Círculos concéntricos */}
            {[1, 2, 3, 4, 5].map((ring) => (
              <motion.div
                key={ring}
                className="absolute inset-0 rounded-full border-2 border-white/20"
                style={{
                  width: `${ring * 20}%`,
                  height: `${ring * 20}%`,
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
                animate={{
                  rotate: type === 'login' ? 360 : -360,
                  scale: type === 'login' ? [0.5, 1, 0.5] : [1, 0.5, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                  delay: ring * 0.1
                }}
              />
            ))}

            {/* Partículas estelares */}
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`
                }}
                animate={{
                  x: type === 'login' ? [0, (Math.random() - 0.5) * 200] : [(Math.random() - 0.5) * 200, 0],
                  y: type === 'login' ? [0, (Math.random() - 0.5) * 200] : [(Math.random() - 0.5) * 200, 0],
                  opacity: type === 'login' ? [0, 1, 0] : [1, 0, 0],
                  scale: type === 'login' ? [0, 1, 0] : [1, 0, 0]
                }}
                transition={{
                  duration: 2,
                  delay: particle.delay,
                  ease: "easeOut"
                }}
              />
            ))}

            {/* Centro del vórtice */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-8 h-8 bg-white rounded-full"
              style={{ transform: 'translate(-50%, -50%)' }}
              animate={{
                scale: type === 'login' ? [0, 2, 1] : [1, 2, 0],
                opacity: type === 'login' ? [0, 1, 0.8] : [0.8, 1, 0],
                rotate: type === 'login' ? 360 : -360
              }}
              transition={{
                duration: 2.5,
                ease: "easeInOut"
              }}
            />

            {/* Efectos de luz */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)'
              }}
              animate={{
                scale: type === 'login' ? [0, 1.5, 1] : [1, 1.5, 0],
                opacity: type === 'login' ? [0, 0.8, 0.4] : [0.4, 0.8, 0]
              }}
              transition={{
                duration: 2.5,
                ease: "easeInOut"
              }}
            />

            {/* Texto de transición */}
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xl font-bold"
              animate={{
                opacity: type === 'login' ? [0, 1, 0] : [0, 1, 0],
                y: type === 'login' ? [20, 0, -20] : [-20, 0, 20]
              }}
              transition={{
                duration: 2.5,
                ease: "easeInOut",
                times: [0, 0.5, 1]
              }}
            >
              {type === 'login' ? '🚀 Entrando...' : '👋 Saliendo...'}
            </motion.div>
          </motion.div>

          {/* Efectos de partículas adicionales */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/30 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`
                }}
                animate={{
                  x: type === 'login' ? [0, (Math.random() - 0.5) * 400] : [(Math.random() - 0.5) * 400, 0],
                  y: type === 'login' ? [0, (Math.random() - 0.5) * 400] : [(Math.random() - 0.5) * 400, 0],
                  opacity: type === 'login' ? [0, 1, 0] : [1, 0, 0],
                  scale: type === 'login' ? [0, 1, 0] : [1, 0, 0]
                }}
                transition={{
                  duration: 3,
                  delay: Math.random() * 2,
                  ease: "easeOut"
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VortexTransition;
