/**
 * ============================================
 * WIZARD DE IMPORTACIÓN DE PROSPECTOS WHATSAPP
 * ============================================
 *
 * Wizard multi-paso para importar prospectos desde WhatsApp
 * con validaciones de permisos y envío de plantillas.
 *
 * SOPORTA:
 * - Búsqueda por URL de Dynamics CRM → ~2-5s via ID directo
 * - Importación batch (1-5 prospectos en paralelo)
 * - Envío de plantilla compartida a todos los importados
 * - Tutorial animado para copiar URLs de CRM
 *
 * PASOS DEL WIZARD:
 * 1. Búsqueda: Input multi-línea (URLs de CRM, 1-5, paralelo)
 * 2. Revisión: Permisos + datos del lead (teléfono viene del CRM, no editable)
 * 3. Importación: Envío a N8N workflow (import-contact-proxy)
 * 4. Plantilla: Selección con filtros por tags
 * 5. Variables: Configuración de fecha/hora personalizadas
 * 6. Envío: Plantilla a todos los importados
 *
 * TELÉFONO:
 * ─────────────────────────────────
 * El endpoint de Dynamics retorna el teléfono en el campo Telefono
 * con formato "<number>;<>;<>". Se extrae automáticamente y NO es editable
 * para evitar errores humanos.
 * ─────────────────────────────────
 *
 * SCROLLBARS: Ocultas con scrollbar-hide (scroll funcional sin barra visible)
 *
 * Actualizado: 2026-03-02
 * Cambios: Eliminada búsqueda por teléfono, solo URL CRM,
 *          teléfono automático del payload (no editable),
 *          nuevos campos BaseOrigen y Telefono del CRM
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Phone, User, Building, AlertCircle,
  Loader2, CheckCircle, ShieldAlert, ChevronRight, ChevronLeft,
  MessageSquare, Tag, Calendar, Clock, Send, AlertTriangle, Info,
  Hash, CheckSquare, Square, Globe, Zap, FolderOpen, ChevronDown, ChevronUp,
  Activity, BarChart3
} from 'lucide-react';
import { dynamicsLeadService, type DynamicsLeadInfo } from '../../services/dynamicsLeadService';
import { importContactService, type ImportContactPayload } from '../../services/importContactService';
import { analysisSupabase } from '../../config/analysisSupabase';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectivePermissions } from '../../hooks/useEffectivePermissions';
import { whatsappTemplatesService, type WhatsAppTemplate } from '../../services/whatsappTemplatesService';
import { SPECIAL_UTILITY_TEMPLATE_NAME, SPECIAL_UTILITY_TEMPLATE_CONFIG } from '../../types/whatsappTemplates';
import type { TemplateGroupHealth } from '../../types/whatsappTemplates';
import { GROUP_STATUS_CONFIG, type TemplateGroupStatus } from '../../types/whatsappTemplates';
import { GroupStatusBadge } from '../shared/GroupStatusBadge';
import { GroupStarRating, calcGroupRating } from '../shared/GroupStarRating';
import { TemplateTagsSelector } from '../campaigns/plantillas/TemplateTagsSelector';
import { CrmUrlTutorialModal } from './CrmUrlTutorialModal';
import toast from 'react-hot-toast';
import { formatExecutiveDisplayName } from '../../utils/nameFormatter';

/**
 * ============================================
 * TIPOS E INTERFACES
 * ============================================
 */

type WizardStep = 'search' | 'permissions' | 'select_template' | 'configure_variables';

/** Cada línea de input parseada */
interface SearchEntry {
  id: string;
  raw: string;
  type: 'url';
  value: string; // id_dynamics extraído de la URL
  phone: string; // Teléfono extraído automáticamente del CRM (no editable)
  status: 'pending' | 'searching' | 'found' | 'not_found' | 'error';
  searchTimeMs?: number;
  leadData?: DynamicsLeadInfo;
  permission?: PermissionValidation;
  error?: string;
  selected: boolean;
  importStatus: 'idle' | 'importing' | 'success' | 'error';
  importError?: string;
  importedProspectId?: string;
}

interface PermissionValidation {
  canImport: boolean;
  reason: string | null;
  ownerInfo?: {
    ejecutivo_nombre: string;
    coordinacion_nombre: string;
  };
}

interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (prospectoId: string, conversacionId?: string) => void;
}

/**
 * ============================================
 * UTILIDADES DE PARSEO
 * ============================================
 */

/** Extrae el ID de Dynamics de una URL de CRM */
const extractDynamicsIdFromUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get('id');
    if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }
  } catch {
    // No es una URL válida
  }
  // Fallback: buscar patrón GUID en el string
  const match = url.match(/[?&]id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match ? match[1] : null;
};

/**
 * Extrae el primer teléfono válido del formato CRM: "<2721899480>;<>;<>"
 * Retorna 10 dígitos o string vacío si no encuentra teléfono válido.
 */
const extractPhoneFromCrmField = (raw: string): string => {
  if (!raw) return '';
  const parts = raw.split(';');
  for (const part of parts) {
    const match = part.match(/<([^>]+)>/);
    if (match) {
      const digits = match[1].replace(/\D/g, '').slice(-10);
      if (digits.length === 10) return digits;
    }
  }
  // Fallback: intentar normalizar el string completo
  const fallback = raw.replace(/\D/g, '').slice(-10);
  return fallback.length === 10 ? fallback : '';
};

/** Detecta si una línea es una URL de Dynamics CRM válida */
const parseInputLine = (line: string, index: number): SearchEntry | null => {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Solo aceptar URLs de Dynamics CRM
  if (trimmed.includes('crm.dynamics.com') || trimmed.includes('dynamics.com/main.aspx')) {
    const id = extractDynamicsIdFromUrl(trimmed);
    if (id) {
      return {
        id: `entry-${index}-${Date.now()}`,
        raw: trimmed,
        type: 'url',
        value: id,
        phone: '', // Se llenará automáticamente desde el CRM
        status: 'pending',
        selected: true,
        importStatus: 'idle',
      };
    }
  }

  return null;
};

