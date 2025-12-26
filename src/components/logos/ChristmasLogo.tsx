/**
 * ============================================
 * LOGO NAVIDEÑO CON ANIMACIONES
 * ============================================
 * 
 * Logo PQNC de Navidad con:
 * - Luces navideñas titilantes
 * - Copos de nieve cayendo
 * - Audio de jingle navideño
 */

import React, { useState, useRef } from 'react';

interface ChristmasLogoProps {
  onClick?: () => void;
  isCollapsed?: boolean;
}

// Configuración de luces navideñas
const christmasLights = [
  { x: 15, y: 32, color: 'yellow', anim: 1 },
  { x: 17, y: 42, color: 'green', anim: 2 },
  { x: 24, y: 36, color: 'red', anim: 3 },
  { x: 29, y: 40, color: 'orange', anim: 4 },
  { x: 34, y: 34, color: 'yellow', anim: 1 },
  { x: 36, y: 44, color: 'green', anim: 2 },
  { x: 43, y: 36, color: 'red', anim: 3 },
  { x: 50, y: 30, color: 'orange', anim: 4 },
  { x: 56, y: 28, color: 'yellow', anim: 1 },
  { x: 62, y: 34, color: 'green', anim: 2 },
  { x: 69, y: 28, color: 'red', anim: 3 },
  { x: 76, y: 24, color: 'orange', anim: 4 },
  { x: 82, y: 26, color: 'yellow', anim: 1 },
  { x: 86, y: 32, color: 'green', anim: 2 },
  { x: 88, y: 40, color: 'red', anim: 3 },
];

// Generar copos de nieve
const generateSnowflakes = () => {
  const flakes = [];
  for (let i = 0; i < 25; i++) {
    flakes.push({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 2 + Math.random() * 3,
      size: Math.floor(Math.random() * 3) + 1,
    });
  }
  return flakes;
};

// Componente de overlay de luces y nieve
const ChristmasLightsOverlay: React.FC<{ showSnow?: boolean }> = ({ showSnow = false }) => {
  const [snowflakes] = useState(() => generateSnowflakes());

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {/* Foquitos de luces */}
      {christmasLights.map((light, index) => (
        <div
          key={index}
          className={`christmas-light ${light.color} anim-${light.anim}`}
          style={{
            left: `${light.x}%`,
            top: `${light.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
      
      {/* Copos de nieve */}
      {showSnow && (
        <div className="snowfall-container">
          {snowflakes.map((flake) => (
            <div
              key={flake.id}
              className={`snowflake size-${flake.size}`}
              style={{
                left: `${flake.left}%`,
                animation: `snowfall ${flake.duration}s linear ${flake.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const ChristmasLogo: React.FC<ChristmasLogoProps> = ({ onClick, isCollapsed = false }) => {
  const [showSnow, setShowSnow] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClick = () => {
    // Ejecutar callback
    if (onClick) {
      onClick();
    }

    // Reproducir jingle navideño
    if (!audioRef.current) {
      audioRef.current = new Audio('/assets/christmas-jingle.mp3');
      audioRef.current.volume = 0.5;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      // Silenciar error si el navegador bloquea autoplay
    });

    // Mostrar copos de nieve por 8 segundos
    setShowSnow(true);
    setTimeout(() => {
      setShowSnow(false);
    }, 8000);
  };

  if (isCollapsed) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className="christmas-text-container hover:opacity-90 transition-opacity cursor-pointer"
      style={{ marginTop: '2px', marginLeft: '8px' }}
      title="¡Feliz Navidad! 🎄"
    >
      <img 
        src="/assets/pqnc-christmas-text-final.png" 
        alt="PQNC" 
        className="w-auto object-contain"
        style={{ height: '46px' }}
      />
      <ChristmasLightsOverlay showSnow={showSnow} />
    </button>
  );
};

export default ChristmasLogo;

