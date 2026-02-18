/**
 * ============================================
 * GESTOR DE BASES DE DATOS (IMPORTACIONES MASIVAS)
 * ============================================
 *
 * Sistema completo para importar contactos desde CSV,
 * seleccionar plantillas y ejecutar broadcasts masivos.
 *
 * Flujo: Importar CSV → Seleccionar Template → Configurar Batches → Ejecutar
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Database, Users, Send, CheckCircle,
  XCircle, Clock, Loader2, Trash2, Eye, Rocket,
  MessageSquare, TrendingUp, RefreshCw, AlertCircle,
  FileSpreadsheet, BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { importacionesService } from '../../../services/importacionesService';
import {
  IMPORTACION_STATUS_CONFIG,
  BROADCAST_STATUS_CONFIG,
} from '../../../types/importaciones';
import type { ImportacionConStats } from '../../../types/importaciones';
import type { WhatsAppTemplate } from '../../../types/whatsappTemplates';
import ImportCSVModal from './ImportCSVModal';
import TemplateSelectionModal from './TemplateSelectionModal';
import BroadcastConfigModal from './BroadcastConfigModal';
import ImportacionDetailModal from './ImportacionDetailModal';

interface TemplateConRating extends WhatsAppTemplate {
  starRating: number;
  replyRate: number;
  totalSent: number;
}

const BasesDatosManager: React.FC = () => {
  const [importaciones, setImportaciones] = useState<ImportacionConStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Selected items for flow
  const [selectedImportacion, setSelectedImportacion] = useState<ImportacionConStats | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConRating | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await importacionesService.getImportaciones();
      setImportaciones(data);
    } catch (err) {
      console.error('Error loading importaciones:', err);
      toast.error('Error al cargar importaciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await importacionesService.deleteImportacion(id);
      toast.success('Importación eliminada');
      setDeletingId(null);
      loadData();
    } catch (err) {
      console.error('Error deleting:', err);
      toast.error('Error al eliminar');
    }
  }, [loadData]);

  const handleSelectTemplate = useCallback((importacion: ImportacionConStats) => {
    setSelectedImportacion(importacion);
    setShowTemplateModal(true);
  }, []);

  const handleTemplateSelected = useCallback((template: TemplateConRating) => {
    setSelectedTemplate(template);
    setShowTemplateModal(false);
    setShowBroadcastModal(true);
  }, []);

  const handleViewDetail = useCallback((importacion: ImportacionConStats) => {
    setSelectedImportacion(importacion);
    setShowDetailModal(true);
  }, []);

  // Filter
  const filtered = importaciones.filter(imp => {
    if (statusFilter !== 'all' && imp.estatus !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        imp.codigo_campana.toLowerCase().includes(q) ||
        imp.descripcion?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Summary stats
  const totalRegistros = importaciones.reduce((sum, i) => sum + i.total_registros, 0);
  const totalPendientes = importaciones.reduce((sum, i) => sum + i.pendientes, 0);
  const totalConvertidos = importaciones.reduce((sum, i) => sum + i.convertidos, 0);
  const totalEnviados = importaciones.reduce((sum, i) => sum + i.enviados, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bases de Datos
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Importa contactos y ejecuta broadcasts masivos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nueva Importación
          </motion.button>
        </div>
      </div>

      {/* Stats Summary */}
      {importaciones.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Importaciones', value: importaciones.length, icon: <Database className="w-5 h-5" />, gradient: 'from-blue-500 to-blue-600' },
            { label: 'Total Registros', value: totalRegistros.toLocaleString(), icon: <Users className="w-5 h-5" />, gradient: 'from-purple-500 to-purple-600' },
            { label: 'Pendientes', value: totalPendientes.toLocaleString(), icon: <Clock className="w-5 h-5" />, gradient: 'from-amber-500 to-orange-600' },
            { label: 'Convertidos', value: totalConvertidos.toLocaleString(), icon: <CheckCircle className="w-5 h-5" />, gradient: 'from-emerald-500 to-teal-600' },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center text-white`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Search + Filters */}
      {importaciones.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código de campaña..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los estatus</option>
            {Object.entries(IMPORTACION_STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : importaciones.length === 0 ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/25">
            <FileSpreadsheet className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Sin importaciones
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Importa tu primera base de datos de contactos para enviar broadcasts masivos por WhatsApp
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
          >
            <Plus className="w-5 h-5" />
            Importar Base de Datos
          </motion.button>
        </motion.div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Search className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No se encontraron importaciones con los filtros seleccionados
          </p>
        </div>
      ) : (
        /* Importaciones List */
        <div className="space-y-4">
          <AnimatePresence>
            {filtered.map((imp, idx) => {
              const statusConfig = IMPORTACION_STATUS_CONFIG[imp.estatus];
              const progressTotal = imp.total_registros || 1;
              const conversionRate = imp.total_registros > 0
                ? ((imp.convertidos / imp.total_registros) * 100).toFixed(1)
                : '0';

              return (
                <motion.div
                  key={imp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                          {imp.codigo_campana}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                          {statusConfig.label}
                        </span>
                        {imp.ultimo_broadcast && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${BROADCAST_STATUS_CONFIG[imp.ultimo_broadcast.estatus].bgClass} ${BROADCAST_STATUS_CONFIG[imp.ultimo_broadcast.estatus].textClass}`}>
                            <Rocket className="w-2.5 h-2.5" />
                            {imp.ultimo_broadcast.template_name}
                          </span>
                        )}
                      </div>

                      {imp.descripcion && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-1">
                          {imp.descripcion}
                        </p>
                      )}

                      {/* Progress bar */}
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex mb-3">
                        {[
                          { value: imp.enviados, color: 'bg-blue-500' },
                          { value: imp.respondidos, color: 'bg-amber-500' },
                          { value: imp.convertidos, color: 'bg-emerald-500' },
                          { value: imp.fallidos, color: 'bg-red-500' },
                        ].map((seg, i) => (
                          <div
                            key={i}
                            className={`${seg.color} h-full transition-all duration-500`}
                            style={{ width: `${(seg.value / progressTotal) * 100}%` }}
                          />
                        ))}
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <Users className="w-3 h-3" />
                          {imp.total_registros}
                        </span>
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <Send className="w-3 h-3" />
                          {imp.enviados}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-3 h-3" />
                          {imp.convertidos}
                        </span>
                        {imp.fallidos > 0 && (
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                            <XCircle className="w-3 h-3" />
                            {imp.fallidos}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                          <TrendingUp className="w-3 h-3" />
                          {conversionRate}%
                        </span>
                        <span className="text-gray-400 dark:text-gray-500">
                          {new Date(imp.creado).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleViewDetail(imp)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </motion.button>
                      {imp.pendientes > 0 && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSelectTemplate(imp)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-medium shadow-sm hover:shadow-md transition-all"
                          title="Enviar broadcast"
                        >
                          <Rocket className="w-3.5 h-3.5" />
                          Broadcast
                        </motion.button>
                      )}
                      {deletingId === imp.id ? (
                        <div className="flex items-center gap-1">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDelete(imp.id)}
                            className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setDeletingId(null)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <XCircle className="w-4 h-4 text-gray-500" />
                          </motion.button>
                        </div>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setDeletingId(imp.id)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <ImportCSVModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={loadData}
      />

      <TemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => { setShowTemplateModal(false); setSelectedImportacion(null); }}
        onSelect={handleTemplateSelected}
      />

      {selectedImportacion && selectedTemplate && (
        <BroadcastConfigModal
          isOpen={showBroadcastModal}
          onClose={() => { setShowBroadcastModal(false); setSelectedTemplate(null); setSelectedImportacion(null); }}
          importacion={selectedImportacion}
          template={selectedTemplate}
          onSuccess={loadData}
        />
      )}

      {selectedImportacion && showDetailModal && (
        <ImportacionDetailModal
          isOpen={showDetailModal}
          onClose={() => { setShowDetailModal(false); setSelectedImportacion(null); }}
          importacion={selectedImportacion}
        />
      )}
    </div>
  );
};

export default BasesDatosManager;
