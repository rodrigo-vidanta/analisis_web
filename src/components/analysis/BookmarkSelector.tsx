import React, { useState, useRef, useEffect } from 'react';
import { bookmarkService, type BookmarkColor, type BookmarkData, BOOKMARK_COLORS } from '../../services/bookmarkService';

interface SimpleBookmarkSelectorProps {
  callId: string;
  userId: string;
  currentBookmark?: BookmarkData | null;
  onBookmarkChange: (callId: string, bookmark: BookmarkData | null) => void;
}

const BookmarkSelector: React.FC<SimpleBookmarkSelectorProps> = ({
  callId,
  userId,
  currentBookmark,
  onBookmarkChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
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

  const handleColorSelect = async (color: BookmarkColor) => {
    try {
      setIsLoading(true);
      setIsOpen(false);
      
      const bookmark = await bookmarkService.upsertBookmark(callId, userId, color);
      onBookmarkChange(callId, bookmark);
      
    } catch (error) {
      console.error('Error guardando bookmark:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    try {
      setIsLoading(true);
      setIsOpen(false);
      
      await bookmarkService.removeBookmark(callId, userId);
      onBookmarkChange(callId, null);
      
    } catch (error) {
      console.error('Error eliminando bookmark:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStar = (color?: BookmarkColor) => {
    const colorInfo = color ? BOOKMARK_COLORS[color] : null;
    
    return (
      <svg 
        className={`w-4 h-4 ${colorInfo ? colorInfo.textClass : 'text-slate-400'}`} 
        fill={colorInfo ? 'currentColor' : 'none'} 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        strokeWidth={colorInfo ? 0 : 1.5}
      >
        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" />
      </svg>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      
      {/* Botón estrella */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        disabled={isLoading}
        className="p-1 hover:scale-110 transition-transform"
      >
        {isLoading ? (
          <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          renderStar(currentBookmark?.bookmark_color)
        )}
      </button>
      
      {/* Dropdown simple - Posicionado hacia la izquierda */}
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-2">
            
            {/* Colores */}
            <div className="flex gap-1 mb-2">
              {bookmarkService.getAvailableColors().map(color => {
                const colorInfo = BOOKMARK_COLORS[color];
                const isSelected = currentBookmark?.bookmark_color === color;
                
                return (
                  <button
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    className={`w-6 h-6 rounded-full ${colorInfo.bgClass} hover:scale-110 transition-transform ${
                      isSelected ? 'ring-2 ring-slate-900' : ''
                    }`}
                  >
                    <svg className="w-3 h-3 text-white mx-auto" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" />
                    </svg>
                  </button>
                );
              })}
            </div>
            
            {/* Eliminar */}
            {currentBookmark && (
              <button
                onClick={handleRemove}
                className="w-full p-1 text-slate-400 hover:text-red-500 rounded text-center"
              >
                <svg className="w-3 h-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            
          </div>
        </div>
      )}
      
    </div>
  );
};

export default BookmarkSelector;
