// Golden Rules:
// 📚 Documentación: Ver src/components/chat/README.md para arquitectura del módulo Live Chat
// 📝 Cambios: Documentar en src/components/chat/CHANGELOG_LIVECHAT.md
// 📋 Verificación: Revisar CHANGELOG antes de modificar

import { useState, useEffect, useRef } from 'react';
import { FileText, Download, Image, Music, Film, FileArchive, Loader } from 'lucide-react';

interface Adjunto {
  tipo?: string;
  bucket?: string;
  filename?: string;
  archivo?: string; // Alias de filename (usado en webhook)
  timestamp?: string;
  descripcion?: string;
  destino?: string; // Para imágenes del catálogo
  resort?: string; // Para imágenes del catálogo
}

interface MultimediaMessageProps {
  adjuntos: Adjunto[];
  isVisible?: boolean;
  hasTextContent?: boolean; // Si el mensaje tiene texto adicional
}

// Helper: determinar si un tipo de archivo necesita globo de conversación
export const needsBubble = (adjuntos: Adjunto[]): boolean => {
  if (!adjuntos || adjuntos.length === 0) return true;
  
  // Solo el primer adjunto determina si necesita globo
  const firstAdjunto = adjuntos[0];
  const fileType = getFileTypeFromAdjunto(firstAdjunto);
  
  // Stickers y audios NO necesitan globo (estilo WhatsApp)
  if (fileType === 'sticker' || fileType === 'audio') {
    return false;
  }
  
  // Imágenes, videos, documentos SÍ necesitan globo (pueden tener texto)
  return true;
};

// Helper para obtener tipo sin instanciar el componente
const getFileTypeFromAdjunto = (adjunto: Adjunto): 'image' | 'audio' | 'video' | 'sticker' | 'document' => {
  // Validar que existan los campos básicos
  const filename = adjunto?.filename || adjunto?.archivo;
  
  if (!adjunto || !filename) {
    console.warn('⚠️ Adjunto inválido:', adjunto);
    return 'document';
  }

  const tipoLower = (adjunto.tipo || '').toLowerCase();
  const filenameLower = filename.toLowerCase();
  
  // Stickers de WhatsApp
  if (tipoLower.includes('sticker')) return 'sticker';
  if (!filenameLower.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg|mp3|mp4|pdf|doc|docx|zip|rar)$/i) && 
      filenameLower.match(/\.-[a-z0-9]{4}$/i)) return 'sticker';
  if (filenameLower.match(/\.(webp|gif)$/i)) return 'sticker';
  
  // Audio
  if (tipoLower.includes('audio') || tipoLower.includes('music') || filenameLower.match(/\.(mp3|ogg|wav|m4a|aac)$/i)) {
    return 'audio';
  }
  
  // Resto (imágenes, videos, documentos)
  if (filenameLower.match(/\.(jpg|jpeg|png|bmp|svg)$/i)) return 'image';
  if (tipoLower.includes('imagen') || tipoLower.includes('image')) return 'image';
  if (tipoLower.includes('video') || filenameLower.match(/\.(mp4|webm|mov|avi|mkv)$/i)) return 'video';
  
  return 'document';
};

interface MultimediaCache {
  url: string;
  timestamp: number;
}

// Cache global con localStorage persistente
const getFromCache = (key: string): string | null => {
  // 1️⃣ Revisar localStorage primero
  const cachedData = localStorage.getItem(`media_${key}`);
  if (cachedData) {
    try {
      const parsed: MultimediaCache = JSON.parse(cachedData);
      const now = Date.now();
      // Cache válido por 25 minutos
      if (parsed.url && parsed.timestamp && (now - parsed.timestamp) < 25 * 60 * 1000) {
        return parsed.url;
      } else {
        // Cache expirado
        localStorage.removeItem(`media_${key}`);
      }
    } catch (e) {
      localStorage.removeItem(`media_${key}`);
    }
  }
  return null;
};

const saveToCache = (key: string, url: string): void => {
  try {
    localStorage.setItem(`media_${key}`, JSON.stringify({
      url,
      timestamp: Date.now()
    }));
  } catch (e) {
    // Si localStorage está lleno, limpiar entradas antiguas
    console.warn('localStorage full, cleaning old entries');
    cleanOldCacheEntries();
  }
};

