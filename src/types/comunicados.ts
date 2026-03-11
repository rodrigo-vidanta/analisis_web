/**
 * ============================================
 * TIPOS: SISTEMA DE COMUNICADOS
 * ============================================
 *
 * Tipos para el sistema de comunicados en tiempo real.
 * Admin crea comunicados → usuarios los ven como overlay.
 */

export type ComunicadoTipo = 'info' | 'feature' | 'tutorial' | 'mantenimiento' | 'urgente';
export type ComunicadoEstado = 'borrador' | 'activo' | 'archivado';
export type ComunicadoTargetType = 'todos' | 'coordinacion' | 'usuarios' | 'roles';

export interface ComunicadoContenido {
  body?: string;
  bullets?: string[];
  icon?: string;
}

export interface Comunicado {
  id: string;
  titulo: string;
  subtitulo: string | null;
  contenido: ComunicadoContenido;
  tipo: ComunicadoTipo;
  prioridad: number;
  is_interactive: boolean;
  component_key: string | null;
  target_type: ComunicadoTargetType;
  target_ids: string[];
  estado: ComunicadoEstado;
  published_at: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  read_count: number;
  target_count: number;
}

export interface ComunicadoRead {
  comunicado_id: string;
  user_id: string;
  read_at: string;
}

export interface CreateComunicadoParams {
  titulo: string;
  subtitulo?: string;
  contenido?: ComunicadoContenido;
  tipo: ComunicadoTipo;
  prioridad?: number;
  is_interactive?: boolean;
  component_key?: string;
  target_type?: ComunicadoTargetType;
  target_ids?: string[];
  expires_at?: string;
}

export interface UpdateComunicadoParams {
  titulo?: string;
  subtitulo?: string;
  contenido?: ComunicadoContenido;
  tipo?: ComunicadoTipo;
  prioridad?: number;
  target_type?: ComunicadoTargetType;
  target_ids?: string[];
  expires_at?: string | null;
}

export interface ComunicadoPreset {
  tipo: ComunicadoTipo;
  label: string;
  icon: string;
  color: string;
}

export const COMUNICADO_PRESETS: ComunicadoPreset[] = [
  { tipo: 'info', label: 'Informativo', icon: 'Info', color: 'blue' },
  { tipo: 'feature', label: 'Nueva Funcionalidad', icon: 'Sparkles', color: 'emerald' },
  { tipo: 'tutorial', label: 'Tutorial', icon: 'GraduationCap', color: 'purple' },
  { tipo: 'mantenimiento', label: 'Mantenimiento', icon: 'Wrench', color: 'amber' },
  { tipo: 'urgente', label: 'Urgente', icon: 'AlertTriangle', color: 'red' },
];

export const COMUNICADO_TIPO_COLORS: Record<ComunicadoTipo, { bg: string; text: string; border: string }> = {
  info: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  feature: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  tutorial: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  mantenimiento: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  urgente: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

export interface InteractiveComunicado {
  component_key: string;
  label: string;
  description: string;
}

export const INTERACTIVE_COMUNICADOS: InteractiveComunicado[] = [
  {
    component_key: 'utility-template-tutorial',
    label: 'Tutorial: Plantilla Utility',
    description: 'Tutorial interactivo sobre la plantilla seguimiento_contacto_utilidad',
  },
  {
    component_key: 'delivery-checks-tutorial',
    label: 'Tutorial: Checks de Entrega',
    description: 'Tutorial interactivo sobre los checks de entrega WhatsApp (enviado, recibido, leido)',
  },
  {
    component_key: 'undelivered-template-tutorial',
    label: 'Tutorial: Mensajes No Entregados',
    description: 'Tutorial interactivo que explica por que algunas plantillas aparecen borrosas y que hacer',
  },
  {
    component_key: 'notas-internas-admin-tutorial',
    label: 'Tutorial: Notas Internas (Admin/Coordinadores)',
    description: 'Tutorial interactivo sobre como usar notas internas en conversaciones WhatsApp',
  },
  {
    component_key: 'notas-internas-ejecutivo-tutorial',
    label: 'Tutorial: Notas Internas (Ejecutivos)',
    description: 'Tutorial interactivo que explica la nueva funcion de notas internas para ejecutivos',
  },
  {
    component_key: 'template-groups-tutorial',
    label: 'Tutorial: Grupos Inteligentes de Plantillas',
    description: 'Tutorial interactivo sobre el nuevo sistema de envio de plantillas por grupos con seleccion automatica',
  },
  {
    component_key: 'bulk-reassignment-supervisor-tutorial',
    label: 'Tutorial: Reasignación Masiva (Supervisores)',
    description: 'Tutorial interactivo que explica a supervisores como usar la reasignacion masiva de prospectos, restricciones y limitaciones',
  },
  {
    component_key: 'import-10-urls-tutorial',
    label: 'Importa hasta 10 Prospectos',
    description: 'Comunicado animado celebrando el aumento del limite de importacion de 5 a 10 URLs simultaneas',
  },
  {
    component_key: 'voice-calls-intro',
    label: 'Llamadas Voice: Presentacion',
    description: 'Presentacion animada con Remotion del sistema de llamadas Voice con transferencias entre equipo',
  },
];
