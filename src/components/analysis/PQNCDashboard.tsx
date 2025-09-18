import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
// import Chart from 'chart.js/auto';
import { pqncSupabaseAdmin } from '../../config/pqncSupabase';
import { definirConfiguracion, calcularQualityScorePonderado, calcularProbabilidadConversion, type PonderacionConfig } from './ponderacionConfig';
import DetailedCallView from './DetailedCallView';
// RETROALIMENTACIÓN: Importaciones para el sistema de feedback
import { feedbackService, type FeedbackData } from '../../services/feedbackService';
import FeedbackTooltip from './FeedbackTooltip';
// BOOKMARKS: Importaciones para el sistema de marcadores
import { bookmarkService, type BookmarkColor, type BookmarkData } from '../../services/bookmarkService';
import BookmarkSelector from './BookmarkSelector';
import BookmarkFilter from './BookmarkFilter';

// Interfaces para los datos de PQNC
interface CallRecord {
  id: string;
  agent_name: string;
  customer_name: string;
  call_type: string;
  call_result: string;
  duration: string;
  quality_score: number;
  customer_quality: string | null;
  organization: string;
  direction: string;
  start_time: string;
  agent_performance: any;
  call_evaluation: any;
  comunicacion_data: any;
}

interface CallSegment {
  id: string;
  call_id: string;
  segment_index: number;
  text: string;
  etapa_script: string;
  elementos_obligatorios: string[] | null;
  tecnicas_rapport: string[] | null;
  tipos_discovery: string[] | null;
  tipos_objeciones: string[] | null;
  tono_cliente: string;
  tono_agente: string;
  quality_score: number;
}

interface DashboardWidget {
  id: string;
  title: string;
  type: 'chart' | 'metric' | 'table' | 'heatmap';
  enabled: boolean;
  size: 'small' | 'medium' | 'large';
}

