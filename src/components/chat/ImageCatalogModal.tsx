// Golden Rules:
// 📚 Documentación: Ver src/components/chat/README.md para arquitectura del módulo Live Chat
// 📝 Cambios: Documentar en src/components/chat/CHANGELOG_LIVECHAT.md
// 📋 Verificación: Revisar CHANGELOG antes de modificar

import { useState, useEffect } from 'react';
import { X, Search, Send, Eye, Image as ImageIcon, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { analysisSupabase } from '../../config/analysisSupabase';

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
}

interface SendImageData {
  archivo: string;
  destino: string;
  resort: string;
  caption?: string;
}

const CACHE_KEY = 'livechat_recent_images';
const CACHE_SIZE = 8;

export const ImageCatalogModal: React.FC<ImageCatalogModalProps> = ({
  isOpen,
  onClose,
  onSendImage,
  selectedConversation,
  onImageSent
}) => {
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
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 8;
  
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
      console.log('🔍 Buscando datos del prospecto:', selectedConversation.prospecto_id);
      
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

      console.log('✅ Datos del prospecto obtenidos:', data);
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
      const { data, error } = await analysisSupabase
        .from('content_management')
        .select('*')
        .eq('tipo_contenido', 'imagen')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setImages(data || []);
      setFilteredImages(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generar URL de imagen
  const getImageUrl = async (item: ContentItem): Promise<string> => {
    const cacheKey = `${item.bucket}/${item.nombre_archivo}`;
    
    if (imageUrls[cacheKey]) {
      return imageUrls[cacheKey];
    }

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
      
      setImageUrls(prev => ({ ...prev, [cacheKey]: url }));
      return url;
    } catch (error) {
      console.error('Error generating image URL:', error);
      return '';
    }
  };

  // Filtrar imágenes
  useEffect(() => {
    let filtered = images;

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

  // Abrir modal de envío
  const handleOpenSendModal = (item: ContentItem) => {
    addToRecentImages(item);
    setSendModalImage(item);
    setCaption('');
  };

  // Enviar imagen
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

    setSending(true);
    try {
      // Generar URL de la imagen para preview optimista
      const imageUrl = await getImageUrl(sendModalImage);
      
      // Notificar al padre para UI optimista
      if (onImageSent) {
        onImageSent(imageUrl, caption);
      }

      const payload = [{
        whatsapp: prospectoData.whatsapp,
        uchat_id: prospectoData.id_uchat,
        caption: caption || undefined, // Agregar caption si existe
        imagenes: [{
          archivo: sendModalImage.nombre_archivo,
          destino: sendModalImage.destinos?.[0] || '',
          resort: sendModalImage.resorts?.[0] || ''
        }]
      }];

      console.log('📤 Enviando imagen:', payload);

      // Usar Supabase Edge Function como proxy para evitar CORS
      const proxyUrl = 'https://zbylezfyagwrxoecioup.supabase.co/functions/v1/send-img-proxy';
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNzEsImV4cCI6MjA3NDkxMjI3MX0.W6Vt5h4r7vNSP_YQtd_fbTWuK7ERrcttwhcpe5Q7KoM'
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Imagen enviada correctamente:', result);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <ImageIcon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Catálogo de Imágenes
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Búsqueda y Filtros */}
            <div className="flex flex-col md:flex-row gap-3">
              {/* Búsqueda */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, destino, resort..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filtro Destino */}
              <select
                value={selectedDestino}
                onChange={(e) => setSelectedDestino(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los resorts</option>
                {resortsUnicos.map(resort => (
                  <option key={resort} value={resort}>{resort}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid de Imágenes */}
          <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            {/* Recientes */}
            {recentImages.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center space-x-2">
                  <span>Usadas Recientemente</span>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                    {recentImages.length}
                  </span>
                </h3>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {recentImages.map(item => (
                    <ImageCard
                      key={`recent-${item.id}`}
                      item={item}
                      getImageUrl={getImageUrl}
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
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {currentImages.map(item => (
                    <ImageCard
                      key={item.id}
                      item={item}
                      getImageUrl={getImageUrl}
                      onPreview={() => setPreviewImage(item)}
                      onSend={() => handleOpenSendModal(item)}
                    />
                  ))}
                </div>

                {/* Controles de Paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center space-x-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg font-medium transition-colors ${
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
                      className="p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-4">
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
          onCaptionChange={setCaption}
          onSend={handleSendImage}
          onClose={() => setSendModalImage(null)}
          sending={sending}
        />
      )}
    </>
  );
};

// Componente: Card de Imagen
interface ImageCardProps {
  item: ContentItem;
  getImageUrl: (item: ContentItem) => Promise<string>;
  onPreview: () => void;
  onSend: () => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ item, getImageUrl, onPreview, onSend }) => {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getImageUrl(item).then(url => {
      setUrl(url);
      setLoading(false);
    });
  }, [item]);

  return (
    <div className="group relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer">
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <img
            src={url}
            alt={item.nombre}
            className="w-full h-full object-cover transition-transform group-hover:scale-110"
            loading="lazy"
          />
          
          {/* Overlay con botones */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
            <button
              onClick={onPreview}
              className="p-3 bg-white/90 hover:bg-white rounded-full transition-colors"
              title="Vista previa"
            >
              <Eye className="w-5 h-5 text-gray-900" />
            </button>
            <button
              onClick={onSend}
              className="p-3 bg-blue-500 hover:bg-blue-600 rounded-full transition-colors"
              title="Enviar"
            >
              <Send className="w-5 h-5 text-white" />
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
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
              Mensaje (opcional)
            </label>
            <textarea
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="Agrega un mensaje a la imagen..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
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

