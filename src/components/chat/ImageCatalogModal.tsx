// Golden Rules:
// 📚 Documentación: Ver src/components/chat/README.md para arquitectura del módulo Live Chat
// 📝 Cambios: Documentar en src/components/chat/CHANGELOG_LIVECHAT.md
// 📋 Verificación: Revisar CHANGELOG antes de modificar

import { useState, useEffect, useRef } from 'react';
import { X, Search, Send, Eye, Image as ImageIcon, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { analysisSupabase } from '../../config/analysisSupabase';
import { ParaphraseModal } from './ParaphraseModal';
import { useAuth } from '../../contexts/AuthContext';

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

interface ImageCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendImage: (imageData: SendImageData) => void;
  selectedConversation: any; // La conversación completa con prospecto_id
  onImageSent?: (imageUrl: string, caption: string) => void; // Callback para UI optimista
  onPauseBot?: (uchatId: string, durationMinutes: number | null, force?: boolean) => Promise<boolean>; // Función para pausar el bot (null = indefinido, force = false para respetar pausas activas)
}

interface SendImageData {
  archivo: string;
  destino: string;
  resort: string;
  caption?: string;
}

const CACHE_KEY = 'livechat_recent_images';
const CACHE_SIZE = 5; // Reducido de 8 a 5 para mejor UX

