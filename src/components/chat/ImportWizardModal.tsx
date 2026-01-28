/**
 * ============================================
 * WIZARD DE IMPORTACIÓN DE PROSPECTOS WHATSAPP
 * ============================================
 * 
 * Wizard multi-paso para importar prospectos desde WhatsApp
 * con validaciones de permisos y envío de plantillas
 * 
 * PASOS:
 * 1. Búsqueda del prospecto (BD local + Dynamics)
 * 2. Validación de permisos por coordinación
 * 3. Selección de plantilla con filtros por tags
 * 4. Configuración de variables de la plantilla
 * 5. Confirmación y envío
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, Phone, User, Mail, Building, AlertCircle, 
  Loader2, CheckCircle, ShieldAlert, ChevronRight, ChevronLeft,
  MessageSquare, Tag, Calendar, Clock, Send, AlertTriangle, Info
} from 'lucide-react';
import { dynamicsLeadService, type DynamicsLeadInfo } from '../../services/dynamicsLeadService';
import { importContactService, type ImportContactPayload } from '../../services/importContactService';
import { analysisSupabase } from '../../config/analysisSupabase';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectivePermissions } from '../../hooks/useEffectivePermissions';
import { whatsappTemplatesService, type WhatsAppTemplate, type VariableMapping } from '../../services/whatsappTemplatesService';
import { TemplateTagsSelector } from '../campaigns/plantillas/TemplateTagsSelector';
import toast from 'react-hot-toast';

/**
 * ============================================
 * TIPOS E INTERFACES
 * ============================================
 */

type WizardStep = 'search' | 'permissions' | 'select_template' | 'configure_variables' | 'confirm';

interface ExistingProspect {
  id: string;
  nombre_completo: string;
  conversacion_id: string | null;
  ejecutivo_id: string | null;
  coordinacion_id: string | null;
  coordinacion_nombre?: string | null;
  ejecutivo_nombre?: string | null;
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
 * Normaliza coordinación para comparación con regex robusto
 * Maneja variaciones de mayúsculas/minúsculas y nombres incompletos
 * 
 * Ejemplos:
 * - COB ACAPULCO, COB Aca, COBACA, cobaca → COBACA
 * - APEX, apex, i360, I360 → i360
 * - MVP, mvp → MVP
 * - VEN, ven → VEN
 * - BOOM, boom, Boom → BOOM
 */
const normalizeCoordinacion = (coord: string | null | undefined): string => {
  if (!coord) return '';
  
  // Convertir a uppercase y limpiar espacios extras
  const cleaned = coord.trim().toUpperCase().replace(/\s+/g, ' ');
  
  // Mapeo con regex para variaciones
  const coordinacionPatterns: Array<{ regex: RegExp; normalized: string }> = [
    // COB Acapulco y variantes
    { regex: /^COB\s*(ACA|ACAP|ACAPULCO)$/i, normalized: 'COBACA' },
    { regex: /^COBACA$/i, normalized: 'COBACA' },
    
    // APEX e i360
    { regex: /^(APEX|I360)$/i, normalized: 'i360' },
    
    // MVP
    { regex: /^MVP$/i, normalized: 'MVP' },
    
    // VEN (Ventas)
    { regex: /^VEN(TAS)?$/i, normalized: 'VEN' },
    
    // BOOM
    { regex: /^BOOM$/i, normalized: 'BOOM' },
    
    // Telemarketing (variantes)
    { regex: /^(TELE|TELEMARK|TELEMARKETING)$/i, normalized: 'TELEMARKETING' },
    
    // Campaña (variantes)
    { regex: /^(CAMP|CAMPA|CAMPANA|CAMPAIGN)$/i, normalized: 'CAMPANA' },
    
    // CDMX (variantes)
    { regex: /^CDMX(\s*(SUR|NORTE|CENTRO))?$/i, normalized: 'CDMX' },
    
    // Inbound
    { regex: /^(INB|INBOUND)$/i, normalized: 'INBOUND' },
    
    // Outbound
    { regex: /^(OUT|OUTBOUND)$/i, normalized: 'OUTBOUND' },
  ];
  
  // Buscar coincidencia con regex
  for (const pattern of coordinacionPatterns) {
    if (pattern.regex.test(cleaned)) {
      return pattern.normalized;
    }
  }
  
  // Si no hay coincidencia, retornar uppercase limpio
  return cleaned;
};

/**
 * Normaliza número de teléfono a 10 dígitos
 */
const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-10);
};

/**
 * Formatea número para visualización
 */
