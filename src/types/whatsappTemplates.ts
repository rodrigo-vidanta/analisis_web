/**
 * ============================================
 * TIPOS PARA PLANTILLAS WHATSAPP
 * ============================================
 */

// ============================================
// ENUMS DE CLASIFICACIÓN
// ============================================

/**
 * Etapas del prospecto - sincronizado con valores exactos de BD
 * IMPORTANTE: Los valores deben coincidir EXACTAMENTE con la tabla prospectos.etapa
 * 
 * Para agregar/quitar etapas, solo modifica este array.
 * Los filtros de audiencias y campañas se adaptan automáticamente.
 */
export type ProspectoEtapa = 
  | 'Es miembro'
  | 'Activo PQNC'
  | 'Validando membresia'  // Sin acento - así está en BD
  | 'Primer contacto'
  | 'En seguimiento'
  | 'Interesado'
  | 'Atendió llamada'
  | 'Con ejecutivo'
  | 'Certificado adquirido';

export const PROSPECTO_ETAPAS: { value: ProspectoEtapa; label: string; color?: string }[] = [
  // Etapas del Kanban (en orden del flujo de ventas)
  { value: 'Es miembro', label: 'Es miembro', color: 'emerald' },
  { value: 'Activo PQNC', label: 'Activo PQNC', color: 'teal' },
  { value: 'Validando membresia', label: 'Validando membresía', color: 'blue' },
  { value: 'Primer contacto', label: 'Primer contacto', color: 'sky' },
  { value: 'En seguimiento', label: 'En seguimiento', color: 'yellow' },
  { value: 'Interesado', label: 'Interesado', color: 'green' },
  { value: 'Atendió llamada', label: 'Atendió llamada', color: 'purple' },
  { value: 'Con ejecutivo', label: 'Con ejecutivo', color: 'indigo' },
  { value: 'Certificado adquirido', label: 'Certificado adquirido', color: 'rose' },
];

/**
 * Destinos disponibles - valores exactos de BD prospectos.destino_preferencia
 */
export type DestinoNombre = 
  | 'Nuevo Vallarta'
  | 'Riviera Maya'
  | 'Los Cabos'
  | 'Acapulco'
  | 'Puerto Peñasco'
  | 'Mazatlán'
  | 'Puerto Vallarta';

export const DESTINOS: { value: DestinoNombre; label: string }[] = [
  { value: 'Nuevo Vallarta', label: 'Nuevo Vallarta' },
  { value: 'Riviera Maya', label: 'Riviera Maya' },
  { value: 'Los Cabos', label: 'Los Cabos' },
  { value: 'Acapulco', label: 'Acapulco' },
  { value: 'Puerto Peñasco', label: 'Puerto Peñasco' },
  { value: 'Mazatlán', label: 'Mazatlán' },
  { value: 'Puerto Vallarta', label: 'Puerto Vallarta' },
];

/**
 * Opciones de "Viaja Con" - valores exactos de BD prospectos.viaja_con
 */
export type ViajaConTipo = 'Familia' | 'Pareja' | 'Amigos' | 'Solo' | 'Hijos';

export const VIAJA_CON_OPTIONS: { value: ViajaConTipo; label: string }[] = [
  { value: 'Familia', label: 'Familia' },
  { value: 'Pareja', label: 'Pareja' },
  { value: 'Amigos', label: 'Amigos' },
  { value: 'Solo', label: 'Solo' },
  { value: 'Hijos', label: 'Hijos' },
];

/**
 * Categorías de reactivación de conversación
 */
export type CategoriaReactivacion = 
  | 'seguimiento_post_llamada'
  | 'recordatorio_reserva'
  | 'oferta_especial'
  | 'reenganche_interes'
  | 'actualizacion_info';

