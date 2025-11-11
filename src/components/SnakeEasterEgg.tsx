import React, { useState, useEffect, useRef } from 'react';

interface SnakeEasterEggProps {
  isVisible: boolean;
  onClose: () => void;
}

interface Position {
  x: number;
  y: number;
}

const GRID_SIZE = 30; // Tamaño de la cuadrícula (30x30) - Aumentado
const CELL_SIZE = 18; // Tamaño de cada celda en píxeles - Ajustado para mejor visualización
const BASE_GAME_SPEED = 150; // Velocidad base del juego en ms
const SPEED_INCREASE_PER_10 = 10; // Reducción de ms por cada bloque de 10 puntos
const MIN_GAME_SPEED = 50; // Velocidad mínima (máxima velocidad)

const SnakeEasterEgg: React.FC<SnakeEasterEggProps> = ({ isVisible, onClose }) => {
  const [snake, setSnake] = useState<Position[]>([{ x: 15, y: 15 }]); // Centrado en grid 30x30
  const [food, setFood] = useState<Position>({ x: 20, y: 20 });
  const [direction, setDirection] = useState<Position>({ x: 1, y: 0 });
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false); // Controla si el juego ha comenzado
  const [score, setScore] = useState(0);
  const [nextDirection, setNextDirection] = useState<Position>({ x: 1, y: 0 });
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const snakeRef = useRef<Position[]>([{ x: 15, y: 15 }]);
  const foodRef = useRef<Position>({ x: 20, y: 20 });
  const directionRef = useRef<Position>({ x: 1, y: 0 });
  const savedSnakeLengthRef = useRef<number>(1); // Guardar longitud de la serpiente
  const scoreRef = useRef<number>(0); // Ref para score dentro del interval

  // Sincronizar refs con state
  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  // Generar comida en posición aleatoria - GARANTIZA que siempre esté dentro del grid
  const generateFood = (currentSnake: Position[]) => {
    // Crear lista de todas las posiciones válidas (solo dentro del grid)
    const validPositions: Position[] = [];
    
    // Iterar solo sobre posiciones dentro del grid (0 a GRID_SIZE - 1)
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        // Verificar que la posición esté dentro del grid Y no esté ocupada por la serpiente
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE &&
            !currentSnake.some(segment => segment.x === x && segment.y === y)) {
          validPositions.push({ x, y });
        }
      }
    }
    
    // Si no hay posiciones válidas, no generar comida (serpiente llena)
    if (validPositions.length === 0) {
      console.warn('No hay posiciones válidas para comida - serpiente llena');
      return;
    }
    
    // Seleccionar posición aleatoria de las válidas
    const randomIndex = Math.floor(Math.random() * validPositions.length);
    const newFood = validPositions[randomIndex];
    
    // Verificación final de seguridad (doble check)
    if (newFood.x >= 0 && newFood.x < GRID_SIZE && 
        newFood.y >= 0 && newFood.y < GRID_SIZE) {
      setFood(newFood);
      foodRef.current = newFood;
    } else {
      console.error('Error crítico: comida generada fuera de límites', newFood);
      // Fallback seguro: usar la primera posición válida que sabemos que está dentro
      if (validPositions.length > 0) {
        const fallbackFood = validPositions[0];
        // Verificación adicional del fallback
        if (fallbackFood.x >= 0 && fallbackFood.x < GRID_SIZE && 
            fallbackFood.y >= 0 && fallbackFood.y < GRID_SIZE) {
          setFood(fallbackFood);
          foodRef.current = fallbackFood;
        }
      }
    }
  };

  // Inicializar juego
  useEffect(() => {
    if (isVisible) {
      // Crear serpiente inicial con la longitud guardada
      const initialLength = Math.max(1, Math.min(savedSnakeLengthRef.current, GRID_SIZE - 5)); // Limitar longitud máxima
      const initialSnake: Position[] = [];
      const startX = Math.floor(GRID_SIZE / 2); // Centro del grid
      const startY = Math.floor(GRID_SIZE / 2); // Centro del grid
      
      // Crear serpiente con la longitud guardada (horizontal hacia la derecha)
      // Asegurar que todas las posiciones estén dentro del grid desde el inicio
      for (let i = 0; i < initialLength; i++) {
        const x = startX - i;
        // Asegurar que x esté dentro del grid
        if (x >= 0 && x < GRID_SIZE && startY >= 0 && startY < GRID_SIZE) {
          initialSnake.push({ x, y: startY });
        } else {
          // Si se sale, ajustar la posición
          const adjustedX = Math.max(0, Math.min(x, GRID_SIZE - 1));
          if (adjustedX >= 0 && adjustedX < GRID_SIZE && startY >= 0 && startY < GRID_SIZE) {
            initialSnake.push({ x: adjustedX, y: startY });
          }
        }
      }
      
      // Validación final: asegurar que todas las posiciones estén dentro del grid
      const validSnake = initialSnake.filter(segment => 
        segment.x >= 0 && segment.x < GRID_SIZE && 
        segment.y >= 0 && segment.y < GRID_SIZE
      );
      
      // Si no hay serpiente válida, crear una mínima en el centro
      const finalSnake = validSnake.length > 0 
        ? validSnake 
        : [{ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }];
      
      // Actualizar longitud guardada con la longitud real válida
      savedSnakeLengthRef.current = finalSnake.length;
      
      setGameActive(true);
      setGameOver(false);
      setGameStarted(false); // No comenzar hasta presionar una tecla
      setScore(0);
      scoreRef.current = 0;
      setSnake(finalSnake);
      setDirection({ x: 1, y: 0 });
      setNextDirection({ x: 1, y: 0 });
      snakeRef.current = finalSnake;
      directionRef.current = { x: 1, y: 0 };
      generateFood(finalSnake);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isVisible]);

  // Manejar teclado
  useEffect(() => {
    if (!gameActive || gameOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      
      const currentDir = directionRef.current;
      
      // Si el juego no ha comenzado, iniciarlo con cualquier tecla de dirección
      if (!gameStarted) {
        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            setGameStarted(true);
            setNextDirection({ x: 0, y: -1 });
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            setGameStarted(true);
            setNextDirection({ x: 0, y: 1 });
            break;
          case 'ArrowLeft':
          case 'a':
          case 'A':
            setGameStarted(true);
            setNextDirection({ x: -1, y: 0 });
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            setGameStarted(true);
            setNextDirection({ x: 1, y: 0 });
            break;
        }
        return;
      }
      
      // Si ya comenzó, manejar cambios de dirección normalmente
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currentDir.y === 0) setNextDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currentDir.y === 0) setNextDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentDir.x === 0) setNextDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentDir.x === 0) setNextDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameActive, gameOver, gameStarted]);

  // Loop principal del juego
  useEffect(() => {
    if (!gameActive || gameOver || !gameStarted) return; // No iniciar hasta que se presione una tecla

    // Calcular velocidad basada en el score (cada 10 puntos aumenta velocidad)
    const blocksOf10 = Math.floor(score / 10);
    const currentSpeed = Math.max(MIN_GAME_SPEED, BASE_GAME_SPEED - (blocksOf10 * SPEED_INCREASE_PER_10));

    // Actualizar dirección cuando cambia nextDirection
    setDirection(nextDirection);
    directionRef.current = nextDirection;

    intervalRef.current = setInterval(() => {
      const currentSnake = snakeRef.current;
      const currentFood = foodRef.current;
      const currentDirection = directionRef.current;
      const currentScore = scoreRef.current; // Usar ref para score actualizado

      const head = currentSnake[0];
      
      // Validar y corregir cabeza actual si está fuera del grid
      let validHeadX = Math.max(0, Math.min(head.x, GRID_SIZE - 1));
      let validHeadY = Math.max(0, Math.min(head.y, GRID_SIZE - 1));
      
      // Si la cabeza estaba fuera, corregir toda la serpiente
      if (head.x !== validHeadX || head.y !== validHeadY) {
        const correctedSnake = currentSnake.map((segment, idx) => ({
          x: Math.max(0, Math.min(segment.x, GRID_SIZE - 1)),
          y: Math.max(0, Math.min(segment.y, GRID_SIZE - 1))
        }));
        snakeRef.current = correctedSnake;
        setSnake(correctedSnake);
        return;
      }
      
      // Calcular nueva cabeza
      const newHeadX = head.x + currentDirection.x;
      const newHeadY = head.y + currentDirection.y;
      
      // Verificar que la nueva posición esté dentro del grid - GAME OVER si intenta salirse
      if (newHeadX < 0 || newHeadX >= GRID_SIZE || newHeadY < 0 || newHeadY >= GRID_SIZE) {
        // Guardar longitud de la serpiente antes de game over
        savedSnakeLengthRef.current = currentSnake.length;
        setGameOver(true);
        setGameActive(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        return;
      }
      
      const newHead: Position = {
        x: newHeadX,
        y: newHeadY
      };

      // Verificar colisión consigo misma
      if (currentSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        // Guardar longitud de la serpiente antes de game over
        savedSnakeLengthRef.current = currentSnake.length;
        setGameOver(true);
        setGameActive(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        return;
      }

      // Crear nuevo cuerpo de la serpiente
      const newSnake = [newHead, ...currentSnake];

      // Validar y corregir todas las posiciones para asegurar que estén dentro del grid
      const validSnake = newSnake.map(segment => ({
        x: Math.max(0, Math.min(segment.x, GRID_SIZE - 1)),
        y: Math.max(0, Math.min(segment.y, GRID_SIZE - 1))
      }));

      // Verificar si comió la comida
      if (newHead.x === currentFood.x && newHead.y === currentFood.y) {
        // Calcular nuevo score
        const newScore = currentScore + 10;
        const blocksOf10 = Math.floor(newScore / 10);
        
        setScore(newScore);
        scoreRef.current = newScore; // Actualizar ref también
        generateFood(validSnake);
        
        // Crecer normalmente (no eliminar la cola)
        // Además, añadir 1 bloque adicional si estamos en un bloque de 10 puntos o más
        if (blocksOf10 > 0) {
          const tail = validSnake[validSnake.length - 1];
          if (tail) {
            validSnake.push({ ...tail }); // Añadir 1 bloque adicional por cada bola cuando está en bloque de 10
          }
        }
      } else {
        // Eliminar la cola (no crecer)
        validSnake.pop();
      }

      setSnake(validSnake);
      snakeRef.current = validSnake;
    }, currentSpeed); // Usar velocidad calculada dinámicamente

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [gameActive, gameOver, gameStarted, nextDirection, score]); // Agregar score y gameStarted a dependencias

  // Manejar click para cerrar
  const handleClick = () => {
    setGameActive(false);
    setGameOver(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] cursor-pointer"
      onClick={handleClick}
      tabIndex={-1}
    >
      {/* Fondo blur oscuro */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-all duration-500" />
      
      {/* Contenedor del juego */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Score */}
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-10 bg-black/80 text-white px-4 py-2 rounded-lg border border-white/20">
            <p className="text-sm font-mono">Score: {score}</p>
          </div>

          {/* Game Over */}
          {gameOver && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70 rounded-lg">
              <div className="text-center text-white">
                <h2 className="text-3xl font-bold mb-4 animate-bounce">💀 Game Over</h2>
                <p className="text-xl mb-2">Score Final: {score}</p>
                <p className="text-sm opacity-75">Click para cerrar</p>
              </div>
            </div>
          )}

          {/* Tablero del juego */}
          <div 
            className="bg-gray-900/90 border-2 border-white/20 rounded-lg p-4 shadow-2xl"
            style={{
              width: `${GRID_SIZE * CELL_SIZE}px`,
              height: `${GRID_SIZE * CELL_SIZE}px`,
              minWidth: `${GRID_SIZE * CELL_SIZE}px`,
              minHeight: `${GRID_SIZE * CELL_SIZE}px`,
              boxSizing: 'content-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grid - Contenedor interno con tamaño exacto */}
            <div 
              className="relative"
              style={{
                width: `${GRID_SIZE * CELL_SIZE}px`,
                height: `${GRID_SIZE * CELL_SIZE}px`
              }}
            >
              {/* Comida */}
              {food.x >= 0 && food.x < GRID_SIZE && food.y >= 0 && food.y < GRID_SIZE && (
                <div
                  className="absolute bg-red-500 rounded-full shadow-lg"
                  style={{
                    left: `${food.x * CELL_SIZE + 1}px`, // +1 para centrar dentro de la celda
                    top: `${food.y * CELL_SIZE + 1}px`, // +1 para centrar dentro de la celda
                    width: `${CELL_SIZE - 2}px`,
                    height: `${CELL_SIZE - 2}px`,
                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)'
                  }}
                />
              )}

              {/* Serpiente */}
              {snake.map((segment, index) => {
                // Validar que el segmento esté dentro del grid antes de renderizar
                const validX = Math.max(0, Math.min(segment.x, GRID_SIZE - 1));
                const validY = Math.max(0, Math.min(segment.y, GRID_SIZE - 1));
                
                return (
                  <div
                    key={index}
                    className={`absolute rounded-sm ${
                      index === 0 
                        ? 'bg-green-400' 
                        : 'bg-green-500'
                    }`}
                    style={{
                      left: `${validX * CELL_SIZE + 1}px`, // +1 para centrar dentro de la celda
                      top: `${validY * CELL_SIZE + 1}px`, // +1 para centrar dentro de la celda
                      width: `${CELL_SIZE - 2}px`,
                      height: `${CELL_SIZE - 2}px`,
                      boxShadow: index === 0 
                        ? '0 0 10px rgba(74, 222, 128, 0.8)' 
                        : 'none'
                    }}
                  >
                    {/* Ojos en la cabeza */}
                    {index === 0 && (
                      <>
                        <div
                          className="absolute bg-black rounded-full"
                          style={{
                            left: direction.x === 1 ? '12px' : direction.x === -1 ? '2px' : '6px',
                            top: direction.y === 1 ? '12px' : direction.y === -1 ? '2px' : '6px',
                            width: '4px',
                            height: '4px'
                          }}
                        />
                        <div
                          className="absolute bg-black rounded-full"
                          style={{
                            left: direction.x === 1 ? '12px' : direction.x === -1 ? '2px' : '12px',
                            top: direction.y === 1 ? '12px' : direction.y === -1 ? '2px' : '6px',
                            width: '4px',
                            height: '4px'
                          }}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instrucciones */}
          {!gameOver && (
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 z-10 bg-black/80 text-white px-4 py-2 rounded-lg border border-white/20 text-xs text-center">
              {!gameStarted ? (
                <p className="animate-pulse">Presiona una flecha o WASD para comenzar</p>
              ) : (
                <p>Flechas o WASD para mover | Click para cerrar</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SnakeEasterEgg;
