/**
 * ============================================
 * TIPOS COMPARTIDOS - MÓDULO LLAMADAS AI (Natalia)
 * ============================================
 *
 * Interfaces y tipos para el módulo de análisis IA
 * de llamadas con la filosofía de evaluación de Natalia.
 */

// ============================================
// DATOS DE ANÁLISIS
// ============================================

export interface LAIFeedbackConstructivo {
  problema: string;
  ubicacion: string;
  solucion_tecnica: string;
}

/** Registro crudo de call_analysis_summary */
export interface LAIAnalysisRecord {
  analysis_id: string;
  call_id: string;
  created_at: string;
  score_general: number;
  categoria_desempeno: string;
  checkpoint_alcanzado: number;
  nivel_interes_detectado: string;
  resultado_llamada: string;
  feedback_positivo: string[];
  feedback_constructivo: LAIFeedbackConstructivo[];
  total_puntos_positivos: number;
  total_areas_mejora: number;
  calificaciones: Record<string, string>;
}

/** Registro enriquecido con datos de prospecto (post-join) */
export interface LAIEnrichedRecord extends LAIAnalysisRecord {
  prospecto_id?: string;
  prospecto_nombre?: string;
  coordinacion_id?: string;
  ejecutivo_id?: string;
  is_intelligent_transfer: boolean;
}

// ============================================
// AGRUPACIÓN POR PROSPECTO
// ============================================

export interface LAICallGroup {
  prospectoNombre: string;
  prospectoId: string | null;
  callCount: number;
  records: LAIEnrichedRecord[];
  latestRecord: LAIEnrichedRecord;
  avgScore: number;
  dateRange: { from: string; to: string };
  scoreTrend: 'improving' | 'declining' | 'stable';
}

// ============================================
// FILTROS
// ============================================

export interface LAIServerFilters {
  dateFrom?: string;
  dateTo?: string;
  categoriaFilter?: string;
  nivelInteresFilter?: string;
  resultadoFilter?: string;
  scoreMin?: number;
  scoreMax?: number;
  checkpointMin?: number;
  checkpointMax?: number;
}

export interface LAIClientFilters {
  searchQuery: string;
  showOnlyIntelligent: boolean;
  hasFeedback?: boolean | null;
}

export interface LAIFilterState extends LAIServerFilters, LAIClientFilters {}

export interface LAIActiveFilter {
  key: string;
  label: string;
  displayValue: string;
  type: 'server' | 'client';
}

// Score range presets
export const LAI_SCORE_PRESETS = [
  { id: 'critical', label: 'Críticas', min: 0, max: 39, color: 'red' },
  { id: 'low', label: 'Bajas', min: 40, max: 59, color: 'amber' },
  { id: 'good', label: 'Buenas', min: 60, max: 79, color: 'blue' },
  { id: 'excellent', label: 'Excelentes', min: 80, max: 100, color: 'emerald' },
] as const;

// Date quick buttons
export const LAI_DATE_PRESETS = [
  { id: 'today', label: 'Hoy' },
  { id: 'yesterday', label: 'Ayer' },
  { id: '7days', label: '7 días' },
  { id: 'month', label: 'Este mes' },
] as const;

// ============================================
// PAGINACIÓN Y ORDENAMIENTO
// ============================================

export interface LAISortState {
  field: string;
  direction: 'asc' | 'desc';
}

export interface LAIPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================
// MÉTRICAS
// ============================================

export interface LAIMetrics {
  totalRecords: number;
  avgScore: number;
  avgCheckpoint: number;
  intelligentTransferCount: number;
  categoryBreakdown: Record<string, number>;
}

// ============================================
// OPCIONES DE FILTROS (cached)
// ============================================

export interface LAIFilterOptions {
  categorias: string[];
  nivelesInteres: string[];
  resultados: string[];
}

// ============================================
// PRESETS
// ============================================

export interface LAIFilterPreset {
  id: string;
  name: string;
  icon: string;
  filters: Partial<LAIFilterState>;
  isBuiltIn: boolean;
  createdAt: string;
}

// ============================================
// CONTEXTO DE USUARIO (para permisos)
// ============================================

export interface LAIUserContext {
  userId: string;
  isAdmin: boolean;
  isCalidad: boolean;
  ejecutivoFilter: string | null;
  coordinacionesFilter: string[] | null;
}

// ============================================
// COLUMNAS Y CONSTANTES
// ============================================

export const LAI_LIST_COLUMNS = `
  analysis_id,
  call_id,
  created_at,
  score_general,
  categoria_desempeno,
  checkpoint_alcanzado,
  nivel_interes_detectado,
  resultado_llamada,
  total_puntos_positivos,
  total_areas_mejora
`;

