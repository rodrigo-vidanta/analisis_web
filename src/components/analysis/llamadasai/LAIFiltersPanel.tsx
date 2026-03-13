/**
 * ============================================
 * LAI FILTERS PANEL - 3-Tier Filter System
 * ============================================
 *
 * Tier 1: Always visible (search, dates, scores, categoria)
 * Tier 2: Advanced (collapsible)
 * Presets row: Built-in + custom with save/delete
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Calendar, SlidersHorizontal, X, Plus,
  CalendarDays, Target, AlertTriangle, Trophy, Bookmark,
  Filter, RotateCcw,
} from 'lucide-react';
import type {
  LAIServerFilters,
  LAIClientFilters,
  LAIFilterOptions,
  LAIFilterPreset,
} from '../../../types/llamadasAITypes';
import { LAI_SCORE_PRESETS, LAI_DATE_PRESETS } from '../../../types/llamadasAITypes';
import { COLLAPSE, SMOOTH_TRANSITION } from '../../../styles/tokens/animations';

// ============================================
// TYPES
// ============================================

interface LAIFiltersPanelProps {
  serverFilters: LAIServerFilters;
  clientFilters: LAIClientFilters;
  filterOptions: LAIFilterOptions;
  presets: LAIFilterPreset[];
  activePresetId: string | null;
  activeScorePreset: string | null;
  showAdvanced: boolean;
  onServerFilterChange: <K extends keyof LAIServerFilters>(key: K, value: LAIServerFilters[K]) => void;
  onClientFilterChange: <K extends keyof LAIClientFilters>(key: K, value: LAIClientFilters[K]) => void;
  onScorePresetChange: (id: string | null, min?: number, max?: number) => void;
  onToggleAdvanced: (show: boolean) => void;
  onApplyPreset: (id: string) => void;
  onSavePreset: (name: string) => void;
  onDeletePreset: (id: string) => void;
  onClearAll: () => void;
}

// ============================================
// SCORE PRESET STYLES
// ============================================

const SCORE_STYLES: Record<string, { active: string; inactive: string }> = {
  critical: {
    active: 'bg-red-600 text-white',
    inactive: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800',
  },
  low: {
    active: 'bg-amber-600 text-white',
    inactive: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  },
  good: {
    active: 'bg-blue-600 text-white',
    inactive: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  },
  excellent: {
    active: 'bg-emerald-600 text-white',
    inactive: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
  },
};

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

function getDatePresetDates(id: string): { from: string; to: string } {
  const today = todayStr();
  switch (id) {
    case 'today': return { from: today, to: today };
    case 'yesterday': { const y = yesterdayStr(); return { from: y, to: y }; }
    case '7days': return { from: last7DaysStr(), to: today };
    case 'month': return { from: startOfMonthStr(), to: today };
    default: return { from: today, to: today };
  }
}

function getActiveDatePreset(dateFrom?: string, dateTo?: string): string | null {
  const today = todayStr();
  const yesterday = yesterdayStr();
  const sevenDays = last7DaysStr();
  const monthStart = startOfMonthStr();

  if (dateFrom === today && dateTo === today) return 'today';
  if (dateFrom === yesterday && dateTo === yesterday) return 'yesterday';
  if (dateFrom === sevenDays && dateTo === today) return '7days';
  if (dateFrom === monthStart && dateTo === today) return 'month';
  return null;
}

// ============================================
// PRESET ICON MAP
// ============================================

const PRESET_ICONS: Record<string, React.ElementType> = {
  CalendarDays,
  Target,
  AlertTriangle,
  Trophy,
  Bookmark,
};

// ============================================
// COMPONENT
// ============================================

const LAIFiltersPanel: React.FC<LAIFiltersPanelProps> = ({
  serverFilters,
  clientFilters,
  filterOptions,
  presets,
  activePresetId,
  activeScorePreset,
  showAdvanced,
  onServerFilterChange,
  onClientFilterChange,
  onScorePresetChange,
  onToggleAdvanced,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onClearAll,
}) => {
  const [searchLocal, setSearchLocal] = useState(clientFilters.searchQuery);
  const [showSavePopover, setShowSavePopover] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);

  // Sync local search with store
  useEffect(() => {
    setSearchLocal(clientFilters.searchQuery);
  }, [clientFilters.searchQuery]);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchLocal(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      onClientFilterChange('searchQuery', value);
    }, 300);
  }, [onClientFilterChange]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // Focus save input when popover opens
  useEffect(() => {
    if (showSavePopover && saveInputRef.current) {
      saveInputRef.current.focus();
    }
  }, [showSavePopover]);

  const activeDatePreset = getActiveDatePreset(serverFilters.dateFrom, serverFilters.dateTo);

  const handleDatePresetClick = (presetId: string) => {
    const isActive = activeDatePreset === presetId;
    if (isActive) {
      onServerFilterChange('dateFrom', undefined);
      onServerFilterChange('dateTo', undefined);
    } else {
      const dates = getDatePresetDates(presetId);
      onServerFilterChange('dateFrom', dates.from);
      onServerFilterChange('dateTo', dates.to);
    }
  };

  const handleSavePreset = () => {
    const trimmed = newPresetName.trim();
    if (!trimmed) return;
    onSavePreset(trimmed);
    setNewPresetName('');
    setShowSavePopover(false);
  };

  const hasFeedbackValue = clientFilters.hasFeedback;

  const cycleFeedbackFilter = () => {
    if (hasFeedbackValue === null || hasFeedbackValue === undefined) {
      onClientFilterChange('hasFeedback', true);
    } else if (hasFeedbackValue === true) {
      onClientFilterChange('hasFeedback', false);
    } else {
      onClientFilterChange('hasFeedback', null);
    }
  };

  const getFeedbackLabel = (): string => {
    if (hasFeedbackValue === null || hasFeedbackValue === undefined) return 'Todos';
    if (hasFeedbackValue === true) return 'Con feedback';
    return 'Sin feedback';
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ===== TIER 1: Always visible ===== */}
      <div className="rounded-xl bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm
                      border border-neutral-200 dark:border-neutral-700 p-4">
        <div className="flex flex-col gap-3">
          {/* Row 1: Search + Date inputs */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar por Call ID o prospecto..."
                value={searchLocal}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg
                           bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700
                           text-neutral-900 dark:text-white placeholder-neutral-400
                           focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                           transition-colors"
              />
              {searchLocal && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full
                             hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-neutral-400" />
                </button>
              )}
            </div>

            {/* Date From */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="date"
                value={serverFilters.dateFrom ?? ''}
                onChange={(e) => onServerFilterChange('dateFrom', e.target.value || undefined)}
                className="pl-9 pr-3 py-2 text-sm rounded-lg
                           bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700
                           text-neutral-900 dark:text-white
                           focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                           transition-colors"
              />
            </div>

            {/* Date To */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="date"
                value={serverFilters.dateTo ?? ''}
                onChange={(e) => onServerFilterChange('dateTo', e.target.value || undefined)}
                className="pl-9 pr-3 py-2 text-sm rounded-lg
                           bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700
                           text-neutral-900 dark:text-white
                           focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                           transition-colors"
              />
            </div>
          </div>

          {/* Row 2: Date quick buttons + Score presets */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Date quick buttons */}
            <div className="flex items-center gap-1.5">
              {LAI_DATE_PRESETS.map((dp) => (
                <button
                  key={dp.id}
                  onClick={() => handleDatePresetClick(dp.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeDatePreset === dp.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                  }`}
                >
                  {dp.label}
                </button>
              ))}
            </div>

            {/* Separator */}
            <div className="hidden sm:block w-px h-5 bg-neutral-200 dark:bg-neutral-700" />

            {/* Score preset buttons */}
            <div className="flex items-center gap-1.5">
              {LAI_SCORE_PRESETS.map((sp) => {
                const styles = SCORE_STYLES[sp.id];
                const isActive = activeScorePreset === sp.id;
                return (
                  <button
                    key={sp.id}
                    onClick={() => onScorePresetChange(sp.id, sp.min, sp.max)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      isActive ? styles.active : styles.inactive
                    }`}
                  >
                    {sp.label}
                  </button>
                );
              })}
            </div>

            {/* Separator */}
            <div className="hidden sm:block w-px h-5 bg-neutral-200 dark:bg-neutral-700" />

            {/* Categoria select */}
            <select
              value={serverFilters.categoriaFilter ?? ''}
              onChange={(e) => onServerFilterChange('categoriaFilter', e.target.value || undefined)}
              className="px-3 py-1.5 text-xs rounded-lg
                         bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700
                         text-neutral-700 dark:text-neutral-300
                         focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                         transition-colors"
            >
              <option value="">Todas las categorias</option>
              {filterOptions.categorias.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Advanced filters toggle */}
            <button
              onClick={() => onToggleAdvanced(!showAdvanced)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                showAdvanced
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtros avanzados
            </button>
          </div>
        </div>
      </div>

      {/* ===== TIER 2: Advanced filters (collapsible) ===== */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            variants={COLLAPSE}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={SMOOTH_TRANSITION}
            className="overflow-hidden"
          >
            <div className="rounded-xl bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm
                            border border-neutral-200 dark:border-neutral-700 p-4">
              <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
                {/* Nivel de interes */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Nivel de interes
                  </label>
                  <select
                    value={serverFilters.nivelInteresFilter ?? ''}
                    onChange={(e) => onServerFilterChange('nivelInteresFilter', e.target.value || undefined)}
                    className="px-3 py-1.5 text-xs rounded-lg
                               bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700
                               text-neutral-700 dark:text-neutral-300
                               focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                               transition-colors"
                  >
                    <option value="">Todos</option>
                    {filterOptions.nivelesInteres.map((ni) => (
                      <option key={ni} value={ni}>{ni.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                {/* Resultado */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Resultado
                  </label>
                  <select
                    value={serverFilters.resultadoFilter ?? ''}
                    onChange={(e) => onServerFilterChange('resultadoFilter', e.target.value || undefined)}
                    className="px-3 py-1.5 text-xs rounded-lg
                               bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700
                               text-neutral-700 dark:text-neutral-300
                               focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                               transition-colors"
                  >
                    <option value="">Todos</option>
                    {filterOptions.resultados.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Checkpoint range */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Checkpoint (0-10)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      placeholder="Min"
                      value={serverFilters.checkpointMin ?? ''}
                      onChange={(e) => onServerFilterChange('checkpointMin', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-16 px-2 py-1.5 text-xs rounded-lg
                                 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700
                                 text-neutral-700 dark:text-neutral-300
                                 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                                 transition-colors"
                    />
                    <span className="text-xs text-neutral-400">-</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      placeholder="Max"
                      value={serverFilters.checkpointMax ?? ''}
                      onChange={(e) => onServerFilterChange('checkpointMax', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-16 px-2 py-1.5 text-xs rounded-lg
                                 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700
                                 text-neutral-700 dark:text-neutral-300
                                 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                                 transition-colors"
                    />
                  </div>
                </div>

                {/* Has feedback toggle */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Feedback
                  </label>
                  <button
                    onClick={cycleFeedbackFilter}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      hasFeedbackValue === null || hasFeedbackValue === undefined
                        ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                        : hasFeedbackValue
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    }`}
                  >
                    {getFeedbackLabel()}
                  </button>
                </div>

                {/* Transferencias estrategicas toggle */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Transferencias
                  </label>
                  <button
                    onClick={() => onClientFilterChange('showOnlyIntelligent', !clientFilters.showOnlyIntelligent)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      clientFilters.showOnlyIntelligent
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    Estrategicas
                  </button>
                </div>

                {/* Clear filters */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-transparent uppercase tracking-wider select-none">
                    _
                  </label>
                  <button
                    onClick={onClearAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                               text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
                               transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Limpiar filtros
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== PRESETS ROW ===== */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />

        {presets.map((preset) => {
          const IconComp = PRESET_ICONS[preset.icon] || Bookmark;
          const isActive = activePresetId === preset.id;

          return (
            <div key={preset.id} className="flex items-center gap-0.5">
              <button
                onClick={() => onApplyPreset(preset.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                }`}
              >
                <IconComp className="w-3 h-3" />
                {preset.name}
              </button>
              {!preset.isBuiltIn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePreset(preset.id);
                  }}
                  className="p-0.5 rounded-full text-neutral-400 hover:text-red-500
                             hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Save preset button */}
        <div className="relative">
          <button
            onClick={() => setShowSavePopover(!showSavePopover)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md
                       bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400
                       hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors
                       border border-dashed border-neutral-300 dark:border-neutral-600"
          >
            <Plus className="w-3 h-3" />
            Guardar
          </button>

          {/* Save popover */}
          <AnimatePresence>
            {showSavePopover && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-1 z-20 p-2.5
                           bg-white dark:bg-neutral-800 rounded-lg shadow-xl
                           border border-neutral-200 dark:border-neutral-700
                           min-w-[200px]"
              >
                <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Nombre del preset
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    ref={saveInputRef}
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePreset();
                      if (e.key === 'Escape') setShowSavePopover(false);
                    }}
                    placeholder="Mi preset..."
                    className="flex-1 px-2 py-1.5 text-xs rounded-md
                               bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700
                               text-neutral-900 dark:text-white placeholder-neutral-400
                               focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                               transition-colors"
                  />
                  <button
                    onClick={handleSavePreset}
                    disabled={!newPresetName.trim()}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-md
                               bg-emerald-600 text-white hover:bg-emerald-700
                               disabled:opacity-40 disabled:cursor-not-allowed
                               transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LAIFiltersPanel;
