import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Send, Search, Loader2, CheckCircle2, AlertTriangle, Calendar, Clock, Ban, TrendingUp, BarChart3, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { whatsappTemplatesService, type TemplateSendLimits } from '../../services/whatsappTemplatesService';
import type { WhatsAppTemplate, TemplateGroupHealth, GroupSendResponse } from '../../types/whatsappTemplates';
import { GROUP_STATUS_CONFIG, type TemplateGroupStatus } from '../../types/whatsappTemplates';
import { useAuth } from '../../contexts/AuthContext';
import { GroupStatusBadge } from '../shared/GroupStatusBadge';
import { GroupStarRating, calcGroupRating } from '../shared/GroupStarRating';
import { renderWhatsAppFormattedText } from '../../utils/whatsappTextFormatter';

// ============================================
// TIPOS
// ============================================

interface ReactivateConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSent?: () => void;
  conversation: {
    id: string;
    customer_name?: string;
    customer_phone?: string;
    metadata?: Record<string, unknown>;
  };
  prospectoData?: {
    id?: string;
    nombre_completo?: string;
    whatsapp?: string;
    etapa?: string;
    [key: string]: unknown;
  };
}

// ============================================
// ANIMACIONES
// ============================================

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

const modalContainer = {
  initial: { opacity: 0, scale: 0.96, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 10 },
  transition: { duration: 0.25, ease: EASE_OUT_EXPO },
};

const staggerItem = (index: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: index * 0.03, duration: 0.25, ease: EASE_OUT_EXPO },
});

const panelTransition = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.25, ease: EASE_OUT_EXPO },
};

// ============================================
// LIMIT PILL COMPONENT
// ============================================

