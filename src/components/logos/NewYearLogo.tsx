/**
 * ============================================
 * LOGO DE AÑO NUEVO CON ANIMACIONES
 * ============================================
 * 
 * Logo PQNC de Año Nuevo con:
 * - Fuegos artificiales al hacer clic
 * - Audio de celebración
 * - Manecillas de reloj en tiempo real en el centro de la Q
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NewYearLogoProps {
  onClick?: () => void;
  isCollapsed?: boolean;
}

// ============================================
// CONTADOR REGRESIVO PARA AÑO NUEVO
// ============================================

const NewYearCountdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Fecha de Año Nuevo 2026
      const newYear = new Date('2026-01-01T00:00:00');
      const now = new Date();
      const difference = newYear.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      className="text-center"
      style={{
        marginTop: '-2px',
        color: '#D4A854',
        textShadow: '0 1px 3px rgba(0,0,0,0.3)',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '8.5px',
        fontWeight: 600,
        letterSpacing: '0.3px',
      }}
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
    </motion.div>
  );
};

// ============================================
// COMPONENTE DE FUEGOS ARTIFICIALES
// ============================================

interface Firework {
  id: number;
  x: number;
  y: number;
  color: string;
}

const FireworksAnimation: React.FC = () => {
  const [fireworks, setFireworks] = useState<Firework[]>([]);

  useEffect(() => {
    // Generar fuegos artificiales en secuencia (más dispersos)
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A8E6CF', '#FFB84D', '#C77DFF', '#FF69B4', '#00CED1'];
    const positions = [
      { x: 15, y: 15 },
      { x: 85, y: 20 },
      { x: 50, y: 10 },
      { x: 25, y: 35 },
      { x: 75, y: 25 },
      { x: 40, y: 30 },
      { x: 65, y: 18 },
      { x: 30, y: 22 },
      { x: 55, y: 28 },
      { x: 70, y: 32 },
    ];

    const baseTimestamp = Date.now();
    
    positions.forEach((pos, i) => {
      setTimeout(() => {
        const uniqueId = baseTimestamp + (i * 1000) + Math.floor(Math.random() * 999); // ID único garantizado
        setFireworks(prev => [...prev, {
          id: uniqueId,
          x: pos.x,
          y: pos.y,
          color: colors[i % colors.length],
        }]);
      }, i * 350); // Escalonar cada 350ms
    });

    // Limpiar después de 8 segundos
    const cleanup = setTimeout(() => {
      setFireworks([]);
    }, 8000);

    return () => clearTimeout(cleanup);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 20 }}>
      <AnimatePresence>
        {fireworks.map((firework) => (
          <div
            key={firework.id}
            className="absolute"
            style={{
              left: `${firework.x}%`,
              top: `${firework.y}%`,
            }}
          >
            {/* Partículas pequeñas como polvo (sin blur) */}
            {[...Array(16)].map((_, i) => {
              const angle = (i * 22.5) * (Math.PI / 180); // Más partículas, más dispersas
              const distance = 25 + Math.random() * 25;
              
              return (
                <motion.div
                  key={`${firework.id}-particle-${i}`}
                  className="absolute rounded-full"
                  style={{
                    width: '1.5px',
                    height: '1.5px',
                    backgroundColor: firework.color,
                    boxShadow: `0 0 1px 0.5px ${firework.color}`, // Brillo mínimo, no blur
                  }}
                  initial={{
                    x: 0,
                    y: 0,
                    opacity: 1,
                    scale: 1,
                  }}
                  animate={{
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance,
                    opacity: [1, 0.8, 0],
                    scale: [1, 0.8, 0.3],
                  }}
                  transition={{
                    duration: 1.2,
                    ease: 'easeOut',
                  }}
                />
              );
            })}

            {/* Flash central pequeño */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: '3px',
                height: '3px',
                backgroundColor: firework.color,
                boxShadow: `0 0 3px 1px ${firework.color}`, // Sin blur pesado
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [1, 0.6, 0],
              }}
              transition={{
                duration: 0.8,
                ease: 'easeOut',
              }}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL - LOGO AÑO NUEVO
// ============================================

export const NewYearLogo: React.FC<NewYearLogoProps> = ({ onClick, isCollapsed = false }) => {
  const [showFireworks, setShowFireworks] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClick = () => {
    // Ejecutar callback
    if (onClick) {
      onClick();
    }

    // Reproducir audio de fuegos artificiales
    if (!audioRef.current) {
      audioRef.current = new Audio('/assets/OBJMisc-fireworks-Elevenlabs.mp3');
      audioRef.current.volume = 0.6;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      // Silenciar error si el navegador bloquea autoplay
    });

    // Mostrar fuegos artificiales por 8 segundos
    setShowFireworks(true);
    setTimeout(() => {
      setShowFireworks(false);
    }, 8000);
  };

  if (isCollapsed) {
    return null;
  }

  return (
    <div
      onClick={handleClick}
      className="relative hover:opacity-90 transition-opacity cursor-pointer"
      style={{ marginTop: '2px', marginLeft: '8px' }}
      title="¡Feliz Año Nuevo! 🎊"
    >
      <div className="flex flex-col items-center">
        {/* Logo de Año Nuevo */}
        <div className="relative">
          <img 
            src="/assets/logo_pqnc-newyear.png" 
            alt="PQNC" 
            className="w-auto object-contain"
            style={{ height: '46px' }}
          />

          {/* Animación de fuegos artificiales */}
          {showFireworks && <FireworksAnimation />}
        </div>

        {/* Contador regresivo debajo del logo */}
        <NewYearCountdown />
      </div>
    </div>
  );
};

export default NewYearLogo;

