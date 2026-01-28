/**
 * ============================================
 * DASHBOARD DE LOGS - LOG MONITOR
 * ============================================
 * 
 * Dashboard completo para visualizar y gestionar logs de errores:
 * - Contadores y estadísticas en tiempo real
 * - Filtros avanzados de búsqueda
 * - Estado de lectura (leído/no leído)
 * - Anotaciones y etiquetas
 * - Análisis de IA a demanda
 * - Vista por defecto del módulo Log Server
 */

import React, { useState, useEffect, useCallback, useRef, useMemo, useTransition, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chart, registerables } from 'chart.js/auto';
import { logMonitorService, type LogFilters, type LogStats, type ErrorLog } from '../../services/logMonitorService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import type { UIErrorLogAnnotation, UIErrorLogTag, UIErrorLogAIAnalysis } from '../../config/supabaseLogMonitor';
import { supabaseLogMonitor } from '../../config/supabaseLogMonitor';
import { Search, Filter, X, MessageSquare, Phone, Monitor, ChevronUp, ChevronDown, ChevronsUpDown, Plus, Minus, User, Layers, AlertCircle } from 'lucide-react';
import CreateTicketFromLogModal from './CreateTicketFromLogModal';

Chart.register(...registerables);

// ============================================
// OPTIMIZACIÓN: Hook personalizado para debounce
// ============================================
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface LogDashboardProps {
  onBackToConfig?: () => void;
}

// ============================================
// OPTIMIZACIÓN: Componente memoizado para botones de filtro de tiempo
// ============================================
interface TimeFilterButtonProps {
  label: string;
  minutes: number;
  currentDateFrom: string | undefined;
  onClick: () => void;
}

const TimeFilterButton = memo(({ label, minutes, currentDateFrom, onClick }: TimeFilterButtonProps) => {
  const isActive = useMemo(() => {
    if (!currentDateFrom) return false;
    const now = new Date();
    const filterDate = new Date(currentDateFrom);
    const expectedDate = new Date(now.getTime() - minutes * 60 * 1000);
    return Math.abs(filterDate.getTime() - expectedDate.getTime()) < 60000;
  }, [currentDateFrom, minutes]);

  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
        isActive
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {label}
    </button>
  );
});

TimeFilterButton.displayName = 'TimeFilterButton';

