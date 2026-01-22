import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, AlertCircle, Download } from 'lucide-react';

interface ForceUpdateModalProps {
  isOpen: boolean;
  currentVersion: string;
  requiredVersion: string | null;
  onReload: () => void;
}

/**
 * Modal de actualización forzada
 * 
 * Características:
 * - Pantalla completa (no se puede cerrar)
 * - Diseño moderno con animaciones
 * - Botón de reload prominente
 * - Información de versiones
 * - Auto-reload opcional después de X segundos
 */
const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({
  isOpen,
  currentVersion,
  requiredVersion,
  onReload
}) => {
  const handleReload = () => {
    // Forzar reload completo (sin caché)
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
        >
          
          {/* Contenedor principal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-2xl w-full p-8 md:p-12 border border-gray-200 dark:border-gray-800"
          >
            {/* Icono animado */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex justify-center mb-6"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg"
                >
                  <RefreshCw className="w-10 h-10 text-white" />
                </motion.div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ delay: 0.5, duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-blue-500/30 blur-xl"
                />
              </div>
            </motion.div>

            {/* Título */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-4"
            >
              Actualización Requerida
            </motion.h2>

            {/* Mensaje */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-center text-gray-600 dark:text-gray-300 mb-8"
            >
              Hay una nueva versión disponible. Por favor, actualiza la aplicación para continuar.
            </motion.p>

            {/* Información de versiones */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-8 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Versión Actual:
                  </span>
                </div>
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-3 py-1 rounded-lg">
                  {currentVersion}
                </span>
              </div>
              
              {requiredVersion && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Download className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Versión Requerida:
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-lg">
                    {requiredVersion}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Botón de reload */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleReload}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-3 group"
              >
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                <span>Actualizar Ahora</span>
              </motion.button>
            </motion.div>

            {/* Nota adicional */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-xs text-center text-gray-500 dark:text-gray-400 mt-6"
            >
              La página se recargará automáticamente después de actualizar
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ForceUpdateModal;
