/**
 * Active Filter Chips Bar
 * Muestra filtros activos como chips dismissibles con animación
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, User, CheckCircle, Building2, Phone,
  ArrowUpDown, Star, Search, Clock, Bookmark, Volume2,
} from 'lucide-react';
import type { ActiveFilter } from '../../../types/pqncTypes';

interface PQNCActiveFiltersProps {
  activeFilters: ActiveFilter[];
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
}

const FILTER_ICONS: Record<string, React.ElementType> = {
  date: Calendar,
  agentFilter: User,
  resultFilter: CheckCircle,
  organizationFilter: Building2,
  callTypeFilter: Phone,
  directionFilter: ArrowUpDown,
  customerQualityFilter: Star,
  qualityScoreMin: Star,
  qualityScoreMax: Star,
  hasAudio: Volume2,
  searchQuery: Search,
  durationRange: Clock,
  bookmarkColor: Bookmark,
};

const PQNCActiveFilters: React.FC<PQNCActiveFiltersProps> = ({
  activeFilters,
  onRemoveFilter,
  onClearAll,
}) => {
  return (
    <AnimatePresence>
      {activeFilters.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-wrap items-center gap-2 px-4 py-2
                     bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm
                     border border-neutral-200 dark:border-neutral-700
                     rounded-xl overflow-hidden"
        >
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

export default PQNCActiveFilters;
