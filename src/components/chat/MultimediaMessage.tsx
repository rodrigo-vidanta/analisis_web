// Golden Rules:
// 📚 Documentación: Ver src/components/chat/README.md para arquitectura del módulo Live Chat
// 📝 Cambios: Documentar en src/components/chat/CHANGELOG_LIVECHAT.md
// 📋 Verificación: Revisar CHANGELOG antes de modificar

import { useState, useEffect, useRef } from 'react';
import { FileText, Download, Image, Music, Film, FileArchive, Loader } from 'lucide-react';

interface Adjunto {
  tipo: string;
  bucket: string;
  filename: string;
  timestamp: string;
  descripcion?: string;
}

interface MultimediaMessageProps {
  adjuntos: Adjunto[];
  isVisible?: boolean;
}

interface MultimediaCache {
  url: string;
  expiresAt: number;
}

// Cache global de URLs (con expiración de 25 minutos para regenerar antes de los 30)
const urlCache = new Map<string, MultimediaCache>();

const generateMediaUrl = async (adjunto: Adjunto): Promise<string> => {
  const cacheKey = `${adjunto.bucket}/${adjunto.filename}`;
  
  // Verificar cache
  const cached = urlCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url;
  }

  // Generar nueva URL
  try {
    const response = await fetch('https://function-bun-dev-6d8e.up.railway.app/generar-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': '93fbcfc4-ccc9-4023-b820-86ef98f10122'
      },
      body: JSON.stringify({
        filename: adjunto.filename,
        bucket: adjunto.bucket,
        expirationMinutes: 30
      })
    });

    if (!response.ok) {
      throw new Error(`Error generando URL: ${response.statusText}`);
    }

    const data = await response.json();
    const url = data[0]?.url || data.url;

    if (!url) {
      throw new Error('No se recibió URL en la respuesta');
    }

    // Guardar en cache (25 minutos = 1500000 ms)
    urlCache.set(cacheKey, {
      url,
      expiresAt: Date.now() + (25 * 60 * 1000)
    });

    return url;
  } catch (error) {
    console.error('Error generando URL de multimedia:', error);
    throw error;
  }
};

const getFileIcon = (tipo: string) => {
  const tipoLower = tipo.toLowerCase();
  
  if (tipoLower.includes('imagen') || tipoLower.includes('image')) {
    return <Image className="w-5 h-5" />;
  }
  if (tipoLower.includes('audio') || tipoLower.includes('music')) {
    return <Music className="w-5 h-5" />;
  }
  if (tipoLower.includes('video')) {
    return <Film className="w-5 h-5" />;
  }
  if (tipoLower.includes('documento') || tipoLower.includes('document')) {
    return <FileText className="w-5 h-5" />;
  }
  if (tipoLower.includes('archivo') || tipoLower.includes('zip')) {
    return <FileArchive className="w-5 h-5" />;
  }
  
  return <FileText className="w-5 h-5" />;
};

const getFileType = (tipo: string): 'image' | 'audio' | 'video' | 'document' => {
  const tipoLower = tipo.toLowerCase();
  
  if (tipoLower.includes('imagen') || tipoLower.includes('image')) return 'image';
  if (tipoLower.includes('audio') || tipoLower.includes('music')) return 'audio';
  if (tipoLower.includes('video')) return 'video';
  
  return 'document';
};

