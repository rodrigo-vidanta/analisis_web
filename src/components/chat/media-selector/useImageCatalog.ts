import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { analysisSupabase } from '../../../config/analysisSupabase';
import { useAuth } from '../../../contexts/AuthContext';
import { authenticatedEdgeFetch } from '../../../utils/authenticatedFetch';
import toast from 'react-hot-toast';
import { getImageUrlCached } from './imageCacheService';
import {
  MAX_IMAGES,
  IMAGES_PER_BATCH,
  CACHE_KEY,
  CACHE_SIZE
} from './constants';
import type { ContentItem, SelectedImage, ProspectoData } from './types';

/**
 * Genera la URL del thumbnail estatico para una imagen.
 * Los thumbnails se sirven desde public/thumbnails/{hash}.webp
 */
function getThumbnailUrl(nombreArchivo: string): string {
  const baseName = nombreArchivo.replace(/\.[^.]+$/, '');
  return `/thumbnails/${baseName}.webp`;
}

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UseImageCatalogReturn {
  // Data
  images: ContentItem[];
  filteredImages: ContentItem[];
  loading: boolean;
  recentImages: ContentItem[];

  // Filters
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedDestino: string;
  setSelectedDestino: (destino: string) => void;
  selectedResort: string;
  setSelectedResort: (resort: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;

  // Computed
  destinosUnicos: string[];
  resortsUnicos: string[];
  visibleImages: ContentItem[];
  selectedImageIds: Set<string>;

  // Selection
  selectedImages: SelectedImage[];
  handleSelectImage: (item: ContentItem) => void;
  handleRemoveSelected: (itemId: string) => void;
  handleClearSelection: () => void;

  // Scroll
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  visibleCount: number;
  totalFiltered: number;

  // Send
  handleOpenSendModal: () => void;
  handleSendImages: () => void;
  sending: boolean;
  sendingProgress: { current: number; total: number } | null;
  showSendModal: boolean;
  setShowSendModal: (show: boolean) => void;

  // Preview
  previewImage: ContentItem | null;
  setPreviewImage: (item: ContentItem | null) => void;

  // Image URL
  getImageUrl: (item: ContentItem) => Promise<string>;
}

// ============================================
// HOOK
// ============================================

export function useImageCatalog(
  isOpen: boolean,
  selectedConversation: { id: string; prospecto_id?: string; [key: string]: unknown } | null,
  onClose: () => void,
  onImageSent?: (imageUrl: string, caption: string) => void,
  onPauseBot?: (id: string, durationMinutes: number | null, force?: boolean) => Promise<boolean>
): UseImageCatalogReturn {
  const { user } = useAuth();

  // Data state
  const [images, setImages] = useState<ContentItem[]>([]);
  const [filteredImages, setFilteredImages] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentImages, setRecentImages] = useState<ContentItem[]>([]);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestino, setSelectedDestino] = useState<string>('all');
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Selection state
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);

  // Preview state
  const [previewImage, setPreviewImage] = useState<ContentItem | null>(null);

  // Send state
  const [showSendModal, setShowSendModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState<{ current: number; total: number } | null>(null);
  const isSendingRef = useRef(false);
  const imagesToSendRef = useRef<SelectedImage[]>([]);

  // Scroll state
  const [visibleCount, setVisibleCount] = useState(IMAGES_PER_BATCH);

  // Refs
  const hasLoadedRef = useRef(false);
  const conversationIdRef = useRef<string | null>(null);

  // Prospecto data
  const [prospectoData, setProspectoData] = useState<ProspectoData | null>(null);

  // ============================================
  // LOADERS
  // ============================================

  const loadCachedRecents = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const valid = parsed.filter(
          (item: ContentItem) => item?.id && item?.bucket && item?.nombre_archivo
        );
        setRecentImages(valid);
      }
    } catch {
      // Ignorar errores de cache
    }
  }, []);

  const loadProspectoData = useCallback(async () => {
    if (!selectedConversation?.prospecto_id) return;
    try {
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('whatsapp, id_uchat, whatsapp_provider')
        .eq('id', selectedConversation.prospecto_id)
        .single();

      if (!error && data) {
        setProspectoData({
          whatsapp: data.whatsapp,
          id_uchat: data.id_uchat || undefined,
          whatsapp_provider: data.whatsapp_provider || 'uchat'
        });
      }
    } catch (error) {
      console.error('Error loading prospecto data:', error);
    }
  }, [selectedConversation?.prospecto_id]);

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await analysisSupabase
        .from('content_management')
        .select('*')
        .eq('tipo_contenido', 'imagen')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const validImages = (data || []).filter(
        (img: ContentItem) => img.bucket && img.nombre_archivo
      );

      setImages(validImages);
      setFilteredImages(validImages);
    } catch (error) {
      console.error('Error loading images:', error);
      toast.error('Error al cargar imagenes');
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  // Cargar datos al abrir el modal
  useEffect(() => {
    if (!isOpen) {
      hasLoadedRef.current = false;
      return;
    }

    const conversationId = selectedConversation?.id;
    if (hasLoadedRef.current && conversationIdRef.current === conversationId) {
      return;
    }

    hasLoadedRef.current = true;
    conversationIdRef.current = conversationId || null;

    loadCachedRecents();
    loadImages();
    loadProspectoData();
    setSelectedImages([]);
    setVisibleCount(IMAGES_PER_BATCH);
  }, [isOpen, selectedConversation?.id, loadCachedRecents, loadImages, loadProspectoData]);

  // Filtrar imagenes
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
  // SELECTION HANDLERS
  // ============================================

  const addToRecentImages = useCallback((item: ContentItem) => {
    setRecentImages(prev => {
      const updated = [item, ...prev.filter(i => i.id !== item.id)].slice(0, CACHE_SIZE);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      } catch {
        // localStorage lleno
      }
      return updated;
    });
  }, []);

  const handleSelectImage = useCallback((item: ContentItem) => {
    if (!item?.bucket || !item?.nombre_archivo) {
      toast.error('Imagen no valida');
      return;
    }

    setSelectedImages(prev => {
      const isAlreadySelected = prev.some(s => s.item.id === item.id);

      if (isAlreadySelected) {
        return prev.filter(s => s.item.id !== item.id);
      }

      if (prev.length >= MAX_IMAGES) {
        toast.error(`Maximo ${MAX_IMAGES} imagenes permitidas`);
        return prev;
      }

      // Usar thumbnail estatico para seleccion instantanea (sin async)
      const thumbnailUrl = getThumbnailUrl(item.nombre_archivo);
      addToRecentImages(item);
      return [...prev, { item, url: thumbnailUrl }];
    });
  }, [addToRecentImages]);

  const handleRemoveSelected = useCallback((itemId: string) => {
    setSelectedImages(prev => prev.filter(s => s.item.id !== itemId));
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedImages([]);
  }, []);

  // ============================================
  // SEND HANDLERS
  // ============================================

  const handleOpenSendModal = useCallback(() => {
    if (selectedImages.length === 0) {
      toast.error('Selecciona al menos una imagen');
      return;
    }
    setShowSendModal(true);
  }, [selectedImages.length]);

  const executeImageSend = useCallback(async () => {
    const loggedUserId = user?.id;
    if (!loggedUserId) {
      toast.error('Error: Usuario no autenticado');
      return;
    }

    if (!prospectoData?.whatsapp) {
      toast.error('No se puede enviar: falta número WhatsApp del prospecto');
      return;
    }

    const imagesToSend = imagesToSendRef.current;
    if (imagesToSend.length === 0) {
      toast.error('No hay imagenes seleccionadas');
      return;
    }

    if (isSendingRef.current) return;

    // Cerrar todo inmediatamente
    setShowSendModal(false);
    setSelectedImages([]);
    onClose();

    isSendingRef.current = true;
    const totalImages = imagesToSend.length;

    try {
      for (let i = 0; i < totalImages; i++) {
        const currentImage = imagesToSend[i];
        const currentUrl = currentImage.url;
        const isLast = i === totalImages - 1;

        // UI optimista
        if (onImageSent) {
          onImageSent(currentUrl, '');
        }

        // Envío unificado via send-message-proxy → /webhook/send-message
        const imgPayload: Record<string, unknown> = {
          whatsapp: prospectoData.whatsapp,
          imagenes: [currentImage.item.nombre_archivo],
          id_sender: loggedUserId,
        };

        const response = await authenticatedEdgeFetch('send-message-proxy', {
          body: imgPayload
        });

        const result = await response.json().catch(() => null);
        if (!response.ok || result?.success === false) {
          const errorMsg = result?.error || `Error ${response.status}`;
          console.error(`Error enviando imagen ${i + 1}:`, errorMsg);
          throw new Error(`Error al enviar imagen ${i + 1}: ${errorMsg}`);
        }

        // Pausa entre envíos (2s rate limit)
        if (!isLast) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Pausar bot por prospecto_id
      if (onPauseBot) {
        try {
          const pauseId = selectedConversation?.prospecto_id;
          if (pauseId) {
            await onPauseBot(pauseId, 1, false);
          }
        } catch (error) {
          console.error('Error pausando bot:', error);
        }
      }

      toast.success(`${totalImages} imagen${totalImages > 1 ? 'es' : ''} enviada${totalImages > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error en envio:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      isSendingRef.current = false;
      imagesToSendRef.current = [];
    }
  }, [user?.id, prospectoData, selectedConversation?.prospecto_id, onClose, onImageSent, onPauseBot]);

  const handleSendImages = useCallback(() => {
    if (selectedImages.length === 0) return;
    if (!prospectoData?.whatsapp) {
      toast.error('No se puede enviar: falta número WhatsApp del prospecto');
      return;
    }
    imagesToSendRef.current = [...selectedImages];
    executeImageSend();
  }, [selectedImages, prospectoData, executeImageSend]);

  // ============================================
  // SCROLL
  // ============================================

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;

    if (scrollHeight - scrollTop - clientHeight < 200) {
      setVisibleCount(prev => {
        if (prev >= filteredImages.length) return prev;
        return Math.min(prev + IMAGES_PER_BATCH, filteredImages.length);
      });
    }
  }, [filteredImages]);

  // ============================================
  // COMPUTED
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
  // RETURN
  // ============================================

  return {
    images,
    filteredImages,
    loading,
    recentImages,
    searchTerm,
    setSearchTerm,
    selectedDestino,
    setSelectedDestino,
    selectedResort,
    setSelectedResort,
    showFilters,
    setShowFilters,
    destinosUnicos,
    resortsUnicos,
    visibleImages,
    selectedImageIds,
    selectedImages,
    handleSelectImage,
    handleRemoveSelected,
    handleClearSelection,
    handleScroll,
    visibleCount,
    totalFiltered: filteredImages.length,
    handleOpenSendModal,
    handleSendImages,
    sending,
    sendingProgress,
    showSendModal,
    setShowSendModal,
    previewImage,
    setPreviewImage,
    getImageUrl: getImageUrlCached
  };
}
