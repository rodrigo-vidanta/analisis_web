/**
 * ============================================
 * SERVICIO DE LLAMADAS PQNC
 * ============================================
 *
 * Encapsula toda la lógica de data fetching para el
 * módulo Llamadas PQNC. Usa pqncSecureClient para
 * queries server-side via Edge Function multi-db-proxy.
 */

import { pqncSecureClient } from './pqncSecureClient';
import type {
  CallRecord,
  CallSegment,
  PQNCServerFilters,
  PQNCSortState,
  PaginatedResult,
  PQNCFilterOptions,
  PQNCMetrics,
  CALL_LIST_COLUMNS,
  CALL_DETAIL_COLUMNS,
} from '../types/pqncTypes';
import {
  CALL_LIST_COLUMNS as LIST_COLS,
  CALL_DETAIL_COLUMNS as DETAIL_COLS,
  DEFAULT_PAGE_SIZE,
} from '../types/pqncTypes';
import { calcularQualityScorePonderado, calcularProbabilidadConversion, definirConfiguracion } from '../components/analysis/ponderacionConfig';

const ponderacionConfig = definirConfiguracion();

/**
 * Aplica filtros server-side a un query builder
 */
function applyServerFilters(
  query: ReturnType<typeof pqncSecureClient.from>,
  filters: PQNCServerFilters
): ReturnType<typeof pqncSecureClient.from> {
  let q = query;

  if (filters.dateFrom) {
    q = q.gte('start_time', filters.dateFrom);
  }
  if (filters.dateTo) {
    q = q.lte('start_time', `${filters.dateTo}T23:59:59`);
  }
  if (filters.agentFilter) {
    q = q.eq('agent_name', filters.agentFilter);
  }
  if (filters.resultFilter) {
    q = q.eq('call_result', filters.resultFilter);
  }
  if (filters.organizationFilter) {
    q = q.eq('organization', filters.organizationFilter);
  }
  if (filters.callTypeFilter && filters.callTypeFilter.length > 0) {
    q = q.in('call_type', filters.callTypeFilter);
  }
  if (filters.directionFilter && filters.directionFilter.length > 0) {
    q = q.in('direction', filters.directionFilter);
  }
  if (filters.customerQualityFilter && filters.customerQualityFilter.length > 0) {
    q = q.in('customer_quality', filters.customerQualityFilter);
  }
  if (filters.qualityScoreMin !== undefined && filters.qualityScoreMin > 0) {
    q = q.gte('quality_score', filters.qualityScoreMin);
  }
  if (filters.qualityScoreMax !== undefined && filters.qualityScoreMax < 100) {
    q = q.lte('quality_score', filters.qualityScoreMax);
  }
  if (filters.hasAudio === true) {
    q = q.not('audio_file_url', 'is', null);
  } else if (filters.hasAudio === false) {
    q = q.is('audio_file_url', null);
  }

  return q;
}

/**
 * Fetch paginated calls with server-side filtering and sorting
 */
export async function fetchCalls(
  params: {
    page: number;
    pageSize: number;
    sort: PQNCSortState;
    filters: PQNCServerFilters;
  }
): Promise<PaginatedResult<CallRecord>> {
  const { page, pageSize, sort, filters } = params;
  const offset = (page - 1) * pageSize;

  // Data query
  let dataQuery = pqncSecureClient
    .from<CallRecord>('calls')
    .select(LIST_COLS);

  dataQuery = applyServerFilters(dataQuery, filters) as typeof dataQuery;
  dataQuery = dataQuery
    .order(sort.field, { ascending: sort.direction === 'asc' })
    .range(offset, offset + pageSize - 1);

  // Count query (parallel)
  let countQuery = pqncSecureClient
    .from('calls')
    .select('*', { count: 'exact', head: true });
  countQuery = applyServerFilters(countQuery, filters);

  const [dataResult, countResult] = await Promise.all([dataQuery, countQuery]);

  if (dataResult.error) {
    throw new Error(dataResult.error.message);
  }

  return {
    data: (dataResult.data as CallRecord[]) || [],
    total: countResult.count ?? 0,
    page,
    pageSize,
  };
}

/**
 * Fetch detailed call data (all columns including JSON fields)
 */
export async function fetchCallDetail(callId: string): Promise<CallRecord | null> {
  const { data, error } = await pqncSecureClient
    .from<CallRecord>('calls')
    .select(DETAIL_COLS)
    .eq('id', callId)
    .single();

  if (error) {
    console.error('Error loading call detail:', error);
    return null;
  }

  return data as CallRecord | null;
}

/**
 * Fetch call transcript segments
 */
export async function fetchTranscript(callId: string): Promise<CallSegment[]> {
  const { data, error } = await pqncSecureClient
    .from<CallSegment>('call_segments')
    .select('*')
    .eq('call_id', callId)
    .order('segment_index', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as CallSegment[]) || [];
}

/**
 * Fetch unique values for filter dropdowns (cached client-side)
 */
