import React, { useState, useRef, useEffect } from 'react';
import { bookmarkService, type BookmarkColor, BOOKMARK_COLORS } from '../../services/bookmarkService';

// ============================================
// INTERFACES Y TIPOS
// ============================================

interface BookmarkFilterProps {
  selectedColor: BookmarkColor | null;
  onColorChange: (color: BookmarkColor | null) => void;
  userStats?: Array<{ color: BookmarkColor; count: number }>;
  className?: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const BookmarkFilter: React.FC<BookmarkFilterProps> = ({
  selectedColor,
  onColorChange,
  userStats = [],
  className = ""
}) => {
  // Estados del componente
  const [isOpen, setIsOpen] = useState(false);
  
  // Referencias
  const containerRef = useRef<HTMLDivElement>(null);
  
  // ============================================
  // EFECTOS
  // ============================================
  
  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  // ============================================
  // HANDLERS
  // ============================================
  
  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  const handleColorSelect = (color: BookmarkColor | null) => {
    onColorChange(color);
    setIsOpen(false);
  };
  
  // ============================================
  // HELPERS
  // ============================================
  
  const getColorCount = (color: BookmarkColor): number => {
    const stat = userStats.find(s => s.color === color);
    return stat?.count || 0;
  };
  
  const getTotalBookmarks = (): number => {
    return userStats.reduce((sum, stat) => sum + stat.count, 0);
  };
  
  const renderStarIcon = (color?: BookmarkColor, filled: boolean = true) => {
    const colorInfo = color ? BOOKMARK_COLORS[color] : null;
    
    return (
      <svg 
        className={`w-4 h-4 transition-all duration-200 ${
          filled && colorInfo 
            ? colorInfo.textClass 
            : 'text-slate-400 dark:text-slate-500'
        }`} 
        fill={filled && colorInfo ? 'currentColor' : 'none'} 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        strokeWidth={filled ? 0 : 1.5}
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" 
        />
      </svg>
    );
  };
  
  // ============================================
  // RENDER
  // ============================================
  
  const selectedColorInfo = selectedColor ? BOOKMARK_COLORS[selectedColor] : null;
  const totalBookmarks = getTotalBookmarks();
  
  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      
      {/* Botón del mismo tamaño que Top Records */}
      <button
        onClick={handleToggleDropdown}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          selectedColor
            ? `${selectedColorInfo?.bgClass} text-white hover:opacity-90 shadow-md`
            : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500'
        }`}
        title={
          selectedColor 
            ? `Filtrando por marcadores ${selectedColorInfo?.name.toLowerCase()}` 
            : 'Filtrar por marcadores'
        }
      >
        {renderStarIcon(selectedColor, !!selectedColor)}
        
        <span>
          {selectedColor 
            ? `${selectedColorInfo?.name} (${getColorCount(selectedColor)})` 
            : totalBookmarks > 0 ? `Marcadores (${totalBookmarks})` : 'Marcadores'
          }
        </span>
        
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Dropdown ultra-minimalista */}
      {isOpen && (
        <div className="absolute z-50 mt-1 left-0">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-3">
            
            {/* Grid simple de estrellas */}
            <div className="flex items-center gap-3 mb-2">
              {bookmarkService.getAvailableColors().map(color => {
                const colorInfo = BOOKMARK_COLORS[color];
                const count = getColorCount(color);
                const isSelected = selectedColor === color;
                
                return (
                  <div key={color} className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleColorSelect(isSelected ? null : color)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                        colorInfo.bgClass
                      } hover:scale-110 ${
                        isSelected ? 'ring-2 ring-slate-900 dark:ring-slate-100 scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={`${count} marcadores - Click para ${isSelected ? 'quitar filtro' : 'filtrar'}`}
                    >
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" />
                      </svg>
                    </button>
                    
                    {/* Contador debajo */}
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Botón para quitar filtro */}
            <div className="border-t border-slate-200 dark:border-slate-600 pt-2">
              <button
                onClick={() => handleColorSelect(null)}
                className={`w-full px-3 py-1 text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 rounded ${
                  !selectedColor ? 'bg-slate-100 dark:bg-slate-700' : ''
                }`}
                title="Quitar filtro de marcadores"
              >
                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-xs">Quitar filtro</span>
              </button>
            </div>
            
          </div>
        </div>
      )}
      
    </div>
  );
};

export default BookmarkFilter;
