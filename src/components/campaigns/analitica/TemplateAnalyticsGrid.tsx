import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, ChevronDown, ChevronLeft, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { TemplateAnalyticsRow, TemplateHealthStatus, TemplateHealthTrend, AnalyticsDateRange } from '../../../types/whatsappTemplates';

// ============================================
// CONSTANTS
// ============================================
const HEALTH_DOT: Record<TemplateHealthStatus, string> = {
  healthy: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
  dead: 'bg-gray-400',
  no_data: 'bg-gray-300 dark:bg-gray-600',
};

const HEALTH_LABEL: Record<TemplateHealthStatus, string> = {
  healthy: 'Sano',
  warning: 'Alerta',
  critical: 'Crítico',
  dead: 'Muerto',
  no_data: 'Sin datos',
};

const TREND_ICON: Record<TemplateHealthTrend, { symbol: string; color: string; label: string }> = {
  improving: { symbol: '↑', color: 'text-emerald-500', label: 'Mejorando' },
  stable: { symbol: '→', color: 'text-gray-400', label: 'Estable' },
  degrading: { symbol: '↓', color: 'text-amber-500', label: 'Degradando' },
  spiraling: { symbol: '↓↓', color: 'text-red-500', label: 'En caída' },
  no_data: { symbol: '—', color: 'text-gray-300 dark:text-gray-600', label: 'Sin datos' },
};

const PERIOD_LABELS: Record<AnalyticsDateRange, string> = {
  '24h': '24h',
  'week': '7d',
  'month': '30d',
  '6months': '6m',
  'year': '1a',
};

const ITEMS_PER_PAGE = 20;

// ============================================
// HELPERS
// ============================================
interface GroupAggregate {
  group_id: string;
  group_name: string;
  templates: TemplateAnalyticsRow[];
  templateCount: number;
  sends: number;
  replies: number;
  replyRate: number | null;
  failureRate: number | null;
  effectivenessAvg: number | null;
  healthDistribution: Record<TemplateHealthStatus, number>;
  dominantHealth: TemplateHealthStatus;
  dominantTrend: TemplateHealthTrend;
}

function getPeriodSends(t: TemplateAnalyticsRow, dateRange: AnalyticsDateRange): number {
  switch (dateRange) {
    case '24h': return t.sends_24h;
    case 'week': return t.sends_7d;
    case 'month': return t.sends_last_30d;
    default: return t.total_sends;
  }
}

function getPeriodReplyRate(t: TemplateAnalyticsRow, dateRange: AnalyticsDateRange): number | null {
  switch (dateRange) {
    case '24h': return t.reply_rate_24h;
    case 'week': return t.reply_rate_7d_percent;
    case 'month': return t.reply_rate_30d_percent;
    default: return t.reply_rate_percent;
  }
}

function getDominantValue<T extends string>(counts: Record<T, number>, priority: T[]): T {
  for (const key of priority) {
    if (counts[key] > 0) return key;
  }
  return priority[priority.length - 1];
}

// ============================================
// SORT TYPES
// ============================================
type GroupSortCol = 'group_name' | 'templateCount' | 'sends' | 'replyRate' | 'failureRate' | 'effectivenessAvg';
type SortDir = 'asc' | 'desc';

// ============================================
// COMPONENT
// ============================================
interface Props {
  data: TemplateAnalyticsRow[];
  dateRange: AnalyticsDateRange;
  onSelectTemplate: (id: string) => void;
}

