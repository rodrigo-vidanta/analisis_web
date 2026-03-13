/**
 * ============================================
 * LAI ACTIVE FILTERS - Filter Chips Bar
 * ============================================
 *
 * Muestra filtros activos como chips dismissibles.
 * Incluye contador de resultados animado.
 * Glassmorphism pattern.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Tag, TrendingUp, CheckCircle,
  Star, Flag, Search, Target, BarChart3,
} from 'lucide-react';
import type { LAIActiveFilter } from '../../../types/llamadasAITypes';

// ============================================
// TYPES
// ============================================

interface LAIActiveFiltersProps {
  activeFilters: LAIActiveFilter[];
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
  totalRecords: number;
}

// ============================================
// FILTER ICON MAP
// ============================================

const FILTER_ICONS: Record<string, React.ElementType> = {
  date: Calendar,
  categoriaFilter: Tag,
  nivelInteresFilter: TrendingUp,
  resultadoFilter: CheckCircle,
  scoreMin: Star,
  scoreMax: Star,
  checkpointMin: Flag,
  searchQuery: Search,
  showOnlyIntelligent: Target,
};

// ============================================
// COMPONENT
// ============================================

const LAIActiveFilters: React.FC<LAIActiveFiltersProps> = ({
  activeFilters,
  onRemoveFilter,
  onClearAll,
  totalRecords,
}) => {
  return (
    <AnimatePresence>
      {activeFilters.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-wrap items-center gap-2 px-4 py-2.5
                     bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm
                     border border-neutral-200 dark:border-neutral-700
                     rounded-xl overflow-hidden"
        >
          {/* Results count badge */}
          <motion.div
            key={totalRecords}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold
                       bg-emerald-100 dark:bg-emerald-900/30
                       text-emerald-700 dark:text-emerald-300 rounded-full
                       border border-emerald-200 dark:border-emerald-800"
          >
            <BarChart3 className="w-3 h-3" />
            {totalRecords.toLocaleString()} resultado{totalRecords !== 1 ? 's' : ''}
          </motion.div>

          {/* Separator */}
          <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700" />

          {/* Filter chips */}
          {activeFilters.map((filter) => {
            const Icon = FILTER_ICONS[filter.key] || CheckCircle;
            return (
              <motion.span
                key={filter.key}
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium
                           bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm
                           border border-neutral-200 dark:border-neutral-700
                           text-neutral-700 dark:text-neutral-300 rounded-full
                           shadow-sm"
              >
                <Icon className="w-3 h-3 flex-shrink-0 text-neutral-400" />
                <span className="truncate max-w-[140px]">
                  <span className="text-neutral-500">{filter.label}:</span> {filter.displayValue}
                </span>
                <button
                  onClick={() => onRemoveFilter(filter.key)}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30
                             text-neutral-400 hover:text-red-500 dark:hover:text-red-400
                             transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.span>
            );
          })}

          {/* Clear all button */}
          {activeFilters.length >= 2 && (
            <button
              onClick={onClearAll}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium
                         text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
                         rounded-full transition-colors"
            >
              <X className="w-3 h-3" />
              Limpiar todo
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LAIActiveFilters;
