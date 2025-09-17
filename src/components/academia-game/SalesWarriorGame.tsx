import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { WoodPanel, MetalButton, HealthBar, CharacterPortrait, ProgressOrb, BossCard, ItemIcon } from './GameAssets';

interface GameState {
  player: {
    name: string;
    level: number;
    health: number;
    maxHealth: number;
    experience: number;
    nextLevelXP: number;
    stats: {
      knowledge: number;
      charisma: number;
      confidence: number;
      objectionHandling: number;
      storytelling: number;
    };
    equipment: {
      helmet: any;
      chest: any;
      gloves: any;
      boots: any;
      shield: any;
      weapon: any;
    };
    gold: number;
    streak: number;
  };
  bosses: any[];
  currentView: 'main' | 'battle' | 'inventory' | 'shop';
}

const SalesWarriorGame: React.FC = () => {
  const { user } = useAuth();
  
  const [gameState, setGameState] = useState<GameState>({
    player: {
      name: user?.first_name || 'Guerrero',
      level: 8,
      health: 85,
      maxHealth: 100,
      experience: 2150,
      nextLevelXP: 2500,
      stats: {
        knowledge: 78,
        charisma: 65,
        confidence: 82,
        objectionHandling: 58,
        storytelling: 71
      },
      equipment: {
        helmet: {
          name: 'Corona Dorada del Saber',
          type: 'helmet',
          rarity: 'gold',
          statBonus: 15
        },
        chest: {
          name: 'Armadura Plateada de Persuasión',
          type: 'chest', 
          rarity: 'silver',
          statBonus: 12
        },
        gloves: null,
        boots: null,
        shield: null,
        weapon: null
      },
      gold: 1250,
      streak: 5
    },
    bosses: [
      {
        id: 'maria',
        name: 'María la Indecisa',
        title: 'Guardiana de las Dudas',
        difficulty: 2,
        health: 100,
        maxHealth: 100,
        isUnlocked: true,
        rewards: [{ name: 'Botas de Confianza Bronce', type: 'boots', rarity: 'bronze' }]
      },
      {
        id: 'roberto', 
        name: 'Roberto el Escéptico',
        title: 'Destructor de Argumentos',
        difficulty: 5,
        health: 80,
        maxHealth: 150,
        isUnlocked: true,
        rewards: [{ name: 'Guanteletes Anti-Objeciones', type: 'gloves', rarity: 'silver' }]
      },
      {
        id: 'kobayashi',
        name: 'El Kobayashi Maru', 
        title: 'Cliente Imposible',
        difficulty: 10,
        health: 200,
        maxHealth: 200,
        isUnlocked: false,
        rewards: [{ name: 'Espada Cristalina Épica', type: 'weapon', rarity: 'crystal' }]
      }
    ],
    currentView: 'main'
  });

  const handleBossBattle = (boss: any) => {
    console.log('🎮 Iniciando batalla con:', boss.name);
    // Aquí se integraría VAPI para la llamada real
    alert(`¡Iniciando batalla épica contra ${boss.name}!\n\nEsto se conectará con VAPI para una llamada real.`);
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{
        background: `
          linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%),
          radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)
        `
      }}
    >
      
      {/* Fondo animado con partículas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Header del juego */}
      <header className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo épico */}
          <div className="flex items-center space-x-4">
            <div 
              className="w-16 h-16 rounded-full border-4 border-yellow-400 flex items-center justify-center relative"
              style={{
                background: 'radial-gradient(circle, #ff6b6b 0%, #ee5a24 50%, #c23616 100%)',
                boxShadow: '0 0 20px rgba(255, 107, 107, 0.6), inset 0 2px 4px rgba(255,255,255,0.3)'
              }}
            >
              <span className="text-3xl animate-bounce">⚔️</span>
              <div className="absolute -inset-1 rounded-full border-2 border-yellow-300 animate-ping opacity-30"></div>
            </div>
            
            <div>
              <h1 
                className="text-4xl font-black text-white"
                style={{ 
                  textShadow: '3px 3px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 1px 1px 0px #000'
                }}
              >
                SALES WARRIOR
              </h1>
              <p className="text-lg font-bold text-yellow-300">
                ¡Conviértete en Leyenda de Ventas!
              </p>
            </div>
          </div>

          {/* Stats header */}
          <div className="flex items-center space-x-4">
            <ProgressOrb value={gameState.player.level} maxValue={50} label="NIVEL" color="green" />
            <ProgressOrb value={gameState.player.health} maxValue={gameState.player.maxHealth} label="HP" color="red" />
            <ProgressOrb value={gameState.player.experience} maxValue={gameState.player.nextLevelXP} label="XP" color="blue" />
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Panel del personaje */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* Character display */}
            <WoodPanel>
              <div className="text-center">
                <h3 className="text-xl font-black text-yellow-100 mb-4">
                  🦸‍♂️ {gameState.player.name.toUpperCase()} EL GUERRERO
                </h3>
                
                <div className="flex justify-center mb-4">
                  <CharacterPortrait 
                    character={gameState.player}
                    size="lg"
                    showArmor={true}
                  />
                </div>
                
                {/* Equipment slots */}
                <div className="grid grid-cols-3 gap-2">
                  <div></div>
                  <ItemIcon item={gameState.player.equipment.helmet} />
                  <div></div>
                  
                  <ItemIcon item={gameState.player.equipment.shield} />
                  <ItemIcon item={gameState.player.equipment.chest} />
                  <ItemIcon item={gameState.player.equipment.weapon} />
                  
                  <div></div>
                  <ItemIcon item={gameState.player.equipment.gloves} />
                  <div></div>
                  
                  <div></div>
                  <ItemIcon item={gameState.player.equipment.boots} />
                  <div></div>
                </div>
              </div>
            </WoodPanel>

            {/* Stats panel */}
            <WoodPanel>
              <h3 className="text-lg font-black text-yellow-100 mb-4 text-center">
                📊 PODER DE VENTAS
              </h3>
              
              <div className="space-y-3">
                {[
                  { name: 'Conocimiento', value: gameState.player.stats.knowledge, color: 'blue' as const },
                  { name: 'Carisma', value: gameState.player.stats.charisma, color: 'purple' as const },
                  { name: 'Confianza', value: gameState.player.stats.confidence, color: 'green' as const },
                  { name: 'Anti-Objeciones', value: gameState.player.stats.objectionHandling, color: 'yellow' as const },
                  { name: 'Storytelling', value: gameState.player.stats.storytelling, color: 'red' as const }
                ].map((stat) => (
                  <HealthBar
                    key={stat.name}
                    current={stat.value}
                    max={100}
                    label={stat.name}
                    color={stat.color}
                  />
                ))}
              </div>
            </WoodPanel>
          </div>

          {/* Arena de batallas */}
          <div className="lg:col-span-2">
            <WoodPanel className="mb-4">
              <h2 className="text-3xl font-black text-yellow-100 text-center mb-6">
                ⚔️ ARENA DE BATALLAS
              </h2>
              
              <div className="space-y-4">
                {gameState.bosses.map((boss) => (
                  <BossCard
                    key={boss.id}
                    boss={boss}
                    onBattle={() => handleBossBattle(boss)}
                    isUnlocked={boss.isUnlocked}
                  />
                ))}
              </div>
            </WoodPanel>
          </div>

          {/* Panel de acciones */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* Achievements */}
            <WoodPanel>
              <h3 className="text-lg font-black text-yellow-100 mb-4 text-center">
                🏆 LOGROS
              </h3>
              
              <div className="space-y-2">
                <div 
                  className="p-3 rounded-lg border-2 border-yellow-600"
                  style={{
                    background: 'linear-gradient(145deg, #ff9500 0%, #ff6b35 100%)'
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">🔥</span>
                    <div>
                      <div className="font-bold text-white text-sm">Racha de Fuego</div>
                      <div className="text-xs text-orange-100">{gameState.player.streak} días</div>
                    </div>
                  </div>
                </div>
                
                <div 
                  className="p-3 rounded-lg border-2 border-green-600"
                  style={{
                    background: 'linear-gradient(145deg, #00b894 0%, #00a085 100%)'
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">👹</span>
                    <div>
                      <div className="font-bold text-white text-sm">Destructor de Jefes</div>
                      <div className="text-xs text-green-100">3 derrotados</div>
                    </div>
                  </div>
                </div>
              </div>
            </WoodPanel>

            {/* Action buttons */}
            <div className="space-y-3">
              <MetalButton variant="purple" size="lg" onClick={() => setGameState(prev => ({ ...prev, currentView: 'inventory' }))}>
                🎒 INVENTARIO
              </MetalButton>
              
              <MetalButton variant="yellow" size="lg">
                🏪 TIENDA ÉPICA
              </MetalButton>
              
              <MetalButton variant="green" size="lg">
                🎯 MISIONES DIARIAS
              </MetalButton>
              
              <MetalButton variant="blue" size="lg">
                📊 ESTADÍSTICAS
              </MetalButton>
            </div>

            {/* Gold display */}
            <WoodPanel>
              <div className="text-center">
                <div 
                  className="w-12 h-12 mx-auto rounded-full border-3 border-yellow-600 flex items-center justify-center mb-2"
                  style={{
                    background: 'radial-gradient(circle, #ffd700 0%, #ffb347 100%)',
                    boxShadow: '0 0 15px rgba(255, 215, 0, 0.8)'
                  }}
                >
                  <span className="text-xl">💰</span>
                </div>
                <div className="font-black text-yellow-100">
                  {gameState.player.gold.toLocaleString()} ORO
                </div>
              </div>
            </WoodPanel>
          </div>
        </div>
      </main>

      {/* Footer con controles */}
      <footer className="relative z-10 p-4 mt-8">
        <div className="max-w-7xl mx-auto">
          <WoodPanel>
            <div className="flex items-center justify-between">
              <div className="text-yellow-100">
                <span className="font-bold">💡 Tip:</span> Derrota jefes para ganar armadura épica. ¡2 derrotas consecutivas y pierdes tu última pieza!
              </div>
              
              <div className="flex space-x-2">
                <MetalButton variant="blue" size="sm">
                  ⚙️ OPCIONES
                </MetalButton>
                <MetalButton variant="red" size="sm">
                  🚪 SALIR
                </MetalButton>
              </div>
            </div>
          </WoodPanel>
        </div>
      </footer>

      {/* Efectos de partículas doradas */}
      <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-30"></div>
      <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-purple-400 rounded-full animate-ping opacity-30 delay-1000"></div>
      <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-30 delay-2000"></div>
    </div>
  );
};

export default SalesWarriorGame;