export const CATEGORIAS_REACTIVACION: { value: CategoriaReactivacion; label: string; description: string }[] = [
  { 
    value: 'seguimiento_post_llamada', 
    label: 'Seguimiento Post-Llamada',
    description: 'Para seguimiento después de una llamada perdida o sin respuesta'
  },
  { 
    value: 'recordatorio_reserva', 
    label: 'Recordatorio de Reserva',
    description: 'Para recordar reservaciones pendientes o confirmar fechas'
  },
  { 
    value: 'oferta_especial', 
    label: 'Oferta Especial',
    description: 'Para enviar promociones y descuentos especiales'
  },
  { 
    value: 'reenganche_interes', 
    label: 'Reenganche de Interés',
    description: 'Para prospectos que mostraron interés pero no concretaron'
  },
  { 
    value: 'actualizacion_info', 
    label: 'Actualización de Información',
    description: 'Para solicitar actualización de datos o preferencias'
  },
];

/**
 * Preferencias de entretenimiento
 */
export type PreferenciaEntretenimiento = 
  | 'entretenimiento'
  | 'descanso'
  | 'mixto';

export const PREFERENCIAS_ENTRETENIMIENTO: { value: PreferenciaEntretenimiento; label: string }[] = [
  { value: 'entretenimiento', label: 'Entretenimiento' },
  { value: 'descanso', label: 'Descanso' },
  { value: 'mixto', label: 'Mixto' },
];

/**
 * Tipo de audiencia objetivo
 */
export type TipoAudiencia = 
  | 'familia'
  | 'pareja'
  | 'solo'
  | 'amigos'
  | 'grupo';

export const TIPOS_AUDIENCIA: { value: TipoAudiencia; label: string; icon: string }[] = [
  { value: 'familia', label: 'Familia', icon: 'Users' },
  { value: 'pareja', label: 'Pareja', icon: 'Heart' },
  { value: 'solo', label: 'Solo', icon: 'User' },
  { value: 'amigos', label: 'Amigos', icon: 'UserPlus' },
  { value: 'grupo', label: 'Grupo', icon: 'Users2' },
];

/**
 * Estados civiles disponibles - valores exactos de BD prospectos.estado_civil
 */
export type EstadoCivil = 
  | 'Soltero'
  | 'Casado'
  | 'Unión Libre'
  | 'Divorciado'
  | 'Viudo';

export const ESTADOS_CIVILES: { value: EstadoCivil; label: string }[] = [
  { value: 'Soltero', label: 'Soltero(a)' },
  { value: 'Casado', label: 'Casado(a)' },
  { value: 'Unión Libre', label: 'Unión Libre' },
  { value: 'Divorciado', label: 'Divorciado(a)' },
  { value: 'Viudo', label: 'Viudo(a)' },
];

/**
 * Audiencia para plantillas WhatsApp
 * 
 * ⚠️ MIGRACIÓN ETAPAS (2026-01-27):
 * - etapa/etapas (string) → DEPRECADO - mantener para compatibilidad
 * - etapa_id/etapa_ids (UUID FK) → USAR - nueva arquitectura
 */
export interface WhatsAppAudience {
  id: string;
  nombre: string;
  descripcion?: string | null;
  
  // ⚠️ DEPRECADO - Campos legacy (mantener temporalmente)
  etapa?: ProspectoEtapa | null; // Legacy: etapa única string
  etapas?: ProspectoEtapa[]; // Legacy: múltiples etapas string
  
  // ✅ NUEVO - Arquitectura con FK a tabla etapas
  etapa_id?: string | null; // FK a etapas.id (singular)
  etapa_ids?: string[] | null; // Array de FKs a etapas.id (múltiple)
  
  destinos?: string[]; // Array de destinos (prospectos.destino_preferencia)
  estado_civil?: EstadoCivil | null;
  viaja_con?: string[]; // Array de tipos (prospectos.viaja_con)
  dias_sin_contacto?: number | null; // Filtrar prospectos sin actividad en X días (de mensajes_whatsapp.fecha_hora)
  tiene_email?: boolean | null; // true = con email, false = sin email, null = todos
  con_menores?: boolean | null; // true = cantidad_menores > 0, false = cantidad_menores = 0 o null, null = todos
  etiquetas?: string[]; // Array de IDs de etiquetas (whatsapp_labels_preset)
  prospectos_count: number;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Presets de días sin contacto
 */
export const DIAS_SIN_CONTACTO_PRESETS = [
  { value: 7, label: '7 días', description: '1 semana' },
  { value: 14, label: '14 días', description: '2 semanas' },
  { value: 30, label: '30 días', description: '1 mes' },
  { value: 60, label: '60 días', description: '2 meses' },
  { value: 90, label: '90 días', description: '3 meses' },
  { value: 180, label: '180 días', description: '6 meses' },
];

/**
 * Input para crear/editar audiencia
 * 
 * ⚠️ MIGRACIÓN ETAPAS (2026-01-27):
 * - Usar etapa_ids (UUID[]) en lugar de etapas (string[])
 */
export interface CreateAudienceInput {
  nombre: string;
  descripcion?: string;
  
