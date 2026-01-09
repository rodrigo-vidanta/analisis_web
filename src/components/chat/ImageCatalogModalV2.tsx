// Golden Rules:
// 📚 Documentación: Ver src/components/chat/README.md para arquitectura del módulo Live Chat
// 📝 Cambios: Documentar en src/components/chat/CHANGELOG_LIVECHAT.md
// 📋 Verificación: Revisar CHANGELOG antes de modificar
// 🎨 Diseño: Modal V2 con virtualización, selección múltiple y diseño premium

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, Send, Eye, Image as ImageIcon, Filter, 
  Check, Trash2, Images, ChevronDown, Sparkles, Clock,
  MapPin, Building2, Loader2, CheckCircle2, XCircle
} from 'lucide-react';
import { analysisSupabase } from '../../config/analysisSupabase';
// DEPRECATED: ParaphraseModal deshabilitado temporalmente
// import { ParaphraseModal } from './ParaphraseModal';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// ============================================
// INTERFACES
// ============================================
interface ContentItem {
  id: string;
  nombre: string;
  tipo_contenido: string;
  descripcion: string;
  destinos: string[];
  resorts: string[];
  atracciones: string[];
  bucket: string;
  nombre_archivo: string;
  created_at: string;
}

interface ImageCatalogModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  onSendImage: (imageData: SendImageData) => void;
  selectedConversation: any;
  onImageSent?: (imageUrl: string, caption: string) => void;
  onPauseBot?: (uchatId: string, durationMinutes: number | null, force?: boolean) => Promise<boolean>;
}

interface SendImageData {
  archivo: string;
  destino: string;
  resort: string;
  caption?: string;
}

interface SelectedImage {
  item: ContentItem;
  url: string;
}

// ============================================
// CONSTANTS
// ============================================
const MAX_IMAGES = 4;
const CACHE_KEY = 'livechat_recent_images_v2';
const CACHE_SIZE = 8;
const IMAGES_PER_BATCH = 40;
const PRELOAD_BATCH_SIZE = 20; // Cantidad de imágenes a pre-cargar

// Cache global para URLs de imágenes (persistente entre renders)
const globalImageUrlCache: Record<string, string> = {};
// Tracking de requests en progreso para evitar duplicados
const pendingRequests: Record<string, Promise<string>> = {};
// Set de imágenes ya pre-cargadas en el navegador
const preloadedImages: Set<string> = new Set();

// ============================================
// HELPER: Pre-cargar imagen en el navegador
// ============================================
const preloadImageInBrowser = (url: string): Promise<void> => {
  return new Promise((resolve) => {
    if (!url || preloadedImages.has(url)) {
      resolve();
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      preloadedImages.add(url);
      resolve();
    };
    img.onerror = () => resolve(); // No fallar si una imagen no carga
    img.src = url;
  });
};

// ============================================
// HELPER: Pre-cargar batch de imágenes en background
// ============================================
const preloadImageBatch = async (items: ContentItem[], batchSize: number = PRELOAD_BATCH_SIZE): Promise<void> => {
  const validItems = items.filter(item => item?.bucket && item?.nombre_archivo).slice(0, batchSize);
  
  // Generar URLs en paralelo (con límite de concurrencia)
  const CONCURRENT_LIMIT = 5;
  for (let i = 0; i < validItems.length; i += CONCURRENT_LIMIT) {
    const batch = validItems.slice(i, i + CONCURRENT_LIMIT);
    const urlPromises = batch.map(item => generateImageUrl(item));
    const urls = await Promise.all(urlPromises);
    
    // Pre-cargar en el navegador
    await Promise.all(urls.filter(Boolean).map(url => preloadImageInBrowser(url)));
  }
};

