import React from 'react';

// Componentes de UI que simulan assets reales de videojuego
export const WoodPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div 
    className={`relative p-6 ${className}`}
    style={{
      background: `
        linear-gradient(145deg, #8B4513 0%, #A0522D 20%, #CD853F 40%, #DEB887 60%, #A0522D 80%, #8B4513 100%),
        radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%),
        radial-gradient(circle at 70% 70%, rgba(0,0,0,0.2) 0%, transparent 50%)
      `,
      border: '4px solid #654321',
      borderRadius: '12px',
      boxShadow: `
        inset 0 2px 4px rgba(255,255,255,0.3),
        inset 0 -2px 4px rgba(0,0,0,0.3),
        0 8px 16px rgba(0,0,0,0.4)
      `,
      textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
    }}
  >
    {/* Wood grain effect */}
    <div 
      className="absolute inset-0 opacity-20 rounded-lg"
      style={{
        background: `repeating-linear-gradient(
          90deg,
          transparent 0px,
          rgba(139, 69, 19, 0.3) 1px,
          rgba(139, 69, 19, 0.3) 2px,
          transparent 3px,
          transparent 8px
        )`
      }}
    />
    
    {/* Metal corners */}
    <div className="absolute top-1 left-1 w-3 h-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border border-yellow-700"></div>
    <div className="absolute top-1 right-1 w-3 h-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border border-yellow-700"></div>
    <div className="absolute bottom-1 left-1 w-3 h-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border border-yellow-700"></div>
    <div className="absolute bottom-1 right-1 w-3 h-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border border-yellow-700"></div>
    
    <div className="relative z-10">
      {children}
    </div>
  </div>
);

