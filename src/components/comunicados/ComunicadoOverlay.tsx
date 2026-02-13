/**
 * ============================================
 * COMUNICADO OVERLAY - Fullscreen modal
 * ============================================
 *
 * Overlay que muestra comunicados pendientes al usuario.
 * Soporta comunicados simples (ComunicadoCard) e interactivos
 * (componentes lazy del registry).
 *
 * z-index: 60 (arriba de z-50 content, abajo de ForceUpdateModal z-70)
 */

import React, { Suspense, lazy, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useComunicadosStore } from '../../stores/comunicadosStore';
import { useAuth } from '../../contexts/AuthContext';
import ComunicadoCard from './ComunicadoCard';

// Registry de componentes interactivos
const INTERACTIVE_REGISTRY: Record<string, React.LazyExoticComponent<React.FC<{ onComplete: () => void }>>> = {
  'utility-template-tutorial': lazy(() => import('./tutorials/UtilityTemplateTutorial')),
};

const ComunicadoOverlay: React.FC = () => {
  const { user } = useAuth();
  const {
    currentComunicado,
    isOverlayVisible,
    markCurrentAsRead,
    pendingComunicados,
  } = useComunicadosStore();

  const handleMarkAsRead = useCallback(async () => {
    if (!user?.id) return;
    await markCurrentAsRead(user.id);
  }, [user?.id, markCurrentAsRead]);

  if (!isOverlayVisible || !currentComunicado) return null;

  const isInteractive = currentComunicado.is_interactive && currentComunicado.component_key;
  const InteractiveComponent = isInteractive
    ? INTERACTIVE_REGISTRY[currentComunicado.component_key!]
    : null;

  const remainingCount = pendingComunicados.length;

  return (
    <AnimatePresence>
      {isOverlayVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-gray-950 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-800 max-h-[90vh] flex flex-col"
          >
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isInteractive && InteractiveComponent ? (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
                    </div>
                  }
                >
                  <InteractiveComponent onComplete={handleMarkAsRead} />
                </Suspense>
              ) : (
                <ComunicadoCard comunicado={currentComunicado} />
              )}
            </div>

            {/* Footer - Solo para comunicados no interactivos */}
            {!isInteractive && (
              <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
                {/* Remaining count */}
                <div>
                  {remainingCount > 1 && (
                    <span className="text-xs text-gray-500">
                      {remainingCount - 1} comunicado{remainingCount - 1 > 1 ? 's' : ''} mas
                    </span>
                  )}
                </div>

                {/* Mark as read button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleMarkAsRead}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-medium flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Entendido
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ComunicadoOverlay;
