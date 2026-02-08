/**
 * ============================================
 * UCHAT ERROR LOGS - Visualizacion de errores WhatsApp
 * ============================================
 *
 * Muestra errores de entrega capturados via Edge Function
 * receive-uchat-error (push desde UChat).
 * Consulta la vista v_whatsapp_errors_detailed.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analysisSupabase } from '../../config/analysisSupabase';
import {
  AlertTriangle, CheckCircle2, XCircle, Search, RefreshCw,
  ExternalLink, ChevronLeft, ChevronRight, Filter, X,
  MessageSquare, Clock, Hash, ArrowUpDown
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================
interface UChatError {
  id: string;
  uchat_user_ns: string;
  phone: string | null;
  error_message: string;
  error_code: string | null;
  detected_at: string;
  detected_date: string;
  source: string;
  uchat_url: string | null;
  created_at: string;
  message_updated: boolean;
  error_title: string | null;
  error_description: string | null;
  error_severity: string | null;
  error_category: string | null;
  is_retryable: boolean | null;
  suggested_action: string | null;
  prospecto_id: string | null;
  prospecto_nombre: string | null;
  prospecto_whatsapp: string | null;
}

interface ErrorStats {
  total: number;
  today: number;
  messagesUpdated: number;
  topErrorCode: string | null;
  topErrorCount: number;
  bySeverity: Record<string, number>;
}

type SortField = 'detected_at' | 'error_code' | 'error_severity' | 'phone';
type SortDir = 'asc' | 'desc';

// ============================================
// HELPERS
// ============================================
const severityConfig: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critico', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/30' },
  high: { label: 'Alto', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  medium: { label: 'Medio', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  low: { label: 'Bajo', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatPhone(phone: string | null): string {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return phone;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
const UChatErrorLogs: React.FC = () => {
  const [errors, setErrors] = useState<UChatError[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<ErrorStats | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterCode, setFilterCode] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [filterMsgUpdated, setFilterMsgUpdated] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Paginacion
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Ordenamiento
  const [sortField, setSortField] = useState<SortField>('detected_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Error codes disponibles
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);

  // ============================================
  // DATA FETCHING
  // ============================================
  const loadErrors = useCallback(async () => {
    setLoading(true);
    try {
      let query = analysisSupabase!
        .from('v_whatsapp_errors_detailed')
        .select('*', { count: 'exact' });

      // Filtros
      if (search) {
        query = query.or(`phone.ilike.%${search}%,prospecto_nombre.ilike.%${search}%,error_message.ilike.%${search}%`);
      }
      if (filterCode) {
        query = query.eq('error_code', filterCode);
      }
      if (filterSeverity) {
        query = query.eq('error_severity', filterSeverity);
      }
      if (filterMsgUpdated === 'true') {
        query = query.eq('message_updated', true);
      } else if (filterMsgUpdated === 'false') {
        query = query.eq('message_updated', false);
      }
      if (dateFrom) {
        query = query.gte('detected_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('detected_date', dateTo);
      }

      // Ordenamiento
      query = query.order(sortField, { ascending: sortDir === 'asc' });

      // Paginacion
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching UChat errors:', error);
        return;
      }

      setErrors((data as UChatError[]) || []);
      setTotalCount(count || 0);
    } finally {
      setLoading(false);
    }
  }, [search, filterCode, filterSeverity, filterMsgUpdated, dateFrom, dateTo, page, sortField, sortDir]);

  const loadStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [totalRes, todayRes, updatedRes, codesRes] = await Promise.all([
        analysisSupabase!.from('whatsapp_delivery_errors').select('id', { count: 'exact', head: true }),
        analysisSupabase!.from('whatsapp_delivery_errors').select('id', { count: 'exact', head: true }).eq('detected_date', today),
        analysisSupabase!.from('whatsapp_delivery_errors').select('id', { count: 'exact', head: true }).eq('message_updated', true),
        analysisSupabase!.from('v_whatsapp_errors_detailed').select('error_code, error_severity'),
      ]);

      // Calcular top error code y severities
      const codeCounts: Record<string, number> = {};
      const severityCounts: Record<string, number> = {};
      const codes = new Set<string>();

      for (const row of (codesRes.data || []) as Array<{ error_code: string | null; error_severity: string | null }>) {
        if (row.error_code) {
          codeCounts[row.error_code] = (codeCounts[row.error_code] || 0) + 1;
          codes.add(row.error_code);
        }
        if (row.error_severity) {
          severityCounts[row.error_severity] = (severityCounts[row.error_severity] || 0) + 1;
        }
      }

      let topCode: string | null = null;
      let topCount = 0;
      for (const [code, count] of Object.entries(codeCounts)) {
        if (count > topCount) {
          topCode = code;
          topCount = count;
        }
      }

      setAvailableCodes(Array.from(codes).sort());
      setStats({
        total: totalRes.count || 0,
        today: todayRes.count || 0,
        messagesUpdated: updatedRes.count || 0,
        topErrorCode: topCode,
        topErrorCount: topCount,
        bySeverity: severityCounts,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadErrors();
  }, [loadErrors]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, filterCode, filterSeverity, filterMsgUpdated, dateFrom, dateTo]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFilterCode('');
    setFilterSeverity('');
    setFilterMsgUpdated('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = search || filterCode || filterSeverity || filterMsgUpdated || dateFrom || dateTo;

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="h-[calc(100vh-200px)] flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header fijo: Stats + Search + Filtros */}
      <div className="flex-shrink-0 p-4 pb-2 space-y-3">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">
                <Hash className="w-3.5 h-3.5" />
                Total Errores
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">
                <Clock className="w-3.5 h-3.5" />
                Hoy
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.today.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Msgs Actualizados
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.messagesUpdated.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Top Error
              </div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.topErrorCode || '-'}
              </div>
              {stats.topErrorCode && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stats.topErrorCount} ocurrencias</div>
              )}
            </div>
          </div>
        )}

        {/* Search & Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por telefono, nombre o mensaje..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
                hasActiveFilters
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>
            <button
              onClick={() => { loadErrors(); loadStats(); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filtros expandidos */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Codigo Error</label>
                  <select
                    value={filterCode}
                    onChange={(e) => setFilterCode(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Todos</option>
                    {availableCodes.map(code => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Severidad</label>
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Todas</option>
                    <option value="critical">Critico</option>
                    <option value="high">Alto</option>
                    <option value="medium">Medio</option>
                    <option value="low">Bajo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Msg Actualizado</label>
                  <select
                    value={filterMsgUpdated}
                    onChange={(e) => setFilterMsgUpdated(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Todos</option>
                    <option value="true">Si</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Desde</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                {hasActiveFilters && (
                  <div className="col-span-full flex justify-end">
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      <X className="w-3 h-3" />
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Area scrollable: Tabla + Paginacion */}
      <div className="flex-1 min-h-0 overflow-hidden px-4 pb-4 flex flex-col">
        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 rounded-lg border border-gray-200 dark:border-gray-700 scrollbar-ultra-thin">
          <table className="w-full min-w-[900px] divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
              <tr>
                <th
                  onClick={() => handleSort('detected_at')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <div className="flex items-center gap-1">
                    Fecha
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('phone')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <div className="flex items-center gap-1">
                    Telefono
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Prospecto
                </th>
                <th
                  onClick={() => handleSort('error_code')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <div className="flex items-center gap-1">
                    Error
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('error_severity')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <div className="flex items-center gap-1">
                    Severidad
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Msg Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  UChat
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">Cargando errores...</span>
                    </div>
                  </td>
                </tr>
              ) : errors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">No hay errores que mostrar</span>
                    </div>
                  </td>
                </tr>
              ) : (
                errors.map((err) => {
                  const sev = severityConfig[err.error_severity || ''] || severityConfig.low;
                  return (
                    <tr key={err.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatDate(err.detected_at || err.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white whitespace-nowrap">
                        {formatPhone(err.phone)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[160px] truncate">
                        {err.prospecto_nombre || (
                          <span className="text-gray-400 dark:text-gray-600 italic text-xs">Sin prospecto</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                            {err.error_code || 'N/A'}
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                            {err.error_title || err.error_description || ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {err.error_severity ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${sev.bg} ${sev.color}`}>
                            {sev.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {err.message_updated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            Si
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            <XCircle className="w-3 h-3" />
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                          err.source === 'uchat_push'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {err.source === 'uchat_push' ? 'Push' : 'Pull'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {err.uchat_url && (
                          <a
                            href={err.uchat_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            title="Abrir en UChat"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacion fija al fondo */}
        {totalPages > 1 && (
          <div className="flex-shrink-0 flex items-center justify-between px-2 pt-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Mostrando {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} de {totalCount.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UChatErrorLogs;