  // ⚠️ DEPRECADO - Mantener temporalmente para compatibilidad
  etapas?: ProspectoEtapa[]; // Legacy: múltiples etapas string
  
  // ✅ NUEVO - Usar este campo
  etapa_ids?: string[]; // Array de UUIDs (FK a etapas.id)
  
  destinos?: string[]; // Múltiples destinos seleccionables
  estado_civil?: EstadoCivil | null;
  viaja_con?: string[]; // Múltiples opciones de "viaja con"
  dias_sin_contacto?: number | null; // Días sin actividad (de mensajes_whatsapp.fecha_hora)
  tiene_email?: boolean | null; // true = con email, false = sin email, null = todos
  con_menores?: boolean | null; // true = con menores (cantidad_menores > 0), false = sin menores, null = todos
  etiquetas?: string[]; // IDs de etiquetas del sistema (whatsapp_labels_preset)
}

/**
 * Clasificación completa de plantilla para webhook
 * NOTA: Ahora las audiencias se seleccionan desde la tabla whatsapp_audiences
 */
export interface TemplateClassification {
  // IDs de audiencias seleccionadas (nueva forma de segmentación)
  audience_ids: string[];
}

/**
 * Variables de discovery disponibles desde llamadas_ventas
 */
export interface DiscoveryVariables {
  // Datos directos de llamadas_ventas
  composicion_familiar_numero: number | null;
  destino_preferido: string | null;
  preferencia_vacaciones: string | null;
  numero_noches: number | null;
  mes_preferencia: string | null;
  estado_civil: string | null;
  edad: number | null;
  propuesta_economica_ofrecida: string | null;
  habitacion_ofertada: string | null;
  resort_ofertado: string | null;
  resumen_llamada: string | null;
  
