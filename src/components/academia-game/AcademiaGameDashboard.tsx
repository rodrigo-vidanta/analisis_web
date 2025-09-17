import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';

interface PlayerStats {
  level: number;
  experience: number;
  currentHP: number;
  maxHP: number;
  knowledge: number;      // Conocimiento del producto
  charisma: number;       // Carisma y persuasión  
  confidence: number;     // Confianza en ventas
  objectionHandling: number; // Manejo de objeciones
  storytelling: number;   // Narrativa y storytelling
}

interface ArmorPiece {
  id: string;
  name: string;
  type: 'helmet' | 'chest' | 'gloves' | 'boots' | 'shield' | 'weapon';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  statBonus: { [key: string]: number };
  description: string;
  imageUrl: string;
}

interface DailyQuest {
  id: string;
  type: 'knowledge' | 'objection' | 'storytelling' | 'product';
  title: string;
  description: string;
  xpReward: number;
  statBonus: { [key: string]: number };
  isCompleted: boolean;
  timeLimit?: number;
}

const AcademiaGameDashboard: React.FC = () => {
  const { isLinearTheme } = useTheme();
  const { user } = useAuth();
  
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    level: 5,
    experience: 1250,
    currentHP: 85,
    maxHP: 100,
    knowledge: 75,
    charisma: 60,
    confidence: 80,
    objectionHandling: 45,
    storytelling: 55
  });

  const [equippedArmor, setEquippedArmor] = useState<{ [key: string]: ArmorPiece | null }>({
    helmet: {
      id: 'basic_helmet',
      name: 'Casco de Conocimiento',
      type: 'helmet',
      rarity: 'common',
      statBonus: { knowledge: 10 },
      description: 'Aumenta tu conocimiento del producto',
      imageUrl: '/game-assets/armor/helmet_basic.png'
    },
    chest: null,
    gloves: null,
    boots: null,
    shield: null,
    weapon: null
  });

  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([
    {
      id: 'daily_1',
      type: 'knowledge',
      title: 'Maestro de Resorts',
      description: 'Responde correctamente 10 preguntas sobre Vidanta',
      xpReward: 50,
      statBonus: { knowledge: 5 },
      isCompleted: false,
      timeLimit: 15
    },
    {
      id: 'daily_2', 
      type: 'objection',
      title: 'Destructor de Objeciones',
      description: 'Maneja 5 objeciones comunes perfectamente',
      xpReward: 75,
      statBonus: { objectionHandling: 8 },
      isCompleted: true,
      timeLimit: 20
    },
    {
      id: 'daily_3',
      type: 'storytelling',
      title: 'Narrador Épico',
      description: 'Crea 3 historias convincentes sobre beneficios',
      xpReward: 60,
      statBonus: { storytelling: 6 },
      isCompleted: false,
      timeLimit: 25
    }
  ]);

  const [nextBoss, setNextBoss] = useState({
    name: 'Cliente Escéptico',
    difficulty: 3,
    description: 'Un cliente que ha tenido malas experiencias y no confía fácilmente',
    requiredLevel: 5,
    rewards: ['Peto de Persuasión', '100 XP', 'Gema de Confianza']
  });

  const getStatColor = (value: number): string => {
    if (value >= 80) return 'text-emerald-500';
    if (value >= 60) return 'text-yellow-500';
    if (value >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'common': return 'border-gray-400 bg-gray-100';
      case 'rare': return 'border-blue-400 bg-blue-100';
      case 'epic': return 'border-purple-400 bg-purple-100';
      case 'legendary': return 'border-yellow-400 bg-yellow-100';
      default: return 'border-gray-400 bg-gray-100';
    }
  };

  const StatBar: React.FC<{ label: string; value: number; maxValue?: number }> = ({ 
    label, 
    value, 
    maxValue = 100 
  }) => (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className={`text-sm font-medium ${
          isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-indigo-700 dark:text-indigo-300'
        }`}>
          {label}
        </span>
        <span className={`text-sm font-bold ${getStatColor(value)}`}>
          {value}/{maxValue}
        </span>
      </div>
      <div className={`w-full h-2 rounded-full ${
        isLinearTheme ? 'bg-slate-200 dark:bg-slate-700' : 'bg-indigo-200 dark:bg-slate-700'
      }`}>
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${getStatColor(value)} bg-current`}
          style={{ width: `${(value / maxValue) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${
      isLinearTheme 
        ? 'bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800'
        : 'bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900'
    } transition-colors duration-300`}>
      
      {/* Header Épico */}
      <header className={`relative overflow-hidden ${
        isLinearTheme 
          ? 'bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-700'
          : 'bg-gradient-to-r from-purple-800/90 to-indigo-800/90 border-b border-purple-700'
      } backdrop-blur-lg`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            
            {/* Logo y Título Épico */}
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                isLinearTheme 
                  ? 'bg-gradient-to-br from-slate-600 to-slate-700'
                  : 'bg-gradient-to-br from-yellow-400 to-orange-500'
              } shadow-xl animate-pulse`}>
                <span className="text-2xl">⚔️</span>
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${
                  isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
                } drop-shadow-lg`}>
                  Academia Game
                </h1>
                <p className={`text-lg ${
                  isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-purple-200'
                }`}>
                  Aventura RPG de Ventas
                </p>
              </div>
            </div>

            {/* Stats Rápidas */}
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
                }`}>
                  {playerStats.level}
                </div>
                <div className={`text-sm ${
                  isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-purple-200'
                }`}>
                  Nivel
                </div>
              </div>
              
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
                }`}>
                  {playerStats.experience}
                </div>
                <div className={`text-sm ${
                  isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-purple-200'
                }`}>
                  XP
                </div>
              </div>

              <div className="text-center">
                <div className={`text-2xl font-bold ${getStatColor(playerStats.currentHP)}`}>
                  {playerStats.currentHP}
                </div>
                <div className={`text-sm ${
                  isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-purple-200'
                }`}>
                  HP
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Panel Izquierdo - Personaje y Stats */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Character Display */}
            <div className={`p-6 rounded-2xl ${
              isLinearTheme 
                ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                : 'bg-gradient-to-br from-purple-800/50 to-indigo-800/50 border border-purple-600'
            } backdrop-blur-lg shadow-xl`}>
              <h3 className={`text-xl font-bold mb-4 ${
                isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
              }`}>
                Tu Vendedor Épico
              </h3>
              
              {/* Character Sprite Placeholder */}
              <div className="text-center mb-6">
                <div className={`w-32 h-32 mx-auto rounded-2xl flex items-center justify-center ${
                  isLinearTheme 
                    ? 'bg-slate-100 dark:bg-slate-700'
                    : 'bg-gradient-to-br from-yellow-400 to-orange-500'
                } shadow-lg animate-bounce`}>
                  <span className="text-4xl">🦸‍♂️</span>
                </div>
                <p className={`mt-3 font-bold ${
                  isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
                }`}>
                  {user?.first_name} el Vendedor
                </p>
              </div>

              {/* Stats */}
              <div className="space-y-3">
                <StatBar label="Conocimiento" value={playerStats.knowledge} />
                <StatBar label="Carisma" value={playerStats.charisma} />
                <StatBar label="Confianza" value={playerStats.confidence} />
                <StatBar label="Manejo Objeciones" value={playerStats.objectionHandling} />
                <StatBar label="Storytelling" value={playerStats.storytelling} />
              </div>
            </div>

            {/* Equipment Display */}
            <div className={`p-6 rounded-2xl ${
              isLinearTheme 
                ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                : 'bg-gradient-to-br from-indigo-800/50 to-purple-800/50 border border-indigo-600'
            } backdrop-blur-lg shadow-xl`}>
              <h3 className={`text-xl font-bold mb-4 ${
                isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
              }`}>
                Equipamiento
              </h3>
              
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(equippedArmor).map(([slot, armor]) => (
                  <div 
                    key={slot}
                    className={`aspect-square rounded-lg border-2 border-dashed flex items-center justify-center ${
                      armor 
                        ? `${getRarityColor(armor.rarity)} border-solid` 
                        : isLinearTheme 
                          ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                          : 'border-purple-400 bg-purple-800/20'
                    } transition-all duration-300 hover:scale-105 cursor-pointer`}
                  >
                    {armor ? (
                      <div className="text-center">
                        <div className="text-2xl mb-1">⚔️</div>
                        <div className="text-xs font-bold">{armor.name.split(' ')[0]}</div>
                      </div>
                    ) : (
                      <div className={`text-3xl ${
                        isLinearTheme ? 'text-slate-400' : 'text-purple-400'
                      }`}>
                        +
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel Central - Actividades y Quests */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Daily Quests */}
            <div className={`p-6 rounded-2xl ${
              isLinearTheme 
                ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                : 'bg-gradient-to-br from-emerald-800/50 to-green-800/50 border border-emerald-600'
            } backdrop-blur-lg shadow-xl`}>
              <h3 className={`text-2xl font-bold mb-6 ${
                isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
              }`}>
                🎯 Misiones Diarias
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dailyQuests.map((quest, index) => (
                  <div 
                    key={quest.id}
                    style={{ animationDelay: `${index * 0.1}s` }}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 cursor-pointer ${
                      quest.isCompleted
                        ? isLinearTheme
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600'
                          : 'bg-emerald-800/30 border-emerald-400'
                        : isLinearTheme
                          ? 'bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:border-slate-400'
                          : 'bg-purple-800/20 border-purple-400 hover:border-purple-300'
                    } animate-slide-up opacity-0`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          quest.isCompleted 
                            ? 'bg-emerald-500 text-white'
                            : isLinearTheme
                              ? 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                              : 'bg-purple-600 text-white'
                        }`}>
                          {quest.isCompleted ? '✓' : '⚡'}
                        </div>
                        <div>
                          <h4 className={`font-bold ${
                            isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
                          }`}>
                            {quest.title}
                          </h4>
                          <p className={`text-sm ${
                            isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-purple-200'
                          }`}>
                            {quest.description}
                          </p>
                        </div>
                      </div>
                      
                      {quest.timeLimit && !quest.isCompleted && (
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          isLinearTheme 
                            ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                            : 'bg-orange-500/20 text-orange-300'
                        }`}>
                          {quest.timeLimit}min
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className={`text-sm ${
                        isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-purple-200'
                      }`}>
                        +{quest.xpReward} XP
                      </div>
                      <button 
                        disabled={quest.isCompleted}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                          quest.isCompleted
                            ? isLinearTheme
                              ? 'bg-emerald-500 text-white cursor-default'
                              : 'bg-emerald-600 text-white cursor-default'
                            : isLinearTheme
                              ? 'bg-slate-600 hover:bg-slate-700 text-white hover:scale-105'
                              : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white hover:scale-105'
                        }`}
                      >
                        {quest.isCompleted ? 'Completada' : 'Iniciar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Boss Battle */}
            <div className={`p-6 rounded-2xl ${
              isLinearTheme 
                ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                : 'bg-gradient-to-br from-red-800/50 to-orange-800/50 border border-red-600'
            } backdrop-blur-lg shadow-xl relative overflow-hidden`}>
              
              {/* Efecto de resplandor */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent animate-pulse"></div>
              
              <div className="relative">
                <h3 className={`text-2xl font-bold mb-4 ${
                  isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
                }`}>
                  👹 Próximo Boss Battle
                </h3>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                      isLinearTheme 
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : 'bg-gradient-to-br from-red-500 to-red-600'
                    } shadow-lg animate-bounce`}>
                      <span className="text-2xl">👹</span>
                    </div>
                    <div>
                      <h4 className={`text-xl font-bold ${
                        isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
                      }`}>
                        {nextBoss.name}
                      </h4>
                      <p className={`text-sm ${
                        isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-red-200'
                      }`}>
                        {nextBoss.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          isLinearTheme 
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          Dificultad: {nextBoss.difficulty}/10
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          isLinearTheme 
                            ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          Nivel {nextBoss.requiredLevel} requerido
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button className={`px-6 py-3 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-110 ${
                    playerStats.level >= nextBoss.requiredLevel
                      ? isLinearTheme
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl'
                        : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl'
                      : isLinearTheme
                        ? 'bg-slate-400 text-slate-600 cursor-not-allowed'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}>
                    {playerStats.level >= nextBoss.requiredLevel ? '⚔️ ¡BATALLA!' : '🔒 Bloqueado'}
                  </button>
                </div>

                {/* Recompensas */}
                <div className="mt-4">
                  <p className={`text-sm font-semibold mb-2 ${
                    isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-red-200'
                  }`}>
                    Recompensas por victoria:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {nextBoss.rewards.map((reward, index) => (
                      <span 
                        key={index}
                        className={`text-xs px-2 py-1 rounded-full ${
                          isLinearTheme 
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                            : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        }`}
                      >
                        {reward}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6">
        <button className={`w-16 h-16 rounded-full shadow-xl transition-all duration-300 hover:scale-110 ${
          isLinearTheme 
            ? 'bg-slate-600 hover:bg-slate-700 text-white'
            : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white'
        } animate-pulse`}>
          <span className="text-2xl">🎮</span>
        </button>
      </div>

      {/* Estilos CSS personalizados */}
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AcademiaGameDashboard;
