/**
 * ============================================
 * MODAL DE SELECCION DE GRUPO DE PLANTILLAS
 * ============================================
 *
 * Muestra GRUPOS de plantillas WhatsApp con metricas
 * de salud. N8N selecciona la mejor plantilla del grupo.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Loader2, Send, Activity, BarChart3, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import { whatsappTemplatesService } from '../../../services/whatsappTemplatesService';
import type { TemplateGroupHealth } from '../../../types/whatsappTemplates';
import { GROUP_STATUS_CONFIG, type TemplateGroupStatus } from '../../../types/whatsappTemplates';
import { GroupStatusBadge } from '../../shared/GroupStatusBadge';

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (group: TemplateGroupHealth) => void;
}

const TemplateSelectionModal: React.FC<TemplateSelectionModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [groups, setGroups] = useState<TemplateGroupHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      loadGroups();
    }
  }, [isOpen]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await whatsappTemplatesService.getGroupsWithHealth();
      setGroups(data);
    } catch (err) {
      console.error('Error loading groups:', err);
      toast.error('Error al cargar grupos de plantillas');
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = g.group_name.toLowerCase().includes(term);
        const matchesDesc = g.description?.toLowerCase().includes(term);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [groups, searchTerm]);

  const formatRate = (value: string | null): string => {
    if (!value) return '\u2014';
    const num = parseFloat(value);
    return isNaN(num) ? '\u2014' : `${num.toFixed(1)}%`;
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
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Seleccionar Grupo de Plantillas
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  El sistema seleccionara la mejor plantilla automaticamente
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

          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar grupos de plantillas..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Groups List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-12">
                <Layers className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {groups.length === 0
                    ? 'No hay grupos de plantillas disponibles'
                    : 'No se encontraron grupos con los filtros seleccionados'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredGroups.map((group, idx) => {
                  const statusConfig = GROUP_STATUS_CONFIG[group.group_status as TemplateGroupStatus];
                  const sendable = statusConfig ? statusConfig.sendable : false;

                  return (
                    <motion.button
                      key={group.group_id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => sendable && onSelect(group)}
                      disabled={!sendable}
                      className={`w-full text-left p-4 rounded-xl border transition-all group ${
                        !sendable
                          ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {group.group_name}
                            </h4>
                            <GroupStatusBadge status={group.group_status as TemplateGroupStatus} />
                          </div>
                          {group.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                              {group.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                              <Activity className="w-3 h-3" />
                              {group.sendable_count}/{group.total_templates} activas
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                              <BarChart3 className="w-3 h-3" />
                              {formatRate(group.avg_reply_rate_24h)} respuesta
                            </span>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">
                              {group.total_sends_7d} envios/7d
                            </span>
                          </div>
                        </div>
                        {sendable && (
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                              <Send className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <Layers className="w-3 h-3 inline mr-1" />
                {filteredGroups.length} grupo{filteredGroups.length !== 1 ? 's' : ''} disponible{filteredGroups.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TemplateSelectionModal;