export const MultimediaMessage: React.FC<MultimediaMessageProps> = ({ adjuntos, isVisible = false }) => {
  const [loadedUrls, setLoadedUrls] = useState<Record<string, string>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const elementRef = useRef<HTMLDivElement>(null);
  const [hasIntersected, setHasIntersected] = useState(false);

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (!elementRef.current || isVisible) {
      setHasIntersected(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasIntersected) {
            setHasIntersected(true);
          }
        });
      },
      {
        rootMargin: '100px', // Cargar 100px antes de que sea visible
        threshold: 0.1
      }
    );

    observer.observe(elementRef.current);

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [isVisible, hasIntersected]);

  // Cargar URLs cuando el elemento es visible
  useEffect(() => {
    if (!hasIntersected) return;

    adjuntos.forEach(async (adjunto) => {
      const key = `${adjunto.bucket}/${adjunto.filename}`;
      
      // Si ya está cargado o cargando, no hacer nada
      if (loadedUrls[key] || loadingStates[key]) return;

      setLoadingStates(prev => ({ ...prev, [key]: true }));

      try {
        const url = await generateMediaUrl(adjunto);
        setLoadedUrls(prev => ({ ...prev, [key]: url }));
        setErrors(prev => ({ ...prev, [key]: '' }));
      } catch (error) {
        setErrors(prev => ({ 
          ...prev, 
          [key]: error instanceof Error ? error.message : 'Error desconocido' 
        }));
      } finally {
        setLoadingStates(prev => ({ ...prev, [key]: false }));
      }
    });
  }, [hasIntersected, adjuntos]);

  if (!adjuntos || adjuntos.length === 0) return null;

  return (
    <div ref={elementRef} className="space-y-2 mt-2">
      {adjuntos.map((adjunto, index) => {
        const key = `${adjunto.bucket}/${adjunto.filename}`;
        const url = loadedUrls[key];
        const loading = loadingStates[key];
        const error = errors[key];
        const fileType = getFileType(adjunto.tipo);

        return (
          <div key={index} className="rounded-lg overflow-hidden bg-slate-50 dark:bg-gray-700/50">
            {/* Loading State */}
            {loading && !url && (
              <div className="flex items-center justify-center p-4 space-x-2 text-slate-600 dark:text-gray-300">
                <Loader className="w-5 h-5 animate-spin" />
                <span className="text-sm">Cargando...</span>
              </div>
            )}

            {/* Error State */}
            {error && !url && (
              <div className="p-3 flex items-center space-x-2 text-red-600 dark:text-red-400">
                {getFileIcon(adjunto.tipo)}
                <div className="flex-1">
                  <p className="text-sm font-medium">Error al cargar archivo</p>
                  <p className="text-xs opacity-75">{adjunto.filename}</p>
                </div>
              </div>
            )}

            {/* Imagen */}
            {url && fileType === 'image' && (
              <div className="relative group">
                <img 
                  src={url} 
                  alt={adjunto.descripcion || 'Imagen'} 
                  className="w-full max-w-sm h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(url, '_blank')}
                  loading="lazy"
                />
                <a
                  href={url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Download className="w-4 h-4 text-white" />
                </a>
              </div>
            )}

            {/* Audio */}
            {url && fileType === 'audio' && (
              <div className="p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Music className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-slate-600 dark:text-gray-300">
                    {adjunto.filename}
                  </span>
                </div>
                <audio 
                  controls 
                  src={url}
                  className="w-full max-w-sm"
                  preload="metadata"
                >
                  Tu navegador no soporta audio.
                </audio>
              </div>
            )}

            {/* Video */}
            {url && fileType === 'video' && (
              <div className="relative">
                <video 
                  controls 
                  src={url}
                  className="w-full max-w-sm h-auto rounded-lg"
                  preload="metadata"
                >
                  Tu navegador no soporta video.
                </video>
                <a
                  href={url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full"
                >
                  <Download className="w-4 h-4 text-white" />
                </a>
              </div>
            )}

            {/* Documento */}
            {url && fileType === 'document' && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 flex items-center space-x-3 hover:bg-slate-100 dark:hover:bg-gray-600/50 transition-colors"
              >
                {getFileIcon(adjunto.tipo)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {adjunto.filename}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    {adjunto.tipo} • {new Date(adjunto.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <Download className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </a>
            )}

            {/* Descripción si existe */}
            {adjunto.descripcion && url && (
              <div className="px-3 pb-2 text-xs text-slate-600 dark:text-gray-400">
                {adjunto.descripcion}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

