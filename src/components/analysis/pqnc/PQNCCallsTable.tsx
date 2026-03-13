/**
 * PQNC Calls Table
 * Tabla principal con server-side pagination, sorting, y row actions.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpDown, ArrowUp, ArrowDown,
  FileText, Eye, Volume2, VolumeX,
} from 'lucide-react';
import type { CallRecord, PQNCClientFilters, PQNCSortState } from '../../../types/pqncTypes';
import { calcularQualityScorePonderado, type PonderacionConfig } from '../ponderacionConfig';
import FeedbackTooltip from '../FeedbackTooltip';
import BookmarkSelector from '../BookmarkSelector';
import type { FeedbackData } from '../../../services/feedbackService';
import type { BookmarkData, BookmarkColor } from '../../../services/bookmarkService';

// ============================================
// INTERFACE
// ============================================

interface PQNCCallsTableProps {
  calls: CallRecord[];
  loading: boolean;
  sort: PQNCSortState;
  clientFilters: PQNCClientFilters;
  feedbackMap: Map<string, FeedbackData>;
  bookmarkMap: Map<string, BookmarkData>;
  onSort: (field: string, direction: 'asc' | 'desc') => void;
  onOpenDetail: (call: CallRecord) => void;
  onOpenTranscript: (call: CallRecord) => void;
  onBookmarkChange: (callId: string, color: BookmarkColor | null) => void;
  ponderacionConfig: PonderacionConfig;
  page: number;
}

// ============================================
// COLUMNS
// ============================================

const COLUMNS = [
  { key: 'agent_name', label: 'Agente', sortable: true, hiddenMobile: false },
  { key: 'customer_name', label: 'Cliente', sortable: true, hiddenMobile: true },
  { key: 'call_result', label: 'Resultado', sortable: true, hiddenMobile: false },
  { key: 'quality_score', label: 'Score', sortable: true, hiddenMobile: false },
  { key: 'duration', label: 'Duración', sortable: true, hiddenMobile: true },
  { key: 'start_time', label: 'Fecha', sortable: true, hiddenMobile: false },
  { key: 'audio', label: '', sortable: false, hiddenMobile: true },
  { key: 'actions', label: '', sortable: false, hiddenMobile: false },
];

// ============================================
// HELPERS
// ============================================

function getResultBadge(result: string): { bg: string; text: string } {
  const r = (result || '').toLowerCase();
  if (r.includes('venta')) return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' };
  if (r.includes('seguimiento')) return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' };
  if (r.includes('transferencia')) return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' };
  if (r.includes('no_interesado') || r.includes('rechazo')) return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' };
  if (r.includes('no_contesta') || r.includes('buzon')) return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' };
  return { bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-700 dark:text-neutral-300' };
}

function getScoreDot(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'America/Mexico_City' });
  } catch { return iso; }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' });
  } catch { return ''; }
}

function parseDurationSeconds(dur: string): number {
  if (!dur) return 0;
  if (dur.includes(':')) {
    const parts = dur.split(':');
    if (parts.length === 3) {
      return (parseInt(parts[0]) || 0) * 3600 + (parseInt(parts[1]) || 0) * 60 + Math.floor(parseFloat(parts[2]) || 0);
    }
    if (parts.length === 2) {
      return (parseInt(parts[0]) || 0) * 60 + Math.floor(parseFloat(parts[1]) || 0);
    }
  }
  return Math.floor(parseFloat(dur) || 0);
}

function formatDuration(dur: string): string {
  if (!dur) return '\u2014';
  const secs = parseDurationSeconds(dur);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function applyClientFilters(calls: CallRecord[], filters: PQNCClientFilters): CallRecord[] {
  let result = calls;

  if (filters.searchQuery && filters.searchQuery.length >= 2) {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter((c) =>
      (c.id || '').toLowerCase().includes(q) ||
      c.agent_name?.toLowerCase().includes(q) ||
      c.customer_name?.toLowerCase().includes(q) ||
      c.organization?.toLowerCase().includes(q) ||
      c.call_result?.toLowerCase().includes(q) ||
      c.customer_quality?.toLowerCase().includes(q)
    );
  }

  if (filters.durationRange) {
    result = result.filter((c) => {
      const dur = parseDurationSeconds(c.duration);
      if (filters.durationRange === 'short') return dur < 120;
      if (filters.durationRange === 'medium') return dur >= 120 && dur <= 600;
      if (filters.durationRange === 'long') return dur > 600;
      return true;
    });
  }

  return result;
}

// ============================================
// SUB-COMPONENTS
// ============================================

const SortIcon: React.FC<{ field: string; sort: PQNCSortState }> = ({ field, sort }) => {
  if (sort.field !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  return sort.direction === 'asc'
    ? <ArrowUp className="w-3 h-3 text-indigo-500" />
    : <ArrowDown className="w-3 h-3 text-indigo-500" />;
};

// ============================================
// MAIN COMPONENT
// ============================================

const PQNCCallsTable: React.FC<PQNCCallsTableProps> = ({
  calls,
  loading,
  sort,
  clientFilters,
  feedbackMap,
  bookmarkMap,
  onSort,
  onOpenDetail,
  onOpenTranscript,
  onBookmarkChange,
  ponderacionConfig,
  page,
}) => {
  // Apply client-side filters
  const filteredCalls = useMemo(
    () => applyClientFilters(calls, clientFilters),
    [calls, clientFilters]
  );

  // Pre-compute ponderado scores for all calls (batch)
  const ponderadoMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const call of filteredCalls) {
      map.set(call.id, calcularQualityScorePonderado(call, ponderacionConfig));
    }
    return map;
  }, [filteredCalls, ponderacionConfig]);

  const handleSort = (field: string) => {
    if (sort.field === field) {
      onSort(field, sort.direction === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, 'desc');
    }
  };

  // Empty state
  if (!loading && filteredCalls.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <FileText className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mb-3" />
        <p className="text-neutral-500 dark:text-neutral-400 text-sm">
          No se encontraron llamadas con los filtros actuales
        </p>
        <p className="text-neutral-400 dark:text-neutral-500 text-xs mt-1">
          Intenta ajustar los filtros o limpiarlos
        </p>
      </motion.div>
    );
  }

  return (
    <div className="overflow-x-auto relative">
      <table className="w-full">
        <thead>
          <tr className="bg-neutral-50/80 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable && handleSort(col.key)}
                className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider
                           text-neutral-500 dark:text-neutral-400
                           ${col.sortable ? 'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 select-none' : ''}
                           ${col.hiddenMobile ? 'hidden md:table-cell' : ''}`}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && <SortIcon field={col.key} sort={sort} />}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <motion.tbody
          key={`page-${page}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="divide-y divide-neutral-100 dark:divide-neutral-800"
        >
          {filteredCalls.map((call, index) => {
            const ponderado = ponderadoMap.get(call.id) ?? call.quality_score;
            const feedback = feedbackMap.get(call.id);
            const bookmark = bookmarkMap.get(call.id);
            const resultBadge = getResultBadge(call.call_result);
            const hasAudio = Boolean(call.audio_file_url);

            return (
              <tr
                key={call.id}
                onClick={() => onOpenDetail(call)}
                className={`cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors group ${
                  index % 2 === 1 ? 'bg-neutral-50/30 dark:bg-neutral-800/30' : ''
                }`}
              >
                {/* Agent */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <BookmarkSelector
                      callId={call.id}
                      currentColor={bookmark?.bookmark_color || null}
                      onChange={(color) => onBookmarkChange(call.id, color)}
                    />
                    <div>
                      <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate max-w-[160px]">
                        {call.agent_name || '\u2014'}
                      </div>
                      <div className="text-xs text-neutral-400 dark:text-neutral-500 md:hidden">
                        {call.customer_name || '\u2014'}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Customer */}
                <td className="px-3 py-2.5 hidden md:table-cell">
                  <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate max-w-[140px] block">
                    {call.customer_name || '\u2014'}
                  </span>
                </td>

                {/* Result */}
                <td className="px-3 py-2.5">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${resultBadge.bg} ${resultBadge.text}`}>
                    {(call.call_result || '\u2014').replace(/_/g, ' ')}
                  </span>
                </td>

                {/* Score */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getScoreDot(ponderado)}`} />
                    <span className="text-sm font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">
                      {ponderado.toFixed(1)}
                    </span>
                    {feedback && <FeedbackTooltip feedback={feedback} />}
                  </div>
                </td>

                {/* Duration */}
                <td className="px-3 py-2.5 hidden md:table-cell">
                  <span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-400">
                    {formatDuration(call.duration)}
                  </span>
                </td>

                {/* Date */}
                <td className="px-3 py-2.5">
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    <div>{formatDate(call.start_time)}</div>
                    <div className="text-neutral-400 dark:text-neutral-500">{formatTime(call.start_time)}</div>
                  </div>
                </td>

                {/* Audio indicator */}
                <td className="px-2 py-2.5 hidden md:table-cell">
                  {hasAudio
                    ? <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                    : <VolumeX className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600" />
                  }
                </td>

                {/* Actions */}
                <td className="px-2 py-2.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenTranscript(call); }}
                    className="p-1.5 rounded-md text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400
                               hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors
                               opacity-0 group-hover:opacity-100"
                    title="Ver transcripción"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </motion.tbody>
      </table>

      {/* Loading overlay for page changes */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-neutral-900/50 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 rounded-full shadow-lg">
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="text-xs text-neutral-600 dark:text-neutral-300">Cargando...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(PQNCCallsTable);