export async function fetchFilterOptions(): Promise<PQNCFilterOptions> {
  const fields = ['agent_name', 'call_result', 'organization', 'call_type', 'direction', 'customer_quality'];

  const results = await Promise.all(
    fields.map(async (field) => {
      // Paginate to get ALL unique values (not just first 1000 rows)
      const allValues: string[] = [];
      let offset = 0;
      const BATCH = 1000;

      while (true) {
        const { data } = await pqncSecureClient
          .from('calls')
          .select(field)
          .not(field, 'is', null)
          .order(field, { ascending: true })
          .range(offset, offset + BATCH - 1);

        if (!data || !Array.isArray(data) || data.length === 0) break;

        for (const row of data as Record<string, string>[]) {
          if (row[field]) allValues.push(row[field]);
        }

        if (data.length < BATCH) break;
        offset += BATCH;
      }

      return [...new Set(allValues)].sort();
    })
  );

  return {
    agents: results[0],
    results: results[1],
    organizations: results[2],
    callTypes: results[3],
    directions: results[4],
    customerQualities: results[5],
  };
}

/**
 * Fetch aggregate metrics for the current filtered set.
 * Uses count query for totalCalls + paginated batches for averages.
 */
export async function fetchMetrics(filters: PQNCServerFilters): Promise<PQNCMetrics> {
  const BATCH_SIZE = 1000;
  const emptyMetrics: PQNCMetrics = {
    totalCalls: 0, avgQuality: 0, avgQualityPonderada: 0, avgDuration: 0,
    successRate: 0, avgConversionProb: 0, avgAgentPerformance: 0, avgRapportScore: 0,
  };

  // 1. Get exact count first
  let countQuery = pqncSecureClient
    .from('calls')
    .select('*', { count: 'exact', head: true });
  countQuery = applyServerFilters(countQuery, filters);

  const { count: totalCount, error: countError } = await countQuery;
  if (countError || !totalCount || totalCount === 0) {
    return { ...emptyMetrics, totalCalls: totalCount ?? 0 };
  }

  // 2. Fetch all records in batches for averages
  let allRecords: Pick<CallRecord, 'quality_score' | 'duration' | 'call_result' | 'customer_quality'>[] = [];
  let offset = 0;

  while (offset < totalCount) {
    let batchQuery = pqncSecureClient
      .from<Pick<CallRecord, 'quality_score' | 'duration' | 'call_result' | 'customer_quality'>>('calls')
      .select('quality_score, duration, call_result, customer_quality');

    batchQuery = applyServerFilters(batchQuery, filters) as typeof batchQuery;
    batchQuery = batchQuery.range(offset, offset + BATCH_SIZE - 1);

    const { data, error } = await batchQuery;
    if (error || !data || !Array.isArray(data)) break;

    allRecords = allRecords.concat(data as typeof allRecords);
    if (data.length < BATCH_SIZE) break; // Last batch
    offset += BATCH_SIZE;
  }

  const total = allRecords.length;
  if (total === 0) {
    return { ...emptyMetrics, totalCalls: totalCount };
  }

  // 3. Compute aggregates
  let sumQuality = 0;
  let sumPonderada = 0;
  let sumConvProb = 0;
  let sumDuration = 0;
  let successCount = 0;

  for (const r of allRecords) {
    sumQuality += r.quality_score || 0;
    sumPonderada += calcularQualityScorePonderado(r as CallRecord, ponderacionConfig);
    sumConvProb += calcularProbabilidadConversion(r as CallRecord, ponderacionConfig);

    const dur = r.duration;
    if (dur) {
      if (dur.includes(':')) {
        const parts = dur.split(':');
        if (parts.length === 3) {
          // HH:MM:SS
          sumDuration += (parseInt(parts[0]) || 0) * 3600 + (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0);
        } else if (parts.length === 2) {
          // MM:SS
          sumDuration += (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
        }
      } else {
        sumDuration += parseFloat(dur) || 0;
      }
    }

    const result = (r.call_result || '').toLowerCase();
    if (result.includes('venta') || result.includes('exitosa') || result.includes('transferencia_exitosa')) {
      successCount++;
    }
  }

  return {
    totalCalls: totalCount,
    avgQuality: Math.round((sumQuality / total) * 10) / 10,
    avgQualityPonderada: Math.round((sumPonderada / total) * 10) / 10,
    avgDuration: Math.round(sumDuration / total),
    successRate: Math.round((successCount / total) * 1000) / 10,
    avgConversionProb: Math.round((sumConvProb / total) * 10) / 10,
    avgAgentPerformance: 0,
    avgRapportScore: 0,
  };
}

/**
 * Fetch total call count (unfiltered, for dashboard header)
 */
export async function fetchTotalCount(): Promise<number> {
  const { count } = await pqncSecureClient
    .from('calls')
    .select('*', { count: 'exact', head: true });

  return count ?? 0;
}