const formatPhoneDisplay = (phone: string): string => {
  const normalized = normalizePhone(phone);
  if (normalized.length === 10) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
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
  const { isAdmin, isCoordinadorCalidad, isOperativo } = useEffectivePermissions();
  
  // Estado del wizard
  const [currentStep, setCurrentStep] = useState<WizardStep>('search');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Estado de búsqueda
  const [isSearching, setIsSearching] = useState(false);
  const [leadData, setLeadData] = useState<DynamicsLeadInfo | null>(null);
  const [existingProspect, setExistingProspect] = useState<ExistingProspect | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Estado de permisos
  const [permissionValidation, setPermissionValidation] = useState<PermissionValidation | null>(null);
  
  // Estado de importación
  const [isImporting, setIsImporting] = useState(false);
  const [importedProspectId, setImportedProspectId] = useState<string | null>(null);
  const [importedProspectData, setImportedProspectData] = useState<any>(null); // Datos completos del prospecto importado
  
  // Estado de plantillas
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Estado de variables
  const [variableValues, setVariableValues] = useState<Record<number, string>>({});
  
  // Estado de envío
  const [isSending, setIsSending] = useState(false);

  // Mapa de coordinaciones (UUID -> nombre)
  const [coordinacionesMap, setCoordinacionesMap] = useState<Map<string, string>>(new Map());

  /**
   * Cargar coordinaciones al montar
   */
  useEffect(() => {
    const loadCoordinaciones = async () => {
      try {
        const { data, error } = await analysisSupabase
          .from('coordinaciones')
          .select('id, nombre');
        
        if (error) {
          console.error('Error cargando coordinaciones:', error);
          return;
        }

        const map = new Map<string, string>();
        data?.forEach(coord => {
          map.set(coord.id, coord.nombre);
        });
        setCoordinacionesMap(map);
      } catch (err) {
        console.error('Error al cargar coordinaciones:', err);
      }
    };

    if (isOpen) {
      loadCoordinaciones();
    }
  }, [isOpen]);

  /**
   * Reset del wizard al cerrar/abrir
   */
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('search');
      setPhoneNumber('');
      setLeadData(null);
      setExistingProspect(null);
      setError(null);
      setPermissionValidation(null);
      setIsImporting(false);
      setImportedProspectId(null);
      setImportedProspectData(null);
      setTemplates([]);
      setFilteredTemplates([]);
      setSelectedTemplate(null);
      setSelectedTags([]);
      setSearchTerm('');
      setVariableValues({});
    }
  }, [isOpen]);

  /**
   * ============================================
   * PASO 1: BÚSQUEDA DEL PROSPECTO
   * ============================================
   */

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setPhoneNumber(value);
    }
  };

  const searchLocalProspect = async (phone: string): Promise<ExistingProspect | null> => {
    try {
      const normalizedPhone = normalizePhone(phone);
      
      // Query simplificada sin joins para evitar errores 400
      const { data: existingData, error: dbError } = await analysisSupabase
        .from('prospectos')
        .select('id, nombre_completo, ejecutivo_id, coordinacion_id')
        .eq('whatsapp', normalizedPhone)
        .maybeSingle();

      if (dbError) {
        console.error('Error al verificar prospecto:', dbError);
        // Si hay error, intentar con telefono_principal como fallback
        const { data: fallbackData, error: fallbackError } = await analysisSupabase
          .from('prospectos')
          .select('id, nombre_completo, ejecutivo_id, coordinacion_id')
          .eq('telefono_principal', normalizedPhone)
          .maybeSingle();
        
        if (fallbackError || !fallbackData) {
          return null;
        }
        
        // Usar fallbackData si whatsapp falló
        const { data: conversacionData } = await analysisSupabase
          .from('conversaciones_whatsapp')
          .select('id')
          .eq('prospecto_id', fallbackData.id)
          .maybeSingle();

        // Obtener nombres de coordinación y ejecutivo por separado
        let coordinacionNombre = null;
        let ejecutivoNombre = null;
        
        if (fallbackData.coordinacion_id) {
          const { data: coordData } = await analysisSupabase
            .from('coordinaciones')
            .select('nombre')
            .eq('id', fallbackData.coordinacion_id)
            .maybeSingle();
          coordinacionNombre = coordData?.nombre || null;
        }
        
        if (fallbackData.ejecutivo_id) {
          const { data: userDataFallback } = await analysisSupabase
            .from('auth_users')
            .select('full_name')
            .eq('id', fallbackData.ejecutivo_id)
            .maybeSingle();
          ejecutivoNombre = userDataFallback?.full_name || null;
        }

        return {
          id: fallbackData.id,
          nombre_completo: fallbackData.nombre_completo,
          conversacion_id: conversacionData?.id || null,
          ejecutivo_id: fallbackData.ejecutivo_id,
          coordinacion_id: fallbackData.coordinacion_id,
          coordinacion_nombre: coordinacionNombre,
          ejecutivo_nombre: ejecutivoNombre,
        };
      }

      if (!existingData) {
        return null;
      }

      // Buscar conversación asociada
      const { data: conversacionData } = await analysisSupabase
        .from('conversaciones_whatsapp')
        .select('id')
        .eq('prospecto_id', existingData.id)
        .maybeSingle();

      // Obtener nombres de coordinación y ejecutivo por separado para evitar errores de join
      let coordinacionNombre = null;
      let ejecutivoNombre = null;
      
      if (existingData.coordinacion_id) {
        const { data: coordData } = await analysisSupabase
          .from('coordinaciones')
          .select('nombre')
          .eq('id', existingData.coordinacion_id)
          .maybeSingle();
        coordinacionNombre = coordData?.nombre || null;
      }
      
      if (existingData.ejecutivo_id) {
        const { data: userData } = await analysisSupabase
          .from('auth_users')
          .select('full_name')
          .eq('id', existingData.ejecutivo_id)
          .maybeSingle();
        ejecutivoNombre = userData?.full_name || null;
      }

      return {
        id: existingData.id,
        nombre_completo: existingData.nombre_completo,
        conversacion_id: conversacionData?.id || null,
        ejecutivo_id: existingData.ejecutivo_id,
        coordinacion_id: existingData.coordinacion_id,
        coordinacion_nombre: coordinacionNombre,
        ejecutivo_nombre: ejecutivoNombre,
      };
    } catch (error) {
      console.error('Error en búsqueda local:', error);
      return null;
    }
  };

  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Ingresa un número de teléfono');
      return;
    }

    const normalized = normalizePhone(phoneNumber);
    if (normalized.length !== 10) {
      toast.error('El número debe tener 10 dígitos');
      return;
    }

    setIsSearching(true);
    setError(null);
    setLeadData(null);
    setExistingProspect(null);
    setPermissionValidation(null);

    try {
      // 1. Buscar en BD local
      const localProspect = await searchLocalProspect(normalized);

      if (localProspect) {
        setExistingProspect(localProspect);
        
        // Validar si puede ver este prospecto
        const validation = validateProspectPermissions(localProspect);
        setPermissionValidation(validation);
        
        // ⛔ DETENER AQUÍ - Prospecto ya existe, no continuar a Dynamics
        toast.error('Este prospecto ya existe en el sistema');
        setIsSearching(false);
        return; // NO avanzar al paso de permisos
      }

      // 2. Si NO existe, buscar en Dynamics
      const result = await dynamicsLeadService.searchLead({ phone: normalized });

      if (result.success && result.data) {
        setLeadData(result.data);
        
        // Validar permisos por coordinación
        const validation = validateDynamicsLeadPermissions(result.data);
        setPermissionValidation(validation);
        
        if (validation.canImport) {
          toast.success('Lead encontrado en Dynamics CRM');
          setCurrentStep('permissions');
        } else {
          toast.error(validation.reason || 'No tienes permiso para importar este prospecto');
        }
      } else {
        setError(result.error || 'Lead no encontrado en Dynamics CRM');
        toast.error(result.error || 'No se encontró el lead');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al buscar en Dynamics';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * ============================================
   * PASO 2: VALIDACIÓN DE PERMISOS
   * ============================================
   */

  const validateProspectPermissions = (prospect: ExistingProspect): PermissionValidation => {
    // Admin, Coordinador de Calidad y Operativo: acceso total
    if (isAdmin || isCoordinadorCalidad || isOperativo) {
      return { canImport: true, reason: null };
    }

    // Coordinador: verificar coordinación
    const isCoordinador = user?.is_coordinador || user?.role_name === 'coordinador';
    
    if (isCoordinador && user?.coordinacion_id && prospect.coordinacion_id) {
      const userCoordNorm = normalizeCoordinacion(user.coordinacion_id);
      const prospectCoordNorm = normalizeCoordinacion(prospect.coordinacion_id);
      
      if (userCoordNorm === prospectCoordNorm) {
        return { canImport: true, reason: null };
      }
    }

    // Ejecutivo: verificar que sea su prospecto o de su coordinación
    const isEjecutivo = user?.is_ejecutivo || user?.role_name === 'ejecutivo';
    
    if (isEjecutivo) {
      // Si es su prospecto
      if (prospect.ejecutivo_id === user.id) {
        return { canImport: true, reason: null };
      }
      
      // Si es de su coordinación
      if (user.coordinacion_id && prospect.coordinacion_id) {
        const userCoordNorm = normalizeCoordinacion(user.coordinacion_id);
        const prospectCoordNorm = normalizeCoordinacion(prospect.coordinacion_id);
        
        if (userCoordNorm === prospectCoordNorm) {
          return { canImport: true, reason: null };
        }
      }
    }

    return {
      canImport: false,
      reason: 'Este prospecto pertenece a otra coordinación',
      ownerInfo: {
        ejecutivo_nombre: prospect.ejecutivo_nombre || 'Desconocido',
        coordinacion_nombre: prospect.coordinacion_nombre || 'Desconocida',
      },
    };
  };

  const validateDynamicsLeadPermissions = (lead: DynamicsLeadInfo): PermissionValidation => {
    // Admin, Coordinador de Calidad y Operativo: pueden importar cualquier coordinación
    if (isAdmin || isCoordinadorCalidad || isOperativo) {
      return { canImport: true, reason: null };
    }

    // Coordinador: verificar coordinación
    // Usar is_coordinador O role_name como fallback
    const isCoordinador = user?.is_coordinador || user?.role_name === 'coordinador';
    
    if (isCoordinador) {
      if (!user.coordinacion_id) {
        return {
          canImport: false,
          reason: 'No tienes coordinación asignada. Contacta al administrador.',
        };
      }

      if (!lead.Coordinacion) {
        return {
          canImport: false,
          reason: 'Este prospecto no tiene coordinación asignada en Dynamics',
        };
      }

      // IMPORTANTE: user.coordinacion_id es UUID, lead.Coordinacion es nombre
      // Necesitamos buscar el nombre de la coordinación del usuario
      const userCoordName = coordinacionesMap.get(user.coordinacion_id) || user.coordinacion_id;
      const userCoordNorm = normalizeCoordinacion(userCoordName);
      const leadCoordNorm = normalizeCoordinacion(lead.Coordinacion);
      
      if (userCoordNorm === leadCoordNorm) {
        return { canImport: true, reason: null };
      }
      
      return {
        canImport: false,
        reason: `Este prospecto pertenece a ${lead.Coordinacion}, no a tu coordinación (${userCoordName})`,
      };
    }

    // Ejecutivo: verificar coordinación
    // Usar is_ejecutivo O role_name como fallback
    const isEjecutivo = user?.is_ejecutivo || user?.role_name === 'ejecutivo';
    
    if (isEjecutivo) {
      if (!user.coordinacion_id) {
        return {
          canImport: false,
          reason: 'No tienes coordinación asignada. Contacta al administrador.',
        };
      }

      if (!lead.Coordinacion) {
        return {
          canImport: false,
          reason: 'Este prospecto no tiene coordinación asignada en Dynamics',
        };
      }

      // IMPORTANTE: user.coordinacion_id es UUID, lead.Coordinacion es nombre
      // Necesitamos buscar el nombre de la coordinación del usuario
      const userCoordName = coordinacionesMap.get(user.coordinacion_id) || user.coordinacion_id;
      const userCoordNorm = normalizeCoordinacion(userCoordName);
      const leadCoordNorm = normalizeCoordinacion(lead.Coordinacion);
      
      if (userCoordNorm === leadCoordNorm) {
        return { canImport: true, reason: null };
      }
      
      return {
        canImport: false,
        reason: `Este prospecto es de ${lead.Coordinacion}. Solo puedes importar de tu coordinación (${userCoordName})`,
      };
    }

    // Si llegamos aquí, el usuario no tiene rol reconocido
    return {
      canImport: false,
      reason: 'No tienes permisos para importar prospectos. Contacta al administrador.',
    };
  };

  /**
   * ============================================
   * PASO 3: IMPORTACIÓN DEL PROSPECTO
   * ============================================
   */

  const handleImport = async () => {
    if (!leadData || !user) {
      toast.error('Faltan datos requeridos para la importación');
      return;
    }

    setIsImporting(true);

    try {
      const payload: ImportContactPayload = {
        ejecutivo_nombre: user.full_name || user.email || 'Desconocido',
        ejecutivo_id: user.id,
        coordinacion_id: user.coordinacion_id || '',
        fecha_solicitud: new Date().toISOString(),
        lead_dynamics: {
          LeadID: leadData.LeadID,
          Nombre: leadData.Nombre,
          Email: leadData.Email,
          EstadoCivil: leadData.EstadoCivil || null,
          Ocupacion: leadData.Ocupacion || null,
          Pais: leadData.Pais || null,
          EntidadFederativa: leadData.EntidadFederativa || null,
          Coordinacion: leadData.Coordinacion || null,
          CoordinacionID: leadData.CoordinacionID || null,
          Propietario: leadData.Propietario || null,
          OwnerID: leadData.OwnerID || null,
          FechaUltimaLlamada: leadData.FechaUltimaLlamada || null,
          Calificacion: leadData.Calificacion || null,
        },
        telefono: normalizePhone(phoneNumber),
        nombre_completo: leadData.Nombre,
        id_dynamics: leadData.LeadID,
      };

      const result = await importContactService.importContact(payload);

      if (result.success && result.prospecto_id) {
        toast.success('Prospecto importado exitosamente');
        setImportedProspectId(result.prospecto_id);
        
        // Cargar datos completos del prospecto recién importado
        const { data: prospectoData, error: prospectoError } = await analysisSupabase
          .from('prospectos')
          .select('*')
          .eq('id', result.prospecto_id)
          .single();

        if (prospectoError || !prospectoData) {
          toast.error('No se pudo cargar los datos del prospecto');
          return;
        }

        setImportedProspectData(prospectoData);
        
        // Cargar plantillas
        await loadTemplates();
        
        // Avanzar a selección de plantilla
        setCurrentStep('select_template');
      } else {
        toast.error(result.error || 'Error al importar el contacto');
      }
    } catch (error) {
      console.error('Error en importación:', error);
      toast.error('Error al importar el contacto');
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * ============================================
   * PASO 4: SELECCIÓN DE PLANTILLA
   * ============================================
   */

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const allTemplates = await whatsappTemplatesService.getAllTemplates();
      
      // Filtrar solo plantillas aprobadas
      const approved = allTemplates.filter(t => t.status === 'APPROVED');
      
      setTemplates(approved);
      setFilteredTemplates(approved);
    } catch (error) {
      console.error('Error cargando plantillas:', error);
      toast.error('Error al cargar plantillas');
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Filtrar plantillas por tags y búsqueda
  useEffect(() => {
    let filtered = templates;

    // Filtrar por tags seleccionados
    if (selectedTags.length > 0) {
      filtered = filtered.filter(template => {
        if (!template.tags || template.tags.length === 0) return false;
        return selectedTags.some(tag => template.tags?.includes(tag));
      });
    }

    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(term) ||
        template.description?.toLowerCase().includes(term)
      );
    }

    setFilteredTemplates(filtered);
  }, [selectedTags, searchTerm, templates]);

  // Validar si la plantilla puede ser enviada (validación de variables con datos reales)
  const canSendTemplate = (template: WhatsAppTemplate): { canSend: boolean; reason?: string; missingFields?: string[] } => {
    // Si no hay datos del prospecto aún, asumir que puede enviar
    if (!importedProspectData) {
      return { canSend: true };
    }

    // Obtener variables requeridas de la plantilla
    const requiredVariables = template.variable_mappings || [];
    const missingFields: string[] = [];
    
    // Validar cada variable
    for (const mapping of requiredVariables) {
      if (mapping.table_name === 'system') {
        // Variables del sistema siempre disponibles
        continue;
      } else if (mapping.table_name === 'prospectos') {
        // Variables del prospecto - verificar que el campo tenga valor
        const fieldValue = importedProspectData[mapping.field_name];
        
        if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
          missingFields.push(mapping.display_name);
        }
      }
      // Para otras tablas (destinos, resorts, etc.), asumir que están disponibles
    }

    if (missingFields.length > 0) {
      return {
        canSend: false,
        reason: `Faltan datos del prospecto: ${missingFields.join(', ')}`,
        missingFields,
      };
    }

    return { canSend: true };
  };

  const handleSelectTemplate = (template: WhatsAppTemplate) => {
    const validation = canSendTemplate(template);
    
    if (!validation.canSend) {
      toast.error(validation.reason || 'Esta plantilla no puede ser enviada');
      return;
    }

    setSelectedTemplate(template);
    
    // Inicializar variables del sistema con valores por defecto
    const initialVariables: Record<number, string> = {};
    
    template.variable_mappings?.forEach(mapping => {
      if (mapping.table_name === 'system') {
        // Variables del sistema con valores por defecto
        if (mapping.field_name === 'fecha_actual') {
          initialVariables[mapping.variable_number] = new Date().toLocaleDateString('es-MX', { 
            month: 'long', 
            day: 'numeric' 
          });
        } else if (mapping.field_name === 'hora_actual') {
          initialVariables[mapping.variable_number] = new Date().toLocaleTimeString('es-MX', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
        } else if (mapping.field_name === 'ejecutivo_nombre') {
          initialVariables[mapping.variable_number] = user?.full_name || '';
        }
      }
    });
    
    setVariableValues(initialVariables);
    setCurrentStep('configure_variables');
  };

  /**
   * ============================================
   * PASO 5: CONFIGURACIÓN DE VARIABLES
   * ============================================
   */

  const handleVariableChange = (varNumber: number, value: string) => {
    setVariableValues(prev => ({
      ...prev,
      [varNumber]: value,
    }));
  };

  /**
   * ============================================
   * PASO 6: ENVÍO DE PLANTILLA
   * ============================================
   */

  const handleSendTemplate = async () => {
    if (!selectedTemplate || !importedProspectId || !user) {
      toast.error('Faltan datos para enviar la plantilla');
      return;
    }

    setIsSending(true);

    try {
      // 1. Obtener datos completos del prospecto para resolver variables
      const { data: prospectoData, error: prospectoError } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .eq('id', importedProspectId)
        .single();

      if (prospectoError || !prospectoData) {
        throw new Error('No se pudo cargar los datos del prospecto');
      }

      // 2. Resolver variables usando el servicio de plantillas
      const resolvedVariables: Record<number, string> = {};
      
      if (selectedTemplate.variable_mappings) {
        for (const mapping of selectedTemplate.variable_mappings) {
          if (mapping.table_name === 'system') {
            // Variables del sistema ya están en variableValues
            if (variableValues[mapping.variable_number]) {
              resolvedVariables[mapping.variable_number] = variableValues[mapping.variable_number];
            } else {
              // Generar valor por defecto
              resolvedVariables[mapping.variable_number] = whatsappTemplatesService.getSystemVariableValue(
                mapping.field_name,
                mapping.custom_value,
                user.full_name || user.email
              );
            }
          } else if (mapping.table_name === 'prospectos') {
            // Variables del prospecto
            const fieldValue = (prospectoData as any)[mapping.field_name];
            resolvedVariables[mapping.variable_number] = fieldValue ? String(fieldValue) : `[${mapping.display_name}]`;
          } else {
            // Otras tablas (destinos, resorts, etc.)
            const exampleValue = await whatsappTemplatesService.getTableExampleData(
              mapping.table_name,
              mapping.field_name
            );
            resolvedVariables[mapping.variable_number] = exampleValue || `[${mapping.display_name}]`;
          }
        }
      }

      // 3. Resolver texto de la plantilla con variables
      let resolvedText = '';
      
      selectedTemplate.components.forEach(component => {
        if (component.type === 'BODY' && component.text) {
          let text = component.text;
          
          // Reemplazar variables en orden descendente para evitar conflictos
          const sortedVarNums = Object.keys(resolvedVariables)
            .map(n => parseInt(n, 10))
            .sort((a, b) => b - a);
          
          sortedVarNums.forEach(varNum => {
            const value = resolvedVariables[varNum];
            text = text.replace(new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'), value);
          });
          
          resolvedText += text + '\n';
        }
      });

      console.log('📤 Variables resueltas:', resolvedVariables);
      console.log('📝 Texto final:', resolvedText);

      const payload = {
        template_id: selectedTemplate.id,
        template_name: selectedTemplate.name,
        prospecto_id: importedProspectId,
        variables: resolvedVariables,
        resolved_text: resolvedText.trim(),
        triggered_by: 'MANUAL' as const,
        triggered_by_user: user.id,
        triggered_by_user_name: user.full_name || user.email,
      };

      const edgeFunctionUrl = `${import.meta.env.VITE_EDGE_FUNCTIONS_URL}/functions/v1/whatsapp-templates-send-proxy`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let result;
      
      if (responseText && responseText.trim()) {
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(`Error del servidor (${response.status}): ${responseText}`);
        }
      } else {
        result = response.ok ? { success: true } : { success: false };
      }

      if (!response.ok || (result && !result.success)) {
        const errorMessage = result?.error || result?.message || `Error ${response.status}`;
        throw new Error(errorMessage);
      }

      const conversacionId = result?.data?.conversacion_id || result?.conversacion_id || null;

      toast.success('Plantilla enviada exitosamente');
      
      // Cerrar wizard y notificar éxito
      onSuccess(importedProspectId, conversacionId || undefined);
      onClose();
    } catch (error) {
      console.error('Error enviando plantilla:', error);
      toast.error(error instanceof Error ? error.message : 'Error al enviar la plantilla');
    } finally {
      setIsSending(false);
    }
  };

  /**
   * ============================================
   * NAVEGACIÓN DEL WIZARD
   * ============================================
   */

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 'search':
        return !!leadData && !!permissionValidation?.canImport;
      case 'permissions':
        return !!leadData && !!permissionValidation?.canImport;
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
        handleImport();
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
      case 'permissions':
        setCurrentStep('search');
        break;
      case 'select_template':
        setCurrentStep('permissions');
        break;
      case 'configure_variables':
        setCurrentStep('select_template');
        break;
    }
  };

  const getStepTitle = (): string => {
    switch (currentStep) {
      case 'search':
        return 'Buscar Prospecto';
      case 'permissions':
        return 'Validar Permisos';
      case 'select_template':
        return 'Seleccionar Plantilla';
      case 'configure_variables':
        return 'Configurar Variables';
      case 'confirm':
        return 'Confirmar Envío';
      default:
        return '';
    }
  };

  const getStepNumber = (): number => {
    const steps: WizardStep[] = ['search', 'permissions', 'select_template', 'configure_variables', 'confirm'];
    return steps.indexOf(currentStep) + 1;
  };

  /**
   * ============================================
   * RENDER
   * ============================================
   */

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
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
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getStepTitle()}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Paso {getStepNumber()} de 4
                </p>
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
              {['search', 'permissions', 'select_template', 'configure_variables'].map((step, index) => (
                <div
                  key={step}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                    getStepNumber() > index + 1
                      ? 'bg-emerald-500'
                      : getStepNumber() === index + 1
                      ? 'bg-blue-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
            <AnimatePresence mode="wait">
              {/* PASO 1: BÚSQUEDA */}
              {currentStep === 'search' && (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>Número de Teléfono</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isSearching) {
                            handleSearch();
                          }
                        }}
                        placeholder="5512345678"
                        maxLength={10}
                        className="flex-1 px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200"
                        disabled={isSearching}
                      />
                      <button
                        onClick={handleSearch}
                        disabled={isSearching || phoneNumber.length !== 10}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Buscando...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4" />
                            <span>Buscar</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Ingresa 10 dígitos sin código de país
                    </p>
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900 dark:text-red-300">Error</p>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Prospecto Existente (sin permiso para continuar) */}
                  {existingProspect && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-base font-bold text-amber-900 dark:text-amber-300 mb-3">
                            Prospecto ya existe
                          </p>
                          
                          <div className="space-y-3 mb-4">
                            <div>
                              <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Nombre</p>
                              <p className="text-sm text-amber-900 dark:text-amber-300 font-medium">
                                {existingProspect.nombre_completo}
                              </p>
                            </div>
                            
                            {existingProspect.ejecutivo_nombre && (
                              <div>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Ejecutivo Asignado</p>
                                <p className="text-sm text-amber-900 dark:text-amber-300 font-medium">
                                  {existingProspect.ejecutivo_nombre}
                                </p>
                              </div>
                            )}
                            
                            {existingProspect.coordinacion_nombre && (
                              <div>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Coordinación</p>
                                <p className="text-sm text-amber-900 dark:text-amber-300 font-medium">
                                  {existingProspect.coordinacion_nombre}
                                </p>
                              </div>
                            )}
                            
                            {existingProspect.conversacion_id && (
                              <div>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Estado</p>
                                <p className="text-sm text-amber-900 dark:text-amber-300">
                                  ✓ Tiene conversación de WhatsApp activa
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <div className="p-3 bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-xs text-amber-800 dark:text-amber-300">
                              <strong>No se puede importar:</strong> Este prospecto ya está registrado en el sistema. No es necesario volver a importarlo.
                            </p>
                          </div>
                          
                          {existingProspect.conversacion_id && (
                            <button
                              onClick={() => {
                                // Navegar a la conversación existente
                                window.dispatchEvent(new CustomEvent('select-livechat-conversation', { 
                                  detail: existingProspect.conversacion_id 
                                }));
                                onClose();
                              }}
                              className="mt-4 w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <MessageSquare className="w-4 h-4" />
                              <span>Ver conversación existente</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Lead de Dynamics Encontrado */}
                  {leadData && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300">
                              Lead encontrado en Dynamics
                            </p>
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-sm text-emerald-700 dark:text-emerald-400">
                                  {leadData.Nombre}
                                </span>
                              </div>
                              {leadData.Email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-sm text-emerald-700 dark:text-emerald-400">
                                    {leadData.Email}
                                  </span>
                                </div>
                              )}
                              {leadData.Coordinacion && (
                                <div className="flex items-center gap-2">
                                  <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-sm text-emerald-700 dark:text-emerald-400">
                                    {leadData.Coordinacion}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-sm text-emerald-700 dark:text-emerald-400">
                                  {formatPhoneDisplay(phoneNumber)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Validación de Permisos */}
                      {permissionValidation && !permissionValidation.canImport && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                          <div className="flex items-start gap-3">
                            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-red-900 dark:text-red-300">
                                Sin permisos para importar
                              </p>
                              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                                {permissionValidation.reason}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* PASO 2: PERMISOS (confirmación antes de importar) */}
              {currentStep === 'permissions' && leadData && (
                <motion.div
                  key="permissions"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-base font-medium text-blue-900 dark:text-blue-300 mb-4">
                          Confirmar Importación
                        </p>
                        
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Nombre</p>
                            <p className="text-sm text-blue-900 dark:text-blue-300 font-medium">
                              {leadData.Nombre}
                            </p>
                          </div>
                          
                          {leadData.Email && (
                            <div>
                              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Email</p>
                              <p className="text-sm text-blue-900 dark:text-blue-300">
                                {leadData.Email}
                              </p>
                            </div>
                          )}
                          
                          {leadData.Coordinacion && (
                            <div>
                              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Coordinación</p>
                              <p className="text-sm text-blue-900 dark:text-blue-300">
                                {leadData.Coordinacion}
                              </p>
                            </div>
                          )}
                          
                          <div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Teléfono</p>
                            <p className="text-sm text-blue-900 dark:text-blue-300">
                              {formatPhoneDisplay(phoneNumber)}
                            </p>
                          </div>
                          
                          {leadData.Propietario && (
                            <div>
                              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                                Propietario en Dynamics
                              </p>
                              <p className="text-sm text-blue-900 dark:text-blue-300 font-medium">
                                {leadData.Propietario}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Advertencia sobre asignación */}
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <p className="text-xs text-amber-800 dark:text-amber-300">
                            <strong>Nota:</strong> El prospecto se asignará automáticamente al propietario que tiene en Dynamics CRM.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {permissionValidation?.canImport && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-sm text-emerald-900 dark:text-emerald-300">
                          Tienes permisos para importar este prospecto
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* PASO 3: SELECCIÓN DE PLANTILLA */}
              {currentStep === 'select_template' && (
                <motion.div
                  key="select_template"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  {/* Filtros */}
                  <div className="space-y-4">
                    {/* Información sobre validación de plantillas */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        <strong>ℹ️ Importante:</strong> Solo se muestran plantillas que el prospecto puede recibir. Las plantillas bloqueadas requieren datos que el prospecto no tiene (ej: título, email, etc.).
                      </p>
                    </div>

                    {/* Búsqueda */}
                    <div>
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <span>Buscar plantilla</span>
                      </label>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nombre o descripción..."
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                      />
                    </div>

                    {/* Selector de Tags */}
                    <div>
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <span>Filtrar por etiquetas</span>
                      </label>
                      <TemplateTagsSelector
                        selectedTags={selectedTags}
                        onChange={setSelectedTags}
                      />
                    </div>
                  </div>

                  {/* Lista de Plantillas */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Plantillas disponibles ({filteredTemplates.length})
                    </p>
                    
                    {loadingTemplates ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      </div>
                    ) : filteredTemplates.length === 0 ? (
                      <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
                        <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          No hay plantillas que coincidan con los filtros
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                        {filteredTemplates.map(template => {
                          const validation = canSendTemplate(template);
                          
                          return (
                            <button
                              key={template.id}
                              onClick={() => handleSelectTemplate(template)}
                              disabled={!validation.canSend}
                              className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                                selectedTemplate?.id === template.id
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : validation.canSend
                                  ? 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
                                  : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 opacity-60 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {template.name}
                                  </p>
                                  {template.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {template.description}
                                    </p>
                                  )}
                                  {template.tags && template.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {template.tags.map(tag => (
                                        <span
                                          key={tag}
                                          className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {!validation.canSend && (
                                    <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                                      <p className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">
                                        ⚠️ No se puede enviar
                                      </p>
                                      <p className="text-xs text-red-600 dark:text-red-400">
                                        {validation.reason}
                                      </p>
                                      {validation.missingFields && validation.missingFields.length > 0 && (
                                        <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                                          Campos faltantes: {validation.missingFields.join(', ')}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {validation.canSend && (
                                  <CheckCircle
                                    className={`w-5 h-5 flex-shrink-0 ${
                                      selectedTemplate?.id === template.id
                                        ? 'text-blue-600'
                                        : 'text-gray-300 dark:text-gray-600'
                                    }`}
                                  />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* PASO 4: CONFIGURACIÓN DE VARIABLES */}
              {currentStep === 'configure_variables' && selectedTemplate && (
                <motion.div
                  key="configure_variables"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                      {selectedTemplate.name}
                    </p>
                    {selectedTemplate.description && (
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        {selectedTemplate.description}
                      </p>
                    )}
                  </div>

                  {/* Variables Editables */}
                  {selectedTemplate.variable_mappings && selectedTemplate.variable_mappings.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Configurar variables
                      </p>
                      
                      {selectedTemplate.variable_mappings
                        .filter(mapping => mapping.table_name === 'system')
                        .map(mapping => {
                          const isEditable = 
                            mapping.field_name === 'fecha_personalizada' || 
                            mapping.field_name === 'hora_personalizada';
                          
                          if (!isEditable) return null;

                          return (
                            <div key={mapping.variable_number}>
                              <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                {mapping.field_name === 'fecha_personalizada' ? (
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <Clock className="w-4 h-4 text-gray-400" />
                                )}
                                <span>{mapping.display_name}</span>
                              </label>
                              
                              {mapping.field_name === 'fecha_personalizada' ? (
                                <input
                                  type="date"
                                  value={mapping.custom_value || ''}
                                  onChange={(e) => {
                                    const formatted = new Date(e.target.value + 'T00:00:00').toLocaleDateString('es-MX', {
                                      month: 'long',
                                      day: 'numeric'
                                    });
                                    handleVariableChange(mapping.variable_number, formatted);
                                  }}
                                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                                />
                              ) : (
                                <input
                                  type="time"
                                  value={mapping.custom_value || ''}
                                  onChange={(e) => {
                                    const [hours, minutes] = e.target.value.split(':');
                                    const hour = parseInt(hours, 10);
                                    const date = new Date();
                                    date.setHours(hour);
                                    date.setMinutes(parseInt(minutes, 10));
                                    const formatted = date.toLocaleTimeString('es-MX', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    });
                                    handleVariableChange(mapping.variable_number, formatted);
                                  }}
                                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                                />
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-sm text-emerald-900 dark:text-emerald-300">
                          Esta plantilla no requiere configuración adicional
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Preview del mensaje con variables resueltas */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Vista previa del mensaje
                    </p>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                      {selectedTemplate.components
                        .filter(c => c.type === 'BODY' && c.text)
                        .map((component, index) => {
                          let text = component.text || '';
                          
                          // Reemplazar TODAS las variables (sistema + prospecto)
                          selectedTemplate.variable_mappings?.forEach(mapping => {
                            const varPattern = new RegExp(`\\{\\{${mapping.variable_number}\\}\\}`, 'g');
                            
                            if (mapping.table_name === 'system') {
                              // Variables del sistema
                              const value = variableValues[mapping.variable_number] || `[${mapping.display_name}]`;
                              text = text.replace(varPattern, value);
                            } else if (mapping.table_name === 'prospectos') {
                              // Variables del prospecto - mostrar placeholder
                              text = text.replace(varPattern, `[${mapping.display_name}]`);
                            } else {
                              // Otras variables - mostrar placeholder
                              text = text.replace(varPattern, `[${mapping.display_name}]`);
                            }
                          });
                          
                          return (
                            <p key={index} className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {text}
                            </p>
                          );
                        })}
                    </div>
                    
                    {selectedTemplate.variable_mappings?.some(m => m.table_name !== 'system') && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Los campos entre corchetes se reemplazarán automáticamente con los datos del prospecto al enviar.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer - Botones de Navegación */}
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
              {isImporting || isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isImporting ? 'Importando...' : 'Enviando...'}</span>
                </>
              ) : currentStep === 'configure_variables' ? (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Plantilla</span>
                </>
              ) : (
                <>
                  <span>Continuar</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImportWizardModal;
