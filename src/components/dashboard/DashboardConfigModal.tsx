/**
 * Modal de configuración del dashboard
 * Permite añadir/ocultar bloques y cambiar tamaños
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Maximize2, Minimize2, ArrowRight, ArrowDown } from 'lucide-react';
import type { WidgetConfig, WidgetType } from './OperativeDashboard';

interface DashboardConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: WidgetConfig[];
  onUpdateWidget: (widgetId: WidgetType, updates: Partial<WidgetConfig>) => void;
  onToggleVisibility: (widgetId: WidgetType) => void;
  onChangeSize: (widgetId: WidgetType, newSize: WidgetConfig['size']) => void;
}

export const DashboardConfigModal: React.FC<DashboardConfigModalProps> = ({
  isOpen,
  onClose,
  widgets,
  onToggleVisibility,
  onChangeSize
}) => {
  const widgetLabels: Record<WidgetType, string> = {
    'prospectos': 'Prospectos Nuevos',
    'conversaciones': 'Últimas Conversaciones',
    'llamadas-activas': 'Llamadas Activas',
    'llamadas-programadas': 'Llamadas Programadas',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Configurar Dashboard
                </h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {widgets.map((widget) => (
                  <motion.div
                    key={widget.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {widgetLabels[widget.id]}
                      </h4>
                      <button
                        onClick={() => onToggleVisibility(widget.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          widget.visible
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                        }`}
                        title={widget.visible ? 'Ocultar' : 'Mostrar'}
                      >
                        {widget.visible ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {widget.visible && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Tamaño del bloque
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onChangeSize(widget.id, 'normal')}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              widget.size === 'normal'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                          >
                            Normal
                          </button>
                          <button
                            onClick={() => onChangeSize(widget.id, 'double-horizontal')}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                              widget.size === 'double-horizontal'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                          >
                            <ArrowRight className="w-3 h-3" />
                            Horizontal
                          </button>
                          <button
                            onClick={() => onChangeSize(widget.id, 'double-vertical')}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                              widget.size === 'double-vertical'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                          >
                            <ArrowDown className="w-3 h-3" />
                            Vertical
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                  Guardar y Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