/** Parsea el textarea completo */
const parseSearchInput = (input: string): { entries: SearchEntry[]; errors: string[] } => {
  const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
  const entries: SearchEntry[] = [];
  const errors: string[] = [];

  if (lines.length > 5) {
    errors.push('Máximo 5 entradas permitidas');
    return { entries: [], errors };
  }

  lines.forEach((line, i) => {
    const entry = parseInputLine(line, i);
    if (entry) {
      entries.push(entry);
    } else {
      errors.push(`Línea ${i + 1}: No se reconoce como URL de Dynamics CRM`);
    }
  });

  return { entries, errors };
};

/**
 * Normaliza coordinación para comparación
 */
const normalizeCoordinacion = (coord: string | null | undefined): string => {
  if (!coord) return '';
  const cleaned = coord.trim().toUpperCase().replace(/\s+/g, ' ');
  const patterns: Array<{ regex: RegExp; normalized: string }> = [
    { regex: /^COB\s*(ACA|ACAP|ACAPULCO)$/i, normalized: 'COBACA' },
    { regex: /^COBACA$/i, normalized: 'COBACA' },
    { regex: /^(APEX|I360)$/i, normalized: 'i360' },
    { regex: /^MVP$/i, normalized: 'MVP' },
    { regex: /^VEN(TAS)?$/i, normalized: 'VEN' },
    { regex: /^BOOM$/i, normalized: 'BOOM' },
    { regex: /^(TELE|TELEMARK|TELEMARKETING)$/i, normalized: 'TELEMARKETING' },
    { regex: /^(CAMP|CAMPA|CAMPANA|CAMPAIGN)$/i, normalized: 'CAMPANA' },
    { regex: /^CDMX(\s*(SUR|NORTE|CENTRO))?$/i, normalized: 'CDMX' },
    { regex: /^(INB|INBOUND)$/i, normalized: 'INBOUND' },
    { regex: /^(OUT|OUTBOUND)$/i, normalized: 'OUTBOUND' },
  ];
  for (const p of patterns) {
    if (p.regex.test(cleaned)) return p.normalized;
  }
  return cleaned;
};

const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '').slice(-10);
};

const formatPhoneDisplay = (phone: string): string => {
  const n = normalizePhone(phone);
  if (n.length === 10) return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
  return phone;
};

/**
 * ============================================
 * COMPONENTE PRINCIPAL
 * ============================================
 */
