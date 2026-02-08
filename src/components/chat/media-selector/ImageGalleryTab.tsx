import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Send, Filter, ChevronDown, Images,
  Trash2, MapPin, Building2, Image as ImageIcon
} from 'lucide-react';
import { ImageGrid } from './ImageGrid';
import { ImagePreviewModal } from './ImagePreviewModal';
import { SendConfirmationModal } from './SendConfirmationModal';
import { MAX_IMAGES } from './constants';
import type { UseImageCatalogReturn } from './useImageCatalog';

interface ImageGalleryTabProps {
  catalog: UseImageCatalogReturn;
  onClose: () => void;
}

function ImageGalleryTab({ catalog, onClose }: ImageGalleryTabProps) {
  const {
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
    totalFiltered,
    handleOpenSendModal,
    handleSendImages,
    sending,
    sendingProgress,
    showSendModal,
    setShowSendModal,
    previewImage,
    setPreviewImage,
    getImageUrl
  } = catalog;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="relative px-6 py-5 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-0.5 shadow-lg"
            >
              <div className="w-full h-full rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center">
                <Images className="w-6 h-6 text-blue-500" />
              </div>
            </motion.div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Galeria de Imagenes
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredImages.length} imagenes disponibles
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

        {/* Expanded Filters */}
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
                {/* Destinos */}
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
                        {destino}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Resorts */}
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
                        {resort}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Active Filters Summary */}
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

      {/* Image Grid */}
      <ImageGrid
        images={visibleImages}
        selectedImageIds={selectedImageIds}
        selectedImages={selectedImages}
        onSelect={handleSelectImage}
        onPreview={(item) => setPreviewImage(item)}
        loading={loading}
        recentImages={recentImages}
        visibleCount={visibleCount}
        totalFiltered={totalFiltered}
        onScroll={handleScroll}
        searchTerm={searchTerm}
        selectedDestino={selectedDestino}
        selectedResort={selectedResort}
      />

      {/* Selection Bar */}
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
                  <span className="font-medium text-gray-900 dark:text-white">{selectedImages.length}</span> de {MAX_IMAGES} imagenes
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
                  <span>Enviar {selectedImages.length > 1 ? `${selectedImages.length} imagenes` : 'imagen'}</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <ImagePreviewModal
            item={previewImage}
            onClose={() => setPreviewImage(null)}
            onSelect={() => {
              handleSelectImage(previewImage);
              setPreviewImage(null);
            }}
            isSelected={selectedImageIds.has(previewImage.id)}
            getImageUrl={getImageUrl}
          />
        )}
      </AnimatePresence>

      {/* Send Modal */}
      <AnimatePresence>
        {showSendModal && (
          <SendConfirmationModal
            selectedImages={selectedImages}
            onSend={handleSendImages}
            onClose={() => setShowSendModal(false)}
            sending={sending}
            sendingProgress={sendingProgress}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export { ImageGalleryTab };
