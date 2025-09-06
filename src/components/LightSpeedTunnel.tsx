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
  const [tunnelLines, setTunnelLines] = useState<Array<{ id: number; x: number; y: number; length: number; color: string; speed: number }>>([]);
  const [showFadeout, setShowFadeout] = useState(false);

  // Generar líneas del túnel
  useEffect(() => {
    if (isVisible) {
      const newLines = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        length: Math.random() * 200 + 100,
        color: Math.random() > 0.5 ? 'red' : 'blue',
        speed: Math.random() * 0.5 + 0.5
      }));
      setTunnelLines(newLines);
    }
  }, [isVisible]);

  // Configuración de animación según el tipo
  const getAnimationConfig = () => {
    if (type === 'login') {
      return {
        initial: { scale: 0, opacity: 0 },
        animate: { 
          scale: [0, 0.3, 0.8, 1.2, 1], 
          opacity: [0, 0.2, 0.6, 0.9, 1] 
        },
        exit: { 
          scale: 0, 
          opacity: 0 
        },
        transition: { 
          duration: 4.0, 
          ease: "easeInOut",
          times: [0, 0.2, 0.5, 0.8, 1]
        }
      };
    } else {
      return {
        initial: { scale: 1, opacity: 1 },
        animate: { 
          scale: [1, 1.2, 0.8, 0.3, 0], 
          opacity: [1, 0.9, 0.6, 0.2, 0] 
        },
        exit: { 
          scale: 0, 
          opacity: 0 
        },
        transition: { 
          duration: 3.0, 
          ease: "easeInOut",
          times: [0, 0.2, 0.5, 0.8, 1]
        }
      };
    }
  };

  const config = getAnimationConfig();

  // Efecto de fadeout al final
  useEffect(() => {
    if (isVisible && type === 'login') {
      console.log('🚀 TÚNEL - Iniciando timer de fadeout para login (4 segundos)');
      const timer = setTimeout(() => {
        console.log('🚀 TÚNEL - 4 segundos completados, activando fadeout');
        setShowFadeout(true);
        setTimeout(() => {
          console.log('🚀 TÚNEL - 1 segundo de fadeout completado, finalizando animación');
          onComplete();
        }, 1000);
      }, 4000); // 4 segundos antes del fadeout
      
      console.log('🚀 TÚNEL - Timer configurado para 4 segundos');
      
      return () => {
        console.log('🚀 TÚNEL - Limpiando timer (componente desmontado o isVisible cambió)');
        clearTimeout(timer);
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
          {/* Fondo negro profundo */}
          <motion.div
            className="absolute inset-0 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />

          {/* Líneas del túnel de velocidad luz */}
          <div className="absolute inset-0">
            {/* Líneas horizontales principales */}
            <motion.div
              className="absolute w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-80"
              style={{ top: '30%' }}
              animate={{
                x: type === 'login' ? [0, window.innerWidth * 2] : [window.innerWidth * 2, 0],
                opacity: type === 'login' ? [0, 1, 0] : [1, 0, 0],
                scale: type === 'login' ? [0, 1, 0] : [1, 0, 0]
              }}
              transition={{
                duration: 2,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 0.5
              }}
            />
            <motion.div
              className="absolute w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-80"
              style={{ top: '70%' }}
              animate={{
                x: type === 'login' ? [0, window.innerWidth * 2] : [window.innerWidth * 2, 0],
                opacity: type === 'login' ? [0, 1, 0] : [1, 0, 0],
                scale: type === 'login' ? [0, 1, 0] : [1, 0, 0]
              }}
              transition={{
                duration: 2,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 0.5
              }}
            />

            {/* Líneas radiales del túnel */}
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-60"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${Math.random() * 300 + 200}px`,
                  transform: `rotate(${Math.random() * 360}deg)`
                }}
                animate={{
                  x: type === 'login' ? [0, (Math.random() - 0.5) * 800] : [(Math.random() - 0.5) * 800, 0],
                  y: type === 'login' ? [0, (Math.random() - 0.5) * 800] : [(Math.random() - 0.5) * 800, 0],
                  opacity: type === 'login' ? [0, 1, 0] : [1, 0, 0],
                  scale: type === 'login' ? [0, 1, 0] : [1, 0, 0]
                }}
                transition={{
                  duration: 1.5,
                  delay: Math.random() * 1,
                  ease: "easeOut",
                  repeat: Infinity,
                  repeatDelay: Math.random() * 2
                }}
              />
            ))}

            {/* Líneas de colores (rojo y azul) */}
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={`color-${i}`}
                className={`absolute h-0.5 ${
                  i % 2 === 0 
                    ? 'bg-gradient-to-r from-transparent via-red-500 to-transparent' 
                    : 'bg-gradient-to-r from-transparent via-blue-500 to-transparent'
                } opacity-70`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${Math.random() * 400 + 300}px`,
                  transform: `rotate(${Math.random() * 360}deg)`
                }}
                animate={{
                  x: type === 'login' ? [0, (Math.random() - 0.5) * 1000] : [(Math.random() - 0.5) * 1000, 0],
                  y: type === 'login' ? [0, (Math.random() - 0.5) * 1000] : [(Math.random() - 0.5) * 1000, 0],
                  opacity: type === 'login' ? [0, 1, 0] : [1, 0, 0],
                  scale: type === 'login' ? [0, 1, 0] : [1, 0, 0]
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 1.5,
                  ease: "easeOut",
                  repeat: Infinity,
                  repeatDelay: Math.random() * 3
                }}
              />
            ))}
          </div>

          {/* Centro del túnel - punto de fuga */}
          <motion.div
            className="relative w-96 h-96"
            {...config}
          >
            {/* Círculos concéntricos del túnel */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((ring) => (
              <motion.div
                key={ring}
                className="absolute inset-0 rounded-full border border-white/20"
                style={{
                  width: `${ring * 12}%`,
                  height: `${ring * 12}%`,
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
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                  delay: ring * 0.1
                }}
              />
            ))}

            {/* Centro brillante del túnel */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-16 h-16 bg-white rounded-full"
              style={{ transform: 'translate(-50%, -50%)' }}
              animate={{
                scale: type === 'login' ? [0, 3, 1] : [1, 3, 0],
                opacity: type === 'login' ? [0, 1, 0.8] : [0.8, 1, 0],
                rotate: type === 'login' ? 360 : -360
              }}
              transition={{
                duration: 3,
                ease: "easeInOut"
              }}
            />

            {/* Efectos de luz radial del túnel */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)'
              }}
              animate={{
                scale: type === 'login' ? [0, 2, 1] : [1, 2, 0],
                opacity: type === 'login' ? [0, 0.8, 0.4] : [0.4, 0.8, 0]
              }}
              transition={{
                duration: 3,
                ease: "easeInOut"
              }}
            />

            {/* Texto de transición */}
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-3xl font-bold text-center"
              animate={{
                opacity: type === 'login' ? [0, 1, 0] : [0, 1, 0],
                y: type === 'login' ? [30, 0, -30] : [-30, 0, 30],
                scale: type === 'login' ? [0.8, 1, 0.8] : [1, 0.8, 1]
              }}
              transition={{
                duration: 3,
                ease: "easeInOut",
                times: [0, 0.5, 1]
              }}
            >
              {type === 'login' ? (
                <>
                  <div className="text-5xl mb-3">🚀</div>
                  <div>Entrando al túnel de velocidad luz...</div>
                  <div className="text-lg mt-2 opacity-70">Sumergiéndose en la interfaz</div>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">👋</div>
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

          {/* Partículas adicionales para efecto de túnel */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/60 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`
                }}
                animate={{
                  x: type === 'login' ? [0, (Math.random() - 0.5) * 800] : [(Math.random() - 0.5) * 800, 0],
                  y: type === 'login' ? [0, (Math.random() - 0.5) * 800] : [(Math.random() - 0.5) * 800, 0],
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

export default LightSpeedTunnel;