export const MetalButton: React.FC<{ 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean;
  variant?: 'green' | 'red' | 'blue' | 'yellow' | 'purple';
  size?: 'sm' | 'md' | 'lg';
}> = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'green',
  size = 'md'
}) => {
  const variants = {
    green: 'from-emerald-400 to-emerald-600 border-emerald-700 hover:from-emerald-500 hover:to-emerald-700',
    red: 'from-red-400 to-red-600 border-red-700 hover:from-red-500 hover:to-red-700',
    blue: 'from-blue-400 to-blue-600 border-blue-700 hover:from-blue-500 hover:to-blue-700',
    yellow: 'from-yellow-400 to-yellow-600 border-yellow-700 hover:from-yellow-500 hover:to-yellow-700',
    purple: 'from-purple-400 to-purple-600 border-purple-700 hover:from-purple-500 hover:to-purple-700'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative font-black text-white transition-all duration-200 
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
        ${sizes[size]}
      `}
      style={{
        background: disabled 
          ? 'linear-gradient(145deg, #666 0%, #888 50%, #666 100%)'
          : `linear-gradient(145deg, var(--tw-gradient-stops))`,
        border: '3px solid',
        borderRadius: '8px',
        boxShadow: disabled
          ? 'inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2)'
          : `
            inset 0 2px 4px rgba(255,255,255,0.4),
            inset 0 -2px 4px rgba(0,0,0,0.3),
            0 6px 12px rgba(0,0,0,0.3)
          `,
        textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
      }}
    >
      <div className={`${variants[variant]}`} style={{ background: 'inherit' }}>
        {children}
      </div>
      
      {/* Highlight effect */}
      {!disabled && (
        <div 
          className="absolute inset-0 rounded-md opacity-0 hover:opacity-100 transition-opacity duration-200"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)'
          }}
        />
      )}
    </button>
  );
};

export const HealthBar: React.FC<{ 
  current: number; 
  max: number; 
  label?: string;
  color?: 'red' | 'green' | 'blue' | 'yellow';
}> = ({ 
  current, 
  max, 
  label,
  color = 'red'
}) => {
  const percentage = (current / max) * 100;
  
  const colors = {
    red: 'from-red-500 to-red-700',
    green: 'from-green-500 to-green-700', 
    blue: 'from-blue-500 to-blue-700',
    yellow: 'from-yellow-500 to-yellow-700'
  };

  return (
    <div className="relative">
      {label && (
        <div className="text-sm font-bold text-white mb-1 drop-shadow-lg">
          {label}: {current}/{max}
        </div>
      )}
      
      {/* Outer frame */}
      <div 
        className="relative h-6 rounded-full border-3 border-yellow-600"
        style={{
          background: 'linear-gradient(145deg, #8B4513 0%, #A0522D 50%, #8B4513 100%)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)'
        }}
      >
        {/* Inner health */}
        <div 
          className={`absolute top-1 left-1 bottom-1 rounded-full bg-gradient-to-r ${colors[color]} transition-all duration-500`}
          style={{ 
            width: `calc(${percentage}% - 8px)`,
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.3)'
          }}
        />
        
        {/* Shine effect */}
        <div 
          className="absolute top-1 left-1 h-2 rounded-full bg-gradient-to-r from-white/40 to-transparent"
          style={{ width: `calc(${percentage}% - 8px)` }}
        />
      </div>
    </div>
  );
};

export const CharacterPortrait: React.FC<{
  character: any;
  size?: 'sm' | 'md' | 'lg';
  showArmor?: boolean;
}> = ({ character, size = 'md', showArmor = true }) => {
  const sizes = {
    sm: 'w-16 h-20',
    md: 'w-24 h-32', 
    lg: 'w-32 h-40'
  };

  return (
    <div className={`relative ${sizes[size]}`}>
      {/* Character base */}
      <div 
        className="w-full h-full rounded-2xl border-4 border-yellow-600 overflow-hidden"
        style={{
          background: `
            radial-gradient(circle at 30% 20%, #87CEEB 0%, #4682B4 50%, #191970 100%),
            linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)
          `,
          boxShadow: `
            inset 0 2px 4px rgba(255,255,255,0.3),
            inset 0 -2px 4px rgba(0,0,0,0.3),
            0 4px 8px rgba(0,0,0,0.4)
          `
        }}
      >
        {/* Character sprite area */}
        <div className="absolute inset-2 bg-gradient-to-b from-blue-300 to-blue-500 rounded-xl flex items-center justify-center">
          {/* Character base */}
          <div 
            className="w-12 h-16 rounded-lg"
            style={{
              background: 'linear-gradient(180deg, #FFE4B5 0%, #DEB887 50%, #D2B48C 100%)',
              border: '2px solid #8B4513'
            }}
          />
          
          {/* Armor overlays */}
          {showArmor && character.helmet && (
            <div 
              className="absolute top-1 w-8 h-6 rounded-t-lg"
              style={{
                background: 'linear-gradient(145deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                border: '1px solid #B8860B'
              }}
            />
          )}
          
          {showArmor && character.chest && (
            <div 
              className="absolute top-6 w-10 h-8 rounded-lg"
              style={{
                background: 'linear-gradient(145deg, #C0C0C0 0%, #A9A9A9 50%, #808080 100%)',
                border: '1px solid #696969'
              }}
            />
          )}
        </div>
        
        {/* Level badge */}
        <div 
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full border-2 border-yellow-400 flex items-center justify-center text-xs font-black text-white"
          style={{
            background: 'radial-gradient(circle, #FF6347 0%, #DC143C 100%)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}
        >
          {character.level}
        </div>
      </div>
    </div>
  );
};

export const ItemIcon: React.FC<{
  item: any;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}> = ({ item, size = 'md', onClick }) => {
  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  const rarityColors = {
    bronze: 'from-amber-600 to-orange-700 border-amber-800',
    silver: 'from-slate-400 to-slate-600 border-slate-700',
    gold: 'from-yellow-400 to-yellow-600 border-yellow-700',
    platinum: 'from-purple-400 to-indigo-600 border-purple-700',
    diamond: 'from-cyan-400 to-blue-600 border-cyan-700',
    crystal: 'from-pink-400 to-purple-600 border-pink-700'
  };

  return (
    <div 
      className={`relative ${sizes[size]} cursor-pointer transition-all duration-200 hover:scale-110`}
      onClick={onClick}
    >
      <div 
        className={`w-full h-full rounded-lg border-3 bg-gradient-to-br ${rarityColors[item?.rarity as keyof typeof rarityColors] || rarityColors.bronze}`}
        style={{
          boxShadow: `
            inset 0 2px 4px rgba(255,255,255,0.4),
            inset 0 -2px 4px rgba(0,0,0,0.4),
            0 4px 8px rgba(0,0,0,0.3)
          `
        }}
      >
        {/* Item representation */}
        <div className="w-full h-full flex items-center justify-center">
          {item ? (
            <div 
              className="w-3/4 h-3/4 rounded flex items-center justify-center text-white font-bold"
              style={{
                background: item.type === 'helmet' ? 'linear-gradient(145deg, #FFD700, #FFA500)' :
                           item.type === 'chest' ? 'linear-gradient(145deg, #C0C0C0, #808080)' :
                           item.type === 'weapon' ? 'linear-gradient(145deg, #B22222, #8B0000)' :
                           'linear-gradient(145deg, #8B4513, #654321)'
              }}
            >
              {item.type === 'helmet' && '👑'}
              {item.type === 'chest' && '🛡️'}
              {item.type === 'weapon' && '⚔️'}
              {item.type === 'gloves' && '🧤'}
              {item.type === 'boots' && '👢'}
              {item.type === 'shield' && '🛡️'}
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-800 rounded border-2 border-dashed border-slate-400 flex items-center justify-center">
              <span className="text-slate-400 text-2xl">+</span>
            </div>
          )}
        </div>
        
        {/* Rarity glow */}
        {item && (item.rarity === 'gold' || item.rarity === 'platinum' || item.rarity === 'crystal') && (
          <div 
            className="absolute inset-0 rounded-lg animate-pulse"
            style={{
              boxShadow: `0 0 20px ${
                item.rarity === 'gold' ? 'rgba(255, 215, 0, 0.6)' :
                item.rarity === 'platinum' ? 'rgba(147, 51, 234, 0.6)' :
                'rgba(236, 72, 153, 0.6)'
              }`
            }}
          />
        )}
      </div>
    </div>
  );
};

export const ProgressOrb: React.FC<{
  value: number;
  maxValue: number;
  label: string;
  color: 'red' | 'blue' | 'green' | 'yellow' | 'purple';
  size?: 'sm' | 'md' | 'lg';
}> = ({ value, maxValue, label, color, size = 'md' }) => {
  const percentage = (value / maxValue) * 100;
  
  const sizes = {
    sm: 'w-16 h-16 text-xs',
    md: 'w-20 h-20 text-sm',
    lg: 'w-24 h-24 text-base'
  };

  const colors = {
    red: '#ef4444',
    blue: '#3b82f6', 
    green: '#10b981',
    yellow: '#f59e0b',
    purple: '#8b5cf6'
  };

  return (
    <div className={`relative ${sizes[size]} flex items-center justify-center`}>
      {/* Outer ring */}
      <div 
        className="absolute inset-0 rounded-full border-4"
        style={{
          borderColor: colors[color],
          background: `
            radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 70%, transparent 100%),
            conic-gradient(from 0deg, ${colors[color]} 0%, ${colors[color]} ${percentage * 3.6}deg, rgba(255,255,255,0.2) ${percentage * 3.6}deg, rgba(255,255,255,0.2) 360deg)
          `,
          boxShadow: `
            inset 0 2px 4px rgba(0,0,0,0.5),
            0 4px 8px rgba(0,0,0,0.3),
            0 0 20px ${colors[color]}40
          `
        }}
      />
      
      {/* Inner content */}
      <div className="relative text-center text-white font-bold">
        <div className="text-lg leading-none">{value}</div>
        <div className="text-xs opacity-80">{label}</div>
      </div>
      
      {/* Shine effect */}
      <div 
        className="absolute top-1 left-1/4 w-1/2 h-1/4 rounded-full opacity-40"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 100%)'
        }}
      />
    </div>
  );
};

export const BossCard: React.FC<{
  boss: any;
  onBattle: () => void;
  isUnlocked: boolean;
}> = ({ boss, onBattle, isUnlocked }) => {
  return (
    <div 
      className={`relative transition-all duration-300 ${isUnlocked ? 'hover:scale-105 cursor-pointer' : 'opacity-60'}`}
      onClick={isUnlocked ? onBattle : undefined}
    >
      <WoodPanel className="p-4">
        <div className="flex items-center space-x-4">
          {/* Boss portrait */}
          <div 
            className="w-20 h-20 rounded-full border-4 border-yellow-600 flex items-center justify-center relative overflow-hidden"
            style={{
              background: `
                radial-gradient(circle at 30% 30%, #ff6b6b 0%, #ee5a24 50%, #c23616 100%),
                linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%)
              `,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.4)'
            }}
          >
            {/* Boss face */}
            <div className="text-3xl animate-pulse">
              {boss.difficulty <= 3 ? '😊' : boss.difficulty <= 7 ? '😤' : '👹'}
            </div>
            
            {/* Power aura */}
            <div 
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                background: `radial-gradient(circle, transparent 60%, ${
                  boss.difficulty <= 3 ? 'rgba(34, 197, 94, 0.3)' :
                  boss.difficulty <= 7 ? 'rgba(245, 158, 11, 0.3)' :
                  'rgba(239, 68, 68, 0.3)'
                } 100%)`
              }}
            />
          </div>
          
          {/* Boss info */}
          <div className="flex-1">
            <h4 className="text-xl font-black text-yellow-100 mb-1 drop-shadow-lg">
              {boss.name}
            </h4>
            <p className="text-sm font-bold text-orange-200 mb-2">
              {boss.title}
            </p>
            
            {/* Health bar */}
            <HealthBar 
              current={boss.health} 
              max={boss.maxHealth} 
              color="red"
            />
            
            {/* Difficulty indicators */}
            <div className="flex items-center space-x-2 mt-2">
              <div className="flex">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full mr-1 ${
                      i < boss.difficulty 
                        ? boss.difficulty <= 3 
                          ? 'bg-green-400' 
                          : boss.difficulty <= 7 
                            ? 'bg-yellow-400' 
                            : 'bg-red-400'
                        : 'bg-slate-600'
                    }`}
                    style={{
                      boxShadow: i < boss.difficulty ? '0 0 4px currentColor' : 'none'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* Battle button */}
          <div>
            <MetalButton
              variant={boss.difficulty <= 3 ? 'green' : boss.difficulty <= 7 ? 'yellow' : 'red'}
              size="lg"
              disabled={!isUnlocked}
              onClick={onBattle}
            >
              {isUnlocked ? '⚔️ ¡BATALLA!' : '🔒 BLOQUEADO'}
            </MetalButton>
          </div>
        </div>
        
        {/* Rewards */}
        <div className="mt-4 pt-3 border-t-2 border-yellow-600/50">
          <p className="text-sm font-bold text-yellow-200 mb-2">🎁 Recompensas:</p>
          <div className="flex flex-wrap gap-2">
            {boss.rewards?.map((reward: any, index: number) => (
              <div 
                key={index}
                className="px-2 py-1 rounded text-xs font-bold text-white"
                style={{
                  background: 'linear-gradient(145deg, #8B4513 0%, #A0522D 100%)',
                  border: '1px solid #654321'
                }}
              >
                {reward.name}
              </div>
            ))}
          </div>
        </div>
      </WoodPanel>
    </div>
  );
};
