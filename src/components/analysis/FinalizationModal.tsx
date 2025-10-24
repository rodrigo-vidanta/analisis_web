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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Finalizar Llamada
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {callName && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              ¿Cómo deseas marcar la llamada de <span className="font-semibold text-gray-900 dark:text-white">{callName}</span>?
            </p>
          )}

          <div className="space-y-3">
            {/* Opción 1: Perdida */}
            <button
              onClick={() => onFinalize('perdida')}
              disabled={loading}
              className="w-full flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-red-900 dark:text-red-300 group-hover:text-red-700 dark:group-hover:text-red-200">
                  Perdida
                </div>
                <div className="text-sm text-red-700 dark:text-red-400">
                  La llamada no fue exitosa
                </div>
              </div>
            </button>

            {/* Opción 2: Finalizada */}
            <button
              onClick={() => onFinalize('finalizada')}
              disabled={loading}
              className="w-full flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border-2 border-green-200 dark:border-green-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-green-900 dark:text-green-300 group-hover:text-green-700 dark:group-hover:text-green-200">
                  Finalizada
                </div>
                <div className="text-sm text-green-700 dark:text-green-400">
                  La llamada fue exitosa
                </div>
              </div>
            </button>

            {/* Opción 3: Marcar más tarde */}
            <button
              onClick={() => onFinalize('mas-tarde')}
              disabled={loading}
              className="w-full flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-blue-900 dark:text-blue-300 group-hover:text-blue-700 dark:group-hover:text-blue-200">
                  Marcar más tarde
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-400">
                  Revisar la llamada después
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

