import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, RotateCw, ZoomIn, ZoomOut, Check, Image as ImageIcon, Trash2 } from 'lucide-react';

interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImageBlob: Blob | null) => void;
  aspectRatio?: number;
  currentAvatarUrl?: string | null;
  allowDelete?: boolean;
}

const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  isOpen,
  onClose,
  onCropComplete,
  aspectRatio = 1,
  currentAvatarUrl = null,
  allowDelete = false
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showCircularFrame, setShowCircularFrame] = useState(true); // Toggle entre circular y cuadrado
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const loadedAvatarUrlRef = useRef<string | null>(null);

  const FRAME_SIZE = 280; // Tamaño del frame de referencia
  const CONTAINER_SIZE = 400; // Tamaño del contenedor

  // Cargar avatar actual si existe al abrir el modal
  useEffect(() => {
    if (!isOpen) {
      // Resetear cuando se cierra el modal
      setImageSrc(null);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsDragging(false);
      loadedAvatarUrlRef.current = null;
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Solo cargar avatar si se abre el modal y hay avatar actual pero no se ha cargado aún
    if (currentAvatarUrl && loadedAvatarUrlRef.current !== currentAvatarUrl) {
      setImageSrc(currentAvatarUrl);
      loadedAvatarUrlRef.current = currentAvatarUrl;
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        const baseScale = Math.max(FRAME_SIZE / img.width, FRAME_SIZE / img.height);
        setScale(baseScale * 1.2);
      };
      img.src = currentAvatarUrl;
    } else if (!currentAvatarUrl) {
      loadedAvatarUrlRef.current = null;
    }
  }, [isOpen, currentAvatarUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es muy grande. Máximo 5MB permitido');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setImageSrc(src);
      loadedAvatarUrlRef.current = null; // Resetear ref cuando se selecciona nuevo archivo
      
      // Reset transformaciones
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      
      // Cargar imagen para obtener dimensiones
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        // Calcular escala inicial para que la imagen llene el frame de referencia
        // La escala será un multiplicador del tamaño original de la imagen
        const baseScale = Math.max(FRAME_SIZE / img.width, FRAME_SIZE / img.height);
        setScale(baseScale * 1.2); // 1.2 para que llene bien el frame inicialmente
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAvatar = () => {
    onCropComplete(null);
    handleClose();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageSrc || !containerRef.current) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setDragStart({ 
      x: e.clientX - centerX - position.x, 
      y: e.clientY - centerY - position.y 
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !imageSrc || !containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setPosition({
      x: e.clientX - centerX - dragStart.x,
      y: e.clientY - centerY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!imageSrc) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setScale(prev => {
      const newScale = prev * delta;
      return Math.max(0.3, Math.min(5, newScale));
    });
  };

  const rotateImage = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleClose = useCallback(() => {
    // Si hay avatar actual y no se seleccionó nueva imagen, restaurar
    if (currentAvatarUrl && !imageSrc) {
      // No hacer nada, mantener el estado
    } else {
      setImageSrc(null);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsDragging(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    onClose();
  }, [onClose, currentAvatarUrl, imageSrc]);

  // Función para generar imagen escalada y centrada que llene el frame
  const generateScaledImage = useCallback(() => {
    if (!imageSrc || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const outputSize = FRAME_SIZE; // 280x280px
    
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Calcular transformaciones
    const rad = (rotation * Math.PI) / 180;
    
    // La escala 'scale' es un multiplicador del tamaño original de la imagen
    // En el preview: la imagen se muestra con tamaño img.width * scale
    // El frame visible es de 280px (FRAME_SIZE)
    // En el canvas de salida (280x280), necesitamos mantener la misma proporción visual
    
    // Usar directamente la escala 'scale' que el usuario ajustó
    // El frame es del mismo tamaño (280px) en preview y salida, así que la escala es directa
    const finalScale = scale;
    
    // Centro del canvas de salida
    const centerX = outputSize / 2;
    const centerY = outputSize / 2;
    
    // Aplicar transformaciones
    ctx.save();
    
    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputSize, outputSize);
    
    // Calcular offset: convertir posición del preview a posición de salida
    // En el preview: position.x/y es el desplazamiento en píxeles del contenedor (400px)
    // En el canvas: necesitamos el mismo desplazamiento visual pero en el canvas (280px)
    const frameScaleRatio = FRAME_SIZE / CONTAINER_SIZE; // 280/400 = 0.7
    
    // Convertir posición del contenedor de preview (400px) a posición del canvas (280px)
    // En el preview, translate(position.x, position.y) mueve la imagen
    // En el canvas, necesitamos aplicar el mismo desplazamiento visual
    const canvasOffsetX = position.x * frameScaleRatio;
    const canvasOffsetY = position.y * frameScaleRatio;
    
    // Aplicar transformaciones: primero trasladar al centro + offset, luego rotar y escalar
    ctx.translate(centerX + canvasOffsetX, centerY + canvasOffsetY);
    ctx.rotate(rad);
    ctx.scale(finalScale, finalScale);
    
    // Dibujar imagen centrada (sin offset adicional porque ya lo aplicamos en translate)
    ctx.drawImage(
      img,
      -img.width / 2,
      -img.height / 2,
      img.width,
      img.height
    );
    
    ctx.restore();

    // Convertir a blob
    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
        handleClose();
      }
    }, 'image/jpeg', 0.92);
  }, [imageSrc, scale, position, rotation, onCropComplete, handleClose]);

  // Prevenir scroll cuando se arrastra
  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-0.5 shadow-lg"
                  >
                    <div className="w-full h-full rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                      <ImageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </motion.div>
                  <div>
                    <motion.h3
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="text-2xl font-bold text-gray-900 dark:text-white"
                    >
                      Seleccionar Avatar
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-sm text-gray-500 dark:text-gray-400 mt-1"
                    >
                      Ajusta el zoom y posición de tu imagen
                    </motion.p>
                  </div>
                </div>
                <motion.button
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.25 }}
                  onClick={handleClose}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group"
                >
                  <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                </motion.button>
              </div>
            </div>

            {/* Contenido */}
            <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {!imageSrc ? (
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer group bg-gray-50/50 dark:bg-gray-800/30"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4 shadow-lg"
                    >
                      <Upload className="w-8 h-8 text-white" />
                    </motion.div>
                    <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Haz clic para seleccionar una imagen
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      JPG, PNG o GIF (máx. 5MB)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </motion.div>
                  
                  {/* Botón eliminar avatar si está permitido y hay avatar actual */}
                  {allowDelete && currentAvatarUrl && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      onClick={handleDeleteAvatar}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Eliminar foto de perfil</span>
                    </motion.button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Toggle Frame Shape */}
                  <div className="flex items-center justify-center">
                    <div className="inline-flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                      <button
                        onClick={() => setShowCircularFrame(true)}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                          showCircularFrame
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                      >
                        Circular
                      </button>
                      <button
                        onClick={() => setShowCircularFrame(false)}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                          !showCircularFrame
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                      >
                        Cuadrado
                      </button>
                    </div>
                  </div>

                  {/* Área de Preview con Frame de Referencia */}
                  <div className="relative">
                    <div
                      ref={containerRef}
                      className="relative w-full h-[400px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-inner"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onWheel={handleWheel}
                      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    >
                      {/* Overlay oscuro alrededor del frame */}
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Parte superior oscura */}
                        <div className="absolute top-0 left-0 right-0 h-[calc((100%-280px)/2)] bg-black/60" />
                        {/* Parte inferior oscura */}
                        <div className="absolute bottom-0 left-0 right-0 h-[calc((100%-280px)/2)] bg-black/60" />
                        {/* Parte izquierda oscura */}
                        <div className="absolute left-0 top-[calc((100%-280px)/2)] bottom-[calc((100%-280px)/2)] w-[calc((100%-280px)/2)] bg-black/60" />
                        {/* Parte derecha oscura */}
                        <div className="absolute right-0 top-[calc((100%-280px)/2)] bottom-[calc((100%-280px)/2)] w-[calc((100%-280px)/2)] bg-black/60" />
                      </div>
                      
                      {/* Frame de Referencia Visible */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        {showCircularFrame ? (
                          // Frame Circular
                          <div className="relative">
                            <div className="w-[280px] h-[280px] rounded-full border-4 border-white dark:border-gray-200 shadow-2xl ring-4 ring-blue-500/40" />
                            {/* Indicador de preview circular */}
                            <div className="absolute inset-0 rounded-full border-2 border-blue-400/50" />
                          </div>
                        ) : (
                          // Frame Cuadrado
                          <div className="relative">
                            <div className="w-[280px] h-[280px] rounded-xl border-4 border-white dark:border-gray-200 shadow-2xl ring-4 ring-blue-500/40" />
                            {/* Esquinas decorativas */}
                            <div className="absolute inset-0">
                              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Imagen con transformaciones */}
                      <div
                        ref={imageContainerRef}
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                          transformOrigin: 'center center',
                        }}
                      >
                        <img
                          src={imageSrc}
                          alt="Preview"
                          className="max-w-none select-none"
                          style={{
                            width: imageRef.current?.width || 'auto',
                            height: imageRef.current?.height || 'auto',
                          }}
                          draggable={false}
                        />
                      </div>
                    </div>
                    
                    {/* Indicador de ayuda */}
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
                      Arrastra para centrar • Rueda del mouse para zoom
                    </p>
                  </div>

                  {/* Controles */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      {/* Controles de Zoom */}
                      <div className="flex items-center space-x-4 flex-1">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setScale(prev => Math.max(0.3, prev - 0.1))}
                          disabled={scale <= 0.3}
                          className="p-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                          title="Alejar"
                        >
                          <ZoomOut className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                        </motion.button>
                        
                        <div className="flex-1 max-w-xs">
                          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                              style={{ 
                                width: `${Math.min(100, Math.max(0, ((scale - 0.3) / 4.7) * 100))}%` 
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                            {Math.round(scale * 100)}%
                          </p>
                        </div>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setScale(prev => Math.min(5, prev + 0.1))}
                          disabled={scale >= 5}
                          className="p-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                          title="Acercar"
                        >
                          <ZoomIn className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                        </motion.button>
                      </div>

                      {/* Botón Rotar */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={rotateImage}
                        className="ml-6 p-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 group"
                        title="Rotar 90°"
                      >
                        <RotateCw className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {imageSrc && (
              <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setImageSrc(null);
                    setScale(1);
                    setPosition({ x: 0, y: 0 });
                    setRotation(0);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  Cambiar Imagen
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={generateScaledImage}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar</span>
                </motion.button>
              </div>
            )}

            {/* Canvas oculto para generar la imagen */}
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AvatarCropModal;
