import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Send, Loader2 } from 'lucide-react';
import type { SendConfirmationModalProps } from './types';

function SendConfirmationModal({
  selectedImages,
  onSend,
  onClose,
  sending,
  sendingProgress
}: SendConfirmationModalProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 z-[70]"
      onClick={onClose}
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
                Enviar {selectedImages.length > 1 ? `${selectedImages.length} imagenes` : 'imagen'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedImages.length > 1
                  ? 'Se enviaran las imagenes seleccionadas'
                  : 'Confirma el envio de la imagen'}
              </p>
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
                <div className="w-24 h-24 rounded-xl overflow-hidden border-2 shadow-lg border-gray-200 dark:border-gray-700">
                  <img
                    src={url}
                    alt={item.nombre}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md">
                  {idx + 1}
                </span>
              </motion.div>
            ))}
          </div>

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
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(content, document.body);
}

export { SendConfirmationModal };
