import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Search, 
  Filter,
  Copy,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Globe,
  Tag,
  FileText,
  Link2,
  Phone,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
  RefreshCw,
  Power,
  MapPin,
  Building2,
  Database,
  LayoutGrid,
  Table,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { whatsappTemplatesService } from '../../../services/whatsappTemplatesService';
import type {
  WhatsAppTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  VariableMapping,
  TableSchema,
  TemplateClassification,
  ProspectoEtapa,
  WhatsAppAudience,
  CreateAudienceInput,
  EstadoCivil,
} from '../../../types/whatsappTemplates';
import {
  PROSPECTO_ETAPAS,
  DESTINOS,
  ESTADOS_CIVILES,
  VIAJA_CON_OPTIONS,
} from '../../../types/whatsappTemplates';
import { Users, Heart, User as UserIcon, UserPlus, Users2, Image, Baby } from 'lucide-react';
import { analysisSupabase } from '../../../config/analysisSupabase';
import { ErrorModal } from '../../shared/ErrorModal';
import { DeleteTemplateConfirmationModal } from '../../shared/DeleteTemplateConfirmationModal';
import TemplateSuggestionsTab from './TemplateSuggestionsTab';

/**
 * ============================================
 * GESTOR DE PLANTILLAS WHATSAPP
 * ============================================
 * 
 * Constructor y gestor completo de plantillas de WhatsApp para uChat
 * - CRUD completo (Crear, Leer, Actualizar, Eliminar)
 * - Activación/Desactivación de plantillas
 * - Vinculación dinámica de variables a campos de tablas
 * - Selector de tablas y campos en tiempo real
 * - Vista previa con ejemplos
 * - Soporte completo para categorías, idiomas, componentes, botones
 */

