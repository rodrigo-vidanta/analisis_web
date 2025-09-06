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

  // Movimiento automático del ratón - Mejorado
  const startMouseMovement = () => {
    let time = 0;
    let direction = { x: 1, y: 1 };
    let speed = 0.8;
    
    const moveMouseRandomly = () => {
      if (!isVisible) return;
      
      time += 0.03;
      
      // Movimiento más dinámico y errático del ratón
      const baseX = mousePosition.x + direction.x * speed;
      const baseY = mousePosition.y + direction.y * speed;
      
      // Añadir variación aleatoria
      const randomX = baseX + Math.sin(time * 3) * 2;
      const randomY = baseY + Math.cos(time * 2.5) * 2;
      
      let newX = randomX;
      let newY = randomY;
      
      // Rebotar en los bordes
      if (newX <= 3 || newX >= 97) {
        direction.x *= -1;
        newX = Math.max(3, Math.min(97, newX));
      }
      if (newY <= 3 || newY >= 97) {
        direction.y *= -1;
        newY = Math.max(3, Math.min(97, newY));
      }
      
      // Cambiar dirección aleatoriamente a veces
      if (Math.random() < 0.02) {
        direction.x += (Math.random() - 0.5) * 0.5;
        direction.y += (Math.random() - 0.5) * 0.5;
        // Normalizar velocidad
        const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        direction.x = (direction.x / magnitude) * speed;
        direction.y = (direction.y / magnitude) * speed;
      }
      
      setMousePosition({ x: newX, y: newY });
      animationRef.current = requestAnimationFrame(moveMouseRandomly);
    };

    moveMouseRandomly();
  };

  // El gato persigue al ratón - Mejorado
  useEffect(() => {
    if (!isChasing || !isVisible) return;

    const chaseMouse = () => {
      setCatPosition(prevCat => {
        const dx = mousePosition.x - prevCat.x;
        const dy = mousePosition.y - prevCat.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Velocidad adaptiva basada en distancia
        let speed = 0.6;
        if (distance > 30) speed = 1.2; // Más rápido si está lejos
        if (distance < 10) speed = 0.3; // Más lento si está cerca
        
        // Movimiento más suave y realista
        const moveX = (dx / distance) * speed;
        const moveY = (dy / distance) * speed;
        
        return {
          x: Math.max(1, Math.min(99, prevCat.x + (moveX || 0))),
          y: Math.max(1, Math.min(99, prevCat.y + (moveY || 0)))
        };
      });
    };

    const chaseInterval = setInterval(chaseMouse, 30); // Más frecuente para suavidad
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
        className="absolute transition-all duration-150 ease-out"
        style={{
          left: `${mousePosition.x}%`,
          top: `${mousePosition.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="relative">
          <svg 
            className="w-5 h-5 text-gray-700 dark:text-gray-300 drop-shadow-lg" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            viewBox="0 0 24 24"
          >
            {/* Cuerpo del ratón */}
            <ellipse cx="12" cy="14" rx="6" ry="4"/>
            {/* Cabeza */}
            <circle cx="12" cy="8" r="3"/>
            {/* Orejas */}
            <circle cx="10" cy="5" r="1.5"/>
            <circle cx="14" cy="5" r="1.5"/>
            {/* Ojos */}
            <circle cx="10.5" cy="7.5" r="0.5" fill="currentColor"/>
            <circle cx="13.5" cy="7.5" r="0.5" fill="currentColor"/>
            {/* Cola larga */}
            <path strokeLinecap="round" d="M18 14c3 0 4-1 5-3"/>
          </svg>
          {/* Estela de movimiento */}
          <div className="absolute inset-0 w-5 h-5 bg-gray-400/20 rounded-full animate-ping" style={{ animationDuration: '1s' }} />
        </div>
      </div>

      {/* Gato perseguidor */}
      <div
        className="absolute transition-all duration-200 ease-out"
        style={{
          left: `${catPosition.x}%`,
          top: `${catPosition.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="relative">
          {/* Gato animado mejorado */}
          <svg 
            className="w-7 h-7 text-slate-800 dark:text-slate-200 drop-shadow-xl" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            viewBox="0 0 24 24"
          >
            {/* Cuerpo del gato */}
            <ellipse cx="12" cy="15" rx="5" ry="3"/>
            {/* Cabeza */}
            <circle cx="12" cy="9" r="4"/>
            {/* Orejas puntiagudas */}
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 6l2 3"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 6l-2 3"/>
            {/* Ojos grandes expresivos */}
            <circle cx="10" cy="8" r="1" fill="currentColor"/>
            <circle cx="14" cy="8" r="1" fill="currentColor"/>
            {/* Nariz y boca */}
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v1"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 11.5c.5.5 1.5.5 2 0"/>
            {/* Cola expresiva */}
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 15c2 2 3 4 1 6"/>
            {/* Bigotes */}
            <path strokeLinecap="round" d="M6 9h2"/>
            <path strokeLinecap="round" d="M16 9h2"/>
          </svg>
          
          {/* Efectos de carrera */}
          <div className="absolute -bottom-1 -left-3 w-10 h-2 bg-gradient-to-r from-transparent via-slate-500/40 to-transparent rounded-full animate-pulse" style={{ animationDuration: '0.5s' }} />
          
          {/* Partículas de velocidad */}
          <div className="absolute -left-6 top-1/2 w-1 h-1 bg-slate-400/60 rounded-full animate-ping" style={{ animationDelay: '0.1s' }} />
          <div className="absolute -left-8 top-1/3 w-1 h-1 bg-slate-400/40 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
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