const LimitPill: React.FC<{
  label: string;
  remaining: number;
  max: number;
  blocked: boolean;
  icon: React.ReactNode;
}> = ({ label, remaining, max, blocked, icon }) => {
  const colorClass = blocked
    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
    : remaining <= 1
    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
    : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${colorClass}`}>
      {icon}
      <span>{label}: {remaining}/{max}</span>
    </div>
  );
};

// ============================================
// HEALTH BAR COMPONENT
// ============================================

const HealthBar: React.FC<{ group: TemplateGroupHealth }> = ({ group }) => {
  const total = group.total_templates;
  if (total === 0) return null;

  const segments = [
    { count: group.healthy_count, color: 'bg-emerald-500', label: 'Saludables' },
    { count: group.warning_count, color: 'bg-yellow-500', label: 'Advertencia' },
    { count: group.critical_count, color: 'bg-orange-500', label: 'Criticos' },
    { count: group.dead_or_paused_count, color: 'bg-red-500', label: 'Inactivos' },
  ].filter(s => s.count > 0);

  return (
    <div className="space-y-1">
      <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`${seg.color} transition-all`}
            style={{ width: `${(seg.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        {segments.map((seg, i) => (
          <span key={i} className="flex items-center gap-1 text-[9px] text-gray-500 dark:text-gray-400">
            <span className={`w-1.5 h-1.5 rounded-full ${seg.color}`} />
            {seg.count} {seg.label.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const ReactivateConversationModal: React.FC<ReactivateConversationModalProps> = ({
  isOpen,
  onClose,
  onTemplateSent,
  conversation,
  prospectoData,
}) => {
  const { user } = useAuth();

  // --- Estado principal ---
  const [groups, setGroups] = useState<TemplateGroupHealth[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<TemplateGroupHealth | null>(null);
  const [previewTemplates, setPreviewTemplates] = useState<WhatsAppTemplate[]>([]);
  const [expandedPreviewIdx, setExpandedPreviewIdx] = useState(0);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const isSendingRef = useRef(false);
  const [sendingSuccess, setSendingSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- Limites de envio ---
  const [sendLimits, setSendLimits] = useState<TemplateSendLimits | null>(null);
  const [loadingLimits, setLoadingLimits] = useState(false);

  const prospectoEtapa = prospectoData?.etapa as string | undefined;

  // ============================================
  // CARGA DE DATOS
  // ============================================

  const loadGroups = useCallback(async () => {
    try {
      setLoadingGroups(true);
      const data = await whatsappTemplatesService.getGroupsWithHealth();
      setGroups(data);
    } catch (error) {
      console.error('Error cargando grupos:', error);
      toast.error('Error al cargar los grupos de plantillas');
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  const loadSendLimits = useCallback(async () => {
    if (!prospectoData?.id) return;
    try {
      setLoadingLimits(true);
      const limits = await whatsappTemplatesService.checkTemplateSendLimits(prospectoData.id as string);
      setSendLimits(limits);
    } catch (error) {
      console.error('Error cargando limites de envio:', error);
    } finally {
      setLoadingLimits(false);
    }
  }, [prospectoData?.id]);

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedGroup(null);
      setPreviewTemplates([]);
      setExpandedPreviewIdx(0);
      setSendingSuccess(false);
      setSending(false);
      isSendingRef.current = false;
      setSearchTerm('');
      loadGroups();
      loadSendLimits();
    }
  }, [isOpen, loadGroups, loadSendLimits]);

  // ============================================
  // SELECCION DE GRUPO
  // ============================================

  const handleSelectGroup = useCallback(async (group: TemplateGroupHealth) => {
    const statusConfig = GROUP_STATUS_CONFIG[group.group_status as TemplateGroupStatus];
    if (statusConfig && !statusConfig.sendable) return;

    setSelectedGroup(group);
    setPreviewTemplates([]);
    setExpandedPreviewIdx(0);
    setLoadingPreview(true);

    try {
      const allTemplates = await whatsappTemplatesService.getTemplatesByGroup(group.group_id);
      const approved = allTemplates
        .filter(t => t.status === 'APPROVED' && t.is_active)
        .slice(0, 5);
      setPreviewTemplates(approved);
    } catch (error) {
      console.error('Error cargando preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  // ============================================
  // ENVIO POR GRUPO
  // ============================================

  const handleSend = useCallback(async () => {
    if (!selectedGroup || !prospectoData?.id) {
      toast.error('Selecciona un grupo y asegurate de que hay un prospecto asociado');
      return;
    }
    if (isSendingRef.current || sending) return;

    try {
      isSendingRef.current = true;
      setSending(true);

      const result: GroupSendResponse = await whatsappTemplatesService.sendTemplateByGroup(
        selectedGroup.group_id,
        prospectoData.id as string,
        'MANUAL',
        user?.id
      );

      if (result.success) {
        isSendingRef.current = false;
        setSending(false);
        setSendingSuccess(true);
        setTimeout(() => {
          toast.success(`Plantilla "${result.template_name}" enviada exitosamente`);
          onTemplateSent?.();
          onClose();
        }, 1500);
      } else {
        isSendingRef.current = false;
        setSending(false);

        if (result.error === 'group_blocked' || result.error === 'group_disabled') {
          toast.error(result.message || 'Grupo bloqueado — todos los templates degradados');
        } else if (result.error === 'group_no_resolvable') {
          toast.error(result.message || 'No se pudo personalizar ningun template para este prospecto');
          // Mostrar detalles de templates descartados
          if (result.skipped_templates && result.skipped_templates.length > 0) {
            console.warn('Templates descartados:', result.skipped_templates);
          }
        } else {
          toast.error(result.message || result.error || 'Error al enviar la plantilla');
        }
      }
    } catch (error: unknown) {
      console.error('Error enviando plantilla:', error);
      toast.error((error as { message?: string }).message || 'Error al enviar la plantilla');
      isSendingRef.current = false;
      setSending(false);
    }
  }, [selectedGroup, prospectoData, sending, user, onTemplateSent, onClose]);

  // ============================================
  // FILTRADO DE GRUPOS
  // ============================================

  const filteredGroups = groups
    .filter(g =>
      g.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.description && g.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) =>
      calcGroupRating(b.group_status as TemplateGroupStatus, b.avg_reply_rate_24h) -
      calcGroupRating(a.group_status as TemplateGroupStatus, a.avg_reply_rate_24h)
    );

  // ============================================
  // HELPERS
  // ============================================

  const getPreviewBodyText = (template: WhatsAppTemplate): string => {
    const bodyComponent = template.components?.find(c => c.type === 'BODY');
    return bodyComponent?.text || '';
  };

  const formatRate = (value: string | null): string => {
    if (!value) return '\u2014';
    const num = parseFloat(value);
    return isNaN(num) ? '\u2014' : `${num.toFixed(1)}%`;
  };

  const isGroupSendable = (group: TemplateGroupHealth): boolean => {
    const statusConfig = GROUP_STATUS_CONFIG[group.group_status as TemplateGroupStatus];
    return statusConfig ? statusConfig.sendable : false;
  };

  // ============================================
  // RENDER
  // ============================================

  if (!isOpen || typeof document === 'undefined') return null;

  const scrollHiddenClass = 'overflow-y-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden';

  const modalContent = (
    <AnimatePresence>
      <motion.div
        {...modalBackdrop}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          {...modalContainer}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-200/50 dark:border-gray-700/50"
        >
          {/* ============================================ */}
          {/* HEADER */}
          {/* ============================================ */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                  Reactivar Conversacion
                </h3>
                {prospectoEtapa && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Etapa: <span className="font-medium text-indigo-600 dark:text-indigo-400">{prospectoEtapa}</span>
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Limites de envio */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {loadingLimits ? (
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-[11px]">Verificando limites...</span>
                </div>
              ) : sendLimits ? (
                <>
                  <LimitPill label="Hoy" remaining={sendLimits.dailyLimit.remaining} max={sendLimits.dailyLimit.max} blocked={sendLimits.dailyLimit.blocked} icon={<Clock className="w-3 h-3" />} />
                  <LimitPill label="Semana" remaining={sendLimits.weeklyLimit.remaining} max={sendLimits.weeklyLimit.max} blocked={sendLimits.weeklyLimit.blocked} icon={<Calendar className="w-3 h-3" />} />
                  <LimitPill label="Mes" remaining={sendLimits.monthlyLimit.remaining} max={sendLimits.monthlyLimit.max} blocked={sendLimits.monthlyLimit.blocked} icon={<Calendar className="w-3 h-3" />} />
                  <LimitPill label="Semestre" remaining={sendLimits.semesterLimit.remaining} max={sendLimits.semesterLimit.max} blocked={sendLimits.semesterLimit.blocked} icon={<TrendingUp className="w-3 h-3" />} />
                </>
              ) : null}
            </div>

            {/* Banner de bloqueo */}
            <AnimatePresence>
              {sendLimits && !sendLimits.canSend && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                >
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <Ban className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs font-medium">{sendLimits.blockReason}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ============================================ */}
          {/* CONTENIDO PRINCIPAL - DOS PANELES */}
          {/* ============================================ */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Panel izquierdo - Catalogo de Grupos */}
            <div className="w-[42%] border-r border-gray-100 dark:border-gray-800 flex flex-col min-h-0">
              {/* Search */}
              <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar grupos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-gray-800/50 dark:text-white transition-colors"
                  />
                </div>
              </div>

              {/* Lista de grupos */}
              <div className={`flex-1 p-3 space-y-1.5 min-h-0 ${scrollHiddenClass}`}>
                {loadingGroups ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                    <Search className="w-6 h-6 mb-2" />
                    <p className="text-sm">No se encontraron grupos</p>
                  </div>
                ) : (
                  filteredGroups.map((group, index) => {
                    const sendable = isGroupSendable(group);
                    const isSelected = selectedGroup?.group_id === group.group_id;

                    return (
                      <motion.button
                        key={group.group_id}
                        {...staggerItem(index)}
                        onClick={() => handleSelectGroup(group)}
                        disabled={!sendable}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          !sendable
                            ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30'
                            : isSelected
                            ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-400/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                              {group.group_name}
                            </h4>
                            <div className="mt-0.5">
                              <GroupStarRating status={group.group_status as TemplateGroupStatus} replyRate={group.avg_reply_rate_24h} showValue />
                            </div>
                          </div>
                          <GroupStatusBadge status={group.group_status as TemplateGroupStatus} />
                        </div>

                        {group.description && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                            {group.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            {group.sendable_count}/{group.total_templates}
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            {formatRate(group.avg_reply_rate_24h)} respuesta
                          </span>
                          <span>
                            {group.total_sends_7d} env/7d
                          </span>
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Panel derecho - Preview + Envio */}
            <div className="flex-1 flex flex-col min-h-0">
              <AnimatePresence mode="wait">
                {selectedGroup ? (
                  <motion.div
                    key={selectedGroup.group_id}
                    {...panelTransition}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <div className={`flex-1 p-5 space-y-4 min-h-0 ${scrollHiddenClass}`}>
                      {/* Header del grupo */}
                      <div>
                        <div className="flex items-center gap-2.5 mb-1">
                          <h4 className="text-base font-bold text-gray-900 dark:text-white">
                            {selectedGroup.group_name}
                          </h4>
                          <GroupStatusBadge status={selectedGroup.group_status as TemplateGroupStatus} size="md" />
                        </div>
                        {selectedGroup.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {selectedGroup.description}
                          </p>
                        )}
                      </div>

                      {/* Preview top 5 templates */}
                      <div>
                        <h5 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                          Vista Previa {previewTemplates.length > 0 && `(${previewTemplates.length})`}
                        </h5>
                        {loadingPreview ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                          </div>
                        ) : previewTemplates.length > 0 ? (
                          <div className="space-y-2">
                            {previewTemplates.map((tpl, idx) => {
                              const isExpanded = idx === expandedPreviewIdx;
                              const bodyText = getPreviewBodyText(tpl);
                              return (
                                <div key={tpl.id} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                  <button
                                    onClick={() => setExpandedPreviewIdx(idx)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                                      isExpanded
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                        : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80'
                                    }`}
                                  >
                                    <span className={`text-xs font-medium flex-1 truncate ${isExpanded ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                      {tpl.name}
                                    </span>
                                    {isExpanded ? <ChevronUp className="w-3 h-3 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                                  </button>
                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-4 py-3 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/15 dark:to-green-900/15 border-t border-emerald-200/50 dark:border-emerald-800/50">
                                          <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                            {renderWhatsAppFormattedText(bodyText)}
                                          </div>
                                          {tpl.components?.find(c => c.type === 'BUTTONS')?.buttons?.map((btn, i) => (
                                            <div key={i} className="mt-2 px-3 py-1.5 text-center text-xs font-medium text-blue-600 dark:text-blue-400 border-t border-emerald-200/50 dark:border-emerald-800/50">
                                              {btn.text}
                                            </div>
                                          ))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}

                            {/* Disclaimer */}
                            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                              <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                                El sistema selecciona automaticamente la mejor plantilla del grupo. El resultado final puede variar.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 dark:text-gray-500 italic py-4 text-center">
                            No hay plantillas disponibles para preview
                          </div>
                        )}
                      </div>

                      {/* Estadisticas del grupo */}
                      <div>
                        <h5 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                          Estadisticas
                        </h5>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Tasa respuesta</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatRate(selectedGroup.avg_reply_rate_24h)}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Tasa entrega</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatRate(selectedGroup.avg_delivery_rate_24h)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Health bar */}
                      <div>
                        <h5 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                          Salud del Grupo
                        </h5>
                        <HealthBar group={selectedGroup} />
                      </div>
                    </div>

                    {/* Footer con boton de envio */}
                    <div className="px-5 py-3.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        {conversation.customer_name && (
                          <span>Para: <span className="font-medium text-gray-700 dark:text-gray-300">{conversation.customer_name}</span></span>
                        )}
                      </div>

                      <AnimatePresence mode="wait">
                        {sendingSuccess ? (
                          <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Enviado</span>
                          </motion.div>
                        ) : (
                          <motion.button
                            key="send-btn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSend}
                            disabled={sending || !prospectoData?.id || !sendLimits?.canSend}
                            className={`px-4 py-2 text-xs font-medium text-white rounded-lg transition-all flex items-center gap-1.5 shadow-sm ${
                              !sendLimits?.canSend
                                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed shadow-none'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/25'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {sending ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Enviando...</span></>
                            ) : !sendLimits?.canSend ? (
                              <><Ban className="w-3.5 h-3.5" /><span>Limite alcanzado</span></>
                            ) : (
                              <><Send className="w-3.5 h-3.5" /><span>Enviar Plantilla</span></>
                            )}
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    {...panelTransition}
                    className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-8"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                      <Send className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Selecciona un grupo de plantillas
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center max-w-xs">
                      El sistema seleccionara automaticamente la mejor plantilla del grupo segun su salud y efectividad
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
