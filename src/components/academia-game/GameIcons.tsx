import React, { useState } from 'react';

// Componente para iconos de videojuego usando SVG/imágenes reales
export const GameIcon: React.FC<{
  type: 'sword' | 'shield' | 'helmet' | 'armor' | 'boots' | 'gloves' | 'heart' | 'star' | 'coin' | 'gem' | 'scroll' | 'potion';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'crystal';
  className?: string;
}> = ({ type, size = 'md', color = 'silver', className = '' }) => {
  
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colors = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    crystal: '#FF69B4'
  };

  // SVGs de iconos de videojuego profesionales
  const icons = {
    sword: (
      <svg viewBox="0 0 24 24" fill="none" className={`${sizes[size]} ${className}`}>
        <path 
          d="M6.5 21L3 17.5L17.5 3L21 6.5L6.5 21Z" 
          fill={colors[color]} 
          stroke="#2D1810" 
          strokeWidth="1.5"
        />
        <path 
          d="M19 5L19.5 4.5L20.5 5.5L20 6L19 5Z" 
          fill="#FFD700" 
          stroke="#B8860B" 
          strokeWidth="1"
        />
        <circle cx="6.5" cy="17.5" r="2" fill="#8B4513" stroke="#654321" strokeWidth="1"/>
      </svg>
    ),
    
    shield: (
      <svg viewBox="0 0 24 24" fill="none" className={`${sizes[size]} ${className}`}>
        <path 
          d="M12 2L4 6V10C4 16 8 22 12 22C16 22 20 16 20 10V6L12 2Z" 
          fill={colors[color]} 
          stroke="#2D1810" 
          strokeWidth="1.5"
        />
        <path 
          d="M12 4L6 7V10C6 15 9 19 12 19C15 19 18 15 18 10V7L12 4Z" 
          fill="url(#shieldGradient)" 
          stroke="#1A1A1A" 
          strokeWidth="0.5"
        />
        <defs>
          <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
          </linearGradient>
        </defs>
      </svg>
    ),

    helmet: (
      <svg viewBox="0 0 24 24" fill="none" className={`${sizes[size]} ${className}`}>
        <path 
          d="M12 2C8 2 5 5 5 9V15C5 17 6 19 8 20H16C18 19 19 17 19 15V9C19 5 16 2 12 2Z" 
          fill={colors[color]} 
          stroke="#2D1810" 
          strokeWidth="1.5"
        />
        <path 
          d="M12 4C9.5 4 7.5 6 7.5 8.5V14C7.5 15.5 8.5 16.5 10 17H14C15.5 16.5 16.5 15.5 16.5 14V8.5C16.5 6 14.5 4 12 4Z" 
          fill="url(#helmetGradient)" 
        />
        <circle cx="10" cy="10" r="1" fill="#FF0000" />
        <circle cx="14" cy="10" r="1" fill="#FF0000" />
        <defs>
          <linearGradient id="helmetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
          </linearGradient>
        </defs>
      </svg>
    ),

    armor: (
      <svg viewBox="0 0 24 24" fill="none" className={`${sizes[size]} ${className}`}>
        <path 
          d="M8 4H16V8H20V16C20 18 18 20 16 20H8C6 20 4 18 4 16V8H8V4Z" 
          fill={colors[color]} 
          stroke="#2D1810" 
          strokeWidth="1.5"
        />
        <rect x="9" y="6" width="6" height="8" fill="url(#armorGradient)" stroke="#1A1A1A" strokeWidth="0.5"/>
        <circle cx="12" cy="10" r="2" fill="#FFD700" stroke="#B8860B" strokeWidth="1"/>
        <defs>
          <linearGradient id="armorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
          </linearGradient>
        </defs>
      </svg>
    ),

    heart: (
      <svg viewBox="0 0 24 24" fill="none" className={`${sizes[size]} ${className}`}>
        <path 
          d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z" 
          fill="#FF4757" 
          stroke="#2D1810" 
          strokeWidth="1.5"
        />
        <path 
          d="M12 19L10.9 17.95C6.5 13.95 3.5 11.15 3.5 8C3.5 6.5 4.5 5.5 6 5.5C7 5.5 8 6 8.5 6.5C9 6 10 5.5 11 5.5H13C14 5.5 15 6 15.5 6.5C16 6 17 5.5 18 5.5C19.5 5.5 20.5 6.5 20.5 8C20.5 11.15 17.5 13.95 13.1 17.95L12 19Z" 
          fill="url(#heartGradient)"
        />
        <defs>
          <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255, 71, 87, 0.8)" />
          </linearGradient>
        </defs>
      </svg>
    ),

    star: (
      <svg viewBox="0 0 24 24" fill="none" className={`${sizes[size]} ${className}`}>
        <path 
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
          fill={colors[color]} 
          stroke="#2D1810" 
          strokeWidth="1.5"
        />
        <path 
          d="M12 4L14.5 9L20 9.5L16 13.5L17 19L12 16.5L7 19L8 13.5L4 9.5L9.5 9L12 4Z" 
          fill="url(#starGradient)"
        />
        <defs>
          <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor="rgba(255, 215, 0, 0.8)" />
          </linearGradient>
        </defs>
      </svg>
    ),

    coin: (
      <svg viewBox="0 0 24 24" fill="none" className={`${sizes[size]} ${className}`}>
        <circle 
          cx="12" 
          cy="12" 
          r="10" 
          fill="#FFD700" 
          stroke="#B8860B" 
          strokeWidth="2"
        />
        <circle 
          cx="12" 
          cy="12" 
          r="7" 
          fill="url(#coinGradient)" 
          stroke="#DAA520" 
          strokeWidth="1"
        />
        <text 
          x="12" 
          y="16" 
          textAnchor="middle" 
          className="text-xs font-black" 
          fill="#8B4513"
        >
          $
        </text>
        <defs>
          <radialGradient id="coinGradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="70%" stopColor="rgba(255, 215, 0, 0.9)" />
            <stop offset="100%" stopColor="rgba(184, 134, 11, 1)" />
          </radialGradient>
        </defs>
      </svg>
    ),

    gem: (
      <svg viewBox="0 0 24 24" fill="none" className={`${sizes[size]} ${className}`}>
        <path 
          d="M6 9L12 3L18 9L15 21H9L6 9Z" 
          fill={colors[color]} 
          stroke="#2D1810" 
          strokeWidth="1.5"
        />
        <path 
          d="M8 9L12 5L16 9L14 19H10L8 9Z" 
          fill="url(#gemGradient)"
        />
        <defs>
          <linearGradient id="gemGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="50%" stopColor={colors[color]} />
            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
          </linearGradient>
        </defs>
      </svg>
    )
  };

  return icons[type] || icons.star;
};

// Componente para usar imágenes reales descargadas
export const GameAssetImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}> = ({ src, alt, className = '', fallback }) => {
  const [imageError, setImageError] = useState(false);

  if (imageError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <img 
      src={src}
      alt={alt}
      className={className}
      onError={() => setImageError(true)}
      style={{
        imageRendering: 'pixelated', // Para pixel art
        filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))'
      }}
    />
  );
};

export default GameIcon;