const cleanOldCacheEntries = (): void => {
  const now = Date.now();
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('media_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (!data.timestamp || (now - data.timestamp) > 25 * 60 * 1000) {
          keysToRemove.push(key);
        }
      } catch (e) {
        keysToRemove.push(key);
      }
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

const generateMediaUrl = async (adjunto: Adjunto): Promise<string> => {
  const filename = adjunto.filename || adjunto.archivo;
  const bucket = adjunto.bucket || 'whatsapp-media';
  
  if (!filename) {
    throw new Error('No se especificó filename o archivo');
  }
  
  const cacheKey = `${bucket}/${filename}`;
  
  // 1️⃣ Verificar cache persistente
  const cachedUrl = getFromCache(cacheKey);
  if (cachedUrl) {
    return cachedUrl;
  }

  // 2️⃣ Generar nueva URL desde API
  try {
    const response = await fetch('https://function-bun-dev-6d8e.up.railway.app/generar-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': '93fbcfc4-ccc9-4023-b820-86ef98f10122'
      },
      body: JSON.stringify({
        filename: filename,
        bucket: bucket,
        expirationMinutes: 30
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error generando URL (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const url = data[0]?.url || data.url;

    if (!url) {
      throw new Error('No se recibió URL en la respuesta');
    }

    // 3️⃣ Guardar en cache persistente
    saveToCache(cacheKey, url);

    return url;
  } catch (error) {
    console.error('Error generando URL de multimedia:', error);
    throw error;
  }
};

const getFileIcon = (tipo: string | undefined) => {
  const tipoLower = (tipo || '').toLowerCase();
  
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

const getFileType = (tipo: string, filename: string): 'image' | 'audio' | 'video' | 'sticker' | 'document' => {
  // Validar campos
  if (!filename) {
    console.warn('⚠️ Filename es undefined');
    return 'document';
  }

  const tipoLower = (tipo || '').toLowerCase();
  const filenameLower = filename.toLowerCase();
  
  // Stickers de WhatsApp (suelen tener extensiones específicas o nombres cortos sin extensión)
  // Los stickers NO tienen extensión o tienen .webp y son archivos pequeños
  if (tipoLower.includes('sticker')) {
    return 'sticker';
  }
  
  // Archivos sin extensión o con extensiones raras que son de WhatsApp (probablemente stickers)
  // Ejemplo: 148a1416ffa3e66bd3d9dabb8a91e2df.-4rkS
  if (!filenameLower.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg|mp3|mp4|pdf|doc|docx|zip|rar)$/i) && 
      filenameLower.match(/\.-[a-z0-9]{4}$/i)) {
    return 'sticker';
  }
  
  // WebP y GIF son típicamente stickers/GIFs animados
  if (filenameLower.match(/\.(webp|gif)$/i)) {
    return 'sticker';
  }
  
  // Documentos que son imágenes (WhatsApp a veces los marca como "Documento")
  if (filenameLower.match(/\.(jpg|jpeg|png|bmp|svg)$/i)) {
    return 'image';
  }
  
  // Imágenes explícitas
  if (tipoLower.includes('imagen') || tipoLower.includes('image')) {
    return 'image';
  }
  
  // Audio
  if (tipoLower.includes('audio') || tipoLower.includes('music') || filenameLower.match(/\.(mp3|ogg|wav|m4a|aac)$/i)) {
    return 'audio';
  }
  
  // Video
  if (tipoLower.includes('video') || filenameLower.match(/\.(mp4|webm|mov|avi|mkv)$/i)) {
    return 'video';
  }
  
  return 'document';
};

export const MultimediaMessage: React.FC<MultimediaMessageProps> = ({ adjuntos, isVisible = false }) => {
  const [loadedUrls, setLoadedUrls] = useState<Record<string, string>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number; orientation: 'landscape' | 'portrait' | 'square' }>>({});
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
      const filename = adjunto.filename || adjunto.archivo;
      const bucket = adjunto.bucket || 'whatsapp-media';
      
      if (!filename) return; // Skip si no hay filename
      
      const key = `${bucket}/${filename}`;
      
      // Si ya está cargado o cargando, no hacer nada
      if (loadedUrls[key] || loadingStates[key]) return;

      setLoadingStates(prev => ({ ...prev, [key]: true }));

      try {
        const url = await generateMediaUrl(adjunto);
        setLoadedUrls(prev => ({ ...prev, [key]: url }));
        setErrors(prev => ({ ...prev, [key]: '' }));
        
        // Detectar dimensiones para imágenes
        const fileType = getFileType(adjunto.tipo || '', filename);
        if (fileType === 'image' || fileType === 'sticker') {
          detectImageDimensions(url, key);
        }
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

  // Detectar dimensiones y orientación de imagen
  const detectImageDimensions = (url: string, key: string) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const ratio = width / height;
      
      let orientation: 'landscape' | 'portrait' | 'square';
      if (ratio > 1.1) {
        orientation = 'landscape';
      } else if (ratio < 0.9) {
        orientation = 'portrait';
      } else {
        orientation = 'square';
      }
      
      setImageDimensions(prev => ({
        ...prev,
        [key]: { width, height, orientation }
      }));
    };
    img.src = url;
  };

  // Obtener clases CSS según orientación y tipo de imagen
  const getImageClasses = (key: string, fileType: string): string => {
    const dimensions = imageDimensions[key];
    
    if (!dimensions) {
      // Dimensiones por defecto mientras se carga
      return 'w-full max-w-sm h-auto';
    }

    const { orientation, width, height } = dimensions;
    
    // Stickers: siempre pequeños y compactos
    if (fileType === 'sticker') {
      return 'w-32 h-32 object-contain';
    }

    // Imágenes según orientación
    switch (orientation) {
      case 'landscape':
        // Horizontal: ancho completo pero limitado
        return 'w-full max-w-md h-auto object-cover';
      
      case 'portrait':
        // Vertical: altura limitada para no ocupar mucho espacio
        return 'w-auto max-w-xs max-h-96 object-cover';
      
      case 'square':
        // Cuadrada: tamaño mediano balanceado
        return 'w-full max-w-sm h-auto object-cover';
      
      default:
        return 'w-full max-w-sm h-auto object-cover';
    }
  };

  if (!adjuntos || adjuntos.length === 0) return null;

  return (
    <div ref={elementRef} className="space-y-2 mt-2">
      {adjuntos.map((adjunto, index) => {
        const filename = adjunto.filename || adjunto.archivo;
        const bucket = adjunto.bucket || 'whatsapp-media';
        
        if (!filename) return null; // Skip adjuntos sin filename
        
        const key = `${bucket}/${filename}`;
        const url = loadedUrls[key];
        const loading = loadingStates[key];
        const error = errors[key];
        const fileType = getFileType(adjunto.tipo || '', filename);

        return (
          <div key={index} className={`rounded-lg overflow-hidden ${
            fileType === 'sticker' ? '' : 'bg-slate-50 dark:bg-gray-700/50'
          }`}>
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
                  <p className="text-xs opacity-75">{filename}</p>
                </div>
              </div>
            )}

            {/* Sticker (sin fondo, más pequeño, estilo WhatsApp) */}
            {url && fileType === 'sticker' && (
              <div className="relative group inline-block">
                <img 
                  src={url} 
                  alt="Sticker" 
                  className={`${getImageClasses(key, 'sticker')} cursor-pointer hover:scale-105 transition-transform rounded-lg`}
                  onClick={() => window.open(url, '_blank')}
                  loading="lazy"
                  decoding="async"
                  style={{ imageRendering: 'auto' }}
                />
              </div>
            )}

            {/* Imagen */}
            {url && fileType === 'image' && (
              <div className="relative group">
                <img 
                  src={url} 
                  alt={adjunto.descripcion || 'Imagen'} 
                  className={`${getImageClasses(key, 'image')} rounded-lg cursor-pointer hover:opacity-90 transition-opacity`}
                  onClick={() => window.open(url, '_blank')}
                  loading="lazy"
                  decoding="async"
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
                    {filename}
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
                    {filename}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    {adjunto.tipo || 'Documento'} {adjunto.timestamp ? `• ${new Date(adjunto.timestamp).toLocaleDateString()}` : ''}
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

