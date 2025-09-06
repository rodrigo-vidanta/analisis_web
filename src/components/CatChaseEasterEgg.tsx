import React, { useState, useEffect, useRef } from 'react';

interface CatChaseEasterEggProps {
  isVisible: boolean;
  onClose: () => void;
}

interface Position {
  x: number;
  y: number;
}

const CatChaseEasterEgg: React.FC<CatChaseEasterEggProps> = ({ isVisible, onClose }) => {
  const [mousePosition, setMousePosition] = useState<Position>({ x: 50, y: 50 });
  const [catPosition, setCatPosition] = useState<Position>({ x: 10, y: 80 });
  const [isChasing, setIsChasing] = useState(false);
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Inicializar posiciones cuando se hace visible
  useEffect(() => {
    if (isVisible) {
      // Posición inicial del ratón (centro-derecha)
      setMousePosition({ x: 70, y: 50 });
      // Posición inicial del gato (izquierda)
      setCatPosition({ x: 10, y: 80 });
      
      // Iniciar persecución después de un momento
      const startChase = setTimeout(() => {
        setIsChasing(true);
        startMouseMovement();
      }, 500);

      return () => {
        clearTimeout(startChase);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isVisible]);

  // Movimiento automático del ratón
  const startMouseMovement = () => {
    let time = 0;
    
    const moveMouseRandomly = () => {
      if (!isVisible) return;
      
      time += 0.02;
      
      // Movimiento pseudo-aleatorio pero suave del ratón
      const newX = 30 + Math.sin(time * 2) * 25 + Math.cos(time * 0.7) * 15;
      const newY = 30 + Math.cos(time * 1.5) * 20 + Math.sin(time * 0.9) * 15;
      
      setMousePosition({
        x: Math.max(5, Math.min(95, newX)),
        y: Math.max(5, Math.min(95, newY))
      });

      animationRef.current = requestAnimationFrame(moveMouseRandomly);
    };

    moveMouseRandomly();
  };

  // El gato persigue al ratón con delay
  useEffect(() => {
    if (!isChasing || !isVisible) return;

    const chaseMouse = () => {
      setCatPosition(prevCat => {
        const dx = mousePosition.x - prevCat.x;
        const dy = mousePosition.y - prevCat.y;
        
        // Velocidad de persecución (más lenta que el ratón)
        const speed = 0.8;
        
        return {
          x: prevCat.x + dx * speed * 0.05,
          y: prevCat.y + dy * speed * 0.05
        };
      });
    };

    const chaseInterval = setInterval(chaseMouse, 50);
    return () => clearInterval(chaseInterval);
  }, [mousePosition, isChasing, isVisible]);

  // Manejar click para cerrar
  const handleClick = () => {
    setIsChasing(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] cursor-pointer"
      onClick={handleClick}
    >
      {/* Fondo blureado */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-all duration-500" />
      
      {/* Ratón */}
      <div
        className="absolute transition-all duration-300 ease-out transform"
        style={{
          left: `${mousePosition.x}%`,
          top: `${mousePosition.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <svg 
          className="w-6 h-6 text-gray-600 dark:text-gray-400 drop-shadow-lg animate-bounce" 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          {/* Ratón minimalista */}
          <path d="M12 2C8.5 2 6 4.5 6 8v4c0 3.5 2.5 6 6 6s6-2.5 6-6V8c0-3.5-2.5-6-6-6z"/>
          <circle cx="10" cy="7" r="1"/>
          <circle cx="14" cy="7" r="1"/>
          <path d="M12 9v2"/>
          {/* Cola del ratón */}
          <path d="M18 12c2 0 3 1 3 2s-1 2-3 2"/>
        </svg>
      </div>

      {/* Gato perseguidor */}
      <div
        className="absolute transition-all duration-500 ease-out transform"
        style={{
          left: `${catPosition.x}%`,
          top: `${catPosition.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="relative">
          {/* Gato animado */}
          <svg 
            className="w-8 h-8 text-slate-800 dark:text-slate-200 drop-shadow-xl animate-pulse" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            viewBox="0 0 24 24"
          >
            {/* Cuerpo del gato */}
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12c0-1.5.5-3 2-4 1.5-1 3.5-1 5 0s3.5 1 5 0c1.5 1 2 2.5 2 4v3c0 2-1 3-3 3H9c-2 0-3-1-3-3v-3z"/>
            {/* Ojos */}
            <circle cx="9" cy="10" r="1" fill="currentColor"/>
            <circle cx="15" cy="10" r="1" fill="currentColor"/>
            {/* Nariz */}
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 13v1"/>
            {/* Orejas */}
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 4l1 2"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 4l-1 2"/>
            {/* Cola */}
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 15c2 1 3 2 2 4"/>
          </svg>
          
          {/* Efectos de movimiento */}
          <div className="absolute -bottom-2 -left-2 w-12 h-1 bg-gradient-to-r from-transparent via-slate-400/30 to-transparent rounded-full animate-pulse" />
        </div>
      </div>

      {/* Instrucciones elegantes */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20 dark:border-slate-700/50 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              🐱 El gato está persiguiendo al ratón... Haz clic para detener
            </span>
          </div>
        </div>
      </div>

      {/* Efectos de partículas sutiles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-slate-400/30 rounded-full animate-ping"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 2) * 40}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: '3s'
            }}
          />
        ))}
      </div>

    </div>
  );
};

export default CatChaseEasterEgg;