const PQNCDashboard: React.FC = () => {
  // Hooks de autenticación
  const { user } = useAuth();
  
  // Configuración de ponderación
  const [ponderacionConfig] = useState<PonderacionConfig>(definirConfiguracion());
  
  // Estados principales
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<CallRecord[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [transcript, setTranscript] = useState<CallSegment[]>([]);
  
  // Estados de paginación y sincronización
  const [totalRecords, setTotalRecords] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(90); // segundos
  
  // Estados de filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // RETROALIMENTACIÓN: Estados para el sistema de feedback
  const [feedbackMap, setFeedbackMap] = useState<Map<string, FeedbackData>>(new Map());
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  
  // SORTING: Estados para ordenamiento de columnas
  const [sortField, setSortField] = useState<string>('start_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // BOOKMARKS: Estados para el sistema de marcadores
  const [bookmarkMap, setBookmarkMap] = useState<Map<string, BookmarkData>>(new Map());
  const [bookmarkFilter, setBookmarkFilter] = useState<BookmarkColor | null>(null);
  const [bookmarkStats, setBookmarkStats] = useState<Array<{ color: BookmarkColor; count: number }>>([]);
  
  // Inicializar filtros de fecha con últimos 30 días por defecto
  // Sin funciones de fecha por defecto

  // Filtros de fecha opcionales (sin restricciones)
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [qualityFilter, setQualityFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [topRecords, setTopRecords] = useState<1000 | 3000 | 5000 | 999999>(1000);
  const [callTypeFilter, setCallTypeFilter] = useState<string[]>([]);
  const [directionFilter, setDirectionFilter] = useState<string[]>([]);
  const [customerQualityFilter, setCustomerQualityFilter] = useState<string[]>([]);
  
  // Nuevos filtros adicionales
  const [requiresFollowupFilter, setRequiresFollowupFilter] = useState<boolean | null>(null);
  const [durationRangeFilter, setDurationRangeFilter] = useState<string>('');
  const [qualityScoreRangeFilter, setQualityScoreRangeFilter] = useState<{min: number, max: number}>({min: 0, max: 100});
  const [hasAudioFilter, setHasAudioFilter] = useState<boolean | null>(null);
  const [serviceOfferedFilter, setServiceOfferedFilter] = useState<string[]>([]);
  
  // Estados de UI
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [selectedCallForDetail, setSelectedCallForDetail] = useState<CallRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [isAdvancedFiltersCollapsed, setIsAdvancedFiltersCollapsed] = useState(true);
  
  // WIDGETS: Deshabilitados por defecto en Alpha 1.0
  // - Causaban filtros ocultos que limitaban datos mostrados
  // - Sistema de métricas separado implementado (general vs filtradas)
  const [widgets] = useState<DashboardWidget[]>([
    { id: 'performance-overview', title: 'Resumen de Performance', type: 'chart', enabled: false, size: 'large' },
    { id: 'agent-ranking', title: 'Ranking de Agentes', type: 'table', enabled: false, size: 'medium' },
    { id: 'quality-distribution', title: 'Distribución de Calidad', type: 'chart', enabled: false, size: 'medium' },
    { id: 'call-results', title: 'Resultados de Llamadas', type: 'chart', enabled: false, size: 'small' },
    { id: 'rapport-analysis', title: 'Análisis de Rapport', type: 'heatmap', enabled: false, size: 'large' },
    { id: 'discovery-metrics', title: 'Métricas de Discovery', type: 'metric', enabled: false, size: 'small' },
    { id: 'objection-handling', title: 'Manejo de Objeciones', type: 'chart', enabled: false, size: 'medium' },
    { id: 'script-compliance', title: 'Cumplimiento de Script', type: 'metric', enabled: false, size: 'small' }
  ]);


  // Cargar datos iniciales y configurar sincronización
  useEffect(() => {
    loadCalls();
    
    // Configurar sincronización automática
    if (autoSyncEnabled) {
      const intervalId = setInterval(() => {
        console.log('🔄 Sincronización automática ejecutándose...');
        syncNewRecords();
      }, syncInterval * 1000);
      
      console.log(`⏱️ Sincronización automática configurada cada ${syncInterval} segundos`);
      
      return () => {
        clearInterval(intervalId);
        console.log('🛑 Sincronización automática detenida');
      };
    }
  }, [autoSyncEnabled, syncInterval]);

  // Recargar datos cuando cambien las fechas (con debounce para evitar múltiples cargas)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadCalls();
      // NO recargar métricas globales aquí, solo al inicializar
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [topRecords]);

  // Cargar métricas globales al inicializar
  useEffect(() => {
    loadGlobalMetrics();
  }, []);

  // Las métricas globales son independientes de los datos filtrados

  // Aplicar filtros
  useEffect(() => {
    applyFilters();
  }, [calls, searchQuery, dateFrom, dateTo, agentFilter, qualityFilter, resultFilter, organizationFilter, callTypeFilter, directionFilter, customerQualityFilter, requiresFollowupFilter, durationRangeFilter, qualityScoreRangeFilter, hasAudioFilter, serviceOfferedFilter, bookmarkFilter, bookmarkMap, ponderacionConfig]);

  // Ajustar itemsPerPage cuando cambie topRecords
  useEffect(() => {
    // Sin restricciones de página máxima
    if (itemsPerPage > topRecords && topRecords !== 999999) {
      setItemsPerPage(100);
      setCurrentPage(1);
    }
  }, [topRecords, itemsPerPage]);

  // Sin restricciones de rango de fechas

  const loadCalls = async (forceReload = false) => {
    setLoading(true);
    setError(null);

    try {
      
      console.log(`🔍 Cargando llamadas - Top ${topRecords === 999999 ? 'TODOS' : topRecords}`);
      
      // Construir la consulta base
      let countQuery = pqncSupabaseAdmin
        .from('calls')
        .select('*', { count: 'exact', head: true });
      
      let dataQuery = pqncSupabaseAdmin
        .from('calls')
        .select(`
          id,
          agent_name,
          customer_name,
          call_type,
          call_result,
          duration,
          quality_score,
          customer_quality,
          organization,
          direction,
          start_time,
          audio_file_url,
          audio_file_name
        `);

      // Sin filtros complejos - carga simple y directa

      // Obtener conteo con filtros aplicados
      const { count, error: countError } = await countQuery;

      if (countError) {
        console.warn('⚠️ Error obteniendo conteo:', countError);
      } else {
        setTotalRecords(count || 0);
        console.log(`📊 Registros en rango: ${count || 0}`);
      }

      // Cargar según topRecords seleccionado
      const limit = topRecords === 999999 ? undefined : topRecords;
      console.log(`📊 Cargando ${limit || 'TODOS'} los registros`);
      
      let query = dataQuery.order('start_time', { ascending: false });
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setCalls(data || []);
      setLastSyncTime(new Date().toISOString());
      
      // OPTIMIZACIÓN: Cargar feedback y bookmarks solo para primeros 100 registros
      if (data && data.length > 0) {
        const firstBatch = data.slice(0, 100).map(call => call.id);
        loadFeedbacksForCalls(firstBatch);
        loadBookmarksForCalls(firstBatch);
      }
      
    } catch (err) {
      console.error('❌ Error loading calls:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // RETROALIMENTACIÓN: Función para cargar retroalimentaciones de múltiples llamadas
  const loadFeedbacksForCalls = async (callIds: string[]) => {
    if (callIds.length === 0) return;
    
    try {
      setFeedbackLoading(true);
      const feedbacks = await feedbackService.getMultipleFeedbacks(callIds);
      setFeedbackMap(feedbacks);
    } catch (error) {
      console.error('❌ Error cargando retroalimentaciones:', error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  // RETROALIMENTACIÓN: Callback para actualizar feedback cuando se guarda desde DetailedCallView
  const handleFeedbackChange = (callId: string, feedbackData: FeedbackData | null) => {
    console.log('🔄 Actualizando feedback en dashboard para llamada:', callId);
    
    const newFeedbackMap = new Map(feedbackMap);
    if (feedbackData) {
      newFeedbackMap.set(callId, feedbackData);
    } else {
      newFeedbackMap.delete(callId);
    }
    setFeedbackMap(newFeedbackMap);
    
    console.log('✅ Feedback actualizado en dashboard');
  };

  // BOOKMARKS: Función para cargar bookmarks del usuario
  const loadBookmarksForCalls = async (callIds: string[]) => {
    if (!user || callIds.length === 0) return;
    
    try {
      const bookmarks = await bookmarkService.getUserBookmarks(user.id, callIds);
      setBookmarkMap(bookmarks);
      
      const stats = await bookmarkService.getUserBookmarkStats(user.id);
      setBookmarkStats(stats);
    } catch (error) {
      console.error('❌ Error cargando bookmarks:', error);
    }
  };

  // BOOKMARKS: Callback para actualizar bookmark cuando se cambia
  const handleBookmarkChange = (callId: string, bookmark: BookmarkData | null) => {
    const newBookmarkMap = new Map(bookmarkMap);
    if (bookmark) {
      newBookmarkMap.set(callId, bookmark);
    } else {
      newBookmarkMap.delete(callId);
    }
    
    setBookmarkMap(newBookmarkMap);
    
    // Recargar estadísticas
    if (user) {
      bookmarkService.getUserBookmarkStats(user.id).then(stats => {
        setBookmarkStats(stats);
      });
    }
  };

  // BOOKMARKS: Handler para cambio de filtro de color
  const handleBookmarkFilterChange = (color: BookmarkColor | null) => {
    setBookmarkFilter(color);
    setCurrentPage(1); // Resetear paginación al cambiar filtro
  };

  // SORTING: Función para manejar el ordenamiento de columnas
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Si es la misma columna, cambiar dirección
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Si es columna diferente, establecer nueva columna y dirección descendente por defecto
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // SORTING: Función para aplicar ordenamiento a las llamadas
  const applySorting = (callsToSort: CallRecord[]): CallRecord[] => {
    return [...callsToSort].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'agent_name':
          aValue = a.agent_name?.toLowerCase() || '';
          bValue = b.agent_name?.toLowerCase() || '';
          break;
        case 'customer_name':
          aValue = a.customer_name?.toLowerCase() || '';
          bValue = b.customer_name?.toLowerCase() || '';
          break;
        case 'call_result':
          aValue = a.call_result?.toLowerCase() || '';
          bValue = b.call_result?.toLowerCase() || '';
          break;
        case 'quality_score':
          aValue = a.quality_score || 0;
          bValue = b.quality_score || 0;
          break;
        case 'start_time':
          aValue = new Date(a.start_time).getTime();
          bValue = new Date(b.start_time).getTime();
          break;
        case 'duration':
          // Convertir duración HH:MM:SS a segundos para comparar
          aValue = convertDurationToSeconds(a.duration);
          bValue = convertDurationToSeconds(b.duration);
          break;
        default:
          aValue = a.start_time;
          bValue = b.start_time;
      }
      
      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // SORTING: Función auxiliar para convertir duración a segundos
  const convertDurationToSeconds = (duration: string): number => {
    if (!duration) return 0;
    const parts = duration.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  };

  // SORTING: Componente para header de columna con sorting
  const SortableHeader: React.FC<{ field: string; children: React.ReactNode; className?: string }> = ({ 
    field, 
    children, 
    className = "" 
  }) => {
    const isActive = sortField === field;
    const isAsc = isActive && sortDirection === 'asc';
    const isDesc = isActive && sortDirection === 'desc';
    
    return (
      <th 
        className={`px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none ${className}`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-2">
          <span>{children}</span>
          <div className="flex flex-col">
            <svg 
              className={`w-3 h-3 ${isAsc ? 'text-blue-600' : 'text-slate-400'} transition-colors`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <svg 
              className={`w-3 h-3 -mt-1 ${isDesc ? 'text-blue-600' : 'text-slate-400'} transition-colors`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </th>
    );
  };

  // Función de sincronización inteligente (solo nuevos registros)
  const syncNewRecords = async () => {
    if (!lastSyncTime) {
      console.log('🔄 Primera sincronización, cargando todos los datos...');
      return loadCalls();
    }

    try {
      console.log('🔍 Buscando nuevos registros...');
      
      // Buscar solo registros más recientes que la última sincronización
      const { data: newRecords, error } = await pqncSupabaseAdmin
        .from('calls')
        .select(`
          id,
          agent_name,
          customer_name,
          call_type,
          call_result,
          duration,
          quality_score,
          customer_quality,
          organization,
          direction,
          start_time,
          audio_file_url,
          audio_file_name,
          agent_performance,
          call_evaluation,
          comunicacion_data,
          customer_data,
          service_offered,
          script_analysis,
          compliance_data
        `)
        .gt('start_time', lastSyncTime)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('❌ Error en sincronización:', error);
        return;
      }

      if (newRecords && newRecords.length > 0) {
        console.log(`🆕 Encontrados ${newRecords.length} nuevos registros`);
        
        // Agregar nuevos registros al inicio de la lista
        setCalls(prevCalls => {
          const updatedCalls = [...newRecords, ...prevCalls];
          // Mantener solo los últimos 2000 registros para mejor filtrado
          return updatedCalls.slice(0, 2000);
        });
        
        setLastSyncTime(new Date().toISOString());
        
        // Actualizar conteo total
        const { count } = await pqncSupabaseAdmin
          .from('calls')
          .select('*', { count: 'exact', head: true });
        
        if (count) {
          setTotalRecords(count);
        }
      } else {
        console.log('✅ No hay nuevos registros');
      }
    } catch (err) {
      console.error('❌ Error en sincronización automática:', err);
    }
  };

  // Función de búsqueda inteligente
  const performIntelligentSearch = (query: string, callsToFilter: CallRecord[]) => {
    if (!query || query.trim().length < 2) return callsToFilter;

    const searchTerm = query.toLowerCase().trim();
    let filtered = [...callsToFilter];

    // 1. Búsqueda directa en campos principales
    const directMatches = filtered.filter(call =>
      call.id.toLowerCase().includes(searchTerm) ||
      call.agent_name?.toLowerCase().includes(searchTerm) ||
      call.customer_name?.toLowerCase().includes(searchTerm) ||
      call.organization?.toLowerCase().includes(searchTerm) ||
      call.call_type?.toLowerCase().includes(searchTerm) ||
      call.call_result?.toLowerCase().includes(searchTerm) ||
      call.customer_quality?.toLowerCase().includes(searchTerm)
    );

    // 2. Búsqueda en resumen de llamadas
    const summaryMatches = filtered.filter(call =>
      call.call_summary?.toLowerCase().includes(searchTerm)
    );

    // 3. Búsqueda por patrones de lenguaje natural
    const naturalLanguageMatches = filtered.filter(call => {
      // Detectar patrones comunes
      if (searchTerm.includes('venta') || searchTerm.includes('exitosa') || searchTerm.includes('conversion')) {
        const result = call.call_result?.toLowerCase().includes('venta') || 
                      call.call_result?.toLowerCase().includes('exitosa');
        if (result) {
          console.log(`🔍 [BÚSQUEDA] Encontrada venta: ${call.id} - ${call.call_result}`);
        }
        return result;
      }
      if (searchTerm.includes('no interesado') || searchTerm.includes('rechazo')) {
        return call.call_result?.toLowerCase().includes('no_interesado') ||
               call.call_result?.toLowerCase().includes('rechazo');
      }
      if (searchTerm.includes('elite') || searchTerm.includes('premium') || searchTerm.includes('calidad alta')) {
        return call.customer_quality === 'Q_ELITE' || call.customer_quality === 'Q_PREMIUM';
      }
      if (searchTerm.includes('problemas') || searchTerm.includes('reto') || searchTerm.includes('dificil')) {
        return call.customer_quality === 'Q_RETO';
      }
      if (searchTerm.includes('larga') || searchTerm.includes('duracion')) {
        const duration = parseFloat(call.duration) || 0;
        return duration > 300; // Más de 5 minutos
      }
      if (searchTerm.includes('corta') || searchTerm.includes('rapida')) {
        const duration = parseFloat(call.duration) || 0;
        return duration < 120; // Menos de 2 minutos
      }
      return false;
    });

    // 4. Combinar resultados únicos
    const allMatches = new Set([
      ...directMatches.map(call => call.id),
      ...summaryMatches.map(call => call.id),
      ...naturalLanguageMatches.map(call => call.id)
    ]);

    return filtered.filter(call => allMatches.has(call.id));
  };

  const applyFilters = () => {
    let filtered = [...calls];

    console.log(`🔍 [FILTROS] Iniciando filtrado. Total registros: ${calls.length}`);
    console.log(`🔍 [FILTROS] Filtros activos:`, {
      searchQuery: !!searchQuery,
      agentFilter: !!agentFilter,
      qualityFilter: !!qualityFilter,
      resultFilter: !!resultFilter,
      organizationFilter: !!organizationFilter,
      bookmarkFilter: !!bookmarkFilter
    });

    // PRIMERO aplicar todos los filtros, LUEGO la búsqueda inteligente sobre el resultado
    
    // Filtros de fecha opcionales
    if (dateFrom) {
      filtered = filtered.filter(call => new Date(call.start_time) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(call => new Date(call.start_time) <= new Date(dateTo));
    }

    // Filtros básicos
    if (agentFilter) {
      filtered = filtered.filter(call => call.agent_name && call.agent_name === agentFilter);
    }
    if (qualityFilter) {
      const [min, max] = qualityFilter.split('-').map(Number);
      filtered = filtered.filter(call => call.quality_score >= min && call.quality_score <= max);
    }
    if (resultFilter) {
      console.log(`🔍 [FILTRO] Aplicando filtro de resultado: "${resultFilter}"`);
      const beforeCount = filtered.length;
      
      // Mejorar filtro para manejar variaciones
      filtered = filtered.filter(call => {
        if (!call.call_result) return false;
        
        // Normalizar para comparación
        const callResult = call.call_result.toLowerCase().trim();
        const filterValue = resultFilter.toLowerCase().trim();
        
        // Búsqueda exacta O parcial para flexibilidad
        return callResult === filterValue || callResult.includes(filterValue);
      });
      
      const afterCount = filtered.length;
      console.log(`🔍 [FILTRO] Resultado: ${beforeCount} → ${afterCount} registros`);
      
      if (afterCount === 0 && beforeCount > 0) {
        console.warn(`⚠️ [FILTRO] Filtro "${resultFilter}" no produjo resultados. Valores únicos en BD:`, 
          [...new Set(calls.map(c => c.call_result).filter(Boolean))].slice(0, 10)
        );
      }
    }
    if (organizationFilter) {
      filtered = filtered.filter(call => call.organization && call.organization === organizationFilter);
    }

    // BOOKMARKS: Filtro por color de marcador
    if (bookmarkFilter && user) {
      const bookmarkedCallIds = Array.from(bookmarkMap.entries())
        .filter(([_, bookmark]) => bookmark.bookmark_color === bookmarkFilter)
        .map(([callId, _]) => callId);
      
      filtered = filtered.filter(call => bookmarkedCallIds.includes(call.id));
    }

    // Filtros adicionales avanzados
    if (callTypeFilter.length > 0) {
      filtered = filtered.filter(call => call.call_type && callTypeFilter.includes(call.call_type));
    }
    if (directionFilter.length > 0) {
      filtered = filtered.filter(call => call.direction && directionFilter.includes(call.direction));
    }
    if (customerQualityFilter.length > 0) {
      filtered = filtered.filter(call => call.customer_quality && customerQualityFilter.includes(call.customer_quality));
    }

    // Nuevos filtros adicionales
    if (requiresFollowupFilter !== null) {
      filtered = filtered.filter(call => {
        const requiresFollowup = call.call_evaluation?.requires_followup || false;
        return requiresFollowup === requiresFollowupFilter;
      });
    }

    if (durationRangeFilter) {
      filtered = filtered.filter(call => {
        const duration = parseFloat(call.duration) || 0;
        switch (durationRangeFilter) {
          case 'short': return duration < 120; // Menos de 2 minutos
          case 'medium': return duration >= 120 && duration <= 600; // 2-10 minutos
          case 'long': return duration > 600; // Más de 10 minutos
          default: return true;
        }
      });
    }

    if (qualityScoreRangeFilter.min > 0 || qualityScoreRangeFilter.max < 100) {
      filtered = filtered.filter(call => {
        const score = call.quality_score || 0;
        return score >= qualityScoreRangeFilter.min && score <= qualityScoreRangeFilter.max;
      });
    }

    if (hasAudioFilter !== null) {
      filtered = filtered.filter(call => {
        const hasAudio = !!(call.audio_file_url || call.audio_file_name);
        return hasAudio === hasAudioFilter;
      });
    }

    if (serviceOfferedFilter.length > 0) {
      filtered = filtered.filter(call => {
        const services = call.service_offered?.services || [];
        return serviceOfferedFilter.some(service => services.includes(service));
      });
    }

    // DESPUÉS DE TODOS LOS FILTROS: Aplicar búsqueda inteligente al resultado filtrado
    if (searchQuery) {
      filtered = performIntelligentSearch(searchQuery, filtered);
    }

    // NOTA: Se eliminaron los filtros automáticos de widgets para evitar restricciones ocultas
    // Los widgets son solo para visualización, no deberían filtrar automáticamente los datos

    // Ordenar por score ponderado descendente
    
    // Verificar si hay registros con scores inválidos
    const invalidScores = filtered.filter(call => {
      const score = calcularQualityScorePonderado(call, ponderacionConfig);
      return isNaN(score) || score === undefined || score === null;
    });
    
    if (invalidScores.length > 0) {
      console.log('⚠️ Registros con scores inválidos:', invalidScores.length);
    }
    
    filtered.sort((a, b) => {
      const scoreA = calcularQualityScorePonderado(a, ponderacionConfig);
      const scoreB = calcularQualityScorePonderado(b, ponderacionConfig);
      return scoreB - scoreA;
    });
    
    setFilteredCalls(filtered);
    setCurrentPage(1);
    
    console.log(`✅ [FILTROS] Filtrado completado: ${calls.length} → ${filtered.length} registros`);
    
    if (filtered.length === 0 && calls.length > 0) {
      console.warn(`⚠️ [FILTROS] Sin resultados. Revisar filtros activos.`);
    }
  };

  const loadTranscript = async (callId: string) => {
    try {
      const { data, error } = await pqncSupabaseAdmin
        .from('call_segments')
        .select('*')
        .eq('call_id', callId)
        .order('segment_index', { ascending: true });

      if (error) throw error;
      
      setTranscript(data || []);
    } catch (err) {
      console.error('Error loading transcript:', err);
      setError('Error al cargar la transcripción');
    }
  };

  const openTranscriptModal = async (call: CallRecord) => {
    setSelectedCall(call);
    setShowTranscriptModal(true);
    await loadTranscript(call.id);
  };

  const openDetailedView = async (call: CallRecord) => {
    setSelectedCallForDetail(call);
    setShowDetailedView(true);
    await loadTranscript(call.id);
  };

  const closeDetailedView = () => {
    setShowDetailedView(false);
    setSelectedCallForDetail(null);
    setTranscript([]);
  };


  // Estados para métricas globales optimizadas (consultas SQL directas)
  const [globalMetrics, setGlobalMetrics] = useState({
    totalCalls: 0,
    avgQuality: 0,
    avgQualityPonderada: 0,
    avgConversionProb: 0,
    successRate: 0,
    avgDuration: 0,
    avgAgentPerformance: 0,
    avgRapportScore: 0
  });

  // Función optimizada para cargar métricas globales de TODA la BD (sin filtros)
  const loadGlobalMetrics = async () => {
    try {
      console.log('📊 Cargando métricas globales de TODA la base de datos...');
      
      // 1. CONSULTA OPTIMIZADA: Solo contar registros totales
      const { count: totalCount, error: countError } = await pqncSupabaseAdmin
        .from('calls')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('❌ Error obteniendo conteo total:', countError);
        return;
      }

      // 2. CONSULTA OPTIMIZADA: Solo campos para score ponderado y duración
      const { data: metricsData, error: metricsError } = await pqncSupabaseAdmin
        .from('calls')
        .select(`
          quality_score,
          duration,
          agent_performance
        `)
        .not('quality_score', 'is', null)
        .not('duration', 'is', null);

      if (metricsError) {
        console.error('❌ Error cargando métricas:', metricsError);
        return;
      }

      console.log(`🔍 Total registros en BD: ${totalCount || 0}`);
      console.log(`🔍 Registros con métricas: ${metricsData?.length || 0}`);

      if (!metricsData || metricsData.length === 0) {
        setGlobalMetrics({
          totalCalls: totalCount || 0,
          avgQuality: 0,
          avgQualityPonderada: 0,
          avgConversionProb: 0,
          successRate: 0,
          avgDuration: 0,
          avgAgentPerformance: 0,
          avgRapportScore: 0
        });
        return;
      }

      // 3. CÁLCULOS OPTIMIZADOS en una sola pasada
      let totalQuality = 0;
      let totalQualityPonderada = 0;
      let totalDuration = 0;
      let validQualityCount = 0;
      let validDurationCount = 0;

      metricsData.forEach(call => {
        // Score básico
        if (call.quality_score != null) {
          totalQuality += call.quality_score;
          validQualityCount++;
        }

        // Score ponderado (simplificado para performance)
        const agentScore = call.agent_performance?.score_ponderado || call.quality_score || 0;
        totalQualityPonderada += agentScore;

        // Duración
        if (call.duration) {
          const parts = call.duration.split(':');
          if (parts.length === 3) {
            totalDuration += ((+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]));
            validDurationCount++;
          }
        }
      });

      // Calcular promedios finales
      const newMetrics = {
        totalCalls: totalCount || 0,
        avgQuality: validQualityCount > 0 ? totalQuality / validQualityCount : 0,
        avgQualityPonderada: metricsData.length > 0 ? totalQualityPonderada / metricsData.length : 0,
        avgConversionProb: 0, // No necesario para widgets
        successRate: 0, // No necesario para widgets
        avgDuration: validDurationCount > 0 ? totalDuration / validDurationCount : 0,
        avgAgentPerformance: 0, // No necesario para widgets
        avgRapportScore: 0 // No necesario para widgets
      };

      setGlobalMetrics(newMetrics);
      console.log(`✅ Métricas globales cargadas:`);
      console.log(`   📊 Total llamadas: ${newMetrics.totalCalls.toLocaleString()}`);
      console.log(`   ⭐ Score ponderado: ${newMetrics.avgQualityPonderada.toFixed(1)}`);
      console.log(`   ⏱️ Duración promedio: ${Math.floor(newMetrics.avgDuration / 60)}:${String(Math.floor(newMetrics.avgDuration % 60)).padStart(2, '0')}`);

    } catch (error) {
      console.error('💥 Error en loadGlobalMetrics:', error);
    }
  };

  // Función legacy con fallback a datos locales si no hay métricas globales
  const calculateGeneralMetrics = () => {
    // Si no hay métricas globales cargadas, usar datos locales como fallback
    if (globalMetrics.totalCalls === 0 && calls.length > 0) {
      console.log('⚠️ Usando fallback local para métricas');
      const totalCalls = calls.length;
      
      // Cálculos simples con datos locales
      const avgQuality = calls.reduce((sum, call) => sum + (call.quality_score || 0), 0) / totalCalls;
      const avgQualityPonderada = calls.reduce((sum, call) => {
        return sum + calcularQualityScorePonderado(call, ponderacionConfig);
      }, 0) / totalCalls;
      
      const successRate = (calls.filter(call => 
        call.call_result === 'seguimiento_programado' || 
        call.call_result === 'venta_concretada'
      ).length / totalCalls) * 100;
      
      const avgDuration = calls.reduce((sum, call) => {
        if (!call.duration) return sum;
        const parts = call.duration.split(':');
        return sum + ((+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]));
      }, 0) / totalCalls;

      return {
        totalCalls,
        avgQuality,
        avgQualityPonderada,
        avgConversionProb: avgQualityPonderada,
        successRate,
        avgDuration,
        avgAgentPerformance: 0,
        avgRapportScore: 0
      };
    }
    
    return globalMetrics;
  };

  // Cálculos de métricas filtradas (para análisis específico si es necesario)
  const calculateFilteredMetrics = () => {
    const totalCalls = filteredCalls.length;
    
    if (totalCalls === 0) {
      return { 
        totalCalls: 0, 
        avgQuality: 0, 
        avgQualityPonderada: 0,
        avgConversionProb: 0,
        successRate: 0, 
        avgDuration: 0,
        avgAgentPerformance: 0,
        avgRapportScore: 0
      };
    }
    
    // Calidad promedio estándar
    const avgQuality = filteredCalls.reduce((sum, call) => sum + call.quality_score, 0) / totalCalls;
    
    // Calidad promedio ponderada
    const avgQualityPonderada = filteredCalls.reduce((sum, call) => {
      return sum + calcularQualityScorePonderado(call, ponderacionConfig);
    }, 0) / totalCalls;
    
    // Probabilidad de conversión promedio
    const avgConversionProb = filteredCalls.reduce((sum, call) => {
      return sum + calcularProbabilidadConversion(call, ponderacionConfig);
    }, 0) / totalCalls;
    
    // Tasa de éxito
    const successRate = (filteredCalls.filter(call => 
      call.call_result === 'seguimiento_programado' || 
      call.call_result === 'venta_concretada'
    ).length / totalCalls) * 100;
    
    // Duración promedio
    const avgDuration = filteredCalls.reduce((sum, call) => {
      const duration = call.duration || '00:00:00';
      const parts = duration.split(':');
      const seconds = (+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]);
      return sum + seconds;
    }, 0) / totalCalls;

    // Métricas adicionales de ponderación
    const avgAgentPerformance = filteredCalls.reduce((sum, call) => {
      const agentPerf = call.agent_performance?.score_ponderado || 0;
      return sum + agentPerf;
    }, 0) / totalCalls;

    const avgRapportScore = filteredCalls.reduce((sum, call) => {
      const rapportScore = call.comunicacion_data?.rapport_metricas?.score_ponderado || 0;
      return sum + rapportScore;
    }, 0) / totalCalls;

    return { 
      totalCalls, 
      avgQuality, 
      avgQualityPonderada,
      avgConversionProb,
      successRate, 
      avgDuration,
      avgAgentPerformance,
      avgRapportScore
    };
  };

  // Métricas generales para el header (todos los datos)
  const generalMetrics = calculateGeneralMetrics();
  
  // Métricas filtradas para análisis específico
  const filteredMetrics = calculateFilteredMetrics();

  // Datos únicos para filtros
  const uniqueAgents = [...new Set(calls.map(call => call.agent_name))].filter(Boolean);
  const uniqueResults = [...new Set(calls.map(call => call.call_result))].filter(Boolean);
  const uniqueOrganizations = [...new Set(calls.map(call => call.organization))].filter(Boolean);

  // SORTING: Aplicar ordenamiento a todos los registros filtrados primero
  const sortedFilteredCalls = applySorting(filteredCalls);
  
  // Aplicar filtro de top records después del sorting
  const topFilteredCalls = sortedFilteredCalls.slice(0, topRecords);
  
  // Usar los registros ya ordenados y limitados
  const sortedCalls = topFilteredCalls;
  
  // Paginación
  const totalPages = Math.ceil(sortedCalls.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCalls = sortedCalls.slice(startIndex, startIndex + itemsPerPage);

  // Formato de duración
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // CRÍTICO: Sistema de scroll optimizado implementado Alpha 1.0
  // - Elimina bounce effect con CSS personalizado
  // - Scroll reveal animations para UX mejorada
  // - Performance optimizada con IntersectionObserver
  
  // SCROLL REVEAL: Activar animaciones cuando elementos entran en viewport
  useEffect(() => {
    
    const observeScrollReveal = () => {
      const scrollRevealElements = document.querySelectorAll('.scroll-reveal');
      
      if (scrollRevealElements.length > 0) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
            }
          });
        }, { threshold: 0.1 });

        scrollRevealElements.forEach(el => observer.observe(el));
        
        return () => {
          observer.disconnect();
        };
      }
    };

    const cleanup = observeScrollReveal();
    return cleanup;
  }, []);
  
  return (
    <div className="space-y-6 scroll-fade-in prevent-horizontal-scroll" /* DEBUG: Clases agregadas para scroll mejorado */>
      {/* Header con métricas principales - CON SKELETON LOADING */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          // SKELETON PARA WIDGETS - Evita layout shifts
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3"></div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2"></div>
                  </div>
                  <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <div className="w-6 h-6 bg-slate-200 dark:bg-slate-600 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 min-h-[120px]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Llamadas</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{generalMetrics.totalCalls.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
              </div>
            </div>


            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 min-h-[120px]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Score Ponderado</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{generalMetrics.avgQualityPonderada.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 min-h-[120px]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Duración Promedio</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatDuration(generalMetrics.avgDuration)}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}
      </div>



        {/* Búsqueda Principal */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <div className="space-y-4">
            {/* Campo de búsqueda principal */}
            <div>
              <label className="block text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Búsqueda Inteligente
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por agente, cliente, ID, resultado, calidad, o texto libre (ej: 'ventas exitosas', 'clientes elite', 'llamadas largas')..."
                  className="w-full px-6 py-4 text-lg border-2 border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 flex items-start gap-2">
                <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Ejemplos: "Juan Pérez", "Q_ELITE", "llamadas exitosas", "clientes difíciles", "duracion larga"</span>
              </p>
            </div>

            {/* Controles en una línea alineados */}
            <div className="flex items-end justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Top Registros
                </label>
                <div className="flex gap-2">
                  {[1000, 3000, 5000, 999999].map(num => (
                    <button
                      key={num}
                      onClick={() => setTopRecords(num as 1000 | 3000 | 5000 | 999999)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        topRecords === num
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500'
                      }`}
                    >
                      {num === 999999 ? 'TODOS' : `Top ${num/1000}K`}
                    </button>
                  ))}
                  
                  {/* BOOKMARKS: Filtro alineado con los botones de Top */}
                  <BookmarkFilter
                    selectedColor={bookmarkFilter}
                    onColorChange={handleBookmarkFilterChange}
                    userStats={bookmarkStats}
                  />
                </div>
              </div>

              {/* Botón para mostrar filtros avanzados - Alineado */}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-all text-sm font-medium flex items-center gap-2"
              >
                <svg className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Filtros Avanzados
              </button>
            </div>
          </div>
        </div>

        {/* Filtros Avanzados Colapsables */}
        {showAdvancedFilters && (
          <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-md font-semibold text-slate-900 dark:text-white mb-4">Filtros Avanzados</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* Filtros de fecha opcionales */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Desde (opcional)
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Hasta (opcional)
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Rango de Calidad
                </label>
                <select
                  value={qualityFilter}
                  onChange={(e) => setQualityFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todas las calidades</option>
                  <option value="0-20">Deficiente (0-20)</option>
                  <option value="21-40">Regular (21-40)</option>
                  <option value="41-60">Bueno (41-60)</option>
                  <option value="61-80">Muy Bueno (61-80)</option>
                  <option value="81-100">Excelente (81-100)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Organización
                </label>
                <select
                  value={organizationFilter}
                  onChange={(e) => setOrganizationFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todas las organizaciones</option>
                  {uniqueOrganizations.map(org => (
                    <option key={org} value={org}>{org}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Agente
                </label>
                <select
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos los agentes</option>
                  {uniqueAgents.map(agent => (
                    <option key={agent} value={agent}>{agent}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Resultado
                </label>
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos los resultados</option>
                  {uniqueResults.map(result => (
                    <option key={result} value={result}>{result}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nuevos Filtros Adicionales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-600">
              
              {/* Filtro de Seguimiento */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Requiere Seguimiento
                </label>
                <select
                  value={requiresFollowupFilter === null ? '' : requiresFollowupFilter.toString()}
                  onChange={(e) => setRequiresFollowupFilter(e.target.value === '' ? null : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Requiere seguimiento</option>
                  <option value="false">No requiere seguimiento</option>
                </select>
              </div>

              {/* Filtro de Duración */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Duración
                </label>
                <select
                  value={durationRangeFilter}
                  onChange={(e) => setDurationRangeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todas las duraciones</option>
                  <option value="short">Cortas (&lt; 2 min)</option>
                  <option value="medium">Medianas (2-10 min)</option>
                  <option value="long">Largas (&gt; 10 min)</option>
                </select>
              </div>

              {/* Filtro de Calidad Score */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Score de Calidad
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={qualityScoreRangeFilter.min}
                      onChange={(e) => setQualityScoreRangeFilter(prev => ({...prev, min: Number(e.target.value)}))}
                      className="w-1/2 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded"
                      placeholder="Min"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={qualityScoreRangeFilter.max}
                      onChange={(e) => setQualityScoreRangeFilter(prev => ({...prev, max: Number(e.target.value)}))}
                      className="w-1/2 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded"
                      placeholder="Max"
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    Rango: {qualityScoreRangeFilter.min} - {qualityScoreRangeFilter.max}
                  </div>
                </div>
              </div>

              {/* Filtro de Audio */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M12 6.5v11m0-11a1 1 0 011 1v9a1 1 0 01-1 1m0-11a1 1 0 00-1 1v9a1 1 0 001 1" />
                  </svg>
                  Archivo de Audio
                </label>
                <select
                  value={hasAudioFilter === null ? '' : hasAudioFilter.toString()}
                  onChange={(e) => setHasAudioFilter(e.target.value === '' ? null : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Con audio</option>
                  <option value="false">Sin audio</option>
                </select>
              </div>

            </div>

            <div className="flex items-end mt-6">
              <button
                onClick={() => {
                  console.log('🧹 Limpiando todos los filtros...');
                  setSearchQuery('');
                  setDateFrom('');
                  setDateTo('');
                  setAgentFilter('');
                  setQualityFilter('');
                  setResultFilter('');
                  setOrganizationFilter('');
                  setCallTypeFilter([]);
                  setDirectionFilter([]);
                  setCustomerQualityFilter([]);
                  // Limpiar nuevos filtros
                  setRequiresFollowupFilter(null);
                  setDurationRangeFilter('');
                  setQualityScoreRangeFilter({min: 0, max: 100});
                  setHasAudioFilter(null);
                  setServiceOfferedFilter([]);
                  console.log('✅ Filtros limpiados - calls.length:', calls.length);
                }}
                className="w-full px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Limpiar Todos los Filtros
              </button>
            </div>
          </div>
        )}

      {/* DEBUG: Tabla de Llamadas con scroll optimizado */}
      <div className="momentum-scroll scroll-snap-section" /* DEBUG: Clases para tabla con scroll suave */>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Registro de Llamadas ({filteredCalls.length})
                  </h3>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  📊 Total en BD: {totalRecords.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
              <table className="w-full table-fixed" style={{ position: 'relative' }}>
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <SortableHeader field="agent_name" className="w-48">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Agente
                    </SortableHeader>
                    <SortableHeader field="customer_name" className="w-40">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Cliente
                    </SortableHeader>
                    <SortableHeader field="call_result" className="w-36">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Resultado
                    </SortableHeader>
                    <SortableHeader field="quality_score" className="w-16">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" />
                      </svg>
                      Score
                    </SortableHeader>
                    <SortableHeader field="duration" className="w-20">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Duración
                    </SortableHeader>
                    <SortableHeader field="start_time" className="w-20">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Fecha
                    </SortableHeader>
                    <th className="px-2 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider w-12">
                      <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider w-12">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ver
                    </th>
                    <th className="px-1 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider w-8">
                    </th>
                  </tr>
                </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {loading ? (
                  // SKELETON ROWS - Evita layout shifts en tabla
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse">
                      <td className="px-4 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div></td>
                      <td className="px-4 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-28"></div></td>
                      <td className="px-4 py-4"><div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-20"></div></td>
                      <td className="px-4 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12"></div></td>
                      <td className="px-4 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div></td>
                      <td className="px-4 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div></td>
                      <td className="px-2 py-4"><div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-6 mx-auto"></div></td>
                      <td className="px-2 py-4"><div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-6"></div></td>
                      <td className="px-1 py-4"><div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-4 mx-auto"></div></td>
                    </tr>
                  ))
                ) : (
                  paginatedCalls.map((call) => {
                  const scorePonderado = calcularQualityScorePonderado(call, ponderacionConfig);
                  const probConversion = calcularProbabilidadConversion(call, ponderacionConfig);
                  
                  return (
                    <tr 
                      key={call.id} 
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                      onClick={() => openDetailedView(call)}
                    >
                      <td className="px-4 py-4 text-sm font-medium text-slate-900 dark:text-white truncate">
                        <div className="truncate" title={call.agent_name}>
                          {call.agent_name}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 truncate">
                        <div className="truncate" title={call.customer_name}>
                          {call.customer_name}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full truncate max-w-full ${
                            call.call_result === 'seguimiento_programado' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            call.call_result === 'venta_concretada' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            call.call_result === 'no_interesado' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            call.call_result === 'abandonada' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`} title={call.call_result.replace('_', ' ')}>
                            {call.call_result.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center">
                          <div className={`flex-shrink-0 w-2 h-2 rounded-full mr-2 ${
                            scorePonderado >= 80 ? 'bg-indigo-400' :
                            scorePonderado >= 60 ? 'bg-blue-400' :
                            scorePonderado >= 40 ? 'bg-purple-400' :
                            'bg-pink-400'
                          }`}></div>
                          <span className="text-sm text-slate-900 dark:text-white font-medium truncate">
                            {scorePonderado.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">
                        <div className="text-center truncate" title={call.duration || 'N/A'}>
                          <span className="font-medium">
                            {call.duration || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">
                        <div className="flex flex-col text-center">
                          <span className="font-medium truncate">
                            {new Date(call.start_time).toLocaleDateString('es-ES', { 
                              day: '2-digit', 
                              month: '2-digit',
                              year: '2-digit'
                            })}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                            {new Date(call.start_time).toLocaleTimeString('es-ES', { 
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      </td>
                      
                      {/* RETROALIMENTACIÓN: Celda de retroalimentación con tooltip */}
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {(() => {
                          const feedback = feedbackMap.get(call.id);
                          const hasFeedback = !!feedback;
                          
                          const button = (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetailedView(call);
                              }}
                              className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                                hasFeedback 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 hover:scale-105 hover:shadow-lg' 
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105'
                              }`}
                            >
                              {feedbackLoading ? (
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                  <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : (
                                <>
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {hasFeedback ? (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    ) : (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    )}
                                  </svg>
                                  Retro
                                </>
                              )}
                            </button>
                          );
                          
                          // Si tiene feedback, envolver en tooltip elegante
                          if (hasFeedback && feedback) {
                            return (
                              <FeedbackTooltip feedback={feedback} maxPreviewLength={250}>
                                {button}
                              </FeedbackTooltip>
                            );
                          }
                          
                          // Si no tiene feedback, mostrar botón simple con título básico
                          return (
                            <div title="Agregar retroalimentación">
                              {button}
                            </div>
                          );
                        })()}
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openTranscriptModal(call);
                          }}
                          className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Ver
                        </button>
                      </td>
                      
                      {/* BOOKMARKS: Celda de marcador al final */}
                      <td className="px-2 py-4 whitespace-nowrap text-center w-12">
                        {user ? (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <BookmarkSelector
                              callId={call.id}
                              userId={user.id}
                              currentBookmark={bookmarkMap.get(call.id)}
                              onBookmarkChange={handleBookmarkChange}
                            />
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  <div>Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, topFilteredCalls.length)} de {topFilteredCalls.length} llamadas</div>
                  {topFilteredCalls.length < generalMetrics.totalCalls && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      📊 {generalMetrics.totalCalls.toLocaleString()} registros totales en BD | {topFilteredCalls.length} después de filtros
                    </div>
                  )}
                </div>
                
                {/* Selector de registros por página */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Por página:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      const newPerPage = Number(e.target.value);
                      setItemsPerPage(newPerPage);
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              
              {totalPages > 1 && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                    {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Panel de Sincronización Compacto - MOVIDO DESPUÉS DE LA TABLA */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          {/* Estado y estadísticas */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${autoSyncEnabled ? 'bg-green-400' : 'bg-gray-400'}`}></div>
              <span>Sync {autoSyncEnabled ? 'ON' : 'OFF'}</span>
            </div>
            <span>BD: {globalMetrics.totalCalls.toLocaleString()} | Cargados: {calls.length}</span>
            {lastSyncTime && (
              <span>Última: {new Date(lastSyncTime).toLocaleTimeString()}</span>
            )}
          </div>
          
          {/* Controles */}
          <div className="flex items-center gap-3">
              {/* Toggle Auto-sync */}
              <button
                onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                  autoSyncEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                title={`Auto-sync ${autoSyncEnabled ? 'activado' : 'desactivado'}`}
              >
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  autoSyncEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </button>
              
              {/* Intervalo */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(Number(e.target.value))}
                  className="w-12 px-1 py-0.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  title="Intervalo de sincronización en segundos"
                />
                <span>s</span>
              </div>
              
              {/* Botón de sincronización manual */}
              <button
                onClick={() => syncNewRecords()}
                disabled={loading}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sincronizar manualmente"
              >
                {loading ? (
                  <div className="animate-spin w-3 h-3 border border-slate-500 border-t-transparent rounded-full"></div>
                ) : (
                  <svg className="w-3 h-3 text-slate-500 hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

      {/* Modal de Transcripción */}
      {showTranscriptModal && selectedCall && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-slate-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                    Transcripción de Llamada - {selectedCall.agent_name}
                  </h3>
                  <button
                    onClick={() => setShowTranscriptModal(false)}
                    className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-slate-600 dark:text-slate-400">Cliente:</span>
                    <p className="text-slate-900 dark:text-white">{selectedCall.customer_name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600 dark:text-slate-400">Resultado:</span>
                    <p className="text-slate-900 dark:text-white">{selectedCall.call_result}</p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600 dark:text-slate-400">Calidad:</span>
                    <p className="text-slate-900 dark:text-white">{selectedCall.quality_score}</p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600 dark:text-slate-400">Duración:</span>
                    <p className="text-slate-900 dark:text-white">{selectedCall.duration}</p>
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto p-6 space-y-4">
                {transcript.length > 0 ? (
                  transcript.map((segment, index) => (
                    <div key={segment.id} className="border-l-4 border-blue-200 dark:border-blue-700 pl-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                            Segmento {segment.segment_index}
                          </span>
                          {segment.etapa_script && (
                            <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                              {segment.etapa_script}
                            </span>
                          )}
                          {segment.quality_score && (
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              segment.quality_score >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              segment.quality_score >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {segment.quality_score}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {segment.text}
                      </p>
                      {(segment.tecnicas_rapport || segment.tipos_discovery || segment.tipos_objeciones) && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {segment.tecnicas_rapport?.map(tecnica => (
                            <span key={tecnica} className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded">
                              🤝 {tecnica}
                            </span>
                          ))}
                          {segment.tipos_discovery?.map(tipo => (
                            <span key={tipo} className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                              🔍 {tipo}
                            </span>
                          ))}
                          {segment.tipos_objeciones?.map(tipo => (
                            <span key={tipo} className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded">
                              ⚠️ {tipo}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-500 dark:text-slate-400">Cargando transcripción...</p>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-700 px-6 py-3">
                <button
                  onClick={() => setShowTranscriptModal(false)}
                  className="w-full px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vista Detallada */}
      {showDetailedView && selectedCallForDetail && (
        <DetailedCallView
          call={selectedCallForDetail}
          transcript={transcript}
          ponderacionConfig={ponderacionConfig}
          enabledWidgets={widgets}
          onClose={closeDetailedView}
          onFeedbackChange={handleFeedbackChange}
        />
      )}
    </div>
  );
};

export default PQNCDashboard;

