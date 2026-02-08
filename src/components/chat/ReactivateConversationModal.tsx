import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Send, Search, Loader2, CheckCircle2, Star, Sparkles, AlertTriangle, Calendar, Clock, Ban, Lightbulb, TrendingUp, User, MessageSquare, ChevronDown, FileText, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { whatsappTemplatesService, type TemplateSendLimits, type TemplateResponseRate } from '../../services/whatsappTemplatesService';
import type { WhatsAppTemplate } from '../../types/whatsappTemplates';
import { SPECIAL_UTILITY_TEMPLATE_NAME, SPECIAL_UTILITY_TEMPLATE_CONFIG } from '../../types/whatsappTemplates';
import { analysisSupabase } from '../../config/analysisSupabase';
import { useAuth } from '../../contexts/AuthContext';
import { whatsappTemplateSuggestionsService, type SuggestionStats } from '../../services/whatsappTemplateSuggestionsService';

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

type TabType = 'top' | 'mis';

type CustomVariableType = 'prospecto' | 'destino' | 'resort' | 'fecha_actual' | 'fecha_personalizada' | 'hora_actual' | 'hora_personalizada' | 'ejecutivo';

interface CustomVariable {
  value: string;
  type: CustomVariableType;
  destinoId?: string;
  resortId?: string;
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
// STAR RATING COMPONENT
// ============================================

const StarRating: React.FC<{ rating: number; replyRate: number; totalSent: number }> = ({ rating, replyRate, totalSent }) => {
  if (rating === 0) {
    return (
      <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">Sin datos</span>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.div
            key={star}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: star * 0.04, type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Star
              className={`w-3 h-3 ${
                star <= rating
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          </motion.div>
        ))}
      </div>
      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
        {replyRate}% <span className="text-gray-400 dark:text-gray-500">({totalSent})</span>
      </span>
    </div>
  );
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
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [audiences, setAudiences] = useState<Array<{
    id: string;
    nombre: string;
    etapa?: string | null;
    destinos?: string[];
    viaja_con?: string[];
    estado_civil?: string | null;
  }>>([]);
  const [responseRates, setResponseRates] = useState<Map<string, TemplateResponseRate>>(new Map());
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const isSendingRef = useRef(false);
  const [sendingSuccess, setSendingSuccess] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('top');
  const [destinos, setDestinos] = useState<Array<{ id: string; nombre: string }>>([]);
  const [resorts, setResorts] = useState<Array<{ id: string; nombre: string; nombre_completo: string }>>([]);

  // --- Límites de envío ---
  const [sendLimits, setSendLimits] = useState<TemplateSendLimits | null>(null);
  const [loadingLimits, setLoadingLimits] = useState(false);
  const [selectedTemplateBlocked, setSelectedTemplateBlocked] = useState<{ blocked: boolean; reason: string | null }>({ blocked: false, reason: null });

  // --- Variables personalizadas ---
  const [customVariables, setCustomVariables] = useState<Record<number, CustomVariable>>({});

  // --- Sugerencia de plantilla ---
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [suggestionName, setSuggestionName] = useState('');
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionJustification, setSuggestionJustification] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionStats, setSuggestionStats] = useState<SuggestionStats | null>(null);

  // ============================================
  // CARGA DE DATOS
  // ============================================

  const loadSendLimits = useCallback(async () => {
    if (!prospectoData?.id) return;
    try {
      setLoadingLimits(true);
      const limits = await whatsappTemplatesService.checkTemplateSendLimits(prospectoData.id as string);
      setSendLimits(limits);
    } catch (error) {
      console.error('Error cargando límites de envío:', error);
    } finally {
      setLoadingLimits(false);
    }
  }, [prospectoData?.id]);

  const loadSuggestionStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const stats = await whatsappTemplateSuggestionsService.getSuggestionStats(user.id);
      setSuggestionStats(stats);
    } catch (error) {
      console.error('Error cargando stats de sugerencias:', error);
    }
  }, [user?.id]);

  const loadTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const data = await whatsappTemplatesService.getAllTemplates();
      const activeTemplates = data.filter(t => t.is_active && t.status === 'APPROVED');
      setTemplates(activeTemplates);
    } catch (error) {
      console.error('Error cargando plantillas:', error);
      toast.error('Error al cargar las plantillas');
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const loadAudiences = useCallback(async () => {
    try {
      const { data, error } = await analysisSupabase!
        .from('whatsapp_audiences')
        .select('id, nombre, etapa, destinos, viaja_con, estado_civil')
        .eq('is_active', true);
      if (error) throw error;
      setAudiences(data || []);
    } catch (error) {
      console.error('Error cargando audiencias:', error);
    }
  }, []);

  const loadDestinos = useCallback(async () => {
    try {
      const destinosData = await whatsappTemplatesService.getDestinos();
      setDestinos(destinosData);
    } catch (error) {
      console.error('Error cargando destinos:', error);
    }
  }, []);

  const loadResorts = useCallback(async (destinoId: string) => {
    try {
      const resortsData = await whatsappTemplatesService.getResortsByDestino(destinoId);
      setResorts(resortsData);
    } catch (error) {
      console.error('Error cargando resorts:', error);
    }
  }, []);

  const loadResponseRates = useCallback(async () => {
    try {
      const rates = await whatsappTemplatesService.getTemplateResponseRates();
      setResponseRates(rates);
    } catch (error) {
      console.error('Error cargando tasas de respuesta:', error);
    }
  }, []);

  // Cargar todo al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadAudiences();
      loadDestinos();
      loadSendLimits();
      loadSuggestionStats();
      loadResponseRates();
      // Reset state
      setSelectedTemplate(null);
      setSearchTerm('');
      setActiveTab('top');
      setShowSuggestionForm(false);
      setSendingSuccess(false);
      setPreview('');
      setCustomVariables({});
    }
  }, [isOpen, loadTemplates, loadAudiences, loadDestinos, loadSendLimits, loadSuggestionStats, loadResponseRates]);

  // ============================================
  // SCORING Y FILTRADO DE PLANTILLAS
  // ============================================

  const prospectoEtapa = prospectoData?.etapa || (prospectoData?.metadata as Record<string, unknown>)?.etapa as string || null;
  const prospectoDestinos = prospectoData?.destino_preferencia
    ? (Array.isArray(prospectoData.destino_preferencia)
        ? prospectoData.destino_preferencia as string[]
        : [prospectoData.destino_preferencia as string])
    : [];
  const prospectoViajaCon = prospectoData?.viaja_con
    ? (Array.isArray(prospectoData.viaja_con)
        ? prospectoData.viaja_con as string[]
        : [prospectoData.viaja_con as string])
    : [];
  const prospectoEstadoCivil = (prospectoData?.estado_civil as string) || null;

  const calculateAudienceMatchScore = useCallback((audience: typeof audiences[0]): number => {
    let score = 0;
    let totalCriteria = 0;

    if (audience.etapa) {
      totalCriteria += 3;
      if (prospectoEtapa && audience.etapa === prospectoEtapa) score += 3;
    }
    if (audience.destinos && audience.destinos.length > 0) {
      totalCriteria += 2;
      const hasMatch = prospectoDestinos.some(d =>
        audience.destinos!.some(ad => d.toLowerCase().includes(ad.toLowerCase()) || ad.toLowerCase().includes(d.toLowerCase()))
      );
      if (hasMatch) score += 2;
    }
    if (audience.viaja_con && audience.viaja_con.length > 0) {
      totalCriteria += 2;
      const hasMatch = prospectoViajaCon.some(v =>
        audience.viaja_con!.some(av => v.toLowerCase() === av.toLowerCase())
      );
      if (hasMatch) score += 2;
    }
    if (audience.estado_civil) {
      totalCriteria += 1;
      if (prospectoEstadoCivil && audience.estado_civil === prospectoEstadoCivil) score += 1;
    }

    return totalCriteria > 0 ? (score / totalCriteria) * 100 : 0;
  }, [prospectoEtapa, prospectoDestinos, prospectoViajaCon, prospectoEstadoCivil]);

  const calculateTemplateMatchScore = useCallback((template: WhatsAppTemplate): number => {
    const classification = (template as Record<string, unknown>).classification as { audience_ids?: string[] } | undefined;
    const audienceIds = classification?.audience_ids || [];
    if (audienceIds.length === 0) return 0;
    const templateAudiences = audiences.filter(a => audienceIds.includes(a.id));
    if (templateAudiences.length === 0) return 0;
    const scores = templateAudiences.map(aud => calculateAudienceMatchScore(aud));
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }, [audiences, calculateAudienceMatchScore]);

  // Verificar si prospecto cumple variables requeridas
  const canProspectFulfillTemplate = useCallback((template: WhatsAppTemplate): { canFulfill: boolean; missingFields: string[] } => {
    if (!prospectoData) return { canFulfill: true, missingFields: [] };

    let variableMappings: Array<Record<string, unknown>> = [];
    if (template.variable_mappings) {
      if (Array.isArray(template.variable_mappings)) {
        variableMappings = template.variable_mappings as Array<Record<string, unknown>>;
      } else if (typeof template.variable_mappings === 'object' && 'mappings' in template.variable_mappings) {
        const mappingsObj = template.variable_mappings as { mappings?: Array<Record<string, unknown>> };
        variableMappings = Array.isArray(mappingsObj.mappings) ? mappingsObj.mappings : [];
      }
    }

    if (variableMappings.length === 0) return { canFulfill: true, missingFields: [] };

    const missingFields: string[] = [];
    for (const mapping of variableMappings) {
      if (mapping.table_name === 'prospectos') {
        const fieldValue = prospectoData[mapping.field_name as string];
        if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
          missingFields.push(mapping.display_name as string || mapping.field_name as string);
        }
      }
    }

    return { canFulfill: missingFields.length === 0, missingFields };
  }, [prospectoData]);

  // Obtener etapas de una plantilla
  const getTemplateEtapas = useCallback((template: WhatsAppTemplate) => {
    const classification = (template as Record<string, unknown>).classification as { audience_ids?: string[] } | undefined;
    const audienceIds = classification?.audience_ids || [];
    const templateAudiences = audiences.filter(a => audienceIds.includes(a.id));
    const etapas = templateAudiences
      .map(a => a.etapa)
      .filter((etapa): etapa is string => etapa !== null && etapa !== undefined);
    return [...new Set(etapas)];
  }, [audiences]);

  // Tipo compartido para items de plantilla
  type TemplateItem = { template: WhatsAppTemplate; score: number; rate: TemplateResponseRate | undefined; canFulfill: boolean; missingFields: string[] };

  // Filtrar y ordenar plantillas
  const filteredAndSortedTemplates = useMemo((): { regular: TemplateItem[]; specialUtility: TemplateItem[] } => {
    let filtered = templates;

    // Filtrar por tab "Mis plantillas"
    if (activeTab === 'mis' && user?.id) {
      filtered = filtered.filter(t => t.suggested_by === user.id);
    }

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        (t.description && t.description.toLowerCase().includes(searchLower))
      );
    }

    // Separar compatibles, incompatibles y plantilla especial de utilidad
    const compatible: TemplateItem[] = [];
    const incompatible: TemplateItem[] = [];
    const specialUtility: TemplateItem[] = [];

    filtered.forEach(template => {
      const score = calculateTemplateMatchScore(template);
      const rate = responseRates.get(template.id);
      const fulfillment = canProspectFulfillTemplate(template);

      const item: TemplateItem = { template, score, rate, canFulfill: fulfillment.canFulfill, missingFields: fulfillment.missingFields };

      // Separar plantilla especial de utilidad
      if (template.name === SPECIAL_UTILITY_TEMPLATE_NAME) {
        if (prospectoEtapa && (SPECIAL_UTILITY_TEMPLATE_CONFIG.blockedEtapas as readonly string[]).includes(prospectoEtapa)) {
          specialUtility.push({ ...item, canFulfill: false, missingFields: ['No disponible para "Es miembro"'] });
        } else {
          specialUtility.push(item);
        }
        return;
      }

      if (fulfillment.canFulfill) {
        compatible.push(item);
      } else {
        incompatible.push(item);
      }
    });

    // Ordenar compatibles: por starRating desc, luego replyRate desc, luego audienceScore desc
    compatible.sort((a, b) => {
      const starA = a.rate?.starRating || 0;
      const starB = b.rate?.starRating || 0;
      if (starB !== starA) return starB - starA;
      const rateA = a.rate?.replyRate || 0;
      const rateB = b.rate?.replyRate || 0;
      if (rateB !== rateA) return rateB - rateA;
      return b.score - a.score;
    });

    // Incompatibles al final, misma lógica de orden
    incompatible.sort((a, b) => {
      const starA = a.rate?.starRating || 0;
      const starB = b.rate?.starRating || 0;
      if (starB !== starA) return starB - starA;
      return b.score - a.score;
    });

    return { regular: [...compatible, ...incompatible], specialUtility };
  }, [templates, searchTerm, activeTab, user?.id, calculateTemplateMatchScore, responseRates, canProspectFulfillTemplate, prospectoEtapa]);

  const myTemplatesCount = useMemo(() => {
    if (!user?.id) return 0;
    return templates.filter(t => t.suggested_by === user.id).length;
  }, [templates, user?.id]);

  // ============================================
  // MANEJO DE SELECCIÓN DE PLANTILLA
  // ============================================

  const handleSelectTemplate = useCallback(async (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    if (showSuggestionForm) setShowSuggestionForm(false);

    // Verificar si está bloqueada (incluye restricciones especiales de utilidad)
    if (prospectoData?.id) {
      const check = await whatsappTemplatesService.canSendTemplateToProspect(
        prospectoData.id as string, template.id, template.name, prospectoEtapa
      );
      setSelectedTemplateBlocked({ blocked: !check.canSend, reason: check.reason });
    }

    // Inicializar variables
    const initialVars: Record<number, CustomVariable> = {};

    const allVariablesInText: number[] = [];
    template.components.forEach(component => {
      if (component.text) {
        const vars = whatsappTemplatesService.extractVariables(component.text);
        vars.forEach(v => { if (!allVariablesInText.includes(v)) allVariablesInText.push(v); });
      }
    });

    // Normalizar variable_mappings
    let variableMappings: Array<Record<string, unknown>> = [];
    if (template.variable_mappings) {
      if (Array.isArray(template.variable_mappings)) {
        variableMappings = template.variable_mappings as Array<Record<string, unknown>>;
      } else if (typeof template.variable_mappings === 'object' && 'mappings' in template.variable_mappings) {
        const mappingsObj = template.variable_mappings as { mappings?: Array<Record<string, unknown>> };
        variableMappings = Array.isArray(mappingsObj.mappings) ? mappingsObj.mappings : [];
      }
    }

    // Cargar datos de llamadas_ventas si necesario
    let llamadasVentasData: Record<string, unknown> | null = null;
    const needsLlamadasVentas = variableMappings.some(m => m.table_name === 'llamadas_ventas');
    if (needsLlamadasVentas && prospectoData?.id) {
      try {
        const { data, error } = await analysisSupabase!
          .from('llamadas_ventas')
          .select('*')
          .eq('prospecto_id', prospectoData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (!error && data) llamadasVentasData = data;
      } catch { /* silent */ }
    }

    if (variableMappings.length > 0) {
      variableMappings.forEach(mapping => {
        const varNum = mapping.variable_number as number;
        const tableName = mapping.table_name as string;
        const fieldName = mapping.field_name as string;

        if (tableName === 'prospectos' && prospectoData) {
          let value = prospectoData[fieldName];
          if ((value === null || value === undefined || value === '') && fieldName === 'titulo') {
            value = prospectoData.nombre || ((prospectoData.nombre_completo as string)?.split(' ')[0]) || '';
          }
          if ((value === null || value === undefined || value === '') && (fieldName === 'nombre' || fieldName === 'primer_nombre')) {
            value = prospectoData.nombre || ((prospectoData.nombre_completo as string)?.split(' ')[0]) || '';
          }
          if (value === null || value === undefined) value = '';
          else if (Array.isArray(value)) value = value[0] || '';
          else value = String(value);
          initialVars[varNum] = { value: value as string, type: 'prospecto' };
        } else if (tableName === 'llamadas_ventas' && llamadasVentasData) {
          let value = llamadasVentasData[fieldName];
          if (value === null || value === undefined) value = '';
          else if (Array.isArray(value)) value = value[0] || '';
          else value = String(value);
          initialVars[varNum] = { value: value as string, type: 'prospecto' };
        } else if (tableName === 'system') {
          if (fieldName === 'ejecutivo_nombre') {
            initialVars[varNum] = { value: user?.full_name || '', type: 'ejecutivo' };
          } else if (fieldName === 'fecha_actual') {
            initialVars[varNum] = { value: 'current', type: 'fecha_actual' };
          } else if (fieldName === 'hora_actual') {
            initialVars[varNum] = { value: 'current', type: 'hora_actual' };
          } else if (fieldName === 'fecha_personalizada') {
            initialVars[varNum] = { value: '', type: 'fecha_personalizada' };
          } else if (fieldName === 'hora_personalizada') {
            initialVars[varNum] = { value: '', type: 'hora_personalizada' };
          }
        } else if (tableName === 'destinos') {
          let destinoNombre = '';
          if (prospectoData?.destino_preferencia) {
            if (Array.isArray(prospectoData.destino_preferencia)) {
              destinoNombre = (prospectoData.destino_preferencia as string[])[0] || '';
            } else {
              destinoNombre = String(prospectoData.destino_preferencia);
            }
          }
          initialVars[varNum] = { value: destinoNombre, type: 'destino' };
        } else if (tableName === 'resorts') {
          initialVars[varNum] = { value: '', type: 'resort' };
        }
      });
    } else {
      allVariablesInText.forEach(varNum => {
        if (prospectoData) {
          if (varNum === 1) {
            const titulo = (prospectoData.titulo as string) || (prospectoData.nombre as string) || (prospectoData.primer_nombre as string) ||
                          ((prospectoData.nombre_completo as string)?.split(' ')[0]) || '';
            initialVars[varNum] = { value: titulo, type: 'prospecto' };
          } else if (varNum === 2) {
            initialVars[varNum] = { value: (prospectoData.apellido_paterno as string) || '', type: 'prospecto' };
          } else if (varNum === 3) {
            const destPref = prospectoData.destino_preferencia;
            initialVars[varNum] = {
              value: (prospectoData.apellido_materno as string) || (Array.isArray(destPref) ? destPref[0] : '') || '',
              type: prospectoData.apellido_materno ? 'prospecto' : 'destino',
            };
          } else if (varNum === 4) {
            initialVars[varNum] = { value: (prospectoData.email as string) || '', type: 'prospecto' };
          } else {
            initialVars[varNum] = { value: '', type: 'prospecto' };
          }
        } else {
          initialVars[varNum] = { value: '', type: 'prospecto' };
        }
      });
    }

    setCustomVariables(initialVars);
  }, [prospectoData, user?.full_name, showSuggestionForm]);

  // ============================================
  // PREVIEW
  // ============================================

  const generatePreview = useCallback(async () => {
    if (!selectedTemplate) return;
    try {
      setLoading(true);
      const variablesMap: Record<number, string> = {};

      const allVariablesInText: number[] = [];
      selectedTemplate.components.forEach(component => {
        if (component.text) {
          const vars = whatsappTemplatesService.extractVariables(component.text);
          vars.forEach(v => { if (!allVariablesInText.includes(v)) allVariablesInText.push(v); });
        }
      });

      let variableMappings: Array<Record<string, unknown>> = [];
      if (selectedTemplate.variable_mappings) {
        if (Array.isArray(selectedTemplate.variable_mappings)) {
          variableMappings = selectedTemplate.variable_mappings as Array<Record<string, unknown>>;
        } else if (typeof selectedTemplate.variable_mappings === 'object' && 'mappings' in selectedTemplate.variable_mappings) {
          const mappingsObj = selectedTemplate.variable_mappings as { mappings?: Array<Record<string, unknown>> };
          variableMappings = Array.isArray(mappingsObj.mappings) ? mappingsObj.mappings : [];
        }
      }

      if (variableMappings.length > 0) {
        variableMappings.forEach(mapping => {
          const varNum = mapping.variable_number as number;
          const customVar = customVariables[varNum];
          if (customVar) {
            if (mapping.table_name === 'system') {
              let customValue: string | undefined = undefined;
              if (mapping.field_name === 'fecha_personalizada' || mapping.field_name === 'hora_personalizada') {
                customValue = customVar.value && customVar.value.trim() !== '' ? customVar.value : undefined;
              }
              variablesMap[varNum] = whatsappTemplatesService.getSystemVariableValue(
                mapping.field_name as string, customValue, user?.full_name
              );
            } else if (mapping.table_name === 'destinos' && customVar.destinoId) {
              variablesMap[varNum] = destinos.find(d => d.id === customVar.destinoId)?.nombre || '';
            } else if (mapping.table_name === 'resorts' && customVar.resortId) {
              const resort = resorts.find(r => r.id === customVar.resortId);
              variablesMap[varNum] = resort?.nombre || resort?.nombre_completo || '';
            } else {
              variablesMap[varNum] = customVar.value || '';
            }
          }
        });
      } else {
        allVariablesInText.forEach(varNum => {
          const customVar = customVariables[varNum];
          if (customVar) {
            if (customVar.type === 'destino' && customVar.destinoId) {
              variablesMap[varNum] = destinos.find(d => d.id === customVar.destinoId)?.nombre || customVar.value || '';
            } else if (customVar.type === 'resort' && customVar.resortId) {
              const resort = resorts.find(r => r.id === customVar.resortId);
              variablesMap[varNum] = resort?.nombre || resort?.nombre_completo || customVar.value || '';
            } else if (customVar.type === 'fecha_actual' || customVar.type === 'hora_actual' || customVar.type === 'ejecutivo') {
              const fieldName = customVar.type === 'ejecutivo' ? 'ejecutivo_nombre' : customVar.type === 'fecha_actual' ? 'fecha_actual' : 'hora_actual';
              variablesMap[varNum] = whatsappTemplatesService.getSystemVariableValue(fieldName, undefined, user?.full_name);
            } else {
              variablesMap[varNum] = customVar.value || '';
            }
          }
        });
      }

      const previewText = await whatsappTemplatesService.generateExample(selectedTemplate, variablesMap, user?.full_name || '');
      setPreview(previewText);
    } catch (error) {
      console.error('Error generando preview:', error);
      setPreview('Error al generar la vista previa');
    } finally {
      setLoading(false);
    }
  }, [selectedTemplate, customVariables, destinos, resorts, user]);

  const customVariablesKey = useMemo(() => JSON.stringify(customVariables), [customVariables]);
  useEffect(() => {
    if (selectedTemplate) generatePreview();
  }, [selectedTemplate, customVariablesKey, destinos.length, resorts.length, generatePreview]);

  // ============================================
  // VALIDACIONES
  // ============================================

  const areAllVariablesComplete = useMemo(() => {
    if (!selectedTemplate) return false;
    const allVars: number[] = [];
    selectedTemplate.components.forEach(c => {
      if (c.text) whatsappTemplatesService.extractVariables(c.text).forEach(v => { if (!allVars.includes(v)) allVars.push(v); });
    });
    for (const varNum of allVars) {
      const cv = customVariables[varNum];
      if (!cv) return false;
      if (cv.type === 'fecha_actual' || cv.type === 'hora_actual' || cv.type === 'ejecutivo') continue;
      if (cv.type === 'destino' && !cv.destinoId && (!cv.value || !cv.value.trim())) return false;
      if (cv.type === 'resort' && !cv.resortId) return false;
      if (!cv.value || !cv.value.trim()) return false;
    }
    return true;
  }, [selectedTemplate, customVariables]);

  const normalizedMappings = useMemo(() => {
    if (!selectedTemplate) return [];
    let mappings: Array<Record<string, unknown>> = [];
    if (selectedTemplate.variable_mappings) {
      if (Array.isArray(selectedTemplate.variable_mappings)) {
        mappings = selectedTemplate.variable_mappings as Array<Record<string, unknown>>;
      } else if (typeof selectedTemplate.variable_mappings === 'object' && 'mappings' in selectedTemplate.variable_mappings) {
        const obj = selectedTemplate.variable_mappings as { mappings?: Array<Record<string, unknown>> };
        mappings = Array.isArray(obj.mappings) ? obj.mappings : [];
      }
    }
    if (mappings.length === 0) {
      const allVars: number[] = [];
      selectedTemplate.components.forEach(c => {
        if (c.text) whatsappTemplatesService.extractVariables(c.text).forEach(v => { if (!allVars.includes(v)) allVars.push(v); });
      });
      mappings = allVars.map(varNum => ({ variable_number: varNum, display_name: `Variable ${varNum}`, table_name: 'prospectos' }));
    }
    return mappings;
  }, [selectedTemplate]);

  const editableMappings = useMemo(() => {
    return normalizedMappings.filter((mapping) => {
      const cv = customVariables[mapping.variable_number as number];
      return cv && (
        (mapping.table_name === 'system' && mapping.field_name === 'fecha_personalizada') ||
        (mapping.table_name === 'system' && mapping.field_name === 'hora_personalizada') ||
        mapping.table_name === 'destinos' ||
        mapping.table_name === 'resorts'
      );
    });
  }, [normalizedMappings, customVariables]);

  // ============================================
  // ENVÍO DE PLANTILLA
  // ============================================

  const handleSend = useCallback(async () => {
    if (!selectedTemplate || !prospectoData?.id) {
      toast.error('Selecciona una plantilla y asegúrate de que hay un prospecto asociado');
      return;
    }
    if (selectedTemplate.status !== 'APPROVED') {
      toast.error('La plantilla debe estar aprobada para poder enviarla');
      return;
    }
    if (isSendingRef.current || sending) return;

    try {
      isSendingRef.current = true;
      setSending(true);

      const allVars: number[] = [];
      selectedTemplate.components.forEach(c => {
        if (c.text) whatsappTemplatesService.extractVariables(c.text).forEach(v => { if (!allVars.includes(v)) allVars.push(v); });
      });

      const variables: Record<string, string> = {};
      let resolvedText = '';

      let variableMappings: Array<Record<string, unknown>> = [];
      if (selectedTemplate.variable_mappings) {
        if (Array.isArray(selectedTemplate.variable_mappings)) {
          variableMappings = selectedTemplate.variable_mappings as Array<Record<string, unknown>>;
        } else if (typeof selectedTemplate.variable_mappings === 'object' && 'mappings' in selectedTemplate.variable_mappings) {
          const obj = selectedTemplate.variable_mappings as { mappings?: Array<Record<string, unknown>> };
          variableMappings = Array.isArray(obj.mappings) ? obj.mappings : [];
        }
      }

      if (variableMappings.length > 0) {
        selectedTemplate.components.forEach(component => {
          if (component.text) {
            let text = component.text;
            variableMappings.forEach(mapping => {
              const varNum = mapping.variable_number as number;
              const cv = customVariables[varNum];
              if (cv) {
                let value = '';
                if (mapping.table_name === 'system') {
                  let customValue: string | undefined = undefined;
                  if (mapping.field_name === 'fecha_personalizada' || mapping.field_name === 'hora_personalizada') {
                    customValue = cv.value && cv.value.trim() !== '' ? cv.value : undefined;
                  }
                  value = whatsappTemplatesService.getSystemVariableValue(mapping.field_name as string, customValue, user?.full_name);
                } else if (mapping.table_name === 'destinos' && cv.destinoId) {
                  value = destinos.find(d => d.id === cv.destinoId)?.nombre || '';
                } else if (mapping.table_name === 'resorts' && cv.resortId) {
                  const resort = resorts.find(r => r.id === cv.resortId);
                  value = resort?.nombre || resort?.nombre_completo || '';
                } else {
                  value = cv.value || '';
                }
                variables[varNum.toString()] = value;
                text = text.replace(new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'), value);
              }
            });
            resolvedText += text + '\n';
          }
        });
      } else {
        allVars.forEach(varNum => {
          const cv = customVariables[varNum];
          if (cv) {
            let value = '';
            if (cv.type === 'destino' && cv.destinoId) {
              value = destinos.find(d => d.id === cv.destinoId)?.nombre || cv.value || '';
            } else if (cv.type === 'resort' && cv.resortId) {
              const resort = resorts.find(r => r.id === cv.resortId);
              value = resort?.nombre || resort?.nombre_completo || cv.value || '';
            } else if (cv.type === 'fecha_actual' || cv.type === 'hora_actual' || cv.type === 'ejecutivo') {
              const fieldName = cv.type === 'ejecutivo' ? 'ejecutivo_nombre' : cv.type === 'fecha_actual' ? 'fecha_actual' : 'hora_actual';
              value = whatsappTemplatesService.getSystemVariableValue(fieldName, undefined, user?.full_name);
            } else {
              value = cv.value || '';
            }
            variables[varNum.toString()] = value;
          }
        });
        selectedTemplate.components.forEach(component => {
          if (component.text) {
            let text = component.text;
            allVars.forEach(varNum => {
              const cv = customVariables[varNum];
              if (cv) {
                const value = variables[varNum.toString()] || '';
                text = text.replace(new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'), value);
              }
            });
            resolvedText += text + '\n';
          }
        });
      }

      const payload = {
        template_id: selectedTemplate.id,
        template_name: selectedTemplate.name,
        prospecto_id: prospectoData.id,
        variables,
        resolved_text: resolvedText.trim(),
        triggered_by: 'MANUAL' as const,
        triggered_by_user: user?.id || null,
        triggered_by_user_name: user?.full_name || null,
      };

      const edgeFunctionUrl = `${import.meta.env.VITE_EDGE_FUNCTIONS_URL}/functions/v1/whatsapp-templates-send-proxy`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      try {
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const responseText = await response.text();
        let result: { success?: boolean; error?: string; message?: string };
        if (responseText && responseText.trim()) {
          try { result = JSON.parse(responseText); }
          catch { throw new Error(`Error del servidor (${response.status}): ${responseText || response.statusText}`); }
        } else {
          result = response.ok ? { success: true } : { success: false };
        }

        if (!response.ok || (result && !result.success)) {
          throw new Error(result?.error || result?.message || `Error ${response.status}: ${response.statusText}`);
        }

        // Actualizar triggered_by_user
        if (user?.id) {
          try {
            await analysisSupabase!
              .from('whatsapp_template_sends')
              .update({ triggered_by_user: user.id })
              .eq('prospecto_id', prospectoData.id)
              .eq('template_id', selectedTemplate.id)
              .is('triggered_by_user', null)
              .order('sent_at', { ascending: false })
              .limit(1);
          } catch { /* silent */ }
        }

        isSendingRef.current = false;
        setSending(false);
        setSendingSuccess(true);
        setTimeout(() => {
          toast.success('Plantilla enviada exitosamente');
          onTemplateSent?.();
          onClose();
        }, 1500);
        return;
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        if ((fetchError as { name?: string }).name === 'AbortError') {
          throw new Error('Tiempo de espera agotado. Por favor, intenta de nuevo.');
        }
        throw fetchError;
      }
    } catch (error: unknown) {
      console.error('Error enviando plantilla:', error);
      toast.error((error as { message?: string }).message || 'Error al enviar la plantilla');
      isSendingRef.current = false;
      setSending(false);
    }
  }, [selectedTemplate, prospectoData, customVariables, destinos, resorts, user, sending, onTemplateSent, onClose]);

  // ============================================
  // SUGERENCIA DE PLANTILLA
  // ============================================

  const handleSubmitSuggestion = useCallback(async () => {
    if (!user?.id || !suggestionName.trim() || !suggestionText.trim() || !suggestionJustification.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }
    const trimmedText = suggestionText.trim();
    if (/^\{\{[^}]+\}\}/.test(trimmedText)) {
      toast.error('El mensaje no puede comenzar con una variable. Por regla de uChat, debes agregar texto antes de la primera variable.');
      return;
    }
    if (/\{\{[^}]+\}\}$/.test(trimmedText)) {
      toast.error('El mensaje no puede terminar con una variable. Por regla de uChat, debes agregar texto después de la última variable.');
      return;
    }
    try {
      setSuggestionLoading(true);
      await whatsappTemplateSuggestionsService.createSuggestion(
        { name: suggestionName, template_text: suggestionText, justification: suggestionJustification, conversation_id: conversation.id, available_variables: ['titulo', 'primer_nombre', 'primer_apellido', 'ejecutivo_nombre', 'fecha_actual'] },
        user.id
      );
      toast.success('Sugerencia enviada exitosamente. Será revisada por un administrador.');
      setShowSuggestionForm(false);
      setSuggestionName('');
      setSuggestionText('');
      setSuggestionJustification('');
      loadSuggestionStats();
    } catch (error: unknown) {
      console.error('Error enviando sugerencia:', error);
      toast.error((error as { message?: string }).message || 'Error al enviar la sugerencia');
    } finally {
      setSuggestionLoading(false);
    }
  }, [user?.id, suggestionName, suggestionText, suggestionJustification, conversation.id, loadSuggestionStats]);

  const insertVariable = useCallback((variable: string) => {
    const variablePlaceholder = `{{${variable}}}`;
    const textarea = document.getElementById('suggestion-text') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = suggestionText.substring(0, start) + variablePlaceholder + suggestionText.substring(end);
      setSuggestionText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variablePlaceholder.length, start + variablePlaceholder.length);
      }, 0);
    } else {
      setSuggestionText(suggestionText + variablePlaceholder);
    }
  }, [suggestionText]);

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
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200/50 dark:border-gray-700/50"
        >
          {/* ============================================ */}
          {/* HEADER */}
          {/* ============================================ */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
            {/* Fila 1: Título + Suggest + Close */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                  Reactivar Conversación
                </h3>
                {prospectoEtapa && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Etapa: <span className="font-medium text-indigo-600 dark:text-indigo-400">{prospectoEtapa}</span>
                  </p>
                )}
              </div>

              {/* Botón sugerir - siempre visible, discreto */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowSuggestionForm(true);
                  setSelectedTemplate(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Sugerir plantilla</span>
                {suggestionStats && suggestionStats.pending > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-full">
                    {suggestionStats.pending}
                  </span>
                )}
              </motion.button>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fila 2: Límites de envío */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {loadingLimits ? (
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-[11px]">Verificando límites...</span>
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
            {/* Panel izquierdo - Catálogo */}
            <div className="w-[42%] border-r border-gray-100 dark:border-gray-800 flex flex-col min-h-0">
              {/* Search + Tabs */}
              <div className="p-3 space-y-2.5 border-b border-gray-100 dark:border-gray-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar plantillas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-gray-800/50 dark:text-white transition-colors"
                  />
                </div>

                {/* Tabs inline */}
                <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <button
                    onClick={() => setActiveTab('top')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      activeTab === 'top'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Top Plantillas
                  </button>
                  <button
                    onClick={() => setActiveTab('mis')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      activeTab === 'mis'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    Mis Plantillas
                    {myTemplatesCount > 0 && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                        activeTab === 'mis'
                          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {myTemplatesCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Lista de plantillas */}
              <div className={`flex-1 p-3 space-y-1.5 min-h-0 ${scrollHiddenClass}`}>
                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  </div>
                ) : (filteredAndSortedTemplates.regular.length === 0 && filteredAndSortedTemplates.specialUtility.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {activeTab === 'mis' ? 'No tienes plantillas sugeridas aún' : 'No se encontraron plantillas'}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab + searchTerm}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-1.5"
                    >
                      {filteredAndSortedTemplates.regular.map((item, index) => {
                        const { template, rate, canFulfill, missingFields } = item;
                        const isSelected = selectedTemplate?.id === template.id;
                        const templateEtapas = getTemplateEtapas(template);
                        const alreadySentThisSemester = sendLimits?.sentTemplateIds.includes(template.id) || false;
                        const alreadySentThisWeek = sendLimits?.weeklyLimit.usedTemplateIds.includes(template.id) || false;
                        const isDisabled = !canFulfill || alreadySentThisSemester;

                        return (
                          <motion.button
                            key={template.id}
                            {...staggerItem(index)}
                            whileHover={isDisabled ? undefined : { y: -1, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                            whileTap={isDisabled ? undefined : { scale: 0.99 }}
                            onClick={() => !isDisabled && handleSelectTemplate(template)}
                            disabled={isDisabled}
                            className={`w-full text-left p-3 rounded-xl border transition-all relative group ${
                              isDisabled
                                ? 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 opacity-50 cursor-not-allowed'
                                : isSelected
                                ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
                                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                          >
                            {/* Fila superior: Nombre + Categoría */}
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h4 className={`text-sm font-semibold leading-tight ${
                                isDisabled
                                  ? 'text-gray-400 dark:text-gray-500'
                                  : isSelected
                                  ? 'text-indigo-900 dark:text-indigo-100'
                                  : 'text-gray-900 dark:text-white'
                              } ${alreadySentThisSemester ? 'line-through' : ''}`}>
                                {template.name}
                              </h4>
                              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${
                                template.category === 'MARKETING'
                                  ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                                  : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                                {template.category}
                              </span>
                            </div>

                            {/* Star rating */}
                            <div className="mb-1.5">
                              <StarRating
                                rating={rate?.starRating || 0}
                                replyRate={rate?.replyRate || 0}
                                totalSent={rate?.totalSent || 0}
                              />
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-1">
                              {alreadySentThisSemester && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                                  <Ban className="w-2.5 h-2.5" />
                                  {alreadySentThisWeek ? 'Enviada esta semana' : 'Enviada'}
                                </span>
                              )}
                              {!canFulfill && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded">
                                  <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
                                  Faltan: {missingFields.join(', ')}
                                </span>
                              )}
                              {templateEtapas.map((etapa, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded">
                                  {etapa}
                                </span>
                              ))}
                            </div>

                            {/* Descripción */}
                            {template.description && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-1">
                                {template.description}
                              </p>
                            )}
                          </motion.button>
                        );
                      })}

                      {/* ============================================ */}
                      {/* SECCIÓN ESPECIAL: Plantilla de Utilidad */}
                      {/* ============================================ */}
                      {filteredAndSortedTemplates.specialUtility.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800/50">
                          <div className="flex items-center gap-2 mb-2 px-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                              Plantilla de Utilidad
                            </span>
                          </div>

                          <div className="mb-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                              {SPECIAL_UTILITY_TEMPLATE_CONFIG.warningMessage}
                            </p>
                          </div>

                          {filteredAndSortedTemplates.specialUtility.map((item) => {
                            const { template, rate, canFulfill, missingFields } = item;
                            const isSelected = selectedTemplate?.id === template.id;
                            const isBlockedEtapa = prospectoEtapa === 'Es miembro';
                            const alreadySentThisSemester = sendLimits?.sentTemplateIds.includes(template.id) || false;
                            const isDisabled = !canFulfill || isBlockedEtapa || alreadySentThisSemester;

                            return (
                              <motion.button
                                key={template.id}
                                whileHover={isDisabled ? undefined : { y: -1, boxShadow: '0 4px 12px rgba(217,119,6,0.12)' }}
                                whileTap={isDisabled ? undefined : { scale: 0.99 }}
                                onClick={() => !isDisabled && handleSelectTemplate(template)}
                                disabled={isDisabled}
                                className={`w-full text-left p-3 rounded-xl border-2 transition-all relative group ${
                                  isDisabled
                                    ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10 opacity-50 cursor-not-allowed'
                                    : isSelected
                                    ? 'border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-900/20 shadow-sm shadow-amber-100 dark:shadow-amber-900/20'
                                    : 'border-amber-200 dark:border-amber-800/50 bg-white dark:bg-gray-800/50 hover:border-amber-400 dark:hover:border-amber-600'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <h4 className={`text-sm font-semibold leading-tight ${
                                    isDisabled ? 'text-gray-400 dark:text-gray-500' : isSelected ? 'text-amber-900 dark:text-amber-100' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {template.name}
                                  </h4>
                                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                    UTILIDAD
                                  </span>
                                </div>

                                <div className="mb-1.5">
                                  <StarRating
                                    rating={rate?.starRating || 0}
                                    replyRate={rate?.replyRate || 0}
                                    totalSent={rate?.totalSent || 0}
                                  />
                                </div>

                                <div className="flex flex-wrap gap-1">
                                  {isBlockedEtapa && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded">
                                      <Ban className="w-2.5 h-2.5" />
                                      No disponible para &quot;Es miembro&quot;
                                    </span>
                                  )}
                                  {alreadySentThisSemester && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                                      <Ban className="w-2.5 h-2.5" />
                                      Enviada
                                    </span>
                                  )}
                                  {!canFulfill && !isBlockedEtapa && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded">
                                      <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
                                      {missingFields.join(', ')}
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded">
                                    Max 2 / 6 meses
                                  </span>
                                </div>

                                {template.description && (
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-1">
                                    {template.description}
                                  </p>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* Panel derecho - Preview/Variables/Sugerencia */}
            <div className="flex-1 flex flex-col min-h-0">
              <AnimatePresence mode="wait">
                {showSuggestionForm ? (
                  /* ========== FORMULARIO DE SUGERENCIA ========== */
                  <motion.div
                    key="suggestion"
                    {...panelTransition}
                    className={`flex-1 p-5 space-y-4 ${scrollHiddenClass}`}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowSuggestionForm(false)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </motion.button>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-purple-500" />
                          Sugerir Nueva Plantilla
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          Un administrador revisará tu sugerencia
                        </p>
                      </div>
                    </div>

                    {/* Stats de sugerencias */}
                    {suggestionStats && (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Mis sugerencias:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{suggestionStats.total} total</span>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{suggestionStats.pending} pendientes</span>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{suggestionStats.approved} aprobadas</span>
                        </div>
                      </div>
                    )}

                    {/* Nombre */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Nombre de la Plantilla *</label>
                      <input
                        type="text"
                        value={suggestionName}
                        onChange={(e) => setSuggestionName(e.target.value)}
                        placeholder="Ej: Reagendar llamada no exitosa"
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white"
                      />
                    </div>

                    {/* Contenido con botones de variables */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Contenido *</label>
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {['titulo', 'primer_nombre', 'primer_apellido', 'ejecutivo_nombre', 'fecha_actual'].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => insertVariable(v)}
                            className="px-2 py-1 text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            {`{{${v}}}`}
                          </button>
                        ))}
                      </div>
                      <textarea
                        id="suggestion-text"
                        value={suggestionText}
                        onChange={(e) => setSuggestionText(e.target.value)}
                        placeholder="Escribe el contenido de tu plantilla..."
                        rows={6}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white resize-none"
                      />
                    </div>

                    {/* Justificación */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Justificación *</label>
                      <textarea
                        value={suggestionJustification}
                        onChange={(e) => setSuggestionJustification(e.target.value)}
                        placeholder="Explica por qué sería útil..."
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white resize-none"
                      />
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-2 pt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setShowSuggestionForm(false); setSuggestionName(''); setSuggestionText(''); setSuggestionJustification(''); }}
                        className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancelar
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubmitSuggestion}
                        disabled={suggestionLoading || !suggestionName.trim() || !suggestionText.trim() || !suggestionJustification.trim()}
                        className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        {suggestionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>{suggestionLoading ? 'Enviando...' : 'Enviar Sugerencia'}</span>
                      </motion.button>
                    </div>
                  </motion.div>

                ) : selectedTemplate ? (
                  /* ========== VISTA PREVIA + VARIABLES ========== */
                  <motion.div
                    key={selectedTemplate.id}
                    {...panelTransition}
                    className={`flex-1 flex flex-col min-h-0`}
                  >
                    <div className={`flex-1 p-5 space-y-4 ${scrollHiddenClass}`}>
                      {/* Info de plantilla */}
                      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl p-3.5 border border-indigo-200/50 dark:border-indigo-800/50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTemplate.name}</h4>
                            {selectedTemplate.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{selectedTemplate.description}</p>
                            )}
                          </div>
                          {responseRates.get(selectedTemplate.id) && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                              <MessageSquare className="w-3 h-3 text-emerald-500" />
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {responseRates.get(selectedTemplate.id)!.replyRate}% respuesta
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Variables como tags (no editables) */}
                      {normalizedMappings.length > 0 && (
                        <div>
                          <h5 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Variables</h5>
                          <div className="flex flex-wrap gap-1.5">
                            {normalizedMappings.map((mapping) => {
                              const varNum = mapping.variable_number as number;
                              const cv = customVariables[varNum];
                              if (!cv) return null;

                              let displayValue = '';
                              if (mapping.table_name === 'system') {
                                if (mapping.field_name === 'fecha_actual') displayValue = whatsappTemplatesService.getSystemVariableValue('fecha_actual', undefined, user?.full_name);
                                else if (mapping.field_name === 'hora_actual') displayValue = whatsappTemplatesService.getSystemVariableValue('hora_actual', undefined, user?.full_name);
                                else displayValue = cv.value || '';
                              } else {
                                displayValue = cv.value || 'No disponible';
                              }

                              return (
                                <span
                                  key={varNum}
                                  className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                                  title={`{{${varNum}}}: ${displayValue}`}
                                >
                                  {mapping.display_name as string}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Variables editables */}
                      {editableMappings.length > 0 && (
                        <div>
                          <h5 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Personalizar</h5>
                          <div className="space-y-2.5">
                            {editableMappings.map((mapping) => {
                              const varNum = mapping.variable_number as number;
                              const cv = customVariables[varNum];
                              if (!cv) return null;

                              return (
                                <div key={varNum} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700">
                                  <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-1">
                                    {mapping.display_name as string}
                                  </label>
                                  {mapping.table_name === 'system' && mapping.field_name === 'fecha_personalizada' ? (
                                    <input type="date" value={cv.value} onChange={(e) => setCustomVariables({ ...customVariables, [varNum]: { ...cv, value: e.target.value } })}
                                      className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" />
                                  ) : mapping.table_name === 'system' && mapping.field_name === 'hora_personalizada' ? (
                                    <input type="time" value={cv.value} onChange={(e) => setCustomVariables({ ...customVariables, [varNum]: { ...cv, value: e.target.value } })}
                                      className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" />
                                  ) : mapping.table_name === 'destinos' ? (
                                    <select value={cv.destinoId || ''} onChange={(e) => {
                                      const id = e.target.value;
                                      setCustomVariables({ ...customVariables, [varNum]: { ...cv, destinoId: id, value: destinos.find(d => d.id === id)?.nombre || '' } });
                                      if (id) loadResorts(id);
                                    }} className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-gray-700 dark:text-white">
                                      <option value="">Selecciona un destino</option>
                                      {destinos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                                    </select>
                                  ) : mapping.table_name === 'resorts' ? (
                                    <div className="space-y-1.5">
                                      <select value={cv.destinoId || ''} onChange={(e) => {
                                        const id = e.target.value;
                                        setCustomVariables({ ...customVariables, [varNum]: { ...cv, destinoId: id, resortId: '', value: '' } });
                                        if (id) loadResorts(id);
                                      }} className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-gray-700 dark:text-white">
                                        <option value="">Selecciona destino</option>
                                        {destinos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                                      </select>
                                      {cv.destinoId && (
                                        <select value={cv.resortId || ''} onChange={(e) => {
                                          const id = e.target.value;
                                          const resort = resorts.find(r => r.id === id);
                                          setCustomVariables({ ...customVariables, [varNum]: { ...cv, resortId: id, value: resort?.nombre || resort?.nombre_completo || '' } });
                                        }} className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-gray-700 dark:text-white">
                                          <option value="">Selecciona resort</option>
                                          {resorts.map(r => <option key={r.id} value={r.id}>{r.nombre_completo || r.nombre}</option>)}
                                        </select>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Vista previa */}
                      <div>
                        <h5 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Vista Previa</h5>
                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/15 dark:to-green-900/15 rounded-xl p-3.5 border border-emerald-200/50 dark:border-emerald-800/50">
                          {loading ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                            </div>
                          ) : preview ? (
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{preview}</p>
                          ) : (
                            <p className="text-sm text-gray-400 dark:text-gray-500 italic">La vista previa aparecerá aquí...</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer con botón de envío */}
                    <div className="px-5 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                      {selectedTemplateBlocked.blocked && selectedTemplateBlocked.reason && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-xs">{selectedTemplateBlocked.reason}</span>
                          </div>
                        </motion.div>
                      )}
                      <div className="flex justify-end gap-2">
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClose}
                          className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          Cancelar
                        </motion.button>
                        <AnimatePresence mode="wait">
                          {sendingSuccess ? (
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                              className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg flex items-center gap-1.5">
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
                              disabled={sending || !prospectoData?.id || !areAllVariablesComplete || selectedTemplateBlocked.blocked || !sendLimits?.canSend}
                              className={`px-4 py-2 text-xs font-medium text-white rounded-lg transition-all flex items-center gap-1.5 shadow-sm ${
                                selectedTemplateBlocked.blocked || !sendLimits?.canSend
                                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed shadow-none'
                                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/25'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={
                                selectedTemplateBlocked.blocked ? (selectedTemplateBlocked.reason || 'No disponible')
                                : !sendLimits?.canSend ? (sendLimits?.blockReason || 'Límite alcanzado')
                                : !areAllVariablesComplete ? 'Completa las variables'
                                : ''
                              }
                            >
                              {sending ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Enviando...</span></>
                              ) : selectedTemplateBlocked.blocked || !sendLimits?.canSend ? (
                                <><Ban className="w-3.5 h-3.5" /><span>{selectedTemplateBlocked.blocked ? 'No disponible' : 'Límite alcanzado'}</span></>
                              ) : (
                                <><Send className="w-3.5 h-3.5" /><span>Enviar Plantilla</span></>
                              )}
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>

                ) : (
                  /* ========== EMPTY STATE ========== */
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col items-center justify-center p-8"
                  >
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4"
                    >
                      <Sparkles className="w-7 h-7 text-indigo-500 dark:text-indigo-400" />
                    </motion.div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Selecciona una plantilla</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center max-w-[200px]">
                      Elige de la lista para ver la vista previa y personalizar las variables
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
