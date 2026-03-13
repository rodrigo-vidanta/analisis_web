/**
 * ============================================
 * LLAMADAS AI STORE (Zustand)
 * ============================================
 *
 * Estado global del módulo Llamadas AI (Natalia).
 * Sigue el patrón de pqncStore: paginación server-side,
 * filtros 3-tier, presets, y enrichment de datos.
 */

import { create } from 'zustand';
import type {
  LAIEnrichedRecord,
  LAIAnalysisRecord,
  LAIServerFilters,
  LAIClientFilters,
  LAISortState,
  LAIMetrics,
  LAIFilterOptions,
  LAIActiveFilter,
  LAIFilterPreset,
  LAIUserContext,
} from '../types/llamadasAITypes';
import { LAI_DEFAULT_PAGE_SIZE } from '../types/llamadasAITypes';
import * as laiService from '../services/llamadasAIService';

// ============================================
// DATE HELPERS
// ============================================

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function last7DaysStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

function startOfMonthStr(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

// ============================================
// BUILT-IN PRESETS
// ============================================

const BUILT_IN_PRESETS: LAIFilterPreset[] = [
  {
    id: 'today',
    name: 'Hoy',
    icon: 'CalendarDays',
    filters: { dateFrom: todayStr(), dateTo: todayStr(), searchQuery: '', showOnlyIntelligent: false },
    isBuiltIn: true,
    createdAt: '',
  },
  {
    id: 'strategic-transfers',
    name: 'Transferencias Estratégicas',
    icon: 'Target',
    filters: { showOnlyIntelligent: true, searchQuery: '' },
    isBuiltIn: true,
    createdAt: '',
  },
  {
    id: 'needs-improvement',
    name: 'Necesitan Mejora',
    icon: 'AlertTriangle',
    filters: { categoriaFilter: 'NECESITA MEJORA', searchQuery: '', showOnlyIntelligent: false },
    isBuiltIn: true,
    createdAt: '',
  },
  {
    id: 'top-performers',
    name: 'Excelentes',
    icon: 'Trophy',
    filters: { scoreMin: 80, searchQuery: '', showOnlyIntelligent: false },
    isBuiltIn: true,
    createdAt: '',
  },
];

// ============================================
// DEFAULT FILTER STATE
// ============================================

const DEFAULT_SERVER_FILTERS: LAIServerFilters = {
  dateFrom: todayStr(),
  dateTo: todayStr(),
  categoriaFilter: undefined,
  nivelInteresFilter: undefined,
  resultadoFilter: undefined,
  scoreMin: undefined,
  scoreMax: undefined,
  checkpointMin: undefined,
  checkpointMax: undefined,
};

const DEFAULT_CLIENT_FILTERS: LAIClientFilters = {
  searchQuery: '',
  showOnlyIntelligent: false,
  hasFeedback: null,
};

// ============================================
// STORE INTERFACE
// ============================================

interface LAIState {
  // Data
  records: LAIEnrichedRecord[];
  totalRecords: number;

  // Selected record
  selectedRecord: LAIEnrichedRecord | null;
  selectedRecordDetail: LAIAnalysisRecord | null;

  // Pagination
  page: number;
  pageSize: number;

  // Sorting
  sort: LAISortState;

  // Filters
  serverFilters: LAIServerFilters;
  clientFilters: LAIClientFilters;
  activeScorePreset: string | null;

  // Filter options (cached)
  filterOptions: LAIFilterOptions;
  filterOptionsLoaded: boolean;

  // Presets
  presets: LAIFilterPreset[];
  activePresetId: string | null;

  // Grouping
  groupByProspecto: boolean;
  expandedGroup: string | null;

  // User context
  userContext: LAIUserContext | null;

  // UI state
  loading: boolean;
  error: string | null;
  showDetailModal: boolean;
  showAdvancedFilters: boolean;

  // Metrics
  metrics: LAIMetrics;
  metricsLoading: boolean;

  // Actions
  initialize: (userContext: LAIUserContext) => Promise<void>;
  fetchRecords: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchFilterOptions: () => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSort: (field: string, direction: 'asc' | 'desc') => void;
  setServerFilter: <K extends keyof LAIServerFilters>(key: K, value: LAIServerFilters[K]) => void;
  setClientFilter: <K extends keyof LAIClientFilters>(key: K, value: LAIClientFilters[K]) => void;
  setScorePreset: (presetId: string | null, min?: number, max?: number) => void;
  clearFilters: () => void;
  applyPreset: (presetId: string) => void;
  savePreset: (name: string) => void;
  deletePreset: (presetId: string) => void;
  openDetail: (record: LAIEnrichedRecord) => Promise<void>;
  closeDetail: () => void;
  setShowAdvancedFilters: (show: boolean) => void;
  setGroupByProspecto: (enabled: boolean) => void;
  setExpandedGroup: (group: string | null) => void;
  searchByCallId: (callId: string) => Promise<void>;
  getActiveFilters: () => LAIActiveFilter[];
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useLlamadasAIStore = create<LAIState>((set, get) => ({
  // Data
  records: [],
  totalRecords: 0,

  // Selected
  selectedRecord: null,
  selectedRecordDetail: null,

  // Pagination
  page: 1,
  pageSize: LAI_DEFAULT_PAGE_SIZE,

  // Sorting
  sort: { field: 'created_at', direction: 'desc' },

  // Filters — auto-default "Hoy"
  serverFilters: { ...DEFAULT_SERVER_FILTERS },
  clientFilters: { ...DEFAULT_CLIENT_FILTERS },
  activeScorePreset: null,

  // Filter options
  filterOptions: { categorias: [], nivelesInteres: [], resultados: [] },
  filterOptionsLoaded: false,

  // Presets
  presets: loadPresetsFromStorage(),
  activePresetId: null,

  // Grouping
  groupByProspecto: false,
  expandedGroup: null,

  // User context
  userContext: null,

  // UI
  loading: false,
  error: null,
  showDetailModal: false,
  showAdvancedFilters: false,

  // Metrics
  metrics: { totalRecords: 0, avgScore: 0, avgCheckpoint: 0, intelligentTransferCount: 0, categoryBreakdown: {} },
  metricsLoading: false,

  // ============================================
  // ACTIONS
  // ============================================

  initialize: async (userContext: LAIUserContext) => {
    set({ userContext });
    await Promise.all([
      get().fetchRecords(),
      get().fetchMetrics(),
      get().fetchFilterOptions(),
    ]);
  },

  fetchRecords: async () => {
    const state = get();
    set({ loading: true, error: null });

    try {
      const result = await laiService.fetchLAICalls({
        page: state.page,
        pageSize: state.pageSize,
        sort: state.sort,
        filters: state.serverFilters,
        userContext: state.userContext,
      });

      set({
        records: result.data,
        totalRecords: result.total,
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error cargando análisis',
        loading: false,
      });
    }
  },

  fetchMetrics: async () => {
    set({ metricsLoading: true });
    try {
      const metrics = await laiService.fetchLAIMetrics(get().serverFilters);
      set({ metrics, metricsLoading: false });
    } catch {
      set({ metricsLoading: false });
    }
  },

  fetchFilterOptions: async () => {
    if (get().filterOptionsLoaded) return;
    try {
      const options = await laiService.fetchLAIFilterOptions();
      set({ filterOptions: options, filterOptionsLoaded: true });
    } catch (err) {
      console.error('Error loading filter options:', err);
    }
  },

  setPage: (page: number) => {
    set({ page, expandedGroup: null });
    get().fetchRecords();
  },

  setPageSize: (size: number) => {
    set({ pageSize: size, page: 1, expandedGroup: null });
    get().fetchRecords();
  },

  setSort: (field: string, direction: 'asc' | 'desc') => {
    set({ sort: { field, direction }, page: 1, expandedGroup: null });
    get().fetchRecords();
  },

  setServerFilter: (key, value) => {
    set((state) => ({
      serverFilters: { ...state.serverFilters, [key]: value },
      page: 1,
      activePresetId: null,
      expandedGroup: null,
    }));
    get().fetchRecords();
    get().fetchMetrics();
  },

  setClientFilter: (key, value) => {
    set((state) => ({
      clientFilters: { ...state.clientFilters, [key]: value },
      activePresetId: null,
    }));
  },

  setScorePreset: (presetId: string | null, min?: number, max?: number) => {
    const current = get().activeScorePreset;
    if (current === presetId) {
      // Toggle off
      set({
        serverFilters: { ...get().serverFilters, scoreMin: undefined, scoreMax: undefined },
        activeScorePreset: null,
        page: 1,
        activePresetId: null,
      });
    } else {
      set({
        serverFilters: { ...get().serverFilters, scoreMin: min, scoreMax: max },
        activeScorePreset: presetId,
        page: 1,
        activePresetId: null,
      });
    }
    get().fetchRecords();
    get().fetchMetrics();
  },

  clearFilters: () => {
    set({
      serverFilters: { ...DEFAULT_SERVER_FILTERS },
      clientFilters: { ...DEFAULT_CLIENT_FILTERS },
      page: 1,
      activePresetId: null,
      activeScorePreset: null,
      expandedGroup: null,
    });
    get().fetchRecords();
    get().fetchMetrics();
  },

  applyPreset: (presetId: string) => {
    const preset = get().presets.find((p) => p.id === presetId);
    if (!preset) return;

    let filters = { ...preset.filters };
    if (preset.isBuiltIn) {
      if (presetId === 'today') {
        filters = { ...filters, dateFrom: todayStr(), dateTo: todayStr() };
      }
    }

    const newServerFilters = { ...DEFAULT_SERVER_FILTERS };
    const newClientFilters = { ...DEFAULT_CLIENT_FILTERS };

    for (const [k, v] of Object.entries(filters)) {
      if (k in DEFAULT_SERVER_FILTERS) {
        (newServerFilters as Record<string, unknown>)[k] = v;
      } else if (k in DEFAULT_CLIENT_FILTERS) {
        (newClientFilters as Record<string, unknown>)[k] = v;
      }
    }

    set({
      serverFilters: newServerFilters,
      clientFilters: newClientFilters,
      page: 1,
      activePresetId: presetId,
      activeScorePreset: null,
      expandedGroup: null,
    });
    get().fetchRecords();
    get().fetchMetrics();
  },

  savePreset: (name: string) => {
    const state = get();
    const newPreset: LAIFilterPreset = {
      id: crypto.randomUUID(),
      name,
      icon: 'Bookmark',
      filters: { ...state.serverFilters, ...state.clientFilters },
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [...state.presets, newPreset];
    set({ presets: updated });
    savePresetsToStorage(updated);
  },

  deletePreset: (presetId: string) => {
    const updated = get().presets.filter((p) => p.id !== presetId || p.isBuiltIn);
    set({ presets: updated, activePresetId: get().activePresetId === presetId ? null : get().activePresetId });
    savePresetsToStorage(updated);
  },

  openDetail: async (record: LAIEnrichedRecord) => {
    set({ selectedRecord: record, selectedRecordDetail: null, showDetailModal: true });

    const detail = await laiService.fetchLAICallDetail(record.analysis_id);
    set({ selectedRecordDetail: detail });
  },

  closeDetail: () => {
    set({ showDetailModal: false, selectedRecord: null, selectedRecordDetail: null });
  },

  setShowAdvancedFilters: (show: boolean) => {
    set({ showAdvancedFilters: show });
  },

  setGroupByProspecto: (enabled: boolean) => {
    set({ groupByProspecto: enabled, expandedGroup: null });
  },

  setExpandedGroup: (group: string | null) => {
    set({ expandedGroup: group });
  },

  searchByCallId: async (callId: string) => {
    set({ loading: true, error: null });
    try {
      const results = await laiService.searchByCallId(callId);
      if (results.length > 0) {
        // Show first result in detail modal
        const enriched: LAIEnrichedRecord = {
          ...results[0],
          is_intelligent_transfer: false,
        };
        set({ loading: false });
        get().openDetail(enriched);
      } else {
        set({ error: 'No se encontró análisis para ese Call ID', loading: false });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error buscando análisis',
        loading: false,
      });
    }
  },

  getActiveFilters: (): LAIActiveFilter[] => {
    const { serverFilters, clientFilters } = get();
    const active: LAIActiveFilter[] = [];

    if (serverFilters.dateFrom || serverFilters.dateTo) {
      active.push({
        key: 'date',
        label: 'Fecha',
        displayValue: `${serverFilters.dateFrom || '...'} — ${serverFilters.dateTo || '...'}`,
        type: 'server',
      });
    }
    if (serverFilters.categoriaFilter) {
      active.push({ key: 'categoriaFilter', label: 'Categoría', displayValue: serverFilters.categoriaFilter, type: 'server' });
    }
    if (serverFilters.nivelInteresFilter) {
      active.push({ key: 'nivelInteresFilter', label: 'Interés', displayValue: serverFilters.nivelInteresFilter.replace(/_/g, ' '), type: 'server' });
    }
    if (serverFilters.resultadoFilter) {
      active.push({ key: 'resultadoFilter', label: 'Resultado', displayValue: serverFilters.resultadoFilter, type: 'server' });
    }
    if (serverFilters.scoreMin !== undefined && serverFilters.scoreMin > 0) {
      active.push({ key: 'scoreMin', label: 'Score Min', displayValue: `${serverFilters.scoreMin}+`, type: 'server' });
    }
    if (serverFilters.scoreMax !== undefined && serverFilters.scoreMax < 100) {
      active.push({ key: 'scoreMax', label: 'Score Max', displayValue: `≤${serverFilters.scoreMax}`, type: 'server' });
    }
    if (serverFilters.checkpointMin !== undefined && serverFilters.checkpointMin > 0) {
      active.push({ key: 'checkpointMin', label: 'Checkpoint Min', displayValue: `${serverFilters.checkpointMin}+`, type: 'server' });
    }
    if (clientFilters.searchQuery) {
      active.push({ key: 'searchQuery', label: 'Búsqueda', displayValue: clientFilters.searchQuery, type: 'client' });
    }
    if (clientFilters.showOnlyIntelligent) {
      active.push({ key: 'showOnlyIntelligent', label: 'Transferencias', displayValue: 'Estratégicas', type: 'client' });
    }

    return active;
  },
}));

// ============================================
// PRESET PERSISTENCE (localStorage)
// ============================================

function loadPresetsFromStorage(): LAIFilterPreset[] {
  try {
    const saved = localStorage.getItem('lai-filter-presets');
    const custom = saved ? (JSON.parse(saved) as LAIFilterPreset[]) : [];
    return [...BUILT_IN_PRESETS, ...custom];
  } catch {
    return [...BUILT_IN_PRESETS];
  }
}

function savePresetsToStorage(presets: LAIFilterPreset[]): void {
  try {
    const custom = presets.filter((p) => !p.isBuiltIn);
    localStorage.setItem('lai-filter-presets', JSON.stringify(custom));
  } catch {
    // Silent fail
  }
}
