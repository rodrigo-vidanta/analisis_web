/**
 * ============================================
 * SERVICIO DE CLASIFICACIÓN DE ESTADOS DE LLAMADAS
 * ============================================
 * 
 * Clasifica llamadas en 6 estados granulares basándose en
 * múltiples indicadores de la data de VAPI y la BD.
 * 
 * Estados:
 * - activa: Llamada en curso
 * - transferida: Transferida a agente humano
 * - atendida: Hubo conversación pero no se transfirió
 * - no_contestada: El prospecto no contestó
 * - buzon: Fue a buzón de voz
 * - perdida: Error técnico o llamada stuck
 * 
 * Versión: 1.0.0
 * Fecha: 19 Diciembre 2025
 */

// ============================================
// TIPOS
// ============================================

export type CallStatusGranular = 
  | 'activa' 
  | 'transferida' 
  | 'atendida' 
  | 'no_contestada' 
  | 'buzon' 
  | 'perdida';

export interface CallClassificationInput {
  call_id?: string;
  call_status?: string;
  fecha_llamada: string;
  duracion_segundos?: number | null;
  audio_ruta_bucket?: string | null;
  monitor_url?: string | null;
  datos_llamada?: {
    razon_finalizacion?: string;
    numero_turnos?: number;
    fin_llamada?: string;
    inicio_llamada?: string;
  } | null;
}

export interface CallStatusConfig {
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
  label: string;
  description: string;
}

// ============================================
// CONFIGURACIÓN DE ESTADOS
// ============================================

export const CALL_STATUS_CONFIG: Record<CallStatusGranular, CallStatusConfig> = {
  activa: {
    icon: 'Phone',
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    label: 'En llamada',
    description: 'Llamada actualmente en curso'
  },
  transferida: {
    icon: 'PhoneForwarded',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    label: 'Transferida',
    description: 'Transferida exitosamente a agente humano'
  },
  atendida: {
    icon: 'PhoneCall',
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    label: 'Atendida',
    description: 'Hubo conversación pero no se transfirió'
  },
  no_contestada: {
    icon: 'PhoneMissed',
    color: 'orange',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
    label: 'No contestó',
    description: 'El prospecto no contestó la llamada'
  },
  buzon: {
    icon: 'Voicemail',
    color: 'purple',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-400',
    label: 'Buzón de voz',
    description: 'La llamada fue al buzón de voz'
  },
  perdida: {
    icon: 'PhoneOff',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    label: 'Perdida',
    description: 'Llamada fallida por error técnico o timeout'
  }
};

// ============================================
// RAZONES DE FINALIZACIÓN AGRUPADAS
// ============================================

const RAZONES_TRANSFERIDA = [
  'assistant-forwarded-call',
  'call.ringing.hook-executed-transfer',
  'forwarded-call'
];

const RAZONES_NO_CONTESTO = [
  'customer-did-not-answer',
  'customer-busy',
  'no-answer',
  'machine-detected',
  'voicemail-detected'
];

const RAZONES_ATENDIDA = [
  'customer-ended-call',
  'assistant-ended-call',
  'silence-timed-out',
  'max-duration-reached',
  'end-of-call-report'
];

const RAZONES_ERROR = [
  'assistant-not-found',
  'assistant-request-failed',
  'pipeline-error',
  'twilio-failed',
  'unknown-error',
  'error'
];

// ============================================
// FUNCIÓN PRINCIPAL DE CLASIFICACIÓN
// ============================================

/**
 * Clasifica una llamada en uno de los 6 estados granulares.
 * 
 * @param call - Datos de la llamada
 * @returns Estado clasificado
 */
