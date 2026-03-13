/**
 * ============================================
 * LAI CALLS TABLE - Paginated Data Table
 * ============================================
 *
 * Tabla con soporte para vista lista y agrupada.
 * Score badges, category pills, checkpoint progress,
 * intelligent transfer indicator, skeleton loading.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpDown, ArrowUp, ArrowDown,
  ChevronRight, ChevronDown, Users,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import type {
  LAIEnrichedRecord,
  LAIClientFilters,
  LAISortState,
  LAICallGroup,
} from '../../../types/llamadasAITypes';
import { FAST_TRANSITION } from '../../../styles/tokens/animations';

// ============================================
// TYPES
// ============================================

interface LAICallsTableProps {
  records: LAIEnrichedRecord[];
  loading: boolean;
  sort: LAISortState;
  clientFilters: LAIClientFilters;
  onSort: (field: string, direction: 'asc' | 'desc') => void;
  onOpenDetail: (record: LAIEnrichedRecord) => void;
  groupByProspecto: boolean;
  expandedGroup: string | null;
  onToggleGroup: (prospectoNombre: string) => void;
  page: number;
}

// ============================================
// COLUMNS
// ============================================

interface ColumnDef {
  key: string;
  label: string;
  sortable: boolean;
  hiddenMobile: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'call_id', label: 'Call ID', sortable: false, hiddenMobile: false },
  { key: 'prospecto_nombre', label: 'Prospecto', sortable: false, hiddenMobile: true },
  { key: 'score_general', label: 'Score', sortable: true, hiddenMobile: false },
  { key: 'categoria_desempeno', label: 'Categoria', sortable: true, hiddenMobile: false },
  { key: 'checkpoint_alcanzado', label: 'Checkpoint', sortable: true, hiddenMobile: true },
  { key: 'nivel_interes_detectado', label: 'Interes', sortable: true, hiddenMobile: true },
  { key: 'resultado_llamada', label: 'Resultado', sortable: false, hiddenMobile: true },
  { key: 'created_at', label: 'Fecha', sortable: true, hiddenMobile: false },
];

// ============================================
// HELPERS
// ============================================

function getCategoryBadge(cat: string): { bg: string; text: string } {
  const upper = cat?.toUpperCase() ?? '';
  if (upper.includes('EXCELENTE') || upper.includes('MAESTR'))
    return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' };
  if (upper.includes('BUENO') || upper.includes('BUENA') || upper.includes('COMPETENTE'))
    return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' };
  if (upper.includes('REGULAR') || upper.includes('MEDIO') || upper.includes('ADECUAD'))
    return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' };
  if (upper.includes('NECESITA') || upper.includes('DEFICIENTE') || upper.includes('BAJO'))
    return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' };
  return { bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-600 dark:text-neutral-400' };
}

function getInterestBadge(interest: string): { bg: string; text: string } {
  const upper = interest?.toUpperCase() ?? '';
  if (upper === 'ALTO' || upper === 'MUY_ALTO' || upper === 'MUY ALTO')
    return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' };
  if (upper === 'MEDIO')
    return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' };
  if (upper === 'BAJO' || upper === 'NULO' || upper === 'MUY_BAJO')
    return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' };
  return { bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-600 dark:text-neutral-400' };
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function getScoreTextColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-blue-600 dark:text-blue-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function applyClientFilters(records: LAIEnrichedRecord[], filters: LAIClientFilters): LAIEnrichedRecord[] {
  let filtered = records;

  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    filtered = filtered.filter((r) =>
      r.call_id.toLowerCase().includes(q) ||
      (r.prospecto_nombre?.toLowerCase().includes(q) ?? false)
    );
  }

  if (filters.showOnlyIntelligent) {
    filtered = filtered.filter((r) => r.is_intelligent_transfer);
  }

  if (filters.hasFeedback === true) {
    filtered = filtered.filter((r) => r.total_puntos_positivos > 0 || r.total_areas_mejora > 0);
  } else if (filters.hasFeedback === false) {
    filtered = filtered.filter((r) => r.total_puntos_positivos === 0 && r.total_areas_mejora === 0);
  }

  return filtered;
}

function groupRecordsByProspecto(records: LAIEnrichedRecord[]): LAICallGroup[] {
  const groupMap = new Map<string, LAIEnrichedRecord[]>();

  records.forEach((r) => {
    const key = r.prospecto_nombre ?? 'Sin prospecto';
    const existing = groupMap.get(key);
    if (existing) {
      existing.push(r);
    } else {
      groupMap.set(key, [r]);
    }
  });

  const groups: LAICallGroup[] = [];
  groupMap.forEach((groupRecords, prospectoNombre) => {
    const sorted = [...groupRecords].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const scores = sorted.map((r) => r.score_general);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    let scoreTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (scores.length >= 2) {
      const recentAvg = scores.slice(0, Math.ceil(scores.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(scores.length / 2);
      const olderAvg = scores.slice(Math.ceil(scores.length / 2)).reduce((a, b) => a + b, 0) / (scores.length - Math.ceil(scores.length / 2));
      if (recentAvg > olderAvg + 3) scoreTrend = 'improving';
      else if (recentAvg < olderAvg - 3) scoreTrend = 'declining';
    }

    groups.push({
      prospectoNombre,
      prospectoId: sorted[0].prospecto_id ?? null,
      callCount: sorted.length,
      records: sorted,
      latestRecord: sorted[0],
      avgScore,
      dateRange: {
        from: sorted[sorted.length - 1].created_at,
        to: sorted[0].created_at,
      },
      scoreTrend,
    });
  });

  return groups.sort((a, b) => new Date(b.latestRecord.created_at).getTime() - new Date(a.latestRecord.created_at).getTime());
}

// ============================================
// SKELETON ROW
// ============================================

const SkeletonRow: React.FC<{ index: number }> = ({ index }) => (
  <tr className={index % 2 === 0 ? 'bg-white dark:bg-neutral-900/30' : 'bg-neutral-50/50 dark:bg-neutral-800/30'}>
    {COLUMNS.map((col) => (
      <td
        key={col.key}
        className={`px-3 py-3 ${col.hiddenMobile ? 'hidden lg:table-cell' : ''}`}
      >
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
    ))}
  </tr>
);

// ============================================
// SORT HEADER
// ============================================

const SortHeader: React.FC<{
  col: ColumnDef;
  sort: LAISortState;
  onSort: (field: string, direction: 'asc' | 'desc') => void;
}> = ({ col, sort, onSort }) => {
  const isActive = sort.field === col.key;

  const handleClick = () => {
    if (!col.sortable) return;
    if (isActive) {
      onSort(col.key, sort.direction === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(col.key, 'desc');
    }
  };

  return (
    <th
      className={`px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider
                  text-neutral-500 dark:text-neutral-400
                  ${col.hiddenMobile ? 'hidden lg:table-cell' : ''}
                  ${col.sortable ? 'cursor-pointer select-none hover:text-neutral-700 dark:hover:text-neutral-200' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1">
        {col.label}
        {col.sortable && (
          isActive ? (
            sort.direction === 'asc' ? (
              <ArrowUp className="w-3 h-3 text-emerald-500" />
            ) : (
              <ArrowDown className="w-3 h-3 text-emerald-500" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-30" />
          )
        )}
      </div>
    </th>
  );
};

// ============================================
// DATA ROW
// ============================================

const DataRow: React.FC<{
  record: LAIEnrichedRecord;
  index: number;
  onOpenDetail: (record: LAIEnrichedRecord) => void;
  indented?: boolean;
}> = ({ record, index, onOpenDetail, indented }) => {
  const catBadge = getCategoryBadge(record.categoria_desempeno);
  const interestBadge = getInterestBadge(record.nivel_interes_detectado);
  const scoreColor = getScoreColor(record.score_general);
  const scoreText = getScoreTextColor(record.score_general);
  const checkpointPercent = Math.min((record.checkpoint_alcanzado / 10) * 100, 100);

  return (
    <tr
      onClick={() => onOpenDetail(record)}
      className={`cursor-pointer transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10
                  ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900/30' : 'bg-neutral-50/50 dark:bg-neutral-800/30'}
                  ${indented ? 'border-l-2 border-emerald-400 dark:border-emerald-600' : ''}`}
    >
      {/* Call ID */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          {record.is_intelligent_transfer && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Transferencia estrategica" />
          )}
          <span className="text-xs font-mono text-neutral-700 dark:text-neutral-300">
            {record.call_id.slice(0, 8)}
          </span>
        </div>
      </td>

      {/* Prospecto */}
      <td className="px-3 py-2.5 hidden lg:table-cell">
        <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate max-w-[150px] block">
          {record.prospecto_nombre ?? 'Sin prospecto'}
        </span>
      </td>

      {/* Score */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${scoreColor} flex-shrink-0`} />
          <span className={`text-xs font-bold ${scoreText}`}>
            {record.score_general}
          </span>
        </div>
      </td>

      {/* Categoria */}
      <td className="px-3 py-2.5">
        <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${catBadge.bg} ${catBadge.text}`}>
          {record.categoria_desempeno}
        </span>
      </td>

      {/* Checkpoint */}
      <td className="px-3 py-2.5 hidden lg:table-cell">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${scoreColor}`}
              style={{ width: `${checkpointPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
            {record.checkpoint_alcanzado}/10
          </span>
        </div>
      </td>

      {/* Interes */}
      <td className="px-3 py-2.5 hidden lg:table-cell">
        <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${interestBadge.bg} ${interestBadge.text}`}>
          {(record.nivel_interes_detectado ?? '').replace(/_/g, ' ')}
        </span>
      </td>

      {/* Resultado */}
      <td className="px-3 py-2.5 hidden lg:table-cell">
        <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate max-w-[180px] block">
          {(record.resultado_llamada ?? '').length > 30
            ? `${record.resultado_llamada.slice(0, 30)}...`
            : record.resultado_llamada ?? '-'}
        </span>
      </td>

      {/* Fecha */}
      <td className="px-3 py-2.5">
        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
          {formatDate(record.created_at)}
        </span>
      </td>
    </tr>
  );
};

// ============================================
// GROUP HEADER ROW
// ============================================

const GroupHeaderRow: React.FC<{
  group: LAICallGroup;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ group, isExpanded, onToggle }) => {
  const scoreColor = getScoreColor(group.avgScore);
  const scoreText = getScoreTextColor(group.avgScore);
  const TrendIcon = group.scoreTrend === 'improving'
    ? TrendingUp
    : group.scoreTrend === 'declining'
      ? TrendingDown
      : Minus;
  const trendColor = group.scoreTrend === 'improving'
    ? 'text-emerald-500'
    : group.scoreTrend === 'declining'
      ? 'text-red-500'
      : 'text-neutral-400';

  return (
    <tr
      onClick={onToggle}
      className="cursor-pointer bg-neutral-100/80 dark:bg-neutral-800/80
                 hover:bg-neutral-200/80 dark:hover:bg-neutral-700/80 transition-colors
                 border-b border-neutral-200 dark:border-neutral-700"
    >
      <td colSpan={COLUMNS.length} className="px-3 py-2.5">
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-neutral-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-neutral-500 flex-shrink-0" />
          )}
          <Users className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span className="text-sm font-medium text-neutral-900 dark:text-white">
            {group.prospectoNombre}
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {group.callCount} {group.callCount === 1 ? 'llamada' : 'llamadas'}
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className={`w-2 h-2 rounded-full ${scoreColor}`} />
            <span className={`text-xs font-bold ${scoreText}`}>
              {group.avgScore} avg
            </span>
            <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
          </div>
        </div>
      </td>
    </tr>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const LAICallsTable: React.FC<LAICallsTableProps> = ({
  records,
  loading,
  sort,
  clientFilters,
  onSort,
  onOpenDetail,
  groupByProspecto,
  expandedGroup,
  onToggleGroup,
  page,
}) => {
  const filteredRecords = useMemo(
    () => applyClientFilters(records, clientFilters),
    [records, clientFilters]
  );

  const groups = useMemo(
    () => groupByProspecto ? groupRecordsByProspecto(filteredRecords) : [],
    [groupByProspecto, filteredRecords]
  );

  const showSkeleton = loading && records.length === 0;
  const isEmpty = !loading && filteredRecords.length === 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px]">
        {/* Header */}
        <thead className="border-b border-neutral-200 dark:border-neutral-700
                          bg-neutral-50/80 dark:bg-neutral-800/80">
          <tr>
            {COLUMNS.map((col) => (
              <SortHeader key={col.key} col={col} sort={sort} onSort={onSort} />
            ))}
          </tr>
        </thead>

        {/* Body */}
        <motion.tbody
          key={page}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={FAST_TRANSITION}
        >
          {/* Skeleton loading */}
          {showSkeleton && (
            <>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={`skeleton-${i}`} index={i} />
              ))}
            </>
          )}

          {/* Empty state */}
          {isEmpty && (
            <tr>
              <td colSpan={COLUMNS.length} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800
                                  flex items-center justify-center">
                    <Users className="w-6 h-6 text-neutral-400" />
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    No se encontraron analisis con los filtros actuales
                  </p>
                </div>
              </td>
            </tr>
          )}

          {/* Grouped view */}
          {groupByProspecto && !showSkeleton && groups.map((group) => {
            const isExpanded = expandedGroup === group.prospectoNombre;
            return (
              <React.Fragment key={group.prospectoNombre}>
                <GroupHeaderRow
                  group={group}
                  isExpanded={isExpanded}
                  onToggle={() => onToggleGroup(isExpanded ? null : group.prospectoNombre)}
                />
                {isExpanded && group.records.map((record, idx) => (
                  <DataRow
                    key={record.analysis_id}
                    record={record}
                    index={idx}
                    onOpenDetail={onOpenDetail}
                    indented
                  />
                ))}
              </React.Fragment>
            );
          })}

          {/* Flat list view */}
          {!groupByProspecto && !showSkeleton && filteredRecords.map((record, idx) => (
            <DataRow
              key={record.analysis_id}
              record={record}
              index={idx}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </motion.tbody>
      </table>
    </div>
  );
};

export default LAICallsTable;
