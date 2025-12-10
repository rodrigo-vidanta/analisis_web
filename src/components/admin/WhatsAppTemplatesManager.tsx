import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
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
  Power
} from 'lucide-react';
import toast from 'react-hot-toast';
import { whatsappTemplatesService } from '../../services/whatsappTemplatesService';
import type {
  WhatsAppTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  VariableMapping,
  TableSchema,
  TemplateClassification,
  ProspectoEtapa,
  DestinoNombre,
  CategoriaReactivacion,
  PreferenciaEntretenimiento,
} from '../../types/whatsappTemplates';
import {
  PROSPECTO_ETAPAS,
  DESTINOS,
  CATEGORIAS_REACTIVACION,
  PREFERENCIAS_ENTRETENIMIENTO,
  DISCOVERY_FIELDS,
  PROSPECTO_FIELDS,
} from '../../types/whatsappTemplates';

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
  
  // Estados para modal de edición/creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  
  // Estado inicial de clasificación
  const defaultClassification: TemplateClassification = {
    etapa: null,
    campana: null,
    destino: null,
    requiere_atencion_humana: false,
    categoria_reactivacion: null,
    preferencia_entretenimiento: null,
    para_familias: false,
    para_grupos: false,
    con_menores: false,
    luna_de_miel: false,
  };

  // Estados del formulario
  const [formData, setFormData] = useState<CreateTemplateInput>({
    name: '',
    language: 'es_MX',
    category: 'UTILITY',
    components: [{ type: 'BODY', text: '' }],
    description: '',
    variable_mappings: [],
    classification: { ...defaultClassification },
  });
  
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
  }, []);

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

    setFilteredTemplates(filtered);
  }, [templates, searchQuery, filterCategory, filterStatus, filterActive]);

  // Cargar plantillas
  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await whatsappTemplatesService.getAllTemplates();
      setTemplates(data);
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
      category: 'UTILITY',
      components: [{ type: 'BODY', text: '' }],
      description: '',
      variable_mappings: [],
      classification: { ...defaultClassification },
    });
    setIsModalOpen(true);
  };

  // Abrir modal para editar plantilla
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

  // Guardar plantilla (crear o actualizar)
  const handleSave = async () => {
    console.log('🔵 [handleSave] Iniciando guardado de plantilla...');
    console.log('🔵 [handleSave] formData:', JSON.stringify(formData, null, 2));
    console.log('🔵 [handleSave] editingTemplate:', editingTemplate);
    
    try {
      setSaving(true);
      console.log('🔵 [handleSave] Estado saving establecido a true');
      
      // Validar datos básicos
      if (!formData.name.trim()) {
        console.log('❌ [handleSave] Error: nombre vacío');
        toast.error('El nombre de la plantilla es requerido');
        setSaving(false);
        return;
      }

      // Validar formato del nombre (snake_case)
      const nameRegex = /^[a-z0-9_]+$/;
      if (!nameRegex.test(formData.name.trim())) {
        console.log('❌ [handleSave] Error: formato de nombre inválido');
        toast.error('El nombre debe estar en formato snake_case (solo letras minúsculas, números y guiones bajos)');
        setSaving(false);
        return;
      }

      if (!formData.components.some(c => c.text && c.text.trim())) {
        console.log('❌ [handleSave] Error: no hay componentes con texto');
        toast.error('La plantilla debe tener al menos un componente con texto');
        setSaving(false);
        return;
      }

      // Validar mapeos de variables (solo si hay variables)
      const allText = formData.components.map(c => c.text || '').join(' ');
      const hasVariables = /\{\{\d+\}\}/.test(allText);
      
      if (hasVariables) {
        // Filtrar variables del sistema (mapeadas a 'system') de la validación
        const systemMappings = (formData.variable_mappings || []).filter(
          m => m.table_name === 'system'
        );
        const dynamicMappings = (formData.variable_mappings || []).filter(
          m => m.table_name !== 'system'
        );
        
        // Solo validar variables dinámicas (no las del sistema)
        const allVars = getAllVariables();
        const systemVarNumbers = systemMappings.map(m => m.variable_number);
        const dynamicVariables = allVars.filter(v => !systemVarNumbers.includes(v));
        
        if (dynamicVariables.length > 0) {
          const validation = whatsappTemplatesService.validateVariableMappings(
            formData.components,
            dynamicMappings,
            systemVarNumbers // Pasar números de variables del sistema para excluirlos
          );

          if (!validation.valid) {
            console.log('❌ [handleSave] Error de validación:', validation.errors);
            toast.error(`Errores en variables: ${validation.errors.join(', ')}`);
            setSaving(false);
            return;
          }
        }
      }

      console.log('✅ [handleSave] Validaciones pasadas, guardando...');

      if (editingTemplate) {
        // Actualizar
        console.log('🔄 [handleSave] Actualizando plantilla:', editingTemplate.id);
        const result = await whatsappTemplatesService.updateTemplate(editingTemplate.id, formData);
        console.log('✅ [handleSave] Plantilla actualizada:', result);
        toast.success('Plantilla actualizada exitosamente');
      } else {
        // Crear
        console.log('➕ [handleSave] Creando nueva plantilla...');
        const result = await whatsappTemplatesService.createTemplate(formData);
        console.log('✅ [handleSave] Plantilla creada:', result);
        toast.success('Plantilla creada exitosamente');
      }

      console.log('✅ [handleSave] Guardado exitoso, cerrando modal...');
      setIsModalOpen(false);
      await loadTemplates();
      console.log('✅ [handleSave] Plantillas recargadas');
    } catch (error: any) {
      console.error('❌ [handleSave] Error completo:', error);
      console.error('❌ [handleSave] Error stack:', error.stack);
      console.error('❌ [handleSave] Error code:', error.code);
      console.error('❌ [handleSave] Error message:', error.message);
      
      // Mensajes de error más específicos
      let errorMessage = 'Error al guardar la plantilla';
      
      if (error.code === '23505') {
        errorMessage = 'Ya existe una plantilla con ese nombre';
      } else if (error.code === '42P01') {
        errorMessage = 'La tabla whatsapp_templates no existe. Por favor ejecuta el script SQL de creación.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      console.log('🔵 [handleSave] Finalizando, estableciendo saving a false');
      setSaving(false);
    }
  };

  // Eliminar plantilla
  const handleDelete = async (template: WhatsAppTemplate) => {
    if (!confirm(`¿Estás seguro de eliminar la plantilla "${template.name}"?`)) {
      return;
    }

    try {
      await whatsappTemplatesService.deleteTemplate(template.id);
      toast.success('Plantilla eliminada exitosamente');
      loadTemplates();
    } catch (error: any) {
      console.error('Error eliminando plantilla:', error);
      toast.error(error.message || 'Error al eliminar la plantilla');
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
      console.log('🔄 Iniciando sincronización global desde uChat...');
      
      const result = await whatsappTemplatesService.syncTemplatesFromUChat();
      
      console.log('✅ Sincronización global completada:', result);
      
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
      console.log(`🔄 Sincronizando plantilla individual: ${templateId}`);
      
      const result = await whatsappTemplatesService.syncSingleTemplateFromUChat(templateId);
      
      console.log('✅ Sincronización individual completada:', result);
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
    setFormData({
      ...formData,
      components: [
        ...formData.components,
        type === 'BUTTONS' 
          ? { type: 'BUTTONS', buttons: [] }
          : { type, text: '' }
      ],
    });
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

  return (
    <div className="space-y-6">
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

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white"
            >
              <option value="all">Todas las categorías</option>
              <option value="MARKETING">Marketing</option>
              <option value="UTILITY">Utilidad</option>
              <option value="AUTHENTICATION">Autenticación</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white"
            >
              <option value="all">Todos los estados</option>
              <option value="APPROVED">Aprobado</option>
              <option value="PENDING">Pendiente</option>
              <option value="REJECTED">Rechazado</option>
            </select>

            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white"
            >
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </div>
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

      {/* Grid de plantillas - Diseño moderno */}
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredTemplates.map((template, index) => (
              <TemplateGridCard
                key={template.id}
                template={template}
                index={index}
                onEdit={() => handleEdit(template)}
                onDelete={() => handleDelete(template)}
                onToggleActive={() => handleToggleActive(template)}
                onViewPreview={() => {
                  setSelectedTemplate(template);
                  setShowPreview(true);
                }}
                onSync={handleSyncSingle}
                syncingTemplateId={syncingTemplateId}
                getStatusColor={getStatusColor}
                getCategoryColor={getCategoryColor}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal de creación/edición */}
      <TemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
      />

      {/* Modal de vista previa */}
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        template={selectedTemplate}
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
  getCategoryColor: (category: string) => string;
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
  getCategoryColor,
}) => {
  const bodyComponent = template.components.find(c => c.type === 'BODY');
  const previewText = bodyComponent?.text || 'Sin contenido';
  const maxLength = 80;
  const truncated = previewText.length > maxLength 
    ? previewText.substring(0, maxLength) + '...' 
    : previewText;

  // Contar variables
  const variableCount = template.variable_mappings?.length || 0;

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
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        template.status === 'APPROVED' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
        template.status === 'PENDING' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
        'bg-gradient-to-r from-red-400 to-rose-500'
      }`} />

      {/* Contenido principal */}
      <div className="p-4">
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
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'variables' | 'classification' | 'preview'>('content');
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
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
                  {(['content', 'variables', 'classification', 'preview'] as const).map((tab) => (
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
                      {tab === 'classification' && 'Clasificación'}
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
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="ej: bienvenida_cliente"
                            className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                          />
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
                            <option value="es_ES">Español (España)</option>
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
                          <button
                            onClick={() => onAddComponent('HEADER')}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            + Header
                          </button>
                          <button
                            onClick={() => onAddComponent('BODY')}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            + Body
                          </button>
                          <button
                            onClick={() => onAddComponent('FOOTER')}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            + Footer
                          </button>
                          <button
                            onClick={() => onAddComponent('BUTTONS')}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            + Buttons
                          </button>
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
                  />
                )}

                {activeTab === 'classification' && (
                  <TemplateClassificationTab
                    classification={formData.classification || {
                      etapa: null,
                      campana: null,
                      destino: null,
                      requiere_atencion_humana: false,
                      categoria_reactivacion: null,
                      preferencia_entretenimiento: null,
                      para_familias: false,
                      para_grupos: false,
                      con_menores: false,
                      luna_de_miel: false,
                    }}
                    onChange={(classification) => setFormData({ ...formData, classification })}
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
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
          {component.type}
        </span>
        <button
          onClick={onRemove}
          className="text-red-500 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3">
        {/* Editor simple con textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={component.text || ''}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder={`Escribe el contenido del ${component.type.toLowerCase()}...`}
            className="min-h-[120px] w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white resize-y"
            style={{ 
              minHeight: component.type === 'BODY' ? '150px' : '80px'
            }}
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

        {/* Vista previa visual con tags mapeadas */}
        {component.text && (
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
      </div>
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
}

const VariableMapperTab: React.FC<VariableMapperTabProps> = ({
  variables,
  tableSchemas,
  getVariableMapping,
  onAddVariableMapping,
  systemVariables,
}) => {
  const [selectedVar, setSelectedVar] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<'table' | 'system'>('table');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedField, setSelectedField] = useState<string>('');

  const handleMapVariable = () => {
    if (!selectedVar) return;
    
    if (selectedSource === 'system') {
      // Mapear variable del sistema
      if (selectedField) {
        const systemVar = systemVariables.find(v => v.type === selectedField);
        if (systemVar) {
          onAddVariableMapping(selectedVar, 'system', selectedField);
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

  return (
    <div className="space-y-6">
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
        <div className="space-y-4">
          {variables.map((varNum) => {
            const mapping = getVariableMapping(varNum);
            return (
              <div
                key={varNum}
                className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-lg font-mono text-sm font-medium">
                      {`{{${varNum}}}`}
                    </span>
                    {mapping && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        → {mapping.display_name}
                      </span>
                    )}
                  </div>
                  {!mapping && (
                    <button
                      onClick={() => setSelectedVar(varNum)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      Mapear
                    </button>
                  )}
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

                {selectedVar === varNum && !mapping && (
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
                        Guardar Mapeo
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
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800">
              <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Vista Previa
                  </h3>
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
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {preview || 'No hay contenido para previsualizar'}
                    </p>
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
// COMPONENTE DE PESTAÑA DE CLASIFICACIÓN
// ============================================

interface TemplateClassificationTabProps {
  classification: TemplateClassification;
  onChange: (classification: TemplateClassification) => void;
}

const TemplateClassificationTab: React.FC<TemplateClassificationTabProps> = ({
  classification,
  onChange,
}) => {
  const updateField = <K extends keyof TemplateClassification>(
    field: K,
    value: TemplateClassification[K]
  ) => {
    onChange({ ...classification, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-1 h-5 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Clasificación de Plantilla
        </h4>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Define los criterios de segmentación para esta plantilla. Estos valores se envían al webhook para filtrar prospectos.
      </p>

      {/* Grid de clasificación */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Etapa del prospecto */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
            <Tag className="w-4 h-4" />
            <span>Etapa del Prospecto</span>
          </label>
          <select
            value={classification.etapa || ''}
            onChange={(e) => updateField('etapa', e.target.value as ProspectoEtapa || null)}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
          >
            <option value="">Sin especificar</option>
            {PROSPECTO_ETAPAS.map((etapa) => (
              <option key={etapa.value} value={etapa.value}>
                {etapa.label}
              </option>
            ))}
          </select>
        </div>

        {/* Campaña */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
            <FileText className="w-4 h-4" />
            <span>Campaña</span>
          </label>
          <input
            type="text"
            value={classification.campana || ''}
            onChange={(e) => updateField('campana', e.target.value || null)}
            placeholder="Ej: Black Friday 2025"
            className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
          />
        </div>

        {/* Destino */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
            <Globe className="w-4 h-4" />
            <span>Destino</span>
          </label>
          <select
            value={classification.destino || ''}
            onChange={(e) => updateField('destino', e.target.value as DestinoNombre || null)}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
          >
            <option value="">Sin especificar</option>
            {DESTINOS.map((destino) => (
              <option key={destino.value} value={destino.value}>
                {destino.label}
              </option>
            ))}
          </select>
        </div>

        {/* Categoría de reactivación */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
            <MessageSquare className="w-4 h-4" />
            <span>Categoría de Reactivación</span>
          </label>
          <select
            value={classification.categoria_reactivacion || ''}
            onChange={(e) => updateField('categoria_reactivacion', e.target.value as CategoriaReactivacion || null)}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
          >
            <option value="">Sin especificar</option>
            {CATEGORIAS_REACTIVACION.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {classification.categoria_reactivacion && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              {CATEGORIAS_REACTIVACION.find(c => c.value === classification.categoria_reactivacion)?.description}
            </p>
          )}
        </div>

        {/* Preferencia de entretenimiento */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
            <Sparkles className="w-4 h-4" />
            <span>Preferencia de Entretenimiento</span>
          </label>
          <select
            value={classification.preferencia_entretenimiento || ''}
            onChange={(e) => updateField('preferencia_entretenimiento', e.target.value as PreferenciaEntretenimiento || null)}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
          >
            <option value="">Sin especificar</option>
            {PREFERENCIAS_ENTRETENIMIENTO.map((pref) => (
              <option key={pref.value} value={pref.value}>
                {pref.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sección de Flags de Audiencia */}
      <div className="mt-8">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Audiencia Objetivo
          </h4>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Para Familias */}
          <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-500 ${
            classification.para_familias 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
          }`}>
            <input
              type="checkbox"
              checked={classification.para_familias}
              onChange={(e) => updateField('para_familias', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded-lg border-2 mr-3 flex items-center justify-center transition-all ${
              classification.para_familias
                ? 'bg-blue-500 border-blue-500'
                : 'border-gray-300 dark:border-gray-500'
            }`}>
              {classification.para_familias && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Familias</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">👨‍👩‍👧‍👦</p>
            </div>
          </label>

          {/* Para Grupos */}
          <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:border-purple-400 dark:hover:border-purple-500 ${
            classification.para_grupos 
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30' 
              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
          }`}>
            <input
              type="checkbox"
              checked={classification.para_grupos}
              onChange={(e) => updateField('para_grupos', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded-lg border-2 mr-3 flex items-center justify-center transition-all ${
              classification.para_grupos
                ? 'bg-purple-500 border-purple-500'
                : 'border-gray-300 dark:border-gray-500'
            }`}>
              {classification.para_grupos && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Grupos</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">👥</p>
            </div>
          </label>

          {/* Con Menores */}
          <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:border-green-400 dark:hover:border-green-500 ${
            classification.con_menores 
              ? 'border-green-500 bg-green-50 dark:bg-green-900/30' 
              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
          }`}>
            <input
              type="checkbox"
              checked={classification.con_menores}
              onChange={(e) => updateField('con_menores', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded-lg border-2 mr-3 flex items-center justify-center transition-all ${
              classification.con_menores
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300 dark:border-gray-500'
            }`}>
              {classification.con_menores && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Menores</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">👶</p>
            </div>
          </label>

          {/* Luna de Miel */}
          <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:border-pink-400 dark:hover:border-pink-500 ${
            classification.luna_de_miel 
              ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/30' 
              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
          }`}>
            <input
              type="checkbox"
              checked={classification.luna_de_miel}
              onChange={(e) => updateField('luna_de_miel', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded-lg border-2 mr-3 flex items-center justify-center transition-all ${
              classification.luna_de_miel
                ? 'bg-pink-500 border-pink-500'
                : 'border-gray-300 dark:border-gray-500'
            }`}>
              {classification.luna_de_miel && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Luna de Miel</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">💑</p>
            </div>
          </label>
        </div>
      </div>

      {/* Toggle Requiere Atención Humana */}
      <div className="mt-8">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-1 h-5 bg-gradient-to-b from-red-500 to-orange-500 rounded-full"></div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Configuración de Seguimiento
          </h4>
        </div>

        <label className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-all duration-200 group">
          <div className="flex items-center space-x-3">
            <div className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
              classification.requiere_atencion_humana ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-700'
            }`}>
              <motion.div
                animate={{ x: classification.requiere_atencion_humana ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
              />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Requiere Atención Humana
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Activar flag de atención después de enviar esta plantilla
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={classification.requiere_atencion_humana}
            onChange={(e) => updateField('requiere_atencion_humana', e.target.checked)}
            className="sr-only"
          />
          <AlertCircle className={`w-5 h-5 transition-colors ${
            classification.requiere_atencion_humana ? 'text-red-500' : 'text-gray-400'
          }`} />
        </label>
      </div>

      {/* Información adicional */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Información
        </h5>
        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
          <li>Estos valores se envían al webhook en un array separado llamado <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">classification</code></li>
          <li>Todos los campos son opcionales y aceptan valores null</li>
          <li>El webhook puede usar estos valores para filtrar prospectos objetivo</li>
          <li>Los flags de audiencia ayudan a segmentar mensajes específicos</li>
        </ul>
      </div>
    </div>
  );
};

export default WhatsAppTemplatesManager;

