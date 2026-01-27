/**
 * ============================================
 * TIPOS Y INTERFACES DE ETAPAS
 * ============================================
 * 
 * Migración de etapa (string) → etapa_id (FK)
 * Fecha: 26 de Enero 2026
 */

// ============================================
// CÓDIGOS DE ETAPA (estables, no cambiarán)
// ============================================

export type EtapaCodigo =
  | 'importado_manual'
  | 'primer_contacto'
  | 'validando_membresia'
  | 'discovery'
  | 'interesado'
  | 'atendio_llamada'
  | 'con_ejecutivo'
  | 'activo_pqnc'
  | 'es_miembro'
  | 'no_interesado';

// ============================================
// INTERFACE COMPLETA DE ETAPA
// ============================================

export interface Etapa {
  // Identificación
  id: string;
  codigo: EtapaCodigo;
  nombre: string;
  descripcion: string;
  
  // Ordenamiento y UI
  orden_funnel: number;
  color_ui: string;
  icono: string;
  es_terminal: boolean;
  
  // Configuración del agente
  grupo_objetivo: 'ENGAGEMENT' | 'LLAMADA' | null;
  agente_default: string | null;
  
  // Comportamiento automatizado
  ai_responde_auto: boolean;
  actualiza_db_auto: boolean;
  actualiza_crm_auto: boolean;
  permite_llamadas_auto: boolean;
  mensajes_reactivacion_auto: boolean;
  plantillas_reactivacion_auto: boolean;
  permite_templates: boolean;
  
  // Integración con CRM
  es_etapa_crm: boolean;
  mapeo_status_crm: string[] | null;
  
  // Límites
  max_reactivaciones: number;
  
  // Estado
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// TIPOS AUXILIARES
// ============================================

export interface EtapaOption {
  value: string;
  label: string;
  color: string;
  icono: string;
  orden: number;
}

export interface EtapaStats {
  total: number;
  activas: number;
  terminales: number;
  conAgenteAI: number;
}
