/**
 * ============================================
 * LLAMADAS AI DASHBOARD - Shell Component
 * ============================================
 *
 * Componente principal del modulo Llamadas AI (Natalia).
 * Orquesta sub-componentes: filtros, metricas, tabla, detalle.
 * Emerald theme (no indigo como PQNC).
 */

import React, { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Users, List, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLlamadasAIStore } from '../../stores/llamadasAIStore';
import LAIFiltersPanel from './llamadasai/LAIFiltersPanel';
import LAIActiveFilters from './llamadasai/LAIActiveFilters';
import LAIMetricsBar from './llamadasai/LAIMetricsBar';
import LAICallsTable from './llamadasai/LAICallsTable';
import LAIDetailModal from './llamadasai/LAIDetailModal';
import PQNCPagination from './pqnc/PQNCPagination';
import type { LAIUserContext } from '../../types/llamadasAITypes';
import { LAI_PAGE_SIZE_OPTIONS } from '../../types/llamadasAITypes';
import { SLIDE_UP, SMOOTH_TRANSITION } from '../../styles/tokens/animations';

const LlamadasAIDashboard: React.FC = () => {
  const { user } = useAuth();
  const [showPhilosophy, setShowPhilosophy] = useState(false);

  const {
    records,
    totalRecords,
    loading,
    error,
    page,
    pageSize,
    sort,
    serverFilters,
    clientFilters,
    filterOptions,
    presets,
    activePresetId,
    activeScorePreset,
    showAdvancedFilters,
    showDetailModal,
    groupByProspecto,
    expandedGroup,
    metrics,
    metricsLoading,
    initialize,
    setPage,
    setPageSize,
    setSort,
    setServerFilter,
    setClientFilter,
    setScorePreset,
    clearFilters,
    applyPreset,
    savePreset,
    deletePreset,
    setShowAdvancedFilters,
    openDetail,
    closeDetail,
    setGroupByProspecto,
    setExpandedGroup,
    getActiveFilters,
    searchByCallId,
  } = useLlamadasAIStore();

  // Build user context and initialize
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const buildContext = async () => {
      const { permissionsService } = await import('../../services/permissionsService');

      const [isAdmin, isCalidad, ejecutivoFilter, coordinacionesFilter] = await Promise.all([
        permissionsService.isAdmin(user.id),
        permissionsService.isCoordinadorCalidad(user.id),
        permissionsService.getEjecutivoFilter(user.id),
        permissionsService.getCoordinacionesFilter(user.id),
      ]);

      if (cancelled) return;

      const ctx: LAIUserContext = {
        userId: user.id,
        isAdmin,
        isCalidad,
        ejecutivoFilter: ejecutivoFilter ?? null,
        coordinacionesFilter: coordinacionesFilter ?? null,
      };

      await initialize(ctx);
    };

    buildContext();

    return () => {
      cancelled = true;
    };
  }, [user, initialize]);

  // Listen for natalia-search-call-id custom event + localStorage bridge
  useEffect(() => {
    const handleSearchEvent = (e: CustomEvent<{ callId: string }>) => {
      if (e.detail?.callId) {
        searchByCallId(e.detail.callId);
      }
    };

    const handleStorageEvent = () => {
      const callId = localStorage.getItem('natalia-search-call-id');
      if (callId) {
        localStorage.removeItem('natalia-search-call-id');
        searchByCallId(callId);
      }
    };

    window.addEventListener('natalia-search-call-id', handleSearchEvent as EventListener);
    window.addEventListener('storage', handleStorageEvent);

    // Check on mount
    handleStorageEvent();

    return () => {
      window.removeEventListener('natalia-search-call-id', handleSearchEvent as EventListener);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [searchByCallId]);

  const activeFilters = getActiveFilters();

  const handleRemoveFilter = useCallback((key: string) => {
    if (key === 'date') {
      setServerFilter('dateFrom', undefined);
      setServerFilter('dateTo', undefined);
    } else if (key === 'searchQuery') {
      setClientFilter('searchQuery', '');
    } else if (key === 'showOnlyIntelligent') {
      setClientFilter('showOnlyIntelligent', false);
    } else if (key === 'scoreMin') {
      setServerFilter('scoreMin', undefined);
    } else if (key === 'scoreMax') {
      setServerFilter('scoreMax', undefined);
    } else if (key === 'checkpointMin') {
      setServerFilter('checkpointMin', undefined);
    } else {
      setServerFilter(key as keyof typeof serverFilters, undefined);
    }
  }, [setServerFilter, setClientFilter, serverFilters]);

  return (
    <motion.div
      variants={SLIDE_UP}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={SMOOTH_TRANSITION}
      className="flex flex-col gap-4 p-4 md:p-6 min-h-full"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
              Llamadas AI
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Analisis inteligente de llamadas con Natalia
            </p>
          </div>
        </div>

        {/* Grouping toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800
                        border border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => setGroupByProspecto(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              !groupByProspecto
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Lista
          </button>
          <button
            onClick={() => setGroupByProspecto(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              groupByProspecto
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Agrupado
          </button>
        </div>
      </div>

      {/* Natalia philosophy banner */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50
                      bg-emerald-50/80 dark:bg-emerald-900/20 backdrop-blur-sm overflow-hidden">
        <button
          onClick={() => setShowPhilosophy(!showPhilosophy)}
          className="flex items-center justify-between w-full px-4 py-2.5 text-left"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Filosofia de Evaluacion Natalia
            </span>
          </div>
          {showPhilosophy ? (
            <ChevronUp className="w-4 h-4 text-emerald-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-emerald-500" />
          )}
        </button>
        <AnimatePresence>
          {showPhilosophy && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="px-4 pb-3 text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">
                Natalia detecta la temperatura del prospecto y evalua la capacidad del ejecutivo
                para transferir en el momento optimo. Una llamada corta con transferencia estrategica
                a un prospecto con alto interes puede ser mas valiosa que una llamada larga sin resultado.
                El score refleja efectividad real, no solo duracion o cobertura de script.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filters */}
      <LAIFiltersPanel
        serverFilters={serverFilters}
        clientFilters={clientFilters}
        filterOptions={filterOptions}
        presets={presets}
        activePresetId={activePresetId}
        activeScorePreset={activeScorePreset}
        showAdvanced={showAdvancedFilters}
        onServerFilterChange={setServerFilter}
        onClientFilterChange={setClientFilter}
        onScorePresetChange={setScorePreset}
        onToggleAdvanced={setShowAdvancedFilters}
        onApplyPreset={applyPreset}
        onSavePreset={savePreset}
        onDeletePreset={deletePreset}
        onClearAll={clearFilters}
      />

      {/* Active filter chips */}
      <LAIActiveFilters
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={clearFilters}
        totalRecords={totalRecords}
      />

      {/* Metrics bar */}
      <LAIMetricsBar metrics={metrics} loading={metricsLoading} />

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20
                        border border-red-200 dark:border-red-800
                        text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700
                      bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm overflow-hidden">
        <LAICallsTable
          records={records}
          loading={loading}
          sort={sort}
          clientFilters={clientFilters}
          onSort={setSort}
          onOpenDetail={openDetail}
          groupByProspecto={groupByProspecto}
          expandedGroup={expandedGroup}
          onToggleGroup={setExpandedGroup}
          page={page}
        />

        {/* Pagination */}
        <PQNCPagination
          page={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Detail modal */}
      {showDetailModal && (
        <LAIDetailModal />
      )}
    </motion.div>
  );
};

export default LlamadasAIDashboard;