export const ImageCatalogModal: React.FC<ImageCatalogModalProps> = ({
  isOpen,
  onClose,
  onSendImage,
  selectedConversation,
  onImageSent,
  onPauseBot
}) => {
  const { user } = useAuth();
  const [images, setImages] = useState<ContentItem[]>([]);
  const [filteredImages, setFilteredImages] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestino, setSelectedDestino] = useState<string>('all');
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [previewImage, setPreviewImage] = useState<ContentItem | null>(null);
  const [sendModalImage, setSendModalImage] = useState<ContentItem | null>(null);
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);
  const isSendingRef = useRef(false); // ⚠️ PROTECCIÓN CONTRA DUPLICADOS
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 15; // Aumentado de 8 a 15 (3 filas × 5 columnas)
  
  // Estados para parafraseo
  const [showParaphraseModal, setShowParaphraseModal] = useState(false);
  const [textToParaphrase, setTextToParaphrase] = useState('');
  const [imageToSendAfterParaphrase, setImageToSendAfterParaphrase] = useState<ContentItem | null>(null);
  
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [recentImages, setRecentImages] = useState<ContentItem[]>([]);
  
  // Datos del prospecto (obtenidos de la BD)
  const [prospectoData, setProspectoData] = useState<{
    whatsapp: string;
    id_uchat: string;
  } | null>(null);

  // Cargar cache local y datos del prospecto
  useEffect(() => {
    if (isOpen) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          setRecentImages(JSON.parse(cached));
        } catch (e) {
          console.error('Error loading cache:', e);
        }
      }
      loadImages();
      loadProspectoData();
    }
  }, [isOpen, selectedConversation]);

  // Cargar datos del prospecto desde la BD
  const loadProspectoData = async () => {
    if (!selectedConversation?.prospecto_id) {
      console.error('❌ No hay prospecto_id en la conversación:', selectedConversation);
      return;
    }

    try {
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('whatsapp, id_uchat')
        .eq('id', selectedConversation.prospecto_id)
        .single();

      if (error) {
        console.error('❌ Error al obtener datos del prospecto:', error);
        return;
      }

      if (!data) {
        console.error('❌ No se encontró el prospecto');
        return;
      }

      setProspectoData({
        whatsapp: data.whatsapp,
        id_uchat: data.id_uchat
      });
    } catch (error) {
      console.error('❌ Error loading prospecto data:', error);
    }
  };

  // Cargar imágenes de la BD
  const loadImages = async () => {
    setLoading(true);
    try {
      // Primero obtener el total de imágenes disponibles
      const { count, error: countError } = await analysisSupabase
        .from('content_management')
        .select('*', { count: 'exact', head: true })
        .eq('tipo_contenido', 'imagen');

      if (countError) {
        // Silenciar error de conteo, no es crítico
      }

      // Cargar todas las imágenes (sin límite o con límite alto)
      const { data, error } = await analysisSupabase
        .from('content_management')
        .select('*')
        .eq('tipo_contenido', 'imagen')
        .order('created_at', { ascending: false })
        .limit(1000); // Aumentado de 50 a 1000 para cargar más imágenes

      if (error) throw error;
      
      setImages(data || []);
      setFilteredImages(data || []);
    } catch (error) {
      console.error('❌ Error loading images:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generar URL de imagen con cache persistente
  const getImageUrl = async (item: ContentItem): Promise<string> => {
    const cacheKey = `img_${item.bucket}/${item.nombre_archivo}`;
    
    // 1️⃣ Revisar memoria (más rápido)
    if (imageUrls[cacheKey]) {
      return imageUrls[cacheKey];
    }

    // 2️⃣ Revisar localStorage (persistente)
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const now = Date.now();
        // Cache válido por 25 minutos (5min antes de expirar)
        if (parsed.url && parsed.timestamp && (now - parsed.timestamp) < 25 * 60 * 1000) {
          setImageUrls(prev => ({ ...prev, [cacheKey]: parsed.url }));
          return parsed.url;
        } else {
          // Cache expirado, eliminar
          localStorage.removeItem(cacheKey);
        }
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    // 3️⃣ Generar nueva URL desde API
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

      const data = await response.json();
      const url = data[0]?.url || data.url;
      
      // Guardar en memoria + localStorage
      setImageUrls(prev => ({ ...prev, [cacheKey]: url }));
      localStorage.setItem(cacheKey, JSON.stringify({
        url,
        timestamp: Date.now()
      }));
      
      return url;
    } catch (error) {
      console.error('Error generating image URL:', error);
      return '';
    }
  };

  // Generar URL de thumbnail (optimizado para grid) con cache persistente
  const getThumbnailUrl = async (item: ContentItem): Promise<string> => {
    const thumbnailCacheKey = `thumb_${item.bucket}/${item.nombre_archivo}`;
    
    // 1️⃣ Revisar memoria
    if (imageUrls[thumbnailCacheKey]) {
      return imageUrls[thumbnailCacheKey];
    }

    // 2️⃣ Revisar localStorage
    const cachedData = localStorage.getItem(thumbnailCacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const now = Date.now();
        if (parsed.url && parsed.timestamp && (now - parsed.timestamp) < 25 * 60 * 1000) {
          setImageUrls(prev => ({ ...prev, [thumbnailCacheKey]: parsed.url }));
          return parsed.url;
        } else {
          localStorage.removeItem(thumbnailCacheKey);
        }
      } catch (e) {
        localStorage.removeItem(thumbnailCacheKey);
      }
    }

    try {
      // 3️⃣ Generar URL base (reutiliza cache de getImageUrl)
      const baseUrl = await getImageUrl(item);
      
      // Para thumbnails, usar URL con parámetros de transformación si es posible
      // Cloudflare Images, Imgix, o servicios similares soportan parámetros de query
      let thumbnailUrl = baseUrl;
      
      // Si es una URL de Supabase Storage, intentar agregar transformación
      if (baseUrl.includes('supabase.co/storage')) {
        // Supabase soporta transformaciones de imagen
        thumbnailUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}width=300&quality=80`;
      }
      // Si es Cloudflare R2 con transformaciones
      else if (baseUrl.includes('cloudflare')) {
        thumbnailUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}width=300&quality=80`;
      }
      // Para otros servicios, el navegador redimensionará con CSS
      // pero marcamos la imagen como decoding="async" para mejor rendimiento
      
      // Guardar en memoria + localStorage
      setImageUrls(prev => ({ ...prev, [thumbnailCacheKey]: thumbnailUrl }));
      localStorage.setItem(thumbnailCacheKey, JSON.stringify({
        url: thumbnailUrl,
        timestamp: Date.now()
      }));
      
      return thumbnailUrl;
    } catch (error) {
      console.error('Error generating thumbnail URL:', error);
      return '';
    }
  };

  // Filtrar imágenes
  useEffect(() => {
    let filtered = images;
    const initialCount = images.length;

    // Filtro por destino
    if (selectedDestino !== 'all') {
      filtered = filtered.filter(img => 
        img.destinos?.includes(selectedDestino)
      );
    }

    // Filtro por resort
    if (selectedResort !== 'all') {
      filtered = filtered.filter(img => 
        img.resorts?.includes(selectedResort)
      );
    }

    // Búsqueda por keyword
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(img => 
        img.nombre.toLowerCase().includes(term) ||
        img.descripcion.toLowerCase().includes(term) ||
        img.destinos?.some(d => d.toLowerCase().includes(term)) ||
        img.resorts?.some(r => r.toLowerCase().includes(term)) ||
        img.atracciones?.some(a => a.toLowerCase().includes(term))
      );
    }
    
    setFilteredImages(filtered);
    setCurrentPage(1); // Reset a primera página cuando cambian los filtros
  }, [searchTerm, selectedDestino, selectedResort, images]);

  // Calcular imágenes de la página actual
  const totalPages = Math.ceil(filteredImages.length / imagesPerPage);
  const startIndex = (currentPage - 1) * imagesPerPage;
  const endIndex = startIndex + imagesPerPage;
  const currentImages = filteredImages.slice(startIndex, endIndex);

  // Guardar en cache local
  const addToRecentImages = (item: ContentItem) => {
    const updated = [item, ...recentImages.filter(i => i.id !== item.id)].slice(0, CACHE_SIZE);
    setRecentImages(updated);
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  };

  // Validar y limpiar caption (máx 80 chars, solo alfanuméricos)
  const handleCaptionChange = (value: string) => {
    // Remover saltos de línea y caracteres especiales
    let cleaned = value.replace(/[\n\r]/g, ' '); // Reemplazar saltos por espacios
    cleaned = cleaned.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,!?¿¡]/g, ''); // Solo alfanuméricos y puntuación básica
    
    // Limitar a 80 caracteres
    if (cleaned.length > 80) {
      cleaned = cleaned.substring(0, 80);
    }
    
    setCaption(cleaned);
  };

  // Abrir modal de envío
  const handleOpenSendModal = (item: ContentItem) => {
    addToRecentImages(item);
    setSendModalImage(item);
    setCaption('');
  };

  // Enviar imagen (interceptar para parafraseo si hay caption)
  const handleSendImage = async () => {
    if (!sendModalImage) {
      console.error('❌ No hay imagen seleccionada');
      return;
    }

    if (!prospectoData?.whatsapp || !prospectoData?.id_uchat) {
      console.error('❌ Faltan datos para enviar:', {
        sendModalImage: !!sendModalImage,
        prospectoData,
        selectedConversation
      });
      alert('Error: No se puede enviar la imagen. Falta información del prospecto (whatsapp o id_uchat).');
      return;
    }

    // Si hay caption, mostrar modal de parafraseo
    if (caption.trim()) {
      setTextToParaphrase(caption);
      setImageToSendAfterParaphrase(sendModalImage);
      setShowParaphraseModal(true);
      return;
    }

    // Si no hay caption, enviar directamente
    await sendImageWithCaption(sendModalImage, '');
  };

  // Función real para enviar la imagen (después del parafraseo)
  const sendImageWithCaption = async (imageItem: ContentItem, finalCaption: string) => {
    if (!prospectoData?.whatsapp || !prospectoData?.id_uchat) {
      console.error('❌ Faltan datos para enviar');
      return;
    }

    // ⚠️ PROTECCIÓN CONTRA DUPLICADOS: Verificar si ya se está enviando
    if (isSendingRef.current || sending) {
      console.warn('⚠️ Imagen bloqueada: ya hay un envío en proceso');
      return;
    }

    isSendingRef.current = true;
    setSending(true);
    try {
      // Generar URL de la imagen para preview optimista
      const imageUrl = await getImageUrl(imageItem);
      
      // Notificar al padre para UI optimista
      if (onImageSent) {
        onImageSent(imageUrl, finalCaption);
      }

      const payload = [{
        whatsapp: prospectoData.whatsapp,
        uchat_id: prospectoData.id_uchat,
        caption: finalCaption || undefined, // Agregar caption si existe
        id_sender: user?.id || undefined, // Agregar id_sender del usuario que envía
        imagenes: [{
          archivo: imageItem.nombre_archivo,
          destino: imageItem.destinos?.[0] || '',
          resort: imageItem.resorts?.[0] || ''
        }]
      }];

      // Usar Supabase Edge Function como proxy para evitar CORS
      const proxyUrl = `${import.meta.env.VITE_SYSTEM_UI_SUPABASE_URL}/functions/v1/send-img-proxy`;
      const authToken = import.meta.env.VITE_SYSTEM_UI_SUPABASE_ANON_KEY;
      
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
        console.error('❌ Error del servidor:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // PAUSAR EL BOT POR 1 MINUTO después de enviar adjunto exitosamente
      // force = false para respetar pausas existentes (indefinidas, etc.)
      if (onPauseBot && prospectoData.id_uchat) {
        try {
          await onPauseBot(prospectoData.id_uchat, 1, false);
        } catch (error) {
          console.error('❌ Error pausando bot después de enviar adjunto:', error);
        }
      }

      // Animación de éxito (check)
      // Cerrar modales después de breve pausa
      setTimeout(() => {
        setSendModalImage(null);
        setCaption('');
        onClose();
      }, 300);
      
    } catch (error) {
      console.error('❌ Error sending image:', error);
      alert(`Error al enviar la imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      isSendingRef.current = false;
      setSending(false);
    }
  };

  // Obtener opciones únicas para filtros
  const destinosUnicos = Array.from(new Set(images.flatMap(img => img.destinos || [])));
  const resortsUnicos = Array.from(new Set(images.flatMap(img => img.resorts || []).filter(r => r)));

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Principal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 md:space-x-3">
                <div className="p-1.5 md:p-2 bg-blue-500 rounded-lg">
                  <ImageIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                  Catálogo de Imágenes
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 md:w-6 md:h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Búsqueda y Filtros */}
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              {/* Búsqueda */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, destino, resort..."
                  className="w-full pl-9 md:pl-10 pr-4 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filtro Destino */}
              <select
                value={selectedDestino}
                onChange={(e) => setSelectedDestino(e.target.value)}
                className="px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los destinos</option>
                {destinosUnicos.map(destino => (
                  <option key={destino} value={destino}>{destino}</option>
                ))}
              </select>

              {/* Filtro Resort */}
              <select
                value={selectedResort}
                onChange={(e) => setSelectedResort(e.target.value)}
                className="px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los resorts</option>
                {resortsUnicos.map(resort => (
                  <option key={resort} value={resort}>{resort}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid de Imágenes */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6">
            {/* Recientes */}
            {recentImages.length > 0 && (
              <div className="mb-4 md:mb-6">
                <h3 className="text-xs md:text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 md:mb-3 flex items-center space-x-2">
                  <span>Usadas Recientemente</span>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                    {recentImages.length}
                  </span>
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
                  {recentImages.map(item => (
                    <ImageCard
                      key={`recent-${item.id}`}
                      item={item}
                      getThumbnailUrl={getThumbnailUrl}
                      onPreview={() => setPreviewImage(item)}
                      onSend={() => handleOpenSendModal(item)}
                    />
                  ))}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4" />
              </div>
            )}

            {/* Catálogo Completo */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">No se encontraron imágenes</p>
                <p className="text-sm">Intenta con otros filtros</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3 mb-4">
                  {currentImages.map(item => (
                    <ImageCard
                      key={item.id}
                      item={item}
                      getThumbnailUrl={getThumbnailUrl}
                      onPreview={() => setPreviewImage(item)}
                      onSend={() => handleOpenSendModal(item)}
                    />
                  ))}
                </div>

                {/* Controles de Paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-2 md:space-x-4 pt-3 md:pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 md:p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                    </button>

                    <div className="flex items-center space-x-1 md:space-x-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 md:w-8 md:h-8 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-blue-500 text-white'
                              : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 md:p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                    </button>

                    <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 ml-2 md:ml-4">
                      {startIndex + 1}-{Math.min(endIndex, filteredImages.length)} de {filteredImages.length}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Preview */}
      {previewImage && (
        <PreviewModal
          item={previewImage}
          getImageUrl={getImageUrl}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* Modal de Envío */}
      {sendModalImage && (
        <SendModal
          item={sendModalImage}
          getImageUrl={getImageUrl}
          caption={caption}
          onCaptionChange={handleCaptionChange}
          onSend={handleSendImage}
          onClose={() => setSendModalImage(null)}
          sending={sending}
        />
      )}

      {/* Modal de Parafraseo para Caption */}
      <ParaphraseModalWrapper
        isOpen={showParaphraseModal}
        originalText={textToParaphrase}
        onSelect={(paraphrasedText) => {
          setShowParaphraseModal(false);
          if (imageToSendAfterParaphrase) {
            sendImageWithCaption(imageToSendAfterParaphrase, paraphrasedText);
            setSendModalImage(null);
            setCaption('');
          }
        }}
        onCancel={() => {
          setShowParaphraseModal(false);
        }}
      />
    </>
  );
};

// Componente: Card de Imagen
interface ImageCardProps {
  item: ContentItem;
  getThumbnailUrl: (item: ContentItem) => Promise<string>;
  onPreview: () => void;
  onSend: () => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ item, getThumbnailUrl, onPreview, onSend }) => {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getThumbnailUrl(item).then(url => {
      setUrl(url);
      setLoading(false);
    });
  }, [item]);

  return (
    <div className="group relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer">
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <img
            src={url}
            alt={item.nombre}
            className="w-full h-full object-cover transition-transform group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
          
          {/* Overlay con botones */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
            <button
              onClick={onPreview}
              className="p-2 bg-white/90 hover:bg-white rounded-full transition-colors"
              title="Vista previa"
            >
              <Eye className="w-4 h-4 text-gray-900" />
            </button>
            <button
              onClick={onSend}
              className="p-2 bg-blue-500 hover:bg-blue-600 rounded-full transition-colors"
              title="Enviar"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Info */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-xs font-medium truncate">{item.nombre}</p>
            {item.destinos && item.destinos.length > 0 && (
              <p className="text-white/80 text-xs truncate">{item.destinos.join(', ')}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Componente: Modal de Preview
interface PreviewModalProps {
  item: ContentItem;
  getImageUrl: (item: ContentItem) => Promise<string>;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ item, getImageUrl, onClose }) => {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    getImageUrl(item).then(setUrl);
  }, [item]);

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        
        <img
          src={url}
          alt={item.nombre}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
        />
        
        <div className="mt-4 p-4 bg-white/10 backdrop-blur-md rounded-lg">
          <h3 className="text-white font-semibold text-lg">{item.nombre}</h3>
          {item.destinos && item.destinos.length > 0 && (
            <p className="text-white/80 text-sm mt-1">
              📍 {item.destinos.join(', ')}
            </p>
          )}
          {item.resorts && item.resorts.length > 0 && (
            <p className="text-white/80 text-sm">
              🏨 {item.resorts.join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente: Modal de Envío
interface SendModalProps {
  item: ContentItem;
  getImageUrl: (item: ContentItem) => Promise<string>;
  caption: string;
  onCaptionChange: (caption: string) => void;
  onSend: () => void;
  onClose: () => void;
  sending: boolean;
}

const SendModal: React.FC<SendModalProps> = ({
  item,
  getImageUrl,
  caption,
  onCaptionChange,
  onSend,
  onClose,
  sending
}) => {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getImageUrl(item).then(newUrl => {
      setUrl(newUrl);
      setLoading(false);
    });
  }, [item]);

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Enviar Imagen
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          {/* Preview Imagen */}
          <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : url ? (
              <img
                src={url}
                alt={item.nombre}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <p>Error al cargar la imagen</p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {item.nombre}
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
              {item.destinos && item.destinos.map(d => (
                <span key={d} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                  📍 {d}
                </span>
              ))}
              {item.resorts && item.resorts.map(r => (
                <span key={r} className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                  🏨 {r}
                </span>
              ))}
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mensaje (opcional) - {caption.length}/80 caracteres
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="Agrega un mensaje a la imagen..."
              maxLength={80}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Solo letras, números y puntuación básica (.,!?¿¡)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onSend}
            disabled={sending}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal de Parafraseo integrado
const ParaphraseModalWrapper: React.FC<{
  isOpen: boolean;
  originalText: string;
  onSelect: (text: string) => void;
  onCancel: () => void;
}> = (props) => {
  if (!props.isOpen) return null;
  return <ParaphraseModal {...props} context="input_send_image_livechat" />;
};

