/**
 * ============================================
 * MODAL DE ENVIO DE PLANTILLA A PROSPECTO NUEVO
 * ============================================
 *
 * Modal para enviar plantillas WhatsApp a prospectos
 * que AUN NO tienen conversacion creada.
 *
 * Muestra GRUPOS de plantillas. N8N selecciona la mejor
 * plantilla del grupo, resuelve variables y envia.
 * La conversacion se crea automaticamente al enviar.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Loader2, CheckCircle, Search, Activity, BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { whatsappTemplatesService } from '../../services/whatsappTemplatesService';
import type { TemplateGroupHealth, WhatsAppTemplate, GroupSendResponse } from '../../types/whatsappTemplates';
import { GROUP_STATUS_CONFIG, type TemplateGroupStatus } from '../../types/whatsappTemplates';
import { GroupStatusBadge } from '../shared/GroupStatusBadge';
import { renderWhatsAppFormattedText } from '../../utils/whatsappTextFormatter';
import toast from 'react-hot-toast';

interface SendTemplateToProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospectoId: string;
  prospectoData: {
    id: string;
    nombre_completo: string;
    whatsapp: string;
    [key: string]: unknown;
  };
  onSuccess: (conversacionId?: string) => void;
}

export const SendTemplateToProspectModal: React.FC<SendTemplateToProspectModalProps> = ({
  isOpen,
  onClose,
  prospectoId,
  prospectoData,
  onSuccess
}) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<TemplateGroupHealth[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<TemplateGroupHealth | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar grupos al abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedGroup(null);
      setPreviewTemplate(null);
      setSending(false);
      setSearchTerm('');
      loadGroups();
    }
  }, [isOpen]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await whatsappTemplatesService.getGroupsWithHealth();
      setGroups(data);
    } catch (error) {
      console.error('Error cargando grupos:', error);
      toast.error('Error al cargar los grupos de plantillas');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = useCallback(async (group: TemplateGroupHealth) => {
    const statusConfig = GROUP_STATUS_CONFIG[group.group_status as TemplateGroupStatus];
    if (statusConfig && !statusConfig.sendable) return;

    setSelectedGroup(group);
    setPreviewTemplate(null);
    setLoadingPreview(true);

    try {
      const template = await whatsappTemplatesService.getGroupPreviewTemplate(group.group_id);
      setPreviewTemplate(template);
    } catch {
      // Preview no es critico
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const handleSend = async () => {
    if (!selectedGroup || !user) {
      toast.error('Selecciona un grupo de plantillas');
      return;
    }

    setSending(true);

    try {
      const result: GroupSendResponse = await whatsappTemplatesService.sendTemplateByGroup(
        selectedGroup.group_id,
        prospectoId,
        'MANUAL',
        user.id
      );

      if (result.success) {
        toast.success(`Plantilla "${result.template_name}" enviada exitosamente`);
        setSending(false);

        const conversacionId = result.conversacion_id;
        setTimeout(() => {
          onSuccess(conversacionId);
        }, 1500);
      } else {
        setSending(false);
        if (result.error === 'group_blocked' || result.error === 'group_disabled') {
          toast.error(result.message || 'Grupo bloqueado');
        } else if (result.error === 'group_no_resolvable') {
          toast.error(result.message || 'No se pudo personalizar ningun template para este prospecto');
        } else {
          toast.error(result.message || result.error || 'Error al enviar');
        }
      }
    } catch (error: unknown) {
      console.error('Error enviando plantilla:', error);
      toast.error((error as { message?: string }).message || 'Error al enviar la plantilla');
      setSending(false);
    }
  };

  const filteredGroups = groups.filter(g =>
    g.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatRate = (value: string | null): string => {
    if (!value) return '\u2014';
    const num = parseFloat(value);
    return isNaN(num) ? '\u2014' : `${num.toFixed(1)}%`;
  };

  const getPreviewBodyText = (template: WhatsAppTemplate): string => {
    const bodyComponent = template.components?.find(c => c.type === 'BODY');
    return bodyComponent?.text || '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Enviar Plantilla WhatsApp
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {prospectoData.nombre_completo} &bull; {prospectoData.whatsapp}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar grupos de plantillas..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Lista de grupos */}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {filteredGroups.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                        No hay grupos disponibles
                      </p>
                    ) : (
                      filteredGroups.map((group) => {
                        const statusConfig = GROUP_STATUS_CONFIG[group.group_status as TemplateGroupStatus];
                        const sendable = statusConfig ? statusConfig.sendable : false;
                        const isSelected = selectedGroup?.group_id === group.group_id;

                        return (
                          <motion.button
                            key={group.group_id}
                            whileHover={sendable ? { scale: 1.02 } : undefined}
                            whileTap={sendable ? { scale: 0.98 } : undefined}
                            onClick={() => handleSelectGroup(group)}
                            disabled={!sendable}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                              !sendable
                                ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
                                : isSelected
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                                  {group.group_name}
                                </h4>
                                {group.description && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                                    {group.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 mt-2">
                                  <GroupStatusBadge status={group.group_status as TemplateGroupStatus} />
                                  <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                                    <Activity className="w-3 h-3" />
                                    {group.sendable_count}/{group.total_templates}
                                  </span>
                                  <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                                    <BarChart3 className="w-3 h-3" />
                                    {formatRate(group.avg_reply_rate_24h)}
                                  </span>
                                </div>
                              </div>
                              {isSelected && (
                                <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 ml-2" />
                              )}
                            </div>
                          </motion.button>
                        );
                      })
                    )}
                  </div>

                  {/* Vista previa */}
                  <div className="space-y-4">
                    {selectedGroup ? (
                      <>
                        {loadingPreview ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                          </div>
                        ) : previewTemplate ? (
                          <>
                            <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/15 dark:to-green-900/15 rounded-xl p-4 border border-emerald-200/50 dark:border-emerald-800/50">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                Vista Previa
                              </h4>
                              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                {renderWhatsAppFormattedText(getPreviewBodyText(previewTemplate))}
                              </div>
                            </div>

                            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                              <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                                Este es un ejemplo de como llegara tu plantilla. El resultado final puede variar ligeramente dependiendo de la plantilla seleccionada automaticamente.
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-400 italic py-4 text-center">
                            No hay preview disponible
                          </div>
                        )}

                        {/* Stats mini */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                            <p className="text-[10px] text-gray-500">Tasa respuesta</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatRate(selectedGroup.avg_reply_rate_24h)}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                            <p className="text-[10px] text-gray-500">Envios 7d</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedGroup.total_sends_7d}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                        <div className="text-center">
                          <Send className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Selecciona un grupo de plantillas</p>
                          <p className="text-xs mt-1">El sistema elegira la mejor plantilla automaticamente</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={sending}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSend}
                disabled={!selectedGroup || sending}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Plantilla</span>
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
