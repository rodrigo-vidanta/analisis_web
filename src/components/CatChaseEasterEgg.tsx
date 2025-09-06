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
  const [mousePosition, setMousePosition] = useState<Position>({ x: 70, y: 30 });
  const [catPosition, setCatPosition] = useState<Position>({ x: 20, y: 70 });
  const [gameActive, setGameActive] = useState(false);
  const [caught, setCaught] = useState(false);
  const animationRef = useRef<number>();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Inicializar juego cuando se hace visible
  useEffect(() => {
    if (isVisible) {
      // Posiciones iniciales
      setMousePosition({ x: 70, y: 30 });
      setCatPosition({ x: 20, y: 70 });
      setCaught(false);
      
      // Iniciar juego después de un momento
      const startGame = setTimeout(() => {
        setGameActive(true);
        startMouseMovement();
      }, 500);

      // Timeout de 5 minutos
      timeoutRef.current = setTimeout(() => {
        handleGameEnd();
      }, 5 * 60 * 1000); // 5 minutos

      return () => {
        clearTimeout(startGame);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
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

  // Control del gato por cursor del usuario
  useEffect(() => {
    if (!gameActive || !isVisible) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      setCatPosition({
        x: Math.max(2, Math.min(98, x)),
        y: Math.max(2, Math.min(98, y))
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [gameActive, isVisible]);

  // Verificar si el gato atrapó al ratón
  useEffect(() => {
    if (!gameActive || caught) return;

    const dx = Math.abs(catPosition.x - mousePosition.x);
    const dy = Math.abs(catPosition.y - mousePosition.y);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Si la distancia es menor a 5%, el gato atrapó al ratón
    if (distance < 5) {
      setCaught(true);
      setTimeout(() => {
        handleGameEnd();
      }, 1500); // Mostrar captura por 1.5 segundos
    }
  }, [catPosition, mousePosition, gameActive, caught]);

  // Función para terminar el juego
  const handleGameEnd = () => {
    setGameActive(false);
    setCaught(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onClose();
  };

  // Manejar click para cerrar
  const handleClick = () => {
    handleGameEnd();
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
      
      {/* Ratón - Más grande y expresivo */}
      <div
        className={`absolute transition-all duration-200 ease-out ${caught ? 'animate-bounce' : ''}`}
        style={{
          left: `${mousePosition.x}%`,
          top: `${mousePosition.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="relative">
          <svg 
            className={`w-8 h-8 text-gray-700 dark:text-gray-300 drop-shadow-lg ${caught ? 'animate-spin' : ''}`}
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            viewBox="0 0 24 24"
          >
            {/* Cuerpo del ratón */}
            <ellipse cx="12" cy="15" rx="7" ry="5"/>
            {/* Cabeza */}
            <circle cx="12" cy="8" r="4"/>
            {/* Orejas grandes */}
            <circle cx="9" cy="4" r="2"/>
            <circle cx="15" cy="4" r="2"/>
            {/* Ojos expresivos */}
            <circle cx="10" cy="7" r="1" fill="currentColor"/>
            <circle cx="14" cy="7" r="1" fill="currentColor"/>
            {/* Nariz */}
            <circle cx="12" cy="9" r="0.5" fill="currentColor"/>
            {/* Cola larga y curvada */}
            <path strokeLinecap="round" d="M19 15c4 0 5-2 6-5"/>
          </svg>
          {/* Efectos según estado */}
          {!caught && (
            <div className="absolute inset-0 w-8 h-8 bg-gray-400/20 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
          )}
          {caught && (
            <div className="absolute inset-0 w-12 h-12 bg-yellow-400/30 rounded-full animate-ping" style={{ animationDuration: '0.5s' }} />
          )}
        </div>
      </div>

      {/* Gato controlado por usuario - Más grande */}
      <div
        className="absolute transition-none"
        style={{
          left: `${catPosition.x}%`,
          top: `${catPosition.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="relative">
          {/* Gato grande y expresivo */}
          <svg 
            className={`w-10 h-10 text-slate-800 dark:text-slate-200 drop-shadow-xl ${caught ? 'animate-bounce' : ''}`}
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            viewBox="0 0 24 24"
          >
            {/* Cuerpo del gato */}
            <ellipse cx="12" cy="16" rx="6" ry="4"/>
            {/* Cabeza */}
            <circle cx="12" cy="8" r="5"/>
            {/* Orejas puntiagudas */}
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 5l3 4"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 5l-3 4"/>
            {/* Ojos expresivos (más grandes si atrapó) */}
            <circle cx="9.5" cy="7" r={caught ? "1.5" : "1"} fill="currentColor"/>
            <circle cx="14.5" cy="7" r={caught ? "1.5" : "1"} fill="currentColor"/>
            {/* Nariz */}
            <circle cx="12" cy="9" r="0.5" fill="currentColor"/>
            {/* Boca (sonriente si atrapó) */}
            {caught ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 11c1 1 3 1 4 0"/>
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 11c.5.3 1.5.3 2 0"/>
            )}
            {/* Cola expresiva */}
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 16c3 1 4 3 2 6"/>
            {/* Bigotes */}
            <path strokeLinecap="round" d="M5 8h3"/>
            <path strokeLinecap="round" d="M16 8h3"/>
            <path strokeLinecap="round" d="M5 9h3"/>
            <path strokeLinecap="round" d="M16 9h3"/>
          </svg>
          
          {/* Efectos de captura */}
          {caught && (
            <>
              <div className="absolute inset-0 w-16 h-16 bg-green-400/20 rounded-full animate-ping" style={{ animationDuration: '0.8s' }} />
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8">
                <span className="text-2xl animate-bounce">🎉</span>
              </div>
            </>
          )}
          
          {/* Cursor indicator (sutil) */}
          {gameActive && !caught && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <div className="w-1 h-1 bg-blue-500/60 rounded-full animate-pulse" />
            </div>
          )}
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