  // Datos anidados (datos_proceso)
  numero_personas: number | null;
  duracion_estancia_noches: number | null;
  discovery_completo: boolean;
  metodo_pago_discutido: string | null;
}

/**
 * Campos mapeables de discovery para variables de plantilla
 */
export const DISCOVERY_FIELDS: { name: string; display_name: string; type: string }[] = [
  { name: 'composicion_familiar_numero', display_name: 'Composición Familiar (Número)', type: 'number' },
  { name: 'destino_preferido', display_name: 'Destino Preferido', type: 'string' },
  { name: 'preferencia_vacaciones', display_name: 'Preferencia de Vacaciones', type: 'string' },
  { name: 'numero_noches', display_name: 'Número de Noches', type: 'number' },
  { name: 'mes_preferencia', display_name: 'Mes de Preferencia', type: 'string' },
  { name: 'estado_civil', display_name: 'Estado Civil', type: 'string' },
  { name: 'edad', display_name: 'Edad', type: 'number' },
  { name: 'propuesta_economica_ofrecida', display_name: 'Propuesta Económica', type: 'string' },
  { name: 'habitacion_ofertada', display_name: 'Habitación Ofertada', type: 'string' },
  { name: 'resort_ofertado', display_name: 'Resort Ofertado', type: 'string' },
  { name: 'resumen_llamada', display_name: 'Resumen de Llamada', type: 'string' },
  { name: 'numero_personas', display_name: 'Número de Personas (Discovery)', type: 'number' },
  { name: 'duracion_estancia_noches', display_name: 'Duración de Estancia (Noches)', type: 'number' },
  { name: 'discovery_completo', display_name: 'Discovery Completo', type: 'boolean' },
  { name: 'metodo_pago_discutido', display_name: 'Método de Pago Discutido', type: 'string' },
];

/**
 * Campos del prospecto mapeables
 */
export const PROSPECTO_FIELDS: { name: string; display_name: string; type: string }[] = [
  { name: 'nombre', display_name: 'Nombre del Prospecto', type: 'string' },
  { name: 'whatsapp', display_name: 'Número WhatsApp', type: 'string' },
  { name: 'email', display_name: 'Email', type: 'string' },
  { name: 'etapa', display_name: 'Etapa Actual', type: 'string' },
  { name: 'origen', display_name: 'Origen del Prospecto', type: 'string' },
  { name: 'campana', display_name: 'Campaña', type: 'string' },
  { name: 'pais', display_name: 'País', type: 'string' },
  { name: 'estado', display_name: 'Estado', type: 'string' },
  { name: 'ciudad', display_name: 'Ciudad', type: 'string' },
];

// ============================================
// INTERFACES PRINCIPALES
// ============================================

export interface VariableMapping {
  variable_number: number; // {{1}}, {{2}}, etc.
  table_name: string; // 'prospectos', 'destinos', 'resorts', 'system', etc.
  field_name: string; // 'nombre', 'whatsapp', 'fecha_actual', 'ejecutivo_nombre', etc.
  display_name: string; // Nombre amigable para mostrar
  is_required: boolean;
  is_system_variable?: boolean; // Si es variable del sistema (fecha, hora, ejecutivo)
  is_selectable?: boolean; // Si es seleccionable (destinos, resorts)
  custom_value?: string; // Valor personalizado para fecha/hora
  selected_destino_id?: string; // ID del destino seleccionado (para resorts)
  selected_resort_id?: string; // ID del resort seleccionado
}

export interface WhatsAppTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  text?: string;
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  example?: {
    body_text?: string[][];
    header_text?: string[];
    header_handle?: string[];
  };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  components: WhatsAppTemplateComponent[];
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  rejection_reason?: string | null;
  uchat_synced: boolean;
  last_synced_at?: string | null;
  is_active: boolean;
  is_deleted?: boolean; // Campo para soft delete
  description?: string | null;
  created_by?: string | null;
  suggested_by?: string | null; // ID del usuario que sugirió esta plantilla
  tags?: string[] | null; // Etiquetas de clasificación (máx 18 chars, solo a-z0-9_)
  created_at: string;
  updated_at: string;
  variable_mappings?: VariableMapping[];
}

export interface CreateTemplateInput {
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  components: WhatsAppTemplateComponent[];
  description?: string;
  tags?: string[]; // Etiquetas de clasificación
  variable_mappings?: VariableMapping[];
  // Clasificación de la plantilla (se envía al webhook en array separado)
  classification?: TemplateClassification;
  // ID del usuario que sugirió esta plantilla (si viene de una sugerencia)
  suggested_by?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  language?: string;
  category?: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  components?: WhatsAppTemplateComponent[];
  status?: 'APPROVED' | 'PENDING' | 'REJECTED';
  rejection_reason?: string | null;
  is_active?: boolean;
  description?: string;
  tags?: string[]; // Etiquetas de clasificación
  variable_mappings?: VariableMapping[];
  // Clasificación de la plantilla
  classification?: TemplateClassification;
}

export interface TableField {
  name: string;
  type: string;
  display_name: string;
}

export interface TableSchema {
  table_name: string;
  display_name: string;
  fields: TableField[];
}

// ============================================
// TIPOS PARA CAMPAÑAS
// ============================================

/**
 * Estados posibles de una campaña
 */
export type CampaignStatus = 
  | 'draft'      // Borrador, aún no programada
  | 'scheduled'  // Programada para envío futuro
  | 'running'    // En proceso de envío
  | 'paused'     // Pausada temporalmente
  | 'completed'  // Completada exitosamente
  | 'failed'     // Falló durante el envío
  | 'cancelled'; // Cancelada por el usuario

