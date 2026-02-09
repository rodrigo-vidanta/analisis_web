/**
 * ============================================
 * LOGO SAN VALENTIN CON ANIMACIONES
 * ============================================
 *
 * Logo PQNC de San Valentin con:
 * - Heartbeat sutil en loop constante
 * - Corazones traslucidos subiendo como globos al hacer clic
 * - Audio romantico de 12.1 segundos
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ValentineLogoProps {
  onClick?: () => void;
  isCollapsed?: boolean;
}

// ============================================
// CORAZONES FLOTANTES (Al hacer clic)
// ============================================

interface FloatingHeart {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  oscillationAmplitude: number;
  oscillationSpeed: number;
  color: string;
}

const HEART_COLORS = [
  'rgba(255, 105, 135, 0.3)',
  'rgba(255, 72, 109, 0.25)',
  'rgba(255, 140, 160, 0.3)',
  'rgba(236, 72, 153, 0.25)',
  'rgba(244, 114, 182, 0.3)',
  'rgba(251, 113, 133, 0.25)',
];

const generateHearts = (): FloatingHeart[] => {
  const hearts: FloatingHeart[] = [];
  for (let i = 0; i < 18; i++) {
    hearts.push({
      id: i,
      x: Math.random() * 100,
      size: 90 + Math.random() * 150,
      delay: Math.random() * 2,
      duration: 4 + Math.random() * 3,
      oscillationAmplitude: 15 + Math.random() * 25,
      oscillationSpeed: 1.5 + Math.random() * 1.5,
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
    });
  }
  return hearts;
};

const HeartShape: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const FloatingHearts: React.FC = () => {
  const hearts = React.useMemo(() => generateHearts(), []);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 9999 }}
    >
      <AnimatePresence>
        {hearts.map((heart) => (
          <motion.div
            key={heart.id}
            className="absolute"
            style={{
              left: `${heart.x}%`,
              bottom: -40,
            }}
            initial={{
              y: 0,
              opacity: 0,
            }}
            animate={{
              y: [0, -window.innerHeight * 0.4, -window.innerHeight * 0.7, -window.innerHeight * 1.1],
              x: [
                0,
                heart.oscillationAmplitude,
                -heart.oscillationAmplitude * 0.7,
                heart.oscillationAmplitude * 0.5,
                -heart.oscillationAmplitude * 0.3,
                heart.oscillationAmplitude * 0.2,
              ],
              opacity: [0, 0.8, 0.6, 0.3, 0],
              rotate: [0, 10, -8, 5, -3, 0],
            }}
            transition={{
              y: {
                duration: heart.duration,
                delay: heart.delay,
                ease: 'easeOut',
              },
              x: {
                duration: heart.oscillationSpeed,
                delay: heart.delay,
                repeat: Math.ceil(heart.duration / heart.oscillationSpeed),
                ease: 'easeInOut',
              },
              opacity: {
                duration: heart.duration,
                delay: heart.delay,
                times: [0, 0.15, 0.5, 0.8, 1],
                ease: 'easeOut',
              },
              rotate: {
                duration: heart.oscillationSpeed * 1.2,
                delay: heart.delay,
                repeat: Math.ceil(heart.duration / (heart.oscillationSpeed * 1.2)),
                ease: 'easeInOut',
              },
            }}
          >
            <HeartShape size={heart.size} color={heart.color} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL - LOGO VALENTINE
// ============================================

export const ValentineLogo: React.FC<ValentineLogoProps> = ({ onClick, isCollapsed = false }) => {
  const [showHearts, setShowHearts] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    }

    if (!audioRef.current) {
      audioRef.current = new Audio('/assets/valentine-audio.mp3');
      audioRef.current.volume = 0.5;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowHearts(true);
    timeoutRef.current = setTimeout(() => {
      setShowHearts(false);
    }, 12000);
  }, [onClick]);

  if (isCollapsed) {
    return null;
  }

  return (
    <div
      onClick={handleClick}
      className="relative hover:opacity-90 transition-opacity cursor-pointer"
      style={{ marginTop: '2px', marginLeft: '8px' }}
      title="Happy Valentine's Day!"
    >
      <div className="relative">
        {/* Resplandor rosado detras del logo */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: '200px',
            height: '80px',
            left: '50%',
            top: '50%',
            marginLeft: '-100px',
            marginTop: '-40px',
            background: 'radial-gradient(ellipse at center, rgba(236, 72, 153, 0.35) 0%, rgba(244, 114, 182, 0.2) 30%, rgba(251, 113, 133, 0.08) 60%, transparent 80%)',
            filter: 'blur(16px)',
            borderRadius: '50%',
          }}
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.img
          src="/assets/logo_pqnc-valentine.png"
          alt="PQNC"
          className="relative w-auto object-contain"
          style={{ height: '46px' }}
          animate={{
            scale: [1, 1.035, 1],
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {showHearts && <FloatingHearts />}
    </div>
  );
};

export default ValentineLogo;
