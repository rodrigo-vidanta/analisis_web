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

  // Configuración de animación según el tipo - SUPER ACELERADO
  const getAnimationConfig = () => {
    if (type === 'login') {
      return {
        initial: { scale: 0, opacity: 0 },
        animate: { 
          scale: [0, 0.5, 1.2, 1], 
          opacity: [0, 0.7, 1, 1] 
        },
        exit: { 
          scale: 0, 
          opacity: 0 
        },
        transition: { 
          duration: 1.2, // SUPER REDUCIDO de 2.8 a 1.2
          ease: [0.68, -0.55, 0.265, 1.55], // Curva más agresiva
          times: [0, 0.3, 0.7, 1]
        }
      };
    } else {
      return {
        initial: { scale: 1, opacity: 1 },
        animate: { 
          scale: [1, 1.3, 0.3, 0], 
          opacity: [1, 0.9, 0.2, 0] 
        },
        exit: { 
          scale: 0, 
          opacity: 0 
        },
        transition: { 
          duration: 0.8, // SUPER REDUCIDO de 1.8 a 0.8
          ease: [0.68, -0.55, 0.265, 1.55],
          times: [0, 0.2, 0.7, 1]
        }
      };
    }
  };

  const config = getAnimationConfig();

  // Efecto de fadeout al final - SUPER ACELERADO
  useEffect(() => {
    if (isVisible && type === 'login') {
      console.log('🚀 ANIMACIÓN - Iniciando timer de fadeout para login (1.5 segundos)');
      const timer = setTimeout(() => {
        console.log('🚀 ANIMACIÓN - 1.5 segundos completados, activando fadeout');
        setShowFadeout(true);
        setTimeout(() => {
          console.log('🚀 ANIMACIÓN - 0.4 segundos de fadeout completado, finalizando animación');
          onComplete();
        }, 400); // SUPER REDUCIDO de 800 a 400ms
      }, 1500); // SUPER REDUCIDO de 2500 a 1500ms
      
      console.log('🚀 ANIMACIÓN - Timer configurado para 1.5 segundos');
      
      return () => {
        console.log('🚀 ANIMACIÓN - Limpiando timer (componente desmontado o isVisible cambió)');
        clearTimeout(timer);
      };
    } else if (isVisible && type === 'logout') {
      console.log('🚀 ANIMACIÓN - Iniciando timer para logout');
      const timer = setTimeout(() => {
        console.log('🚀 ANIMACIÓN - Completando logout');
        onComplete();
      }, 800); // SUPER REDUCIDO de 1500 a 800ms
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

          {/* Efecto de velocidad luz - Líneas de velocidad MEJORADAS */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute opacity-80"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${Math.random() * 300 + 150}px`,
                  height: '2px',
                  background: `linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(255,255,255,0.8) 20%, 
                    rgba(59,130,246,0.6) 50%, 
                    rgba(147,51,234,0.4) 80%, 
                    transparent 100%)`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                  filter: 'blur(0.5px)'
                }}
                animate={{
                  x: type === 'login' ? [0, window.innerWidth * 1.5] : [window.innerWidth * 1.5, 0],
                  y: type === 'login' ? [0, window.innerHeight * 1.5] : [window.innerHeight * 1.5, 0],
                  opacity: type === 'login' ? [0, 1, 0.7, 0] : [0.7, 1, 0, 0],
                  scale: type === 'login' ? [0, 1.2, 1, 0] : [1, 1.2, 0, 0],
                  rotate: type === 'login' ? [0, 180] : [180, 0]
                }}
                transition={{
                  duration: 0.3, // SÚPER RÁPIDO reducido de 1.2 a 0.3
                  delay: Math.random() * 0.2, // Delay súper reducido
                  ease: [0.68, -0.55, 0.265, 1.55],
                  repeat: Infinity,
                  repeatDelay: Math.random() * 0.5 // RepeatDelay súper reducido
                }}
              />
            ))}
            
            {/* Líneas radiales desde el centro */}
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={`radial-${i}`}
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  width: '400px',
                  height: '1px',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(59,130,246,0.5) 50%, transparent 100%)',
                  transformOrigin: '0 0',
                  transform: `rotate(${(i * 30)}deg)`
                }}
                animate={{
                  scaleX: type === 'login' ? [0, 1, 0.5, 0] : [0.5, 1, 0, 0],
                  opacity: type === 'login' ? [0, 0.8, 0.4, 0] : [0.4, 0.8, 0, 0]
                }}
                transition={{
                  duration: 0.6, // SÚPER ACELERADO de 1.5 a 0.6
                  delay: i * 0.02, // Delay súper reducido
                  ease: [0.68, -0.55, 0.265, 1.55],
                  repeat: Infinity,
                  repeatDelay: 0.5 // RepeatDelay súper reducido
                }}
              />
            ))}
          </div>

          {/* Estrellas en movimiento ACELERADAS */}
          {stars.map((star) => (
            <motion.div
              key={star.id}
              className="absolute rounded-full"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                background: `radial-gradient(circle, 
                  rgba(255,255,255,0.9) 0%, 
                  rgba(59,130,246,0.6) 50%, 
                  rgba(147,51,234,0.3) 100%)`,
                boxShadow: `0 0 ${star.size * 2}px rgba(255,255,255,0.5)`
              }}
              animate={{
                x: type === 'login' ? [0, (Math.random() - 0.5) * 600] : [(Math.random() - 0.5) * 600, 0],
                y: type === 'login' ? [0, (Math.random() - 0.5) * 600] : [(Math.random() - 0.5) * 600, 0],
                opacity: type === 'login' ? [0, 1, 0.8, 0] : [0.8, 1, 0, 0],
                scale: type === 'login' ? [0, 1.5, 1, 0] : [1, 1.5, 0, 0]
              }}
              transition={{
                duration: 0.8, // SÚPER ACELERADO de 1.8 a 0.8
                delay: star.speed * 0.2, // Delay súper reducido
                ease: [0.68, -0.55, 0.265, 1.55]
              }}
            />
          ))}

          {/* Centro del vórtice de velocidad luz */}
          <motion.div
            className="relative w-96 h-96"
            {...config}
          >
            {/* Círculos concéntricos con efecto de velocidad y estela MEJORADO */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((ring) => (
              <div key={ring} className="absolute inset-0">
                {/* Aro principal con gradiente dinámico */}
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: `${ring * 12}%`,
                    height: `${ring * 12}%`,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    border: `2px solid transparent`,
                    background: `conic-gradient(from ${ring * 45}deg, 
                      rgba(255,255,255,0) 0deg, 
                      rgba(255,255,255,0.8) 90deg, 
                      rgba(59,130,246,0.6) 180deg, 
                      rgba(147,51,234,0.4) 270deg, 
                      rgba(255,255,255,0) 360deg)`,
                    borderRadius: '50%',
                    maskImage: 'conic-gradient(from 0deg, black 0deg, black 90deg, transparent 95deg, transparent 265deg, black 270deg, black 360deg)',
                    WebkitMask: 'conic-gradient(from 0deg, black 0deg, black 90deg, transparent 95deg, transparent 265deg, black 270deg, black 360deg)'
                  }}
                  animate={{
                    rotate: type === 'login' ? 1440 : -1440, // CUÁDRUPLE rotación para máximo dinamismo
                    scale: type === 'login' ? [0.2, 1.3, 0.7, 1.1] : [1.1, 0.7, 1.3, 0.2],
                    opacity: type === 'login' ? [0, 1, 0.8, 1] : [1, 0.8, 1, 0]
                  }}
                  transition={{
                    duration: 0.4, // SUPER RÁPIDO reducido de 0.8 a 0.4
                    repeat: Infinity,
                    ease: [0.68, -0.55, 0.265, 1.55], // Easing súper agresivo
                    delay: ring * 0.02 // Delay súper reducido
                  }}
                />
                
                {/* Efecto de estela/rastro */}
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: `${ring * 12}%`,
                    height: `${ring * 12}%`,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: `conic-gradient(from ${ring * 45 + 180}deg, 
                      rgba(255,255,255,0) 0deg, 
                      rgba(255,255,255,0.3) 45deg, 
                      rgba(59,130,246,0.2) 90deg, 
                      rgba(147,51,234,0.1) 135deg, 
                      rgba(255,255,255,0) 180deg)`,
                    borderRadius: '50%',
                    filter: 'blur(1px)'
                  }}
                  animate={{
                    rotate: type === 'login' ? 1080 : -1080, // TRIPLE rotación para estela dinámica
                    scale: type === 'login' ? [0.1, 1.4, 0.5, 1.2] : [1.2, 0.5, 1.4, 0.1],
                    opacity: type === 'login' ? [0, 0.8, 0.4, 0.7] : [0.7, 0.4, 0.8, 0]
                  }}
                  transition={{
                    duration: 0.6, // ACELERADO de 1.0 a 0.6
                    repeat: Infinity,
                    ease: [0.68, -0.55, 0.265, 1.55],
                    delay: ring * 0.015 // Delay súper reducido
                  }}
                />
                
                {/* Partículas adicionales en el borde */}
                {Array.from({ length: 3 }).map((_, particle) => (
                  <motion.div
                    key={`particle-${ring}-${particle}`}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    style={{
                      top: '50%',
                      left: '50%',
                      transformOrigin: `${ring * 6}% 0px`
                    }}
                    animate={{
                      rotate: type === 'login' ? 720 : -720, // Doble rotación
                      scale: type === 'login' ? [0, 1.5, 0] : [1.5, 0, 1.5],
                      opacity: type === 'login' ? [0, 1, 0] : [1, 0, 1]
                    }}
                    transition={{
                      duration: 0.5, // SÚPER ACELERADO de 1.2 a 0.5
                      repeat: Infinity,
                      ease: [0.68, -0.55, 0.265, 1.55],
                      delay: ring * 0.03 + particle * 0.1 // Delays reducidos
                    }}
                  />
                ))}
              </div>
            ))}

            {/* Centro brillante mejorado con múltiples capas */}
            <motion.div
              className="absolute top-1/2 left-1/2"
              style={{ transform: 'translate(-50%, -50%)' }}
            >
              {/* Núcleo central */}
              <motion.div
                className="w-8 h-8 bg-white rounded-full relative"
                style={{
                  boxShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(59,130,246,0.4), 0 0 60px rgba(147,51,234,0.2)'
                }}
                animate={{
                  scale: type === 'login' ? [0, 1.8, 1.1, 1.3] : [1.3, 1.1, 1.8, 0],
                  opacity: type === 'login' ? [0, 1, 1, 1] : [1, 1, 1, 0],
                  rotate: type === 'login' ? 1440 : -1440 // CUÁDRUPLE rotación
                }}
                transition={{
                  duration: 0.6, // SÚPER ACELERADO de 1.6 a 0.6
                  ease: [0.68, -0.55, 0.265, 1.55],
                  repeat: type === 'login' ? Infinity : 0,
                  repeatType: "reverse"
                }}
              />
              
              {/* Anillo de energía exterior */}
              <motion.div
                className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full border-2"
                style={{ 
                  transform: 'translate(-50%, -50%)',
                  borderImage: 'conic-gradient(from 0deg, rgba(255,255,255,0.8), rgba(59,130,246,0.6), rgba(147,51,234,0.4), rgba(255,255,255,0.8)) 1'
                }}
                animate={{
                  scale: type === 'login' ? [0.3, 1.5, 0.8, 1.2] : [1.2, 0.8, 1.5, 0.3],
                  opacity: type === 'login' ? [0, 1, 0.8, 0.9] : [0.9, 0.8, 1, 0],
                  rotate: type === 'login' ? -720 : 720 // Doble rotación
                }}
                transition={{
                  duration: 0.5, // SÚPER ACELERADO de 1.2 a 0.5
                  ease: [0.68, -0.55, 0.265, 1.55],
                  repeat: Infinity
                }}
              />
              
              {/* Pulsos de energía */}
              {[1, 2, 3].map((pulse) => (
                <motion.div
                  key={pulse}
                  className="absolute top-1/2 left-1/2 rounded-full border border-white/40"
                  style={{ 
                    transform: 'translate(-50%, -50%)',
                    width: `${pulse * 20}px`,
                    height: `${pulse * 20}px`
                  }}
                  animate={{
                    scale: type === 'login' ? [0, 3, 0] : [3, 0, 3], // Pulsos más grandes
                    opacity: type === 'login' ? [1, 0, 1] : [0, 1, 0]
                  }}
                  transition={{
                    duration: 0.7, // SÚPER ACELERADO de 1.5 a 0.7
                    ease: [0.68, -0.55, 0.265, 1.55],
                    repeat: Infinity,
                    delay: pulse * 0.1 // Delay súper reducido
                  }}
                />
              ))}
            </motion.div>

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

          {/* Partículas adicionales para efecto de velocidad OPTIMIZADAS */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${Math.random() * 2 + 1}px`,
                  height: `${Math.random() * 2 + 1}px`,
                  background: `rgba(255,255,255,${0.6 + Math.random() * 0.4})`,
                  filter: `blur(${Math.random() * 0.5}px)`
                }}
                animate={{
                  x: type === 'login' ? [0, (Math.random() - 0.5) * 800] : [(Math.random() - 0.5) * 800, 0],
                  y: type === 'login' ? [0, (Math.random() - 0.5) * 800] : [(Math.random() - 0.5) * 800, 0],
                  opacity: type === 'login' ? [0, 1, 0.7, 0] : [0.7, 1, 0, 0],
                  scale: type === 'login' ? [0, 1.5, 1, 0] : [1, 1.5, 0, 0]
                }}
                transition={{
                  duration: 0.9, // SÚPER ACELERADO de 2.2 a 0.9
                  delay: Math.random() * 0.3, // Delay súper reducido
                  ease: [0.68, -0.55, 0.265, 1.55]
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
