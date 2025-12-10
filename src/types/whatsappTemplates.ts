/**
 * ============================================
 * TIPOS PARA PLANTILLAS WHATSAPP
 * ============================================
 */

// ============================================
// ENUMS DE CLASIFICACIÓN
// ============================================

/**
 * Etapas del prospecto - sincronizado con tabla prospectos
 */
export type ProspectoEtapa = 
  | 'Activo PQNC'
  | 'Atendió llamada'
  | 'En seguimiento'
  | 'Es miembro'
  | 'Interesado'
  | 'Nuevo'
  | 'Sin contactar'
  | 'No interesado'
  | 'Cerrado';

export const PROSPECTO_ETAPAS: { value: ProspectoEtapa; label: string }[] = [
  { value: 'Activo PQNC', label: 'Activo PQNC' },
  { value: 'Atendió llamada', label: 'Atendió llamada' },
  { value: 'En seguimiento', label: 'En seguimiento' },
  { value: 'Es miembro', label: 'Es miembro' },
  { value: 'Interesado', label: 'Interesado' },
  { value: 'Nuevo', label: 'Nuevo' },
  { value: 'Sin contactar', label: 'Sin contactar' },
  { value: 'No interesado', label: 'No interesado' },
  { value: 'Cerrado', label: 'Cerrado' },
];

/**
 * Destinos disponibles - valores exactos de BD llamadas_ventas.destino_preferido
 */
export type DestinoNombre = 
  | 'nuevo_vallarta'
  | 'riviera_maya'
  | 'los_cabos'
  | 'acapulco'
  | 'puerto_penasco'
  | 'mazatlan'
  | 'puerto_vallarta';

export const DESTINOS: { value: DestinoNombre; label: string }[] = [
  { value: 'nuevo_vallarta', label: 'Nuevo Vallarta' },
  { value: 'riviera_maya', label: 'Riviera Maya' },
  { value: 'los_cabos', label: 'Los Cabos' },
  { value: 'acapulco', label: 'Acapulco' },
  { value: 'puerto_penasco', label: 'Puerto Peñasco' },
  { value: 'mazatlan', label: 'Mazatlán' },
  { value: 'puerto_vallarta', label: 'Puerto Vallarta' },
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
 */
export interface WhatsAppAudience {
  id: string;
  nombre: string;
  descripcion?: string | null;
  etapa?: ProspectoEtapa | null;
  destino?: DestinoNombre | null;
  estado_civil?: EstadoCivil | null;
  tipo_audiencia: TipoAudiencia[];
  preferencia_entretenimiento?: PreferenciaEntretenimiento | null;
  prospectos_count: number;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input para crear/editar audiencia
 */
export interface CreateAudienceInput {
  nombre: string;
  descripcion?: string;
  etapa?: ProspectoEtapa | null;
  destino?: DestinoNombre | null;
  estado_civil?: EstadoCivil | null;
  tipo_audiencia: TipoAudiencia[];
  preferencia_entretenimiento?: PreferenciaEntretenimiento | null;
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
  description?: string | null;
  created_by?: string | null;
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
  variable_mappings?: VariableMapping[];
  // Clasificación de la plantilla (se envía al webhook en array separado)
  classification?: TemplateClassification;
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

