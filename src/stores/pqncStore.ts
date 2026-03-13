/**
 * ============================================
 * PQNC CALLS STORE (Zustand)
 * ============================================
 *
 * Estado global del módulo Llamadas PQNC.
 * Gestiona paginación server-side, filtros,
 * ordenamiento y datos de llamadas.
 */

import { create } from 'zustand';
import type {
  CallRecord,
  CallSegment,
  PQNCServerFilters,
  PQNCClientFilters,
  PQNCSortState,
  PQNCMetrics,
  PQNCFilterOptions,
  ActiveFilter,
  FilterPreset,
} from '../types/pqncTypes';
import { DEFAULT_PAGE_SIZE } from '../types/pqncTypes';
import * as pqncService from '../services/pqncCallsService';
import { feedbackService, type FeedbackData } from '../services/feedbackService';
import { bookmarkService, type BookmarkColor, type BookmarkData } from '../services/bookmarkService';

// ============================================
// PRESETS BUILT-IN
// ============================================

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function startOfWeekStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

function startOfMonthStr(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

const BUILT_IN_PRESETS: FilterPreset[] = [
  {
    id: 'today',
    name: 'Hoy',
    icon: 'CalendarDays',
    filters: { dateFrom: todayStr(), dateTo: todayStr(), searchQuery: '' },
    isBuiltIn: true,
    createdAt: '',
  },
  {
    id: 'weekly-review',
    name: 'Revision Semanal',
    icon: 'ClipboardCheck',
    filters: { dateFrom: startOfWeekStr(), dateTo: todayStr(), qualityScoreMax: 50, hasAudio: true, searchQuery: '' },
    isBuiltIn: true,
    createdAt: '',
  },
  {
    id: 'best-calls',
    name: 'Mejores Llamadas',
    icon: 'Trophy',
    filters: { dateFrom: startOfMonthStr(), dateTo: todayStr(), qualityScoreMin: 85, searchQuery: '' },
    isBuiltIn: true,
    createdAt: '',
  },
];

// ============================================
// DEFAULT FILTER STATE
// ============================================

const DEFAULT_SERVER_FILTERS: PQNCServerFilters = {
  dateFrom: undefined,
  dateTo: undefined,
  agentFilter: undefined,
  resultFilter: undefined,
  organizationFilter: undefined,
  callTypeFilter: undefined,
  directionFilter: undefined,
  customerQualityFilter: undefined,
  qualityScoreMin: undefined,
  qualityScoreMax: undefined,
  hasAudio: null,
};

const DEFAULT_CLIENT_FILTERS: PQNCClientFilters = {
  searchQuery: '',
  requiresFollowup: null,
  durationRange: '',
  serviceOffered: [],
  bookmarkColor: null,
  timeOfDay: [],
};

// ============================================
// STORE INTERFACE
// ============================================

interface PQNCState {
  // Data
  calls: CallRecord[];
  totalRecords: number;
  totalUnfiltered: number;

  // Selected call + transcript
  selectedCall: CallRecord | null;
  selectedCallDetail: CallRecord | null;
  transcript: CallSegment[];

  // Pagination
  page: number;
  pageSize: number;

  // Sorting
  sort: PQNCSortState;

  // Filters
  serverFilters: PQNCServerFilters;
  clientFilters: PQNCClientFilters;

  // Filter options (cached)
  filterOptions: PQNCFilterOptions;
  filterOptionsLoaded: boolean;

  // Presets
  presets: FilterPreset[];
  activePresetId: string | null;

  // UI state
  loading: boolean;
  error: string | null;
  showDetailView: boolean;
  showTranscriptModal: boolean;
  showAdvancedFilters: boolean;

  // Feedback & bookmarks
  feedbackMap: Map<string, FeedbackData>;
  bookmarkMap: Map<string, BookmarkData>;
  bookmarkStats: Array<{ color: BookmarkColor; count: number }>;

  // Metrics
  metrics: PQNCMetrics;
  metricsLoading: boolean;

  // Sync
  lastSyncTime: string | null;

  // Actions
  fetchCalls: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchFilterOptions: () => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSort: (field: string, direction: 'asc' | 'desc') => void;
  setServerFilter: <K extends keyof PQNCServerFilters>(key: K, value: PQNCServerFilters[K]) => void;
  setClientFilter: <K extends keyof PQNCClientFilters>(key: K, value: PQNCClientFilters[K]) => void;
  clearFilters: () => void;
  applyPreset: (presetId: string) => void;
  savePreset: (name: string) => void;
  deletePreset: (presetId: string) => void;
  openDetail: (call: CallRecord) => Promise<void>;
  closeDetail: () => void;
  openTranscript: (call: CallRecord) => Promise<void>;
  closeTranscript: () => void;
  setShowAdvancedFilters: (show: boolean) => void;
  updateFeedback: (callId: string, data: FeedbackData | null) => void;
  updateBookmark: (callId: string, color: BookmarkColor | null) => void;
  loadFeedbacksAndBookmarks: (userId: string) => Promise<void>;
  getActiveFilters: () => ActiveFilter[];
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const usePQNCStore = create<PQNCState>((set, get) => ({
  // Data
  calls: [],
  totalRecords: 0,
  totalUnfiltered: 0,

  // Selected
  selectedCall: null,
  selectedCallDetail: null,
  transcript: [],

  // Pagination
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,

  // Sorting
  sort: { field: 'start_time', direction: 'desc' },

  // Filters
  serverFilters: { ...DEFAULT_SERVER_FILTERS },
  clientFilters: { ...DEFAULT_CLIENT_FILTERS },

  // Filter options
  filterOptions: { agents: [], results: [], organizations: [], callTypes: [], directions: [], customerQualities: [] },
  filterOptionsLoaded: false,

  // Presets
  presets: loadPresetsFromStorage(),
  activePresetId: null,

  // UI
  loading: false,
  error: null,
  showDetailView: false,
  showTranscriptModal: false,
  showAdvancedFilters: false,

  // Feedback & bookmarks
  feedbackMap: new Map(),
  bookmarkMap: new Map(),
  bookmarkStats: [],

  // Metrics
  metrics: { totalCalls: 0, avgQuality: 0, avgQualityPonderada: 0, avgDuration: 0, successRate: 0, avgConversionProb: 0, avgAgentPerformance: 0, avgRapportScore: 0 },
  metricsLoading: false,

  // Sync
  lastSyncTime: null,

  // ============================================
  // ACTIONS
  // ============================================

  fetchCalls: async () => {
    const state = get();
    set({ loading: true, error: null });

    try {
      const result = await pqncService.fetchCalls({
        page: state.page,
        pageSize: state.pageSize,
        sort: state.sort,
        filters: state.serverFilters,
      });

      set({
        calls: result.data,
        totalRecords: result.total,
        loading: false,
        lastSyncTime: new Date().toISOString(),
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error cargando llamadas',
        loading: false,
      });
    }
  },

  fetchMetrics: async () => {
    set({ metricsLoading: true });
    try {
      const metrics = await pqncService.fetchMetrics(get().serverFilters);
      set({ metrics, metricsLoading: false });
    } catch {
      set({ metricsLoading: false });
    }
  },

  fetchFilterOptions: async () => {
    if (get().filterOptionsLoaded) return;
    try {
      const options = await pqncService.fetchFilterOptions();
      set({ filterOptions: options, filterOptionsLoaded: true });
    } catch (err) {
      console.error('Error loading filter options:', err);
    }
  },

  setPage: (page: number) => {
    set({ page });
    get().fetchCalls();
  },

  setPageSize: (size: number) => {
    set({ pageSize: size, page: 1 });
    get().fetchCalls();
  },

  setSort: (field: string, direction: 'asc' | 'desc') => {
    set({ sort: { field, direction }, page: 1 });
    get().fetchCalls();
  },

  setServerFilter: (key, value) => {
    const newFilters = { ...get().serverFilters, [key]: value };

    set({
      serverFilters: newFilters,
      page: 1,
      activePresetId: null,
    });
    get().fetchCalls();
    get().fetchMetrics();
  },

  setClientFilter: (key, value) => {
    set((state) => ({
      clientFilters: { ...state.clientFilters, [key]: value },
      activePresetId: null,
    }));
  },

  clearFilters: () => {
    set({
      serverFilters: { ...DEFAULT_SERVER_FILTERS },
      clientFilters: { ...DEFAULT_CLIENT_FILTERS },
      page: 1,
      activePresetId: null,
    });
    get().fetchCalls();
    get().fetchMetrics();
  },

  applyPreset: (presetId: string) => {
    const preset = get().presets.find((p) => p.id === presetId);
    if (!preset) return;

    // Rebuild dates for built-in presets
    let filters = { ...preset.filters };
    if (preset.isBuiltIn) {
      if (presetId === 'today') {
        filters = { ...filters, dateFrom: todayStr(), dateTo: todayStr() };
      } else if (presetId === 'weekly-review') {
        filters = { ...filters, dateFrom: startOfWeekStr(), dateTo: todayStr() };
      } else if (presetId === 'best-calls') {
        filters = { ...filters, dateFrom: startOfMonthStr(), dateTo: todayStr() };
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
    });
    get().fetchCalls();
    get().fetchMetrics();
  },

  savePreset: (name: string) => {
    const state = get();
    const newPreset: FilterPreset = {
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

  openDetail: async (call: CallRecord) => {
    set({ selectedCall: call, selectedCallDetail: call, showDetailView: true, transcript: [] });

    const [detail, segments] = await Promise.all([
      pqncService.fetchCallDetail(call.id),
      pqncService.fetchTranscript(call.id),
    ]);

    set({
      selectedCallDetail: detail || call,
      transcript: segments,
    });
  },

  closeDetail: () => {
    set({ showDetailView: false, selectedCall: null, selectedCallDetail: null, transcript: [] });
  },

  openTranscript: async (call: CallRecord) => {
    set({ selectedCall: call, showTranscriptModal: true, transcript: [] });
    const segments = await pqncService.fetchTranscript(call.id);
    set({ transcript: segments });
  },

  closeTranscript: () => {
    set({ showTranscriptModal: false, selectedCall: null, transcript: [] });
  },

  setShowAdvancedFilters: (show: boolean) => {
    set({ showAdvancedFilters: show });
  },

  updateFeedback: (callId: string, data: FeedbackData | null) => {
    const newMap = new Map(get().feedbackMap);
    if (data) {
      newMap.set(callId, data);
    } else {
      newMap.delete(callId);
    }
    set({ feedbackMap: newMap });
  },

  updateBookmark: (callId: string, color: BookmarkColor | null) => {
    const newMap = new Map(get().bookmarkMap);
    if (color) {
      newMap.set(callId, { bookmark_color: color, created_at: new Date().toISOString() } as BookmarkData);
    } else {
      newMap.delete(callId);
    }
    set({ bookmarkMap: newMap });
  },

  loadFeedbacksAndBookmarks: async (userId: string) => {
    const callIds = get().calls.map((c) => c.id);
    if (callIds.length === 0) return;

    try {
      const [feedbacks, bookmarks, stats] = await Promise.all([
        feedbackService.getMultipleFeedbacks(callIds),
        bookmarkService.getUserBookmarks(userId, callIds),
        bookmarkService.getUserBookmarkStats(userId),
      ]);
      set({ feedbackMap: feedbacks, bookmarkMap: bookmarks, bookmarkStats: stats });
    } catch (err) {
      console.error('Error loading feedbacks/bookmarks:', err);
    }
  },

  getActiveFilters: (): ActiveFilter[] => {
    const { serverFilters, clientFilters } = get();
    const active: ActiveFilter[] = [];

    if (serverFilters.dateFrom || serverFilters.dateTo) {
      active.push({
        key: 'date',
        label: 'Fecha',
        displayValue: `${serverFilters.dateFrom || '...'} — ${serverFilters.dateTo || '...'}`,
        type: 'server',
      });
    }
    if (serverFilters.agentFilter) {
      active.push({ key: 'agentFilter', label: 'Agente', displayValue: serverFilters.agentFilter, type: 'server' });
    }
    if (serverFilters.resultFilter) {
      active.push({
        key: 'resultFilter',
        label: 'Resultado',
        displayValue: serverFilters.resultFilter.replace(/_/g, ' '),
        type: 'server',
      });
    }
    if (serverFilters.organizationFilter) {
      active.push({ key: 'organizationFilter', label: 'Organización', displayValue: serverFilters.organizationFilter, type: 'server' });
    }
    if (serverFilters.callTypeFilter && serverFilters.callTypeFilter.length > 0) {
      active.push({ key: 'callTypeFilter', label: 'Tipo', displayValue: serverFilters.callTypeFilter.join(', '), type: 'server' });
    }
    if (serverFilters.directionFilter && serverFilters.directionFilter.length > 0) {
      active.push({ key: 'directionFilter', label: 'Dirección', displayValue: serverFilters.directionFilter.join(', '), type: 'server' });
    }
    if (serverFilters.customerQualityFilter && serverFilters.customerQualityFilter.length > 0) {
      active.push({ key: 'customerQualityFilter', label: 'Calidad Cliente', displayValue: serverFilters.customerQualityFilter.join(', '), type: 'server' });
    }
    if (serverFilters.qualityScoreMin !== undefined && serverFilters.qualityScoreMin > 0) {
      active.push({ key: 'qualityScoreMin', label: 'Score Min', displayValue: `${serverFilters.qualityScoreMin}+`, type: 'server' });
    }
    if (serverFilters.qualityScoreMax !== undefined && serverFilters.qualityScoreMax < 100) {
      active.push({ key: 'qualityScoreMax', label: 'Score Max', displayValue: `≤${serverFilters.qualityScoreMax}`, type: 'server' });
    }
    if (serverFilters.hasAudio === true) {
      active.push({ key: 'hasAudio', label: 'Audio', displayValue: 'Con audio', type: 'server' });
    } else if (serverFilters.hasAudio === false) {
      active.push({ key: 'hasAudio', label: 'Audio', displayValue: 'Sin audio', type: 'server' });
    }
    if (clientFilters.searchQuery) {
      active.push({ key: 'searchQuery', label: 'Búsqueda', displayValue: clientFilters.searchQuery, type: 'client' });
    }
    if (clientFilters.durationRange) {
      const labels: Record<string, string> = { short: '< 2 min', medium: '2-10 min', long: '> 10 min' };
      active.push({ key: 'durationRange', label: 'Duración', displayValue: labels[clientFilters.durationRange] || clientFilters.durationRange, type: 'client' });
    }
    if (clientFilters.bookmarkColor) {
      active.push({ key: 'bookmarkColor', label: 'Marcador', displayValue: clientFilters.bookmarkColor, type: 'client' });
    }

    return active;
  },
}));

// ============================================
// PRESET PERSISTENCE (localStorage)
// ============================================

function loadPresetsFromStorage(): FilterPreset[] {
  try {
    const saved = localStorage.getItem('pqnc-filter-presets');
    const custom = saved ? (JSON.parse(saved) as FilterPreset[]) : [];
    return [...BUILT_IN_PRESETS, ...custom];
  } catch {
    return [...BUILT_IN_PRESETS];
  }
}

function savePresetsToStorage(presets: FilterPreset[]): void {
  try {
    const custom = presets.filter((p) => !p.isBuiltIn);
    localStorage.setItem('pqnc-filter-presets', JSON.stringify(custom));
  } catch {
    // Silent fail
  }
}