const TemplateAnalyticsGrid: React.FC<Props> = ({ data, dateRange, onSelectTemplate }) => {
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<GroupSortCol>('sends');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const periodLabel = PERIOD_LABELS[dateRange];

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleSort = (col: GroupSortCol) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
    setPage(0);
  };

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(t =>
      t.template_name.toLowerCase().includes(q) ||
      t.group_name.toLowerCase().includes(q)
    );
  }, [data, search]);

  // Group and aggregate
  const groups = useMemo((): GroupAggregate[] => {
    const map = new Map<string, TemplateAnalyticsRow[]>();
    for (const t of filtered) {
      const existing = map.get(t.group_id) || [];
      existing.push(t);
      map.set(t.group_id, existing);
    }

    return Array.from(map.entries()).map(([group_id, templates]) => {
      const sends = templates.reduce((s, t) => s + getPeriodSends(t, dateRange), 0);
      const replies = templates.reduce((s, t) => s + t.total_replies, 0);

      const withReplyRate = templates.filter(t => getPeriodReplyRate(t, dateRange) != null);
      const replyRate = withReplyRate.length > 0
        ? withReplyRate.reduce((s, t) => s + (getPeriodReplyRate(t, dateRange) || 0), 0) / withReplyRate.length
        : null;

      const withFailure = templates.filter(t => t.failure_rate_7d != null);
      const failureRate = withFailure.length > 0
        ? withFailure.reduce((s, t) => s + (t.failure_rate_7d || 0), 0) / withFailure.length
        : null;

      const withEff = templates.filter(t => t.effectiveness_score != null && t.effectiveness_score > 0);
      const effectivenessAvg = withEff.length > 0
        ? withEff.reduce((s, t) => s + (t.effectiveness_score || 0), 0) / withEff.length
        : null;

      const healthDistribution: Record<TemplateHealthStatus, number> = { healthy: 0, warning: 0, critical: 0, dead: 0, no_data: 0 };
      const trendCounts: Record<TemplateHealthTrend, number> = { improving: 0, stable: 0, degrading: 0, spiraling: 0, no_data: 0 };
      for (const t of templates) {
        healthDistribution[t.health_status]++;
        trendCounts[t.trend]++;
      }

      const dominantHealth = getDominantValue(healthDistribution, ['critical', 'warning', 'dead', 'healthy', 'no_data']);
      const dominantTrend = getDominantValue(trendCounts, ['spiraling', 'degrading', 'stable', 'improving', 'no_data']);

      return {
        group_id,
        group_name: templates[0].group_name,
        templates: [...templates].sort((a, b) =>
          getPeriodSends(b, dateRange) - getPeriodSends(a, dateRange)
        ),
        templateCount: templates.length,
        sends,
        replies,
        replyRate,
        failureRate,
        effectivenessAvg,
        healthDistribution,
        dominantHealth,
        dominantTrend,
      };
    });
  }, [filtered, dateRange]);

  // Sort groups
  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [groups, sortCol, sortDir]);

  // Pagination
  const totalPages = Math.ceil(sortedGroups.length / ITEMS_PER_PAGE);
  const paginatedGroups = sortedGroups.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const SortHeader: React.FC<{ col: GroupSortCol; children: React.ReactNode; className?: string }> = ({ col, children, className = '' }) => (
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

  // Rate bar helper
  const RateBar: React.FC<{ value: number | null; thresholds?: [number, number]; color?: string }> = ({
    value, thresholds = [5, 15], color
  }) => {
    if (value == null) return <span className="text-sm text-gray-400">—</span>;
    const barColor = color || (value > thresholds[1] ? 'bg-emerald-500' : value > thresholds[0] ? 'bg-amber-500' : 'bg-red-400');
    return (
      <div className="flex items-center gap-2">
        <div className="w-14 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(value, 100)}%` }} />
        </div>
        <span className="text-sm tabular-nums text-gray-900 dark:text-white">{value.toFixed(1)}%</span>
      </div>
    );
  };

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
          Plantillas por Grupo
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
            ({groups.length} grupos · {filtered.length} plantillas)
          </span>
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); setExpandedGroups(new Set()); }}
            className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none w-56"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="w-10 px-2 py-3" />
              <SortHeader col="group_name" className="min-w-[180px]">Nombre</SortHeader>
              <SortHeader col="templateCount">Plantillas</SortHeader>
              <SortHeader col="sends">{`Envíos ${periodLabel}`}</SortHeader>
              <SortHeader col="replyRate">{`Tasa Resp. ${periodLabel}`}</SortHeader>
              <SortHeader col="failureRate">Tasa Fallo</SortHeader>
              <SortHeader col="effectivenessAvg">Efectividad</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tendencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {paginatedGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.group_id);
              const trend = TREND_ICON[group.dominantTrend];

              return (
                <React.Fragment key={group.group_id}>
                  {/* Group row */}
                  <tr
                    onClick={() => toggleGroup(group.group_id)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors bg-gray-25 dark:bg-gray-800/50"
                  >
                    <td className="px-2 py-3 text-center">
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{group.group_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                        {group.templateCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                        {group.sends.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RateBar value={group.replyRate} />
                    </td>
                    <td className="px-4 py-3">
                      <RateBar value={group.failureRate} thresholds={[10, 25]} color={
                        group.failureRate != null ? (group.failureRate < 10 ? 'bg-emerald-500' : group.failureRate < 25 ? 'bg-amber-500' : 'bg-red-500') : undefined
                      } />
                    </td>
                    <td className="px-4 py-3">
                      {group.effectivenessAvg != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(group.effectivenessAvg, 100)}%` }} />
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                            {group.effectivenessAvg.toFixed(1)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${HEALTH_DOT[group.dominantHealth]}`} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{HEALTH_LABEL[group.dominantHealth]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${trend.color}`}>
                        {trend.symbol} {trend.label}
                      </span>
                    </td>
                  </tr>

                  {/* Expanded template rows */}
                  <AnimatePresence>
                    {isExpanded && group.templates.map((row, i) => {
                      const rowTrend = TREND_ICON[row.trend];
                      const periodSends = getPeriodSends(row, dateRange);
                      const periodRate = getPeriodReplyRate(row, dateRange);

                      return (
                        <motion.tr
                          key={row.template_id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ delay: i * 0.02, duration: 0.2 }}
                          onClick={() => onSelectTemplate(row.template_id)}
                          className="cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors border-l-2 border-l-indigo-200 dark:border-l-indigo-800"
                        >
                          <td className="px-2 py-2.5" />
                          <td className="px-4 py-2.5 pl-8">
                            <div>
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[220px]">
                                {row.template_name}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[220px]">
                                {row.body_text.slice(0, 55)}{row.body_text.length > 55 ? '...' : ''}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs text-gray-400 dark:text-gray-500">{row.category}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
                              {periodSends.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <RateBar value={periodRate} />
                          </td>
                          <td className="px-4 py-2.5">
                            <RateBar value={row.failure_rate_7d} thresholds={[10, 25]} color={
                              row.failure_rate_7d != null ? (row.failure_rate_7d < 10 ? 'bg-emerald-500' : row.failure_rate_7d < 25 ? 'bg-amber-500' : 'bg-red-500') : undefined
                            } />
                          </td>
                          <td className="px-4 py-2.5">
                            {row.effectiveness_score != null ? (
                              <div className="flex items-center gap-2">
                                <div className="w-10 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(row.effectiveness_score, 100)}%` }} />
                                </div>
                                <span className="text-sm tabular-nums text-indigo-600 dark:text-indigo-400">
                                  {row.effectiveness_score.toFixed(1)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${HEALTH_DOT[row.health_status]}`} />
                              <span className="text-xs text-gray-500 dark:text-gray-400">{HEALTH_LABEL[row.health_status]}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-medium ${rowTrend.color}`}>
                              {rowTrend.symbol} {rowTrend.label}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {page * ITEMS_PER_PAGE + 1}–{Math.min((page + 1) * ITEMS_PER_PAGE, sortedGroups.length)} de {sortedGroups.length} grupos
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