export const CAMPAIGN_STATUS_CONFIG: Record<CampaignStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: string;
}> = {
  draft: { 
    label: 'Borrador', 
    color: 'text-gray-600 dark:text-gray-400', 
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    icon: 'FileText'
  },
  scheduled: { 
    label: 'Programada', 
    color: 'text-blue-600 dark:text-blue-400', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: 'Calendar'
  },
  running: { 
    label: 'En Ejecución', 
    color: 'text-amber-600 dark:text-amber-400', 
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: 'Play'
  },
  paused: { 
    label: 'Pausada', 
    color: 'text-orange-600 dark:text-orange-400', 
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: 'Pause'
  },
  completed: { 
    label: 'Completada', 
    color: 'text-emerald-600 dark:text-emerald-400', 
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: 'CheckCircle'
  },
  failed: { 
    label: 'Fallida', 
    color: 'text-red-600 dark:text-red-400', 
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: 'XCircle'
  },
  cancelled: { 
    label: 'Cancelada', 
    color: 'text-gray-500 dark:text-gray-500', 
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: 'Ban'
  },
};

/**
 * Tipo de campaña
 */
export type CampaignType = 'standard' | 'ab_test';

export const CAMPAIGN_TYPE_CONFIG: Record<CampaignType, { label: string; description: string; icon: string }> = {
  standard: { 
    label: 'Estándar', 
    description: 'Campaña normal con una sola plantilla',
    icon: 'MessageSquare'
  },
  ab_test: { 
    label: 'A/B Test', 
    description: 'Prueba dos plantillas con diferentes audiencias',
    icon: 'GitBranch'
  },
};

/**
 * Campaña de WhatsApp
 */
export interface WhatsAppCampaign {
  id: string;
  nombre: string;
  descripcion?: string | null;
  
  // Tipo de campaña
  campaign_type: CampaignType;
  
  // Referencias
  template_id: string;
  audience_id: string;
  
  // Relaciones expandidas (para joins)
  template?: WhatsAppTemplate;
  audience?: WhatsAppAudience;
  
  // A/B Test
  ab_group_id?: string | null; // ID que agrupa variantes A y B
  ab_variant?: 'A' | 'B' | null; // Variante de esta campaña
  ab_distribution_a: number; // Porcentaje para variante A (0-100)
  
  // Analítica adicional (desde v_campaign_analytics)
  reply_rate_percent?: number;
  effectiveness_score?: number;
  
  // Configuración de envío
  batch_size: number;
  batch_interval_seconds: number;
  
  // Programación
  execute_at?: string | null; // Cuándo ejecutar (null = ahora)
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  
  // Estado
  status: CampaignStatus;
  
  // Estadísticas
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  replied_count: number;
  failed_count: number;
  
  // Auditoría
  created_by?: string | null;
  created_by_email?: string | null;
  created_at: string;
  updated_at: string;
  
  // Webhook
  webhook_execution_id?: string | null;
  webhook_response?: Record<string, unknown> | null;
  
  // Snapshot de la query
  audience_query_snapshot?: string | null;
  
  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Input para crear una nueva campaña
 */
export interface CreateCampaignInput {
  nombre: string;
  descripcion?: string;
  campaign_type?: CampaignType;
  template_id: string;
  audience_id: string;
  ab_template_b_id?: string | null;
  ab_distribution_a?: number;
  batch_size?: number;
  batch_interval_seconds?: number;
  execute_at?: string | null;
  scheduled_at?: string | null;
}

/**
 * Input para actualizar una campaña
 */
export interface UpdateCampaignInput {
  nombre?: string;
  descripcion?: string;
  campaign_type?: CampaignType;
  template_id?: string;
  audience_id?: string;
  ab_template_b_id?: string | null;
  ab_distribution_a?: number;
  batch_size?: number;
  batch_interval_seconds?: number;
  execute_at?: string | null;
  scheduled_at?: string | null;
  status?: CampaignStatus;
}

/**
 * Payload para el webhook de broadcast
 */
export interface BroadcastWebhookPayload {
  campaign_id: string;
  campaign_type: CampaignType;
  audience_id: string;
  template_id: string;
  audience_query: string;
  batch_size: number;
  batch_interval_seconds: number;
  recipients_count: number;
  created_by_id: string;
  created_by_email: string;
  execute_at: string; // Cuándo ejecutar la campaña
  timestamp: string;
  // Para A/B test: indicar variante
  ab_variant?: 'A' | 'B';
  ab_distribution_percent?: number;
  ab_linked_campaign_id?: string;
}