// ============================================
// HELPER: Generar URL de imagen con cache y deduplicación
// ============================================
const generateImageUrl = async (item: ContentItem): Promise<string> => {
  // Validar que el item tenga los datos necesarios
  if (!item?.bucket || !item?.nombre_archivo) {
    console.warn('Item sin bucket o nombre_archivo:', item?.id);
    return '';
  }

  const cacheKey = `img_${item.bucket}/${item.nombre_archivo}`;
  
  // 1. Verificar cache en memoria
  if (globalImageUrlCache[cacheKey]) {
    return globalImageUrlCache[cacheKey];
  }

  // 2. Verificar localStorage
  try {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      if (parsed.url && parsed.timestamp && (Date.now() - parsed.timestamp) < 25 * 60 * 1000) {
        globalImageUrlCache[cacheKey] = parsed.url;
        return parsed.url;
      }
      localStorage.removeItem(cacheKey);
    }
  } catch (e) {
    // Ignorar errores de localStorage
  }

  // 3. Si ya hay una request en progreso para esta imagen, reutilizarla
  if (pendingRequests[cacheKey]) {
    return pendingRequests[cacheKey];
  }

  // 4. Crear nueva request
  pendingRequests[cacheKey] = (async () => {
    try {
      const response = await fetch('https://function-bun-dev-6d8e.up.railway.app/generar-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': '93fbcfc4-ccc9-4023-b820-86ef98f10122'
        },
        body: JSON.stringify({
          filename: item.nombre_archivo,
          bucket: item.bucket,
          expirationMinutes: 30
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const url = data[0]?.url || data.url || '';
      
      if (url) {
        globalImageUrlCache[cacheKey] = url;
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ url, timestamp: Date.now() }));
        } catch (e) {
          // localStorage lleno, ignorar
        }
      }
      
      return url;
    } catch (error) {
      console.error('Error generating image URL:', error);
      return '';
    } finally {
      // Limpiar request pendiente después de un delay
      setTimeout(() => {
        delete pendingRequests[cacheKey];
      }, 1000);
    }
  })();

  return pendingRequests[cacheKey];
};

