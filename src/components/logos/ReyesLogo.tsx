/**
 * ============================================
 * LOGO DE REYES MAGOS CON ANIMACIONES
 * ============================================
 * 
 * Logo PQNC de Reyes Magos con:
 * - Estrella dejando estela tipo cometa al hacer clic
 * - Estrellas pequeñas flotando en el cielo
 * - Resplandor interno en estrella principal
 * - Audio oriental de 8 segundos
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReyesLogoProps {
  onClick?: () => void;
  isCollapsed?: boolean;
}

// ============================================
// ESTRELLAS PEQUEÑAS FLOTANTES (Constantes)
// ============================================

const SmallStars: React.FC = () => {
  const stars = [
    { x: 10, y: 15, size: 2, delay: 0, duration: 4 },
    { x: 25, y: 8, size: 1.5, delay: 0.5, duration: 3.5 },
    { x: 75, y: -6, size: 2.5, delay: 1, duration: 4.5 }, // Subida 18px total (12 → -6)
    { x: 88, y: 2, size: 1.8, delay: 1.5, duration: 3.8 }, // Subida 18px total (20 → 2)
    { x: 50, y: 5, size: 1.5, delay: 2, duration: 4.2 },
    { x: 35, y: 25, size: 2, delay: 0.8, duration: 4 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {stars.map((star, i) => (
        <motion.div
          key={`star-${i}`}
          className="absolute"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
          }}
        >
          {/* Estrella brillante */}
          <motion.div
            className="absolute"
            style={{
              width: `${star.size}px`,
              height: `${star.size}px`,
              background: '#FFD700',
              borderRadius: '50%',
              boxShadow: `0 0 ${star.size * 2}px ${star.size}px rgba(255, 215, 0, 0.4)`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: star.duration,
              delay: star.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Destellos de la estrella */}
          {[0, 90].map((angle) => (
            <motion.div
              key={angle}
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                width: `${star.size * 3}px`,
                height: '0.5px',
                background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                transformOrigin: 'center',
              }}
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: star.duration,
                delay: star.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      ))}
    </div>
  );
};

// ============================================
// ESTRELLA CON RESPLANDOR INTERNO
// ============================================

const GlowingStar: React.FC = () => {
  return (
    <div
      className="absolute"
      style={{
        left: 'calc(44% - 3px)', // 3px a la izquierda
        top: 'calc(20% - 12px)', // 3px arriba
        width: '20px',
        height: '20px',
      }}
    >
      {/* Resplandor externo pulsante */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.6) 0%, transparent 70%)',
          filter: 'blur(8px)',
        }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Resplandor interno */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(255, 215, 0, 0.6) 40%, transparent 70%)',
        }}
        animate={{
          scale: [0.8, 1.1, 0.8],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
};

// ============================================
// ESTELA DE COMETA
// ============================================

const CometTail: React.FC = () => {
  const [particles, setParticles] = useState<Array<{ id: number; delay: number }>>([]);

  useEffect(() => {
    // Generar partículas escalonadas para la estela
    const newParticles = [];
    for (let i = 0; i < 30; i++) {
      newParticles.push({
        id: i,
        delay: i * 0.08, // Escalonar cada 80ms
      });
    }
    setParticles(newParticles);

    // Limpiar después de 10 segundos
    const cleanup = setTimeout(() => {
      setParticles([]);
    }, 10000);

    return () => clearTimeout(cleanup);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 25 }}>
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute"
            style={{
              left: 'calc(44% + 28px)', // 28px a la derecha (20 + 8)
              top: 'calc(20% - 9px)', // MISMO punto vertical
            }}
            initial={{
              x: 0,
              y: 0,
              opacity: 0,
            }}
            animate={{
              // Trayectoria horizontal con caída suave (como cometa real)
              x: [-30, -60, -90, -120, -150, -180], // Horizontal hacia la izquierda
              y: [5, 10, 18, 28, 40, 55], // Caída gradual hacia abajo
              opacity: [0, 0.8, 0.6, 0.4, 0.2, 0],
              scale: [1, 1.2, 1, 0.8, 0.5, 0.3],
            }}
            transition={{
              duration: 3,
              delay: particle.delay,
              ease: 'easeOut',
            }}
          >
            {/* Partícula de la estela */}
            <div
              style={{
                width: '4px',
                height: '4px',
                background: '#FFD700',
                borderRadius: '50%',
                boxShadow: '0 0 6px 2px rgba(255, 215, 0, 0.6)',
              }}
            />

            {/* Rastro difuminado detrás */}
            <motion.div
              className="absolute"
              style={{
                left: '-2px',
                top: '-2px',
                width: '8px',
                height: '8px',
                background: 'radial-gradient(circle, rgba(255, 215, 0, 0.4), transparent)',
                borderRadius: '50%',
                filter: 'blur(2px)',
              }}
              animate={{
                scale: [1, 1.5, 2],
                opacity: [0.6, 0.3, 0],
              }}
              transition={{
                duration: 1,
                delay: particle.delay,
                ease: 'easeOut',
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL - LOGO REYES
// ============================================

export const ReyesLogo: React.FC<ReyesLogoProps> = ({ onClick, isCollapsed = false }) => {
  const [showCometTail, setShowCometTail] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClick = () => {
    // Ejecutar callback
    if (onClick) {
      onClick();
    }

    // Reproducir audio oriental
    if (!audioRef.current) {
      audioRef.current = new Audio('/assets/reyes-audio.mp3');
      audioRef.current.volume = 0.6;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      // Silenciar error si el navegador bloquea autoplay
    });

    // Mostrar estela de cometa por 10 segundos
    setShowCometTail(true);
    setTimeout(() => {
      setShowCometTail(false);
    }, 10000);
  };

  if (isCollapsed) {
    return null;
  }

  return (
    <div
      onClick={handleClick}
      className="relative hover:opacity-90 transition-opacity cursor-pointer"
      style={{ marginTop: '2px', marginLeft: '8px' }}
      title="¡Feliz Día de Reyes! ⭐"
    >
      <div className="relative">
        {/* Logo de Reyes Magos */}
        <img 
          src="/assets/logo_pqnc-reyes.webp" 
          alt="PQNC" 
          className="w-auto object-contain"
          style={{ height: '46px' }}
        />

        {/* Estrellas pequeñas flotando constantemente */}
        <SmallStars />

        {/* Resplandor en la estrella principal */}
        <GlowingStar />

        {/* Estela de cometa al hacer clic */}
        {showCometTail && <CometTail />}
      </div>
    </div>
  );
};

export default ReyesLogo;

