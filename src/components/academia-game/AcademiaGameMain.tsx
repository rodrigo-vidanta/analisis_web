import React, { useState, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import GameEngine from './GameEngine';

interface PlayerData {
  level: number;
  experience: number;
  hp: number;
  maxHP: number;
  stats: {
    knowledge: number;
    charisma: number;
    confidence: number;
    objectionHandling: number;
    storytelling: number;
  };
  equipment: {
    helmet: string | null;
    chest: string | null;
    gloves: string | null;
    boots: string | null;
    shield: string | null;
    weapon: string | null;
  };
  achievements: string[];
  currentQuest: string | null;
}

const AcademiaGameMain: React.FC = () => {
  const { isLinearTheme } = useTheme();
  const { user } = useAuth();
  const gameRef = useRef<Phaser.Game | null>(null);
  const [gameLoaded, setGameLoaded] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [playerData, setPlayerData] = useState<PlayerData>({
    level: 5,
    experience: 1250,
    hp: 85,
    maxHP: 100,
    stats: {
      knowledge: 75,
      charisma: 60,
      confidence: 80,
      objectionHandling: 45,
      storytelling: 55
    },
    equipment: {
      helmet: 'Casco de Conocimiento',
      chest: null,
      gloves: null,
      boots: null,
      shield: null,
      weapon: null
    },
    achievements: ['Primer Paso', 'Racha de Fuego'],
    currentQuest: 'Derrota al Cliente Escéptico'
  });

  const handleGameReady = (game: Phaser.Game) => {
    gameRef.current = game;
    setGameLoaded(true);
    console.log('🎮 Juego Phaser.js cargado correctamente');
  };

  const handleStartGame = () => {
    setShowGame(true);
  };

  const handleExitGame = () => {
    setShowGame(false);
  };

  if (showGame) {
    return (
      <div className="min-h-screen bg-slate-900 relative">
        {/* Header del juego */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExitGame}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                ← Salir del Juego
              </button>
              <h1 className="text-xl font-bold text-white">
                Academia Game - {user?.first_name} el Vendedor (Nivel {playerData.level})
              </h1>
            </div>
            
            <div className="flex items-center space-x-4 text-white">
              <div className="text-sm">
                <span className="text-green-400">HP:</span> {playerData.hp}/{playerData.maxHP}
              </div>
              <div className="text-sm">
                <span className="text-yellow-400">XP:</span> {playerData.experience}
              </div>
              <div className="text-sm">
                <span className="text-purple-400">Quest:</span> {playerData.currentQuest}
              </div>
            </div>
          </div>
        </div>

        {/* Canvas del juego */}
        <div className="pt-20 h-screen flex items-center justify-center">
          <GameEngine onGameReady={handleGameReady} />
        </div>

        {/* Controles del juego */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white text-sm">
              <div>
                <strong>Movimiento:</strong><br />
                WASD o Flechas
              </div>
              <div>
                <strong>Interactuar:</strong><br />
                Espacio
              </div>
              <div>
                <strong>Inventario:</strong><br />
                Tab
              </div>
              <div>
                <strong>Menú:</strong><br />
                Esc
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de inicio del juego
  return (
    <div className={`min-h-screen ${
      isLinearTheme 
        ? 'bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800'
        : 'bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900'
    } flex items-center justify-center p-4`}>
      
      <div className={`max-w-4xl w-full p-8 rounded-2xl ${
        isLinearTheme 
          ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
          : 'bg-gradient-to-br from-purple-800/50 to-indigo-800/50 border border-purple-600'
      } backdrop-blur-lg shadow-2xl text-center`}>
        
        {/* Logo épico */}
        <div className="mb-8">
          <div className={`w-24 h-24 mx-auto rounded-2xl flex items-center justify-center ${
            isLinearTheme 
              ? 'bg-gradient-to-br from-slate-600 to-slate-700'
              : 'bg-gradient-to-br from-yellow-400 to-orange-500'
          } shadow-xl animate-pulse mb-4`}>
            <span className="text-4xl">⚔️</span>
          </div>
          <h1 className={`text-4xl font-bold mb-2 ${
            isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
          } drop-shadow-lg`}>
            Academia Game
          </h1>
          <p className={`text-xl ${
            isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-purple-200'
          }`}>
            RPG de Ventas - Conviértete en un Vendedor Legendario
          </p>
        </div>

        {/* Información del personaje */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          
          {/* Stats del jugador */}
          <div className={`p-6 rounded-xl ${
            isLinearTheme 
              ? 'bg-slate-50 dark:bg-slate-700'
              : 'bg-purple-800/30'
          }`}>
            <h3 className={`text-xl font-bold mb-4 ${
              isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
            }`}>
              🦸‍♂️ Tu Héroe: {user?.first_name}
            </h3>
            <div className="space-y-2 text-left">
              <div className="flex justify-between">
                <span className={isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-purple-200'}>Nivel:</span>
                <span className={`font-bold ${isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'}`}>{playerData.level}</span>
              </div>
              <div className="flex justify-between">
                <span className={isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-purple-200'}>HP:</span>
                <span className={`font-bold text-green-500`}>{playerData.hp}/{playerData.maxHP}</span>
              </div>
              <div className="flex justify-between">
                <span className={isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-purple-200'}>XP:</span>
                <span className={`font-bold text-yellow-500`}>{playerData.experience}</span>
              </div>
              <div className="flex justify-between">
                <span className={isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-purple-200'}>Equipamiento:</span>
                <span className={`font-bold ${isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'}`}>
                  {Object.values(playerData.equipment).filter(Boolean).length}/6
                </span>
              </div>
            </div>
          </div>

          {/* Misión actual */}
          <div className={`p-6 rounded-xl ${
            isLinearTheme 
              ? 'bg-slate-50 dark:bg-slate-700'
              : 'bg-indigo-800/30'
          }`}>
            <h3 className={`text-xl font-bold mb-4 ${
              isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
            }`}>
              🎯 Misión Actual
            </h3>
            <div className="text-left">
              <p className={`mb-3 ${
                isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-indigo-200'
              }`}>
                {playerData.currentQuest}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-300'}>Progreso:</span>
                  <span className="text-yellow-500 font-bold">3/5</span>
                </div>
                <div className="flex justify-between">
                  <span className={isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-300'}>Recompensa:</span>
                  <span className="text-green-500 font-bold">Peto Épico</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Descripción del juego */}
        <div className="mb-8">
          <h3 className={`text-2xl font-bold mb-4 ${
            isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
          }`}>
            🎮 Aventura RPG de Ventas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className={`p-4 rounded-lg ${
              isLinearTheme ? 'bg-slate-100 dark:bg-slate-700' : 'bg-emerald-800/30'
            }`}>
              <div className="text-2xl mb-2">🗺️</div>
              <h4 className={`font-bold mb-2 ${isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'}`}>
                Explora el Mundo
              </h4>
              <p className={isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-emerald-200'}>
                Navega por la academia, encuentra NPCs, completa misiones diarias
              </p>
            </div>
            
            <div className={`p-4 rounded-lg ${
              isLinearTheme ? 'bg-slate-100 dark:bg-slate-700' : 'bg-red-800/30'
            }`}>
              <div className="text-2xl mb-2">⚔️</div>
              <h4 className={`font-bold mb-2 ${isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'}`}>
                Batalla con Clientes
              </h4>
              <p className={isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-red-200'}>
                Enfréntate a clientes reales usando VAPI, gana armadura épica
              </p>
            </div>
            
            <div className={`p-4 rounded-lg ${
              isLinearTheme ? 'bg-slate-100 dark:bg-slate-700' : 'bg-yellow-800/30'
            }`}>
              <div className="text-2xl mb-2">👑</div>
              <h4 className={`font-bold mb-2 ${isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'}`}>
                Conviértete en Leyenda
              </h4>
              <p className={isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-yellow-200'}>
                Desbloquea armaduras legendarias, mascotas épicas y títulos únicos
              </p>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="space-y-4">
          <button
            onClick={handleStartGame}
            className={`w-full py-4 px-8 rounded-xl font-bold text-xl transition-all duration-300 hover:scale-105 ${
              isLinearTheme 
                ? 'bg-slate-600 hover:bg-slate-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
            } animate-pulse`}
          >
            🎮 ¡INICIAR AVENTURA!
          </button>
          
          <div className="flex space-x-4">
            <button className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 hover:scale-105 ${
              isLinearTheme 
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300'
                : 'bg-purple-700/50 hover:bg-purple-600/50 text-purple-200 border border-purple-500'
            }`}>
              📊 Ver Estadísticas
            </button>
            
            <button className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 hover:scale-105 ${
              isLinearTheme 
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300'
                : 'bg-indigo-700/50 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500'
            }`}>
              🏪 Tienda de Mejoras
            </button>
            
            <button className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 hover:scale-105 ${
              isLinearTheme 
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300'
                : 'bg-yellow-700/50 hover:bg-yellow-600/50 text-yellow-200 border border-yellow-500'
            }`}>
              🏆 Logros
            </button>
          </div>
        </div>

        {/* Información del juego */}
        <div className="mt-8">
          <div className={`p-4 rounded-lg ${
            isLinearTheme ? 'bg-slate-100 dark:bg-slate-700' : 'bg-blue-800/30'
          }`}>
            <h4 className={`font-bold mb-2 ${isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'}`}>
              💡 Cómo Jugar
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-left">
              <div>
                <p className={`mb-2 ${isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-blue-200'}`}>
                  <strong>1. Explora:</strong> Muévete por el mundo con WASD o flechas
                </p>
                <p className={`mb-2 ${isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-blue-200'}`}>
                  <strong>2. Interactúa:</strong> Acércate a NPCs y presiona Espacio
                </p>
              </div>
              <div>
                <p className={`mb-2 ${isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-blue-200'}`}>
                  <strong>3. Batalla:</strong> Usa tus habilidades de venta en combate
                </p>
                <p className={`mb-2 ${isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-blue-200'}`}>
                  <strong>4. Progresa:</strong> Gana XP, sube de nivel, obtén armadura épica
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademiaGameMain;
