/**
 * ============================================
 * TIPOS PARA IMPORTACIONES MASIVAS
 * ============================================
 *
 * Sistema de importación de contactos (no-prospectos) para broadcast masivo.
 * Tablas: importaciones, importados, importacion_broadcasts
 */

// ============================================
// ESTADOS
// ============================================

export type ImportacionEstatus = 'pendiente' | 'procesando' | 'completada' | 'fallida';
export type ImportadoEstatus = 'pendiente' | 'enviado' | 'respondido' | 'convertido' | 'fallido';
export type BroadcastEstatus = 'pendiente' | 'programado' | 'ejecutando' | 'completado' | 'fallido' | 'cancelado';

// ============================================
// INTERFACES
// ============================================

export interface Importacion {
  id: string;
  codigo_campana: string;
  descripcion: string | null;
  detalles: Record<string, unknown>;
  total_registros: number;
  estatus: ImportacionEstatus;
  creado_por: string | null;
  creado: string;
  actualizado: string;
}

export interface ImportacionConStats extends Importacion {
  pendientes: number;
  enviados: number;
  respondidos: number;
  convertidos: number;
  fallidos: number;
  ultimo_broadcast: ImportacionBroadcast | null;
}

export interface Importado {
  id: string;
  importacion_id: string;
  nombre: string;
  telefono: string;
  telefono_normalizado: string | null;
  id_dynamics: string | null;
  estatus: ImportadoEstatus;
  prospecto_id: string | null;
  convertido_at: string | null;
  creado: string;
  actualizado: string;
}

export interface ImportacionBroadcast {
  id: string;
  importacion_id: string;
  template_id: string;
  template_name: string;
  batch_count: number;
  batch_size: number;
  batch_interval_seconds: number;
  scheduled_at: string | null;
  estatus: BroadcastEstatus;
  total_destinatarios: number;
  enviados: number;
  fallidos: number;
  webhook_response: Record<string, unknown> | null;
  error_message: string | null;
  ejecutado_por: string | null;
  ejecutado_por_email: string | null;
  iniciado_at: string | null;
  completado_at: string | null;
  creado: string;
  actualizado: string;
}

// ============================================
// CSV PARSING
// ============================================

export interface CSVRow {
  nombre: string;
  telefono: string;
  id_dynamics?: string;
}

export interface CSVParseResult {
  rows: CSVRow[];
  invalidRows: { line: number; raw: string; reason: string }[];
  duplicates: number;
  totalParsed: number;
}

// ============================================
// WEBHOOK PAYLOAD
// ============================================

export interface MassiveBroadcastPayload {
  importacion_id: string;
  broadcast_id: string;
  template_id: string;
  template_name: string;
  batch_count: number;
  batch_size: number;
  batch_interval_seconds: number;
  scheduled_at: string | null;
  importados: {
    id: string;
    nombre: string;
    telefono_normalizado: string;
    id_dynamics: string | null;
  }[];
  total_recipients: number;
  created_by_id: string;
  created_by_email: string;
  timestamp: string;
}

// ============================================
// UI CONFIG
// ============================================

export const IMPORTACION_STATUS_CONFIG: Record<ImportacionEstatus, { label: string; color: string; bgClass: string; textClass: string }> = {
  pendiente: {
    label: 'Pendiente',
    color: 'gray',
    bgClass: 'bg-gray-100 dark:bg-gray-800',
    textClass: 'text-gray-700 dark:text-gray-300',
  },
  procesando: {
    label: 'Procesando',
    color: 'blue',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
  completada: {
    label: 'Completada',
    color: 'emerald',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    textClass: 'text-emerald-700 dark:text-emerald-400',
  },
  fallida: {
    label: 'Fallida',
    color: 'red',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-400',
  },
};

export const IMPORTADO_STATUS_CONFIG: Record<ImportadoEstatus, { label: string; color: string; bgClass: string; textClass: string }> = {
  pendiente: {
    label: 'Pendiente',
    color: 'gray',
    bgClass: 'bg-gray-100 dark:bg-gray-800',
    textClass: 'text-gray-700 dark:text-gray-300',
  },
  enviado: {
    label: 'Enviado',
    color: 'blue',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
  respondido: {
    label: 'Respondido',
    color: 'amber',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-400',
  },
  convertido: {
    label: 'Convertido',
    color: 'emerald',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    textClass: 'text-emerald-700 dark:text-emerald-400',
  },
  fallido: {
    label: 'Fallido',
    color: 'red',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-400',
  },
};

export const BROADCAST_STATUS_CONFIG: Record<BroadcastEstatus, { label: string; color: string; bgClass: string; textClass: string }> = {
  pendiente: {
    label: 'Pendiente',
    color: 'gray',
    bgClass: 'bg-gray-100 dark:bg-gray-800',
    textClass: 'text-gray-700 dark:text-gray-300',
  },
  programado: {
    label: 'Programado',
    color: 'purple',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-700 dark:text-purple-400',
  },
  ejecutando: {
    label: 'Ejecutando',
    color: 'blue',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
  completado: {
    label: 'Completado',
    color: 'emerald',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    textClass: 'text-emerald-700 dark:text-emerald-400',
  },
  fallido: {
    label: 'Fallido',
    color: 'red',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-400',
  },
  cancelado: {
    label: 'Cancelado',
    color: 'gray',
    bgClass: 'bg-gray-100 dark:bg-gray-800',
    textClass: 'text-gray-600 dark:text-gray-400',
  },
};

// ============================================
// UTILIDADES
// ============================================

/**
 * Normaliza un número telefónico mexicano a 13 dígitos (521XXXXXXXXXX)
 */
export function normalizarTelefono(telefono: string): string {
  const digits = telefono.replace(/[^0-9]/g, '');

  if (digits.length === 10) {
    return '521' + digits;
  }
  if (digits.length === 12 && digits.startsWith('52')) {
    return '521' + digits.substring(2);
  }
  if (digits.length === 13) {
    return digits;
  }
  // Edge case: return cleaned digits
  return digits;
}

/**
 * Batch interval options for UI
 */
export const BATCH_INTERVAL_OPTIONS = [
  { value: 60, label: '1 minuto' },
  { value: 120, label: '2 minutos' },
  { value: 300, label: '5 minutos' },
  { value: 600, label: '10 minutos' },
  { value: 900, label: '15 minutos' },
  { value: 1800, label: '30 minutos' },
] as const;