// ============================================
// MAIN COMPONENT
// ============================================
export const ImageCatalogModalV2: React.FC<ImageCatalogModalV2Props> = ({
  isOpen,
  onClose,
  onSendImage,
  selectedConversation,
  onImageSent,
  onPauseBot
}) => {
  const { user } = useAuth();
  
  // Estados principales
  const [images, setImages] = useState<ContentItem[]>([]);
  const [filteredImages, setFilteredImages] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestino, setSelectedDestino] = useState<string>('all');
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Selección múltiple
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [previewImage, setPreviewImage] = useState<ContentItem | null>(null);
  
  // Envío
  const [showSendModal, setShowSendModal] = useState(false);
  // DEPRECATED: Caption deshabilitado temporalmente
  // const [caption, setCaption] = useState('');
  const caption = ''; // Siempre vacío mientras está deprecado
  const [sending, setSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState<{ current: number; total: number } | null>(null);
  const isSendingRef = useRef(false);
  
  // DEPRECATED: Parafraseo deshabilitado temporalmente
  // const [showParaphraseModal, setShowParaphraseModal] = useState(false);
  // const [textToParaphrase, setTextToParaphrase] = useState('');
  const showParaphraseModal = false; // Siempre false mientras está deprecado
  
  // Virtualización
  const [visibleCount, setVisibleCount] = useState(IMAGES_PER_BATCH);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Recientes
  const [recentImages, setRecentImages] = useState<ContentItem[]>([]);
  
  // Datos del prospecto
  const [prospectoData, setProspectoData] = useState<{
    whatsapp: string;
    id_uchat: string;
  } | null>(null);

  // Refs para evitar loops
  const hasLoadedRef = useRef(false);
  const conversationIdRef = useRef<string | null>(null);

  // ============================================
  // EFFECTS
  // ============================================
  
  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (!isOpen) {
      hasLoadedRef.current = false;
      return;
    }

    const conversationId = selectedConversation?.id;
    
    // Evitar recargar si ya cargamos para esta conversación
    if (hasLoadedRef.current && conversationIdRef.current === conversationId) {
      return;
    }

    hasLoadedRef.current = true;
    conversationIdRef.current = conversationId;

    loadCachedRecents();
    loadImages();
    loadProspectoData();
    setSelectedImages([]);
    // DEPRECATED: setCaption(''); - caption deshabilitado
    setVisibleCount(IMAGES_PER_BATCH);
  }, [isOpen, selectedConversation?.id]);

  // Filtrar imágenes (con debounce implícito por useMemo)
  useEffect(() => {
    let filtered = images;

    if (selectedDestino !== 'all') {
      filtered = filtered.filter(img => img.destinos?.includes(selectedDestino));
    }

    if (selectedResort !== 'all') {
      filtered = filtered.filter(img => img.resorts?.includes(selectedResort));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(img => 
        img.nombre?.toLowerCase().includes(term) ||
        img.descripcion?.toLowerCase().includes(term) ||
        img.destinos?.some(d => d.toLowerCase().includes(term)) ||
        img.resorts?.some(r => r.toLowerCase().includes(term)) ||
        img.atracciones?.some(a => a.toLowerCase().includes(term))
      );
    }
    
    setFilteredImages(filtered);
    setVisibleCount(IMAGES_PER_BATCH);
  }, [searchTerm, selectedDestino, selectedResort, images]);

  // ============================================
  // LOADERS
  // ============================================
  
  const loadCachedRecents = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Filtrar items válidos
        const valid = parsed.filter((item: ContentItem) => item?.id && item?.bucket && item?.nombre_archivo);
        setRecentImages(valid);
        
        // Pre-cargar imágenes recientes inmediatamente
        if (valid.length > 0) {
          preloadImageBatch(valid, valid.length).catch(console.error);
        }
      }
    } catch (e) {
      console.error('Error loading cache:', e);
    }
  };

  const loadProspectoData = async () => {
    if (!selectedConversation?.prospecto_id) return;

    try {
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('whatsapp, id_uchat')
        .eq('id', selectedConversation.prospecto_id)
        .single();

      if (!error && data) {
        setProspectoData({ whatsapp: data.whatsapp, id_uchat: data.id_uchat });
      }
    } catch (error) {
      console.error('Error loading prospecto data:', error);
    }
  };

  const loadImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await analysisSupabase
        .from('content_management')
        .select('*')
        .eq('tipo_contenido', 'imagen')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      
      // Filtrar imágenes válidas (con bucket y nombre_archivo)
      const validImages = (data || []).filter(
        (img: ContentItem) => img.bucket && img.nombre_archivo
      );
      
      setImages(validImages);
      setFilteredImages(validImages);

      // Pre-cargar las primeras imágenes en background para mejor UX
      // Esto hace que las imágenes estén listas cuando el usuario las vea
      setTimeout(() => {
        preloadImageBatch(validImages, PRELOAD_BATCH_SIZE).catch(console.error);
      }, 100);
      
    } catch (error) {
      console.error('Error loading images:', error);
      toast.error('Error al cargar imágenes');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // SELECTION HANDLERS
  // ============================================
  
  const handleSelectImage = useCallback(async (item: ContentItem) => {
    // Validar item
    if (!item?.bucket || !item?.nombre_archivo) {
      toast.error('Imagen no válida');
      return;
    }

    setSelectedImages(prev => {
      const isAlreadySelected = prev.some(s => s.item.id === item.id);
      
      if (isAlreadySelected) {
        return prev.filter(s => s.item.id !== item.id);
      } else {
        if (prev.length >= MAX_IMAGES) {
          toast.error(`Máximo ${MAX_IMAGES} imágenes permitidas`);
          return prev;
        }
        
        // Generar URL en background
        generateImageUrl(item).then(url => {
          if (url) {
            setSelectedImages(current => {
              // Verificar que aún no está agregada (race condition)
              if (current.some(s => s.item.id === item.id)) return current;
              if (current.length >= MAX_IMAGES) return current;
              return [...current, { item, url }];
            });
          }
        });
        
        // Agregar a recientes
        addToRecentImages(item);
        
        return prev; // El estado se actualizará cuando llegue la URL
      }
    });
  }, []);

  const handleRemoveSelected = useCallback((itemId: string) => {
    setSelectedImages(prev => prev.filter(s => s.item.id !== itemId));
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedImages([]);
  }, []);

  const addToRecentImages = (item: ContentItem) => {
    setRecentImages(prev => {
      const updated = [item, ...prev.filter(i => i.id !== item.id)].slice(0, CACHE_SIZE);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      } catch (e) {
        // localStorage lleno
      }
      return updated;
    });
  };

  // ============================================
  // SEND HANDLERS
  // ============================================
  
  // DEPRECATED: Caption deshabilitado temporalmente
  // const handleCaptionChange = useCallback((value: string) => {
  //   let cleaned = value.replace(/[\n\r]/g, ' ');
  //   cleaned = cleaned.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,!?¿¡]/g, '');
  //   if (cleaned.length > 80) cleaned = cleaned.substring(0, 80);
  //   setCaption(cleaned);
  // }, []);
  const handleCaptionChange = useCallback((_value: string) => {
    // DEPRECATED: No hace nada mientras caption está deshabilitado
  }, []);

  const handleOpenSendModal = useCallback(() => {
    if (selectedImages.length === 0) {
      toast.error('Selecciona al menos una imagen');
      return;
    }
    setShowSendModal(true);
  }, [selectedImages.length]);

  // Ref para mantener las imágenes a enviar (se congela al iniciar el envío)
  const imagesToSendRef = useRef<SelectedImage[]>([]);

  // Enviar imágenes - Envía directamente sin caption (DEPRECATED: parafraseo)
  const handleSendImages = useCallback(async () => {
    if (selectedImages.length === 0) return;

    if (!prospectoData?.whatsapp || !prospectoData?.id_uchat) {
      toast.error('Faltan datos del prospecto');
      return;
    }

    // CONGELAR las imágenes seleccionadas en este momento
    imagesToSendRef.current = [...selectedImages];
    console.log('🔒 Imágenes congeladas para envío:', imagesToSendRef.current.map(s => s.item.nombre_archivo));

    // DEPRECATED: Lógica de caption/parafraseo comentada
    // if (caption.trim()) {
    //   setTextToParaphrase(caption);
    //   setShowSendModal(false);
    //   setShowParaphraseModal(true);
    // } else {
    //   executeImageSend('');
    // }
    
    // Enviar directamente sin caption
    executeImageSend('');
  }, [selectedImages, prospectoData]);

  // Función que ejecuta el envío real (separada para evitar closures)
  const executeImageSend = async (finalCaption: string) => {
    // Obtener el ID del usuario logueado
    const loggedUserId = user?.id;
    if (!loggedUserId) {
      toast.error('Error: Usuario no autenticado');
      return;
    }

    if (!prospectoData?.whatsapp || !prospectoData?.id_uchat) {
      toast.error('Faltan datos del prospecto');
      return;
    }

    // Usar las imágenes congeladas
    const imagesToSend = imagesToSendRef.current;
    
    if (imagesToSend.length === 0) {
      toast.error('No hay imágenes seleccionadas');
      return;
    }

    if (isSendingRef.current) {
      console.warn('⚠️ Ya hay un envío en progreso');
      return;
    }

    // CERRAR TODO INMEDIATAMENTE antes de empezar el envío
    // DEPRECATED: setShowParaphraseModal(false); - parafraseo deshabilitado
    setShowSendModal(false);
    setSelectedImages([]);
    // DEPRECATED: setCaption(''); - caption deshabilitado
    onClose();

    console.log('📤 Iniciando envío de', imagesToSend.length, 'imágenes');
    imagesToSend.forEach((img, i) => {
      console.log(`  ${i + 1}. ${img.item.nombre_archivo} (${img.item.id})`);
    });

    isSendingRef.current = true;
    const totalImages = imagesToSend.length;
    
    // Generar ID de batch único para esta sesión de envío
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    console.log(`🚀 Batch ID: ${batchId}`);

    try {
      for (let i = 0; i < totalImages; i++) {
        const currentImage = imagesToSend[i];
        const currentItem = currentImage.item;
        const currentUrl = currentImage.url;
        const isLast = i === totalImages - 1;
        
        // ID único para ESTA imagen específica
        const imageRequestId = `${batchId}_img${i + 1}`;
        
        console.log(`📸 [${i + 1}/${totalImages}] ID: ${imageRequestId}`);
        console.log(`   Archivo: ${currentItem.nombre_archivo}`);
        
        // CAPTION SOLO EN LA ÚLTIMA IMAGEN
        const captionForThisImage = (isLast && finalCaption && finalCaption.trim()) ? finalCaption.trim() : null;

        // UI optimista
        if (onImageSent) {
          onImageSent(currentUrl, captionForThisImage || '');
        }

        // Construir payload con ID único
        const payloadItem: Record<string, any> = {
          request_id: imageRequestId, // ID único para tracking
          whatsapp: prospectoData.whatsapp,
          uchat_id: prospectoData.id_uchat,
          id_sender: loggedUserId,
          imagenes: [{
            archivo: currentItem.nombre_archivo,
            destino: currentItem.destinos?.[0] || '',
            resort: currentItem.resorts?.[0] || ''
          }]
        };

        // Solo agregar caption si corresponde
        if (captionForThisImage) {
          payloadItem.caption = captionForThisImage;
          console.log(`   ✍️ Con caption: "${captionForThisImage}"`);
        } else {
          console.log(`   📷 Sin caption`);
        }

        const payload = [payloadItem];
        console.log(`   📦 Payload:`, JSON.stringify(payload));

        const proxyUrl = `${import.meta.env.VITE_SYSTEM_UI_SUPABASE_URL}/functions/v1/send-img-proxy`;
        const authToken = import.meta.env.VITE_SYSTEM_UI_SUPABASE_ANON_KEY;
        
        // Enviar (el request_id ya viaja dentro del payload)
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`   ❌ Error:`, errorText);
          throw new Error(`Error al enviar imagen ${i + 1}`);
        }

        // Esperar y leer respuesta completa
        const responseData = await response.json();
        console.log(`   ✅ Respuesta:`, responseData);

        // Pausa MUY LARGA entre envíos para evitar race condition en uChat
        // N8N setea una variable en uChat y luego dispara un flujo
        // Si enviamos otra imagen antes de que uChat termine, sobrescribe la variable
        // 8 segundos = tiempo para que N8N complete + uChat procese + buffer
        if (!isLast) {
          console.log(`   ⏳ Esperando 8s antes de la siguiente imagen (evitar race condition en uChat)...`);
          await new Promise(resolve => setTimeout(resolve, 8000));
        }
      }

      // Pausar bot
      if (onPauseBot && prospectoData.id_uchat) {
        try {
          await onPauseBot(prospectoData.id_uchat, 1, false);
        } catch (error) {
          console.error('Error pausando bot:', error);
        }
      }

      toast.success(`${totalImages} imagen${totalImages > 1 ? 'es' : ''} enviada${totalImages > 1 ? 's' : ''}`);

    } catch (error) {
      console.error('❌ Error en envío:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      isSendingRef.current = false;
      imagesToSendRef.current = [];
    }
  };

  // ============================================
  // INFINITE SCROLL
  // ============================================
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    if (scrollHeight - scrollTop - clientHeight < 200) {
      setVisibleCount(prev => {
        if (prev >= filteredImages.length) return prev;
        const newCount = Math.min(prev + IMAGES_PER_BATCH, filteredImages.length);
        
        // Pre-cargar el siguiente batch de imágenes
        const nextBatch = filteredImages.slice(prev, newCount);
        if (nextBatch.length > 0) {
          preloadImageBatch(nextBatch, nextBatch.length).catch(console.error);
        }
        
        return newCount;
      });
    }
  }, [filteredImages]);

  // ============================================
  // COMPUTED VALUES
  // ============================================
  
  const visibleImages = useMemo(() => 
    filteredImages.slice(0, visibleCount), 
    [filteredImages, visibleCount]
  );

  const destinosUnicos = useMemo(() => 
    Array.from(new Set(images.flatMap(img => img.destinos || []))).filter(Boolean).sort(),
    [images]
  );

  const resortsUnicos = useMemo(() => 
    Array.from(new Set(images.flatMap(img => img.resorts || []))).filter(Boolean).sort(),
    [images]
  );

  const selectedImageIds = useMemo(() => 
    new Set(selectedImages.map(s => s.item.id)),
    [selectedImages]
  );

  // ============================================
  // RENDER
  // ============================================
  
  if (!isOpen) return null;

  const modalContent = (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={onClose}
            style={{ zIndex: 2147483647 }} // Max z-index value
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800"
            >
              {/* ============================================
                  HEADER
                  ============================================ */}
              <div className="relative px-6 py-5 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-0.5 shadow-lg"
                    >
                      <div className="w-full h-full rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center">
                        <Images className="w-6 h-6 text-blue-500" />
                      </div>
                    </motion.div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Galería de Imágenes
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {filteredImages.length} imágenes disponibles
                        {selectedImages.length > 0 && (
                          <span className="ml-2 text-blue-500 font-medium">
                            • {selectedImages.length}/{MAX_IMAGES} seleccionadas
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <motion.button
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.2 }}
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group"
                  >
                    <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                  </motion.button>
                </div>

                {/* Search & Filters */}
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nombre, destino, resort..."
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2.5 rounded-xl border transition-all duration-200 flex items-center space-x-2 ${
                      showFilters || selectedDestino !== 'all' || selectedResort !== 'all'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-medium">Filtros</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Expanded Filters - Dynamic Chips */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-3">
                        {/* Destinos - Chips */}
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <MapPin className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Destinos</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setSelectedDestino('all')}
                              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                                selectedDestino === 'all'
                                  ? 'bg-blue-500 text-white shadow-md'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                              }`}
                            >
                              Todos
                            </motion.button>
                            {destinosUnicos.map(destino => (
                              <motion.button
                                key={destino}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedDestino(selectedDestino === destino ? 'all' : destino)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                                  selectedDestino === destino
                                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400'
                                }`}
                              >
                                📍 {destino}
                              </motion.button>
                            ))}
                          </div>
                        </div>

                        {/* Resorts - Chips */}
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <Building2 className="w-4 h-4 text-purple-500" />
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Resorts</span>
                          </div>
                          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setSelectedResort('all')}
                              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                                selectedResort === 'all'
                                  ? 'bg-purple-500 text-white shadow-md'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                              }`}
                            >
                              Todos
                            </motion.button>
                            {resortsUnicos.map(resort => (
                              <motion.button
                                key={resort}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedResort(selectedResort === resort ? 'all' : resort)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                                  selectedResort === resort
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400'
                                }`}
                              >
                                🏨 {resort}
                              </motion.button>
                            ))}
                          </div>
                        </div>

                        {/* Active Filters Summary & Clear */}
                        {(selectedDestino !== 'all' || selectedResort !== 'all') && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                              <Filter className="w-4 h-4" />
                              <span>Filtros activos:</span>
                              {selectedDestino !== 'all' && (
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs">
                                  {selectedDestino}
                                </span>
                              )}
                              {selectedResort !== 'all' && (
                                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs">
                                  {selectedResort}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setSelectedDestino('all');
                                setSelectedResort('all');
                              }}
                              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                            >
                              <X className="w-3 h-3" />
                              <span>Limpiar</span>
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ============================================
                  CONTENT AREA
                  ============================================ */}
              <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
              >
                {/* Recent Images */}
                {recentImages.length > 0 && searchTerm === '' && selectedDestino === 'all' && selectedResort === 'all' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                  >
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-1 h-5 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>Usadas Recientemente</span>
                      </h4>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {recentImages.map(item => (
                        <LazyImageCard
                          key={`recent-${item.id}`}
                          item={item}
                          isSelected={selectedImageIds.has(item.id)}
                          onSelect={() => handleSelectImage(item)}
                          onPreview={() => setPreviewImage(item)}
                        />
                      ))}
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 mt-4" />
                  </motion.div>
                )}

                {/* Main Grid */}
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Cargando imágenes...</p>
                  </div>
                ) : filteredImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                    <ImageIcon className="w-20 h-20 mb-4 opacity-30" />
                    <p className="text-lg font-medium">No se encontraron imágenes</p>
                    <p className="text-sm">Intenta con otros términos de búsqueda</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
                      {visibleImages.map((item, index) => (
                        <LazyImageCard
                          key={item.id}
                          item={item}
                          isSelected={selectedImageIds.has(item.id)}
                          onSelect={() => handleSelectImage(item)}
                          onPreview={() => setPreviewImage(item)}
                          index={index}
                        />
                      ))}
                    </div>

                    {/* Load More Indicator */}
                    {visibleCount < filteredImages.length && (
                      <div className="flex justify-center py-6">
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Cargando más imágenes... ({visibleCount} de {filteredImages.length})</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ============================================
                  SELECTION BAR (Floating)
                  ============================================ */}
              <AnimatePresence>
                {selectedImages.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Selected Thumbnails */}
                        <div className="flex items-center space-x-2">
                          {selectedImages.map(({ item, url }, idx) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="relative group"
                            >
                              <div className="w-14 h-14 rounded-lg overflow-hidden border-2 border-blue-500 shadow-lg">
                                <img
                                  src={url}
                                  alt={item.nombre}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <button
                                onClick={() => handleRemoveSelected(item.id)}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md">
                                {idx + 1}
                              </span>
                            </motion.div>
                          ))}

                          {/* Empty slots */}
                          {Array.from({ length: MAX_IMAGES - selectedImages.length }).map((_, idx) => (
                            <div
                              key={`empty-${idx}`}
                              className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center"
                            >
                              <ImageIcon className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                            </div>
                          ))}
                        </div>

                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-gray-900 dark:text-white">{selectedImages.length}</span> de {MAX_IMAGES} imágenes
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={handleClearSelection}
                          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Limpiar</span>
                        </button>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleOpenSendModal}
                          className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center space-x-2"
                        >
                          <Send className="w-4 h-4" />
                          <span>Enviar {selectedImages.length > 1 ? `${selectedImages.length} imágenes` : 'imagen'}</span>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================
          PREVIEW MODAL
          ============================================ */}
      <AnimatePresence>
        {previewImage && (
          <PreviewModalV2
            item={previewImage}
            onClose={() => setPreviewImage(null)}
            onSelect={() => {
              handleSelectImage(previewImage);
              setPreviewImage(null);
            }}
            isSelected={selectedImageIds.has(previewImage.id)}
          />
        )}
      </AnimatePresence>

      {/* ============================================
          SEND MODAL
          ============================================ */}
      <AnimatePresence>
        {showSendModal && (
          <SendModalV2
            selectedImages={selectedImages}
            caption={caption}
            onCaptionChange={handleCaptionChange}
            onSend={handleSendImages}
            onClose={() => setShowSendModal(false)}
            sending={sending}
            sendingProgress={sendingProgress}
          />
        )}
      </AnimatePresence>

      {/* ============================================
          DEPRECATED: PARAPHRASE MODAL - Deshabilitado temporalmente
          ============================================ */}
      {/* 
      <AnimatePresence>
        {showParaphraseModal && (
          <ParaphraseModal
            isOpen={showParaphraseModal}
            originalText={textToParaphrase}
            context="input_send_image_livechat"
            onSelect={(paraphrasedText) => {
              executeImageSend(paraphrasedText);
            }}
            onCancel={() => {
              setShowParaphraseModal(false);
              setShowSendModal(true);
            }}
          />
        )}
      </AnimatePresence>
      */}
    </>
  );

  // Usar createPortal para renderizar en el root del documento
  return createPortal(modalContent, document.body);
};

