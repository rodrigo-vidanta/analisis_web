/**
 * Modal para programar una nueva llamada
 * Solo requiere motivo - el timestamp se genera en el servidor
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Send, Lightbulb } from 'lucide-react';
import toast from 'react-hot-toast';

interface ScheduleCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospectoId: string;
  prospectoNombre?: string;
  onScheduleSuccess?: () => void;
}

export const ScheduleCallModal: React.FC<ScheduleCallModalProps> = ({
  isOpen,
  onClose,
  prospectoId,
  prospectoNombre,
  onScheduleSuccess
}) => {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  // Validar caracteres especiales en motivo
  const handleMotivoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // Permitir solo letras, números, espacios y caracteres básicos de puntuación
    const sanitized = value.replace(/[^a-zA-Z0-9\s.,;:!?()\-áéíóúÁÉÍÓÚñÑüÜ]/g, '');
    if (sanitized.length <= 400) {
      setMotivo(sanitized);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!motivo.trim()) {
      toast.error('Por favor ingresa un motivo para la llamada');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://primary-dev-d75a.up.railway.app/webhook/trigger-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prospecto_id: prospectoId,
          motivo: motivo.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      toast.success('Llamada programada exitosamente');
      
      // Resetear formulario
      setMotivo('');
      
      // Cerrar modal y notificar éxito
      onClose();
      if (onScheduleSuccess) {
        onScheduleSuccess();
      }
    } catch (error) {
      console.error('Error programando llamada:', error);
      toast.error('Error al programar la llamada. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const caracteresRestantes = 400 - motivo.length;

  return (
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
            <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Programar Nueva Llamada
                </h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={18} />
                </button>
              </div>
              {prospectoNombre && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Prospecto: <span className="font-medium text-gray-900 dark:text-white">{prospectoNombre}</span>
                </p>
              )}
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Hint sobre el motivo */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      ¿Cómo ayuda el motivo?
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      El motivo de la llamada ayuda al agente LLM de voz a contextualizarse y adoptar una estrategia de venta específica. 
                      Al describir el propósito, puedes influenciar directamente cómo se manejará la llamada para maximizar las oportunidades de conversión.
                    </p>
                  </div>
                </div>
              </div>

              {/* Motivo */}
              <div className="group">
                <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  <FileText className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <span>Motivo de la Llamada *</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {caracteresRestantes} caracteres restantes
                  </span>
                </label>
                <textarea
                  value={motivo}
                  onChange={handleMotivoChange}
                  placeholder="Ej: Seguimiento de interés en Nuevo Vallarta, cliente busca opciones all-inclusive para familia de 3 personas..."
                  rows={6}
                  maxLength={400}
                  required
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 resize-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Máximo 400 caracteres. Solo letras, números y caracteres básicos de puntuación. El timestamp se generará automáticamente en el servidor.
                </p>
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Cancelar
              </button>
              <motion.button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || !motivo.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Programando...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Programar Llamada</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

