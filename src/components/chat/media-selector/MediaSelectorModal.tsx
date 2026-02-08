import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { MediaSidebar } from './MediaSidebar';
import { ImageGalleryTab } from './ImageGalleryTab';
import { UnderConstructionTab } from './UnderConstructionTab';
import { useImageCatalog } from './useImageCatalog';
import type { MediaSelectorModalProps, MediaTabId } from './types';

function MediaSelectorModal({
  isOpen,
  onClose,
  onSendImage: _onSendImage,
  selectedConversation,
  onImageSent,
  onPauseBot
}: MediaSelectorModalProps) {
  const [activeTab, setActiveTab] = useState<MediaTabId>('images');

  const catalog = useImageCatalog(
    isOpen,
    selectedConversation,
    onClose,
    onImageSent,
    onPauseBot
  );

  // Reset tab al cerrar
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('images');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 z-[60]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex overflow-hidden border border-gray-100 dark:border-gray-800"
      >
        {/* Left Sidebar */}
        <MediaSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {activeTab === 'images' ? (
            <ImageGalleryTab
              catalog={catalog}
              onClose={onClose}
            />
          ) : (
            <UnderConstructionTab tabId={activeTab} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modalContent, document.body);
}

export { MediaSelectorModal };