const WhatsAppTemplatesManager: React.FC = () => {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<'templates' | 'suggestions'>('templates');
  const [importingSuggestion, setImportingSuggestion] = useState<TemplateSuggestion | null>(null);
  
  // Variables predefinidas del sistema disponibles
  const systemVariables = [
    { type: 'fecha_actual', label: 'Fecha Actual', icon: Calendar, color: 'blue' },
    { type: 'hora_actual', label: 'Hora Actual', icon: Clock, color: 'purple' },
    { type: 'ejecutivo_nombre', label: 'Ejecutivo', icon: User, color: 'green' },
    { type: 'fecha_personalizada', label: 'Fecha Personalizada', icon: Calendar, color: 'blue' },
    { type: 'hora_personalizada', label: 'Hora Personalizada', icon: Clock, color: 'purple' },
  ];
  
  // Estados principales
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  
  // Estados para vista y paginación
  const [viewMode, setViewMode] = useState<'cards' | 'grid'>('grid');
  const [currentPageCards, setCurrentPageCards] = useState(1);
  const [currentPageGrid, setCurrentPageGrid] = useState(1);
  const itemsPerPageCards = 20;
  const itemsPerPageGrid = 50;
  
  // Estados para ordenamiento del grid
  const [sortColumn, setSortColumn] = useState<keyof WhatsAppTemplate | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Filtros rápidos (etiquetas)
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<string>>(new Set());
  
  // Estados para modal de edición/creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  
  // Estados para modal de edición limitada (solo descripción, audiencias, variables)
  const [isLimitedEditModalOpen, setIsLimitedEditModalOpen] = useState(false);
  const [limitedEditTemplate, setLimitedEditTemplate] = useState<WhatsAppTemplate | null>(null);
  const [limitedEditFormData, setLimitedEditFormData] = useState<{
    description: string;
    audience_ids: string[];
    variable_mappings: VariableMapping[];
  }>({
    description: '',
    audience_ids: [],
    variable_mappings: [],
  });
  const [originalLimitedEditData, setOriginalLimitedEditData] = useState<{
    description: string;
    audience_ids: string[];
    variable_mappings: VariableMapping[];
  } | null>(null);
  const [savingLimitedEdit, setSavingLimitedEdit] = useState(false);
  
  // Estados para modal de error
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Estados para modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<WhatsAppTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncingAfterDelete, setIsSyncingAfterDelete] = useState(false);
  
  // Estado inicial de clasificación (ahora usa audiencias)
  const defaultClassification: TemplateClassification = {
    audience_ids: [],
  };

  // Estados del formulario
  const [formData, setFormData] = useState<CreateTemplateInput>({
    name: '',
    language: 'es_MX',
    category: 'MARKETING', // Por default MARKETING
    components: [{ type: 'BODY', text: '' }],
    description: '',
    variable_mappings: [],
    classification: { ...defaultClassification },
  });
  
  // Estados para audiencias
  const [audiences, setAudiences] = useState<WhatsAppAudience[]>([]);
  
  // Estado para errores de validación (minimalista)
  const [validationErrors, setValidationErrors] = useState<{
    unmappedVariables?: number[];
    noAudiences?: boolean;
    emptyName?: boolean;
    invalidBodyChars?: boolean;
  }>({});
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [audienceFormData, setAudienceFormData] = useState<CreateAudienceInput>({
    nombre: '',
    descripcion: '',
    etapa: null,
    destino: null,
    estado_civil: null,
    tipo_audiencia: [],
    preferencia_entretenimiento: null,
  });
  const [savingAudience, setSavingAudience] = useState(false);
  const [audienceProspectCount, setAudienceProspectCount] = useState<number>(0);
  
  // Estados para gestión de variables
  const [tableSchemas, setTableSchemas] = useState<TableSchema[]>([]);
  const [showVariableMapper, setShowVariableMapper] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<number | null>(null);
  
  // Estados de UI
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingTemplateId, setSyncingTemplateId] = useState<string | null>(null);

  // Cargar plantillas al montar
  useEffect(() => {
    loadTemplates();
    loadTableSchemas();
    loadAudiencesForCards();
  }, []);
  
  // Cargar audiencias para mostrar en las cards
  const loadAudiencesForCards = async () => {
    try {
      // Cargar todas las audiencias de la BD
      const { data: savedAudiences, error } = await analysisSupabase
        .from('whatsapp_audiences')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading audiences for cards:', error);
        setAudiences([]);
        return;
      }
      
      // Recalcular conteo para cada audiencia
      const dynamicAudiences: WhatsAppAudience[] = [];
      if (savedAudiences && savedAudiences.length > 0) {
        for (const aud of savedAudiences) {
          let query = analysisSupabase
            .from('prospectos')
            .select('id', { count: 'exact', head: true });
          
          // Filtro de etapa
          if (aud.etapa) {
            query = query.eq('etapa', aud.etapa);
          }
          
          // Filtro de estado civil
          if (aud.estado_civil) {
            query = query.eq('estado_civil', aud.estado_civil);
          }
          
          // Filtro de viaja_con
          if (aud.viaja_con && aud.viaja_con.length > 0) {
            query = query.in('viaja_con', aud.viaja_con);
          }
          
          // Filtro de destinos
          if (aud.destinos && aud.destinos.length > 0) {
            query = query.overlaps('destino_preferencia', aud.destinos);
          }
          
          const { count } = await query;
          
          dynamicAudiences.push({
            ...aud,
            prospectos_count: count || 0,
          });
        }
      }
      
      setAudiences(dynamicAudiences);
    } catch (error) {
      console.error('Error loading audiences for cards:', error);
    }
  };

  // Filtrar plantillas
  useEffect(() => {
    let filtered = [...templates];

    // Filtro de búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t => 
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.components.some(c => c.text?.toLowerCase().includes(query))
      );
    }

    // Filtro de categoría
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    // Filtro de estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    // Filtro de activo/inactivo
    if (filterActive !== 'all') {
      const isActive = filterActive === 'active';
      filtered = filtered.filter(t => t.is_active === isActive);
    }

    // Filtros rápidos (etiquetas) - acumulativos (OR entre filtros del mismo tipo, AND entre tipos diferentes)
    if (activeQuickFilters.size > 0) {
      const categoryFilters = Array.from(activeQuickFilters).filter(f => f.startsWith('category-'));
      const statusFilters = Array.from(activeQuickFilters).filter(f => f.startsWith('status-'));
      const activeFilters = Array.from(activeQuickFilters).filter(f => f.startsWith('active-'));

      filtered = filtered.filter(t => {
        // Si hay filtros de categoría, debe coincidir con al menos uno
        if (categoryFilters.length > 0) {
          const matchesCategory = categoryFilters.some(filter => {
            if (filter === 'category-MARKETING') return t.category === 'MARKETING';
            if (filter === 'category-UTILITY') return t.category === 'UTILITY';
            if (filter === 'category-AUTHENTICATION') return t.category === 'AUTHENTICATION';
            return false;
          });
          if (!matchesCategory) return false;
        }

        // Si hay filtros de estado, debe coincidir con al menos uno
        if (statusFilters.length > 0) {
          const matchesStatus = statusFilters.some(filter => {
            if (filter === 'status-APPROVED') return t.status === 'APPROVED';
            if (filter === 'status-PENDING') return t.status === 'PENDING';
            if (filter === 'status-REJECTED') return t.status === 'REJECTED';
            return false;
          });
          if (!matchesStatus) return false;
        }

        // Si hay filtros de activo/inactivo, debe coincidir con al menos uno
        if (activeFilters.length > 0) {
          const matchesActive = activeFilters.some(filter => {
            if (filter === 'active-true') return t.is_active === true;
            if (filter === 'active-false') return t.is_active === false;
            return false;
          });
          if (!matchesActive) return false;
        }

        return true;
      });
    }

    // Ordenamiento para grid
    if (viewMode === 'grid' && sortColumn) {
      filtered.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortDirection === 'asc' ? comparison : -comparison;
        }
        
        if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
          return sortDirection === 'asc' 
            ? (aValue === bValue ? 0 : aValue ? 1 : -1)
            : (aValue === bValue ? 0 : aValue ? -1 : 1);
        }
        
        return 0;
      });
    }

    setFilteredTemplates(filtered);
    
    // Resetear páginas cuando cambian los filtros
    setCurrentPageCards(1);
    setCurrentPageGrid(1);
  }, [templates, searchQuery, filterCategory, filterStatus, filterActive, activeQuickFilters, viewMode, sortColumn, sortDirection]);

  // Toggle filtro rápido
  const toggleQuickFilter = (filter: string) => {
    setActiveQuickFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filter)) {
        newSet.delete(filter);
      } else {
        newSet.add(filter);
      }
      return newSet;
    });
  };

  // Manejar ordenamiento
  const handleSort = (column: keyof WhatsAppTemplate) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Calcular paginación
  const totalPagesCards = Math.ceil(filteredTemplates.length / itemsPerPageCards);
  const totalPagesGrid = Math.ceil(filteredTemplates.length / itemsPerPageGrid);
  
  const startIndexCards = (currentPageCards - 1) * itemsPerPageCards;
  const endIndexCards = startIndexCards + itemsPerPageCards;
  const paginatedTemplatesCards = filteredTemplates.slice(startIndexCards, endIndexCards);
  
  const startIndexGrid = (currentPageGrid - 1) * itemsPerPageGrid;
  const endIndexGrid = startIndexGrid + itemsPerPageGrid;
  const paginatedTemplatesGrid = filteredTemplates.slice(startIndexGrid, endIndexGrid);

  // Cargar plantillas
  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await whatsappTemplatesService.getAllTemplates();
      
      // Parsear variable_mappings y extraer audience_ids si están en metadata
      const parsedTemplates = data.map(template => {
        let parsedMappings: VariableMapping[] = [];
        let audienceIds: string[] = [];
        
        if (template.variable_mappings) {
          let rawMappings: any = template.variable_mappings;
          
          // Si viene como string, parsear
          if (typeof rawMappings === 'string') {
            try {
              rawMappings = JSON.parse(rawMappings);
            } catch (e) {
              console.error('Error parseando variable_mappings:', e);
              rawMappings = [];
            }
          }
          
          // Si tiene estructura con mappings y audience_ids (metadata)
          if (rawMappings && typeof rawMappings === 'object' && !Array.isArray(rawMappings)) {
            if (rawMappings.mappings && Array.isArray(rawMappings.mappings)) {
              parsedMappings = rawMappings.mappings;
            }
            if (rawMappings.audience_ids && Array.isArray(rawMappings.audience_ids)) {
              audienceIds = rawMappings.audience_ids;
            }
          } else if (Array.isArray(rawMappings)) {
            // Formato antiguo: solo array de mappings
            parsedMappings = rawMappings;
          }
        }
        
        // Log para debuggear plantillas con variables pero sin mapeos
        const hasVariables = template.components?.some(c => 
          whatsappTemplatesService.extractVariables(c.text || '').length > 0
        );
        if (hasVariables && parsedMappings.length === 0) {
          console.warn(`⚠️ [loadTemplates] Plantilla "${template.name}" tiene variables pero no tiene mapeos guardados`);
        }
        
        return {
          ...template,
          variable_mappings: parsedMappings,
          classification: { audience_ids: audienceIds },
        };
      });
      
      setTemplates(parsedTemplates);
    } catch (error) {
      console.error('Error cargando plantillas:', error);
      toast.error('Error al cargar las plantillas');
    } finally {
      setLoading(false);
    }
  };

  // Cargar esquemas de tablas
  const loadTableSchemas = async () => {
    try {
      const schemas = await whatsappTemplatesService.getAvailableTableSchemas();
      setTableSchemas(schemas);
    } catch (error) {
      console.error('Error cargando esquemas:', error);
    }
  };

  // Abrir modal para crear nueva plantilla
  const handleCreateNew = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      language: 'es_MX',
      category: 'MARKETING',
      components: [{ type: 'BODY', text: '' }],
      description: '',
      variable_mappings: [],
      classification: { ...defaultClassification },
    });
    setIsModalOpen(true);
  };

  // Abrir modal para editar plantilla (edición completa - solo para crear nuevas)
  const handleEdit = (template: WhatsAppTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      language: template.language,
      category: template.category,
      components: template.components,
      description: template.description || '',
      variable_mappings: template.variable_mappings || [],
      classification: (template as any).classification || { ...defaultClassification },
    });
    setIsModalOpen(true);
  };

  // Abrir modal de edición limitada (solo descripción, audiencias, variables)
  const handleLimitedEdit = (template: WhatsAppTemplate) => {
    // Parsear variable_mappings - puede venir en formato { mappings: [...], audience_ids: [...] } o como array directo
    let parsedMappings: VariableMapping[] = [];
    let audienceIds: string[] = [];
    
    if (template.variable_mappings) {
      let rawMappings: any = template.variable_mappings;
      
      // Si viene como string, parsear
      if (typeof rawMappings === 'string') {
        try {
          rawMappings = JSON.parse(rawMappings);
        } catch (e) {
          console.error('❌ Error parseando variable_mappings:', e);
          rawMappings = [];
        }
      }
      
      // Si tiene estructura con mappings y audience_ids (metadata)
      if (rawMappings && typeof rawMappings === 'object' && !Array.isArray(rawMappings)) {
        if (rawMappings.mappings && Array.isArray(rawMappings.mappings)) {
          parsedMappings = rawMappings.mappings;
        } else if (Array.isArray(rawMappings)) {
          parsedMappings = rawMappings;
        }
        if (rawMappings.audience_ids && Array.isArray(rawMappings.audience_ids)) {
          audienceIds = rawMappings.audience_ids;
        }
      } else if (Array.isArray(rawMappings)) {
        // Formato antiguo: solo array de mappings
        parsedMappings = rawMappings;
      }
    }
    
    // También intentar obtener de classification si existe
    let parsedClassification: any = {};
    if ((template as any).classification) {
      if (typeof (template as any).classification === 'string') {
        try {
          parsedClassification = JSON.parse((template as any).classification);
        } catch (e) {
          parsedClassification = {};
        }
      } else {
        parsedClassification = (template as any).classification;
      }
      if (parsedClassification?.audience_ids && parsedClassification.audience_ids.length > 0) {
        audienceIds = parsedClassification.audience_ids;
      }
    }
    
    const initialData = {
      description: template.description || '',
      audience_ids: audienceIds,
      variable_mappings: parsedMappings,
    };
    
    setLimitedEditTemplate(template);
    setLimitedEditFormData(initialData);
    setOriginalLimitedEditData(JSON.parse(JSON.stringify(initialData))); // Deep copy para comparación
    setIsLimitedEditModalOpen(true);
  };

  // Obtener mapeo de variable para el modal limitado (combinar formData y template original)
  const getLimitedEditVariableMapping = (variableNumber: number): VariableMapping | undefined => {
    // Primero buscar en formData
    const formMapping = limitedEditFormData.variable_mappings.find(m => m.variable_number === variableNumber);
    if (formMapping) return formMapping;
    
    // Luego buscar en template original
    if (limitedEditTemplate) {
      return limitedEditTemplate.variable_mappings?.find(m => m.variable_number === variableNumber);
    }
    
    // Finalmente usar la función original
    return getVariableMapping(variableNumber);
  };

  // Guardar edición limitada (solo actualiza en BD, sin webhook)
  const handleSaveLimitedEdit = async () => {
    if (!limitedEditTemplate) return;

    try {
      setSavingLimitedEdit(true);

      // Validar que todas las variables estén mapeadas
      const variables = limitedEditTemplate.components
        .flatMap(c => whatsappTemplatesService.extractVariables(c.text || ''))
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .sort((a, b) => a - b);
      
      const unmappedVariables = variables.filter(varNum => {
        const mapping = limitedEditFormData.variable_mappings.find(m => m.variable_number === varNum);
        return !mapping;
      });

      if (unmappedVariables.length > 0) {
        toast.error(`Hay ${unmappedVariables.length} variable(s) sin mapear: ${unmappedVariables.map(v => `{{${v}}}`).join(', ')}`);
        setSavingLimitedEdit(false);
        return;
      }

      // Obtener mapeos actualizados
      const updatedMappings = limitedEditFormData.variable_mappings.length > 0 
        ? limitedEditFormData.variable_mappings 
        : null;

      // Almacenar audiencias en metadata dentro de variable_mappings (estructura temporal)
      // Formato: { mappings: [...], audience_ids: [...] }
      const mappingsWithAudiences: any = {
        mappings: updatedMappings || [],
        audience_ids: limitedEditFormData.audience_ids || [],
      };

      // Actualizar solo en BD sin llamar al webhook
      const { error: updateError } = await analysisSupabase
        .from('whatsapp_templates')
        .update({
          description: limitedEditFormData.description || null,
          variable_mappings: mappingsWithAudiences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', limitedEditTemplate.id);

      if (updateError) {
        console.error('Error actualizando plantilla:', updateError);
        toast.error('Error al actualizar la plantilla');
        return;
      }

      toast.success('Plantilla actualizada exitosamente');
      setIsLimitedEditModalOpen(false);
      setLimitedEditTemplate(null);
      await loadTemplates();
    } catch (error: any) {
      console.error('Error guardando edición limitada:', error);
      toast.error('Error al guardar los cambios');
    } finally {
      setSavingLimitedEdit(false);
    }
  };

  // Validar caracteres del body (texto, números, signos de puntuación, emojis y corchetes)
  const validateBodyChars = (text: string): boolean => {
    // Permitir: letras (con acentos), números, espacios, signos de puntuación básicos, emojis, corchetes
    // Variables {{1}}, {{2}}, etc. están permitidas
    // Corchetes {{ }} están permitidos
    // Emojis están permitidos (cualquier carácter Unicode que no sea control)
    // Usamos una validación más permisiva: solo rechazamos caracteres de control (excepto \n, \r, \t)
    // Remover variables para validar solo el texto
    const textWithoutVars = text.replace(/\{\{\d+\}\}/g, '');
    
    // Validar que no haya caracteres de control excepto los permitidos (\n, \r, \t)
    // Permitir todos los caracteres Unicode excepto caracteres de control (0x00-0x1F excepto \n, \r, \t)
    const controlCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
    return !controlCharPattern.test(textWithoutVars);
  };

  // Guardar plantilla (crear o actualizar)
  const handleSave = async () => {
    try {
      setSaving(true);
      
      const errors: typeof validationErrors = {};
      
      // Validar nombre de plantilla
      if (!formData.name.trim()) {
        errors.emptyName = true;
      }

      // Validar formato del nombre (snake_case)
      const nameRegex = /^[a-z0-9_]+$/;
      if (formData.name.trim() && !nameRegex.test(formData.name.trim())) {
        errors.emptyName = true; // Usar el mismo error para simplificar
      }

      // Validar que haya contenido en los componentes
      const hasContent = formData.components.some(c => c.text && c.text.trim());
      if (!hasContent) {
        errors.invalidBodyChars = true;
      }

      // Validar caracteres del body
      const bodyComponent = formData.components.find(c => c.type === 'BODY');
      if (bodyComponent?.text && !validateBodyChars(bodyComponent.text)) {
        errors.invalidBodyChars = true;
      }

      // Validar mapeos de variables (solo si hay variables)
      const allText = formData.components.map(c => c.text || '').join(' ');
      const hasVariables = /\{\{\d+\}\}/.test(allText);
      
      if (hasVariables) {
        // Obtener todas las variables usadas en el contenido
        const allVars = getAllVariables();
        
        // Verificar que todas las variables tengan un mapeo
        const unmappedVars = allVars.filter(varNum => {
          const mapping = getVariableMapping(varNum);
          return !mapping;
        });
        
        if (unmappedVars.length > 0) {
          errors.unmappedVariables = unmappedVars;
        }
        
        // Filtrar variables del sistema (mapeadas a 'system') de la validación
        const systemMappings = (formData.variable_mappings || []).filter(
          m => m.table_name === 'system'
        );
        const dynamicMappings = (formData.variable_mappings || []).filter(
          m => m.table_name !== 'system'
        );
        
        // Solo validar variables dinámicas (no las del sistema)
        const systemVarNumbers = systemMappings.map(m => m.variable_number);
        const dynamicVariables = allVars.filter(v => !systemVarNumbers.includes(v));
        
        if (dynamicVariables.length > 0) {
          const validation = whatsappTemplatesService.validateVariableMappings(
            formData.components,
            dynamicMappings,
            systemVarNumbers // Pasar números de variables del sistema para excluirlos
          );

          if (!validation.valid) {
            // Agregar errores de validación a los errores existentes
            if (!errors.unmappedVariables) {
              errors.unmappedVariables = [];
            }
          }
        }
      }

      // Si hay errores, mostrarlos y detener el guardado
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setSaving(false);
        return;
      }

      // Limpiar errores si la validación pasa
      setValidationErrors({});

      if (editingTemplate) {
        // Actualizar
        const result = await whatsappTemplatesService.updateTemplate(editingTemplate.id, formData);
        toast.success('Plantilla actualizada exitosamente');
      } else {
        // Crear
        const result = await whatsappTemplatesService.createTemplate(formData);
        
        // Si se está importando desde una sugerencia, vincularla
        if (importingSuggestion) {
          try {
            await whatsappTemplateSuggestionsService.linkSuggestionToTemplate(
              importingSuggestion.id,
              result.id
            );
          } catch (linkError: any) {
            console.error('⚠️ Error vinculando sugerencia:', linkError);
            // No fallar el guardado si hay error al vincular
          }
          setImportingSuggestion(null);
        }
        
        toast.success('Plantilla creada exitosamente');
      }

      setIsModalOpen(false);
      await loadTemplates();
    } catch (error: any) {
      console.error('❌ Error guardando plantilla:', error.message);
      
      // Si es un error 400, mostrar modal de error
      if (error.status === 400 || (error.message && error.message.includes('400'))) {
        const message = error.message || 'No se pudo procesar su solicitud. Por favor, verifique los datos e intente nuevamente.';
        setErrorMessage(message);
        setShowErrorModal(true);
      } else {
        // Mensajes de error más específicos para otros errores
        let errorMessage = 'Error al guardar la plantilla';
        
        if (error.code === '23505') {
          errorMessage = 'Ya existe una plantilla con ese nombre';
        } else if (error.code === '42P01') {
          errorMessage = 'La tabla whatsapp_templates no existe. Por favor ejecuta el script SQL de creación.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  // Abrir modal de confirmación de eliminación
  const handleDelete = (template: WhatsAppTemplate) => {
    setTemplateToDelete(template);
    setShowDeleteModal(true);
  };

  // Confirmar eliminación de plantilla
  const handleConfirmDelete = async () => {
    if (!templateToDelete) {
      console.error('❌ No hay plantilla para eliminar');
      return;
    }

    try {
      setIsDeleting(true);
      setIsSyncingAfterDelete(false);
      
      // Eliminar plantilla
      await whatsappTemplatesService.deleteTemplate(templateToDelete.id);
      
      setIsDeleting(false);
      setIsSyncingAfterDelete(true);
      
      // Sincronización global automática después de eliminar
      try {
        await whatsappTemplatesService.syncTemplatesFromUChat();
      } catch (syncError: any) {
        console.warn('⚠️ Error en sincronización global (no crítico):', syncError);
        // No lanzar error, solo loguear
      } finally {
        setIsSyncingAfterDelete(false);
      }
      
      // Esperar un momento para que el modal muestre la animación de éxito
      // El modal detectará que isDeleting=false e isSyncing=false y mostrará éxito
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos para mostrar éxito
      
      // Recargar plantillas después de mostrar la animación
      await loadTemplates();
      
      // Cerrar el modal después de mostrar éxito y recargar
      setShowDeleteModal(false);
      setTemplateToDelete(null);
      setIsDeleting(false);
      setIsSyncingAfterDelete(false);
    } catch (error: any) {
      console.error('❌ Error eliminando plantilla:', error);
      setIsDeleting(false);
      setIsSyncingAfterDelete(false);
      setShowDeleteModal(false);
      setTemplateToDelete(null);
      toast.error(error.message || 'Error al eliminar la plantilla');
      throw error; // Re-lanzar para que el modal maneje el error
    }
  };

  // Activar/Desactivar plantilla
  const handleToggleActive = async (template: WhatsAppTemplate) => {
    try {
      await whatsappTemplatesService.toggleTemplateActive(template.id, !template.is_active);
      toast.success(`Plantilla ${!template.is_active ? 'activada' : 'desactivada'}`);
      loadTemplates();
    } catch (error: any) {
      console.error('Error cambiando estado:', error);
      toast.error(error.message || 'Error al cambiar el estado');
    }
  };

  // Sincronizar todas las plantillas desde uChat
  const handleSync = async () => {
    try {
      setSyncing(true);
      
      const result = await whatsappTemplatesService.syncTemplatesFromUChat();
      
      
      // Manejar diferentes formatos de respuesta
      const syncedCount = result?.synced ?? (Array.isArray(result?.templates) ? result.templates.length : 1);
      const templatesCount = Array.isArray(result?.templates) ? result.templates.length : (result ? 1 : 0);
      
      toast.success(`Sincronización exitosa: ${syncedCount} plantilla(s) sincronizada(s)`);
      
      // Recargar plantillas después de sincronizar
      await loadTemplates();
    } catch (error: any) {
      console.error('❌ Error sincronizando plantillas:', error);
      toast.error(error.message || 'Error al sincronizar plantillas desde uChat');
    } finally {
      setSyncing(false);
    }
  };

  // Sincronizar una plantilla individual desde uChat
  const handleSyncSingle = async (templateId: string) => {
    try {
      setSyncingTemplateId(templateId);
      
      const result = await whatsappTemplatesService.syncSingleTemplateFromUChat(templateId);
      
      toast.success(`Plantilla "${result.name}" sincronizada exitosamente`);
      
      // Recargar plantillas después de sincronizar
      await loadTemplates();
    } catch (error: any) {
      console.error('❌ Error sincronizando plantilla individual:', error);
      toast.error(error.message || 'Error al sincronizar la plantilla desde uChat');
    } finally {
      setSyncingTemplateId(null);
    }
  };

  // Agregar componente
  const handleAddComponent = (type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS') => {
    const newComponent = type === 'BUTTONS' 
      ? { type: 'BUTTONS' as const, buttons: [] }
      : { type, text: '' };
    
    // Header siempre debe ir antes del body
    if (type === 'HEADER') {
      const bodyIndex = formData.components.findIndex(c => c.type === 'BODY');
      if (bodyIndex > 0) {
        // Insertar header antes del body
        const newComponents = [...formData.components];
        newComponents.splice(bodyIndex, 0, newComponent);
        setFormData({ ...formData, components: newComponents });
      } else {
        // Si no hay body o está al inicio, insertar al principio
        setFormData({
          ...formData,
          components: [newComponent, ...formData.components],
        });
      }
    } else {
      // Otros componentes se agregan al final
      setFormData({
        ...formData,
        components: [...formData.components, newComponent],
      });
    }
  };

  // Actualizar componente
  const handleUpdateComponent = (index: number, updates: Partial<WhatsAppTemplate['components'][0]>) => {
    const newComponents = [...formData.components];
    newComponents[index] = { ...newComponents[index], ...updates };
    setFormData({ ...formData, components: newComponents });
  };

  // Eliminar componente
  const handleRemoveComponent = (index: number) => {
    const newComponents = formData.components.filter((_, i) => i !== index);
    setFormData({ ...formData, components: newComponents });
  };

  // Extraer variables del texto
  const extractVariablesFromText = (text: string): number[] => {
    return whatsappTemplatesService.extractVariables(text);
  };

  // Agregar mapeo de variable
  const handleAddVariableMapping = (variableNumber: number, tableName: string, fieldName: string) => {
    let displayName = '';
    
    if (tableName === 'system') {
      // Para variables del sistema, obtener el display_name de systemVariables
      const systemVar = systemVariables.find(v => v.type === fieldName);
      if (!systemVar) return;
      displayName = systemVar.label;
    } else {
      // Para tablas, obtener el display_name del campo
      const schema = tableSchemas.find(s => s.table_name === tableName);
      const field = schema?.fields.find(f => f.name === fieldName);
      if (!field) return;
      displayName = field.display_name;
    }

    const newMappings = [...(formData.variable_mappings || [])];
    const existingIndex = newMappings.findIndex(m => m.variable_number === variableNumber);
    
    const mapping: VariableMapping = {
      variable_number: variableNumber,
      table_name: tableName,
      field_name: fieldName,
      display_name: displayName,
      is_required: false,
    };

    if (existingIndex >= 0) {
      newMappings[existingIndex] = mapping;
    } else {
      newMappings.push(mapping);
    }

    setFormData({ ...formData, variable_mappings: newMappings });
    setShowVariableMapper(false);
    setSelectedVariable(null);
  };

  // Obtener todas las variables usadas en los componentes
  const getAllVariables = (): number[] => {
    const variables: number[] = [];
    formData.components.forEach(component => {
      if (component.text) {
        const vars = extractVariablesFromText(component.text);
        vars.forEach(v => {
          if (!variables.includes(v)) {
            variables.push(v);
          }
        });
      }
    });
    return variables.sort((a, b) => a - b);
  };

  // Obtener mapeo de una variable
  const getVariableMapping = (variableNumber: number): VariableMapping | undefined => {
    return formData.variable_mappings?.find(m => m.variable_number === variableNumber);
  };

  // Generar vista previa (ahora async para obtener datos reales)
  const [previewText, setPreviewText] = useState<string>('');
  
  const generatePreview = useCallback(async () => {
    if (!isModalOpen) return;
    
    if (!editingTemplate && !formData.components.length) {
      setPreviewText('');
      return;
    }
    
    setPreviewLoading(true);
    try {
      // Crear template con mapeos existentes
      const template = editingTemplate || {
        ...formData,
        id: 'preview',
        status: 'PENDING',
        uchat_synced: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as WhatsAppTemplate;

      // Obtener nombre del ejecutivo del contexto de autenticación
      const ejecutivoNombre = user?.full_name || 'Ejecutivo Ejemplo';

      const preview = await whatsappTemplatesService.generateExample(template, undefined, ejecutivoNombre);
      setPreviewText(preview);
    } catch (error) {
      console.error('Error generando vista previa:', error);
      setPreviewText('Error al generar la vista previa');
    } finally {
      setPreviewLoading(false);
    }
  }, [isModalOpen, editingTemplate, formData, user]);

  // Generar vista previa cuando cambian los datos del formulario
  useEffect(() => {
    if (isModalOpen) {
      const timeoutId = setTimeout(() => {
        generatePreview();
      }, 500); // Debounce de 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [isModalOpen, formData.components, formData.variable_mappings, editingTemplate, generatePreview]);

  // Obtener color de estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Obtener texto de estado en español
  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'Aprobada';
      case 'PENDING':
        return 'Pendiente';
      case 'REJECTED':
        return 'Rechazada';
      default:
        return status;
    }
  };

  // Obtener color de categoría
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'MARKETING':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'UTILITY':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'AUTHENTICATION':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Manejar importación de sugerencia a plantilla
  const handleImportSuggestionToTemplate = (suggestion: TemplateSuggestion) => {
    // Guardar la sugerencia que se está importando
    setImportingSuggestion(suggestion);
    
    // Mapeo de nombres de variable a configuración de mapeo
    const variableNameToMapping: Record<string, { table_name: string; field_name: string; display_name: string }> = {
      'titulo': { table_name: 'prospectos', field_name: 'titulo', display_name: 'Título' },
      'primer_nombre': { table_name: 'prospectos', field_name: 'primer_nombre', display_name: 'Primer Nombre' },
      'primer_apellido': { table_name: 'prospectos', field_name: 'apellido_paterno', display_name: 'Primer Apellido' },
      'ejecutivo_nombre': { table_name: 'system', field_name: 'ejecutivo_nombre', display_name: 'Nombre Ejecutivo' },
      'fecha_actual': { table_name: 'system', field_name: 'fecha_actual', display_name: 'Fecha Actual' },
    };
    
    // Extraer variables del texto de sugerencia y reemplazar por {{1}}, {{2}}, etc.
    let processedText = suggestion.template_text;
    const variableMappings: VariableMapping[] = [];
    let variableCounter = 1;
    
    // Buscar todas las variables con formato {{variable_name}}
    const variableRegex = /\{\{(\w+)\}\}/g;
    const foundVariables: string[] = [];
    let match;
    
    // Primero encontrar todas las variables únicas
    while ((match = variableRegex.exec(suggestion.template_text)) !== null) {
      const varName = match[1];
      if (!foundVariables.includes(varName)) {
        foundVariables.push(varName);
      }
    }
    
    // Reemplazar cada variable única y crear mapeo
    foundVariables.forEach(varName => {
      const mappingConfig = variableNameToMapping[varName];
      if (mappingConfig) {
        // Reemplazar todas las ocurrencias de {{varName}} por {{variableCounter}}
        const varRegex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
        processedText = processedText.replace(varRegex, `{{${variableCounter}}}`);
        
        // Crear el mapeo
        variableMappings.push({
          variable_number: variableCounter,
          table_name: mappingConfig.table_name,
          field_name: mappingConfig.field_name,
          display_name: mappingConfig.display_name,
        });
        
        variableCounter++;
      }
    });
    
    // Sanitizar el nombre de la plantilla:
    // - Convertir a minúsculas
    // - Reemplazar espacios por guiones bajos
    // - Eliminar acentos y caracteres especiales
    // - Solo permitir letras, números y guiones bajos
    const sanitizedName = suggestion.name
      .toLowerCase()
      .normalize('NFD') // Separar caracteres con acentos
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/\s+/g, '_') // Reemplazar espacios por guiones bajos
      .replace(/[^a-z0-9_]/g, '') // Solo letras, números y guiones bajos
      .replace(/_+/g, '_') // Eliminar guiones bajos duplicados
      .replace(/^_|_$/g, ''); // Eliminar guiones bajos al inicio y final
    
    // Preparar datos del formulario con la sugerencia
    // Incluimos suggested_by para rastrear quién sugirió la plantilla
    setFormData({
      name: sanitizedName,
      language: 'es_MX',
      category: 'MARKETING',
      components: [
        {
          type: 'BODY',
          text: processedText, // Texto con variables convertidas a {{1}}, {{2}}, etc.
        }
      ],
      description: suggestion.justification,
      variable_mappings: variableMappings, // Mapeos generados automáticamente
      classification: { audience_ids: [] },
      suggested_by: suggestion.suggested_by, // ID del usuario que sugirió la plantilla
    });
    
    // Cambiar a tab de plantillas y abrir modal de creación
    setMainTab('templates');
    setIsModalOpen(true);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* Tabs principales */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-8">
          <button
            onClick={() => setMainTab('templates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              mainTab === 'templates'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Plantillas
          </button>
          <button
            onClick={() => setMainTab('suggestions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              mainTab === 'suggestions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Sugerencias
          </button>
        </div>
      </div>

      {mainTab === 'templates' ? (
        <>
          {/* Header con acciones */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Plantillas WhatsApp
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Gestiona y crea plantillas de mensajes para uChat
              </p>
            </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateNew}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva Plantilla</span>
          </motion.button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar plantillas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white"
            />
          </div>

          {/* Selector de vista */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm font-medium">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Table className="w-4 h-4" />
              <span className="text-sm font-medium">Grid</span>
            </button>
          </div>
        </div>

        {/* Filtros rápidos tipo etiquetas */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center">Filtros rápidos:</span>
          
          {/* Categorías */}
          <button
            onClick={() => toggleQuickFilter('category-MARKETING')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeQuickFilters.has('category-MARKETING')
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-2 border-purple-500'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-2 border-transparent hover:border-gray-300'
            }`}
          >
            Marketing
          </button>
          <button
            onClick={() => toggleQuickFilter('category-UTILITY')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeQuickFilters.has('category-UTILITY')
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-2 border-blue-500'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-2 border-transparent hover:border-gray-300'
            }`}
          >
            Utilidad
          </button>
          <button
            onClick={() => toggleQuickFilter('category-AUTHENTICATION')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeQuickFilters.has('category-AUTHENTICATION')
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-2 border-orange-500'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-2 border-transparent hover:border-gray-300'
            }`}
          >
            Autenticación
          </button>

          {/* Estados */}
          <button
            onClick={() => toggleQuickFilter('status-APPROVED')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeQuickFilters.has('status-APPROVED')
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-2 border-green-500'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-2 border-transparent hover:border-gray-300'
            }`}
          >
            Aprobadas
          </button>
          <button
            onClick={() => toggleQuickFilter('status-PENDING')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeQuickFilters.has('status-PENDING')
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-2 border-yellow-500'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-2 border-transparent hover:border-gray-300'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => toggleQuickFilter('status-REJECTED')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeQuickFilters.has('status-REJECTED')
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-2 border-red-500'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-2 border-transparent hover:border-gray-300'
            }`}
          >
            Rechazadas
          </button>

          {/* Activo/Inactivo */}
          <button
            onClick={() => toggleQuickFilter('active-true')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeQuickFilters.has('active-true')
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-2 border-emerald-500'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-2 border-transparent hover:border-gray-300'
            }`}
          >
            Activas
          </button>
          <button
            onClick={() => toggleQuickFilter('active-false')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeQuickFilters.has('active-false')
                ? 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 border-2 border-gray-500'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-2 border-transparent hover:border-gray-300'
            }`}
          >
            Inactivas
          </button>

          {/* Limpiar filtros */}
          {activeQuickFilters.size > 0 && (
            <button
              onClick={() => setActiveQuickFilters(new Set())}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-2 border-transparent hover:border-gray-300 transition-all"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Contador de resultados */}
      {filteredTemplates.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredTemplates.length} plantilla{filteredTemplates.length !== 1 ? 's' : ''} 
            {searchQuery || filterCategory !== 'all' || filterStatus !== 'all' || filterActive !== 'all' 
              ? ' encontrada' + (filteredTemplates.length !== 1 ? 's' : '') 
              : ''}
          </p>
        </div>
      )}

      {/* Vista de plantillas */}
      {filteredTemplates.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-16 text-center border border-gray-200 dark:border-gray-700"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No hay plantillas
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
            {searchQuery || filterCategory !== 'all' || filterStatus !== 'all' || filterActive !== 'all'
              ? 'No se encontraron plantillas con los filtros aplicados'
              : 'Las plantillas de WhatsApp te permiten enviar mensajes predefinidos a tus prospectos'}
          </p>
          {!searchQuery && filterCategory === 'all' && filterStatus === 'all' && filterActive === 'all' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
              <Plus className="w-5 h-5" />
              <span>Crear Primera Plantilla</span>
            </motion.button>
          )}
        </motion.div>
      ) : viewMode === 'cards' ? (
        <>
          {/* Vista de Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {paginatedTemplatesCards.map((template, index) => (
                <TemplateGridCard
                  key={template.id}
                  template={template}
                  index={index}
                  onEdit={() => handleLimitedEdit(template)}
                  onDelete={() => handleDelete(template)}
                  onToggleActive={() => handleToggleActive(template)}
                  onViewPreview={() => {
                    setSelectedTemplate(template);
                    setShowPreview(true);
                  }}
                  onSync={handleSyncSingle}
                  syncingTemplateId={syncingTemplateId}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                  getCategoryColor={getCategoryColor}
                  audiences={audiences}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Paginación Cards */}
          {totalPagesCards > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando {startIndexCards + 1} - {Math.min(endIndexCards, filteredTemplates.length)} de {filteredTemplates.length} plantillas
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPageCards(prev => Math.max(1, prev - 1))}
                  disabled={currentPageCards === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
                  Página {currentPageCards} de {totalPagesCards}
                </span>
                <button
                  onClick={() => setCurrentPageCards(prev => Math.min(totalPagesCards, prev + 1))}
                  disabled={currentPageCards === totalPagesCards}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Vista de Data Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        Nombre
                        {sortColumn === 'name' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('category')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        Categoría
                        {sortColumn === 'category' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        Estado
                        {sortColumn === 'status' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Descripción
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Variables
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('is_active')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        Activa
                        {sortColumn === 'is_active' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Acciones
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedTemplatesGrid.map((template) => {
                    const normalizedMappings = (() => {
                      let mappings: any[] = [];
                      if (template.variable_mappings) {
                        if (Array.isArray(template.variable_mappings)) {
                          mappings = template.variable_mappings;
                        } else if (typeof template.variable_mappings === 'object' && 'mappings' in template.variable_mappings) {
                          const mappingsObj = template.variable_mappings as { mappings?: any[] };
                          mappings = Array.isArray(mappingsObj.mappings) ? mappingsObj.mappings : [];
                        }
                      }
                      return mappings;
                    })();

                    // assignedAudiences no se usa en el grid, pero se mantiene por si se necesita después

                    return (
                      <motion.tr
                        key={template.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {template.name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg ${getCategoryColor(template.category)}`}>
                            {template.category === 'MARKETING' ? 'Marketing' :
                             template.category === 'UTILITY' ? 'Utilidad' :
                             'Autenticación'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg ${getStatusColor(template.status)}`}>
                            {getStatusText(template.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 max-w-xs">
                            {template.description || 'Sin descripción'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {normalizedMappings.slice(0, 2).map((mapping: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                              >
                                {mapping.display_name}
                              </span>
                            ))}
                            {normalizedMappings.length > 2 && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                +{normalizedMappings.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(template)}
                            className={`w-10 h-6 rounded-full relative transition-colors ${
                              template.is_active
                                ? 'bg-green-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                                template.is_active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleLimitedEdit(template)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTemplate(template);
                                setShowPreview(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                              title="Vista previa"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(template)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación Grid */}
            {totalPagesGrid > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Mostrando {startIndexGrid + 1} - {Math.min(endIndexGrid, filteredTemplates.length)} de {filteredTemplates.length} plantillas
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPageGrid(prev => Math.max(1, prev - 1))}
                    disabled={currentPageGrid === 1}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
                    Página {currentPageGrid} de {totalPagesGrid}
                  </span>
                  <button
                    onClick={() => setCurrentPageGrid(prev => Math.min(totalPagesGrid, prev + 1))}
                    disabled={currentPageGrid === totalPagesGrid}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de creación/edición */}
      <TemplateModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setValidationErrors({}); // Limpiar errores al cerrar
        }}
        onSave={handleSave}
        formData={formData}
        setFormData={setFormData}
        editingTemplate={editingTemplate}
        tableSchemas={tableSchemas}
        onAddComponent={handleAddComponent}
        onUpdateComponent={handleUpdateComponent}
        onRemoveComponent={handleRemoveComponent}
        getAllVariables={getAllVariables}
        getVariableMapping={getVariableMapping}
        onAddVariableMapping={handleAddVariableMapping}
        showVariableMapper={showVariableMapper}
        setShowVariableMapper={setShowVariableMapper}
        selectedVariable={selectedVariable}
        setSelectedVariable={setSelectedVariable}
        previewText={previewText}
        previewLoading={previewLoading}
        systemVariables={systemVariables}
        saving={saving}
        validationErrors={validationErrors}
        onValidationErrorsChange={setValidationErrors}
      />

      {/* Modal de vista previa */}
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        template={selectedTemplate}
      />

      {/* Modal de error para errores 400 */}
        </>
      ) : (
        <TemplateSuggestionsTab onImportToTemplate={handleImportSuggestionToTemplate} />
      )}

      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Error al crear plantilla"
        message={errorMessage || 'No se pudo procesar su solicitud. Por favor, verifique los datos e intente nuevamente.'}
      />

      {/* Modal de confirmación de eliminación */}
      <DeleteTemplateConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setTemplateToDelete(null);
          setIsDeleting(false);
          setIsSyncingAfterDelete(false);
        }}
        template={templateToDelete}
        onDelete={handleConfirmDelete}
        isDeleting={isDeleting}
        isSyncing={isSyncingAfterDelete}
      />

      {/* Modal de edición limitada */}
      <LimitedEditModal
        isOpen={isLimitedEditModalOpen}
        onClose={() => {
          setIsLimitedEditModalOpen(false);
          setLimitedEditTemplate(null);
        }}
        template={limitedEditTemplate}
        formData={limitedEditFormData}
        setFormData={setLimitedEditFormData}
        onSave={handleSaveLimitedEdit}
        saving={savingLimitedEdit}
        tableSchemas={tableSchemas}
        getAllVariables={getAllVariables}
        getVariableMapping={getVariableMapping}
        onAddVariableMapping={handleAddVariableMapping}
        systemVariables={systemVariables}
        audiences={audiences}
      />
    </div>
  );
};

// Componente de tarjeta de plantilla
interface TemplateCardProps {
  template: WhatsAppTemplate;
  isExpanded: boolean;
  onExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onViewPreview: () => void;
  onSync: (templateId: string) => void;
  syncingTemplateId: string | null;
  getStatusColor: (status: string) => string;
  getCategoryColor: (category: string) => string;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isExpanded,
  onExpand,
  onEdit,
  onDelete,
  onToggleActive,
  onViewPreview,
  onSync,
  syncingTemplateId,
  getStatusColor,
  getCategoryColor,
}) => {
  const bodyComponent = template.components.find(c => c.type === 'BODY');
  const previewText = bodyComponent?.text || 'Sin contenido';
  const maxPreviewLength = 150;
  const truncatedPreview = previewText.length > maxPreviewLength
    ? previewText.substring(0, maxPreviewLength) + '...'
    : previewText;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {template.name}
              </h3>
              {!template.is_active && (
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-lg">
                  Inactiva
                </span>
              )}
            </div>
            {template.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {template.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 text-xs font-medium rounded-lg ${getCategoryColor(template.category)}`}>
                {template.category}
              </span>
              <span className={`px-3 py-1 text-xs font-medium rounded-lg ${getStatusColor(template.status)}`}>
                {template.status}
              </span>
              <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-lg flex items-center space-x-1">
                <Globe className="w-3 h-3" />
                <span>{template.language}</span>
              </span>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center space-x-2 ml-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onViewPreview}
              className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
              title="Vista previa"
            >
              <Eye className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleActive}
              className={`p-2 transition-colors ${
                template.is_active
                  ? 'text-green-400 hover:text-green-500'
                  : 'text-gray-400 hover:text-gray-500'
              }`}
              title={template.is_active ? 'Desactivar' : 'Activar'}
            >
              <Power className={`w-5 h-5 ${template.is_active ? '' : 'opacity-50'}`} />
            </motion.button>
            {/* Botón de sincronización individual */}
            <motion.button
              whileHover={{ scale: syncingTemplateId === template.id ? 1 : 1.1 }}
              whileTap={{ scale: syncingTemplateId === template.id ? 1 : 0.9 }}
              onClick={() => onSync(template.id)}
              disabled={syncingTemplateId === template.id}
              className={`p-2 transition-colors ${
                syncingTemplateId === template.id
                  ? 'text-emerald-500 cursor-wait'
                  : 'text-emerald-400 hover:text-emerald-500'
              }`}
              title="Sincronizar desde uChat"
            >
              <RefreshCw className={`w-5 h-5 ${syncingTemplateId === template.id ? 'animate-spin' : ''}`} />
            </motion.button>
            {/* Botón de editar deshabilitado temporalmente */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled
              className="p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50"
              title="Edición temporalmente deshabilitada"
            >
              <Edit2 className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onExpand}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Preview del contenido */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {truncatedPreview}
          </p>
        </div>

        {/* Información expandida */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">ID:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400 font-mono text-xs">
                    {template.id}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Sincronizado:</span>
                  <span className={`ml-2 ${template.uchat_synced ? 'text-green-600' : 'text-yellow-600'}`}>
                    {template.uchat_synced ? 'Sí' : 'No'}
                  </span>
                </div>
                {template.last_synced_at && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Última sincronización:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      {new Date(template.last_synced_at).toLocaleString('es-MX')}
                    </span>
                  </div>
                )}
                {template.variable_mappings && template.variable_mappings.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Variables mapeadas:</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {template.variable_mappings.map((mapping, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg"
                        >
                          {`{{${mapping.variable_number}}}`} → {mapping.display_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ============================================
// NUEVO COMPONENTE: TemplateGridCard (Diseño moderno en grid)
// ============================================

interface TemplateGridCardProps {
  template: WhatsAppTemplate;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onViewPreview: () => void;
  onSync: (templateId: string) => void;
  syncingTemplateId: string | null;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  getCategoryColor: (category: string) => string;
  audiences: WhatsAppAudience[];
}

const TemplateGridCard: React.FC<TemplateGridCardProps> = ({
  template,
  index,
  onEdit,
  onDelete,
  onToggleActive,
  onViewPreview,
  onSync,
  syncingTemplateId,
  getStatusColor,
  getStatusText,
  getCategoryColor,
  audiences,
}) => {
  const bodyComponent = template.components.find(c => c.type === 'BODY');
  const previewText = bodyComponent?.text || 'Sin contenido';
  
  // Parsear variable_mappings - puede venir en formato { mappings: [...], audience_ids: [...] } o como array directo
  let parsedMappings: VariableMapping[] = [];
  if (template.variable_mappings) {
    let rawMappings: any = template.variable_mappings;
    
    if (typeof rawMappings === 'string') {
      try {
        rawMappings = JSON.parse(rawMappings);
      } catch (e) {
        console.error('Error parseando variable_mappings en card:', e);
        rawMappings = [];
      }
    }
    
    // Si tiene estructura con mappings y audience_ids (metadata)
    if (rawMappings && typeof rawMappings === 'object' && !Array.isArray(rawMappings)) {
      if (rawMappings.mappings && Array.isArray(rawMappings.mappings)) {
        parsedMappings = rawMappings.mappings;
      }
    } else if (Array.isArray(rawMappings)) {
      parsedMappings = rawMappings;
    }
  }
  
  // Generar vista previa con datos mockup según los mapeos
  const generateMockupPreview = (text: string, mappings?: VariableMapping[]): string => {
    if (!mappings || mappings.length === 0) {
      return text;
    }
    
    // Crear mapa de valores mockup por variable
    const mockupValues: Record<number, string> = {};
    
    mappings.forEach(mapping => {
      let mockValue = '';
      
      if (mapping.table_name === 'system') {
        // Valores mockup para variables del sistema
        switch (mapping.field_name) {
          case 'fecha_actual':
            mockValue = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
            break;
          case 'hora_actual':
            mockValue = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            break;
          case 'ejecutivo_nombre':
            mockValue = 'Juan Pérez';
            break;
          case 'fecha_personalizada':
            mockValue = '15/12/2025';
            break;
          case 'hora_personalizada':
            mockValue = '14:30';
            break;
          default:
            mockValue = `[${mapping.display_name}]`;
        }
      } else {
        // Valores mockup según el tipo de campo
        switch (mapping.field_name) {
          case 'nombre':
          case 'nombre_completo':
            mockValue = 'María González';
            break;
          case 'whatsapp':
          case 'telefono':
            mockValue = '+52 333 123 4567';
            break;
          case 'email':
            mockValue = 'maria@example.com';
            break;
          case 'etapa':
            mockValue = 'Interesado';
            break;
          case 'destino_preferido':
          case 'destino':
            mockValue = 'Riviera Maya';
            break;
          case 'resort':
          case 'resort_nombre':
            mockValue = 'Grand Palladium';
            break;
          case 'edad':
            mockValue = '35';
            break;
          case 'estado_civil':
            mockValue = 'Casado';
            break;
          case 'viaja_con':
            mockValue = 'Familia';
            break;
          default:
            mockValue = `[${mapping.display_name}]`;
        }
      }
      
      mockupValues[mapping.variable_number] = mockValue;
    });
    
    // Reemplazar variables en el texto
    let result = text;
    const variableRegex = /\{\{(\d+)\}\}/g;
    result = result.replace(variableRegex, (match, varNum) => {
      const num = parseInt(varNum, 10);
      return mockupValues[num] || match;
    });
    
    return result;
  };
  
  const previewWithMockup = generateMockupPreview(previewText, parsedMappings);
  const maxLength = 80;
  const truncated = previewWithMockup.length > maxLength 
    ? previewWithMockup.substring(0, maxLength) + '...' 
    : previewWithMockup;

  // Contar variables
  const variableCount = template.variable_mappings?.length || 0;
  
  // Obtener audiencias asignadas con sus nombres y conteos
  const classification = (template as any).classification;
  const assignedAudiences = classification?.audience_ids
    ?.map((audId: string) => audiences.find(a => a.id === audId))
    .filter(Boolean) as WhatsAppAudience[] || [];
  
  const totalAudienceProspects = assignedAudiences.reduce((sum, a) => sum + (a?.prospectos_count || 0), 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 overflow-hidden hover:shadow-lg hover:shadow-blue-500/5"
    >
      {/* Indicador de estado superior */}
      <div className={`absolute top-0 left-0 right-0 h-5 relative ${
        template.status === 'APPROVED' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
        template.status === 'PENDING' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
        'bg-gradient-to-r from-red-400 to-rose-500'
      }`}>
        {/* Barra de color inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-current opacity-50" />
        {/* Texto del estado alineado a la derecha */}
        <span className={`absolute top-0.5 right-2 text-[10px] font-medium ${
          template.status === 'APPROVED' ? 'text-green-800 dark:text-green-200' :
          template.status === 'PENDING' ? 'text-yellow-800 dark:text-yellow-200' :
          'text-red-800 dark:text-red-200'
        }`}>
          {getStatusText(template.status)}
        </span>
      </div>

      {/* Contenido principal */}
      <div className="p-4 pt-6">
        {/* Header con nombre y estado */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={template.name}>
              {template.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md ${getCategoryColor(template.category)}`}>
                {template.category}
              </span>
              {!template.is_active && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 rounded-md">
                  Inactiva
                </span>
              )}
            </div>
          </div>
          
          {/* Menu de acciones */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onViewPreview}
              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title="Vista previa"
            >
              <Eye className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleActive}
              className={`p-1.5 rounded-lg transition-colors ${
                template.is_active
                  ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30'
                  : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title={template.is_active ? 'Desactivar' : 'Activar'}
            >
              <Power className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
              title="Editar"
            >
              <Edit2 className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSync(template.id)}
              disabled={syncingTemplateId === template.id}
              className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors disabled:opacity-50"
              title="Sincronizar"
            >
              <RefreshCw className={`w-4 h-4 ${syncingTemplateId === template.id ? 'animate-spin' : ''}`} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Preview del mensaje */}
        <div 
          className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3 min-h-[40px] cursor-pointer hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
          onClick={onViewPreview}
        >
          {truncated}
        </div>

        {/* Audiencias asignadas con nombres y conteos reales */}
        {assignedAudiences.length > 0 && (
          <div className="mb-3 space-y-1">
            <div className="flex flex-wrap gap-1">
              {assignedAudiences.slice(0, 2).map((aud) => (
                <span
                  key={aud.id}
                  className="px-2 py-0.5 text-[9px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-md flex items-center gap-1"
                  title={`${aud.nombre}: ${aud.prospectos_count.toLocaleString()} prospectos`}
                >
                  <Users className="w-2.5 h-2.5" />
                  {aud.nombre}
                </span>
              ))}
              {assignedAudiences.length > 2 && (
                <span className="px-2 py-0.5 text-[9px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-md">
                  +{assignedAudiences.length - 2} más
                </span>
              )}
            </div>
            {/* Contador total de prospectos */}
            <div className="flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400">
              <Users className="w-2.5 h-2.5" />
              <span>{totalAudienceProspects.toLocaleString()} prospectos alcanzables</span>
            </div>
          </div>
        )}

        {/* Footer con metadata */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {template.language}
            </span>
            {variableCount > 0 && (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {variableCount} var
              </span>
            )}
          </div>
          
          {/* Indicador de sync */}
          <div className="flex items-center gap-1">
            {template.uchat_synced ? (
              <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                Sync
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-yellow-600 dark:text-yellow-400">
                <Clock className="w-3 h-3" />
                Pendiente
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Componente de modal de creación/edición
interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  formData: CreateTemplateInput;
  setFormData: React.Dispatch<React.SetStateAction<CreateTemplateInput>>;
  editingTemplate: WhatsAppTemplate | null;
  tableSchemas: TableSchema[];
  onAddComponent: (type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS') => void;
  onUpdateComponent: (index: number, updates: Partial<WhatsAppTemplate['components'][0]>) => void;
  onRemoveComponent: (index: number) => void;
  getAllVariables: () => number[];
  getVariableMapping: (variableNumber: number) => VariableMapping | undefined;
  onAddVariableMapping: (variableNumber: number, tableName: string, fieldName: string) => void;
  showVariableMapper: boolean;
  setShowVariableMapper: (show: boolean) => void;
  selectedVariable: number | null;
  setSelectedVariable: (variable: number | null) => void;
  previewText: string;
  previewLoading: boolean;
  systemVariables: Array<{ type: string; label: string; icon: any; color: string }>;
  saving: boolean;
  validationErrors?: {
    unmappedVariables?: number[];
    noAudiences?: boolean;
    emptyName?: boolean;
    invalidBodyChars?: boolean;
  };
  onValidationErrorsChange?: (errors: {
    unmappedVariables?: number[];
    noAudiences?: boolean;
    emptyName?: boolean;
    invalidBodyChars?: boolean;
  }) => void;
}

const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  formData,
  setFormData,
  editingTemplate,
  tableSchemas,
  onAddComponent,
  onUpdateComponent,
  onRemoveComponent,
  getAllVariables,
  getVariableMapping,
  onAddVariableMapping,
  showVariableMapper,
  setShowVariableMapper,
  selectedVariable,
  setSelectedVariable,
  previewText,
  previewLoading,
  systemVariables,
  saving,
  validationErrors = {},
  onValidationErrorsChange,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'variables' | 'preview'>('content');
  const [showPreviewContent, setShowPreviewContent] = useState(false);

  const variables = getAllVariables();

  const handleInsertVariable = (componentIndex: number, variableNumber: number, position?: number) => {
    const component = formData.components[componentIndex];
    const currentText = component.text || '';
    const insertPosition = position !== undefined ? position : currentText.length;
    const newText = currentText.slice(0, insertPosition) + `{{${variableNumber}}}` + currentText.slice(insertPosition);
    onUpdateComponent(componentIndex, { text: newText });
  };

  // Obtener el siguiente número de variable disponible (para cualquier tipo)
  const getNextVariableNumber = (componentIndex: number): number => {
    const component = formData.components[componentIndex];
    const currentText = component.text || '';
    const allVariables = whatsappTemplatesService.extractVariables(currentText);
    
    if (allVariables.length === 0) {
      return 1;
    }
    
    const maxVar = Math.max(...allVariables);
    return maxVar + 1;
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 flex items-center justify-center p-4 z-50 overflow-y-auto"
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800 my-8">
              {/* Header */}
              <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {editingTemplate ? 'Modifica los datos de la plantilla' : 'Crea una nueva plantilla de WhatsApp'}
                    </p>
                  </div>
                  
                  {/* Alerta minimalista de errores de validación */}
                  <AnimatePresence>
                    {Object.keys(validationErrors).length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                      >
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <span className="text-xs font-medium text-red-700 dark:text-red-300">
                          {validationErrors.unmappedVariables && `Variables sin mapear`}
                          {validationErrors.emptyName && (validationErrors.unmappedVariables ? ', ' : '') + `Nombre requerido`}
                          {validationErrors.invalidBodyChars && ((validationErrors.unmappedVariables || validationErrors.emptyName) ? ', ' : '') + `Caracteres inválidos`}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
                  {(['content', 'variables', 'preview'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === tab
                          ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      {tab === 'content' && 'Contenido'}
                      {tab === 'variables' && `Variables (${variables.length})`}
                      {tab === 'preview' && 'Vista Previa'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-8 py-6">
                {activeTab === 'content' && (
                  <div className="space-y-6">
                    {/* Información básica */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Información Básica
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            <FileText className="w-4 h-4" />
                            <span>Nombre de la Plantilla</span>
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => {
                              // Solo permitir letras, números y guiones bajos (sin espacios, acentos ni caracteres especiales)
                              const sanitized = e.target.value
                                .toLowerCase()
                                .replace(/\s+/g, '_') // Espacios a guiones bajos
                                .replace(/[áàäâ]/g, 'a')
                                .replace(/[éèëê]/g, 'e')
                                .replace(/[íìïî]/g, 'i')
                                .replace(/[óòöô]/g, 'o')
                                .replace(/[úùüû]/g, 'u')
                                .replace(/ñ/g, 'n')
                                .replace(/[^a-z0-9_]/g, ''); // Solo alfanuméricos y guiones bajos
                              setFormData({ ...formData, name: sanitized });
                              // Limpiar error de nombre si se está escribiendo
                              if (validationErrors.emptyName && sanitized.trim()) {
                                onValidationErrorsChange?.({ ...validationErrors, emptyName: false });
                              }
                            }}
                            placeholder="ej: bienvenida_cliente"
                            className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white font-mono ${
                              validationErrors.emptyName
                                ? 'border-red-300 dark:border-red-700'
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Solo letras, números y guiones bajos (_). Sin espacios ni acentos.
                          </p>
                        </div>

                        <div>
                          <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            <Globe className="w-4 h-4" />
                            <span>Idioma</span>
                          </label>
                          <select
                            value={formData.language}
                            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                            className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                          >
                            <option value="es_MX">Español (México)</option>
                            <option value="en_US">English (US)</option>
                          </select>
                        </div>

                        <div>
                          <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            <Tag className="w-4 h-4" />
                            <span>Categoría</span>
                          </label>
                          <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                            className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                          >
                            <option value="UTILITY">Utilidad</option>
                            <option value="MARKETING">Marketing</option>
                            <option value="AUTHENTICATION">Autenticación</option>
                          </select>
                        </div>

                        <div>
                          <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            <FileText className="w-4 h-4" />
                            <span>Descripción</span>
                          </label>
                          <input
                            type="text"
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Descripción opcional"
                            className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Componentes */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Componentes
                          </h4>
                        </div>
                        <div className="flex space-x-2">
                          {/* Solo mostrar Header si no existe uno */}
                          {!formData.components.some(c => c.type === 'HEADER') && (
                            <button
                              onClick={() => onAddComponent('HEADER')}
                              className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                            >
                              <Image className="w-3 h-3" />
                              + Header
                            </button>
                          )}
                          {/* Solo mostrar Body si no existe uno */}
                          {!formData.components.some(c => c.type === 'BODY') && (
                            <button
                              onClick={() => onAddComponent('BODY')}
                              className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              + Body
                            </button>
                          )}
                        </div>
                      </div>


                      {formData.components.map((component, index) => (
                        <ComponentEditor
                          key={index}
                          component={component}
                          index={index}
                          onUpdate={(updates) => onUpdateComponent(index, updates)}
                          onRemove={() => onRemoveComponent(index)}
                          onInsertVariable={(varNum, pos) => handleInsertVariable(index, varNum, pos)}
                          variables={variables}
                          systemVariables={systemVariables}
                          getNextDynamicVar={() => getNextVariableNumber(index)}
                          formData={formData}
                          setFormData={setFormData}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'variables' && (
                  <VariableMapperTab
                    variables={variables}
                    tableSchemas={tableSchemas}
                    getVariableMapping={getVariableMapping}
                    onAddVariableMapping={onAddVariableMapping}
                    systemVariables={systemVariables}
                    components={formData.components}
                    validationErrors={validationErrors}
                    onValidationErrorsChange={onValidationErrorsChange}
                  />
                )}

                {activeTab === 'preview' && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">
                          Vista Previa WhatsApp
                        </span>
                      </div>
                      {previewLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                          <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando datos reales...</span>
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                          <p className="text-gray-900 dark:text-white whitespace-pre-wrap font-normal leading-relaxed">
                            {previewText || 'No hay contenido para previsualizar'}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-start space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="italic">
                        La vista previa muestra datos reales del primer registro de cada tabla mapeada. Las variables del sistema (fecha, hora, ejecutivo) se muestran con valores de ejemplo.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: saving ? 1 : 1.02 }}
                  whileTap={{ scale: saving ? 1 : 0.98 }}
                  onClick={onClose}
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: saving ? 1 : 1.02 }}
                  whileTap={{ scale: saving ? 1 : 0.98 }}
                  onClick={onSave}
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 inline mr-2" />
                      {editingTemplate ? 'Actualizar' : 'Crear'}
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Componente editor de componente individual
interface ComponentEditorProps {
  component: WhatsAppTemplate['components'][0];
  index: number;
  onUpdate: (updates: Partial<WhatsAppTemplate['components'][0]>) => void;
  onRemove: () => void;
  onInsertVariable: (variableNumber: number, position?: number) => void;
  variables: number[];
  systemVariables?: Array<{ type: string; label: string; icon: any; color: string }>;
  getNextDynamicVar: () => number;
  formData: CreateTemplateInput;
  setFormData: React.Dispatch<React.SetStateAction<CreateTemplateInput>>;
}

const ComponentEditor: React.FC<ComponentEditorProps> = ({
  component,
  index,
  onUpdate,
  onRemove,
  onInsertVariable,
  variables,
  systemVariables = [],
  getNextDynamicVar,
  formData,
  setFormData,
}) => {
  const [showVariableMenu, setShowVariableMenu] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  // Función simple para insertar texto en la posición del cursor
  const insertTextAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = component.text || '';
    const newText = currentText.slice(0, start) + text + currentText.slice(end);
    
    onUpdate({ text: newText });
    
    // Restaurar posición del cursor
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPosition = start + text.length;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };
  
  // Parsear el texto para la vista previa visual
  const parseTextWithVariables = React.useCallback((text: string) => {
    const parts: Array<{ type: 'text' | 'variable'; content: string; varNumber?: number }> = [];
    const varRegex = /\{\{(\d+)\}\}/g;
    let lastIndex = 0;
    let match;
    
    while ((match = varRegex.exec(text)) !== null) {
      // Agregar texto antes de la variable
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }
      
      // Agregar la variable
      parts.push({
        type: 'variable',
        content: match[0],
        varNumber: parseInt(match[1], 10)
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Agregar texto restante
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }
    
    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
  }, []);
  
  const parts = parseTextWithVariables(component.text || '');

  if (component.type === 'BUTTONS') {
    return (
      <div className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Botones (máximo 3)
          </span>
          <button
            onClick={onRemove}
            className="text-red-500 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Los botones se configuran después de crear la plantilla en uChat
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
            {component.type}
          </span>
          {/* Contador de caracteres */}
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            component.type === 'BODY' 
              ? (component.text?.length || 0) > 1000 
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              : component.type === 'HEADER'
                ? (component.text?.length || 0) > 60
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {component.text?.length || 0}/{component.type === 'BODY' ? '1000' : '60'}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="text-red-500 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {/* Selector de formato para HEADER */}
      {component.type === 'HEADER' && (
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
            Tipo de Header
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate({ format: 'TEXT' })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                component.format !== 'IMAGE' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              Texto
            </button>
            <button
              onClick={() => onUpdate({ format: 'IMAGE', text: '' })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                component.format === 'IMAGE' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              <Image className="w-3 h-3" />
              Imagen
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {/* Editor simple con textarea (solo para texto) */}
        {component.format !== 'IMAGE' && (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={component.text || ''}
            onChange={(e) => {
              const maxLength = component.type === 'BODY' ? 1000 : 60;
              const text = e.target.value.slice(0, maxLength);
              onUpdate({ text });
            }}
            placeholder={`Escribe el contenido del ${component.type.toLowerCase()}...`}
            className="min-h-[120px] w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white resize-y"
            style={{ 
              minHeight: component.type === 'BODY' ? '150px' : '80px'
            }}
            maxLength={component.type === 'BODY' ? 1000 : 60}
          />
          
          {/* Botones de acción */}
          <div className="absolute top-2 right-2 flex space-x-1 z-10">
            {/* Botón para añadir variable dinámica */}
            <div className="relative">
              <button
                onClick={() => {
                  const nextVar = getNextDynamicVar();
                  insertTextAtCursor(`{{${nextVar}}}`);
                }}
                className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                title={`Añadir variable dinámica {{${getNextDynamicVar()}}}`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {/* Botón para variables existentes */}
            {variables.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowVariableMenu(!showVariableMenu)}
                  className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  title="Insertar variable existente"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                {showVariableMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 min-w-[200px]">
                    {variables.map((varNum) => (
                      <button
                        key={varNum}
                        onClick={() => {
                          insertTextAtCursor(`{{${varNum}}}`);
                          setShowVariableMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        {`{{${varNum}}}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Vista previa visual con tags mapeadas */}
        {component.text && component.format !== 'IMAGE' && (
          <div className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Vista Previa (con mapeos):
              </span>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {parts.length > 0 ? (
                parts.map((part, idx) => {
                  if (part.type === 'variable' && part.varNumber !== undefined) {
                    const mapping = formData.variable_mappings?.find(m => m.variable_number === part.varNumber);
                    const isSystemVar = mapping?.table_name === 'system';
                    const systemVarInfo = isSystemVar && mapping?.field_name ? systemVariables.find(v => v.type === mapping.field_name) : null;
                    
                    // Si tiene mapeo, mostrar el valor mapeado
                    if (mapping && !isSystemVar) {
                      // Variable mapeada a tabla - mostrar nombre del campo
                      return (
                        <motion.span
                          key={`var-${part.varNumber}-${idx}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 mx-0.5 rounded-lg border-2 font-mono text-xs whitespace-nowrap bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                        >
                          <span className="font-medium">[{mapping.display_name}]</span>
                        </motion.span>
                      );
                    } else if (isSystemVar && systemVarInfo) {
                      // Variable del sistema - mostrar label
                      return (
                        <motion.span
                          key={`var-${part.varNumber}-${idx}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 mx-0.5 rounded-lg border-2 font-mono text-xs whitespace-nowrap bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700"
                        >
                          {React.createElement(systemVarInfo.icon, { className: 'w-3 h-3' })}
                          <span className="font-medium">{systemVarInfo.label}</span>
                        </motion.span>
                      );
                    } else {
                      // Variable sin mapeo
                      return (
                        <motion.span
                          key={`var-${part.varNumber}-${idx}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 mx-0.5 rounded-lg border-2 font-mono text-xs whitespace-nowrap bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300 dark:border-purple-700"
                        >
                          <span>{part.content}</span>
                        </motion.span>
                      );
                    }
                  }
                  // Renderizar texto normal preservando espacios y saltos de línea
                  return <span key={`text-${idx}`}>{part.content}</span>;
                })
              ) : (
                <span className="text-gray-400 italic">Sin contenido</span>
              )}
            </div>
          </div>
        )}
        
        {/* Editor de imagen para HEADER */}
        {component.type === 'HEADER' && component.format === 'IMAGE' && (
          <HeaderImageEditor 
            imageUrl={component.example?.header_handle?.[0] || ''}
            onImageSelect={(url) => onUpdate({ 
              example: { 
                ...component.example, 
                header_handle: [url] 
              } 
            })}
          />
        )}
      </div>
    </div>
  );
};

// Componente para editor de imagen en header con infinite scroll
interface HeaderImageEditorProps {
  imageUrl: string;
  onImageSelect: (url: string) => void;
}

interface CatalogImage {
  id: string;
  nombre: string;
  bucket: string;
  nombre_archivo: string;
  destinos: string[];
}

// Cache global de URLs para evitar regenerar
const globalImageUrlCache: Record<string, string> = {};

const HeaderImageEditor: React.FC<HeaderImageEditorProps> = ({ imageUrl, onImageSelect }) => {
  const [inputUrl, setInputUrl] = useState(imageUrl);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogImages, setCatalogImages] = useState<CatalogImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<CatalogImage[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestino, setSelectedDestino] = useState<string>('all');
  const [destinos, setDestinos] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(24); // Infinite scroll - mostrar solo 24 iniciales
  const [selectingImage, setSelectingImage] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Cargar imágenes del catálogo
  const loadCatalogImages = async () => {
    setLoadingCatalog(true);
    try {
      const { data, error } = await analysisSupabase
        .from('content_management')
        .select('id, nombre, bucket, nombre_archivo, destinos')
        .eq('tipo_contenido', 'imagen')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (!error && data) {
        setCatalogImages(data);
        setFilteredImages(data);
        
        const allDestinos = new Set<string>();
        data.forEach(img => {
          if (img.destinos && Array.isArray(img.destinos)) {
            img.destinos.forEach((d: string) => allDestinos.add(d));
          }
        });
        setDestinos(Array.from(allDestinos).sort());
      }
    } catch (err) {
      console.error('Error loading catalog:', err);
      toast.error('Error al cargar catálogo');
    } finally {
      setLoadingCatalog(false);
    }
  };
  
  // Filtrar imágenes y resetear visibleCount
  useEffect(() => {
    let filtered = [...catalogImages];
    
    if (searchTerm) {
      filtered = filtered.filter(img => 
        img.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedDestino !== 'all') {
      filtered = filtered.filter(img => 
        img.destinos?.includes(selectedDestino)
      );
    }
    
    setFilteredImages(filtered);
    setVisibleCount(24); // Reset al filtrar
  }, [searchTerm, selectedDestino, catalogImages]);
  
  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    // Cargar más cuando esté a 200px del final
    if (scrollHeight - scrollTop - clientHeight < 200) {
      setVisibleCount(prev => Math.min(prev + 24, filteredImages.length));
    }
  }, [filteredImages.length]);
  
  // Generar URL solo cuando se selecciona la imagen
  const generateImageUrl = async (item: CatalogImage): Promise<string> => {
    const cacheKey = `img_${item.bucket}/${item.nombre_archivo}`;
    
    // 1. Cache en memoria global
    if (globalImageUrlCache[cacheKey]) {
      return globalImageUrlCache[cacheKey];
    }
    
    // 2. Cache en localStorage
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.url && parsed.timestamp && (Date.now() - parsed.timestamp) < 25 * 60 * 1000) {
          globalImageUrlCache[cacheKey] = parsed.url;
          return parsed.url;
        }
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }
    
    // 3. Generar nueva URL
    try {
      const response = await fetch('https://function-bun-dev-6d8e.up.railway.app/generar-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': '93fbcfc4-ccc9-4023-b820-86ef98f10122'
        },
        body: JSON.stringify({
          filename: item.nombre_archivo,
          bucket: item.bucket,
          expirationMinutes: 30
        })
      });
      
      const data = await response.json();
      const url = data[0]?.url || data.url;
      
      globalImageUrlCache[cacheKey] = url;
      localStorage.setItem(cacheKey, JSON.stringify({ url, timestamp: Date.now() }));
      
      return url;
    } catch (error) {
      console.error('Error generating image URL:', error);
      return '';
    }
  };
  
  const handleOpenCatalog = () => {
    setShowCatalog(true);
    setVisibleCount(24);
    if (catalogImages.length === 0) {
      loadCatalogImages();
    }
  };
  
  const handleSelectImage = async (item: CatalogImage) => {
    setSelectingImage(true);
    try {
      const url = await generateImageUrl(item);
      if (url) {
        setInputUrl(url);
        onImageSelect(url);
        setShowCatalog(false);
        toast.success('Imagen seleccionada');
      } else {
        toast.error('Error al obtener URL de imagen');
      }
    } finally {
      setSelectingImage(false);
    }
  };
  
  const visibleImages = filteredImages.slice(0, visibleCount);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onBlur={() => onImageSelect(inputUrl)}
          placeholder="URL de la imagen (ej: https://...)"
          className="flex-1 px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
        />
        <button
          onClick={handleOpenCatalog}
          className="px-4 py-2.5 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2"
        >
          <Image className="w-4 h-4" />
          Catálogo
        </button>
      </div>
      
      {inputUrl && (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <img 
            src={inputUrl} 
            alt="Header preview" 
            className="w-full h-32 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Imagen+no+encontrada';
            }}
          />
          <button
            onClick={() => {
              setInputUrl('');
              onImageSelect('');
            }}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Ingresa la URL de la imagen o selecciónala del catálogo.
      </p>
      
      <AnimatePresence>
        {showCatalog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]"
            onClick={() => setShowCatalog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Catálogo de Imágenes
                  </h3>
                  <button
                    onClick={() => setShowCatalog(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar imagen..."
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <select
                    value={selectedDestino}
                    onChange={(e) => setSelectedDestino(e.target.value)}
                    className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="all">Todos los destinos</option>
                    {destinos.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-6"
              >
                {loadingCatalog ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-500">Cargando imágenes...</span>
                  </div>
                ) : filteredImages.length === 0 ? (
                  <div className="text-center py-12">
                    <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No hay imágenes que coincidan</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {visibleImages.map((img) => (
                        <LazyImageThumbnail
                          key={img.id}
                          item={img}
                          onSelect={() => handleSelectImage(img)}
                          disabled={selectingImage}
                        />
                      ))}
                    </div>
                    {visibleCount < filteredImages.length && (
                      <div className="flex justify-center py-4">
                        <div className="text-sm text-gray-500">
                          Mostrando {visibleCount} de {filteredImages.length} - Desplázate para ver más
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {filteredImages.length} imágenes • Mostrando {Math.min(visibleCount, filteredImages.length)}
                </span>
                {selectingImage && (
                  <span className="text-sm text-blue-500 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    Obteniendo imagen...
                  </span>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Componente thumbnail con lazy loading real usando IntersectionObserver
interface LazyImageThumbnailProps {
  item: CatalogImage;
  onSelect: () => void;
  disabled?: boolean;
}

const LazyImageThumbnail: React.FC<LazyImageThumbnailProps> = ({ item, onSelect, disabled }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  
  // IntersectionObserver para lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Pre-cargar 100px antes de ser visible
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  // Cargar URL solo cuando es visible
  useEffect(() => {
    if (!isVisible) return;
    
    const cacheKey = `img_${item.bucket}/${item.nombre_archivo}`;
    
    // Verificar cache primero
    if (globalImageUrlCache[cacheKey]) {
      setUrl(globalImageUrlCache[cacheKey]);
      setLoading(false);
      return;
    }
    
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.url && parsed.timestamp && (Date.now() - parsed.timestamp) < 25 * 60 * 1000) {
          globalImageUrlCache[cacheKey] = parsed.url;
          setUrl(parsed.url);
          setLoading(false);
          return;
        }
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }
    
    // Generar URL
    fetch('https://function-bun-dev-6d8e.up.railway.app/generar-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': '93fbcfc4-ccc9-4023-b820-86ef98f10122'
      },
      body: JSON.stringify({
        filename: item.nombre_archivo,
        bucket: item.bucket,
        expirationMinutes: 30
      })
    })
      .then(res => res.json())
      .then(data => {
        const generatedUrl = data[0]?.url || data.url;
        globalImageUrlCache[cacheKey] = generatedUrl;
        localStorage.setItem(cacheKey, JSON.stringify({ url: generatedUrl, timestamp: Date.now() }));
        setUrl(generatedUrl);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isVisible, item]);
  
  return (
    <div
      ref={ref}
      onClick={disabled ? undefined : onSelect}
      className={`cursor-pointer group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all bg-gray-100 dark:bg-gray-800 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {!isVisible || loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : url ? (
        <>
          <img
            src={url}
            alt={item.nombre}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Check className="w-6 h-6 text-white" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-0.5 bg-gradient-to-t from-black/70 to-transparent">
            <p className="text-white text-[8px] truncate px-1">{item.nombre}</p>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <Image className="w-6 h-6" />
        </div>
      )}
    </div>
  );
};

// Componente de pestaña de mapeo de variables
interface VariableMapperTabProps {
  variables: number[];
  tableSchemas: TableSchema[];
  getVariableMapping: (variableNumber: number) => VariableMapping | undefined;
  onAddVariableMapping: (variableNumber: number, tableName: string, fieldName: string) => void;
  systemVariables: Array<{ type: string; label: string; icon: any; color: string }>;
  components: WhatsAppTemplate['components'];
  validationErrors?: {
    unmappedVariables?: number[];
    noAudiences?: boolean;
    emptyName?: boolean;
    invalidBodyChars?: boolean;
  };
  onValidationErrorsChange?: (errors: {
    unmappedVariables?: number[];
    noAudiences?: boolean;
    emptyName?: boolean;
    invalidBodyChars?: boolean;
  }) => void;
}

const VariableMapperTab: React.FC<VariableMapperTabProps> = ({
  variables,
  tableSchemas,
  getVariableMapping,
  onAddVariableMapping,
  systemVariables,
  components,
  validationErrors = {},
  onValidationErrorsChange,
}) => {
  const [selectedVar, setSelectedVar] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<'table' | 'system'>('table');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedField, setSelectedField] = useState<string>('');
  
  // Efecto para limpiar variables sin mapear cuando se mapean
  useEffect(() => {
    if (validationErrors?.unmappedVariables && validationErrors.unmappedVariables.length > 0 && onValidationErrorsChange) {
      // Verificar si alguna variable sin mapear ahora tiene mapeo
      const stillUnmapped = validationErrors.unmappedVariables.filter(varNum => !getVariableMapping(varNum));
      if (stillUnmapped.length !== validationErrors.unmappedVariables.length) {
        onValidationErrorsChange({
          ...validationErrors,
          unmappedVariables: stillUnmapped.length > 0 ? stillUnmapped : undefined,
        });
      }
    }
  }, [variables, getVariableMapping, validationErrors, onValidationErrorsChange]);

  const handleMapVariable = () => {
    if (!selectedVar) return;
    
    if (selectedSource === 'system') {
      // Mapear variable del sistema
      if (selectedField) {
        const systemVar = systemVariables.find(v => v.type === selectedField);
        if (systemVar) {
          onAddVariableMapping(selectedVar, 'system', selectedField);
          
          // Limpiar de variables sin mapear si estaba ahí
          if (onValidationErrorsChange && validationErrors?.unmappedVariables?.includes(selectedVar)) {
            const updatedUnmapped = validationErrors.unmappedVariables.filter(v => v !== selectedVar);
            onValidationErrorsChange({
              ...validationErrors,
              unmappedVariables: updatedUnmapped.length > 0 ? updatedUnmapped : undefined,
            });
          }
          
          setSelectedVar(null);
          setSelectedSource('table');
          setSelectedTable('');
          setSelectedField('');
          toast.success(`Variable {{${selectedVar}}} mapeada a ${systemVar.label}`);
        }
      }
    } else {
      // Mapear variable de tabla
      if (selectedTable && selectedField) {
        onAddVariableMapping(selectedVar, selectedTable, selectedField);
        
        // Limpiar de variables sin mapear si estaba ahí
        if (onValidationErrorsChange && validationErrors?.unmappedVariables?.includes(selectedVar)) {
          const updatedUnmapped = validationErrors.unmappedVariables.filter(v => v !== selectedVar);
          onValidationErrorsChange({
            ...validationErrors,
            unmappedVariables: updatedUnmapped.length > 0 ? updatedUnmapped : undefined,
          });
        }
        
        setSelectedVar(null);
        setSelectedSource('table');
        setSelectedTable('');
        setSelectedField('');
        toast.success(`Variable {{${selectedVar}}} mapeada correctamente`);
      }
    }
  };

  const selectedTableSchema = tableSchemas.find(s => s.table_name === selectedTable);
  const availableFields = selectedSource === 'system' 
    ? systemVariables.map(v => ({ name: v.type, display_name: v.label }))
    : selectedTableSchema?.fields || [];

  // Obtener texto de header y body
  const headerComponent = components.find(c => c.type === 'HEADER');
  const bodyComponent = components.find(c => c.type === 'BODY');
  const headerText = headerComponent?.text || '';
  const bodyText = bodyComponent?.text || '';

  return (
    <div className="space-y-6">

      {/* Preview del contenido para contexto */}
      {(headerText || bodyText) && (
        <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-3">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Contexto del Mensaje
            </span>
          </div>
          <div className="space-y-2">
            {headerText && (
              <div>
                <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 uppercase">Header:</span>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
                  {headerText}
                </p>
              </div>
            )}
            {bodyText && (
              <div>
                <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase">Body:</span>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {bodyText}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2 mb-4">
        <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Mapeo de Variables
        </h4>
      </div>

      {variables.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No hay variables en el contenido. Agrega variables usando el formato {'{{1}}'}, {'{{2}}'}, etc.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  Las variables no se pueden eliminar ya que forman parte del contenido del mensaje.
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Solo puedes modificar el mapeo de cada variable a campos de la base de datos.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
          {variables.map((varNum) => {
            const mapping = getVariableMapping(varNum);
            const isUnmapped = validationErrors?.unmappedVariables?.includes(varNum);
            return (
              <div
                key={varNum}
                className={`p-4 border rounded-xl transition-colors ${
                  isUnmapped
                    ? 'border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/5'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-lg font-mono text-sm font-medium ${
                      isUnmapped
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
                    }`}>
                      {`{{${varNum}}}`}
                    </span>
                    {mapping && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        → {mapping.display_name}
                      </span>
                    )}
                    {isUnmapped && !mapping && (
                      <span className="text-xs text-red-600 dark:text-red-400">
                        Sin mapear
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedVar(varNum);
                      // Si hay un mapping existente, pre-seleccionar los valores
                      if (mapping) {
                        if (mapping.table_name === 'system') {
                          setSelectedSource('system');
                          setSelectedField(mapping.field_name);
                        } else {
                          setSelectedSource('table');
                          setSelectedTable(mapping.table_name);
                          setSelectedField(mapping.field_name);
                        }
                      } else {
                        // Resetear si no hay mapping
                        setSelectedSource('table');
                        setSelectedTable('');
                        setSelectedField('');
                      }
                    }}
                    className={`text-xs ${
                      mapping
                        ? 'text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300'
                        : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
                    }`}
                  >
                    {mapping ? 'Editar' : 'Mapear'}
                  </button>
                </div>

                {mapping && (
                  <div className={`mt-2 p-3 rounded-lg ${
                    mapping.table_name === 'system' 
                      ? 'bg-purple-50 dark:bg-purple-900/10' 
                      : 'bg-green-50 dark:bg-green-900/10'
                  }`}>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {mapping.table_name === 'system' ? (
                        <>
                          <span className="font-medium">Variable Automática:</span> {mapping.display_name}
                        </>
                      ) : (
                        <>
                          <span className="font-medium">Tabla:</span> {mapping.table_name} |{' '}
                          <span className="font-medium">Campo:</span> {mapping.field_name}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {selectedVar === varNum && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-3">
                    {/* Selector de fuente: Tabla o Sistema */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                        Tipo de Fuente
                      </label>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedSource('table');
                            setSelectedTable('');
                            setSelectedField('');
                          }}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            selectedSource === 'table'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          📊 Datos de Tablas
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSource('system');
                            setSelectedTable('');
                            setSelectedField('');
                          }}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            selectedSource === 'system'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          ⚡ Variables Auto
                        </button>
                      </div>
                    </div>

                    {selectedSource === 'table' ? (
                      <>
                        <div>
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                            Seleccionar Tabla
                          </label>
                          <select
                            value={selectedTable}
                            onChange={(e) => {
                              setSelectedTable(e.target.value);
                              setSelectedField('');
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Selecciona una tabla...</option>
                            {tableSchemas.map((schema) => (
                              <option key={schema.table_name} value={schema.table_name}>
                                {schema.display_name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedTable && (
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                              Seleccionar Campo
                            </label>
                            <select
                              value={selectedField}
                              onChange={(e) => setSelectedField(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                              <option value="">Selecciona un campo...</option>
                              {availableFields.map((field) => (
                                <option key={field.name} value={field.name}>
                                  {field.display_name} ({field.type})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                          Seleccionar Variable Automática
                        </label>
                        <select
                          value={selectedField}
                          onChange={(e) => setSelectedField(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Selecciona una función...</option>
                          {systemVariables.map((sysVar) => {
                            const Icon = sysVar.icon;
                            return (
                              <option key={sysVar.type} value={sysVar.type}>
                                {sysVar.label}
                              </option>
                            );
                          })}
                        </select>
                        {selectedField && (
                          <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <p className="text-xs text-purple-700 dark:text-purple-400">
                              {selectedField === 'fecha_actual' && 'Muestra la fecha actual en formato "11 de abril"'}
                              {selectedField === 'hora_actual' && 'Muestra la hora actual en formato "4:30pm"'}
                              {selectedField === 'ejecutivo_nombre' && 'Muestra el nombre completo del ejecutivo logueado'}
                              {selectedField === 'fecha_personalizada' && 'Permite al usuario seleccionar una fecha personalizada'}
                              {selectedField === 'hora_personalizada' && 'Permite al usuario seleccionar una hora personalizada'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button
                        onClick={handleMapVariable}
                        disabled={selectedSource === 'table' ? (!selectedTable || !selectedField) : !selectedField}
                        className={`flex-1 px-3 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                          selectedSource === 'system' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {selectedVar && getVariableMapping(selectedVar) ? 'Actualizar Mapeo' : 'Guardar Mapeo'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedVar(null);
                          setSelectedSource('table');
                          setSelectedTable('');
                          setSelectedField('');
                        }}
                        className="px-3 py-2 text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
};

// Componente de modal de vista previa
const PreviewModal: React.FC<{ isOpen: boolean; onClose: () => void; template: WhatsAppTemplate | null }> = ({ isOpen, onClose, template }) => {
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && template) {
      setLoading(true);
      whatsappTemplatesService.generateExample(template)
        .then(setPreview)
        .catch((error) => {
          console.error('Error generando vista previa:', error);
          setPreview('Error al generar la vista previa');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, template]);

  if (!template) return null;

  // Obtener iconos según el tipo de tabla
  const getTableIcon = (tableName: string) => {
    switch (tableName) {
      case 'prospectos':
        return <User className="w-4 h-4" />;
      case 'destinos':
        return <MapPin className="w-4 h-4" />;
      case 'resorts':
        return <Building2 className="w-4 h-4" />;
      case 'system':
        return <Sparkles className="w-4 h-4" />;
      case 'llamadas_ventas':
        return <Phone className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  // Obtener color según el tipo de tabla
  const getTableColor = (tableName: string) => {
    switch (tableName) {
      case 'prospectos':
        return 'text-blue-600 dark:text-blue-400';
      case 'destinos':
        return 'text-green-600 dark:text-green-400';
      case 'resorts':
        return 'text-purple-600 dark:text-purple-400';
      case 'system':
        return 'text-orange-600 dark:text-orange-400';
      case 'llamadas_ventas':
        return 'text-pink-600 dark:text-pink-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Obtener nombre amigable de la tabla
  const getTableDisplayName = (tableName: string) => {
    switch (tableName) {
      case 'prospectos':
        return 'Prospectos';
      case 'destinos':
        return 'Destinos';
      case 'resorts':
        return 'Resorts';
      case 'system':
        return 'Sistema';
      case 'llamadas_ventas':
        return 'Discovery (Llamadas)';
      default:
        return tableName;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800">
              <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Vista Previa
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {template.name}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-8 py-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando datos reales...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Vista previa del mensaje */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">
                          Mensaje
                        </span>
                      </div>
                      <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                        {preview || 'No hay contenido para previsualizar'}
                      </p>
                    </div>

                    {/* Mapeo de variables */}
                    {template.variable_mappings && template.variable_mappings.length > 0 && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                            Mapeo de Variables
                          </span>
                        </div>
                        {/* Mostrar variables como tags compactos */}
                        <div className="flex flex-wrap gap-2">
                          {template.variable_mappings
                            .sort((a, b) => a.variable_number - b.variable_number)
                            .map((mapping) => (
                              <motion.span
                                key={mapping.variable_number}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: mapping.variable_number * 0.05 }}
                                className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
                                title={`{{${mapping.variable_number}}}: ${getTableDisplayName(mapping.table_name)} • ${mapping.field_name}${mapping.is_required ? ' (Requerido)' : ''}`}
                              >
                                {mapping.display_name}
                              </motion.span>
                            ))}
                        </div>
                      </div>
                    )}

                    {(!template.variable_mappings || template.variable_mappings.length === 0) && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                          <span className="text-sm text-yellow-700 dark:text-yellow-400">
                            Esta plantilla no tiene variables mapeadas
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 italic">
                  * La vista previa muestra datos reales del primer registro de cada tabla mapeada
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ============================================
// COMPONENTE DE PESTAÑA DE AUDIENCIA
// ============================================

interface AudienceSelectorTabProps {
  selectedAudienceIds: string[];
  onSelectionChange: (ids: string[]) => void;
  hasError?: boolean;
}

const AudienceSelectorTab: React.FC<AudienceSelectorTabProps> = ({
  selectedAudienceIds,
  onSelectionChange,
}) => {
  const [audiences, setAudiences] = useState<WhatsAppAudience[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Cargar audiencias al montar
  useEffect(() => {
    loadAudiences();
  }, []);

  const loadAudiences = async () => {
    try {
      setLoading(true);
      
      // Cargar todas las audiencias de la BD (incluyendo Global y las de etapa)
      const dynamicAudiences: WhatsAppAudience[] = [];
      try {
        const { data: savedAudiences, error } = await analysisSupabase
          .from('whatsapp_audiences')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (!error && savedAudiences && savedAudiences.length > 0) {
          // Recalcular conteo para cada audiencia guardada usando filtros de prospectos
          for (const aud of savedAudiences) {
            let query = analysisSupabase
              .from('prospectos')
              .select('id', { count: 'exact', head: true });
            
            // Filtro de etapa
            if (aud.etapa) {
              query = query.eq('etapa', aud.etapa);
            }
            
            // Filtro de estado civil
            if (aud.estado_civil) {
              query = query.eq('estado_civil', aud.estado_civil);
            }
            
            // Filtro de viaja_con
            if (aud.viaja_con && aud.viaja_con.length > 0) {
              query = query.in('viaja_con', aud.viaja_con);
            }
            
            // Filtro de destinos (overlaps con el array)
            if (aud.destinos && aud.destinos.length > 0) {
              query = query.overlaps('destino_preferencia', aud.destinos);
            }
            
            const { count } = await query;
            
            dynamicAudiences.push({
              ...aud,
              prospectos_count: count || 0,
            });
          }
        }
      } catch (dbError) {
        // Error silencioso - usar lista vacía como fallback
      }
      
      setAudiences(dynamicAudiences);
    } catch (error) {
      console.error('Error loading audiences:', error);
      toast.error('Error al cargar audiencias');
      
      // Fallback: mostrar al menos la audiencia Global
      setAudiences([{
        id: 'global',
        nombre: 'Global - Todos los Prospectos',
        descripcion: 'Incluye a todos los prospectos',
        etapa: null,
        destinos: [],
        estado_civil: null,
        viaja_con: [],
        prospectos_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleAudience = (id: string) => {
    if (selectedAudienceIds.includes(id)) {
      onSelectionChange(selectedAudienceIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedAudienceIds, id]);
    }
  };

  const totalProspectos = audiences
    .filter(a => selectedAudienceIds.includes(a.id))
    .reduce((sum, a) => sum + a.prospectos_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-1 h-5 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Seleccionar Audiencias
          </h4>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Crear Audiencia
        </motion.button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Selecciona las audiencias objetivo para esta plantilla. Puedes seleccionar múltiples audiencias.
      </p>

      {/* Indicador de alcance total */}
      {selectedAudienceIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  Alcance Estimado
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  {selectedAudienceIds.length} audiencia(s) seleccionada(s)
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {totalProspectos.toLocaleString()}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">prospectos</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Lista de audiencias */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : audiences.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No hay audiencias creadas</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-3 text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            Crear primera audiencia
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {audiences.map((audience) => {
            const isSelected = selectedAudienceIds.includes(audience.id);
            return (
              <motion.div
                key={audience.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => toggleAudience(audience.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {audience.nombre}
                      </h5>
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    {audience.descripcion && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {audience.descripcion}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {audience.prospectos_count}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">prospectos</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {audience.etapa && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-md">
                      {audience.etapa}
                    </span>
                  )}
                  {audience.destinos && audience.destinos.length > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" />
                      {audience.destinos.length === 1 ? audience.destinos[0] : `${audience.destinos.length} destinos`}
                    </span>
                  )}
                  {audience.viaja_con && audience.viaja_con.map((tipo) => (
                    <span 
                      key={tipo}
                      className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-md"
                    >
                      {tipo}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal de crear audiencia */}
      <CreateAudienceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          loadAudiences();
          setShowCreateModal(false);
        }}
      />
    </div>
  );
};

// ============================================
// MODAL DE CREACIÓN DE AUDIENCIA
// ============================================

interface CreateAudienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateAudienceModal: React.FC<CreateAudienceModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [formData, setFormData] = useState<CreateAudienceInput>({
    nombre: '',
    descripcion: '',
    etapa: null,
    destinos: [],
    estado_civil: null,
    viaja_con: [],
  });
  const [saving, setSaving] = useState(false);
  const [prospectCount, setProspectCount] = useState<number>(0);
  const [countingProspects, setCountingProspects] = useState(false);

  // Calcular prospectos en tiempo real desde la BD
  // TODOS los filtros se aplican sobre la tabla prospectos
  useEffect(() => {
    const countProspects = async () => {
      setCountingProspects(true);
      try {
        // Consultar prospectos con todos los filtros
        let query = analysisSupabase
          .from('prospectos')
          .select('id', { count: 'exact', head: true });
        
        // Filtro de etapa
        if (formData.etapa) {
          query = query.eq('etapa', formData.etapa);
        }
        
        // Filtro de estado civil
        if (formData.estado_civil) {
          query = query.eq('estado_civil', formData.estado_civil);
        }
        
        // Filtro de viaja_con (si hay seleccionados)
        if (formData.viaja_con && formData.viaja_con.length > 0) {
          query = query.in('viaja_con', formData.viaja_con);
        }
        
        // Filtro de destinos (overlaps con el array destino_preferencia)
        if (formData.destinos && formData.destinos.length > 0) {
          query = query.overlaps('destino_preferencia', formData.destinos);
        }
        
        const { count, error } = await query;
        
        if (error) {
          console.error('Error counting prospectos:', error);
          setProspectCount(0);
        } else {
          setProspectCount(count || 0);
        }
      } catch (err) {
        console.error('Error in countProspects:', err);
        setProspectCount(0);
      } finally {
        setCountingProspects(false);
      }
    };
    
    // Debounce para no hacer muchas consultas seguidas
    const timer = setTimeout(countProspects, 300);
    return () => clearTimeout(timer);
  }, [formData.etapa, formData.destinos, formData.estado_civil, formData.viaja_con]);

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la audiencia es requerido');
      return;
    }

    try {
      setSaving(true);
      
      // Guardar en Supabase
      // Nota: Si las columnas destinos y viaja_con no existen, se usarán solo los campos básicos
      const audienceData: any = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || null,
        etapa: formData.etapa || null,
        estado_civil: formData.estado_civil || null,
        prospectos_count: prospectCount,
        is_active: true,
      };
      
      // Agregar campos de arrays solo si existen en el esquema
      // Estos campos se agregarán después de ejecutar el script SQL:
      // docs/sql/add_destinos_viaja_con_to_audiences.sql
      if (formData.destinos && formData.destinos.length > 0) {
        audienceData.destinos = formData.destinos;
      }
      if (formData.viaja_con && formData.viaja_con.length > 0) {
        audienceData.viaja_con = formData.viaja_con;
      }
      
      const { data, error } = await analysisSupabase
        .from('whatsapp_audiences')
        .insert(audienceData)
        .select()
        .single();
      
      if (error) {
        console.error('Error guardando en BD:', error);
        
        // Si el error es por columnas faltantes, mostrar mensaje específico
        if (error.message?.includes('destinos') || error.message?.includes('viaja_con')) {
          toast.error(
            'Error: Las columnas destinos/viaja_con no existen. Por favor ejecuta el script SQL: docs/sql/add_destinos_viaja_con_to_audiences.sql',
            { duration: 8000 }
          );
        } else {
          toast.error('Error al guardar audiencia: ' + error.message);
        }
        return;
      }
      
      toast.success(`Audiencia "${formData.nombre}" guardada (${prospectCount} prospectos)`);
      
      // Resetear formulario
      setFormData({
        nombre: '',
        descripcion: '',
        etapa: null,
        destinos: [],
        estado_civil: null,
        viaja_con: [],
      });
      
      onCreated();
    } catch (error) {
      console.error('Error creating audience:', error);
      toast.error('Error al crear audiencia');
    } finally {
      setSaving(false);
    }
  };

  const toggleDestino = (destino: string) => {
    const current = formData.destinos || [];
    if (current.includes(destino)) {
      setFormData({ ...formData, destinos: current.filter(d => d !== destino) });
    } else {
      setFormData({ ...formData, destinos: [...current, destino] });
    }
  };

  const toggleViajaCon = (tipo: string) => {
    const current = formData.viaja_con || [];
    if (current.includes(tipo)) {
      setFormData({ ...formData, viaja_con: current.filter(t => t !== tipo) });
    } else {
      setFormData({ ...formData, viaja_con: [...current, tipo] });
    }
  };

  const getIconForViajaCon = (tipo: string) => {
    switch (tipo) {
      case 'Familia': return Users;
      case 'Pareja': return Heart;
      case 'Solo': return UserIcon;
      case 'Amigos': return UserPlus;
      case 'Hijos': return Baby;
      default: return Users;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-[60]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Crear Nueva Audiencia
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Define los criterios de segmentación
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Nombre de audiencia */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <FileText className="w-4 h-4" />
                  <span>Nombre de Audiencia</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Interesados Riviera Maya"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                />
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <label className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Descripción de Audiencia</span>
                  </div>
                  <span className={`${(formData.descripcion?.length || 0) > 300 ? 'text-red-500' : ''}`}>
                    {formData.descripcion?.length || 0}/300
                  </span>
                </label>
                <textarea
                  value={formData.descripcion || ''}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value.slice(0, 300) })}
                  placeholder="Describe el propósito de esta audiencia..."
                  maxLength={300}
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white resize-none"
                />
              </div>

              {/* Grid de criterios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Etapa */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <Tag className="w-4 h-4" />
                    <span>Etapa del Prospecto</span>
                  </label>
                  <select
                    value={formData.etapa || ''}
                    onChange={(e) => setFormData({ ...formData, etapa: e.target.value as ProspectoEtapa || null })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                  >
                    <option value="">No aplica</option>
                    {PROSPECTO_ETAPAS.map((etapa) => (
                      <option key={etapa.value} value={etapa.value}>
                        {etapa.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destinos (Multi-select) */}
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>Destinos Preferidos</span>
                    </div>
                    {(formData.destinos?.length || 0) > 0 && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {formData.destinos?.length} seleccionados
                      </span>
                    )}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DESTINOS.map((destino) => {
                      const isSelected = formData.destinos?.includes(destino.value);
                      return (
                        <button
                          key={destino.value}
                          type="button"
                          onClick={() => toggleDestino(destino.value)}
                          className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {destino.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Estado Civil */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <Heart className="w-4 h-4" />
                    <span>Estado Civil</span>
                  </label>
                  <select
                    value={formData.estado_civil || ''}
                    onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value as EstadoCivil || null })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                  >
                    <option value="">No aplica</option>
                    {ESTADOS_CIVILES.map((ec) => (
                      <option key={ec.value} value={ec.value}>
                        {ec.label}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Viaja Con (Multi-select) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Viaja Con
                    </h4>
                  </div>
                  {(formData.viaja_con?.length || 0) > 0 && (
                    <span className="text-xs text-purple-600 dark:text-purple-400">
                      {formData.viaja_con?.length} seleccionados
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {VIAJA_CON_OPTIONS.map((tipo) => {
                    const Icon = getIconForViajaCon(tipo.value);
                    const isSelected = formData.viaja_con?.includes(tipo.value);
                    return (
                      <button
                        key={tipo.value}
                        type="button"
                        onClick={() => toggleViajaCon(tipo.value)}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`} />
                        <span className={`text-xs font-medium ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-600 dark:text-gray-400'}`}>
                          {tipo.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contador de prospectos */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Prospectos que coinciden
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Basado en los criterios seleccionados
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <motion.p 
                      key={prospectCount}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl font-bold text-blue-600 dark:text-blue-400"
                    >
                      {prospectCount.toLocaleString()}
                    </motion.p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: saving ? 1 : 1.02 }}
                whileTap={{ scale: saving ? 1 : 0.98 }}
                onClick={handleSubmit}
                disabled={saving || !formData.nombre.trim()}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Crear Audiencia
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

// ============================================
// MODAL DE EDICIÓN LIMITADA
// ============================================

interface LimitedEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: WhatsAppTemplate | null;
  formData: {
    description: string;
    audience_ids: string[];
    variable_mappings: VariableMapping[];
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    description: string;
    audience_ids: string[];
    variable_mappings: VariableMapping[];
  }>>;
  onSave: () => void;
  saving: boolean;
  tableSchemas: TableSchema[];
  getAllVariables: () => number[];
  getVariableMapping: (variableNumber: number) => VariableMapping | undefined;
  onAddVariableMapping: (variableNumber: number, tableName: string, fieldName: string) => void;
  systemVariables: Array<{ type: string; label: string; icon: any; color: string }>;
  audiences: WhatsAppAudience[];
}

const LimitedEditModal: React.FC<LimitedEditModalProps> = ({
  isOpen,
  onClose,
  template,
  formData,
  setFormData,
  onSave,
  saving,
  tableSchemas,
  getAllVariables,
  getVariableMapping,
  onAddVariableMapping,
  systemVariables,
  audiences,
}) => {
  const [activeTab, setActiveTab] = useState<'description' | 'variables'>('description');
  const [originalFormData, setOriginalFormData] = useState<typeof formData | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Inicializar datos originales cuando se abre el modal
  // Solo inicializar una vez cuando se abre el modal, no cada vez que formData cambia
  useEffect(() => {
    if (isOpen && formData && !hasInitialized) {
      // Usar formData directamente ya que viene parseado correctamente desde handleLimitedEdit
      // Hacer deep copy para evitar referencias compartidas
      const initialData = {
        description: formData.description || '',
        audience_ids: [...(formData.audience_ids || [])],
        variable_mappings: JSON.parse(JSON.stringify(formData.variable_mappings || [])),
      };
      setOriginalFormData(initialData);
      setHasInitialized(true);
    }
  }, [isOpen, formData, hasInitialized]);

  // Resetear cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setOriginalFormData(null);
      setHasInitialized(false);
    }
  }, [isOpen]);

  // Obtener variables del template (solo lectura) - NO se pueden eliminar
  const variables = useMemo(() => {
    if (!template) return [];
    return template.components
      .flatMap(c => whatsappTemplatesService.extractVariables(c.text || ''))
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort((a, b) => a - b);
  }, [template]);

  // Detectar si hay cambios
  const hasChanges = useMemo(() => {
    if (!originalFormData) {
      return false;
    }
    
    // Comparar descripción
    if (formData.description !== originalFormData.description) {
      return true;
    }
    
    // Comparar audiencias (orden no importa)
    const originalAudiences = [...originalFormData.audience_ids].sort();
    const currentAudiences = [...formData.audience_ids].sort();
    if (JSON.stringify(originalAudiences) !== JSON.stringify(currentAudiences)) {
      return true;
    }
    
    // Comparar mapeos de variables
    const originalMappings = [...originalFormData.variable_mappings].sort((a, b) => a.variable_number - b.variable_number);
    const currentMappings = [...formData.variable_mappings].sort((a, b) => a.variable_number - b.variable_number);
    const originalMappingsStr = JSON.stringify(originalMappings);
    const currentMappingsStr = JSON.stringify(currentMappings);
    
    if (originalMappingsStr !== currentMappingsStr) {
      return true;
    }
    
    return false;
  }, [formData, originalFormData]);

  // Validar que todas las variables estén mapeadas
  const validationErrors = useMemo(() => {
    const unmappedVariables = variables.filter(varNum => {
      const mapping = formData.variable_mappings.find(m => m.variable_number === varNum);
      return !mapping;
    });
    
    return {
      unmappedVariables: unmappedVariables.length > 0 ? unmappedVariables : undefined,
    };
  }, [variables, formData.variable_mappings]);

  const canSave = hasChanges && (!validationErrors.unmappedVariables || validationErrors.unmappedVariables.length === 0);

  if (!template) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={onClose}
          >
            {/* Modal */}
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
                      Editar Plantilla
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {template.name} - Solo puedes editar descripción, audiencias y mapeo de variables
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
              </div>

              {/* Tabs */}
              <div className="px-8 pt-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex space-x-1">
                  {(['description', 'variables'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                        activeTab === tab
                          ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {tab === 'description' && 'Descripción'}
                      {tab === 'variables' && `Variables (${variables.length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {/* Descripción */}
                {activeTab === 'description' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span>Descripción de la plantilla</span>
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe el propósito de esta plantilla..."
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 min-h-[100px] resize-y"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Variables */}
                {activeTab === 'variables' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <VariableMapperTab
                      variables={variables}
                      tableSchemas={tableSchemas}
                      getVariableMapping={(varNum) => {
                        // Buscar en formData primero (mapeos editados)
                        const mapping = formData.variable_mappings.find(m => m.variable_number === varNum);
                        if (mapping) return mapping;
                        
                        // Luego buscar en template original (parsear si es necesario)
                        if (template) {
                          let templateMappings: VariableMapping[] = [];
                          if (template.variable_mappings) {
                            let rawMappings: any = template.variable_mappings;
                            
                            if (typeof rawMappings === 'string') {
                              try {
                                rawMappings = JSON.parse(rawMappings);
                              } catch (e) {
                                rawMappings = [];
                              }
                            }
                            
                            // Si tiene estructura con mappings y audience_ids (metadata)
                            if (rawMappings && typeof rawMappings === 'object' && !Array.isArray(rawMappings)) {
                              if (rawMappings.mappings && Array.isArray(rawMappings.mappings)) {
                                templateMappings = rawMappings.mappings;
                              }
                            } else if (Array.isArray(rawMappings)) {
                              templateMappings = rawMappings;
                            }
                          }
                          const templateMapping = templateMappings.find(m => m.variable_number === varNum);
                          if (templateMapping) return templateMapping;
                        }
                        
                        // Finalmente usar la función original
                        return getVariableMapping(varNum);
                      }}
                      onAddVariableMapping={(varNum, tableName, fieldName) => {
                        onAddVariableMapping(varNum, tableName, fieldName);
                        // Actualizar formData con el nuevo mapeo
                        const newMapping: VariableMapping = {
                          variable_number: varNum,
                          table_name: tableName,
                          field_name: fieldName,
                          display_name: tableName === 'system' 
                            ? systemVariables.find(v => v.type === fieldName)?.label || fieldName
                            : tableSchemas.find(s => s.table_name === tableName)?.fields.find(f => f.name === fieldName)?.display_name || fieldName,
                          is_required: false,
                          is_system_variable: tableName === 'system',
                        };
                        setFormData(prev => ({
                          ...prev,
                          variable_mappings: [...prev.variable_mappings.filter(m => m.variable_number !== varNum), newMapping],
                        }));
                      }}
                      systemVariables={systemVariables}
                      components={template.components}
                      validationErrors={validationErrors}
                      onValidationErrorsChange={(errors) => {
                        // Los errores se calculan automáticamente en el useMemo
                      }}
                    />
                  </motion.div>
                )}
              </div>

              {/* Footer con validación y detección de cambios */}
              <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                {/* Mensajes de error de validación */}
                {validationErrors.unmappedVariables && validationErrors.unmappedVariables.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          Variables sin mapear: {validationErrors.unmappedVariables.map(v => `{{${v}}}`).join(', ')}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Todas las variables deben tener un mapeo antes de guardar
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Indicador de cambios */}
                {!hasChanges && !validationErrors.unmappedVariables && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        No hay cambios para guardar
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <motion.button
                    whileHover={{ scale: saving ? 1 : 1.02 }}
                    whileTap={{ scale: saving ? 1 : 0.98 }}
                    onClick={onClose}
                    disabled={saving}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: saving || !canSave ? 1 : 1.02 }}
                    whileTap={{ scale: saving || !canSave ? 1 : 0.98 }}
                    onClick={onSave}
                    disabled={saving || !canSave}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Guardar Cambios</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default WhatsAppTemplatesManager;

