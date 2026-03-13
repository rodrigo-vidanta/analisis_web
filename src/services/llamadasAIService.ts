/**
 * ============================================
 * SERVICIO LLAMADAS AI (Natalia)
 * ============================================
 *
 * Encapsula data fetching para el módulo Llamadas AI.
 * Usa analysisSupabase (PQNC_AI) con enrichment waterfall:
 *   call_analysis_summary → llamadas_ventas → prospectos
 */

import { analysisSupabase } from '../config/analysisSupabase';
import type {
  LAIAnalysisRecord,
  LAIEnrichedRecord,
  LAIServerFilters,
  LAISortState,
  LAIPaginatedResult,
  LAIFilterOptions,
  LAIMetrics,
  LAIUserContext,
} from '../types/llamadasAITypes';
import { LAI_LIST_COLUMNS, LAI_DETAIL_COLUMNS, isIntelligentTransfer } from '../types/llamadasAITypes';

// ============================================
// FILTER HELPERS
// ============================================

type SupabaseQuery = ReturnType<typeof analysisSupabase.from>;

function applyServerFilters(query: SupabaseQuery, filters: LAIServerFilters): SupabaseQuery {
  let q = query;

  if (filters.dateFrom) {
    q = q.gte('created_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    q = q.lte('created_at', `${filters.dateTo}T23:59:59`);
  }
  if (filters.categoriaFilter) {
    q = q.eq('categoria_desempeno', filters.categoriaFilter);
  }
  if (filters.nivelInteresFilter) {
    q = q.eq('nivel_interes_detectado', filters.nivelInteresFilter);
  }
  if (filters.resultadoFilter) {
    q = q.ilike('resultado_llamada', `%${filters.resultadoFilter}%`);
  }
  if (filters.scoreMin !== undefined && filters.scoreMin > 0) {
    q = q.gte('score_general', filters.scoreMin);
  }
  if (filters.scoreMax !== undefined && filters.scoreMax < 100) {
    q = q.lte('score_general', filters.scoreMax);
  }
  if (filters.checkpointMin !== undefined && filters.checkpointMin > 0) {
    q = q.gte('checkpoint_alcanzado', filters.checkpointMin);
  }
  if (filters.checkpointMax !== undefined && filters.checkpointMax < 10) {
    q = q.lte('checkpoint_alcanzado', filters.checkpointMax);
  }

  return q;
}

// ============================================
// ENRICHMENT WATERFALL
// ============================================

interface LlamadaVentaRow {
  call_id: string;
  prospecto: string | null;
  coordinacion_id: string | null;
}

interface ProspectoRow {
  id: string;
  nombre_completo: string | null;
  ejecutivo_id: string | null;
  coordinacion_id: string | null;
}

async function enrichWithProspectData(
  records: LAIAnalysisRecord[],
  userContext: LAIUserContext | null
): Promise<LAIEnrichedRecord[]> {
  if (records.length === 0) return [];

  const callIds = records.map((r) => r.call_id);

  // Step 2: Batch fetch llamadas_ventas
  const { data: llamadasData } = await analysisSupabase
    .from('llamadas_ventas')
    .select('call_id, prospecto, coordinacion_id')
    .in('call_id', callIds);

  const llamadasMap = new Map<string, LlamadaVentaRow>();
  if (llamadasData) {
    for (const row of llamadasData as LlamadaVentaRow[]) {
      llamadasMap.set(row.call_id, row);
    }
  }

  // Step 3: Batch fetch prospectos
  const prospectoIds = [...new Set(
    (llamadasData as LlamadaVentaRow[] || [])
      .map((l) => l.prospecto)
      .filter((id): id is string => Boolean(id))
  )];

  const prospectosMap = new Map<string, ProspectoRow>();
  if (prospectoIds.length > 0) {
    // Batch in chunks of 100 to avoid URL length issues
    const BATCH = 100;
    for (let i = 0; i < prospectoIds.length; i += BATCH) {
      const batch = prospectoIds.slice(i, i + BATCH);
      const { data: prospData } = await analysisSupabase
        .from('prospectos')
        .select('id, nombre_completo, ejecutivo_id, coordinacion_id')
        .in('id', batch);

      if (prospData) {
        for (const row of prospData as ProspectoRow[]) {
          prospectosMap.set(row.id, row);
        }
      }
    }
  }

  // Step 4: Merge into enriched records
  let enriched: LAIEnrichedRecord[] = records.map((record) => {
    const llamada = llamadasMap.get(record.call_id);
    const prospecto = llamada?.prospecto ? prospectosMap.get(llamada.prospecto) : undefined;

    return {
      ...record,
      prospecto_id: llamada?.prospecto ?? undefined,
      prospecto_nombre: prospecto?.nombre_completo ?? undefined,
      coordinacion_id: prospecto?.coordinacion_id ?? llamada?.coordinacion_id ?? undefined,
      ejecutivo_id: prospecto?.ejecutivo_id ?? undefined,
      is_intelligent_transfer: isIntelligentTransfer(record),
    };
  });

  // Step 5: Apply permission filtering
  if (userContext && !userContext.isAdmin && !userContext.isCalidad) {
    if (userContext.ejecutivoFilter) {
      enriched = enriched.filter((r) => r.ejecutivo_id === userContext.ejecutivoFilter);
    } else if (userContext.coordinacionesFilter && userContext.coordinacionesFilter.length > 0) {
      const coordSet = new Set(userContext.coordinacionesFilter);
      enriched = enriched.filter((r) => r.coordinacion_id && coordSet.has(r.coordinacion_id));
    }
  }

  return enriched;
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Fetch paginated, filtered, and enriched analysis records
 */
export async function fetchLAICalls(params: {
  page: number;
  pageSize: number;
  sort: LAISortState;
  filters: LAIServerFilters;
  userContext: LAIUserContext | null;
}): Promise<LAIPaginatedResult<LAIEnrichedRecord>> {
  const { page, pageSize, sort, filters, userContext } = params;
  const offset = (page - 1) * pageSize;

  // Data query
  let dataQuery = analysisSupabase
    .from('call_analysis_summary')
    .select(LAI_LIST_COLUMNS);

  dataQuery = applyServerFilters(dataQuery, filters);
  dataQuery = dataQuery
    .order(sort.field, { ascending: sort.direction === 'asc' })
    .range(offset, offset + pageSize - 1);

  // Count query (parallel)
  let countQuery = analysisSupabase
    .from('call_analysis_summary')
    .select('*', { count: 'exact', head: true });
  countQuery = applyServerFilters(countQuery, filters);

  const [dataResult, countResult] = await Promise.all([dataQuery, countQuery]);

  if (dataResult.error) {
    throw new Error(dataResult.error.message);
  }

  // Enrich with prospect data
  const enriched = await enrichWithProspectData(
    (dataResult.data as LAIAnalysisRecord[]) || [],
    userContext
  );

  return {
    data: enriched,
    total: countResult.count ?? 0,
    page,
    pageSize,
  };
}

/**
 * Fetch single analysis record with full detail (calificaciones, feedback)
 */
export async function fetchLAICallDetail(analysisId: string): Promise<LAIAnalysisRecord | null> {
  const { data, error } = await analysisSupabase
    .from('call_analysis_summary')
    .select(LAI_DETAIL_COLUMNS)
    .eq('analysis_id', analysisId)
    .maybeSingle();

  if (error) {
    console.error('Error loading analysis detail:', error);
    return null;
  }

  return data as LAIAnalysisRecord | null;
}

/**
 * Search by call_id (cross-module navigation from Prospectos)
 */
export async function searchByCallId(callId: string): Promise<LAIAnalysisRecord[]> {
  const { data, error } = await analysisSupabase
    .from('call_analysis_summary')
    .select(LAI_DETAIL_COLUMNS)
    .eq('call_id', callId);

  if (error) {
    throw new Error(error.message);
  }

  return (data as LAIAnalysisRecord[]) || [];
}

/**
 * Fetch unique values for filter dropdowns
 */
export async function fetchLAIFilterOptions(): Promise<LAIFilterOptions> {
  const fields = ['categoria_desempeno', 'nivel_interes_detectado', 'resultado_llamada'];

  const results = await Promise.all(
    fields.map(async (field) => {
      const allValues: string[] = [];
      let offset = 0;
      const BATCH = 1000;

      while (true) {
        const { data } = await analysisSupabase
          .from('call_analysis_summary')
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
    categorias: results[0],
    nivelesInteres: results[1],
    resultados: results[2],
  };
}

/**
 * Fetch aggregate metrics for the current filtered set
 */
export async function fetchLAIMetrics(filters: LAIServerFilters): Promise<LAIMetrics> {
  const emptyMetrics: LAIMetrics = {
    totalRecords: 0,
    avgScore: 0,
    avgCheckpoint: 0,
    intelligentTransferCount: 0,
    categoryBreakdown: {},
  };

  // Count query
  let countQuery = analysisSupabase
    .from('call_analysis_summary')
    .select('*', { count: 'exact', head: true });
  countQuery = applyServerFilters(countQuery, filters);

  const { count: totalCount, error: countError } = await countQuery;
  if (countError || !totalCount || totalCount === 0) {
    return { ...emptyMetrics, totalRecords: totalCount ?? 0 };
  }

  // Fetch records in batches for aggregation
  const BATCH_SIZE = 1000;
  type MetricRow = Pick<LAIAnalysisRecord, 'score_general' | 'checkpoint_alcanzado' | 'categoria_desempeno' | 'nivel_interes_detectado' | 'resultado_llamada'>;
  let allRecords: MetricRow[] = [];
  let offset = 0;

  while (offset < totalCount) {
    let batchQuery = analysisSupabase
      .from('call_analysis_summary')
      .select('score_general, checkpoint_alcanzado, categoria_desempeno, nivel_interes_detectado, resultado_llamada');

    batchQuery = applyServerFilters(batchQuery, filters);
    batchQuery = batchQuery.range(offset, offset + BATCH_SIZE - 1);

    const { data, error } = await batchQuery;
    if (error || !data || !Array.isArray(data)) break;

    allRecords = allRecords.concat(data as MetricRow[]);
    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  const total = allRecords.length;
  if (total === 0) return { ...emptyMetrics, totalRecords: totalCount };

  let sumScore = 0;
  let sumCheckpoint = 0;
  let intelligentCount = 0;
  const categories: Record<string, number> = {};

  for (const r of allRecords) {
    sumScore += r.score_general || 0;
    sumCheckpoint += r.checkpoint_alcanzado || 0;

    const cat = r.categoria_desempeno || 'Sin categoría';
    categories[cat] = (categories[cat] || 0) + 1;

    if (isIntelligentTransfer(r as LAIAnalysisRecord)) {
      intelligentCount++;
    }
  }

  return {
    totalRecords: totalCount,
    avgScore: Math.round((sumScore / total) * 10) / 10,
    avgCheckpoint: Math.round((sumCheckpoint / total) * 10) / 10,
    intelligentTransferCount: intelligentCount,
    categoryBreakdown: categories,
  };
}