export const ImportWizardModal: React.FC<ImportWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const { isAdmin, isAdminOperativo, isSupervisor, isCoordinador, isEjecutivo } = useEffectivePermissions();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('search');
  
  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [searchEntries, setSearchEntries] = useState<SearchEntry[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importedProspects, setImportedProspects] = useState<Array<{ id: string; data: any }>>([]);
  
  // Template state
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<WhatsAppTemplate[]>([]);
  const [filteredSpecialTemplates, setFilteredSpecialTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Group state
  const [templateGroups, setTemplateGroups] = useState<TemplateGroupHealth[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupTemplatesMap, setGroupTemplatesMap] = useState<Record<string, WhatsAppTemplate[]>>({});
  const [loadingGroupTemplates, setLoadingGroupTemplates] = useState<string | null>(null);
  const [expandedPreviewIdx, setExpandedPreviewIdx] = useState<Record<string, number>>({});
  
  // Variable state
  const [variableValues, setVariableValues] = useState<Record<number, string>>({});
  
  // Send state
  const [isSending, setIsSending] = useState(false);

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);

  // Coordinaciones map
  const [coordinacionesMap, setCoordinacionesMap] = useState<Map<string, string>>(new Map());

  // ============================================
  // DERIVED STATE
  // ============================================

  /** Entradas seleccionadas con permisos */
  const selectedEntries = useMemo(
    () => searchEntries.filter(e => e.selected && e.status === 'found' && e.permission?.canImport),
    [searchEntries]
  );

  /**
   * Entradas listas para importar (requieren teléfono de 10 dígitos).
   * El teléfono viene automáticamente del CRM en el campo Telefono.
   */
  const readyToImport = useMemo(
    () => selectedEntries.filter(e => e.phone.length === 10),
    [selectedEntries]
  );

  /** Entradas sin teléfono del CRM (no se pueden importar) */
  const missingPhone = useMemo(
    () => selectedEntries.filter(e => e.phone.length !== 10),
    [selectedEntries]
  );

  const importableCount = readyToImport.length;

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    const loadCoordinaciones = async () => {
      try {
        const { data } = await analysisSupabase
          .from('coordinaciones')
          .select('id, nombre');
        const map = new Map<string, string>();
        data?.forEach(c => map.set(c.id, c.nombre));
        setCoordinacionesMap(map);
      } catch {}
    };
    if (isOpen) loadCoordinaciones();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep('search');
      setSearchInput('');
      setSearchEntries([]);
      setParseErrors([]);
      setIsSearching(false);
      setHasSearched(false);
      setIsImporting(false);
      setImportedProspects([]);
      setTemplates([]);
      setFilteredTemplates([]);
      setFilteredSpecialTemplates([]);
      setSelectedTemplate(null);
      setSelectedTags([]);
      setSearchTerm('');
      setVariableValues({});
      setTemplateGroups([]);
      setExpandedGroupId(null);
      setGroupTemplatesMap({});
      setLoadingGroupTemplates(null);
    }
  }, [isOpen]);

  // Filter templates (separar plantilla especial de utilidad)
  useEffect(() => {
    let filtered = templates;
    if (selectedTags.length > 0) {
      filtered = filtered.filter(t => t.tags?.some(tag => selectedTags.includes(tag)));
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(term) || t.description?.toLowerCase().includes(term)
      );
    }
    setFilteredTemplates(filtered.filter(t => t.name !== SPECIAL_UTILITY_TEMPLATE_NAME));
    setFilteredSpecialTemplates(filtered.filter(t => t.name === SPECIAL_UTILITY_TEMPLATE_NAME));
  }, [selectedTags, searchTerm, templates]);

  // Filter groups by search term
  const filteredGroups = useMemo(() => {
    const base = searchTerm.trim()
      ? templateGroups.filter(g => {
          const term = searchTerm.toLowerCase();
          return g.group_name.toLowerCase().includes(term) || g.description?.toLowerCase().includes(term);
        })
      : [...templateGroups];
    return base.sort((a, b) =>
      calcGroupRating(b.group_status as TemplateGroupStatus, b.avg_reply_rate_24h) -
      calcGroupRating(a.group_status as TemplateGroupStatus, a.avg_reply_rate_24h)
    );
  }, [templateGroups, searchTerm]);

  const formatRate = (value: string | null): string => {
    if (!value) return '\u2014';
    const num = parseFloat(value);
    return isNaN(num) ? '\u2014' : `${num.toFixed(1)}%`;
  };

  // Filter group templates for expanded group (search + tags + canSend)
  const getFilteredGroupTemplates = (groupId: string): { normal: WhatsAppTemplate[]; special: WhatsAppTemplate[] } => {
    const all = groupTemplatesMap[groupId] || [];
    let filtered = all.filter(t => t.status === 'APPROVED');
    if (selectedTags.length > 0) {
      filtered = filtered.filter(t => t.tags?.some(tag => selectedTags.includes(tag)));
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(term) || t.description?.toLowerCase().includes(term)
      );
    }
    return {
      normal: filtered.filter(t => t.name !== SPECIAL_UTILITY_TEMPLATE_NAME),
      special: filtered.filter(t => t.name === SPECIAL_UTILITY_TEMPLATE_NAME),
    };
  };

  // ============================================
  // SEARCH LOGIC
  // ============================================

  const searchSingleEntry = async (entry: SearchEntry): Promise<SearchEntry> => {
    const start = Date.now();
    try {
      const result = await dynamicsLeadService.searchLead({ id_dynamics: entry.value });

      if (result.success && result.data) {
        const permission = validateDynamicsLeadPermissions(result.data);

        // Extraer teléfono del campo Telefono del CRM (formato: "<2721899480>;<>;<>")
        const crmPhoneRaw = result.data.Telefono || '';
        const autoPhone = extractPhoneFromCrmField(String(crmPhoneRaw));

        return {
          ...entry,
          status: 'found',
          leadData: result.data,
          permission,
          selected: permission.canImport,
          phone: autoPhone,
          searchTimeMs: Date.now() - start,
        };
      }

      return {
        ...entry,
        status: 'not_found',
        error: result.error || 'Lead no encontrado en Dynamics',
        selected: false,
        searchTimeMs: Date.now() - start,
      };
    } catch (err) {
      return {
        ...entry,
        status: 'error',
        error: err instanceof Error ? err.message : 'Error de búsqueda',
        selected: false,
        searchTimeMs: Date.now() - start,
      };
    }
  };

  const handleSearch = async () => {
    const { entries, errors } = parseSearchInput(searchInput);
    setParseErrors(errors);

    if (entries.length === 0) {
      if (errors.length === 0) toast.error('Ingresa al menos una URL de Dynamics CRM');
      return;
    }

    // Mark all as searching
    const searching = entries.map(e => ({ ...e, status: 'searching' as const }));
    setSearchEntries(searching);
    setIsSearching(true);
    setHasSearched(true);

    // Launch all searches in parallel
    const promises = searching.map(async (entry, i) => {
      const result = await searchSingleEntry(entry);
      // Update individual entry as it completes
      setSearchEntries(prev => {
        const updated = [...prev];
        updated[i] = result;
        return updated;
      });
      return result;
    });

    const results = await Promise.allSettled(promises);
    const finalResults = results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean) as SearchEntry[];
    setSearchEntries(finalResults.length > 0 ? finalResults : searching);
    setIsSearching(false);

    // Summary toast
    const found = finalResults.filter(r => r.status === 'found').length;
    const notFound = finalResults.filter(r => r.status === 'not_found' || r.status === 'error').length;

    if (found > 0) {
      toast.success(`${found} lead${found > 1 ? 's' : ''} encontrado${found > 1 ? 's' : ''} en Dynamics`);
    }
    if (notFound > 0 && found === 0) {
      toast.error('No se encontraron leads');
    }
  };

  // ============================================
  // PERMISSION VALIDATION
  // ============================================

  const validateDynamicsLeadPermissions = (lead: DynamicsLeadInfo): PermissionValidation => {
    // Roles con acceso total: admin, admin operativo, coordinador calidad, operativo
    if (isAdmin || isAdminOperativo || user?.is_coordinador_calidad || user?.is_operativo) {
      return { canImport: true, reason: null };
    }

    // Supervisores, coordinadores y ejecutivos: validar coordinación
    const canImportByRole = isSupervisor || isCoordinador || isEjecutivo;

    if (canImportByRole) {
      if (!user?.coordinacion_id) {
        return { canImport: false, reason: 'No tienes coordinación asignada' };
      }
      if (!lead.Coordinacion) {
        return { canImport: false, reason: 'Prospecto sin coordinación en Dynamics' };
      }

      const userCoordName = coordinacionesMap.get(user.coordinacion_id);

      // Si coordinacionesMap no cargó (error de red), intentar reverse lookup por ID
      if (!userCoordName) {
        // Buscar si alguna coordinación del map coincide con el lead
        const leadCoordId = [...coordinacionesMap.entries()].find(
          ([, name]) => normalizeCoordinacion(name) === normalizeCoordinacion(lead.Coordinacion)
        )?.[0];

        if (leadCoordId) {
          // Comparar IDs directamente
          if (user.coordinacion_id === leadCoordId) return { canImport: true, reason: null };
          const leadCoordName = coordinacionesMap.get(leadCoordId) || lead.Coordinacion;
          return { canImport: false, reason: `Pertenece a ${leadCoordName}, no a tu coordinación` };
        }

        // coordinacionesMap completamente vacío (error de red) - no bloquear
        if (coordinacionesMap.size === 0) {
          console.warn('coordinacionesMap vacío, permitiendo importación como fallback');
          return { canImport: true, reason: null };
        }

        return { canImport: false, reason: `No se pudo verificar tu coordinación` };
      }

      const userNorm = normalizeCoordinacion(userCoordName);
      const leadNorm = normalizeCoordinacion(lead.Coordinacion);

      if (userNorm === leadNorm) return { canImport: true, reason: null };

      return {
        canImport: false,
        reason: `Pertenece a ${lead.Coordinacion}, no a tu coordinación (${userCoordName})`,
      };
    }

    return { canImport: false, reason: 'Sin permisos para importar' };
  };

  // ============================================
  // IMPORT LOGIC
  // ============================================

  const handleImportAll = async () => {
    if (!user) return;

    if (readyToImport.length === 0) {
      if (missingPhone.length > 0) {
        toast.error('Los prospectos no tienen teléfono registrado en el CRM');
      } else {
        toast.error('No hay prospectos listos para importar');
      }
      return;
    }

    setIsImporting(true);

    // Mark ready entries as importing
    const readyIds = new Set(readyToImport.map(e => e.id));
    setSearchEntries(prev => prev.map(e => 
      readyIds.has(e.id)
        ? { ...e, importStatus: 'importing' as const }
        : e
    ));

    const importPromises = readyToImport.map(async (entry) => {
      if (!entry.leadData) return;

      const payload: ImportContactPayload = {
        ejecutivo_nombre: formatExecutiveDisplayName(user.full_name) || user.email || 'Desconocido',
        ejecutivo_id: user.id,
        coordinacion_id: user.coordinacion_id || '',
        fecha_solicitud: new Date().toISOString(),
        lead_dynamics: {
          LeadID: entry.leadData.LeadID,
          Nombre: entry.leadData.Nombre,
          Email: entry.leadData.Email,
          EstadoCivil: entry.leadData.EstadoCivil || null,
          Ocupacion: entry.leadData.Ocupacion || null,
          Pais: entry.leadData.Pais || null,
          EntidadFederativa: entry.leadData.EntidadFederativa || null,
          Coordinacion: entry.leadData.Coordinacion || null,
          CoordinacionID: entry.leadData.CoordinacionID || null,
          Propietario: entry.leadData.Propietario || null,
          OwnerID: entry.leadData.OwnerID || null,
          FechaUltimaLlamada: entry.leadData.FechaUltimaLlamada || null,
          Calificacion: entry.leadData.Calificacion || null,
        },
        telefono: normalizePhone(entry.phone),
        nombre_completo: entry.leadData.Nombre,
        id_dynamics: entry.leadData.LeadID,
      };

      try {
        const result = await importContactService.importContact(payload);
        
        setSearchEntries(prev => prev.map(e =>
          e.id === entry.id
            ? {
                ...e,
                importStatus: result.success && result.prospecto_id ? 'success' as const : 'error' as const,
                importedProspectId: result.prospecto_id || undefined,
                importError: !result.success || !result.prospecto_id ? (result.error || 'Error al importar') : undefined,
              }
            : e
        ));

        if (result.success && result.prospecto_id) {
          const { data: pData } = await analysisSupabase
            .from('prospectos').select('*').eq('id', result.prospecto_id).single();
          if (pData) {
            setImportedProspects(prev => [...prev, { id: result.prospecto_id!, data: pData }]);
          }
        }
      } catch (err) {
        setSearchEntries(prev => prev.map(e =>
          e.id === entry.id
            ? { ...e, importStatus: 'error' as const, importError: 'Error de conexión' }
            : e
        ));
      }
    });

    await Promise.allSettled(importPromises);
    setIsImporting(false);

    // Wait briefly for state to settle, then check results
    // IMPORTANT: Don't call setState inside another setState to avoid React warnings
    await new Promise(resolve => setTimeout(resolve, 300));

    // Read latest entries to check results
    setSearchEntries(prev => {
      const imported = prev.filter(e => e.importStatus === 'success');
      const failed = prev.filter(e => e.importStatus === 'error' && e.selected);

      // Schedule toasts and navigation outside of setState
      queueMicrotask(() => {
        if (imported.length > 0) {
          toast.success(`${imported.length} prospecto${imported.length > 1 ? 's' : ''} importado${imported.length > 1 ? 's' : ''}`);
          loadTemplates();
          setCurrentStep('select_template');
        }
        if (failed.length > 0) {
          toast.error(`${failed.length} importación${failed.length > 1 ? 'es' : ''} fallida${failed.length > 1 ? 's' : ''}`);
        }
      });

      return prev; // Don't modify, just read
    });
  };

  // ============================================
  // TEMPLATE LOGIC
  // ============================================

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const [allTemplates, groups] = await Promise.all([
        whatsappTemplatesService.getAllTemplates(),
        whatsappTemplatesService.getGroupsWithHealth(),
      ]);
      const approved = allTemplates.filter(t => t.status === 'APPROVED');
      setTemplates(approved);
      setFilteredTemplates(approved);
      setTemplateGroups(groups);
    } catch {
      toast.error('Error al cargar plantillas');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleExpandGroup = async (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      return;
    }
    setExpandedGroupId(groupId);
    setExpandedPreviewIdx(prev => ({ ...prev, [groupId]: prev[groupId] ?? 0 }));
    if (!groupTemplatesMap[groupId]) {
      setLoadingGroupTemplates(groupId);
      try {
        const groupTemplates = await whatsappTemplatesService.getTemplatesByGroup(groupId);
        const approved = groupTemplates.filter(t => t.status === 'APPROVED');
        setGroupTemplatesMap(prev => ({ ...prev, [groupId]: approved }));
      } catch {
        toast.error('Error al cargar plantillas del grupo');
      } finally {
        setLoadingGroupTemplates(null);
      }
    }
  };

  const canSendTemplate = (template: WhatsAppTemplate): { canSend: boolean; reason?: string; missingFields?: string[] } => {
    if (importedProspects.length === 0) return { canSend: true };
    // Check first imported prospect for field availability
    const prospectData = importedProspects[0]?.data;
    if (!prospectData) return { canSend: true };

    // Bloquear plantilla especial de utilidad para "Es miembro"
    if (template.name === SPECIAL_UTILITY_TEMPLATE_NAME) {
      const etapa = prospectData.etapa || prospectData.metadata?.etapa;
      if (etapa && (SPECIAL_UTILITY_TEMPLATE_CONFIG.blockedEtapas as readonly string[]).includes(etapa)) {
        return { canSend: false, reason: `No disponible para prospectos en etapa "${etapa}".` };
      }
    }

    const missing: string[] = [];
    for (const mapping of (template.variable_mappings || [])) {
      if (mapping.table_name === 'system') continue;
      if (mapping.table_name === 'prospectos') {
        const val = prospectData[mapping.field_name];
        if (!val || (typeof val === 'string' && !val.trim())) {
          missing.push(mapping.display_name);
        }
      }
    }
    if (missing.length > 0) {
      return { canSend: false, reason: `Faltan datos: ${missing.join(', ')}`, missingFields: missing };
    }
    return { canSend: true };
  };

  const handleSelectTemplate = (template: WhatsAppTemplate) => {
    const validation = canSendTemplate(template);
    if (!validation.canSend) {
      toast.error(validation.reason || 'Plantilla no disponible');
      return;
    }
    setSelectedTemplate(template);
    
    const initial: Record<number, string> = {};
    template.variable_mappings?.forEach(m => {
      if (m.table_name === 'system') {
        if (m.field_name === 'fecha_actual') {
          initial[m.variable_number] = new Date().toLocaleDateString('es-MX', { month: 'long', day: 'numeric' });
        } else if (m.field_name === 'hora_actual') {
          initial[m.variable_number] = new Date().toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
        } else if (m.field_name === 'ejecutivo_nombre') {
          initial[m.variable_number] = user?.full_name || '';
        }
      }
    });
    setVariableValues(initial);
    setCurrentStep('configure_variables');
  };

  // ============================================
  // SEND TEMPLATE (to all imported)
  // ============================================

  const handleSendTemplate = async () => {
    if (!selectedTemplate || importedProspects.length === 0 || !user) {
      toast.error('Faltan datos para enviar');
      return;
    }

    setIsSending(true);
    let sentCount = 0;
    let errorCount = 0;

    for (const prospect of importedProspects) {
      try {
        const resolvedVariables: Record<number, string> = {};
        
        if (selectedTemplate.variable_mappings) {
          for (const mapping of selectedTemplate.variable_mappings) {
            if (mapping.table_name === 'system') {
              if (variableValues[mapping.variable_number]) {
                resolvedVariables[mapping.variable_number] = variableValues[mapping.variable_number];
              } else {
                resolvedVariables[mapping.variable_number] = whatsappTemplatesService.getSystemVariableValue(
                  mapping.field_name, mapping.custom_value, user.full_name || user.email
                );
              }
            } else if (mapping.table_name === 'prospectos') {
              const val = prospect.data[mapping.field_name];
              resolvedVariables[mapping.variable_number] = val ? String(val) : `[${mapping.display_name}]`;
            } else {
              const example = await whatsappTemplatesService.getTableExampleData(mapping.table_name, mapping.field_name);
              resolvedVariables[mapping.variable_number] = example || `[${mapping.display_name}]`;
            }
          }
        }

        let resolvedText = '';
        selectedTemplate.components.forEach(c => {
          if (c.type === 'BODY' && c.text) {
            let text = c.text;
            Object.keys(resolvedVariables)
              .map(n => parseInt(n, 10))
              .sort((a, b) => b - a)
              .forEach(num => {
                text = text.replace(new RegExp(`\\{\\{${num}\\}\\}`, 'g'), resolvedVariables[num]);
              });
            resolvedText += text + '\n';
          }
        });

        const payload = {
          template_id: selectedTemplate.id,
          template_name: selectedTemplate.name,
          prospecto_id: prospect.id,
          variables: resolvedVariables,
          resolved_text: resolvedText.trim(),
          triggered_by: 'MANUAL' as const,
          triggered_by_user: user.id,
          triggered_by_user_name: user.full_name || user.email,
        };

        const url = `${import.meta.env.VITE_EDGE_FUNCTIONS_URL}/functions/v1/whatsapp-templates-send-proxy`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const text = await response.text();
        const result = text ? JSON.parse(text) : { success: response.ok };
        
        if (response.ok && result.success !== false) {
          sentCount++;
          // Actualizar triggered_by_user en el registro creado por N8N
          try {
            await analysisSupabase
              .from('whatsapp_template_sends')
              .update({ triggered_by_user: user.id })
              .eq('prospecto_id', prospect.id)
              .eq('template_id', selectedTemplate.id)
              .is('triggered_by_user', null)
              .order('created_at', { ascending: false })
              .limit(1);
          } catch { /* silent */ }
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setIsSending(false);

    if (sentCount > 0) {
      toast.success(`Plantilla enviada a ${sentCount} prospecto${sentCount > 1 ? 's' : ''}`);
      window.dispatchEvent(new CustomEvent('refresh-livechat-conversations'));
      
      // Navigate to last imported prospect's conversation
      const lastImported = importedProspects[importedProspects.length - 1];
      if (lastImported) {
        onSuccess(lastImported.id);
      }
      onClose();
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} envío${errorCount > 1 ? 's' : ''} fallido${errorCount > 1 ? 's' : ''}`);
    }
  };

  // ============================================
  // ENTRY HELPERS
  // ============================================

  const toggleEntrySelection = (entryId: string) => {
    setSearchEntries(prev => prev.map(e =>
      e.id === entryId && e.status === 'found' && e.permission?.canImport
        ? { ...e, selected: !e.selected }
        : e
    ));
  };

  // ============================================
  // NAVIGATION
  // ============================================

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 'search':
        return selectedEntries.length > 0 && !isSearching;
      case 'permissions':
        return importableCount > 0;
      case 'select_template':
        return !!selectedTemplate;
      case 'configure_variables':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'search':
        setCurrentStep('permissions');
        break;
      case 'permissions':
        handleImportAll();
        break;
      case 'select_template':
        setCurrentStep('configure_variables');
        break;
      case 'configure_variables':
        handleSendTemplate();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'permissions': setCurrentStep('search'); break;
      case 'select_template': setCurrentStep('permissions'); break;
      case 'configure_variables': setCurrentStep('select_template'); break;
    }
  };

  const getStepTitle = (): string => {
    const titles: Record<WizardStep, string> = {
      search: 'Buscar Prospectos',
      permissions: 'Revisar e Importar',
      select_template: 'Seleccionar Plantilla',
      configure_variables: 'Configurar y Enviar',
    };
    return titles[currentStep];
  };

  const stepOrder: WizardStep[] = ['search', 'permissions', 'select_template', 'configure_variables'];
  const getStepNumber = () => stepOrder.indexOf(currentStep) + 1;

  // ============================================
  // STATUS HELPERS
  // ============================================

  const getStatusIcon = (entry: SearchEntry) => {
    switch (entry.status) {
      case 'searching':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'found':
        return entry.permission?.canImport
          ? <CheckCircle className="w-4 h-4 text-emerald-500" />
          : <ShieldAlert className="w-4 h-4 text-amber-500" />;
      case 'not_found':
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Hash className="w-4 h-4 text-gray-400" />;
    }
  };

  const getImportStatusIcon = (entry: SearchEntry) => {
    switch (entry.importStatus) {
      case 'importing': return <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />;
      case 'success': return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
      case 'error': return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      default: return null;
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (!isOpen) return null;

  return (
    <>
    <AnimatePresence>
      <motion.div
        key="wizard-backdrop"
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
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{getStepTitle()}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Paso {getStepNumber()} de 4</p>
              </div>
              <motion.button
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.25 }}
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group"
              >
                <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
              </motion.button>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 flex items-center gap-2">
              {stepOrder.map((step, i) => (
                <div
                  key={step}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                    getStepNumber() > i + 1 ? 'bg-emerald-500'
                    : getStepNumber() === i + 1 ? 'bg-blue-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-hide">
            <AnimatePresence mode="wait">

              {/* ====== PASO 1: BÚSQUEDA MULTI-INPUT ====== */}
              {currentStep === 'search' && (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  {/* Input Area */}
                  <div>
                    <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      <Search className="w-4 h-4 text-gray-400" />
                      <span>URLs de Dynamics CRM</span>
                    </label>
                    <textarea
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder={`Pega 1 a 5 URLs de CRM (una por línea):\nhttps://vidanta.crm.dynamics.com/...?id=xxxx\nhttps://vidanta.crm.dynamics.com/...?id=yyyy`}
                      rows={4}
                      className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 font-mono resize-none"
                      disabled={isSearching}
                    />

                    {/* Input summary */}
                    {searchInput.trim() && !hasSearched && (
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        {(() => {
                          const { entries, errors } = parseSearchInput(searchInput);
                          return (
                            <>
                              {entries.length > 0 && (
                                <span className="flex items-center gap-1 text-purple-500">
                                  <Zap className="w-3 h-3" />
                                  {entries.length} URL{entries.length > 1 ? 's' : ''} detectada{entries.length > 1 ? 's' : ''}
                                </span>
                              )}
                              {errors.length > 0 && (
                                <span className="text-red-500">{errors.length} no reconocida{errors.length > 1 ? 's' : ''}</span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* Search Button */}
                    <div className="mt-3">
                      <button
                        onClick={handleSearch}
                        disabled={isSearching || !searchInput.trim()}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        {isSearching ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /><span>Buscando...</span></>
                        ) : (
                          <><Search className="w-4 h-4" /><span>Buscar</span></>
                        )}
                      </button>
                    </div>

                    {/* Info note + Tutorial button */}
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                          <p>Pega las URLs del CRM de Dynamics para buscar los leads (~3 segundos por URL)</p>
                          <p>El teléfono y la base de origen se obtienen automáticamente del CRM</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowTutorial(true)}
                        className="mt-2.5 w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors group"
                      >
                        <Globe className="w-3.5 h-3.5 text-blue-500 group-hover:text-blue-600" />
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                          ¿Cómo obtener la URL del CRM?
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Parse errors */}
                  {parseErrors.length > 0 && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                      {parseErrors.map((err, i) => (
                        <p key={i} className="text-xs text-red-700 dark:text-red-400">{err}</p>
                      ))}
                    </div>
                  )}

                  {/* Results */}
                  {hasSearched && searchEntries.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Resultados ({searchEntries.filter(e => e.status === 'found').length}/{searchEntries.length} encontrados)
                      </p>
                      
                      {searchEntries.map(entry => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            entry.status === 'found' && entry.permission?.canImport
                              ? entry.selected
                                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                              : entry.status === 'searching'
                              ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
                              : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Selection checkbox */}
                            {entry.status === 'found' && entry.permission?.canImport && (
                              <button onClick={() => toggleEntrySelection(entry.id)} className="mt-0.5 flex-shrink-0">
                                {entry.selected
                                  ? <CheckSquare className="w-5 h-5 text-emerald-600" />
                                  : <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                }
                              </button>
                            )}

                            {/* Status icon */}
                            <div className="mt-0.5 flex-shrink-0">{getStatusIcon(entry)}</div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              {/* Time */}
                              <div className="flex items-center gap-2 mb-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                  <Zap className="w-2.5 h-2.5" /> URL
                                </span>
                                {entry.searchTimeMs !== undefined && (
                                  <span className="text-[10px] text-gray-400">{(entry.searchTimeMs / 1000).toFixed(1)}s</span>
                                )}
                                {entry.status === 'searching' && (
                                  <span className="text-[10px] text-blue-500 animate-pulse">Buscando por ID...</span>
                                )}
                              </div>

                              {/* Lead data */}
                              {entry.leadData && (
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {entry.leadData.Nombre}
                                  </p>
                                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                                    {entry.leadData.Coordinacion && (
                                      <span className="flex items-center gap-1">
                                        <Building className="w-3 h-3" /> {entry.leadData.Coordinacion}
                                      </span>
                                    )}
                                    {entry.leadData.Propietario && (
                                      <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" /> {entry.leadData.Propietario}
                                      </span>
                                    )}
                                    {entry.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> {formatPhoneDisplay(entry.phone)}
                                      </span>
                                    )}
                                    {entry.leadData.BaseOrigen && (
                                      <span className="flex items-center gap-1">
                                        <Tag className="w-3 h-3" /> {entry.leadData.BaseOrigen}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Permission denied */}
                              {entry.status === 'found' && entry.permission && !entry.permission.canImport && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                  {entry.permission.reason}
                                </p>
                              )}

                              {/* No phone warning */}
                              {entry.status === 'found' && entry.permission?.canImport && !entry.phone && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                  Sin teléfono registrado en el CRM — no se podrá importar
                                </p>
                              )}

                              {/* Error */}
                              {(entry.status === 'error' || entry.status === 'not_found') && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{entry.error}</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ====== PASO 2: PERMISOS + IMPORTACIÓN ====== */}
              {currentStep === 'permissions' && (
                <motion.div
                  key="permissions"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                          Revisar e Importar ({selectedEntries.length} prospecto{selectedEntries.length > 1 ? 's' : ''})
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                          Los prospectos se asignarán al propietario que tienen en Dynamics CRM.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Warning for entries without phone from CRM */}
                  {missingPhone.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                          {missingPhone.length} prospecto{missingPhone.length > 1 ? 's' : ''} sin teléfono en el CRM. No se podrán importar hasta que tengan teléfono registrado en Dynamics.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* List of selected entries */}
                  <div className="space-y-3">
                    {selectedEntries.map(entry => {
                      const hasPhone = entry.phone.length === 10;
                      return (
                        <div
                          key={entry.id}
                          className={`p-4 rounded-xl border transition-all ${
                            entry.importStatus === 'success'
                              ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10'
                              : entry.importStatus === 'error'
                              ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
                              : entry.importStatus === 'importing'
                              ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10'
                              : !hasPhone
                              ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-900/10'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {getImportStatusIcon(entry) || (
                              hasPhone
                                ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                                : <AlertTriangle className="w-4 h-4 text-amber-500" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {entry.leadData?.Nombre}
                              </p>
                              <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 dark:text-gray-400">
                                <span>{entry.leadData?.Coordinacion}</span>
                                <span>{entry.leadData?.Propietario}</span>
                                {hasPhone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> {formatPhoneDisplay(entry.phone)}
                                  </span>
                                )}
                                {entry.leadData?.BaseOrigen && (
                                  <span className="flex items-center gap-1">
                                    <Tag className="w-3 h-3" /> {entry.leadData.BaseOrigen}
                                  </span>
                                )}
                              </div>
                              {!hasPhone && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                                  Sin teléfono en CRM — no importable
                                </p>
                              )}
                            </div>
                          </div>

                          {entry.importStatus === 'error' && entry.importError && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-2 pl-7">{entry.importError}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ====== PASO 3: SELECCIÓN DE PLANTILLA POR GRUPO ====== */}
              {currentStep === 'select_template' && (
                <motion.div
                  key="select_template"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  {importedProspects.length > 1 && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                      <p className="text-xs text-emerald-800 dark:text-emerald-300">
                        <strong>{importedProspects.length} prospectos importados.</strong> La plantilla seleccionada se enviara a todos.
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        Selecciona un grupo y luego elige la plantilla a enviar. Solo se muestran plantillas compatibles.
                      </p>
                    </div>

                    <div>
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <span>Buscar grupo o plantilla</span>
                      </label>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nombre o descripcion..."
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <span>Filtrar por etiquetas</span>
                      </label>
                      <TemplateTagsSelector selectedTags={selectedTags} onChange={setSelectedTags} />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Grupos de plantillas ({filteredGroups.length})
                    </p>

                    {loadingTemplates ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      </div>
                    ) : filteredGroups.length === 0 ? (
                      <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
                        <FolderOpen className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">No hay grupos que coincidan</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
                        {filteredGroups.map(group => {
                          const isExpanded = expandedGroupId === group.group_id;
                          const isLoadingThis = loadingGroupTemplates === group.group_id;
                          const replyRate = group.avg_reply_rate_24h ? parseFloat(group.avg_reply_rate_24h) : null;
                          const { normal: groupNormal, special: groupSpecial } = isExpanded ? getFilteredGroupTemplates(group.group_id) : { normal: [], special: [] };

                          return (
                            <div key={group.group_id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all">
                              {/* Group header - clickable */}
                              <button
                                onClick={() => handleExpandGroup(group.group_id)}
                                className={`w-full p-3 text-left flex items-center gap-3 transition-colors ${
                                  isExpanded
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700'
                                    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80'
                                }`}
                              >
                                <FolderOpen className={`w-4 h-4 flex-shrink-0 ${isExpanded ? 'text-blue-500' : 'text-gray-400'}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{group.group_name}</span>
                                    <GroupStatusBadge status={group.group_status as TemplateGroupStatus} />
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <GroupStarRating status={group.group_status as TemplateGroupStatus} replyRate={group.avg_reply_rate_24h} showValue />
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                      Resp: {formatRate(group.avg_reply_rate_24h)}
                                    </span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                      Entrega: {formatRate(group.avg_delivery_rate_24h)}
                                    </span>
                                  </div>
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                )}
                              </button>

                              {/* Expanded: templates list */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-3 space-y-2 bg-gray-50/50 dark:bg-gray-900/30">
                                      {isLoadingThis ? (
                                        <div className="flex items-center justify-center py-6">
                                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                        </div>
                                      ) : (groupNormal.length === 0 && groupSpecial.length === 0) ? (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                                          No hay plantillas compatibles en este grupo
                                        </p>
                                      ) : (() => {
                                        const allTpls = [...groupNormal, ...groupSpecial].slice(0, 5);
                                        const currentPreviewIdx = expandedPreviewIdx[group.group_id] ?? 0;
                                        return (
                                          <>
                                            {/* Estadisticas */}
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                              <div className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400">Tasa respuesta</p>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">{formatRate(group.avg_reply_rate_24h)}</p>
                                              </div>
                                              <div className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400">Tasa entrega</p>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">{formatRate(group.avg_delivery_rate_24h)}</p>
                                              </div>
                                            </div>

                                            {/* Vista previa top 5 */}
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                              Vista Previa ({allTpls.length})
                                            </p>
                                            {allTpls.map((template, tplIdx) => {
                                              const isPreviewExpanded = tplIdx === currentPreviewIdx;
                                              const validation = canSendTemplate(template);
                                              const isSelected = selectedTemplate?.id === template.id;
                                              const isSpecial = template.name === SPECIAL_UTILITY_TEMPLATE_NAME;
                                              return (
                                                <div key={template.id} className={`rounded-xl border overflow-hidden transition-all ${
                                                  isSelected
                                                    ? isSpecial ? 'border-amber-500 ring-1 ring-amber-400/30' : 'border-blue-500 ring-1 ring-blue-400/30'
                                                    : 'border-gray-200 dark:border-gray-700'
                                                }`}>
                                                  {/* Header clickable */}
                                                  <button
                                                    onClick={() => {
                                                      setExpandedPreviewIdx(prev => ({ ...prev, [group.group_id]: tplIdx }));
                                                      if (validation.canSend) handleSelectTemplate(template);
                                                    }}
                                                    disabled={!validation.canSend}
                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                                                      !validation.canSend
                                                        ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800/30'
                                                        : isPreviewExpanded
                                                        ? isSpecial ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'
                                                        : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80'
                                                    }`}
                                                  >
                                                    {isSelected && (
                                                      <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${isSpecial ? 'text-amber-600' : 'text-blue-600'}`} />
                                                    )}
                                                    <span className={`text-xs font-medium flex-1 truncate ${
                                                      isPreviewExpanded
                                                        ? isSpecial ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'
                                                        : 'text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                      {template.name}
                                                    </span>
                                                    {isSpecial && (
                                                      <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex-shrink-0">
                                                        UTILIDAD
                                                      </span>
                                                    )}
                                                    {isPreviewExpanded ? <ChevronUp className="w-3 h-3 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                                                  </button>
                                                  <AnimatePresence>
                                                    {isPreviewExpanded && (
                                                      <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                      >
                                                        <div className={`px-3 py-2.5 border-t ${
                                                          isSpecial
                                                            ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/15 dark:to-yellow-900/15 border-amber-200/50 dark:border-amber-800/50'
                                                            : 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/15 dark:to-green-900/15 border-emerald-200/50 dark:border-emerald-800/50'
                                                        }`}>
                                                          {template.components
                                                            .filter(c => c.type === 'BODY' && c.text)
                                                            .map((c, i) => {
                                                              let preview = c.text || '';
                                                              template.variable_mappings?.forEach(m => {
                                                                preview = preview.replace(new RegExp(`\\{\\{${m.variable_number}\\}\\}`, 'g'), `[${m.display_name}]`);
                                                              });
                                                              return <p key={i} className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{preview}</p>;
                                                            })}
                                                          {template.components?.find(c => c.type === 'BUTTONS')?.buttons?.map((btn, i) => (
                                                            <div key={i} className="mt-2 px-3 py-1 text-center text-[11px] font-medium text-blue-600 dark:text-blue-400 border-t border-gray-200/50 dark:border-gray-700/50">
                                                              {btn.text}
                                                            </div>
                                                          ))}
                                                          {!validation.canSend && (
                                                            <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                                                              <p className="text-[10px] text-red-700 dark:text-red-400 font-medium">{validation.reason}</p>
                                                            </div>
                                                          )}
                                                        </div>
                                                      </motion.div>
                                                    )}
                                                  </AnimatePresence>
                                                </div>
                                              );
                                            })}

                                            {/* Disclaimer */}
                                            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                              <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                                                Selecciona una plantilla para enviar. Haz click en el nombre para ver la vista previa.
                                              </p>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ====== PASO 4: CONFIGURACIÓN DE VARIABLES ====== */}
              {currentStep === 'configure_variables' && selectedTemplate && (
                <motion.div
                  key="configure_variables"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">{selectedTemplate.name}</p>
                    {importedProspects.length > 1 && (
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        Se enviará a {importedProspects.length} prospectos
                      </p>
                    )}
                  </div>

                  {selectedTemplate.variable_mappings?.some(m => m.table_name === 'system' && (m.field_name === 'fecha_personalizada' || m.field_name === 'hora_personalizada')) ? (
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Configurar variables</p>
                      {selectedTemplate.variable_mappings
                        .filter(m => m.table_name === 'system' && (m.field_name === 'fecha_personalizada' || m.field_name === 'hora_personalizada'))
                        .map(mapping => (
                          <div key={mapping.variable_number}>
                            <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                              {mapping.field_name === 'fecha_personalizada' ? <Calendar className="w-4 h-4 text-gray-400" /> : <Clock className="w-4 h-4 text-gray-400" />}
                              <span>{mapping.display_name}</span>
                            </label>
                            <input
                              type={mapping.field_name === 'fecha_personalizada' ? 'date' : 'time'}
                              onChange={(e) => {
                                let formatted = e.target.value;
                                if (mapping.field_name === 'fecha_personalizada') {
                                  formatted = new Date(e.target.value + 'T00:00:00').toLocaleDateString('es-MX', { month: 'long', day: 'numeric' });
                                } else {
                                  const [h, m] = e.target.value.split(':');
                                  const d = new Date(); d.setHours(parseInt(h)); d.setMinutes(parseInt(m));
                                  formatted = d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
                                }
                                setVariableValues(prev => ({ ...prev, [mapping.variable_number]: formatted }));
                              }}
                              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                            />
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-sm text-emerald-900 dark:text-emerald-300">No requiere configuración adicional</p>
                    </div>
                  )}

                  {/* Preview */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vista previa</p>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                      {selectedTemplate.components
                        .filter(c => c.type === 'BODY' && c.text)
                        .map((c, i) => {
                          let text = c.text || '';
                          selectedTemplate.variable_mappings?.forEach(m => {
                            const val = m.table_name === 'system'
                              ? (variableValues[m.variable_number] || `[${m.display_name}]`)
                              : `[${m.display_name}]`;
                            text = text.replace(new RegExp(`\\{\\{${m.variable_number}\\}\\}`, 'g'), val);
                          });
                          return <p key={i} className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{text}</p>;
                        })}
                    </div>
                    {selectedTemplate.variable_mappings?.some(m => m.table_name !== 'system') && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Los campos entre corchetes se reemplazarán con los datos de cada prospecto.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
            <button
              onClick={handleBack}
              disabled={currentStep === 'search'}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>

            <button
              onClick={handleNext}
              disabled={!canGoNext() || isImporting || isSending}
              className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center gap-2"
            >
              {isImporting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Importando...</span></>
              ) : isSending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Enviando...</span></>
              ) : currentStep === 'permissions' ? (
                <><Send className="w-4 h-4" /><span>Importar{importableCount > 0 ? ` (${importableCount}/${selectedEntries.length})` : ''}</span></>
              ) : currentStep === 'configure_variables' ? (
                <><Send className="w-4 h-4" /><span>Enviar Plantilla{importedProspects.length > 1 ? ` (${importedProspects.length})` : ''}</span></>
              ) : (
                <><span>Continuar</span><ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>

    </AnimatePresence>

    {/* Tutorial Modal — fuera de AnimatePresence, tiene su propio wrapper */}
    <CrmUrlTutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
    </>
  );
};

export default ImportWizardModal;
