/**
 * ============================================
 * MODAL DE DETALLE DE IMPORTACIÓN
 * ============================================
 *
 * Vista detallada: stats, tabla de importados con filtros,
 * historial de broadcasts.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Users, Send, Clock, CheckCircle, AlertCircle,
  Search, ChevronLeft, ChevronRight, Loader2,
  Database, Rocket, ExternalLink, XCircle,
  MessageSquare, BarChart3
} from 'lucide-react';
import { importacionesService } from '../../../services/importacionesService';
import {
  IMPORTADO_STATUS_CONFIG,
  BROADCAST_STATUS_CONFIG,
} from '../../../types/importaciones';
import type {
  ImportacionConStats,
  Importado,
  ImportacionBroadcast,
  ImportadoEstatus,
} from '../../../types/importaciones';

interface ImportacionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  importacion: ImportacionConStats;
}

const ImportacionDetailModal: React.FC<ImportacionDetailModalProps> = ({
  isOpen,
  onClose,
  importacion,
}) => {
  const [importados, setImportados] = useState<Importado[]>([]);
  const [broadcasts, setBroadcasts] = useState<ImportacionBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ImportadoEstatus | ''>('');
  const [activeTab, setActiveTab] = useState<'importados' | 'broadcasts'>('importados');
  const pageSize = 50;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [importadosResult, broadcastsResult] = await Promise.all([
        importacionesService.getImportados(importacion.id, {
          page,
          pageSize,
          search: searchTerm || undefined,
          estatus: (statusFilter as ImportadoEstatus) || undefined,
        }),
        importacionesService.getBroadcasts(importacion.id),
      ]);
      setImportados(importadosResult.data);
      setTotal(importadosResult.total);
      setBroadcasts(broadcastsResult);
    } catch (err) {
      console.error('Error loading detail:', err);
    } finally {
      setLoading(false);
    }
  }, [importacion.id, page, searchTerm, statusFilter]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(total / pageSize);
  const conversionRate = importacion.total_registros > 0
    ? ((importacion.convertidos / importacion.total_registros) * 100).toFixed(1)
    : '0';

  if (!isOpen) return null;

  const stats = [
    { label: 'Total', value: importacion.total_registros, icon: <Database className="w-4 h-4" />, color: 'blue' },
    { label: 'Pendientes', value: importacion.pendientes, icon: <Clock className="w-4 h-4" />, color: 'gray' },
    { label: 'Enviados', value: importacion.enviados, icon: <Send className="w-4 h-4" />, color: 'blue' },
    { label: 'Respondidos', value: importacion.respondidos, icon: <MessageSquare className="w-4 h-4" />, color: 'amber' },
    { label: 'Convertidos', value: importacion.convertidos, icon: <CheckCircle className="w-4 h-4" />, color: 'emerald' },
    { label: 'Fallidos', value: importacion.fallidos, icon: <XCircle className="w-4 h-4" />, color: 'red' },
  ];

  // Progress bar segments
  const progressTotal = importacion.total_registros || 1;
  const segments = [
    { value: importacion.enviados, color: 'bg-blue-500' },
    { value: importacion.respondidos, color: 'bg-amber-500' },
    { value: importacion.convertidos, color: 'bg-emerald-500' },
    { value: importacion.fallidos, color: 'bg-red-500' },
  ];

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
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {importacion.codigo_campana}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                    {conversionRate}% conversión
                  </span>
                </div>
                {importacion.descripcion && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{importacion.descripcion}</p>
                )}
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

          {/* Stats Grid */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-6 gap-3 mb-3">
              {stats.map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`text-center p-2.5 rounded-xl border bg-${stat.color}-50 dark:bg-${stat.color}-900/20 border-${stat.color}-200 dark:border-${stat.color}-800`}
                >
                  <div className={`text-${stat.color}-500 mx-auto mb-1 flex justify-center`}>{stat.icon}</div>
                  <p className={`text-lg font-bold text-${stat.color}-700 dark:text-${stat.color}-300`}>{stat.value}</p>
                  <p className={`text-[10px] text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
              {segments.map((seg, idx) => (
                <motion.div
                  key={idx}
                  className={`${seg.color} h-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(seg.value / progressTotal) * 100}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                />
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-4">
              {([['importados', 'Registros', Users], ['broadcasts', 'Broadcasts', Rocket]] as const).map(([tab, label, Icon]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-all ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'importados' && (
              <div className="px-6 py-4">
                {/* Filters */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nombre o teléfono..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ImportadoEstatus | '')}
                    className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos los estatus</option>
                    {Object.entries(IMPORTADO_STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>

                {/* Table */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : importados.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No se encontraron registros</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Nombre</th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Teléfono</th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Dynamics</th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Estatus</th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Fecha</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {importados.map((imp, idx) => {
                            const statusConfig = IMPORTADO_STATUS_CONFIG[imp.estatus];
                            return (
                              <motion.tr
                                key={imp.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.02 }}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800/30"
                              >
                                <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100 font-medium">{imp.nombre}</td>
                                <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 font-mono text-xs">
                                  {imp.telefono_normalizado || imp.telefono}
                                </td>
                                <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">
                                  {imp.id_dynamics || '-'}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                                    {statusConfig.label}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">
                                  {new Date(imp.creado).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, total)} de {total} registros
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                          <span className="text-xs text-gray-600 dark:text-gray-400 px-2">
                            {page} / {totalPages}
                          </span>
                          <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
                          >
                            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'broadcasts' && (
              <div className="px-6 py-4">
                {broadcasts.length === 0 ? (
                  <div className="text-center py-12">
                    <Rocket className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No hay broadcasts ejecutados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {broadcasts.map((bc, idx) => {
                      const statusConfig = BROADCAST_STATUS_CONFIG[bc.estatus];
                      return (
                        <motion.div
                          key={bc.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{bc.template_name}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                                  {statusConfig.label}
                                </span>
                              </div>
                              <div className="grid grid-cols-4 gap-3 text-xs">
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">Destinatarios</p>
                                  <p className="font-medium text-gray-900 dark:text-white">{bc.total_destinatarios}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">Lotes</p>
                                  <p className="font-medium text-gray-900 dark:text-white">{bc.batch_count} x ~{bc.batch_size}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">Enviados</p>
                                  <p className="font-medium text-emerald-600 dark:text-emerald-400">{bc.enviados}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">Fallidos</p>
                                  <p className="font-medium text-red-600 dark:text-red-400">{bc.fallidos}</p>
                                </div>
                              </div>
                              {bc.error_message && (
                                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                  <p className="text-xs text-red-600 dark:text-red-400">{bc.error_message}</p>
                                </div>
                              )}
                            </div>
                            <div className="text-right text-xs text-gray-400 dark:text-gray-500">
                              <p>{new Date(bc.creado).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                              {bc.ejecutado_por_email && (
                                <p className="mt-0.5">{bc.ejecutado_por_email.split('@')[0]}</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImportacionDetailModal;
