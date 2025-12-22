/**
 * ============================================
 * FILTER BAR COMPONENT
 * ============================================
 * Barra de filtros avanzados para la gestión de usuarios
 */

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  X,
  RefreshCw,
  Download,
  Plus,
  ChevronDown,
  SlidersHorizontal
} from 'lucide-react';
import type { UserFilters, SortConfig, RoleName } from '../types';
import type { Coordinacion } from '../../../../services/coordinacionService';

// ============================================
// TYPES
// ============================================

interface FilterBarProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  sortConfig: SortConfig;
  onSortChange: (sort: SortConfig) => void;
  coordinaciones: Coordinacion[];
  onRefresh: () => void;
  onCreateUser: () => void;
  loading: boolean;
  totalResults: number;
  canCreate: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const ROLE_OPTIONS: { value: RoleName | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos los roles' },
  { value: 'admin', label: 'Administrador' },
  { value: 'administrador_operativo', label: 'Admin Operativo' },
  { value: 'coordinador', label: 'Coordinador' },
  { value: 'ejecutivo', label: 'Ejecutivo' },
  { value: 'evaluador', label: 'Evaluador' },
  { value: 'developer', label: 'Desarrollador' }
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'online', label: '🟢 Activo Ahora' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'blocked', label: 'Bloqueados (Moderación)' },
  { value: 'blocked_password', label: 'Bloqueados (Contraseña)' },
  { value: 'archived', label: 'Archivados' }
] as const;

const OPERATIVO_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'operativo', label: 'Operativos' },
  { value: 'no_operativo', label: 'No operativos' }
] as const;

// ============================================
// COMPONENT
// ============================================

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFiltersChange,
  sortConfig,
  onSortChange,
  coordinaciones,
  onRefresh,
  onCreateUser,
  loading,
  totalResults,
  canCreate
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: e.target.value });
  }, [filters, onFiltersChange]);

  const handleRoleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, role: e.target.value as RoleName | 'all' });
  }, [filters, onFiltersChange]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, status: e.target.value as UserFilters['status'] });
  }, [filters, onFiltersChange]);

  const handleOperativoChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, operativo: e.target.value as UserFilters['operativo'] });
  }, [filters, onFiltersChange]);

  const handleCoordinacionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, coordinacion_id: e.target.value });
  }, [filters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    onFiltersChange({
      search: '',
      role: 'all',
      status: 'all',
      operativo: 'all',
      coordinacion_id: 'all'
    });
  }, [onFiltersChange]);

  const hasActiveFilters = 
    filters.search !== '' ||
    filters.role !== 'all' ||
    filters.status !== 'all' ||
    filters.operativo !== 'all' ||
    filters.coordinacion_id !== 'all';

  const activeFilterCount = [
    filters.search !== '',
    filters.role !== 'all',
    filters.status !== 'all',
    filters.operativo !== 'all',
    filters.coordinacion_id !== 'all'
  ].filter(Boolean).length;

  return (
    <div className="w-full">
      {/* Main Filter Row - Compacto y responsivo */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search - Se expande pero tiene un mínimo */}
        <div className="flex-1 min-w-[180px] max-w-xs relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email..."
            value={filters.search}
            onChange={handleSearchChange}
            className="w-full pl-8 pr-7 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ ...filters, search: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filters - Más compactos */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Role Filter */}
          <select
            value={filters.role}
            onChange={handleRoleChange}
            className="px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {ROLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={handleStatusChange}
            className="px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`
              flex items-center gap-1 px-2 py-1.5 text-xs rounded-md border transition-colors
              ${showAdvanced || hasActiveFilters
                ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }
            `}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {activeFilterCount > 0 && (
              <span className="bg-blue-500 text-white text-[10px] px-1 py-0.5 rounded-full leading-none">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Actions - Más compactos */}
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Export */}
          <button
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            title="Exportar"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Create User */}
          {canCreate && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCreateUser}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md hover:from-blue-700 hover:to-indigo-700 shadow-sm shadow-blue-500/25 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuevo Usuario</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Advanced Filters Row - Más compacto */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-2 pt-2 border-t border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center gap-3 flex-wrap">
              {/* Coordinación Filter */}
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                  Coordinación:
                </label>
                <select
                  value={filters.coordinacion_id}
                  onChange={handleCoordinacionChange}
                  className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="all">Todas</option>
                  {coordinaciones.map(coord => (
                    <option key={coord.id} value={coord.id}>
                      {coord.codigo} - {coord.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Operativo Filter */}
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                  Operativo:
                </label>
                <select
                  value={filters.operativo}
                  onChange={handleOperativoChange}
                  className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {OPERATIVO_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Results Count & Clear */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {totalResults} resultado{totalResults !== 1 ? 's' : ''}
                </span>
                
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-0.5 text-[10px] text-red-500 hover:text-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filter Tags - Más compacto */}
      {hasActiveFilters && !showAdvanced && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-500">Filtros:</span>
          
          {filters.role !== 'all' && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
              {ROLE_OPTIONS.find(r => r.value === filters.role)?.label}
              <button 
                onClick={() => onFiltersChange({ ...filters, role: 'all' })}
                className="hover:text-purple-900"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          
          {filters.status !== 'all' && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
              {STATUS_OPTIONS.find(s => s.value === filters.status)?.label}
              <button 
                onClick={() => onFiltersChange({ ...filters, status: 'all' })}
                className="hover:text-blue-900"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          
          {filters.coordinacion_id !== 'all' && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded">
              {coordinaciones.find(c => c.id === filters.coordinacion_id)?.codigo || 'Coord'}
              <button 
                onClick={() => onFiltersChange({ ...filters, coordinacion_id: 'all' })}
                className="hover:text-emerald-900"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          
          {filters.operativo !== 'all' && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
              {OPERATIVO_OPTIONS.find(o => o.value === filters.operativo)?.label}
              <button 
                onClick={() => onFiltersChange({ ...filters, operativo: 'all' })}
                className="hover:text-amber-900"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          
          <button
            onClick={clearFilters}
            className="text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;

