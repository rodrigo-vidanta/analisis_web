import React, { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';

interface InventoryItem {
  id: string;
  name: string;
  type: 'helmet' | 'chest' | 'gloves' | 'boots' | 'shield' | 'weapon' | 'consumable';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  stats: { [key: string]: number };
  description: string;
  icon: string;
  isEquipped: boolean;
}

interface InventorySystemProps {
  isVisible: boolean;
  onClose: () => void;
  items: InventoryItem[];
  onEquipItem: (item: InventoryItem) => void;
}

const InventorySystem: React.FC<InventorySystemProps> = ({ 
  isVisible, 
  onClose, 
  items, 
  onEquipItem 
}) => {
  const { isLinearTheme } = useTheme();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<InventoryItem | null>(null);

  if (!isVisible) return null;

  const getRarityColor = (rarity: string): string => {
    const colors = {
      common: 'border-gray-400 bg-gray-100 dark:bg-gray-800',
      rare: 'border-blue-400 bg-blue-100 dark:bg-blue-900/30',
      epic: 'border-purple-400 bg-purple-100 dark:bg-purple-900/30',
      legendary: 'border-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
      mythic: 'border-red-400 bg-red-100 dark:bg-red-900/30'
    };
    return colors[rarity as keyof typeof colors] || colors.common;
  };

  const handleDragStart = (item: InventoryItem) => {
    setDraggedItem(item);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDrop = (slot: string) => {
    if (draggedItem && draggedItem.type === slot) {
      onEquipItem(draggedItem);
      setDraggedItem(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl ${
        isLinearTheme 
          ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
          : 'bg-gradient-to-br from-purple-900/90 to-indigo-900/90 border border-purple-600'
      } backdrop-blur-lg shadow-2xl`}>
        
        {/* Header */}
        <div className="p-6 border-b border-purple-600/30">
          <div className="flex items-center justify-between">
            <h2 className={`text-3xl font-bold ${
              isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
            }`}>
              🎒 Inventario Épico
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isLinearTheme 
                  ? 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'
                  : 'hover:bg-purple-700/50 text-purple-300'
              }`}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Equipment Slots (Izquierda) */}
          <div className="lg:col-span-1">
            <h3 className={`text-xl font-bold mb-4 ${
              isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
            }`}>
              ⚔️ Equipamiento
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              {/* Helmet */}
              <div className="col-span-3 flex justify-center">
                <div 
                  className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer ${
                    isLinearTheme 
                      ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                      : 'border-purple-400 bg-purple-800/20'
                  }`}
                  onDrop={() => handleDrop('helmet')}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <span className="text-2xl">🪖</span>
                </div>
              </div>
              
              {/* Shield, Chest, Weapon */}
              <div 
                className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer ${
                  isLinearTheme 
                    ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                    : 'border-purple-400 bg-purple-800/20'
                }`}
                onDrop={() => handleDrop('shield')}
                onDragOver={(e) => e.preventDefault()}
              >
                <span className="text-2xl">🛡️</span>
              </div>
              
              <div 
                className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer ${
                  isLinearTheme 
                    ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                    : 'border-purple-400 bg-purple-800/20'
                }`}
                onDrop={() => handleDrop('chest')}
                onDragOver={(e) => e.preventDefault()}
              >
                <span className="text-2xl">👕</span>
              </div>
              
              <div 
                className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer ${
                  isLinearTheme 
                    ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                    : 'border-purple-400 bg-purple-800/20'
                }`}
                onDrop={() => handleDrop('weapon')}
                onDragOver={(e) => e.preventDefault()}
              >
                <span className="text-2xl">⚔️</span>
              </div>
              
              {/* Gloves, Boots */}
              <div className="col-span-3 grid grid-cols-2 gap-3">
                <div 
                  className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer ${
                    isLinearTheme 
                      ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                      : 'border-purple-400 bg-purple-800/20'
                  }`}
                  onDrop={() => handleDrop('gloves')}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <span className="text-2xl">🧤</span>
                </div>
                
                <div 
                  className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer ${
                    isLinearTheme 
                      ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                      : 'border-purple-400 bg-purple-800/20'
                  }`}
                  onDrop={() => handleDrop('boots')}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <span className="text-2xl">👢</span>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Grid (Centro) */}
          <div className="lg:col-span-1">
            <h3 className={`text-xl font-bold mb-4 ${
              isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
            }`}>
              🎒 Mochila
            </h3>
            
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 30 }, (_, index) => {
                const item = items[index];
                return (
                  <div 
                    key={index}
                    className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer ${
                      item 
                        ? `${getRarityColor(item.rarity)} border-solid` 
                        : isLinearTheme 
                          ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 border-dashed'
                          : 'border-purple-400 bg-purple-800/20 border-dashed'
                    }`}
                    draggable={!!item}
                    onDragStart={() => item && handleDragStart(item)}
                    onDragEnd={handleDragEnd}
                    onClick={() => item && setSelectedItem(item)}
                  >
                    {item ? (
                      <div className="text-center">
                        <div className="text-lg mb-1">{item.icon}</div>
                        {item.isEquipped && (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                    ) : (
                      <div className={`text-2xl ${
                        isLinearTheme ? 'text-slate-400' : 'text-purple-400'
                      }`}>
                        +
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Item Details (Derecha) */}
          <div className="lg:col-span-1">
            <h3 className={`text-xl font-bold mb-4 ${
              isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
            }`}>
              📋 Detalles
            </h3>
            
            {selectedItem ? (
              <div className={`p-4 rounded-xl ${
                isLinearTheme ? 'bg-slate-50 dark:bg-slate-700' : 'bg-purple-800/30'
              }`}>
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">{selectedItem.icon}</div>
                  <h4 className={`font-bold text-lg ${
                    isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
                  }`}>
                    {selectedItem.name}
                  </h4>
                  <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getRarityColor(selectedItem.rarity)}`}>
                    {selectedItem.rarity.toUpperCase()}
                  </div>
                </div>
                
                <p className={`text-sm mb-4 ${
                  isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-purple-200'
                }`}>
                  {selectedItem.description}
                </p>
                
                {/* Stats */}
                <div className="space-y-2">
                  <h5 className={`font-semibold ${
                    isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-white'
                  }`}>
                    Bonificaciones:
                  </h5>
                  {Object.entries(selectedItem.stats).map(([stat, value]) => (
                    <div key={stat} className="flex justify-between">
                      <span className={`text-sm ${
                        isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-purple-200'
                      }`}>
                        {stat}:
                      </span>
                      <span className="text-green-500 font-bold">+{value}</span>
                    </div>
                  ))}
                </div>
                
                {/* Botones */}
                <div className="mt-4 space-y-2">
                  {!selectedItem.isEquipped ? (
                    <button
                      onClick={() => onEquipItem(selectedItem)}
                      className={`w-full py-2 px-4 rounded-lg font-semibold transition-all duration-200 hover:scale-105 ${
                        isLinearTheme 
                          ? 'bg-slate-600 hover:bg-slate-700 text-white'
                          : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white'
                      }`}
                    >
                      ⚡ Equipar
                    </button>
                  ) : (
                    <div className={`w-full py-2 px-4 rounded-lg text-center font-semibold ${
                      isLinearTheme 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      ✅ Equipado
                    </div>
                  )}
                  
                  <button className={`w-full py-2 px-4 rounded-lg font-semibold border-2 transition-all duration-200 ${
                    isLinearTheme 
                      ? 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                      : 'border-purple-400 text-purple-300 hover:bg-purple-700/20'
                  }`}>
                    🗑️ Desechar
                  </button>
                </div>
              </div>
            ) : (
              <div className={`p-8 rounded-xl text-center ${
                isLinearTheme ? 'bg-slate-50 dark:bg-slate-700' : 'bg-purple-800/30'
              }`}>
                <div className="text-4xl mb-4">📦</div>
                <p className={`${
                  isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-purple-200'
                }`}>
                  Selecciona un item para ver sus detalles
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer con controles */}
        <div className={`p-4 border-t ${
          isLinearTheme ? 'border-slate-200 dark:border-slate-700' : 'border-purple-600/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className={`text-sm ${
              isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-purple-200'
            }`}>
              💡 Arrastra items a los slots de equipamiento para equiparlos
            </div>
            <div className="flex space-x-2">
              <button className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                isLinearTheme 
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300'
                  : 'bg-purple-700/50 hover:bg-purple-600/50 text-purple-200'
              }`}>
                🔄 Ordenar
              </button>
              <button className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                isLinearTheme 
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300'
                  : 'bg-indigo-700/50 hover:bg-indigo-600/50 text-indigo-200'
              }`}>
                🔍 Filtrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventorySystem;
