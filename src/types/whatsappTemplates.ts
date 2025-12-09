/**
 * ============================================
 * TIPOS PARA PLANTILLAS WHATSAPP
 * ============================================
 */

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