export const LAI_DETAIL_COLUMNS = `
  analysis_id,
  call_id,
  created_at,
  score_general,
  categoria_desempeno,
  checkpoint_alcanzado,
  nivel_interes_detectado,
  resultado_llamada,
  feedback_positivo,
  feedback_constructivo,
  total_puntos_positivos,
  total_areas_mejora,
  calificaciones
`;

export const LAI_DEFAULT_PAGE_SIZE = 50;
export const LAI_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

// ============================================
// CALIFICACIONES - SCORING NATALIA
// ============================================

export const CALIFICATION_SCORES: Record<string, number> = {
  'PERFECTO': 10, 'MAESTRO': 10, 'DOMINANTE': 10, 'COMPLETO': 10,
  'EXCELENTE': 9, 'EXITOSO': 9, 'PRECISA': 9,
  'EFECTIVO': 8, 'BUENA': 8, 'CONTROLADO': 8, 'SUFICIENTE': 8, 'ALTO': 8, 'ADECUADA': 8,
  'BUENO': 7, 'PARCIAL': 6, 'REGULAR': 6, 'BASICO': 6, 'MEDIO': 6, 'TARDÍA': 5,
  'INCONSISTENTE': 4, 'INCOMPLETO': 4, 'DEFICIENTE': 3, 'BAJO': 3, 'INEFECTIVO': 3, 'FALLIDA': 3,
  'INCORRECTO': 2, 'PERDIDO': 2, 'FALLIDO': 2, 'NO_REALIZADO': 2,
  'NO_APLICABLE': 0, 'NO_HUBO': 0,
};

/**
 * Ponderación inteligente según la filosofía de Natalia.
 * Ajusta scores en contexto de transferencias estratégicas.
 */
export function adjustScoreForIntelligentTransfer(
  record: LAIAnalysisRecord,
  califications: Record<string, string>
): Record<string, number> {
  const adjustedScores: Record<string, number> = {};
  const isHighInterest = record.nivel_interes_detectado === 'alto' ||
    record.nivel_interes_detectado === 'muy_alto' ||
    record.nivel_interes_detectado === 'ALTO' ||
    record.nivel_interes_detectado === 'MUY_ALTO';
  const wasTransferred = record.resultado_llamada?.toLowerCase().includes('transferencia') ||
    record.resultado_llamada?.toLowerCase().includes('derivado') ||
    record.resultado_llamada?.toLowerCase().includes('supervisor');

  Object.entries(califications).forEach(([key, value]) => {
    let baseScore = CALIFICATION_SCORES[value.toUpperCase()] ?? 5;

    if (isHighInterest && wasTransferred) {
      if (key.toLowerCase().includes('discovery') &&
        (value.toUpperCase() === 'INCOMPLETO' || value.toUpperCase() === 'PARCIAL')) {
        baseScore = Math.min(baseScore + 3, 8);
      }
      if (key.toLowerCase().includes('urgencia') && value.toUpperCase() === 'DETECTADA') {
        baseScore = Math.min(baseScore + 2, 10);
      }
      if (key.toLowerCase().includes('tiempo') &&
        (value.toUpperCase() === 'RAPIDO' || value.toUpperCase() === 'EFICIENTE')) {
        baseScore = Math.min(baseScore + 1, 10);
      }
    }

    if (wasTransferred && isHighInterest &&
      (value.toUpperCase() === 'NO_REALIZADO' || value.toUpperCase() === 'INCOMPLETO')) {
      if (key.toLowerCase().includes('discovery') || key.toLowerCase().includes('familiar')) {
        baseScore = Math.max(baseScore, 4);
      }
    }

    adjustedScores[key] = baseScore;
  });

  return adjustedScores;
}

/**
 * Detecta si un registro es una transferencia estratégica inteligente.
 */
export function isIntelligentTransfer(record: LAIAnalysisRecord): boolean {
  const isHighInterest = record.nivel_interes_detectado === 'alto' ||
    record.nivel_interes_detectado === 'muy_alto' ||
    record.nivel_interes_detectado === 'ALTO' ||
    record.nivel_interes_detectado === 'MUY_ALTO';
  const wasTransferred = record.resultado_llamada?.toLowerCase().includes('transferencia') ||
    record.resultado_llamada?.toLowerCase().includes('derivado') ||
    record.resultado_llamada?.toLowerCase().includes('supervisor');
  return isHighInterest && wasTransferred;
}
