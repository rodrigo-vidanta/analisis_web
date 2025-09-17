import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';

interface PlayerCharacter {
  level: number;
  experience: number;
  health: number;
  maxHealth: number;
  
  // Stats de vendedor (0-100)
  knowledge: number;        // Conocimiento del producto
  charisma: number;         // Carisma y persuasión
  confidence: number;       // Confianza en ventas
  objectionHandling: number; // Manejo de objeciones
  storytelling: number;     // Narrativa y storytelling
  
  // Armadura equipada
  helmet: ArmorPiece | null;    // Conocimiento
  chest: ArmorPiece | null;     // Carisma
  gloves: ArmorPiece | null;    // Manejo de objeciones
  boots: ArmorPiece | null;     // Confianza
  shield: ArmorPiece | null;    // Defensa general
  weapon: ArmorPiece | null;    // Storytelling
  
  // Progreso
  currentStreak: number;
  bossesDefeated: number;
  armorPiecesLost: number;
  perfectBattles: number;
}

interface ArmorPiece {
  id: string;
  name: string;
  type: 'helmet' | 'chest' | 'gloves' | 'boots' | 'shield' | 'weapon';
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'crystal';
  statBonus: number;
  description: string;
  imageUrl: string;
  glowEffect: boolean;
}

interface BossEnemy {
  id: string;
  name: string;
  title: string;
  difficulty: number;
  health: number;
  maxHealth: number;
  description: string;
  vapiAssistantId: string;
  requiredLevel: number;
  rewards: ArmorPiece[];
  weaknesses: string[];
  isUnlocked: boolean;
  timesDefeated: number;
  timesFailed: number;
}