export function classifyCallStatus(call: CallClassificationInput): CallStatusGranular {
  // Parsear datos_llamada si es string
  let datosLlamada = call.datos_llamada;
  if (typeof datosLlamada === 'string') {
    try {
      datosLlamada = JSON.parse(datosLlamada);
    } catch {
      datosLlamada = null;
    }
  }

  const razon = datosLlamada?.razon_finalizacion || '';
  const turnos = datosLlamada?.numero_turnos || 0;
  const duracion = call.duracion_segundos || 0;
  const tieneGrabacion = !!call.audio_ruta_bucket;
  const tieneFinVapi = !!datosLlamada?.fin_llamada;
  const tieneMonitor = !!call.monitor_url;

  // Calcular tiempo desde inicio
  const callDate = new Date(call.fecha_llamada);
  const now = new Date();
  const minutesAgo = (now.getTime() - callDate.getTime()) / (1000 * 60);

  // ═══════════════════════════════════════════════════════════
  // REGLA 1: TRANSFERIDAS (prioridad máxima)
  // ═══════════════════════════════════════════════════════════
  if (RAZONES_TRANSFERIDA.some(r => razon.toLowerCase().includes(r.toLowerCase()))) {
    return 'transferida';
  }

  // ═══════════════════════════════════════════════════════════
  // REGLA 2: NO CONTESTADAS / BUZÓN
  // ═══════════════════════════════════════════════════════════
  if (RAZONES_NO_CONTESTO.some(r => razon.toLowerCase().includes(r.toLowerCase()))) {
    // Diferenciar entre "no contestó" y "buzón"
    // Buzón: tiene grabación + duración 15-50s + máximo 1-2 turnos (el asistente puede hablar al buzón)
    // Los buzones típicos duran entre 15-50 segundos y tienen 0-2 turnos (solo el asistente habla)
    if (tieneGrabacion && duracion >= 15 && duracion <= 50 && turnos <= 2) {
      return 'buzon';
    }
    // Si no tiene grabación o duración muy corta, es no contestada
    return 'no_contestada';
  }

  // ═══════════════════════════════════════════════════════════
  // REGLA 3: ATENDIDAS (hubo conversación pero no transferida)
  // ═══════════════════════════════════════════════════════════
  if (RAZONES_ATENDIDA.some(r => razon.toLowerCase().includes(r.toLowerCase()))) {
    // Verificar que realmente hubo conversación
    if (turnos >= 1 || duracion >= 30) {
      return 'atendida';
    }
    // Si no hubo turnos y duración muy corta, probablemente fue buzón
    if (duracion > 0 && duracion < 30 && turnos === 0) {
      return tieneGrabacion ? 'buzon' : 'no_contestada';
    }
    // Default para razones de atendida
    return 'atendida';
  }

  // ═══════════════════════════════════════════════════════════
  // REGLA 4: ERRORES TÉCNICOS
  // ═══════════════════════════════════════════════════════════
  if (RAZONES_ERROR.some(r => razon.toLowerCase().includes(r.toLowerCase()))) {
    return 'perdida';
  }

  // ═══════════════════════════════════════════════════════════
  // REGLA 5: INFERIR ESTADO SI NO HAY RAZÓN EXPLÍCITA
  // ═══════════════════════════════════════════════════════════

  // Si tiene grabación sin razón conocida, inferir estado
  if (tieneGrabacion || tieneFinVapi) {
    // Tiene evidencia de finalización pero sin razón específica
    // Primero verificar si es buzón: duración típica 15-50s con máximo 2 turnos
    if (duracion >= 15 && duracion <= 50 && turnos <= 2) {
      return 'buzon';
    }
    // Si hubo más de 2 turnos o duración larga, fue conversación real
    if (turnos >= 3 || duracion >= 60) {
      return 'atendida';
    }
    // Duración muy corta sin turnos
    if (duracion > 0 && duracion < 15) {
      return 'no_contestada';
    }
    return 'atendida';
  }

  // ═══════════════════════════════════════════════════════════
  // REGLA 6: LLAMADAS "STUCK" (sin indicadores de finalización)
  // ═══════════════════════════════════════════════════════════

  // Si han pasado más de 15 minutos sin grabación, duración ni turnos
  if (minutesAgo > 15 && duracion === 0 && turnos === 0 && !tieneGrabacion) {
    return 'perdida';
  }

  // Si han pasado más de 30 minutos sin URL de monitoreo
  if (minutesAgo > 30 && !tieneMonitor && !tieneGrabacion) {
    return 'perdida';
  }

  // Si han pasado más de 2 horas, definitivamente no está activa
  if (minutesAgo > 120) {
    return 'perdida';
  }

  // ═══════════════════════════════════════════════════════════
  // REGLA 7: DEFAULT - ACTIVA
  // ═══════════════════════════════════════════════════════════
  return 'activa';
}

/**
 * Verifica si una llamada está realmente activa (para filtros de UI)
 */
export function isCallReallyActive(call: CallClassificationInput): boolean {
  return classifyCallStatus(call) === 'activa';
}

/**
 * Obtiene la configuración visual para un estado
 */
export function getCallStatusConfig(status: CallStatusGranular): CallStatusConfig {
  return CALL_STATUS_CONFIG[status] || CALL_STATUS_CONFIG.perdida;
}

/**
 * Mapea el estado granular al estado de BD (para compatibilidad)
 * Los estados de BD son: activa, transferida, finalizada, perdida
 */
export function mapToDbStatus(status: CallStatusGranular): string {
  switch (status) {
    case 'activa':
      return 'activa';
    case 'transferida':
      return 'transferida';
    case 'atendida':
      return 'atendida';  // Nuevo estado en BD
    case 'no_contestada':
      return 'no_contestada';  // Nuevo estado en BD
    case 'buzon':
      return 'buzon';  // Nuevo estado en BD
    case 'perdida':
      return 'perdida';
    default:
      return 'perdida';
  }
}

// ============================================
// EXPORTAR SERVICIO
// ============================================

export const callStatusClassifier = {
  classify: classifyCallStatus,
  isReallyActive: isCallReallyActive,
  getConfig: getCallStatusConfig,
  mapToDbStatus,
  STATUS_CONFIG: CALL_STATUS_CONFIG
};

export default callStatusClassifier;

