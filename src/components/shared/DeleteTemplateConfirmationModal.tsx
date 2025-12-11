/**
 * Modal de confirmación para eliminar plantillas de WhatsApp
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import type { WhatsAppTemplate } from '../../types/whatsappTemplates';

interface DeleteTemplateConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: WhatsAppTemplate | null;
  onDelete: () => Promise<void>;
  isDeleting?: boolean;
  isSyncing?: boolean;
}

export const DeleteTemplateConfirmationModal: React.FC<DeleteTemplateConfirmationModalProps> = ({
  isOpen,
  onClose,
  template,
  onDelete,
  isDeleting = false,
  isSyncing = false
}) => {
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  useEffect(() => {
    if (isDeleting) {
      setShowSuccessAnimation(false);
    }
  }, [isDeleting]);

  // Mostrar animación de éxito cuando termine la eliminación y sincronización
  useEffect(() => {
    if (!isDeleting && !isSyncing && !showSuccessAnimation) {
      // Si ya no está eliminando ni sincronizando, mostrar éxito
      const timer = setTimeout(() => {
        setShowSuccessAnimation(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isDeleting, isSyncing, showSuccessAnimation]);

  // Cerrar modal automáticamente después de mostrar éxito
  useEffect(() => {
    if (showSuccessAnimation && !isSyncing) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000); // Cerrar después de 2 segundos
      return () => clearTimeout(timer);
    }
  }, [showSuccessAnimation, isSyncing, onClose]);

  if (!isOpen || !template) return null;

  const bodyComponent = template.components.find(c => c.type === 'BODY');
  const previewText = bodyComponent?.text || 'Sin contenido';
  const maxPreviewLength = 100;
  const truncatedPreview = previewText.length > maxPreviewLength
    ? previewText.substring(0, maxPreviewLength) + '...'
    : previewText;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AnimatePresence mode="wait">
                    {showSuccessAnimation ? (
                      <motion.div
                        key="success"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center"
                      >
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="alert"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center"
                      >
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div>
                    <AnimatePresence mode="wait">
                      {showSuccessAnimation ? (
                        <motion.h3
                          key="success-title"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="text-lg font-bold text-emerald-700 dark:text-emerald-400"
                        >
                          ¡Plantilla eliminada!
                        </motion.h3>
                      ) : (
                        <motion.h3
                          key="delete-title"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="text-lg font-bold text-gray-900 dark:text-white"
                        >
                          ¿Eliminar plantilla?
                        </motion.h3>
                      )}
                    </AnimatePresence>
                    {!showSuccessAnimation && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Esta acción no se puede deshacer
                      </p>
                    )}
                  </div>
                </div>
                <motion.button
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={onClose}
                  disabled={isDeleting}
                  className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              {!showSuccessAnimation ? (
                <motion.div
                  key="delete-content"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 py-5 space-y-4"
                >
                  {/* Información de la plantilla */}
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Nombre
                        </p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {template.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Categoría
                        </p>
                        <p className="text-sm text-gray-900 dark:text-white capitalize">
                          {template.category.toLowerCase()}
                        </p>
                      </div>
                      {truncatedPreview && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Contenido
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                            {truncatedPreview}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mensaje de confirmación */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      ¿Estás seguro de que deseas eliminar esta plantilla? Esta acción marcará la plantilla como eliminada y no se podrá deshacer.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="success-content"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="px-6 py-8 flex flex-col items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                    className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mb-4"
                  >
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center"
                  >
                    La plantilla ha sido eliminada exitosamente
                  </motion.p>
                  {isSyncing && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
                    >
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Sincronizando plantillas...</span>
                    </motion.div>
                  )}
                  {!isSyncing && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center"
                    >
                      Sincronización completada
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <AnimatePresence mode="wait">
              {!showSuccessAnimation ? (
                <motion.div
                  key="delete-footer"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end gap-3"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    disabled={isDeleting}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: isDeleting ? 1 : 1.02 }}
                    whileTap={{ scale: isDeleting ? 1 : 0.98 }}
                    onClick={async () => {
                      try {
                        await onDelete();
                        // Mostrar animación de éxito solo después de que el webhook responda
                        setShowSuccessAnimation(true);
                      } catch (error) {
                        // Si hay error, no mostrar animación de éxito
                        // El error ya se maneja en el componente padre
                      }
                    }}
                    disabled={isDeleting}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-rose-600 rounded-xl hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-red-500/25 flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </>
                    )}
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="success-footer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end"
                >
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg shadow-emerald-500/25"
                  >
                    Cerrar
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
