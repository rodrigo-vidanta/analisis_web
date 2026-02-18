/**
 * ============================================
 * MODAL DE CONFIGURACIÓN DE BROADCAST
 * ============================================
 *
 * Configura batches, intervalo y schedule antes de
 * ejecutar el broadcast masivo a importados.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Rocket, Clock, Calendar, Layers, Users,
  MessageSquare, Loader2, AlertTriangle, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { importacionesService } from '../../../services/importacionesService';
import { BATCH_INTERVAL_OPTIONS } from '../../../types/importaciones';
import type { ImportacionConStats } from '../../../types/importaciones';
import type { WhatsAppTemplate } from '../../../types/whatsappTemplates';

interface TemplateConRating extends WhatsAppTemplate {
  starRating: number;
  replyRate: number;
  totalSent: number;
}

interface BroadcastConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  importacion: ImportacionConStats;
  template: TemplateConRating;
  onSuccess: () => void;
}

const BroadcastConfigModal: React.FC<BroadcastConfigModalProps> = ({
  isOpen,
  onClose,
  importacion,
  template,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [batchCount, setBatchCount] = useState(3);
  const [batchIntervalSeconds, setBatchIntervalSeconds] = useState(300);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [executing, setExecuting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  const pendientes = importacion.pendientes;
  const batchSize = Math.ceil(pendientes / batchCount);
  const totalTime = (batchCount - 1) * batchIntervalSeconds;
  const totalMinutes = Math.ceil(totalTime / 60);

  const getBodyText = (t: WhatsAppTemplate): string => {
    const body = t.components?.find((c: { type: string; text?: string }) => c.type === 'BODY');
    return (body as { type: string; text?: string })?.text || '';
  };

  const scheduledAt = useMemo(() => {
    if (!scheduleEnabled || !scheduleDate) return null;
    return new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
  }, [scheduleEnabled, scheduleDate, scheduleTime]);

  const handleExecute = async () => {
    if (!user?.id || !user?.email) return;

    setExecuting(true);
    try {
      await importacionesService.createAndExecuteBroadcast({
        importacionId: importacion.id,
        templateId: template.id,
        templateName: template.name,
        batchCount,
        batchSize,
        batchIntervalSeconds,
        scheduledAt,
        userId: user.id,
        userEmail: user.email,
      });

      toast.success(
        scheduleEnabled
          ? `Broadcast programado para ${scheduleDate} ${scheduleTime}`
          : `Broadcast iniciado: ${pendientes} mensajes en ${batchCount} lotes`
      );
      onClose();
      onSuccess();
    } catch (err) {
      console.error('Error executing broadcast:', err);
      toast.error(err instanceof Error ? err.message : 'Error al ejecutar broadcast');
    } finally {
      setExecuting(false);
      setConfirmStep(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Configurar Broadcast
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {importacion.codigo_campana}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-5">
            {/* Template preview */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Plantilla</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{template.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{getBodyText(template)}</p>
            </div>

            {/* Recipients */}
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
              <Users className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Destinatarios pendientes</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{pendientes.toLocaleString()}</p>
              </div>
            </div>

            {/* Batch config */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Layers className="w-4 h-4" />
                Configuración de lotes
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Número de lotes
                  </label>
                  <select
                    value={batchCount}
                    onChange={(e) => setBatchCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'lote' : 'lotes'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Tamaño por lote
                  </label>
                  <div className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm font-medium text-gray-700 dark:text-gray-300">
                    ~{batchSize} contactos
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Intervalo entre lotes
                </label>
                <select
                  value={batchIntervalSeconds}
                  onChange={(e) => setBatchIntervalSeconds(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {BATCH_INTERVAL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <Zap className="w-3 h-3 inline mr-1 text-amber-500" />
                  Se enviarán <strong className="text-gray-900 dark:text-white">{pendientes.toLocaleString()}</strong> mensajes en{' '}
                  <strong className="text-gray-900 dark:text-white">{batchCount}</strong> lotes de{' '}
                  <strong className="text-gray-900 dark:text-white">~{batchSize}</strong> cada{' '}
                  <strong className="text-gray-900 dark:text-white">{BATCH_INTERVAL_OPTIONS.find(o => o.value === batchIntervalSeconds)?.label}</strong>
                  {totalMinutes > 0 && (
                    <> · Tiempo total estimado: <strong className="text-gray-900 dark:text-white">~{totalMinutes} min</strong></>
                  )}
                </p>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Calendar className="w-4 h-4" />
                  Programación
                </div>
                <button
                  onClick={() => setScheduleEnabled(!scheduleEnabled)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    scheduleEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <motion.div
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                    animate={{ left: scheduleEnabled ? '22px' : '2px' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              {scheduleEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-2 gap-3"
                >
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hora</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            {!confirmStep ? (
              <div className="flex items-center justify-between">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setConfirmStep(true)}
                  disabled={pendientes === 0 || (scheduleEnabled && !scheduleDate)}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Rocket className="w-4 h-4" />
                  {scheduleEnabled ? 'Programar Broadcast' : 'Ejecutar Broadcast'}
                </motion.button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Se enviarán <strong>{pendientes.toLocaleString()}</strong> mensajes con la plantilla <strong>{template.name}</strong>.
                    Esta acción no se puede deshacer.
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setConfirmStep(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    Volver
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExecute}
                    disabled={executing}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all disabled:opacity-50"
                  >
                    {executing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Ejecutando...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4" />
                        Confirmar y Ejecutar
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BroadcastConfigModal;
