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
  const [catDirection, setCatDirection] = useState<'left' | 'right'>('right');
  const [mouseDirection, setMouseDirection] = useState<'left' | 'right'>('right');
  const [cursorPosition, setCursorPosition] = useState<Position>({ x: 50, y: 50 });
  const animationRef = useRef<number>();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastCatPosition = useRef<Position>({ x: 20, y: 70 });
  const lastMousePosition = useRef<Position>({ x: 70, y: 30 });
  const currentCatPosition = useRef<Position>({ x: 20, y: 70 });
  const currentCursorPosition = useRef<Position>({ x: 50, y: 50 });

  // Movimiento automático del ratón - VELOCIDAD CONTROLADA
  const startMouseMovement = () => {
    console.log('🐭 INICIANDO MOVIMIENTO DEL RATÓN');
    
    let lastTime = 0;
    const targetFPS = 30; // 30 FPS para movimiento visible
    const frameInterval = 1000 / targetFPS;
    
    const moveMouse = (currentTime: number) => {
      if (!isVisible || !gameActive) {
        console.log('🐭 Juego no activo, deteniendo movimiento');
        return;
      }
      
      // Control de frame rate
      if (currentTime - lastTime < frameInterval) {
        animationRef.current = requestAnimationFrame(moveMouse);
        return;
      }
      lastTime = currentTime;
      
      setMousePosition(prevPos => {
        // Usar refs para obtener posiciones actualizadas
        const catPos = currentCatPosition.current;
        const cursorPos = currentCursorPosition.current;
        
        // Calcular distancia al gato
        const dxCat = catPos.x - prevPos.x;
        const dyCat = catPos.y - prevPos.y;
        const distanceToCat = Math.sqrt(dxCat * dxCat + dyCat * dyCat);
        
        // Calcular distancia al cursor
        const dxCursor = cursorPos.x - prevPos.x;
        const dyCursor = cursorPos.y - prevPos.y;
        const distanceToCursor = Math.sqrt(dxCursor * dxCursor + dyCursor * dyCursor);
        
        // Movimiento base aleatorio - MUY AMPLIO
        let moveX = (Math.random() - 0.5) * 8.0; // MUCHO más amplio para recorrer toda la pantalla
        let moveY = (Math.random() - 0.5) * 8.0;
        
        // ESCAPAR DEL CURSOR Y DEL GATO SIMULTÁNEAMENTE
        let totalFleeX = 0;
        let totalFleeY = 0;
        let fleeCount = 0;
        
        // ESCAPAR DEL CURSOR
        if (distanceToCursor < 25) {
          const cursorFleeStrength = 12.0; // Huida MUY agresiva del cursor
          totalFleeX += (-dxCursor / distanceToCursor) * cursorFleeStrength;
          totalFleeY += (-dyCursor / distanceToCursor) * cursorFleeStrength;
          fleeCount++;
          console.log(`🐭 ESCAPANDO DEL CURSOR! Distancia: ${distanceToCursor.toFixed(1)}`);
        }
        
        // ESCAPAR DEL GATO - MUY AGRESIVO
        if (distanceToCat < 40) { // Aumentado el rango de detección
          // Huida más agresiva cuanto más cerca esté el gato
          const proximityFactor = Math.max(1, (40 - distanceToCat) / 40); // 1 a 2x más agresivo
          const catFleeStrength = 15.0 * proximityFactor; // Hasta 30.0 de fuerza
          totalFleeX += (-dxCat / distanceToCat) * catFleeStrength;
          totalFleeY += (-dyCat / distanceToCat) * catFleeStrength;
          fleeCount++;
          console.log(`🐭 ESCAPANDO DEL GATO! Distancia: ${distanceToCat.toFixed(1)}, Fuerza: ${catFleeStrength.toFixed(1)}`);
        }
        
        // Si está escapando de algo, usar la huida combinada
        if (fleeCount > 0) {
          moveX = totalFleeX / fleeCount; // Promedio de las huidas
          moveY = totalFleeY / fleeCount;
        }
        
        // Calcular nueva posición
        let newX = prevPos.x + moveX;
        let newY = prevPos.y + moveY;
        
        // REBOTAR EN BORDES - Evitar que se quede atrapado
        if (newX <= 2) {
          newX = 2;
          // Si está escapando hacia la izquierda, cambiar dirección
          if (moveX < 0) {
            moveX = Math.abs(moveX) * 0.5; // Rebote con menos fuerza
          }
        } else if (newX >= 98) {
          newX = 98;
          // Si está escapando hacia la derecha, cambiar dirección
          if (moveX > 0) {
            moveX = -Math.abs(moveX) * 0.5; // Rebote con menos fuerza
          }
        }
        
        if (newY <= 2) {
          newY = 2;
          // Si está escapando hacia arriba, cambiar dirección
          if (moveY < 0) {
            moveY = Math.abs(moveY) * 0.5; // Rebote con menos fuerza
          }
        } else if (newY >= 98) {
          newY = 98;
          // Si está escapando hacia abajo, cambiar dirección
          if (moveY > 0) {
            moveY = -Math.abs(moveY) * 0.5; // Rebote con menos fuerza
          }
        }
        
        // Aplicar rebote a la nueva posición
        newX = prevPos.x + moveX;
        newY = prevPos.y + moveY;
        
        // Mantener dentro de límites finales
        newX = Math.max(2, Math.min(98, newX));
        newY = Math.max(2, Math.min(98, newY));
        
        // NO cambiar dirección del ratón - mantener siempre hacia la derecha
        // setMouseDirection('right'); // Comentado para evitar rotación
        
        console.log(`🐭 Ratón moviéndose: ${prevPos.x.toFixed(1)},${prevPos.y.toFixed(1)} → ${newX.toFixed(1)},${newY.toFixed(1)}`);
        
        return { x: newX, y: newY };
      });
      
      // Continuar animación
      animationRef.current = requestAnimationFrame(moveMouse);
    };
    
    // Iniciar movimiento inmediatamente
    animationRef.current = requestAnimationFrame(moveMouse);
  };

  // Inicializar juego cuando se hace visible
  useEffect(() => {
    if (isVisible) {
      console.log('🎮 INICIANDO JUEGO - Configurando posiciones');
      
      // Posiciones iniciales
      setMousePosition({ x: 70, y: 30 });
      setCatPosition({ x: 20, y: 70 });
      setCaught(false);
      setGameActive(true); // Activar juego

      // Timeout de 5 minutos
      timeoutRef.current = setTimeout(() => {
        console.log('⏰ TIMEOUT DE 5 MINUTOS - Terminando juego');
        handleGameEnd();
      }, 5 * 60 * 1000); // 5 minutos

      return () => {
        console.log('🧹 LIMPIANDO JUEGO');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isVisible]);

  // Iniciar movimiento cuando el juego se active
  useEffect(() => {
    if (gameActive && isVisible) {
      console.log('🎮 JUEGO ACTIVADO - Iniciando movimiento del ratón');
      startMouseMovement();
    }
  }, [gameActive, isVisible]);

  // Control del gato por cursor del usuario Y rastrear posición del cursor
  useEffect(() => {
    if (!gameActive || !isVisible) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      // Detectar dirección del gato
      if (x > lastCatPosition.current.x) {
        setCatDirection('right');
      } else if (x < lastCatPosition.current.x) {
        setCatDirection('left');
      }
      
      const newPosition = {
        x: Math.max(2, Math.min(98, x)),
        y: Math.max(2, Math.min(98, y))
      };
      
      lastCatPosition.current = newPosition;
      setCatPosition(newPosition);
      
      // ACTUALIZAR POSICIÓN DEL CURSOR para que el ratón escape
      setCursorPosition(newPosition);
      
      // ACTUALIZAR REFS para el movimiento del ratón
      currentCatPosition.current = newPosition;
      currentCursorPosition.current = newPosition;
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
      
      {/* Ratón - Emoji lindo SIN rotación */}
      <div
        className={`absolute transition-all duration-150 ease-out ${caught ? 'animate-bounce' : ''}`}
        style={{
          left: `${mousePosition.x}%`,
          top: `${mousePosition.y}%`,
          transform: `translate(-50%, -50%)` // Sin rotación
        }}
      >
        <div className="relative">
          <div className={`text-3xl drop-shadow-lg ${caught ? 'animate-spin' : ''}`}>
            {caught ? '😵' : '🐭'}
          </div>
          {/* Efectos según estado */}
          {!caught && (
            <div className="absolute inset-0 w-12 h-12 bg-gray-400/20 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
          )}
          {caught && (
            <>
              <div className="absolute inset-0 w-16 h-16 bg-yellow-400/30 rounded-full animate-ping" style={{ animationDuration: '0.5s' }} />
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8">
                <span className="text-2xl animate-bounce">⭐</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Gato controlado por usuario - Emoji lindo con orientación */}
      <div
        className="absolute transition-none"
        style={{
          left: `${catPosition.x}%`,
          top: `${catPosition.y}%`,
          transform: `translate(-50%, -50%) ${catDirection === 'left' ? 'scaleX(-1)' : ''}`
        }}
      >
        <div className="relative">
          {/* Gato emoji grande y expresivo */}
          <div className={`text-4xl drop-shadow-xl ${caught ? 'animate-bounce' : ''}`}>
            {caught ? '😸' : '🐱'}
          </div>
          
          {/* Efectos de captura */}
          {caught && (
            <>
              <div className="absolute inset-0 w-20 h-20 bg-green-400/20 rounded-full animate-ping" style={{ animationDuration: '0.8s' }} />
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-12">
                <span className="text-3xl animate-bounce">🎉</span>
              </div>
              <div className="absolute -top-4 -left-8">
                <span className="text-lg animate-pulse">✨</span>
              </div>
              <div className="absolute -top-4 -right-8">
                <span className="text-lg animate-pulse" style={{ animationDelay: '0.3s' }}>✨</span>
              </div>
            </>
          )}
          
          {/* Indicador sutil de cursor */}
          {gameActive && !caught && (
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
              <div className="w-2 h-2 bg-blue-500/40 rounded-full animate-pulse" />
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
