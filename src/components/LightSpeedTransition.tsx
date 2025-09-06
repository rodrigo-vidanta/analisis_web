import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LightSpeedTransitionProps {
  isVisible: boolean;
  onComplete: () => void;
  type: 'login' | 'logout';
}

const LightSpeedTransition: React.FC<LightSpeedTransitionProps> = ({ 
  isVisible, 
  onComplete, 
  type 
}) => {
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number; size: number; speed: number }>>([]);
  const [showFadeout, setShowFadeout] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('🚀 LightSpeedTransition - isVisible:', isVisible, 'type:', type);
  }, [isVisible, type]);

  // Generar estrellas para el efecto de velocidad luz
  useEffect(() => {
    if (isVisible) {
      const newStars = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.5
      }));
      setStars(newStars);
    }
  }, [isVisible]);

  // Configuración de animación según el tipo
  const getAnimationConfig = () => {
    if (type === 'login') {
      return {
        initial: { scale: 0, opacity: 0 },
        animate: { 
          scale: [0, 0.5, 1.2, 1], 
          opacity: [0, 0.3, 0.8, 1] 
        },
        exit: { 
          scale: 0, 
          opacity: 0 
        },
        transition: { 
          duration: 5.0, 
          ease: "easeInOut",
          times: [0, 0.3, 0.7, 1]
        }
      };
    } else {
      return {
        initial: { scale: 1, opacity: 1 },
        animate: { 
          scale: [1, 1.2, 0.5, 0], 
          opacity: [1, 0.8, 0.3, 0] 
        },
        exit: { 
          scale: 0, 
          opacity: 0 
        },
        transition: { 
          duration: 2.5, 
          ease: "easeInOut",
          times: [0, 0.3, 0.7, 1]
        }
      };
    }
  };

  const config = getAnimationConfig();

  // Efecto de fadeout al final
  useEffect(() => {
    if (isVisible && type === 'login') {
      console.log('🚀 ANIMACIÓN - Iniciando timer de fadeout para login (4 segundos)');
      const timer = setTimeout(() => {
        console.log('🚀 ANIMACIÓN - 4 segundos completados, activando fadeout');
        setShowFadeout(true);
        setTimeout(() => {
          console.log('🚀 ANIMACIÓN - 1 segundo de fadeout completado, finalizando animación');
          onComplete();
        }, 1000);
      }, 4000); // 4 segundos antes del fadeout
      
      console.log('🚀 ANIMACIÓN - Timer configurado para 4 segundos');
      
      return () => {
        console.log('🚀 ANIMACIÓN - Limpiando timer (componente desmontado o isVisible cambió)');
        clearTimeout(timer);
      };
    } else if (isVisible && type === 'logout') {
      console.log('🚀 ANIMACIÓN - Iniciando timer para logout');
      const timer = setTimeout(() => {
        console.log('🚀 ANIMACIÓN - Completando logout');
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
          {/* Fondo espacial con gradiente */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-black via-purple-900 to-indigo-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.95 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />

          {/* Efecto de velocidad luz - Líneas de velocidad */}
          <div className="absolute inset-0">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-60"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${Math.random() * 200 + 100}px`,
                  transform: `rotate(${Math.random() * 360}deg)`
                }}
                animate={{
                  x: type === 'login' ? [0, window.innerWidth * 2] : [window.innerWidth * 2, 0],
                  y: type === 'login' ? [0, window.innerHeight * 2] : [window.innerHeight * 2, 0],
                  opacity: type === 'login' ? [0, 1, 0] : [1, 0, 0],
                  scale: type === 'login' ? [0, 1, 0] : [1, 0, 0]
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 1,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: Math.random() * 2
                }}
              />
            ))}
          </div>

          {/* Estrellas en movimiento */}
          {stars.map((star) => (
            <motion.div
              key={star.id}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`
              }}
              animate={{
                x: type === 'login' ? [0, (Math.random() - 0.5) * 400] : [(Math.random() - 0.5) * 400, 0],
                y: type === 'login' ? [0, (Math.random() - 0.5) * 400] : [(Math.random() - 0.5) * 400, 0],
                opacity: type === 'login' ? [0, 1, 0] : [1, 0, 0],
                scale: type === 'login' ? [0, 1, 0] : [1, 0, 0]
              }}
              transition={{
                duration: 2.5,
                delay: star.speed,
                ease: "easeOut"
              }}
            />
          ))}

          {/* Centro del vórtice de velocidad luz */}
          <motion.div
            className="relative w-96 h-96"
            {...config}
          >
            {/* Círculos concéntricos con efecto de velocidad */}
            {[1, 2, 3, 4, 5, 6].map((ring) => (
              <motion.div
                key={ring}
                className="absolute inset-0 rounded-full border border-white/30"
                style={{
                  width: `${ring * 15}%`,
                  height: `${ring * 15}%`,
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
                animate={{
                  rotate: type === 'login' ? 360 : -360,
                  scale: type === 'login' ? [0.5, 1, 0.5] : [1, 0.5, 1],
                  opacity: type === 'login' ? [0, 0.8, 0] : [0.8, 0, 0.8]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear",
                  delay: ring * 0.1
                }}
              />
            ))}

            {/* Centro brillante */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-12 h-12 bg-white rounded-full"
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

            {/* Efectos de luz radial */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 30%, transparent 70%)'
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
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-2xl font-bold text-center"
              animate={{
                opacity: type === 'login' ? [0, 1, 0] : [0, 1, 0],
                y: type === 'login' ? [20, 0, -20] : [-20, 0, 20],
                scale: type === 'login' ? [0.8, 1, 0.8] : [1, 0.8, 1]
              }}
              transition={{
                duration: 2.5,
                ease: "easeInOut",
                times: [0, 0.5, 1]
              }}
            >
              {type === 'login' ? (
                <>
                  <div className="text-4xl mb-2">🚀</div>
                  <div>Viajando a velocidad luz...</div>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2">👋</div>
                  <div>Saliendo del sistema...</div>
                </>
              )}
            </motion.div>
          </motion.div>

          {/* Efecto de fadeout al final para login */}
          {showFadeout && type === 'login' && (
            <motion.div
              className="absolute inset-0 bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          )}

          {/* Partículas adicionales para efecto de velocidad */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-0.5 h-0.5 bg-white/50 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`
                }}
                animate={{
                  x: type === 'login' ? [0, (Math.random() - 0.5) * 600] : [(Math.random() - 0.5) * 600, 0],
                  y: type === 'login' ? [0, (Math.random() - 0.5) * 600] : [(Math.random() - 0.5) * 600, 0],
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

export default LightSpeedTransition;
