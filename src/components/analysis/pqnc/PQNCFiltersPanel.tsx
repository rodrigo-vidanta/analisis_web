/**
 * PQNCFiltersPanel — Filter Panel for PQNC Calls Module
 *
 * Primary bar with search, date range, agent/result/org selects.
 * Advanced section with call type, direction, quality, audio, duration.
 * Presets section with built-in and custom presets.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Calendar, ChevronDown, SlidersHorizontal,
  CalendarDays, ClipboardCheck, Trophy, Bookmark,
  Plus, Trash2, Save, X, Check,
} from 'lucide-react';
import { COLLAPSE, SLIDE_DOWN, FAST_TRANSITION, SCALE_IN, SMOOTH_TRANSITION } from '../../../styles/tokens/animations';
import type {
  PQNCServerFilters,
  PQNCClientFilters,
  PQNCFilterOptions,
  FilterPreset,
} from '../../../types/pqncTypes';

// ============================================
// TYPES
// ============================================

interface PQNCFiltersPanelProps {
  serverFilters: PQNCServerFilters;
  clientFilters: PQNCClientFilters;
  filterOptions: PQNCFilterOptions;
  presets: FilterPreset[];
  activePresetId: string | null;
  showAdvanced: boolean;
  onServerFilterChange: <K extends keyof PQNCServerFilters>(key: K, value: PQNCServerFilters[K]) => void;
  onClientFilterChange: <K extends keyof PQNCClientFilters>(key: K, value: PQNCClientFilters[K]) => void;
  onToggleAdvanced: (show: boolean) => void;
  onApplyPreset: (id: string) => void;
  onSavePreset: (name: string) => void;
  onDeletePreset: (id: string) => void;
  onClearAll: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const PRESET_ICONS: Record<string, React.ElementType> = {
  CalendarDays,
  ClipboardCheck,
  Trophy,
  Bookmark,
};

// ============================================
// HELPERS
// ============================================

function countAdvancedFilters(
  server: PQNCServerFilters,
  client: PQNCClientFilters
): number {
  let count = 0;
  if (server.organizationFilter) count++;
  if (server.callTypeFilter && server.callTypeFilter.length > 0) count++;
  if (server.directionFilter && server.directionFilter.length > 0) count++;
  if (server.customerQualityFilter && server.customerQualityFilter.length > 0) count++;
  if (server.hasAudio !== undefined && server.hasAudio !== null) count++;
  if (client.durationRange && client.durationRange !== '') count++;
  return count;
}

// ============================================
// COMPONENT
// ============================================

const PQNCFiltersPanel: React.FC<PQNCFiltersPanelProps> = ({
  serverFilters,
  clientFilters,
  filterOptions,
  presets,
  activePresetId,
  showAdvanced,
  onServerFilterChange,
  onClientFilterChange,
  onToggleAdvanced,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onClearAll,
}) => {
  // ---- Local state ----
  const [localSearch, setLocalSearch] = useState(clientFilters.searchQuery);
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState('');

  // ---- Refs ----
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Debounced search ----
  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        onClientFilterChange('searchQuery', value);
      }, 300);
    },
    [onClientFilterChange]
  );

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  // Sync local search when cleared externally
  useEffect(() => {
    if (clientFilters.searchQuery === '' && localSearch !== '') {
      setLocalSearch('');
    }
  }, [clientFilters.searchQuery, localSearch]);

  // ---- Save preset ----
  const handleSavePreset = useCallback(() => {
    if (presetName.trim()) {
      onSavePreset(presetName.trim());
      setPresetName('');
      setShowPresets(false);
    }
  }, [presetName, onSavePreset]);

  // ---- Derived values ----
  const advancedCount = countAdvancedFilters(serverFilters, clientFilters);

  return (
    <div className="space-y-3">
      {/* ============================================ */}
      {/* PRIMARY BAR */}
      {/* ============================================ */}
      <div
        className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl
                    border border-neutral-200 dark:border-neutral-700
                    rounded-xl shadow-sm p-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* ---- Search Input ---- */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar agente, cliente, ID..."
              className="w-full pl-9 pr-3 py-2 text-sm
                         bg-neutral-50 dark:bg-neutral-700/50
                         border border-neutral-200 dark:border-neutral-600
                         rounded-lg text-neutral-800 dark:text-neutral-100
                         placeholder-neutral-400 dark:placeholder-neutral-500
                         focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                         transition-colors"
            />
          </div>

          {/* ---- Date Range ---- */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <input
              type="date"
              value={serverFilters.dateFrom || ''}
              onChange={(e) =>
                onServerFilterChange('dateFrom', e.target.value || undefined)
              }
              className="px-2.5 py-2 text-sm
                         bg-neutral-50 dark:bg-neutral-700/50
                         border border-neutral-200 dark:border-neutral-600
                         rounded-lg text-neutral-800 dark:text-neutral-100
                         focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <span className="text-neutral-400 text-xs">a</span>
            <input
              type="date"
              value={serverFilters.dateTo || ''}
              onChange={(e) =>
                onServerFilterChange('dateTo', e.target.value || undefined)
              }
              className="px-2.5 py-2 text-sm
                         bg-neutral-50 dark:bg-neutral-700/50
                         border border-neutral-200 dark:border-neutral-600
                         rounded-lg text-neutral-800 dark:text-neutral-100
                         focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* ---- Agent Select ---- */}
          <select
            value={serverFilters.agentFilter || ''}
            onChange={(e) =>
              onServerFilterChange('agentFilter', e.target.value || undefined)
            }
            className="px-2.5 py-2 text-sm
                       bg-neutral-50 dark:bg-neutral-700/50
                       border border-neutral-200 dark:border-neutral-600
                       rounded-lg text-neutral-700 dark:text-neutral-300
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                       max-w-[180px]"
          >
            <option value="">Todos los agentes</option>
            {filterOptions.agents.map((agent) => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>

          {/* ---- Result Select ---- */}
          <select
            value={serverFilters.resultFilter || ''}
            onChange={(e) =>
              onServerFilterChange('resultFilter', e.target.value || undefined)
            }
            className="px-2.5 py-2 text-sm
                       bg-neutral-50 dark:bg-neutral-700/50
                       border border-neutral-200 dark:border-neutral-600
                       rounded-lg text-neutral-700 dark:text-neutral-300
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                       max-w-[180px]"
          >
            <option value="">Todos los resultados</option>
            {filterOptions.results.map((result) => (
              <option key={result} value={result}>
                {result.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          {/* ---- Advanced Filters Toggle ---- */}
          <button
            onClick={() => onToggleAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
                       border transition-colors relative
                       ${
                         advancedCount > 0 || showAdvanced
                           ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                           : 'bg-neutral-50 dark:bg-neutral-700/50 border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600'
                       }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filtros</span>
            {advancedCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-indigo-600 text-white">
                {advancedCount}
              </span>
            )}
          </button>

          {/* ---- Spacer ---- */}
          <div className="flex-1 min-w-0" />

          {/* ---- Presets Toggle ---- */}
          <button
            onClick={() => setShowPresets(!showPresets)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
                       border transition-colors
                       ${
                         activePresetId
                           ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                           : 'bg-neutral-50 dark:bg-neutral-700/50 border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600'
                       }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Presets</span>
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* ADVANCED FILTERS */}
      {/* ============================================ */}
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
            <div
              className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl
                          border border-neutral-200 dark:border-neutral-700
                          rounded-xl shadow-sm p-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Organization */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Organización
                  </label>
                  <select
                    value={serverFilters.organizationFilter || ''}
                    onChange={(e) =>
                      onServerFilterChange('organizationFilter', e.target.value || undefined)
                    }
                    className="w-full px-2.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-700/50
                               border border-neutral-200 dark:border-neutral-600 rounded-lg
                               text-neutral-700 dark:text-neutral-300
                               focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Todas</option>
                    {filterOptions.organizations.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Call Type */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Tipo de Llamada
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {filterOptions.callTypes.map((type) => {
                      const isActive = (serverFilters.callTypeFilter || []).includes(type);
                      return (
                        <button
                          key={type}
                          onClick={() => {
                            const current = serverFilters.callTypeFilter || [];
                            const newTypes = isActive
                              ? current.filter((t) => t !== type)
                              : [...current, type];
                            onServerFilterChange('callTypeFilter', newTypes.length > 0 ? newTypes : undefined);
                          }}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors
                            ${
                              isActive
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-neutral-50 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600'
                            }`}
                        >
                          {type.replace(/_/g, ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Direction */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Dirección
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {filterOptions.directions.map((dir) => {
                      const isActive = (serverFilters.directionFilter || []).includes(dir);
                      return (
                        <button
                          key={dir}
                          onClick={() => {
                            const current = serverFilters.directionFilter || [];
                            const newDirs = isActive
                              ? current.filter((d) => d !== dir)
                              : [...current, dir];
                            onServerFilterChange('directionFilter', newDirs.length > 0 ? newDirs : undefined);
                          }}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors
                            ${
                              isActive
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-neutral-50 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600'
                            }`}
                        >
                          {dir}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Customer Quality */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Calidad Cliente
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {filterOptions.customerQualities.map((quality) => {
                      const isActive = (serverFilters.customerQualityFilter || []).includes(quality);
                      return (
                        <button
                          key={quality}
                          onClick={() => {
                            const current = serverFilters.customerQualityFilter || [];
                            const newQualities = isActive
                              ? current.filter((q) => q !== quality)
                              : [...current, quality];
                            onServerFilterChange('customerQualityFilter', newQualities.length > 0 ? newQualities : undefined);
                          }}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors
                            ${
                              isActive
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-neutral-50 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600'
                            }`}
                        >
                          {quality.replace(/_/g, ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Score Range */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Rango de Score
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={serverFilters.qualityScoreMin ?? ''}
                      onChange={(e) =>
                        onServerFilterChange(
                          'qualityScoreMin',
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      placeholder="Min"
                      className="w-20 px-2.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-700/50
                                 border border-neutral-200 dark:border-neutral-600 rounded-lg
                                 text-neutral-700 dark:text-neutral-300
                                 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <span className="text-neutral-400 text-xs">a</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={serverFilters.qualityScoreMax ?? ''}
                      onChange={(e) =>
                        onServerFilterChange(
                          'qualityScoreMax',
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      placeholder="Max"
                      className="w-20 px-2.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-700/50
                                 border border-neutral-200 dark:border-neutral-600 rounded-lg
                                 text-neutral-700 dark:text-neutral-300
                                 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Audio */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Audio
                  </label>
                  <select
                    value={serverFilters.hasAudio === null ? '' : serverFilters.hasAudio === true ? 'true' : 'false'}
                    onChange={(e) => {
                      const val = e.target.value;
                      onServerFilterChange('hasAudio', val === '' ? null : val === 'true');
                    }}
                    className="w-full px-2.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-700/50
                               border border-neutral-200 dark:border-neutral-600 rounded-lg
                               text-neutral-700 dark:text-neutral-300
                               focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Todos</option>
                    <option value="true">Con audio</option>
                    <option value="false">Sin audio</option>
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Duración
                  </label>
                  <select
                    value={clientFilters.durationRange || ''}
                    onChange={(e) =>
                      onClientFilterChange('durationRange', (e.target.value || '') as 'short' | 'medium' | 'long' | '')
                    }
                    className="w-full px-2.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-700/50
                               border border-neutral-200 dark:border-neutral-600 rounded-lg
                               text-neutral-700 dark:text-neutral-300
                               focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Todas</option>
                    <option value="short">Corta (&lt; 2 min)</option>
                    <option value="medium">Media (2-10 min)</option>
                    <option value="long">Larga (&gt; 10 min)</option>
                  </select>
                </div>
              </div>

              {/* Clear advanced */}
              {advancedCount > 0 && (
                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700/50 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">
                    {advancedCount} filtro{advancedCount !== 1 ? 's' : ''} avanzado{advancedCount !== 1 ? 's' : ''} activo{advancedCount !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => {
                      onServerFilterChange('organizationFilter', undefined);
                      onServerFilterChange('callTypeFilter', undefined);
                      onServerFilterChange('directionFilter', undefined);
                      onServerFilterChange('customerQualityFilter', undefined);
                      onServerFilterChange('hasAudio', null);
                      onClientFilterChange('durationRange', '');
                    }}
                    className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  >
                    Limpiar avanzados
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================ */}
      {/* PRESETS */}
      {/* ============================================ */}
      <AnimatePresence>
        {showPresets && (
          <motion.div
            variants={COLLAPSE}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={SMOOTH_TRANSITION}
            className="overflow-hidden"
          >
            <div
              className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl
                          border border-neutral-200 dark:border-neutral-700
                          rounded-xl shadow-sm p-3"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {presets.map((preset) => {
                  const Icon = PRESET_ICONS[preset.icon] || Bookmark;
                  const isActive = activePresetId === preset.id;
                  return (
                    <div key={preset.id} className="relative group">
                      <button
                        onClick={() => onApplyPreset(preset.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                                   border transition-colors
                                   ${
                                     isActive
                                       ? 'bg-indigo-600 text-white border-indigo-600'
                                       : 'bg-neutral-50 dark:bg-neutral-700/50 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600'
                                   }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {preset.name}
                      </button>
                      {!preset.isBuiltIn && (
                        <button
                          onClick={() => onDeletePreset(preset.id)}
                          className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full
                                     bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400
                                     opacity-0 group-hover:opacity-100 transition-opacity
                                     hover:bg-red-200 dark:hover:bg-red-800/40"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Save current filters as preset */}
              <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-700/50">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Nombre del nuevo preset..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-700
                             border border-neutral-200 dark:border-neutral-600 rounded-lg
                             text-neutral-800 dark:text-neutral-100
                             placeholder-neutral-400 dark:placeholder-neutral-500
                             focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                             bg-indigo-600 text-white rounded-lg
                             hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors"
                >
                  <Save className="w-3 h-3" />
                  Guardar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PQNCFiltersPanel;