const LogDashboard: React.FC<LogDashboardProps> = ({ onBackToConfig }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [timelineLogs, setTimelineLogs] = useState<ErrorLog[]>([]); // Logs para la gráfica temporal (sin filtro de tipo)
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [showLogDetail, setShowLogDetail] = useState(false);
  const [annotations, setAnnotations] = useState<UIErrorLogAnnotation[]>([]);
  const [tags, setTags] = useState<UIErrorLogTag[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<UIErrorLogAIAnalysis | null>(null);
  const [userInfoCache, setUserInfoCache] = useState<Record<string, { email: string; full_name?: string }>>({});
  const [pendingAnalysis, setPendingAnalysis] = useState<{
    analysis: {
      analysis_text: string;
      analysis_summary: string;
      suggested_fix?: string | null;
    };
  } | null>(null); // Análisis recibido del webhook pero no guardado aún
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [groupByType, setGroupByType] = useState(true);
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);

  // OPTIMIZACIÓN: useTransition para actualizaciones no urgentes
  const [isPending, startTransition] = useTransition();

  // Filtros - Inicializar con período por defecto de 7 días para que la gráfica siempre muestre datos
  const [filters, setFilters] = useState<LogFilters>(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      is_read: undefined,
      is_archived: false,
      date_from: sevenDaysAgo.toISOString(),
      date_to: now.toISOString()
    };
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100); // Default 100 logs
  const [activeTab, setActiveTab] = useState<'todos' | 'mensaje' | 'llamada' | 'ui' | 'mis-actividades'>('todos');
  const [activityFilter, setActivityFilter] = useState<'comentarios' | 'analisis' | 'todos'>('todos');
  const [sortColumn, setSortColumn] = useState<'timestamp' | 'severidad' | 'subtipo' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const realtimeChannelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // OPTIMIZACIÓN: Debounce de filtros para evitar múltiples llamadas
  const debouncedFilters = useDebounce(filters, 150);
  
  // OPTIMIZACIÓN: Flag para evitar doble carga inicial
  const isInitialMountRef = useRef(true);
  const loadingRef = useRef(false);

  // ============================================
  // Función de parsing inteligente para búsqueda
  // ============================================
  const parseSearchQuery = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return { textSearch: '', parsedFilters: {} };

    const parsedFilters: Partial<LogFilters> = {};
    let remainingText = query;

    // Mapeo de severidades
    const severityMap: Record<string, 'critica' | 'alta' | 'media' | 'baja'> = {
      'critica': 'critica', 'crítica': 'critica', 'critical': 'critica',
      'alta': 'alta', 'high': 'alta',
      'media': 'media', 'medium': 'media', 'warning': 'media',
      'baja': 'baja', 'low': 'baja', 'info': 'baja'
    };

    // Detectar severidad
    for (const [keyword, severity] of Object.entries(severityMap)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(remainingText)) {
        parsedFilters.severity = [severity];
        remainingText = remainingText.replace(regex, '').trim();
        break;
      }
    }

    // Mapeo de subtipos
    const subtipoMap: Record<string, string> = {
      'dynamics': 'dynamics', 'crm': 'dynamics',
      'http': 'http_request_servicio', 'request': 'http_request_servicio',
      'llm': 'llms_json_schema', 'llms': 'llms_json_schema', 'ai': 'llms_json_schema', 'openai': 'llms_json_schema',
      'vapi': 'vapi', 'voice': 'vapi',
      'twilio': 'twilio', 'whatsapp': 'twilio', 'wha': 'twilio',
      'tools': 'tools', 'tool': 'tools', 'herramientas': 'tools',
      'db': 'base_de_datos', 'database': 'base_de_datos', 'bd': 'base_de_datos', 'supabase': 'base_de_datos'
    };

    // Detectar subtipo
    for (const [keyword, subtipo] of Object.entries(subtipoMap)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(remainingText)) {
        parsedFilters.subtipo = [subtipo as any];
        remainingText = remainingText.replace(regex, '').trim();
        break;
      }
    }

    // Detectar fechas en texto
    const now = new Date();
    const datePatterns: { pattern: RegExp; getDate: () => Date }[] = [
      // Español
      { pattern: /\bhoy\b/i, getDate: () => new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      { pattern: /\bayer\b/i, getDate: () => new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      { pattern: /\bantier\b/i, getDate: () => new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
      { pattern: /\bhace\s*(\d+)\s*d[ií]as?\b/i, getDate: (match?: RegExpMatchArray) => new Date(now.getTime() - parseInt(match?.[1] || '1') * 24 * 60 * 60 * 1000) },
      { pattern: /\bhace\s*(\d+)\s*horas?\b/i, getDate: (match?: RegExpMatchArray) => new Date(now.getTime() - parseInt(match?.[1] || '1') * 60 * 60 * 1000) },
      { pattern: /\bhace\s*(\d+)\s*semanas?\b/i, getDate: (match?: RegExpMatchArray) => new Date(now.getTime() - parseInt(match?.[1] || '1') * 7 * 24 * 60 * 60 * 1000) },
      { pattern: /\beste\s*mes\b/i, getDate: () => new Date(now.getFullYear(), now.getMonth(), 1) },
      { pattern: /\besta\s*semana\b/i, getDate: () => { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return d; } },
      // English
      { pattern: /\btoday\b/i, getDate: () => new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      { pattern: /\byesterday\b/i, getDate: () => new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      { pattern: /\b(\d+)\s*days?\s*ago\b/i, getDate: (match?: RegExpMatchArray) => new Date(now.getTime() - parseInt(match?.[1] || '1') * 24 * 60 * 60 * 1000) },
      { pattern: /\b(\d+)\s*hours?\s*ago\b/i, getDate: (match?: RegExpMatchArray) => new Date(now.getTime() - parseInt(match?.[1] || '1') * 60 * 60 * 1000) },
      { pattern: /\bthis\s*week\b/i, getDate: () => { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return d; } },
      { pattern: /\bthis\s*month\b/i, getDate: () => new Date(now.getFullYear(), now.getMonth(), 1) },
    ];

    // Buscar patrones de fecha
    for (const { pattern, getDate } of datePatterns) {
      const match = remainingText.match(pattern);
      if (match) {
        const dateFrom = getDate(match);
        parsedFilters.date_from = dateFrom.toISOString();
        parsedFilters.date_to = now.toISOString();
        remainingText = remainingText.replace(pattern, '').trim();
        break;
      }
    }

    // Detectar formatos de fecha numéricos: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY
    const numericDatePatterns = [
      { pattern: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/, parse: (m: RegExpMatchArray) => new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1])) },
      { pattern: /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/, parse: (m: RegExpMatchArray) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])) },
    ];

    for (const { pattern, parse } of numericDatePatterns) {
      const match = remainingText.match(pattern);
      if (match) {
        const date = parse(match);
        if (!isNaN(date.getTime())) {
          parsedFilters.date_from = date.toISOString();
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          parsedFilters.date_to = nextDay.toISOString();
          remainingText = remainingText.replace(pattern, '').trim();
          break;
        }
      }
    }

    return {
      textSearch: remainingText.replace(/\s+/g, ' ').trim(),
      parsedFilters
    };
  }, [searchQuery]);

  // Combinar filtros parseados con filtros UI
  const effectiveFilters = useMemo(() => {
    const { parsedFilters } = parseSearchQuery;
    return {
      ...debouncedFilters,
      // Los filtros parseados de búsqueda tienen prioridad sobre los filtros UI (solo si se detectaron)
      ...(parsedFilters.severity ? { severity: parsedFilters.severity } : {}),
      ...(parsedFilters.subtipo ? { subtipo: parsedFilters.subtipo } : {}),
      ...(parsedFilters.date_from ? { date_from: parsedFilters.date_from, date_to: parsedFilters.date_to } : {}),
    };
  }, [debouncedFilters, parseSearchQuery]);

  // Texto de búsqueda limpio (sin los filtros detectados)
  const cleanSearchQuery = useMemo(() => parseSearchQuery.textSearch, [parseSearchQuery]);

  // Función para reproducir alerta sonora solo para logs críticos
  const playCriticalAlert = useCallback(() => {
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.value = 800; // Tono más agudo para alerta
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 0.5);
    } catch (error) {
      console.warn('Error reproduciendo alerta:', error);
    }
  }, []);

  // OPTIMIZACIÓN: Memoizar filtros de stats para evitar recreaciones
  const statsFilters = useMemo(() => ({
    date_from: debouncedFilters.date_from,
    date_to: debouncedFilters.date_to,
    severity: debouncedFilters.severity,
    tipo: debouncedFilters.tipo,
    subtipo: debouncedFilters.subtipo,
    ambiente: debouncedFilters.ambiente
  }), [debouncedFilters.date_from, debouncedFilters.date_to, debouncedFilters.severity, debouncedFilters.tipo, debouncedFilters.subtipo, debouncedFilters.ambiente]);

  const loadStats = useCallback(async () => {
    try {
      const statsData = await logMonitorService.getStats(statsFilters);
      startTransition(() => {
        setStats(statsData);
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Error al cargar estadísticas');
    }
  }, [statsFilters]);

  // OPTIMIZACIÓN: Memoizar filtros de timeline para evitar recreaciones
  const timelineFilters = useMemo(() => ({
    date_from: debouncedFilters.date_from,
    date_to: debouncedFilters.date_to,
    severity: debouncedFilters.severity,
    subtipo: debouncedFilters.subtipo,
    ambiente: debouncedFilters.ambiente,
    is_read: debouncedFilters.is_read,
    is_archived: debouncedFilters.is_archived,
    tipo: undefined,
    search: undefined
  }), [debouncedFilters.date_from, debouncedFilters.date_to, debouncedFilters.severity, debouncedFilters.subtipo, debouncedFilters.ambiente, debouncedFilters.is_read, debouncedFilters.is_archived]);

  // Cargar logs para la gráfica temporal (sin filtro de tipo, solo filtros de tiempo y otros)
  const loadTimelineLogs = useCallback(async () => {
    try {
      const result = await logMonitorService.getLogs(timelineFilters, {
        limit: 10000,
        offset: 0,
        orderBy: 'timestamp',
        orderDirection: 'asc'
      });

      startTransition(() => {
        setTimelineLogs(result.data);
      });
    } catch (error) {
      console.error('Error loading timeline logs:', error);
    }
  }, [timelineFilters]);

  // OPTIMIZACIÓN: Debounce de búsqueda separado
  const debouncedSearchQuery = useDebounce(cleanSearchQuery, 300);

  const loadLogs = useCallback(async () => {
    // OPTIMIZACIÓN: Evitar llamadas concurrentes
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    try {
      setLoading(true);
      
      // Si estamos en la pestaña "Mis Actividades", cargar logs filtrados por usuario
      if (activeTab === 'mis-actividades' && user?.id) {
        let result;
        if (activityFilter === 'comentarios') {
          result = await logMonitorService.getLogsWithUserAnnotations(user.id, {
            ...effectiveFilters,
            search: debouncedSearchQuery || undefined
          });
        } else if (activityFilter === 'analisis') {
          result = await logMonitorService.getLogsWithUserAIAnalysis(user.id, {
            ...effectiveFilters,
            search: debouncedSearchQuery || undefined
          });
        } else {
          // 'todos': combinar ambos
          const [comentariosResult, analisisResult] = await Promise.all([
            logMonitorService.getLogsWithUserAnnotations(user.id, {
              ...effectiveFilters,
              search: debouncedSearchQuery || undefined
            }),
            logMonitorService.getLogsWithUserAIAnalysis(user.id, {
              ...effectiveFilters,
              search: debouncedSearchQuery || undefined
            })
          ]);
          
          // Combinar y eliminar duplicados
          const allLogIds = new Set([
            ...comentariosResult.data.map(l => l.id),
            ...analisisResult.data.map(l => l.id)
          ]);
          
          const combinedLogs = [
            ...comentariosResult.data,
            ...analisisResult.data.filter(l => !comentariosResult.data.some(cl => cl.id === l.id))
          ];
          
          result = {
            data: combinedLogs,
            count: allLogIds.size
          };
        }
        
        // Aplicar paginación
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        let paginatedLogs = result.data.slice(startIndex, endIndex);
        
        // Aplicar sorting local si es necesario
        if (sortColumn === 'severidad' || sortColumn === 'subtipo') {
          paginatedLogs = [...paginatedLogs].sort((a, b) => {
            const aVal = sortColumn === 'severidad' ? a.severidad : a.subtipo;
            const bVal = sortColumn === 'severidad' ? b.severidad : b.subtipo;
            const comparison = aVal.localeCompare(bVal);
            return sortDirection === 'asc' ? comparison : -comparison;
          });
        } else if (sortColumn === 'timestamp') {
          paginatedLogs = [...paginatedLogs].sort((a, b) => {
            const comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            return sortDirection === 'asc' ? comparison : -comparison;
          });
        }
        
        startTransition(() => {
          setLogs(paginatedLogs);
          setTotalCount(result.count);
        });
      } else {
        // Cargar logs normales con filtro de tipo
        const filtersWithSearch: LogFilters = {
          ...effectiveFilters,
          search: debouncedSearchQuery || undefined
        };

        const filtersWithTab: LogFilters = {
          ...filtersWithSearch,
          // 'todos' y 'mis-actividades' no filtran por tipo
          tipo: (activeTab !== 'mis-actividades' && activeTab !== 'todos') ? [activeTab] : undefined
        };

        const result = await logMonitorService.getLogs(filtersWithTab, {
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
          orderBy: sortColumn || 'timestamp',
          orderDirection: sortDirection
        });

        // Aplicar sorting local si es necesario (para columnas que no están en el backend)
        let sortedData = result.data;
        if (sortColumn === 'severidad' || sortColumn === 'subtipo') {
          sortedData = [...result.data].sort((a, b) => {
            const aVal = sortColumn === 'severidad' ? a.severidad : a.subtipo;
            const bVal = sortColumn === 'severidad' ? b.severidad : b.subtipo;
            const comparison = aVal.localeCompare(bVal);
            return sortDirection === 'asc' ? comparison : -comparison;
          });
        }

        startTransition(() => {
          setLogs(sortedData);
          setTotalCount(result.count);
        });
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      toast.error('Error al cargar logs');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [effectiveFilters, debouncedSearchQuery, activeTab, activityFilter, pageSize, currentPage, sortColumn, sortDirection, user?.id]);

  const handleSort = useCallback((column: 'timestamp' | 'severidad' | 'subtipo') => {
    startTransition(() => {
      if (sortColumn === column) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
        setSortColumn(column);
        setSortDirection('desc');
      }
    });
  }, [sortColumn]);

  // OPTIMIZACIÓN: Handler optimizado para cambios de filtro de tiempo
  const handleTimeFilterChange = useCallback((minutes: number) => {
    const now = new Date();
    const dateFrom = new Date(now.getTime() - minutes * 60 * 1000);
    startTransition(() => {
      setFilters(prev => ({
        ...prev,
        date_from: dateFrom.toISOString(),
        date_to: now.toISOString()
      }));
    });
  }, []);

  // OPTIMIZACIÓN: Handler optimizado para filtro "Todos" (90 días)
  const handleAllTimeFilter = useCallback(() => {
    const now = new Date();
    const dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    startTransition(() => {
      setFilters(prev => ({
        ...prev,
        date_from: dateFrom.toISOString(),
        date_to: now.toISOString()
      }));
    });
  }, []);

  // OPTIMIZACIÓN: Handler genérico para cambios de filtros de select
  const handleFilterChange = useCallback(<K extends keyof LogFilters>(key: K, value: LogFilters[K]) => {
    startTransition(() => {
      setFilters(prev => ({
        ...prev,
        [key]: value
      }));
    });
  }, []);

  // OPTIMIZACIÓN: Handler para cambio de tab con transición
  const handleTabChange = useCallback((tabId: 'todos' | 'mensaje' | 'llamada' | 'ui' | 'mis-actividades') => {
    startTransition(() => {
      setActiveTab(tabId);
    });
  }, []);

  // Refs para evitar recrear suscripción
  const activeTabRef = useRef(activeTab);
  const loadLogsRef = useRef(loadLogs);
  const loadStatsRef = useRef(loadStats);
  const playCriticalAlertRef = useRef(playCriticalAlert);

  // Actualizar refs cuando cambien las funciones
  useEffect(() => {
    activeTabRef.current = activeTab;
    loadLogsRef.current = loadLogs;
    loadStatsRef.current = loadStats;
    playCriticalAlertRef.current = playCriticalAlert;
  }, [activeTab, loadLogs, loadStats, playCriticalAlert]);

  // Configurar suscripción en tiempo real - solo depende de activeTab
  const setupRealtimeSubscription = useCallback(() => {
    // Verificar si el cliente está disponible
    if (!supabaseLogMonitor) {
      console.warn('⚠️ LogDashboard: Cliente LogMonitor no disponible - Realtime deshabilitado');
      return;
    }

    if (realtimeChannelRef.current) {
      supabaseLogMonitor.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabaseLogMonitor
      .channel('error_logs_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'error_log'
        },
        async (payload) => {
          const newLog = payload.new as ErrorLog;
          
          // Solo reproducir alerta si es crítico
          if (newLog.severidad === 'critica') {
            playCriticalAlertRef.current();
            toast.error(`⚠️ Nuevo error crítico detectado`, {
              duration: 5000,
              icon: '🚨'
            });
          }
          
          // Recargar si el tab es 'todos' o si el nuevo log coincide con el tab activo
          if (activeTabRef.current === 'todos' || newLog.tipo === activeTabRef.current) {
            await loadLogsRef.current();
          }
          await loadStatsRef.current();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'error_log'
        },
        async (payload) => {
          const updatedLog = payload.new as ErrorLog;
          // Recargar si el tab es 'todos' o si el log actualizado coincide con el tab activo
          if (activeTabRef.current === 'todos' || updatedLog.tipo === activeTabRef.current) {
            await loadLogsRef.current();
          }
          await loadStatsRef.current();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Solo log una vez, no en cada recreación
        }
      });

    realtimeChannelRef.current = channel;
  }, []); // Sin dependencias - usa refs

  const loadAvailableTags = async () => {
    try {
      const tags = await logMonitorService.getAllAvailableTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error loading available tags:', error);
    }
  };

  // Inicializar AudioContext para alertas sonoras
  useEffect(() => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('AudioContext no disponible:', error);
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    loadStats();
    loadAvailableTags();
  }, [loadStats]);

  // Configurar suscripción solo una vez al montar
  useEffect(() => {
    // Solo configurar si el cliente está disponible
    if (supabaseLogMonitor) {
      setupRealtimeSubscription();
    }
    
    return () => {
      // Limpiar suscripción al desmontar
      if (realtimeChannelRef.current && supabaseLogMonitor) {
        supabaseLogMonitor.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, []); // Solo una vez al montar - usa refs para valores actuales

  // Cuando se selecciona la pestaña 'todos', establecer filtro de últimas 8 horas
  useEffect(() => {
    if (activeTab === 'todos') {
      const now = new Date();
      const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);
      startTransition(() => {
        setFilters(prev => ({
          ...prev,
          date_from: eightHoursAgo.toISOString(),
          date_to: now.toISOString()
        }));
      });
    }
  }, [activeTab]);

  // OPTIMIZACIÓN: Resetear página solo cuando cambian filtros (no en cada render)
  const prevFiltersRef = useRef<string>('');
  useEffect(() => {
    const filtersKey = JSON.stringify({ 
      f: effectiveFilters, 
      s: debouncedSearchQuery, 
      t: activeTab, 
      a: activityFilter 
    });
    if (prevFiltersRef.current && prevFiltersRef.current !== filtersKey) {
      setCurrentPage(1);
    }
    prevFiltersRef.current = filtersKey;
  }, [effectiveFilters, debouncedSearchQuery, activeTab, activityFilter]);

  // OPTIMIZACIÓN: Cargar datos en un solo efecto combinado para evitar múltiples llamadas
  useEffect(() => {
    // Evitar carga inicial duplicada
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      // Ejecutar carga inicial
      Promise.all([loadStats(), loadTimelineLogs(), loadLogs()]);
      return;
    }

    // Cargar datos de forma asíncrona sin bloquear
    const loadAllData = async () => {
      // Usar requestIdleCallback si está disponible para no bloquear el main thread
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          Promise.all([loadStats(), loadTimelineLogs(), loadLogs()]);
        }, { timeout: 100 });
      } else {
        // Fallback: usar setTimeout para diferir la carga
        setTimeout(() => {
          Promise.all([loadStats(), loadTimelineLogs(), loadLogs()]);
        }, 0);
      }
    };

    loadAllData();
  }, [loadStats, loadTimelineLogs, loadLogs]);

  const handleLogClick = async (log: ErrorLog) => {
    // Limpiar análisis previo al cambiar de log
    setAiAnalysis(null);
    setPendingAnalysis(null);
    setAnnotations([]);
    setTags([]);
    
    setSelectedLog(log);
    setShowLogDetail(true);
    
    // Marcar como leído automáticamente al abrir
    if (log.id && user?.id) {
      const logWithUI = log as any;
      if (!logWithUI.ui_is_read) {
        await logMonitorService.markAsRead(log.id, user.id);
        // Actualizar el log en la lista local
        setLogs(prevLogs => prevLogs.map(l => 
          l.id === log.id ? { ...l, ui_is_read: true } as any : l
        ));
        // Recargar stats
        loadStats();
      }
    }
    
    // Cargar datos relacionados
    if (log.id) {
      const [annotationsData, tagsData, analysisData] = await Promise.all([
        logMonitorService.getAnnotations(log.id),
        logMonitorService.getTags(log.id),
        logMonitorService.getAIAnalysis(log.id)
      ]);

      // Tags y análisis se establecen después de cargar usuarios (ver código arriba)
      // Solo establecer análisis si pertenece a este log específico
      if (analysisData && analysisData.error_log_id === log.id) {
        setAiAnalysis(analysisData);
      } else {
        setAiAnalysis(null);
      }
      
      // Establecer datos primero
      setAnnotations(annotationsData);
      setTags(tagsData);
      
      // Cargar información de usuarios para comentarios y análisis
      const userIdsToLoad = new Set<string>();
      annotationsData.forEach(ann => {
        if (ann.created_by && !userInfoCache[ann.created_by]) {
          userIdsToLoad.add(ann.created_by);
        }
      });
      if (analysisData?.requested_by && !userInfoCache[analysisData.requested_by]) {
        userIdsToLoad.add(analysisData.requested_by);
      }
      
      // Cargar información de usuarios en paralelo
      if (userIdsToLoad.size > 0) {
        const userInfoPromises = Array.from(userIdsToLoad).map(async (userId) => {
          const info = await logMonitorService.getUserInfo(userId);
          return { userId, info };
        });
        
        const userInfoResults = await Promise.all(userInfoPromises);
        const newUserInfoCache = { ...userInfoCache };
        userInfoResults.forEach(({ userId, info }) => {
          if (info) {
            newUserInfoCache[userId] = info;
          }
        });
        setUserInfoCache(newUserInfoCache);
      }
    }
  };

  const handleMarkAsRead = async (logId: string, read: boolean) => {
    if (!user?.id) return;

    try {
      if (read) {
        await logMonitorService.markAsRead(logId, user.id);
        toast.success('Marcado como leído');
      } else {
        await logMonitorService.markAsUnread(logId);
        toast.success('Marcado como no leído');
      }
      
      loadLogs();
      loadStats();
      
      if (selectedLog?.id === logId) {
        // Recargar estado del log seleccionado
        const updatedLog = await logMonitorService.getLogById(logId);
        if (updatedLog) {
          setSelectedLog(updatedLog);
        }
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const unreadLogs = logs.filter(log => {
        const logWithUI = log as any;
        // Verificar si está marcado como leído
        return logWithUI.ui_is_read !== true;
      });

      if (unreadLogs.length === 0) {
        toast.info('No hay logs sin leer');
        return;
      }

      const logIds = unreadLogs.map(log => log.id).filter(Boolean) as string[];
      await logMonitorService.markMultipleAsRead(logIds, user.id);
      toast.success(`${logIds.length} logs marcados como leídos`);
      
      loadLogs();
      loadStats();
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Error al marcar todos como leídos');
    }
  };

  const handleAddAnnotation = async () => {
    if (!selectedLog?.id || !user?.id || !newAnnotation.trim()) return;

    try {
      const annotation = await logMonitorService.addAnnotation(
        selectedLog.id,
        newAnnotation.trim(),
        user.id
      );

      if (annotation) {
        setAnnotations([annotation, ...annotations]);
        setNewAnnotation('');
        toast.success('Anotación añadida');
      }
    } catch (error) {
      console.error('Error adding annotation:', error);
      toast.error('Error al añadir anotación');
    }
  };

  const handleAddTag = async (tagName?: string) => {
    const tagToAdd = tagName || newTagName.trim();
    if (!selectedLog?.id || !user?.id || !tagToAdd) return;

    // Validar que no exista una etiqueta igual (case-insensitive)
    const tagExists = tags.some(t => t.tag_name.toLowerCase() === tagToAdd.toLowerCase());
    if (tagExists) {
      toast.error(`La etiqueta "${tagToAdd}" ya existe`);
      if (!tagName) {
        setNewTagName('');
      }
      return;
    }

    try {
      const tag = await logMonitorService.addTag(
        selectedLog.id,
        tagToAdd,
        null, // Sin color
        user.id
      );

      if (tag) {
        setTags([...tags, tag]);
        if (!tagName) {
          setNewTagName('');
        }
        toast.success('Etiqueta añadida');
        // Recargar logs y etiquetas disponibles para actualizar filtros
        loadLogs();
        loadAvailableTags();
      }
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error('Error al añadir etiqueta');
    }
  };

  const previousTagInputRef = useRef('');
  
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const previousValue = previousTagInputRef.current;
    
    // Siempre actualizar el valor primero para que se escriba normalmente (incluyendo la coma)
    setNewTagName(value);
    
    // Si contiene coma, verificar si hay etiquetas completas para procesar
    if (value.includes(',')) {
      const parts = value.split(',');
      const completedTags = parts.slice(0, -1).map(t => t.trim()).filter(t => t.length > 0);
      const currentTag = parts[parts.length - 1];
      
      // Detectar si se añadió una nueva coma comparando con el valor anterior
      const previousParts = previousValue.split(',');
      const newCommaAdded = parts.length > previousParts.length;
      
      // Solo procesar si hay etiquetas completas Y se añadió una nueva coma
      if (completedTags.length > 0 && newCommaAdded) {
        // Procesar las etiquetas completas después de un pequeño delay para permitir que la coma se escriba
        setTimeout(() => {
          // Filtrar etiquetas duplicadas (case-insensitive) y que no existan ya
          const existingTagNames = tags.map(t => t.tag_name.toLowerCase());
          const seenTags = new Set<string>();
          const uniqueTags = completedTags.filter(tag => {
            const tagLower = tag.toLowerCase();
            // Verificar que no exista ya y que no sea duplicado dentro de las nuevas etiquetas
            if (tag.length > 0 && !existingTagNames.includes(tagLower) && !seenTags.has(tagLower)) {
              seenTags.add(tagLower);
              return true;
            }
            return false;
          });
          
          // Añadir solo las etiquetas únicas
          uniqueTags.forEach(tag => {
            handleAddTag(tag);
          });
          
          // Si había duplicados, mostrar mensaje
          if (uniqueTags.length < completedTags.length) {
            const duplicates = completedTags.filter(tag => {
              const tagLower = tag.toLowerCase();
              return existingTagNames.includes(tagLower);
            });
            if (duplicates.length > 0) {
              toast.error(`Etiquetas duplicadas ignoradas: ${duplicates.join(', ')}`);
            }
          }
          
          // Limpiar el input dejando solo la etiqueta actual (sin las ya procesadas)
          setNewTagName(currentTag);
        }, 50);
        
        // Actualizar la referencia después de procesar
        previousTagInputRef.current = currentTag;
        return;
      }
    }
    
    // Actualizar la referencia del valor anterior
    previousTagInputRef.current = value;
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Si presiona Enter y hay texto, añadir la etiqueta
    if (e.key === 'Enter' && newTagName.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await logMonitorService.removeTag(tagId);
      setTags(tags.filter(t => t.id !== tagId));
      toast.success('Etiqueta eliminada');
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Error al eliminar etiqueta');
    }
  };

  const handleRequestAIAnalysis = async () => {
    if (!selectedLog?.id) return;

    try {
      setLoadingAnalysis(true);
      setPendingAnalysis(null); // Limpiar análisis pendiente previo
      
      const analysisResponse = await logMonitorService.requestAIAnalysis({
        error_log_id: selectedLog.id,
        include_suggested_fix: true,
        requested_by: user?.id
      });

      if (analysisResponse) {
        // Guardar el análisis recibido como pendiente (no guardado en BD aún)
        setPendingAnalysis(analysisResponse);
        toast.success('Análisis de IA recibido. Revisa y guarda si deseas.');
      } else {
        toast.error('Error al generar análisis de IA');
      }
    } catch (error) {
      console.error('Error requesting AI analysis:', error);
      toast.error('Error al solicitar análisis de IA');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleSaveAIAnalysis = async () => {
    if (!selectedLog?.id || !pendingAnalysis) return;

    try {
      setSavingAnalysis(true);
      
      const savedAnalysis = await logMonitorService.saveAIAnalysis(
        selectedLog.id,
        pendingAnalysis.analysis,
        user?.id
      );

      if (savedAnalysis && savedAnalysis.error_log_id === selectedLog.id) {
        setAiAnalysis(savedAnalysis);
        setPendingAnalysis(null); // Limpiar análisis pendiente
        toast.success('Análisis guardado exitosamente');
        // Recargar el log para actualizar los indicadores
        if (selectedLog.id) {
          const updatedAnalysis = await logMonitorService.getAIAnalysis(selectedLog.id);
          if (updatedAnalysis && updatedAnalysis.error_log_id === selectedLog.id) {
            setAiAnalysis(updatedAnalysis);
          }
        }
      } else {
        toast.error('Error al guardar análisis');
      }
    } catch (error) {
      console.error('Error saving AI analysis:', error);
      toast.error('Error al guardar análisis');
    } finally {
      setSavingAnalysis(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critica':
        return 'bg-red-500';
      case 'alta':
        return 'bg-orange-500';
      case 'media':
        return 'bg-yellow-500';
      case 'baja':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critica':
        return 'Crítica';
      case 'alta':
        return 'Alta';
      case 'media':
        return 'Media';
      case 'baja':
        return 'Baja';
      default:
        return severity;
    }
  };

  const getSubtypeColor = (subtipo: string) => {
    const colors: Record<string, string> = {
      'tools': 'bg-purple-500',
      'dynamics': 'bg-blue-500',
      'base_de_datos': 'bg-red-500',
      'http_request_servicio': 'bg-orange-500',
      'llms_falla_servicio': 'bg-pink-500',
      'llms_json_schema': 'bg-indigo-500',
      'vapi': 'bg-cyan-500',
      'guardrail_salida': 'bg-yellow-500',
      'guardrail_entrada': 'bg-amber-500',
      'twilio': 'bg-green-500',
      'rate_limit': 'bg-red-600',
      'uchat': 'bg-teal-500',
      'redis': 'bg-rose-500',
      'airtable': 'bg-violet-500',
      's3': 'bg-sky-500'
    };
    return colors[subtipo] || 'bg-gray-500';
  };

  const getSubtypeLabel = (subtipo: string) => {
    const labels: Record<string, string> = {
      'tools': 'Tools',
      'dynamics': 'Dynamics',
      'base_de_datos': 'Base de Datos',
      'http_request_servicio': 'HTTP Request',
      'llms_falla_servicio': 'LLMs Falla',
      'llms_json_schema': 'LLMs JSON',
      'vapi': 'VAPI',
      'guardrail_salida': 'Guardrail Salida',
      'guardrail_entrada': 'Guardrail Entrada',
      'twilio': 'Twilio',
      'rate_limit': 'Rate Limit',
      'uchat': 'UChat',
      'redis': 'Redis',
      'airtable': 'Airtable',
      's3': 'S3'
    };
    return labels[subtipo] || subtipo;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Mexico_City',
      hour12: false
    }).format(date);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Función para manejar clic en estadísticas (aplicar filtro directo, sin toggle)
  const handleStatsFilterClick = (filterType: 'all' | 'recent' | 'critical' | 'llamada' | 'mensaje' | 'ui') => {
    if (filterType === 'critical') {
      handleFilterChange('severity', ['critica']);
      handleTabChange('todos');
    } else if (filterType === 'llamada') {
      handleFilterChange('severity', undefined);
      handleTabChange('llamada');
    } else if (filterType === 'mensaje') {
      handleFilterChange('severity', undefined);
      handleTabChange('mensaje');
    } else if (filterType === 'ui') {
      handleFilterChange('severity', undefined);
      handleTabChange('ui');
    } else if (filterType === 'recent') {
      // Últimas 24 horas
      handleFilterChange('severity', undefined);
      handleTabChange('todos');
      handleTimeFilterChange(1440);
    } else if (filterType === 'all') {
      // Mostrar todos - 90 días
      handleFilterChange('severity', undefined);
      handleTabChange('todos');
      handleAllTimeFilter();
    }
  };

  // Verificar si el cliente de LogMonitor está disponible
  if (!supabaseLogMonitor) {
    return (
      <div className="h-[calc(100vh-200px)] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            Credenciales No Configuradas
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            El módulo de Log Monitor requiere credenciales de la base de datos LogMonitor (dffuwdzybhypxfzrmdcz).
          </p>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-left text-sm">
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Para configurar:</p>
            <ol className="list-decimal list-inside text-gray-600 dark:text-gray-400 space-y-1">
              <li>Ir a <strong>Administración → Credenciales API</strong></li>
              <li>Buscar módulo <strong>"Supabase LOGMONITOR"</strong></li>
              <li>Configurar <strong>ANON_KEY</strong> con la anon key del proyecto</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Parte superior fija */}
      <div className="flex-shrink-0 p-4 pb-2 space-y-3">
        {/* Gráfica Temporal (ancho completo) */}
        {stats && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {(() => {
                if (filters.date_from && filters.date_to) {
                  const from = new Date(filters.date_from);
                  const to = new Date(filters.date_to);
                  const diffMs = to.getTime() - from.getTime();
                  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
                  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                  if (diffHours <= 24) {
                    return `Errores por Tipo (últimas ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'})`;
                  }
                  return `Errores por Tipo (${diffDays} ${diffDays === 1 ? 'día' : 'días'})`;
                } else if (filters.date_from) {
                  const from = new Date(filters.date_from);
                  const diffMs = new Date().getTime() - from.getTime();
                  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
                  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                  if (diffHours <= 24) {
                    return `Errores por Tipo (últimas ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'})`;
                  }
                  return `Errores por Tipo (últimos ${diffDays} ${diffDays === 1 ? 'día' : 'días'})`;
                }
                return 'Errores por Tipo (últimas 8 horas)';
              })()}
            </h3>
            <div className="h-48">
              <LogsTimelineChart logs={timelineLogs} dateFrom={filters.date_from} dateTo={filters.date_to} />
              </div>
            </motion.div>
        )}

        {/* Bloque unificado: Tabs + Búsqueda Avanzada */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {/* Pestañas de Tipo */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/20">
            {[
              { id: 'todos' as const, label: 'Todos', icon: Layers },
              { id: 'mensaje' as const, label: 'WhatsApp', icon: MessageSquare },
              { id: 'llamada' as const, label: 'Llamadas', icon: Phone },
              { id: 'ui' as const, label: 'System UI', icon: Monitor },
              { id: 'mis-actividades' as const, label: 'Mis Actividades', icon: User }
            ].map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 px-4 py-3.5 text-sm font-medium transition-all duration-200 relative flex items-center justify-center space-x-2 ${
                    isActive
                      ? 'text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 shadow-sm border-t-2 border-t-blue-500 -mb-px'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <IconComponent className={`w-4 h-4 transition-transform ${isActive ? 'text-blue-600 dark:text-blue-400 scale-110' : ''}`} />
                  <span className={isActive ? 'font-semibold' : ''}>{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Filtro de actividad para pestaña "Mis Actividades" */}
          {activeTab === 'mis-actividades' && (
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center space-x-4">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Filtrar por:</span>
                <div className="flex space-x-2">
                  {[
                    { id: 'todos' as const, label: 'Todos' },
                    { id: 'comentarios' as const, label: 'Comentarios' },
                    { id: 'analisis' as const, label: 'Análisis IA' }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setActivityFilter(filter.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        activityFilter === filter.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Barra compacta unificada: Búsqueda + Contadores + Dropdowns + Tiempo */}
          <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Búsqueda - flex-1 para ocupar espacio restante, con min y max */}
              <div className="relative flex-1 min-w-[120px] max-w-xs lg:max-w-md xl:max-w-lg">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Buscar: severidad, subtipo, fecha (ej: critica, vapi, ayer, 23/12/2025)..."
                  className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Contadores */}
              {stats && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400" title="Total">{stats.total}</span>
                  <span className="text-red-500" title="24h">{stats.recent_errors}</span>
                  <span className="text-red-600 font-medium" title="Críticos">{stats.by_severity.critica || 0}</span>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span className="text-blue-500" title="Llamadas"><Phone className="w-3.5 h-3.5 inline mr-0.5" />{stats.by_tipo.llamada || 0}</span>
                  <span className="text-green-500" title="WhatsApp"><MessageSquare className="w-3.5 h-3.5 inline mr-0.5" />{stats.by_tipo.mensaje || 0}</span>
                  <span className="text-purple-500" title="UI"><Monitor className="w-3.5 h-3.5 inline mr-0.5" />{stats.by_tipo.ui || 0}</span>
            </div>
              )}

              {/* Separador */}
              <span className="text-gray-300 dark:text-gray-600 hidden lg:inline">|</span>

              {/* Filtros dropdown */}
              <div className="flex items-center gap-1.5">
              <select
                value={filters.is_read === undefined ? 'all' : filters.is_read ? 'read' : 'unread'}
                  onChange={(e) => handleFilterChange('is_read', e.target.value === 'all' ? undefined : e.target.value === 'read')}
                  className="px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">Estado</option>
                <option value="read">Leídos</option>
                <option value="unread">No leídos</option>
              </select>
              <select
                value={filters.severity?.[0] || 'all'}
                  onChange={(e) => handleFilterChange('severity', e.target.value === 'all' ? undefined : [e.target.value as any])}
                  className="px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">Severidad</option>
                <option value="critica">Crítica</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
              <select
                value={filters.subtipo?.[0] || 'all'}
                  onChange={(e) => handleFilterChange('subtipo', e.target.value === 'all' ? undefined : [e.target.value as any])}
                  className="px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">Subtipo</option>
                <option value="dynamics">Dynamics</option>
                  <option value="http_request_servicio">HTTP</option>
                  <option value="llms_json_schema">LLMs</option>
                <option value="vapi">VAPI</option>
                <option value="twilio">Twilio</option>
                  <option value="tools">Tools</option>
                  <option value="base_de_datos">BD</option>
              </select>
              <select
                value={filters.ambiente?.[0] || 'all'}
                  onChange={(e) => handleFilterChange('ambiente', e.target.value === 'all' ? undefined : [e.target.value as any])}
                  className="px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">Env</option>
                  <option value="produccion">Prod</option>
                  <option value="desarrollo">Dev</option>
              </select>
          </div>

              {/* Separador */}
              <span className="text-gray-300 dark:text-gray-600 hidden lg:inline">|</span>

              {/* Filtros de tiempo - AHORA A LA DERECHA */}
              <div className="flex items-center gap-1">
                {[
                  { label: '90d', minutes: 90 * 24 * 60, isAll: true },
                  { label: '1h', minutes: 60 },
                  { label: '8h', minutes: 480 },
                  { label: '24h', minutes: 1440 },
                  { label: '3d', minutes: 4320 },
                  { label: '7d', minutes: 10080 },
                  { label: '30d', minutes: 43200 }
                ].map(({ label, minutes, isAll }) => (
                  <button
                  key={label}
                    onClick={() => isAll ? handleAllTimeFilter() : handleTimeFilterChange(minutes)}
                    className={`px-2.5 py-1 text-sm rounded-lg transition-colors ${
                      (isAll && !filters.date_from) || (!isAll && filters.date_from && Math.abs(new Date().getTime() - new Date(filters.date_from).getTime() - minutes * 60 * 1000) < 60000)
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
          </div>

              {/* Config button */}
              {onBackToConfig && (
                <button onClick={onBackToConfig} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-auto" title="Configuración">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
              </div>
            </div>
        </motion.div>
      </div>

      {/* Lista de Logs - Área con scroll independiente */}
      <div className="flex-1 min-h-0 overflow-hidden px-4 pb-20 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cargando logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400">No se encontraron logs</p>
            </div>
          ) : (
            <>
              {/* Tabla de Logs (ya filtrada por tab activo) - Con scroll */}
              <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Estado
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => handleSort('severidad')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Severidad</span>
                          {sortColumn === 'severidad' ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-4 h-4 text-gray-400 opacity-50" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => handleSort('subtipo')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Subtipo</span>
                          {sortColumn === 'subtipo' ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-4 h-4 text-gray-400 opacity-50" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                        Actividad
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => handleSort('timestamp')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Fecha</span>
                          {sortColumn === 'timestamp' || sortColumn === null ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-4 h-4 text-gray-400 opacity-50" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {logs.map((log) => {
                      const logWithUI = log as any;
                      // Obtener estado de lectura del objeto procesado
                      const isRead = logWithUI.ui_is_read === true;
                      const descripcionStr = typeof log.descripcion === 'string' 
                        ? log.descripcion 
                        : (log.descripcion ? JSON.stringify(log.descripcion) : 'Sin descripción');
                      const descripcionPreview = descripcionStr.length > 100 
                        ? descripcionStr.substring(0, 100) + '...' 
                        : descripcionStr;
                      
                      const logWithActivity = log as any;
                      const hasAnnotations = logWithActivity.has_annotations || false;
                      const hasAIAnalysis = logWithActivity.has_ai_analysis || false;

                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                            !isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                          }`}
                          onClick={() => handleLogClick(log)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(log.id, !isRead);
                              }}
                              className="flex items-center hover:scale-110 transition-transform duration-200"
                              title={isRead ? 'Marcar como no leído' : 'Marcar como leído'}
                            >
                              {isRead ? (
                                <svg className="w-5 h-5 text-green-500 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-orange-500 cursor-pointer ring-2 ring-orange-200 dark:ring-orange-800"></div>
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getSeverityColor(log.severidad)}`}>
                              {getSeverityLabel(log.severidad)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getSubtypeColor(log.subtipo)}`}>
                              {getSubtypeLabel(log.subtipo)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-md">
                            <div className="truncate" title={descripcionStr}>
                              {descripcionPreview}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {hasAnnotations && (
                                <div className="group relative">
                                  <MessageSquare className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                  <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    Tiene anotaciones
                                  </span>
                                </div>
                              )}
                              {hasAIAnalysis && (
                                <div className="group relative">
                                  <svg className="w-4 h-4 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                  <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    Tiene análisis IA
                                  </span>
                                </div>
                              )}
                              {(log as any).has_ticket && (
                                <div className="group relative">
                                  <svg className="w-4 h-4 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    Tiene ticket: {(log as any).ticket_number || 'N/A'}
                                  </span>
                                </div>
                              )}
                              {!hasAnnotations && !hasAIAnalysis && !(log as any).has_ticket && (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(log.timestamp)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación y Controles - Fijo en la parte inferior */}
              <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                  {/* Información y Vistas por Página */}
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Mostrando <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> a <span className="font-semibold">{Math.min(currentPage * pageSize, totalCount)}</span> de <span className="font-semibold">{totalCount}</span> logs
                  </div>
                  <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Logs por página:</span>
                      {[100, 300, 500].map((size) => (
                        <motion.button
                          key={size}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setPageSize(size);
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition-all duration-200 ${
                            pageSize === size
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {size}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Botones de Acción y Paginación */}
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleMarkAllAsRead}
                      className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md"
                    >
                      Marcar todos como leídos
                    </motion.button>

                    {totalPages > 1 && (
                      <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      «
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Anterior
                    </motion.button>
                    <span className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Página {currentPage} de {totalPages}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Siguiente
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      »
                    </motion.button>
                </div>
              )}
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* Modal de Detalle del Log */}
        <AnimatePresence>
          {showLogDetail && selectedLog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
                          onClick={() => {
                            setShowLogDetail(false);
                            // Limpiar datos al cerrar el modal
                            setAiAnalysis(null);
                            setPendingAnalysis(null);
                            setAnnotations([]);
                            setTags([]);
                          }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-[65rem] max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
              >
                {/* Header del Modal */}
                <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Detalle del Log
                      </h3>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${getSubtypeColor(selectedLog.subtipo)}`}>
                          {getSubtypeLabel(selectedLog.subtipo)}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {selectedLog.tipo}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(selectedLog.timestamp)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowCreateTicketModal(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-red-600 rounded-xl hover:from-orange-700 hover:to-red-700 transition-all duration-200 flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4" />
                        Crear Ticket
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setShowLogDetail(false);
                            // Limpiar datos al cerrar el modal
                            setAiAnalysis(null);
                            setPendingAnalysis(null);
                            setAnnotations([]);
                            setTags([]);
                          }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Contenido del Modal */}
                <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                  <div className="space-y-6">
                    {/* Información básica */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Información del Error
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Severidad</p>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${getSeverityColor(selectedLog.severidad)}`}>
                            {getSeverityLabel(selectedLog.severidad)}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tipo / Subtipo</p>
                          <p className="text-sm text-gray-900 dark:text-white">{selectedLog.tipo} / {selectedLog.subtipo}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ambiente</p>
                          <p className="text-sm text-gray-900 dark:text-white">{selectedLog.ambiente}</p>
                        </div>
                        {selectedLog.workflow_id && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ejecución</p>
                            <a
                              href={`https://primary-dev-d75a.up.railway.app/workflow/${selectedLog.workflow_id}${selectedLog.execution_id ? `/executions/${selectedLog.execution_id}` : ''}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 dark:text-blue-400 font-mono hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                            >
                              {selectedLog.workflow_id}{selectedLog.execution_id ? ` / ${selectedLog.execution_id}` : ''}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Descripción */}
                    {selectedLog.descripcion && (
                      <div>
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Descripción
                          </h4>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedLog.descripcion}</p>
                      </div>
                    )}

                    {/* Mensaje */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Mensaje
                        </h4>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-mono break-words break-all overflow-wrap-anywhere max-w-full word-break-break-all">
                          {typeof selectedLog.mensaje === 'string' 
                            ? selectedLog.mensaje 
                            : JSON.stringify(selectedLog.mensaje, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* Etiquetas */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Etiquetas
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {tags.map(tag => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
                          >
                            {tag.tag_name}
                            <button
                              onClick={() => handleRemoveTag(tag.id)}
                              className="ml-2 hover:text-red-500 dark:hover:text-red-400"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div>
                        <input
                          type="text"
                          value={newTagName}
                          onChange={handleTagInputChange}
                          onKeyDown={handleTagInputKeyDown}
                          placeholder="Escribe etiquetas separadas por comas (ej: bug, crítico, revisar)"
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200"
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Separa múltiples etiquetas con comas o presiona Enter para añadir
                        </p>
                      </div>
                    </div>

                    {/* Anotaciones */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Anotaciones ({annotations.length})
                        </h4>
                      </div>
                      <div className="space-y-3 mb-4">
                        {annotations.map(annotation => {
                          const annotationUserInfo = userInfoCache[annotation.created_by];
                          const displayName = annotationUserInfo 
                            ? (annotationUserInfo.full_name || annotationUserInfo.email || annotation.created_by?.substring(0, 8) + '...')
                            : (annotation.created_by?.substring(0, 8) + '...' || 'Usuario');
                          
                          return (
                            <div
                              key={annotation.id}
                              className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                            >
                              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap break-words">{annotation.annotation_text}</p>
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Por: <span className="font-medium">{displayName}</span>
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(annotation.created_at)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <textarea
                          value={newAnnotation}
                          onChange={(e) => setNewAnnotation(e.target.value)}
                          placeholder="Añadir observación..."
                          rows={3}
                          className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white resize-none"
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleAddAnnotation}
                          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 self-start"
                        >
                          Añadir
                        </motion.button>
                      </div>
                    </div>

                    {/* Análisis de IA */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Análisis de IA
                          </h4>
                        </div>
                        {!aiAnalysis && !pendingAnalysis && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleRequestAIAnalysis}
                            disabled={loadingAnalysis}
                            className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            {loadingAnalysis ? 'Analizando...' : 'Solicitar Análisis'}
                          </motion.button>
                        )}
                        {pendingAnalysis && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSaveAIAnalysis}
                            disabled={savingAnalysis}
                            className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            {savingAnalysis ? 'Guardando...' : 'Guardar Análisis'}
                          </motion.button>
                        )}
                      </div>
                      {pendingAnalysis ? (
                        // Mostrar análisis pendiente (recibido pero no guardado)
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200 bg-yellow-200 dark:bg-yellow-800 px-2 py-1 rounded">
                              Análisis recibido - No guardado
                              </span>
                            </div>
                          <div>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Resumen:</p>
                            <p className="text-sm text-gray-900 dark:text-white">{pendingAnalysis.analysis.analysis_summary}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Análisis completo:</p>
                            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{pendingAnalysis.analysis.analysis_text}</p>
                          </div>
                          {pendingAnalysis.analysis.suggested_fix && (
                            <div>
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Solución sugerida:</p>
                              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{pendingAnalysis.analysis.suggested_fix}</p>
                            </div>
                          )}
                        </div>
                      ) : aiAnalysis && aiAnalysis.status === 'completed' ? (
                        <div className="space-y-4">
                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                            <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">Resumen</p>
                            <p className="text-sm text-gray-900 dark:text-white">{aiAnalysis.analysis_summary}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Análisis Completo</p>
                            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{aiAnalysis.analysis_text}</p>
                          </div>
                          {aiAnalysis.suggested_fix && (
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                              <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">Solución Sugerida</p>
                              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{aiAnalysis.suggested_fix}</p>
                            </div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {aiAnalysis.requested_by && (() => {
                              const analysisUserInfo = userInfoCache[aiAnalysis.requested_by] || { email: aiAnalysis.requested_by.substring(0, 8) + '...' };
                              const displayName = analysisUserInfo.full_name || analysisUserInfo.email || aiAnalysis.requested_by.substring(0, 8) + '...';
                              return `Solicitado por: ${displayName} | `;
                            })()}
                            Modelo: {aiAnalysis.model_used} | Tokens: {aiAnalysis.tokens_used} | {formatDate(aiAnalysis.completed_at || aiAnalysis.created_at)}
                          </div>
                        </div>
                      ) : aiAnalysis && aiAnalysis.status === 'failed' ? (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                          <p className="text-sm text-red-700 dark:text-red-300">
                            Error al generar análisis: {aiAnalysis.error_message || 'Error desconocido'}
                          </p>
                        </div>
                      ) : aiAnalysis && aiAnalysis.status === 'pending' ? (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">Análisis en progreso...</p>
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No hay análisis de IA disponible. Haz clic en "Solicitar Análisis" para generar uno.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Crear Ticket desde Log */}
        {showCreateTicketModal && selectedLog && (
          <CreateTicketFromLogModal
            isOpen={showCreateTicketModal}
            onClose={() => setShowCreateTicketModal(false)}
            logData={selectedLog}
          />
        )}
      </div>
    </div>
  );
};

// Componentes de Gráficas
interface ChartProps {
  stats: LogStats;
}

interface TimelineChartProps {
  logs: ErrorLog[];
  dateFrom?: string;
  dateTo?: string;
}

const LogsTimelineChart: React.FC<TimelineChartProps> = ({ logs, dateFrom, dateTo }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }

        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Determinar rango de fechas
        let startDate: Date;
        let endDate: Date;
        
        if (dateFrom && dateTo) {
          startDate = new Date(dateFrom);
          endDate = new Date(dateTo);
        } else if (dateFrom) {
          startDate = new Date(dateFrom);
          endDate = new Date();
        } else {
          // Por defecto: últimos 7 días
          endDate = new Date();
          startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - 6);
        }
        
        // Calcular diferencia en horas y días
        const hoursDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
        const daysDiff = Math.ceil(hoursDiff / 24);
        
        // Solo normalizar fechas al día completo si el rango es mayor a 24 horas
        // Para rangos menores (como 8 horas), mantener las horas exactas
        if (hoursDiff > 24) {
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
        }
        
        // Determinar intervalo según el rango
        let interval: 'hour' | 'day' = 'day';
        let intervalHours = 24;
        
        // Para rangos menores a 24 horas, usar intervalos de 1 hora
        if (hoursDiff <= 24) {
          interval = 'hour';
          intervalHours = 1;
        } else if (daysDiff <= 3) {
          interval = 'hour';
          intervalHours = Math.max(1, Math.floor(24 / Math.max(1, daysDiff)));
        }
        
        // Generar labels y buckets según el intervalo
        const labels: string[] = [];
        const buckets: Date[] = [];
        
        if (interval === 'hour') {
          const current = new Date(startDate);
          while (current <= endDate) {
            // Para rangos menores a 24 horas, mostrar solo la hora
            // Para rangos mayores, incluir también la fecha
            const label = hoursDiff <= 24 
              ? current.toLocaleTimeString('es-MX', { 
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Mexico_City',
                  hour12: false
                })
              : current.toLocaleString('es-MX', { 
                  day: 'numeric', 
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Mexico_City',
                  hour12: false
                });
            labels.push(label);
            buckets.push(new Date(current));
            current.setHours(current.getHours() + intervalHours);
          }
        } else {
          const current = new Date(startDate);
          while (current <= endDate) {
            const label = current.toLocaleDateString('es-MX', { 
              day: 'numeric', 
              month: 'short',
              timeZone: 'America/Mexico_City'
            });
            labels.push(label);
            buckets.push(new Date(current));
            current.setDate(current.getDate() + 1);
          }
        }
        
        // Contar logs por tipo y bucket
        const countsLlamada: number[] = [];
        const countsWhatsapp: number[] = [];
        const countsUI: number[] = [];
        
        buckets.forEach((bucketStart, index) => {
          const bucketEnd = new Date(bucketStart);
          if (interval === 'hour') {
            bucketEnd.setHours(bucketEnd.getHours() + intervalHours);
          } else {
            bucketEnd.setDate(bucketEnd.getDate() + 1);
          }
          
          const bucketLogs = logs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= bucketStart && logDate < bucketEnd;
          });
          
          countsLlamada.push(bucketLogs.filter(log => log.tipo === 'llamada').length);
          countsWhatsapp.push(bucketLogs.filter(log => log.tipo === 'mensaje').length);
          countsUI.push(bucketLogs.filter(log => log.tipo === 'ui').length);
        });

        // Crear gradientes para cada línea
        const gradientLlamada = ctx.createLinearGradient(0, 0, 0, 400);
        gradientLlamada.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        gradientLlamada.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
        
        const gradientWhatsapp = ctx.createLinearGradient(0, 0, 0, 400);
        gradientWhatsapp.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
        gradientWhatsapp.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
        
        const gradientUI = ctx.createLinearGradient(0, 0, 0, 400);
        gradientUI.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
        gradientUI.addColorStop(1, 'rgba(168, 85, 247, 0.05)');

        chartInstanceRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Llamada',
                data: countsLlamada,
              borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: gradientLlamada,
              borderWidth: 3,
              fill: true,
              tension: 0.5,
                pointRadius: 4,
                pointHoverRadius: 6,
              pointBackgroundColor: 'rgba(59, 130, 246, 1)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointHoverBackgroundColor: 'rgba(59, 130, 246, 1)',
              pointHoverBorderColor: '#fff',
              pointHoverBorderWidth: 3
              },
              {
                label: 'WhatsApp',
                data: countsWhatsapp,
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: gradientWhatsapp,
                borderWidth: 3,
                fill: true,
                tension: 0.5,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: 'rgba(16, 185, 129, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: 'rgba(16, 185, 129, 1)',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3
              },
              {
                label: 'UI',
                data: countsUI,
                borderColor: 'rgba(168, 85, 247, 1)',
                backgroundColor: gradientUI,
                borderWidth: 3,
                fill: true,
                tension: 0.5,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: 'rgba(168, 85, 247, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: 'rgba(168, 85, 247, 1)',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 2500,
              easing: 'easeOutCubic',
              delay: (context) => {
                let delay = 0;
                if (context.type === 'data' && context.mode === 'default') {
                  delay = context.dataIndex * 50;
                }
                return delay;
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  color: isDark ? '#e5e7eb' : '#111827',
                  font: {
                    size: 11,
                    weight: '600'
                  },
                  stepSize: 1
                },
                grid: {
                  color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                  drawBorder: false
                }
              },
              x: {
                ticks: {
                  color: isDark ? '#e5e7eb' : '#111827',
                  font: {
                    size: 11,
                    weight: '600'
                  },
                  maxRotation: 45,
                  minRotation: 45
                },
                grid: {
                  display: false
                }
              }
            },
            plugins: {
              legend: {
                display: true,
                position: 'top',
                align: 'end',
                labels: {
                  color: isDark ? '#e5e7eb' : '#111827',
                  font: {
                    size: 12,
                    weight: '600'
                  },
                  padding: 15,
                  usePointStyle: true,
                  pointStyle: 'circle'
                }
              },
              tooltip: {
                backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                titleColor: isDark ? '#e5e7eb' : '#111827',
                bodyColor: isDark ? '#e5e7eb' : '#111827',
                borderColor: isDark ? '#4b5563' : '#d1d5db',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                cornerRadius: 8,
                titleFont: {
                  weight: '600'
                },
                bodyFont: {
                  weight: '500'
                },
                callbacks: {
                  label: function(context) {
                    return `${context.dataset.label}: ${context.parsed.y}`;
                  }
                }
              }
            },
            interaction: {
              intersect: false,
              mode: 'index'
            }
          }
        });
      }
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [logs, dateFrom, dateTo]);

  return <canvas ref={chartRef}></canvas>;
};

export default LogDashboard;

