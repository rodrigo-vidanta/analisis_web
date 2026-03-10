import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TemplateAnalyticsRow, TemplateHealthStatus, TemplateHealthTrend } from '../../../types/whatsappTemplates';

type SortColumn = 'template_name' | 'group_name' | 'sends_7d' | 'reply_rate_percent' | 'effectiveness_score' | 'health_status' | 'best_send_hour';
type SortDir = 'asc' | 'desc';

const HEALTH_DOT: Record<TemplateHealthStatus, string> = {
  healthy: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
  dead: 'bg-gray-400',
  no_data: 'bg-gray-300 dark:bg-gray-600',
};

const TREND_ICON: Record<TemplateHealthTrend, { symbol: string; color: string }> = {
  improving: { symbol: '↑', color: 'text-emerald-500' },
  stable: { symbol: '→', color: 'text-gray-400' },
  degrading: { symbol: '↓', color: 'text-amber-500' },
  spiraling: { symbol: '↓↓', color: 'text-red-500' },
  no_data: { symbol: '—', color: 'text-gray-300 dark:text-gray-600' },
};

const ITEMS_PER_PAGE = 25;

interface Props {
  data: TemplateAnalyticsRow[];
  onSelectTemplate: (id: string) => void;
}

const TemplateAnalyticsGrid: React.FC<Props> = ({ data, onSelectTemplate }) => {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<SortColumn>('effectiveness_score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
    setPage(0);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(t =>
      t.template_name.toLowerCase().includes(q) ||
      t.group_name.toLowerCase().includes(q)
    );
  }, [data, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const av = a[sortCol];
      const bv = b[sortCol];

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      if (typeof av === 'string' && typeof bv === 'string') {
        return av.localeCompare(bv) * dir;
      }
      return ((av as number) - (bv as number)) * dir;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const SortHeader: React.FC<{ col: SortColumn; children: React.ReactNode; className?: string }> = ({ col, children, className = '' }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300 transition-colors ${className}`}
      onClick={() => handleSort(col)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortCol === col ? (
          sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Todas las Plantillas
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
            ({filtered.length})
          </span>
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar plantilla..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <SortHeader col="template_name" className="min-w-[200px]">Nombre</SortHeader>
              <SortHeader col="group_name">Grupo</SortHeader>
              <SortHeader col="health_status">Estado</SortHeader>
              <SortHeader col="sends_7d">Envíos 7d</SortHeader>
              <SortHeader col="reply_rate_percent">Tasa Resp.</SortHeader>
              <SortHeader col="effectiveness_score">Efectividad</SortHeader>
              <SortHeader col="best_send_hour">Mejor Hora</SortHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {paginated.map((row, i) => {
              const trend = TREND_ICON[row.trend];
              return (
                <motion.tr
                  key={row.template_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => onSelectTemplate(row.template_id)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[250px]">
                        {row.template_name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[250px]">
                        {row.body_text.slice(0, 60)}{row.body_text.length > 60 ? '...' : ''}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {row.group_name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${HEALTH_DOT[row.health_status]}`} />
                      <span className={`text-xs font-medium ${trend.color}`}>{trend.symbol}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm tabular-nums text-gray-900 dark:text-white">
                      {row.sends_7d.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.reply_rate_percent != null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className={`h-full rounded-full ${
                              row.reply_rate_percent > 15 ? 'bg-emerald-500' :
                              row.reply_rate_percent > 5 ? 'bg-amber-500' : 'bg-red-400'
                            }`}
                            style={{ width: `${Math.min(row.reply_rate_percent, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm tabular-nums text-gray-900 dark:text-white">
                          {row.reply_rate_percent.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.effectiveness_score != null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${Math.min(row.effectiveness_score, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium tabular-nums text-indigo-600 dark:text-indigo-400">
                          {row.effectiveness_score.toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm tabular-nums text-gray-600 dark:text-gray-300">
                      {row.best_send_hour != null ? `${row.best_send_hour}:00` : '—'}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {page * ITEMS_PER_PAGE + 1}–{Math.min((page + 1) * ITEMS_PER_PAGE, sorted.length)} de {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                    page === pageNum
                      ? 'bg-indigo-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TemplateAnalyticsGrid;