const AcademiaGamePvZ: React.FC = () => {
  const { isLinearTheme } = useTheme();
  const { user } = useAuth();
  
  const [player, setPlayer] = useState<PlayerCharacter>({
    level: 8,
    experience: 2150,
    health: 85,
    maxHealth: 100,
    knowledge: 78,
    charisma: 65,
    confidence: 82,
    objectionHandling: 58,
    storytelling: 71,
    helmet: {
      id: 'gold_knowledge_crown',
      name: 'Corona Dorada del Saber',
      type: 'helmet',
      rarity: 'gold',
      statBonus: 15,
      description: 'Aumenta tu conocimiento sobre todos los resorts Vidanta',
      imageUrl: '/game-assets/armor/gold_crown.png',
      glowEffect: true
    },
    chest: {
      id: 'silver_persuasion_armor',
      name: 'Armadura Plateada de Persuasión',
      type: 'chest',
      rarity: 'silver',
      statBonus: 12,
      description: 'Incrementa tu carisma natural y poder de convencimiento',
      imageUrl: '/game-assets/armor/silver_chest.png',
      glowEffect: false
    },
    gloves: null,
    boots: null,
    shield: null,
    weapon: null,
    currentStreak: 5,
    bossesDefeated: 3,
    armorPiecesLost: 1,
    perfectBattles: 2
  });

  const [availableBosses, setAvailableBosses] = useState<BossEnemy[]>([
    {
      id: 'boss_maria',
      name: 'María la Indecisa',
      title: 'Guardiana de las Dudas',
      difficulty: 2,
      health: 100,
      maxHealth: 100,
      description: 'Una madre de familia que no puede decidirse. Cada pregunta genera 3 más.',
      vapiAssistantId: 'asst_maria_indecisa_001',
      requiredLevel: 1,
      rewards: [
        {
          id: 'bronze_confidence_boots',
          name: 'Botas de Confianza Bronce',
          type: 'boots',
          rarity: 'bronze',
          statBonus: 8,
          description: 'Te dan firmeza para cerrar ventas',
          imageUrl: '/game-assets/armor/bronze_boots.png',
          glowEffect: false
        }
      ],
      weaknesses: ['Paciencia', 'Explicaciones claras', 'Testimonios'],
      isUnlocked: true,
      timesDefeated: 1,
      timesFailed: 0
    },
    {
      id: 'boss_roberto',
      name: 'Roberto el Escéptico',
      title: 'Destructor de Argumentos',
      difficulty: 5,
      health: 80,
      maxHealth: 150,
      description: 'Empresario que ha escuchado todas las promesas. Destruye argumentos débiles.',
      vapiAssistantId: 'asst_roberto_esceptico_002',
      requiredLevel: 5,
      rewards: [
        {
          id: 'silver_objection_gloves',
          name: 'Guanteletes Plateados Anti-Objeciones',
          type: 'gloves',
          rarity: 'silver',
          statBonus: 18,
          description: 'Neutralizan cualquier objeción con elegancia',
          imageUrl: '/game-assets/armor/silver_gloves.png',
          glowEffect: true
        }
      ],
      weaknesses: ['Datos concretos', 'ROI claro', 'Exclusividad'],
      isUnlocked: true,
      timesDefeated: 1,
      timesFailed: 1
    },
    {
      id: 'boss_kobayashi',
      name: 'El Kobayashi Maru',
      title: 'Cliente Imposible Definitivo',
      difficulty: 10,
      health: 200,
      maxHealth: 200,
      description: 'El cliente que nunca ha comprado nada. Diseñado para ser imposible.',
      vapiAssistantId: 'asst_kobayashi_maru_final',
      requiredLevel: 25,
      rewards: [
        {
          id: 'crystal_storytelling_sword',
          name: 'Espada Cristalina del Storytelling Épico',
          type: 'weapon',
          rarity: 'crystal',
          statBonus: 50,
          description: 'El arma definitiva. Convierte cualquier historia en épica.',
          imageUrl: '/game-assets/armor/crystal_sword.png',
          glowEffect: true
        }
      ],
      weaknesses: ['???', '???', '???'],
      isUnlocked: false,
      timesDefeated: 0,
      timesFailed: 0
    }
  ]);

  const [selectedBoss, setSelectedBoss] = useState<BossEnemy | null>(null);
  const [showBattlePrep, setShowBattlePrep] = useState(false);
  const [showInventory, setShowInventory] = useState(false);

  const getRarityColor = (rarity: string): string => {
    const colors = {
      bronze: 'from-amber-600 to-orange-700',
      silver: 'from-slate-400 to-slate-600', 
      gold: 'from-yellow-400 to-yellow-600',
      platinum: 'from-purple-400 to-indigo-600',
      diamond: 'from-cyan-400 to-blue-600',
      crystal: 'from-pink-400 to-purple-600'
    };
    return colors[rarity as keyof typeof colors] || colors.bronze;
  };

  const getStatColor = (value: number): string => {
    if (value >= 80) return 'text-emerald-500';
    if (value >= 60) return 'text-yellow-500';
    if (value >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const calculateTotalStats = (): PlayerCharacter => {
    let bonusStats = {
      knowledge: 0,
      charisma: 0,
      confidence: 0,
      objectionHandling: 0,
      storytelling: 0
    };

    // Sumar bonuses de armadura equipada
    if (player.helmet) bonusStats.knowledge += player.helmet.statBonus;
    if (player.chest) bonusStats.charisma += player.chest.statBonus;
    if (player.gloves) bonusStats.objectionHandling += player.gloves.statBonus;
    if (player.boots) bonusStats.confidence += player.boots.statBonus;
    if (player.weapon) bonusStats.storytelling += player.weapon.statBonus;

    return {
      ...player,
      knowledge: Math.min(100, player.knowledge + bonusStats.knowledge),
      charisma: Math.min(100, player.charisma + bonusStats.charisma),
      confidence: Math.min(100, player.confidence + bonusStats.confidence),
      objectionHandling: Math.min(100, player.objectionHandling + bonusStats.objectionHandling),
      storytelling: Math.min(100, player.storytelling + bonusStats.storytelling)
    };
  };

  const startBossBattle = (boss: BossEnemy) => {
    if (player.level < boss.requiredLevel) {
      alert(`Necesitas nivel ${boss.requiredLevel} para enfrentar a ${boss.name}`);
      return;
    }
    
    setSelectedBoss(boss);
    setShowBattlePrep(true);
  };

  const finalStats = calculateTotalStats();

  return (
    <div className={`min-h-screen ${
      isLinearTheme 
        ? 'bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800'
        : 'bg-gradient-to-br from-green-400 via-blue-500 to-purple-600'
    } relative overflow-hidden`}>
      
      {/* Fondo decorativo estilo PvZ */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-400 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-purple-400 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-green-400 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Header estilo PvZ */}
      <header className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            
            {/* Logo y título estilo cartoon */}
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-white animate-bounce">
                <span className="text-3xl">⚔️</span>
              </div>
              <div>
                <h1 className="text-4xl font-black text-white drop-shadow-2xl" style={{
                  textShadow: '4px 4px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 1px 1px 0px #000'
                }}>
                  SALES WARRIOR
                </h1>
                <p className="text-xl font-bold text-yellow-300 drop-shadow-lg">
                  ¡Conviértete en Leyenda de Ventas!
                </p>
              </div>
            </div>

            {/* Stats del jugador estilo PvZ */}
            <div className="flex items-center space-x-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-2xl border-4 border-yellow-400">
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-3xl font-black text-green-600">{player.level}</div>
                    <div className="text-sm font-bold text-slate-600">NIVEL</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-red-500">{player.health}</div>
                    <div className="text-sm font-bold text-slate-600">HP</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-purple-600">{player.experience}</div>
                    <div className="text-sm font-bold text-slate-600">XP</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal estilo PvZ */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Panel del Personaje (Izquierda) */}
          <div className="lg:col-span-1">
            
            {/* Character Display estilo cartoon */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-2xl border-4 border-blue-400 mb-6">
              <h3 className="text-2xl font-black text-center text-blue-800 mb-4">
                🦸‍♂️ {user?.first_name} EL GUERRERO
              </h3>
              
              {/* Character visual con armadura */}
              <div className="relative">
                {/* Base character */}
                <div className="w-48 h-64 mx-auto bg-gradient-to-b from-blue-400 to-blue-600 rounded-3xl flex items-center justify-center relative overflow-hidden shadow-inner">
                  
                  {/* Character sprite */}
                  <div className="text-8xl animate-pulse">🧑‍💼</div>
                  
                  {/* Armadura overlay */}
                  {player.helmet && (
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                      <div className={`w-16 h-12 bg-gradient-to-br ${getRarityColor(player.helmet.rarity)} rounded-full flex items-center justify-center border-2 border-white shadow-lg ${player.helmet.glowEffect ? 'animate-pulse' : ''}`}>
                        <span className="text-2xl">👑</span>
                      </div>
                    </div>
                  )}
                  
                  {player.chest && (
                    <div className="absolute top-20 left-1/2 transform -translate-x-1/2">
                      <div className={`w-20 h-16 bg-gradient-to-br ${getRarityColor(player.chest.rarity)} rounded-xl flex items-center justify-center border-2 border-white shadow-lg ${player.chest.glowEffect ? 'animate-pulse' : ''}`}>
                        <span className="text-3xl">🛡️</span>
                      </div>
                    </div>
                  )}
                  
                  {player.weapon && (
                    <div className="absolute top-16 right-2">
                      <div className={`w-12 h-20 bg-gradient-to-br ${getRarityColor(player.weapon.rarity)} rounded-lg flex items-center justify-center border-2 border-white shadow-lg ${player.weapon.glowEffect ? 'animate-pulse' : ''}`}>
                        <span className="text-2xl">⚔️</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Efectos de poder */}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-yellow-400/20 animate-pulse"></div>
                </div>
                
                {/* Level badge */}
                <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center border-4 border-white shadow-xl">
                  <span className="text-lg font-black text-white">{player.level}</span>
                </div>
              </div>
            </div>

            {/* Stats Panel */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-2xl border-4 border-green-400">
              <h3 className="text-xl font-black text-center text-green-800 mb-4">
                📊 PODER DE VENTAS
              </h3>
              
              <div className="space-y-3">
                {[
                  { name: 'Conocimiento', value: finalStats.knowledge, icon: '🧠', color: 'blue' },
                  { name: 'Carisma', value: finalStats.charisma, icon: '✨', color: 'purple' },
                  { name: 'Confianza', value: finalStats.confidence, icon: '💪', color: 'green' },
                  { name: 'Anti-Objeciones', value: finalStats.objectionHandling, icon: '🛡️', color: 'orange' },
                  { name: 'Storytelling', value: finalStats.storytelling, icon: '📖', color: 'red' }
                ].map((stat) => (
                  <div key={stat.name} className="relative">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{stat.icon}</span>
                        <span className="font-bold text-slate-700">{stat.name}</span>
                      </div>
                      <span className={`font-black text-lg ${getStatColor(stat.value)}`}>
                        {stat.value}
                      </span>
                    </div>
                    <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden border-2 border-slate-300">
                      <div 
                        className={`h-full bg-gradient-to-r ${
                          stat.color === 'blue' ? 'from-blue-400 to-blue-600' :
                          stat.color === 'purple' ? 'from-purple-400 to-purple-600' :
                          stat.color === 'green' ? 'from-green-400 to-green-600' :
                          stat.color === 'orange' ? 'from-orange-400 to-orange-600' :
                          'from-red-400 to-red-600'
                        } transition-all duration-1000 shadow-inner`}
                        style={{ width: `${stat.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Arena de Batallas (Centro) */}
          <div className="lg:col-span-2">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-2xl border-4 border-red-400 mb-6">
              <h3 className="text-3xl font-black text-center text-red-800 mb-6">
                ⚔️ ARENA DE BATALLAS
              </h3>
              
              <div className="grid grid-cols-1 gap-6">
                {availableBosses.map((boss, index) => (
                  <div 
                    key={boss.id}
                    style={{ animationDelay: `${index * 0.2}s` }}
                    className={`relative p-6 rounded-2xl border-4 transition-all duration-300 hover:scale-105 cursor-pointer ${
                      boss.isUnlocked 
                        ? boss.difficulty <= 3
                          ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-400 hover:border-green-500'
                          : boss.difficulty <= 7
                          ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-400 hover:border-yellow-500'
                          : 'bg-gradient-to-r from-red-100 to-pink-100 border-red-400 hover:border-red-500'
                        : 'bg-slate-200 border-slate-400 opacity-60 cursor-not-allowed'
                    } animate-slide-up opacity-0`}
                    onClick={() => boss.isUnlocked && startBossBattle(boss)}
                  >
                    
                    {/* Boss portrait */}
                    <div className="flex items-center space-x-6">
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 border-white shadow-2xl ${
                        boss.difficulty <= 3 ? 'bg-gradient-to-br from-green-400 to-green-600' :
                        boss.difficulty <= 7 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                        'bg-gradient-to-br from-red-500 to-red-700'
                      } ${boss.isUnlocked ? 'animate-pulse' : ''}`}>
                        <span className="text-3xl">
                          {boss.difficulty <= 3 ? '😊' : boss.difficulty <= 7 ? '😤' : '👹'}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="text-2xl font-black text-slate-800 mb-1">
                          {boss.name}
                        </h4>
                        <p className="text-lg font-bold text-purple-600 mb-2">
                          {boss.title}
                        </p>
                        <p className="text-sm text-slate-600 mb-3">
                          {boss.description}
                        </p>
                        
                        {/* Boss stats */}
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <span className="text-red-500">❤️</span>
                            <span className="font-bold">{boss.health}/{boss.maxHealth}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-orange-500">⚡</span>
                            <span className="font-bold">Dificultad {boss.difficulty}/10</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-green-500">🏆</span>
                            <span className="font-bold">{boss.timesDefeated} victorias</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Battle button */}
                      <div className="text-center">
                        <button 
                          disabled={!boss.isUnlocked || player.level < boss.requiredLevel}
                          className={`px-8 py-4 rounded-2xl font-black text-xl transition-all duration-300 hover:scale-110 shadow-2xl ${
                            boss.isUnlocked && player.level >= boss.requiredLevel
                              ? boss.difficulty <= 3
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-4 border-green-300'
                                : boss.difficulty <= 7
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white border-4 border-yellow-300'
                                : 'bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white border-4 border-red-300'
                              : 'bg-slate-400 text-slate-600 border-4 border-slate-300 cursor-not-allowed'
                          }`}
                        >
                          {boss.isUnlocked && player.level >= boss.requiredLevel ? '⚔️ ¡BATALLA!' : '🔒 BLOQUEADO'}
                        </button>
                        
                        {boss.timesFailed > 0 && (
                          <div className="mt-2 text-xs bg-red-500/20 text-red-700 px-2 py-1 rounded-full">
                            ⚠️ {boss.timesFailed} derrota{boss.timesFailed > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rewards preview */}
                    <div className="mt-4 pt-4 border-t-2 border-slate-300">
                      <p className="text-sm font-bold text-slate-600 mb-2">🎁 Recompensas por victoria:</p>
                      <div className="flex flex-wrap gap-2">
                        {boss.rewards.map((reward) => (
                          <div 
                            key={reward.id}
                            className={`px-3 py-1 rounded-full text-xs font-bold border-2 bg-gradient-to-r ${getRarityColor(reward.rarity)} text-white shadow-lg`}
                          >
                            {reward.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel de Progreso (Derecha) */}
          <div className="lg:col-span-1">
            
            {/* Achievements */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-2xl border-4 border-purple-400 mb-6">
              <h3 className="text-xl font-black text-center text-purple-800 mb-4">
                🏆 LOGROS ÉPICOS
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-yellow-100 rounded-xl border-2 border-yellow-400">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <div className="font-bold text-yellow-800">Racha de Fuego</div>
                    <div className="text-sm text-yellow-600">{player.currentStreak} días consecutivos</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-emerald-100 rounded-xl border-2 border-emerald-400">
                  <span className="text-2xl">👹</span>
                  <div>
                    <div className="font-bold text-emerald-800">Destructor de Jefes</div>
                    <div className="text-sm text-emerald-600">{player.bossesDefeated} jefes derrotados</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-blue-100 rounded-xl border-2 border-blue-400">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <div className="font-bold text-blue-800">Batallas Perfectas</div>
                    <div className="text-sm text-blue-600">{player.perfectBattles} sin daño</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <button 
                onClick={() => setShowInventory(true)}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white font-black rounded-2xl shadow-2xl border-4 border-purple-300 transition-all duration-300 hover:scale-105"
              >
                🎒 INVENTARIO
              </button>
              
              <button className="w-full py-4 px-6 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-black rounded-2xl shadow-2xl border-4 border-yellow-300 transition-all duration-300 hover:scale-105">
                🏪 TIENDA ÉPICA
              </button>
              
              <button className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black rounded-2xl shadow-2xl border-4 border-green-300 transition-all duration-300 hover:scale-105">
                🎯 MISIONES DIARIAS
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Estilos CSS estilo PvZ */}
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.8s ease-out forwards;
        }
        
        /* Efectos de brillo para armadura legendaria */
        .legendary-glow {
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4);
          animation: legendary-pulse 2s ease-in-out infinite;
        }
        
        @keyframes legendary-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6); }
          50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.9), 0 0 60px rgba(255, 215, 0, 0.6); }
        }
      `}</style>
    </div>
  );
};

export default AcademiaGamePvZ;
