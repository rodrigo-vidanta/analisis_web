/**
 * ============================================
 * MODAL DE FINALIZACIÓN - MÓDULO LIVE MONITOR
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/analysis/README_LIVEMONITOR.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/analysis/README_LIVEMONITOR.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/analysis/CHANGELOG_LIVEMONITOR.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, XCircle, CheckCircle, Clock } from 'lucide-react';

interface FinalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinalize: (type: 'perdida' | 'finalizada' | 'mas-tarde') => void;
  loading: boolean;
  callName?: string;
}

export const FinalizationModal: React.FC<FinalizationModalProps> = ({
  isOpen,
  onClose,
  onFinalize,
  loading,
  callName
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <motion.h3
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-2xl font-bold text-gray-900 dark:text-white mb-1"
                  >
                    Finalizar Llamada
                  </motion.h3>
                  {callName && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed"
                    >
                      ¿Cómo deseas marcar la llamada de <span className="font-semibold text-gray-900 dark:text-white">{callName}</span>?
                    </motion.p>
                  )}
                </div>
                <motion.button
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={onClose}
                  disabled={loading}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Cerrar"
                >
                  <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 py-6">
              <div className="space-y-3">
                {/* Opción 1: Perdida */}
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onFinalize('perdida')}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 hover:from-red-100 hover:to-red-200 dark:hover:from-red-900/30 dark:hover:to-red-800/30 border-2 border-red-200 dark:border-red-800 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.25, type: "spring", stiffness: 200 }}
                    className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg"
                  >
                    <XCircle className="w-6 h-6 text-white" />
                  </motion.div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-red-900 dark:text-red-300 group-hover:text-red-700 dark:group-hover:text-red-200 text-sm">
                      Perdida
                    </div>
                    <div className="text-xs text-red-700 dark:text-red-400">
                      La llamada no fue exitosa
                    </div>
                  </div>
                </motion.button>

                {/* Opción 2: Finalizada */}
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onFinalize('finalizada')}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/30 dark:hover:to-green-800/30 border-2 border-green-200 dark:border-green-800 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.35, type: "spring", stiffness: 200 }}
                    className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg"
                  >
                    <CheckCircle className="w-6 h-6 text-white" />
                  </motion.div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-green-900 dark:text-green-300 group-hover:text-green-700 dark:group-hover:text-green-200 text-sm">
                      Finalizada
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-400">
                      La llamada fue exitosa
                    </div>
                  </div>
                </motion.button>

                {/* Opción 3: Marcar más tarde */}
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onFinalize('mas-tarde')}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.45, type: "spring", stiffness: 200 }}
                    className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg"
                  >
                    <Clock className="w-6 h-6 text-white" />
                  </motion.div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-blue-900 dark:text-blue-300 group-hover:text-blue-700 dark:group-hover:text-blue-200 text-sm">
                      Marcar más tarde
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-400">
                      Revisar la llamada después
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                disabled={loading}
                className="w-full px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