// ============================================
// LAZY IMAGE CARD COMPONENT (Memoized)
// ============================================
interface LazyImageCardProps {
  item: ContentItem;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  index?: number;
}

const LazyImageCard = memo<LazyImageCardProps>(({ 
  item, 
  isSelected, 
  onSelect, 
  onPreview,
  index = 0
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  
  // IntersectionObserver para lazy loading real
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadedRef.current) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '150px' }
    );
    
    observer.observe(element);
    
    return () => observer.disconnect();
  }, []);
  
  // Cargar URL solo cuando es visible
  useEffect(() => {
    if (!isVisible || loadedRef.current) return;
    if (!item?.bucket || !item?.nombre_archivo) {
      setError(true);
      setLoading(false);
      return;
    }

    loadedRef.current = true;

    generateImageUrl(item)
      .then(newUrl => {
        if (newUrl) {
          setUrl(newUrl);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [isVisible, item?.id, item?.bucket, item?.nombre_archivo]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.015, 0.2), duration: 0.15 }}
      className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' 
          : 'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600'
      }`}
      onClick={onSelect}
    >
      {/* Background/Loading State */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
        {loading && isVisible && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>
      
      {/* Image */}
      {url && !error && (
        <img
          src={url}
          alt={item.nombre || 'Imagen'}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
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
          <Check className="w-4 h-4 text-white" />
        ) : (
          <div className="w-3 h-3 rounded-full border-2 border-white"></div>
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
    </motion.div>
  );
});

LazyImageCard.displayName = 'LazyImageCard';

// ============================================
// PREVIEW MODAL V2
// ============================================
interface PreviewModalV2Props {
  item: ContentItem;
  onClose: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

const PreviewModalV2: React.FC<PreviewModalV2Props> = ({ item, onClose, onSelect, isSelected }) => {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateImageUrl(item).then(newUrl => {
      setUrl(newUrl);
      setLoading(false);
    });
  }, [item]);

  const content = (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-lg p-4"
      onClick={onClose}
      style={{ zIndex: 2147483647 }}
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
        
        {/* Image */}
        <div className="relative max-h-[70vh] w-auto">
          {loading ? (
            <div className="w-96 h-64 flex items-center justify-center bg-gray-800/50 rounded-xl">
              <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : (
            <img
              src={url}
              alt={item.nombre}
              className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl"
            />
          )}
        </div>
        
        {/* Info Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-4 p-4 bg-white/10 backdrop-blur-md rounded-xl w-full max-w-2xl"
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
};

// ============================================
// SEND MODAL V2
// ============================================
interface SendModalV2Props {
  selectedImages: SelectedImage[];
  caption: string;
  onCaptionChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
  sending: boolean;
  sendingProgress: { current: number; total: number } | null;
}

const SendModalV2: React.FC<SendModalV2Props> = ({
  selectedImages,
  caption,
  onCaptionChange,
  onSend,
  onClose,
  sending,
  sendingProgress
}) => {
  const content = (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}
      style={{ zIndex: 2147483647 }}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Enviar {selectedImages.length > 1 ? `${selectedImages.length} imágenes` : 'imagen'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedImages.length > 1 
                  ? 'Se enviarán las imágenes seleccionadas'
                  : 'Confirma el envío de la imagen'}
              </p>
              {/* DEPRECATED: Texto sobre mensaje opcional
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedImages.length > 1 
                  ? 'El mensaje se adjuntará solo a la última imagen'
                  : 'Agrega un mensaje opcional'}
              </p>
              */}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Images Preview */}
          <div className="flex items-center justify-center space-x-3">
            {selectedImages.map(({ item, url }, idx) => (
              <motion.div
                key={item.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="relative"
              >
                <div className={`w-24 h-24 rounded-xl overflow-hidden border-2 shadow-lg ${
                  idx === selectedImages.length - 1 && selectedImages.length > 1
                    ? 'border-purple-500'
                    : 'border-gray-200 dark:border-gray-700'
                }`}>
                  <img
                    src={url}
                    alt={item.nombre}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md">
                  {idx + 1}
                </span>
                {/* DEPRECATED: Indicador de mensaje en última imagen
                {idx === selectedImages.length - 1 && selectedImages.length > 1 && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-purple-500 text-white text-[10px] font-medium rounded-full whitespace-nowrap">
                    + mensaje
                  </span>
                )}
                */}
              </motion.div>
            ))}
          </div>

          {/* DEPRECATED: Caption Input - Deshabilitado temporalmente
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Mensaje {selectedImages.length > 1 ? '(última imagen)' : '(opcional)'}</span>
              <span className="ml-auto text-gray-400">{caption.length}/80</span>
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="Escribe un mensaje para acompañar la imagen..."
              maxLength={80}
              disabled={sending}
              className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 disabled:opacity-50"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Solo letras, números y puntuación básica (.,!?¿¡)
            </p>
          </div>
          */}

          {/* Sending Progress */}
          {sendingProgress && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Enviando imagen {sendingProgress.current} de {sendingProgress.total}
                </span>
                <span className="text-sm text-blue-500">
                  {Math.round((sendingProgress.current / sendingProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(sendingProgress.current / sendingProgress.total) * 100}%` }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end items-center space-x-3 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          {/* Botón único de envío */}
          <motion.button
            whileHover={{ scale: sending ? 1 : 1.02 }}
            whileTap={{ scale: sending ? 1 : 0.98 }}
            onClick={onSend}
            disabled={sending}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center space-x-2"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar</span>
              </>
            )}
            {/* DEPRECATED: Lógica de parafraseo en botón
            ) : caption.trim() ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Parafrasear y Enviar</span>
              </>
            */}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(content, document.body);
};

export default ImageCatalogModalV2;
