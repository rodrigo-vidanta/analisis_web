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
          {/* Fondo con gradiente radial */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(#582b8c, #270245)'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />

          {/* Anillos concéntricos del túnel */}
          <div className="relative w-96 h-96">
            {/* Anillo 1 - Más pequeño */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-12 h-12 border-2 border-white rounded-full"
              style={{
                margin: '-24px 0 0 -24px',
                boxShadow: '0 0 4px cyan, 0 0 20px cyan, inset 0 0 4px cyan, inset 0 0 20px cyan'
              }}
              animate={{
                scale: type === 'login' ? [0, 1, 1.5, 2, 0] : [2, 1.5, 1, 0, 0],
                opacity: type === 'login' ? [0, 0.8, 1, 0.8, 0] : [0.8, 1, 0.8, 0, 0],
                rotate: type === 'login' ? 360 : -360
              }}
              transition={{
                duration: 4,
                ease: "easeInOut",
                delay: 0
              }}
            />

            {/* Anillo 2 */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-16 h-16 border-2 border-white rounded-full"
              style={{
                margin: '-32px 0 0 -32px',
                boxShadow: '0 0 4px magenta, 0 0 20px magenta, inset 0 0 4px magenta, inset 0 0 20px magenta'
              }}
              animate={{
                scale: type === 'login' ? [0, 1, 1.5, 2, 0] : [2, 1.5, 1, 0, 0],
                opacity: type === 'login' ? [0, 0.8, 1, 0.8, 0] : [0.8, 1, 0.8, 0, 0],
                rotate: type === 'login' ? -360 : 360
              }}
              transition={{
                duration: 4,
                ease: "easeInOut",
                delay: 0.1
              }}
            />

            {/* Anillo 3 */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-20 h-20 border-2 border-white rounded-full"
              style={{
                margin: '-40px 0 0 -40px',
                boxShadow: '0 0 4px cyan, 0 0 20px cyan, inset 0 0 4px cyan, inset 0 0 20px cyan'
              }}
              animate={{
                scale: type === 'login' ? [0, 1, 1.5, 2, 0] : [2, 1.5, 1, 0, 0],
                opacity: type === 'login' ? [0, 0.8, 1, 0.8, 0] : [0.8, 1, 0.8, 0, 0],
                rotate: type === 'login' ? 360 : -360
              }}
              transition={{
                duration: 4,
                ease: "easeInOut",
                delay: 0.2
              }}
            />

            {/* Anillo 4 */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-white rounded-full"
              style={{
                margin: '-48px 0 0 -48px',
                boxShadow: '0 0 4px magenta, 0 0 20px magenta, inset 0 0 4px magenta, inset 0 0 20px magenta'
              }}
              animate={{
                scale: type === 'login' ? [0, 1, 1.5, 2, 0] : [2, 1.5, 1, 0, 0],
                opacity: type === 'login' ? [0, 0.8, 1, 0.8, 0] : [0.8, 1, 0.8, 0, 0],
                rotate: type === 'login' ? -360 : 360
              }}
              transition={{
                duration: 4,
                ease: "easeInOut",
                delay: 0.3
              }}
            />

            {/* Anillo 5 */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-28 h-28 border-2 border-white rounded-full"
              style={{
                margin: '-56px 0 0 -56px',
                boxShadow: '0 0 4px cyan, 0 0 20px cyan, inset 0 0 4px cyan, inset 0 0 20px cyan'
              }}
              animate={{
                scale: type === 'login' ? [0, 1, 1.5, 2, 0] : [2, 1.5, 1, 0, 0],
                opacity: type === 'login' ? [0, 0.8, 1, 0.8, 0] : [0.8, 1, 0.8, 0, 0],
                rotate: type === 'login' ? 360 : -360
              }}
              transition={{
                duration: 4,
                ease: "easeInOut",
                delay: 0.4
              }}
            />

            {/* Anillo 6 - Más grande */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-32 h-32 border-2 border-white rounded-full"
              style={{
                margin: '-64px 0 0 -64px',
                boxShadow: '0 0 4px magenta, 0 0 20px magenta, inset 0 0 4px magenta, inset 0 0 20px magenta'
              }}
              animate={{
                scale: type === 'login' ? [0, 1, 1.5, 2, 0] : [2, 1.5, 1, 0, 0],
                opacity: type === 'login' ? [0, 0.8, 1, 0.8, 0] : [0.8, 1, 0.8, 0, 0],
                rotate: type === 'login' ? -360 : 360
              }}
              transition={{
                duration: 4,
                ease: "easeInOut",
                delay: 0.5
              }}
            />

            {/* Centro brillante del túnel */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-8 h-8 bg-white rounded-full"
              style={{ 
                margin: '-16px 0 0 -16px',
                boxShadow: '0 0 20px white, 0 0 40px white, 0 0 60px white'
              }}
              animate={{
                scale: type === 'login' ? [0, 2, 3, 1] : [1, 3, 2, 0],
                opacity: type === 'login' ? [0, 1, 1, 0.8] : [0.8, 1, 1, 0],
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
                background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.2) 30%, rgba(255,255,255,0.1) 60%, transparent 100%)'
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
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-2xl font-bold text-center z-10"
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

          {/* Partículas adicionales para efecto de túnel */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/60 rounded-full"
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

          {/* Efecto de fadeout al final para login */}
          {showFadeout && type === 'login' && (
            <motion.div
              className="absolute inset-0 bg-white"
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