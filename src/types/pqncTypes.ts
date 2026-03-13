/**
 * ============================================
 * TIPOS COMPARTIDOS - MÓDULO PQNC
 * ============================================
 *
 * Interfaces y tipos usados por PQNCDashboard,
 * DetailedCallView, pqncCallsService, y pqncStore.
 */

// ============================================
// DATOS DE LLAMADAS
// ============================================

export interface CallRecord {
  id: string;
  agent_name: string;
  customer_name: string;
  call_type: string;
  call_result: string;
  duration: string;
  quality_score: number;
  customer_quality: string | null;
  organization: string;
  direction: string;
  start_time: string;
  audio_file_url?: string;
  audio_file_name?: string;
  call_summary?: string;
  // Datos detallados (cargados bajo demanda)
  agent_performance?: Record<string, unknown>;
  call_evaluation?: Record<string, unknown>;
  comunicacion_data?: Record<string, unknown>;
  customer_data?: Record<string, unknown>;
  service_offered?: Record<string, unknown>;
  script_analysis?: Record<string, unknown>;
  compliance_data?: Record<string, unknown>;
}

export interface CallSegment {
  id: string;
  call_id: string;
  segment_index: number;
  text: string;
  etapa_script: string | null;
  elementos_obligatorios: string[] | null;
  tecnicas_rapport: string[] | null;
  tipos_discovery: string[] | null;
  tipos_objeciones: string[] | null;
  tono_cliente: string;
  tono_agente: string;
  quality_score: number;
  context_text?: string;
}

// ============================================
// FILTROS
// ============================================

export interface PQNCServerFilters {
  dateFrom?: string;
  dateTo?: string;
  agentFilter?: string;
  resultFilter?: string;
  organizationFilter?: string;
  callTypeFilter?: string[];
  directionFilter?: string[];
  customerQualityFilter?: string[];
  qualityScoreMin?: number;
  qualityScoreMax?: number;
  hasAudio?: boolean | null;
}

export interface PQNCClientFilters {
  searchQuery: string;
  requiresFollowup?: boolean | null;
  durationRange?: 'short' | 'medium' | 'long' | '';
  serviceOffered?: string[];
  bookmarkColor?: string | null;
  timeOfDay?: ('morning' | 'afternoon' | 'evening' | 'night')[];
}

export interface PQNCFilterState extends PQNCServerFilters, PQNCClientFilters {}

export interface ActiveFilter {
  key: string;
  label: string;
  displayValue: string;
  type: 'server' | 'client';
}

// ============================================
// PAGINACIÓN Y ORDENAMIENTO
// ============================================

export interface PQNCSortState {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================
// MÉTRICAS
// ============================================

export interface PQNCMetrics {
  totalCalls: number;
  avgQuality: number;
  avgQualityPonderada: number;
  avgDuration: number;
  successRate: number;
  avgConversionProb: number;
  avgAgentPerformance: number;
  avgRapportScore: number;
}

// ============================================
// OPCIONES DE FILTROS (cached)
// ============================================

export interface PQNCFilterOptions {
  agents: string[];
  results: string[];
  organizations: string[];
  callTypes: string[];
  directions: string[];
  customerQualities: string[];
}

// ============================================
// PRESETS
// ============================================

export interface FilterPreset {
  id: string;
  name: string;
  icon: string;
  filters: Partial<PQNCFilterState>;
  isBuiltIn: boolean;
  createdAt: string;
}

// ============================================
// COLUMNAS DE LA TABLA
// ============================================

export const CALL_LIST_COLUMNS = `
  id,
  agent_name,
  customer_name,
  call_type,
  call_result,
  duration,
  quality_score,
  customer_quality,
  organization,
  direction,
  start_time,
  audio_file_url,
  audio_file_name
`;

export const CALL_DETAIL_COLUMNS = `
  id,
  agent_name,
  customer_name,
  call_type,
  call_result,
  duration,
  quality_score,
  customer_quality,
  organization,
  direction,
  start_time,
  audio_file_url,
  audio_file_name,
  agent_performance,
  call_evaluation,
  comunicacion_data,
  customer_data,
  service_offered,
  script_analysis,
  compliance_data
`;

export const DEFAULT_PAGE_SIZE = 50;
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
