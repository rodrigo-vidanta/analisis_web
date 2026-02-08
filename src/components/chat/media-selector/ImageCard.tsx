import { useState, useEffect, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { Eye, MapPin, XCircle } from 'lucide-react';
import type { ImageCardProps } from './types';

function getThumbnailUrl(nombreArchivo: string): string {
  const baseName = nombreArchivo.replace(/\.[^.]+$/, '');
  return `/thumbnails/${baseName}.webp`;
}

const ImageCard = memo<ImageCardProps>(({
  item,
  isSelected,
  selectionIndex,
  onSelect,
  onPreview
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const thumbnailUrl = getThumbnailUrl(item.nombre_archivo);

  // Fix race condition: si la imagen ya esta cacheada por el browser,
  // onLoad puede disparar antes de que React adjunte el handler
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  return (
    <div
      className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
          : 'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600'
      }`}
      onClick={onSelect}
    >
      {/* Skeleton / Error State */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
        {!loaded && !error && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Static Thumbnail - eager load, sin fetch a Edge Function */}
      {!error && (
        <img
          ref={imgRef}
          src={thumbnailUrl}
          alt={item.nombre || 'Imagen'}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 group-hover:scale-105 transition-transform ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}

      {/* Selection Indicator */}
      <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
        isSelected
          ? 'bg-blue-500 scale-100'
          : 'bg-black/30 scale-0 group-hover:scale-100'
      }`}>
        {isSelected ? (
          <span className="text-[10px] font-bold text-white">{selectionIndex}</span>
        ) : (
          <div className="w-3 h-3 rounded-full border-2 border-white" />
        )}
      </div>

      {/* Preview Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPreview();
        }}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
      >
        <Eye className="w-4 h-4 text-white" />
      </button>

      {/* Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <p className="text-white text-xs font-medium truncate">{item.nombre || 'Sin nombre'}</p>
        {item.destinos && item.destinos.length > 0 && (
          <div className="flex items-center space-x-1 mt-0.5">
            <MapPin className="w-3 h-3 text-white/70" />
            <p className="text-white/70 text-[10px] truncate">{item.destinos[0]}</p>
          </div>
        )}
      </div>

      {/* Selected overlay glow */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-blue-500/10 pointer-events-none"
        />
      )}
    </div>
  );
});

ImageCard.displayName = 'ImageCard';

export { ImageCard };
