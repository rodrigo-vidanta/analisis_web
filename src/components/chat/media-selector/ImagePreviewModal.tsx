import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Check, CheckCircle2, MapPin, Building2 } from 'lucide-react';
import type { ImagePreviewModalProps } from './types';

function getThumbnailUrl(nombreArchivo: string): string {
  const baseName = nombreArchivo.replace(/\.[^.]+$/, '');
  return `/thumbnails/${baseName}.webp`;
}

function ImagePreviewModal({ item, onClose, onSelect, isSelected, getImageUrl }: ImagePreviewModalProps) {
  const [fullUrl, setFullUrl] = useState<string>('');
  const [fullLoaded, setFullLoaded] = useState(false);

  const thumbnailUrl = getThumbnailUrl(item.nombre_archivo);

  // Cargar URL full-size en background
  useEffect(() => {
    setFullUrl('');
    setFullLoaded(false);
    getImageUrl(item).then(newUrl => {
      if (newUrl) setFullUrl(newUrl);
    }).catch(() => {
      // Si falla, el thumbnail sigue visible
    });
  }, [item, getImageUrl]);

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 z-[70]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Image - thumbnail como placeholder, full-size encima */}
        <div className="relative max-h-[70vh] w-auto">
          {/* Thumbnail (siempre visible como placeholder) */}
          <img
            src={thumbnailUrl}
            alt={item.nombre}
            className={`max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl transition-opacity duration-300 ${
              fullLoaded ? 'opacity-0 absolute inset-0' : 'opacity-100'
            }`}
          />
          {/* Full-size (se muestra encima cuando carga) */}
          {fullUrl && (
            <img
              src={fullUrl}
              alt={item.nombre}
              className={`max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl transition-opacity duration-300 ${
                fullLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
              }`}
              onLoad={() => setFullLoaded(true)}
            />
          )}
          {/* Loading indicator sobre thumbnail */}
          {!fullLoaded && (
            <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 rounded-lg flex items-center space-x-1.5">
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-white/70 text-xs">HD</span>
            </div>
          )}
        </div>

        {/* Info Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-4 p-4 bg-gray-900/80 backdrop-blur-sm rounded-xl w-full max-w-2xl border border-white/10"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg">{item.nombre}</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {item.destinos?.map(d => (
                  <span key={d} className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs">
                    <MapPin className="w-3 h-3" />
                    <span>{d}</span>
                  </span>
                ))}
                {item.resorts?.map(r => (
                  <span key={r} className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs">
                    <Building2 className="w-3 h-3" />
                    <span>{r}</span>
                  </span>
                ))}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSelect}
              className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center space-x-2 ${
                isSelected
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isSelected ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Seleccionada</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Seleccionar</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );

  return createPortal(content, document.body);
}

export { ImagePreviewModal };
