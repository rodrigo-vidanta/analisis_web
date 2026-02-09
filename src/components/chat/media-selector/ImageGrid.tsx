import { useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Loader2, Clock } from 'lucide-react';
import { ImageCard } from './ImageCard';
import type { ImageGridProps, ContentItem } from './types';

interface ImageGridFullProps extends ImageGridProps {
  recentImages: ContentItem[];
  visibleCount: number;
  totalFiltered: number;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  searchTerm: string;
  selectedDestino: string;
  selectedResort: string;
}

function ImageGrid({
  images,
  selectedImageIds,
  selectedImages,
  onSelect,
  onPreview,
  loading,
  recentImages,
  visibleCount,
  totalFiltered,
  onScroll,
  searchTerm,
  selectedDestino,
  selectedResort
}: ImageGridFullProps) {

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-cargar mas imagenes si el contenido no llena el viewport
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || loading) return;
    if (visibleCount >= totalFiltered) return;

    const rafId = requestAnimationFrame(() => {
      if (el.scrollHeight <= el.clientHeight + 200) {
        onScroll({ currentTarget: el } as unknown as React.UIEvent<HTMLDivElement>);
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [visibleCount, totalFiltered, loading, images.length, onScroll]);

  const getSelectionIndex = useCallback((itemId: string): number => {
    const idx = selectedImages.findIndex(s => s.item.id === itemId);
    return idx >= 0 ? idx + 1 : 0;
  }, [selectedImages]);

  const showRecents = recentImages.length > 0 &&
    searchTerm === '' &&
    selectedDestino === 'all' &&
    selectedResort === 'all';

  return (
    <div
      ref={scrollContainerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-none"
    >
      {/* Recent Images */}
      {showRecents && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-1 h-5 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full" />
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Usadas Recientemente</span>
            </h4>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {recentImages.map(item => (
              <ImageCard
                key={`recent-${item.id}`}
                item={item}
                isSelected={selectedImageIds.has(item.id)}
                selectionIndex={getSelectionIndex(item.id)}
                onSelect={() => onSelect(item)}
                onPreview={() => onPreview(item)}

              />
            ))}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 mt-4" />
        </motion.div>
      )}

      {/* Main Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Cargando imagenes...</p>
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
          <ImageIcon className="w-20 h-20 mb-4 opacity-30" />
          <p className="text-lg font-medium">No se encontraron imagenes</p>
          <p className="text-sm">Intenta con otros terminos de busqueda</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
            {images.map(item => (
              <ImageCard
                key={item.id}
                item={item}
                isSelected={selectedImageIds.has(item.id)}
                selectionIndex={getSelectionIndex(item.id)}
                onSelect={() => onSelect(item)}
                onPreview={() => onPreview(item)}

              />
            ))}
          </div>

          {/* Load More Indicator */}
          {visibleCount < totalFiltered && (
            <div className="flex justify-center py-6">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cargando mas imagenes... ({visibleCount} de {totalFiltered})</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { ImageGrid };
