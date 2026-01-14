/**
 * ============================================
 * PESTAÑA DE REASIGNACIÓN MASIVA DE PROSPECTOS
 * ============================================
 * 
 * Permite reasignar múltiples prospectos a un ejecutivo de forma masiva.
 * 
 * CARACTERÍSTICAS:
 * - Filtros optimizados para grandes volúmenes
 * - Selección múltiple (máx 30 prospectos)
 * - Barra de progreso animada
 * - Protección contra cierre/recarga
 * - Pausar/Cancelar con rollback
 * - Resumen de cambios al finalizar
 * 
 * PERMISOS: Solo admin, admin_operativo, coordinador_calidad
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Users, UserPlus, Building2, CheckCircle2, CheckCircle,
  XCircle, AlertTriangle, Pause, Play, RotateCcw, ArrowRight,
  Loader2, X, ChevronDown, Check, RefreshCw, Shield, Clock,
  Zap, BarChart3, ListChecks, UserX, Calendar
} from 'lucide-react';
import { analysisSupabase } from '../../config/analysisSupabase';
import { useAuth } from '../../contexts/AuthContext';
import { coordinacionService, type Coordinacion, type Ejecutivo } from '../../services/coordinacionService';
import { dynamicsReasignacionService, type ReasignacionRequest } from '../../services/dynamicsReasignacionService';
import { permissionsService } from '../../services/permissionsService';
import { PhoneText } from '../shared/PhoneDisplay';
import { Avatar } from '../shared/Avatar';
import toast from 'react-hot-toast';

// ============================================
// INTERFACES
// ============================================

interface Prospecto {
  id: string;
  nombre_completo?: string;
  nombre_whatsapp?: string;
  whatsapp?: string;
  email?: string;
  id_dynamics?: string;
  etapa?: string;
  coordinacion_id?: string;
  ejecutivo_id?: string;
  coordinacion_nombre?: string;
  ejecutivo_nombre?: string;
  created_at?: string;
}

interface ReassignmentResult {
  prospecto_id: string;
  prospecto_nombre: string;
  success: boolean;
  error?: string;
  ejecutivo_anterior_id?: string | null;
  ejecutivo_anterior_nombre?: string | null;
  coordinacion_anterior_id?: string | null;
  coordinacion_anterior_nombre?: string | null;
}

interface ReassignmentState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'cancelled' | 'rolling_back';
  currentIndex: number;
  total: number;
  results: ReassignmentResult[];
  startTime?: Date;
  pausedAt?: Date;
}

// ============================================
// CONSTANTES
// ============================================

const MAX_SELECTION = 30;
const PAGE_SIZE = 50;

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const BulkReassignmentTab: React.FC = () => {
  const { user } = useAuth();
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCoordinacion, setFilterCoordinacion] = useState('');
  const [filterEjecutivo, setFilterEjecutivo] = useState('');
  const [filterEtapa, setFilterEtapa] = useState('');
  const [filterSinAsignar, setFilterSinAsignar] = useState(false);
  
  // Etapas disponibles (mismas que ProspectosManager)
  const etapasDisponibles = useMemo(() => [
    'Es miembro',
    'Activo PQNC',
    'Validando membresia',
    'En seguimiento',
    'Interesado',
    'Atendió llamada',
    'Con ejecutivo',
    'Certificado adquirido'
  ], []);
  
  // Estados de datos
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedProspectos, setSelectedProspectos] = useState<Prospecto[]>([]); // Prospectos seleccionados con datos completos
  const [coordinaciones, setCoordinaciones] = useState<Coordinacion[]>([]);
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  
  // Estado de pestaña del grid (resultados vs mi selección)
  const [gridTab, setGridTab] = useState<'results' | 'selection'>('results');
  
  // Estados de destino
  const [targetCoordinacionId, setTargetCoordinacionId] = useState('');
  const [targetEjecutivoId, setTargetEjecutivoId] = useState('');
  const [targetEjecutivos, setTargetEjecutivos] = useState<Ejecutivo[]>([]);
  
  // Estados de proceso
  const [reassignmentState, setReassignmentState] = useState<ReassignmentState>({
    status: 'idle',
    currentIndex: 0,
    total: 0,
    results: []
  });
  const [showSummary, setShowSummary] = useState(false);
  const [simulatedProgress, setSimulatedProgress] = useState(0); // Progreso simulado para cada item
  
  // Referencias
  const abortControllerRef = useRef<AbortController | null>(null);
  const pauseRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Constantes
  const ESTIMATED_TIME_PER_ITEM = 50000; // 50 segundos estimados por reasignación
  const PROGRESS_UPDATE_INTERVAL = 500; // Actualizar cada 500ms
  
  // ============================================
  // FUNCIÓN DE ENRIQUECIMIENTO
  // ============================================
  
  // Enriquecer prospectos con nombres de coordinación y ejecutivo
  const enrichProspectosWithNames = useCallback(async (prospectosList: Prospecto[]): Promise<Prospecto[]> => {
    if (prospectosList.length === 0) return [];
    
    // Obtener IDs únicos de coordinaciones y ejecutivos
    const coordIds = [...new Set(prospectosList.map(p => p.coordinacion_id).filter(Boolean))] as string[];
    const ejIds = [...new Set(prospectosList.map(p => p.ejecutivo_id).filter(Boolean))] as string[];
    
    // Crear mapas de nombres
    const coordMap = new Map<string, string>();
    const ejMap = new Map<string, string>();
    
    // Llenar mapa de coordinaciones desde los datos cargados
    coordinaciones.forEach(c => {
      coordMap.set(c.id, c.nombre || c.codigo || '');
    });
    
    // Llenar mapa de ejecutivos desde los datos cargados
    ejecutivos.forEach(e => {
      ejMap.set(e.id, e.full_name || '');
    });
    
    // Enriquecer prospectos
    return prospectosList.map(p => ({
      ...p,
      coordinacion_nombre: p.coordinacion_id ? coordMap.get(p.coordinacion_id) || '' : '',
      ejecutivo_nombre: p.ejecutivo_id ? ejMap.get(p.ejecutivo_id) || p.asesor_asignado || '' : ''
    }));
  }, [coordinaciones, ejecutivos]);

  // ============================================
  // EFECTOS
  // ============================================

  // Cargar coordinaciones y ejecutivos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [coordData, ejData] = await Promise.all([
          coordinacionService.getCoordinaciones(),
          coordinacionService.getAllEjecutivos()
        ]);
        setCoordinaciones(coordData);
        setEjecutivos(ejData);
      } catch {
        // Error cargando datos iniciales
      }
    };
    loadInitialData();
  }, []);

  // Debounce de búsqueda
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm]);

  // Cargar prospectos cuando cambian filtros
  useEffect(() => {
    loadProspectos();
  }, [debouncedSearch, filterCoordinacion, filterEjecutivo, filterEtapa, filterSinAsignar, page, enrichProspectosWithNames]);

  // Cargar ejecutivos y coordinadores del destino cuando cambia coordinación
  useEffect(() => {
    if (targetCoordinacionId) {
      const loadTargetEjecutivos = async () => {
        try {
          // Cargar ejecutivos y coordinadores en paralelo
          const [ejs, coords] = await Promise.all([
            coordinacionService.getEjecutivosByCoordinacion(targetCoordinacionId),
            coordinacionService.getCoordinadoresByCoordinacion(targetCoordinacionId)
          ]);
          
          // Crear set de IDs de coordinadores para marcar duplicados
          const coordinadorIds = new Set(coords.map(c => c.id));
          
          // Marcar coordinadores con is_coordinator = true (siempre habilitados)
          const coordinadoresMarcados = coords.map(c => ({
            ...c,
            is_coordinator: true
          }));
          
          // Marcar ejecutivos que también son coordinadores, y filtrar los que ya están en coordinadores
          const ejecutivosSinDuplicar = ejs
            .filter(e => !coordinadorIds.has(e.id)) // Evitar duplicados
            .map(e => ({
              ...e,
              is_coordinator: false // Explícitamente marcados como no coordinadores
            }));
          
          // Combinar: primero coordinadores (siempre habilitados), luego ejecutivos
          const combined = [...coordinadoresMarcados, ...ejecutivosSinDuplicar];
          
          setTargetEjecutivos(combined);
          setTargetEjecutivoId('');
        } catch {
          setTargetEjecutivos([]);
        }
      };
      loadTargetEjecutivos();
    } else {
      setTargetEjecutivos([]);
      setTargetEjecutivoId('');
    }
  }, [targetCoordinacionId]);

  // Protección contra cierre/recarga durante proceso
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (reassignmentState.status === 'running' || reassignmentState.status === 'rolling_back') {
        e.preventDefault();
        e.returnValue = 'Hay una reasignación en proceso. ¿Seguro que deseas salir?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [reassignmentState.status]);

  // ============================================
  // FUNCIONES DE CARGA
  // ============================================

  const loadProspectos = useCallback(async () => {
    if (!user?.id || !analysisSupabase) return;
    
    setIsLoading(true);
    try {
      // Crear query base - usar select('*') como en ProspectosManager
      let query = analysisSupabase
        .from('prospectos')
        .select('*', { count: 'exact' });

      // Aplicar permisos (con verificación de que retorne una query válida)
      try {
        const filteredQuery = await permissionsService.applyProspectFilters(query, user.id);
        if (filteredQuery && typeof filteredQuery.eq === 'function') {
          query = filteredQuery;
        }
      } catch {
        // Error aplicando filtros, usar query base
      }

      // Filtros - verificar que query tiene los métodos necesarios
      if (query && typeof query.or === 'function') {
        if (debouncedSearch) {
          // Detectar si es búsqueda múltiple (separada por comas o saltos de línea)
          const searchTerms = debouncedSearch
            .split(/[,\n]/)
            .map(t => t.trim())
            .filter(t => t.length > 0);
          
          if (searchTerms.length > 1) {
            // Búsqueda múltiple: crear filtro OR para cada término
            const orConditions = searchTerms.map(term => {
              const escapedTerm = term.replace(/[%_]/g, '\\$&'); // Escapar caracteres especiales
              return `nombre_completo.ilike.%${escapedTerm}%,nombre_whatsapp.ilike.%${escapedTerm}%`;
            }).join(',');
            query = query.or(orConditions);
          } else {
            // Búsqueda simple
            const searchDigits = debouncedSearch.replace(/\D/g, '');
            if (searchDigits.length >= 6) {
              query = query.or(`whatsapp.ilike.%${searchDigits}%,email.ilike.%${debouncedSearch}%`);
            } else {
              query = query.or(`nombre_completo.ilike.%${debouncedSearch}%,nombre_whatsapp.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
            }
          }
        }
        if (filterCoordinacion && typeof query.eq === 'function') {
          query = query.eq('coordinacion_id', filterCoordinacion);
        }
        if (filterEjecutivo && typeof query.eq === 'function') {
          query = query.eq('ejecutivo_id', filterEjecutivo);
        }
        if (filterEtapa && typeof query.eq === 'function') {
          query = query.eq('etapa', filterEtapa);
        }
        if (filterSinAsignar && typeof query.is === 'function') {
          query = query.is('ejecutivo_id', null);
        }
      }

      // Para búsqueda múltiple, aumentar el límite de resultados
      const searchTerms = debouncedSearch.split(/[,\n]/).map(t => t.trim()).filter(t => t.length > 0);
      const isMultiSearch = searchTerms.length > 1;
      const effectivePageSize = isMultiSearch ? Math.max(PAGE_SIZE, searchTerms.length * 2) : PAGE_SIZE;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(page * effectivePageSize, (page + 1) * effectivePageSize - 1);

      if (error) throw error;
      
      // Enriquecer datos con nombres de coordinación y ejecutivo
      let enrichedData = await enrichProspectosWithNames(data || []);
      
      // Para búsqueda múltiple, ordenar resultados según el orden de entrada
      if (isMultiSearch && enrichedData.length > 0) {
        const normalizeText = (text: string) => 
          text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        
        // Crear mapa de posiciones según orden de entrada
        const orderMap = new Map<string, number>();
        searchTerms.forEach((term, index) => {
          orderMap.set(normalizeText(term), index);
        });
        
        // Ordenar prospectos según el orden de entrada
        enrichedData = enrichedData.sort((a, b) => {
          const nameA = normalizeText(a.nombre_completo || a.nombre_whatsapp || '');
          const nameB = normalizeText(b.nombre_completo || b.nombre_whatsapp || '');
          
          // Buscar el índice del término que coincide con cada prospecto
          let indexA = searchTerms.length; // Por defecto al final
          let indexB = searchTerms.length;
          
          for (const [term, index] of orderMap) {
            if (nameA.includes(term) || term.includes(nameA.split(' ')[0])) {
              indexA = Math.min(indexA, index);
            }
            if (nameB.includes(term) || term.includes(nameB.split(' ')[0])) {
              indexB = Math.min(indexB, index);
            }
          }
          
          return indexA - indexB;
        });
      }
      
      setProspectos(enrichedData);
      setTotalCount(count || 0);
    } catch {
      toast.error('Error al cargar prospectos');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, debouncedSearch, filterCoordinacion, filterEjecutivo, filterEtapa, filterSinAsignar, page, enrichProspectosWithNames]);

  // ============================================
  // FUNCIONES DE SELECCIÓN
  // ============================================

  const handleSelectProspecto = useCallback((id: string, prospecto?: Prospecto) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        // Remover de selectedProspectos
        setSelectedProspectos(prevProspectos => prevProspectos.filter(p => p.id !== id));
      } else if (newSet.size < MAX_SELECTION) {
        newSet.add(id);
        // Agregar a selectedProspectos si tenemos los datos
        if (prospecto) {
          setSelectedProspectos(prevProspectos => {
            if (!prevProspectos.find(p => p.id === id)) {
              return [...prevProspectos, prospecto];
            }
            return prevProspectos;
          });
        }
      } else {
        toast.error(`Máximo ${MAX_SELECTION} prospectos seleccionados`);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const availableProspectos = prospectos.slice(0, MAX_SELECTION - selectedIds.size);
    const availableIds = availableProspectos.map(p => p.id);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      availableIds.forEach(id => newSet.add(id));
      return newSet;
    });
    // Agregar los prospectos completos
    setSelectedProspectos(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const newProspectos = availableProspectos.filter(p => !existingIds.has(p.id));
      return [...prev, ...newProspectos];
    });
  }, [prospectos, selectedIds.size]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectedProspectos([]);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearch('');
    setFilterCoordinacion('');
    setFilterEjecutivo('');
    setFilterEtapa('');
    setFilterSinAsignar(false);
    setPage(0);
  }, []);

  // ============================================
  // FUNCIONES DE REASIGNACIÓN
  // ============================================

  const startReassignment = useCallback(async () => {
    if (!targetCoordinacionId || !targetEjecutivoId || selectedIds.size === 0) {
      toast.error('Selecciona coordinación, ejecutivo y al menos un prospecto');
      return;
    }

    // IMPORTANTE: Usar selectedProspectos (estado con datos completos), no prospectos (página actual)
    if (selectedProspectos.length === 0) {
      toast.error('No hay prospectos seleccionados con datos completos');
      return;
    }

    // Capturar valores al inicio para evitar problemas de closures
    const ejecutivoDestino = targetEjecutivoId;
    const coordinacionDestino = targetCoordinacionId;
    const prospectosAReasignar = [...selectedProspectos]; // Copia para evitar mutaciones
    
    abortControllerRef.current = new AbortController();
    pauseRef.current = false;

    setReassignmentState({
      status: 'running',
      currentIndex: 0,
      total: prospectosAReasignar.length,
      results: [],
      startTime: new Date()
    });

    for (let i = 0; i < prospectosAReasignar.length; i++) {
      // Verificar si se pausó o canceló
      if (pauseRef.current) {
        setReassignmentState(prev => ({ ...prev, status: 'paused', pausedAt: new Date() }));
        return;
      }
      if (abortControllerRef.current?.signal.aborted) {
        setReassignmentState(prev => ({ ...prev, status: 'cancelled' }));
        setShowSummary(true);
        return;
      }

      const prospecto = prospectosAReasignar[i];
      setReassignmentState(prev => ({ ...prev, currentIndex: i }));
      
      // Iniciar progreso simulado para este item
      setSimulatedProgress(0);
      const startTime = Date.now();
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const estimatedProgress = Math.min(95, (elapsed / ESTIMATED_TIME_PER_ITEM) * 100);
        setSimulatedProgress(estimatedProgress);
      }, PROGRESS_UPDATE_INTERVAL);

      try {
        const requestData = await dynamicsReasignacionService.enriquecerDatosReasignacion(
          prospecto.id,
          ejecutivoDestino, // Usar variable capturada
          coordinacionDestino, // Usar variable capturada
          user?.id || '',
          'Reasignación masiva desde panel'
        );

        // Guardar datos anteriores para posible rollback
        const result: ReassignmentResult = {
          prospecto_id: prospecto.id,
          prospecto_nombre: prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Sin nombre',
          success: false,
          ejecutivo_anterior_id: prospecto.ejecutivo_id || null,
          ejecutivo_anterior_nombre: prospecto.ejecutivo_nombre || null,
          coordinacion_anterior_id: prospecto.coordinacion_id || null,
          coordinacion_anterior_nombre: prospecto.coordinacion_nombre || null
        };

        const response = await dynamicsReasignacionService.reasignarProspecto(requestData);
        result.success = response.success;
        if (!response.success) result.error = response.error;

        // Detener progreso simulado y poner en 100%
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setSimulatedProgress(100);

        setReassignmentState(prev => ({
          ...prev,
          results: [...prev.results, result]
        }));

        // Pequeña pausa para mostrar el 100% antes de pasar al siguiente
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        // Detener progreso simulado en caso de error
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setSimulatedProgress(0);

        setReassignmentState(prev => ({
          ...prev,
          results: [...prev.results, {
            prospecto_id: prospecto.id,
            prospecto_nombre: prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Sin nombre',
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
          }]
        }));
      }
    }

    // Limpiar intervalo si quedó activo
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    setReassignmentState(prev => ({ ...prev, status: 'completed', currentIndex: prev.total }));
    setShowSummary(true);
    
    // Limpiar selección
    setSelectedIds(new Set());
    setSelectedProspectos([]);
    
    // Re-render silencioso: recargar prospectos para mostrar nueva asignación
    await loadProspectos();
  }, [targetCoordinacionId, targetEjecutivoId, selectedIds, selectedProspectos, user?.id, loadProspectos]);

  const pauseReassignment = useCallback(() => {
    pauseRef.current = true;
    // Detener progreso simulado
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const resumeReassignment = useCallback(async () => {
    if (reassignmentState.status !== 'paused') return;
    
    pauseRef.current = false;
    const selectedProspectos = prospectos.filter(p => selectedIds.has(p.id));
    const startIndex = reassignmentState.currentIndex + 1;

    setReassignmentState(prev => ({ ...prev, status: 'running', pausedAt: undefined }));

    for (let i = startIndex; i < selectedProspectos.length; i++) {
      if (pauseRef.current) {
        setReassignmentState(prev => ({ ...prev, status: 'paused', pausedAt: new Date() }));
        return;
      }
      if (abortControllerRef.current?.signal.aborted) {
        setReassignmentState(prev => ({ ...prev, status: 'cancelled' }));
        setShowSummary(true);
        return;
      }

      const prospecto = selectedProspectos[i];
      setReassignmentState(prev => ({ ...prev, currentIndex: i }));

      try {
        const requestData = await dynamicsReasignacionService.enriquecerDatosReasignacion(
          prospecto.id,
          targetEjecutivoId,
          targetCoordinacionId,
          user?.id || '',
          'Reasignación masiva desde panel'
        );

        const result: ReassignmentResult = {
          prospecto_id: prospecto.id,
          prospecto_nombre: prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Sin nombre',
          success: false,
          ejecutivo_anterior_id: prospecto.ejecutivo_id || null,
          ejecutivo_anterior_nombre: prospecto.ejecutivo_nombre || null,
          coordinacion_anterior_id: prospecto.coordinacion_id || null,
          coordinacion_anterior_nombre: prospecto.coordinacion_nombre || null
        };

        const response = await dynamicsReasignacionService.reasignarProspecto(requestData);
        result.success = response.success;
        if (!response.success) result.error = response.error;

        setReassignmentState(prev => ({
          ...prev,
          results: [...prev.results, result]
        }));

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        setReassignmentState(prev => ({
          ...prev,
          results: [...prev.results, {
            prospecto_id: prospecto.id,
            prospecto_nombre: prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Sin nombre',
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
          }]
        }));
      }
    }

    setReassignmentState(prev => ({ ...prev, status: 'completed', currentIndex: prev.total }));
    setShowSummary(true);
    setSelectedIds(new Set());
    loadProspectos();
  }, [reassignmentState, prospectos, selectedIds, targetEjecutivoId, targetCoordinacionId, user?.id, loadProspectos]);

  const cancelReassignment = useCallback(() => {
    abortControllerRef.current?.abort();
    pauseRef.current = false;
    // Detener progreso simulado
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setSimulatedProgress(0);
  }, []);

  const rollbackReassignments = useCallback(async () => {
    const successfulResults = reassignmentState.results.filter(r => r.success && r.ejecutivo_anterior_id);
    
    if (successfulResults.length === 0) {
      toast.error('No hay reasignaciones exitosas para revertir');
      return;
    }

    setReassignmentState(prev => ({
      ...prev,
      status: 'rolling_back',
      currentIndex: 0,
      total: successfulResults.length
    }));

    const rollbackResults: ReassignmentResult[] = [];

    for (let i = 0; i < successfulResults.length; i++) {
      const result = successfulResults[i];
      setReassignmentState(prev => ({ ...prev, currentIndex: i }));

      try {
        const requestData = await dynamicsReasignacionService.enriquecerDatosReasignacion(
          result.prospecto_id,
          result.ejecutivo_anterior_id!,
          result.coordinacion_anterior_id || targetCoordinacionId,
          user?.id || '',
          'Rollback de reasignación masiva'
        );

        const response = await dynamicsReasignacionService.reasignarProspecto(requestData);
        
        rollbackResults.push({
          ...result,
          success: response.success,
          error: response.success ? undefined : response.error
        });

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        rollbackResults.push({
          ...result,
          success: false,
          error: error instanceof Error ? error.message : 'Error en rollback'
        });
      }
    }

    const successCount = rollbackResults.filter(r => r.success).length;
    toast.success(`Rollback completado: ${successCount}/${rollbackResults.length} revertidos`);
    
    setReassignmentState(prev => ({
      ...prev,
      status: 'completed',
      results: rollbackResults
    }));
    
    loadProspectos();
  }, [reassignmentState.results, targetCoordinacionId, user?.id, loadProspectos]);

  const resetProcess = useCallback(() => {
    setReassignmentState({
      status: 'idle',
      currentIndex: 0,
      total: 0,
      results: []
    });
    setShowSummary(false);
  }, []);

  // ============================================
  // CÁLCULOS
  // ============================================

  const progressPercent = useMemo(() => {
    if (reassignmentState.total === 0) return 0;
    return Math.round((reassignmentState.currentIndex / reassignmentState.total) * 100);
  }, [reassignmentState.currentIndex, reassignmentState.total]);

  const successCount = useMemo(() => 
    reassignmentState.results.filter(r => r.success).length
  , [reassignmentState.results]);

  const errorCount = useMemo(() => 
    reassignmentState.results.filter(r => !r.success).length
  , [reassignmentState.results]);

  const isProcessing = reassignmentState.status === 'running' || reassignmentState.status === 'rolling_back';
  const isPaused = reassignmentState.status === 'paused';

  // Obtener ejecutivos filtrados por coordinación seleccionada
  const filteredEjecutivos = useMemo(() => {
    if (!filterCoordinacion) return ejecutivos;
    return ejecutivos.filter(e => e.coordinacion_id === filterCoordinacion);
  }, [ejecutivos, filterCoordinacion]);

  // ============================================
  // RENDER
  // ============================================

  // Prospecto actual en proceso
  const currentProspecto = selectedProspectos[reassignmentState.currentIndex];

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      
      {/* Modal de Progreso - Bloquea toda la UI */}
      <AnimatePresence>
        {(reassignmentState.status === 'running' || reassignmentState.status === 'paused') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              {/* Header del modal */}
              <div className="px-6 py-4 bg-gradient-to-r from-violet-500 to-purple-600">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    {reassignmentState.status === 'paused' ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {reassignmentState.status === 'paused' ? 'Reasignación Pausada' : 'Reasignando Prospectos'}
                    </h3>
                    <p className="text-sm text-white/80">
                      {reassignmentState.status === 'paused' 
                        ? 'El proceso está en pausa' 
                        : 'No cierres esta ventana'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6">
                {/* Barra de progreso */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
                      Progreso
                    </span>
                    <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                      {reassignmentState.currentIndex + 1} de {reassignmentState.total}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 text-center">
                    {progressPercent}% completado
                  </p>
                </div>

                {/* Prospecto actual con progreso del item */}
                {currentProspecto && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                        Procesando ahora
                      </p>
                      <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                        {Math.round(simulatedProgress)}%
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {currentProspecto.nombre_completo || currentProspecto.nombre_whatsapp || 'Sin nombre'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mb-3">
                      {currentProspecto.whatsapp || currentProspecto.email || ''}
                    </p>
                    {/* Barra de progreso del item actual */}
                    <div className="h-2 bg-slate-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full transition-all duration-300 ${
                          simulatedProgress >= 100 
                            ? 'bg-emerald-500' 
                            : 'bg-gradient-to-r from-violet-400 to-purple-500'
                        }`}
                        style={{ width: `${simulatedProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 dark:text-gray-500 mt-1 text-center">
                      {simulatedProgress >= 100 ? '✓ Completado' : 'Enviando al CRM...'}
                    </p>
                  </div>
                )}

                {/* Estadísticas en tiempo real */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {reassignmentState.results.filter(r => r.success).length}
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">Exitosos</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      {reassignmentState.results.filter(r => !r.success).length}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">Fallidos</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20">
                    <p className="text-xl font-bold text-violet-600 dark:text-violet-400">
                      1
                    </p>
                    <p className="text-xs text-violet-700 dark:text-violet-300">En progreso</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-slate-100 dark:bg-gray-700">
                    <p className="text-2xl font-bold text-slate-600 dark:text-gray-300">
                      {reassignmentState.total - reassignmentState.currentIndex - 1}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">Pendientes</p>
                  </div>
                </div>

                {/* Advertencia */}
                <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">No interrumpir el proceso por seguridad</span>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-gray-900/50 border-t border-slate-200 dark:border-gray-700 flex justify-end gap-3">
                {reassignmentState.status === 'running' ? (
                  <>
                    <button
                      onClick={pauseReassignment}
                      className="px-4 py-2 rounded-xl font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors flex items-center gap-2"
                    >
                      <Pause className="w-4 h-4" />
                      Pausar
                    </button>
                    <button
                      onClick={cancelReassignment}
                      className="px-4 py-2 rounded-xl font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={resumeReassignment}
                      className="px-4 py-2 rounded-xl font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 transition-colors flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Continuar
                    </button>
                    <button
                      onClick={cancelReassignment}
                      className="px-4 py-2 rounded-xl font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header con estadísticas */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Reasignación Masiva
              </h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Selecciona hasta {MAX_SELECTION} prospectos para reasignar
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Badge de selección */}
            <div className={`px-4 py-2 rounded-xl font-medium transition-all ${
              selectedIds.size > 0 
                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400'
            }`}>
              <span className="text-lg font-bold">{selectedIds.size}</span>
              <span className="text-sm ml-1">/ {MAX_SELECTION}</span>
            </div>
            
            {selectedIds.size > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleClearSelection}
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Panel izquierdo: Filtros y Lista */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 dark:border-gray-700">
          
          {/* Barra de filtros */}
          <div className="flex-shrink-0 p-4 space-y-3 bg-white/50 dark:bg-gray-800/50 border-b border-slate-200 dark:border-gray-700">
            
            {/* Búsqueda - Soporta múltiples nombres separados por comas o saltos de línea */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <textarea
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar nombre, teléfono o email (soporta lista)"
                rows={searchTerm.includes('\n') || searchTerm.includes(',') ? 4 : 1}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none scrollbar-none"
                style={{ 
                  minHeight: searchTerm.includes('\n') || searchTerm.includes(',') ? '100px' : '42px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              />
              {(searchTerm.includes('\n') || searchTerm.includes(',')) && (
                <div className="absolute right-3 top-2 px-2 py-0.5 text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full">
                  {searchTerm.split(/[,\n]/).filter(t => t.trim()).length} nombres
                </div>
              )}
            </div>

            {/* Filtros en grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Coordinación */}
              <select
                value={filterCoordinacion}
                onChange={(e) => {
                  setFilterCoordinacion(e.target.value);
                  setFilterEjecutivo('');
                  setPage(0);
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-slate-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="">Todas las coordinaciones</option>
                {coordinaciones.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>

              {/* Ejecutivo */}
              <select
                value={filterEjecutivo}
                onChange={(e) => { setFilterEjecutivo(e.target.value); setPage(0); }}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-slate-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="">Todos los ejecutivos</option>
                {filteredEjecutivos.map(e => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>

              {/* Etapa */}
              <select
                value={filterEtapa}
                onChange={(e) => { setFilterEtapa(e.target.value); setPage(0); }}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-slate-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="">Todas las etapas</option>
                {etapasDisponibles.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>

              {/* Sin asignar toggle */}
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="checkbox"
                  checked={filterSinAsignar}
                  onChange={(e) => { setFilterSinAsignar(e.target.checked); setPage(0); }}
                  className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-slate-700 dark:text-gray-300">Sin asignar</span>
              </label>
            </div>

            {/* Acciones de selección */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  disabled={isProcessing || prospectos.length === 0 || gridTab === 'selection'}
                  className="px-3 py-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  Seleccionar página
                </button>
                <button
                  onClick={handleClearFilters}
                  disabled={gridTab === 'selection'}
                  className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Limpiar filtros
                </button>
                <span className="text-sm text-slate-400">
                  {gridTab === 'results' 
                    ? `${totalCount.toLocaleString()} prospectos encontrados`
                    : `${selectedProspectos.length} seleccionados`
                  }
                </span>
              </div>
              
              <button
                onClick={loadProspectos}
                disabled={isLoading || gridTab === 'selection'}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Pestañas del Grid */}
            <div className="flex border-b border-slate-200 dark:border-gray-700 mt-2">
              <button
                onClick={() => setGridTab('results')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  gridTab === 'results'
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Resultados
                </span>
              </button>
              <button
                onClick={() => setGridTab('selection')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  gridTab === 'selection'
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Mi Selección
                  {selectedProspectos.length > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full">
                      {selectedProspectos.length}
                    </span>
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Lista de prospectos */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Pestaña Resultados */}
            {gridTab === 'results' && (
              <>
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                  </div>
                ) : prospectos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <Users className="w-12 h-12 mb-2 opacity-50" />
                    <p>No se encontraron prospectos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {prospectos.map((prospecto) => {
                      const isSelected = selectedIds.has(prospecto.id);
                      return (
                        <motion.div
                          key={prospecto.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => !isProcessing && handleSelectProspecto(prospecto.id, prospecto)}
                          className={`
                            p-4 rounded-xl border-2 transition-all cursor-pointer
                            ${isSelected 
                              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-md shadow-violet-500/10' 
                              : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-300 dark:hover:border-violet-600'
                            }
                            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <div className={`
                              w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all mt-0.5 flex-shrink-0
                              ${isSelected 
                                ? 'bg-violet-500 border-violet-500' 
                                : 'border-slate-300 dark:border-gray-600'
                              }
                            `}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>

                            {/* Avatar */}
                            <Avatar
                              name={prospecto.nombre_completo || prospecto.nombre_whatsapp || '?'}
                              size="sm"
                            />

                            {/* Info principal */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Sin nombre'}
                              </p>
                              <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-gray-400 mt-1">
                                {prospecto.whatsapp && (
                                  <PhoneText 
                                    phone={prospecto.whatsapp} 
                                    prospecto={{ id: prospecto.id, id_dynamics: prospecto.id_dynamics }}
                                    className="text-sm"
                                  />
                                )}
                                {prospecto.email && (
                                  <span className="truncate max-w-[180px]">{prospecto.email}</span>
                                )}
                              </div>
                              {/* Fecha de creación */}
                              {prospecto.created_at && (
                                <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-gray-500 mt-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{new Date(prospecto.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                              )}
                            </div>

                            {/* Asignación actual - Mejorada */}
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              {/* Coordinación destacada */}
                              {prospecto.coordinacion_nombre && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md">
                                  {prospecto.coordinacion_nombre}
                                </span>
                              )}
                              {/* Ejecutivo nombre completo */}
                              <p className="text-sm font-medium text-slate-700 dark:text-gray-200">
                                {prospecto.ejecutivo_nombre || (
                                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                    <UserX className="w-3.5 h-3.5" />
                                    Sin asignar
                                  </span>
                                )}
                              </p>
                              {/* Etapa si existe */}
                              {prospecto.etapa && (
                                <span className="text-xs text-slate-400 dark:text-gray-500">
                                  {prospecto.etapa}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Paginación */}
                {totalCount > PAGE_SIZE && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-gray-700">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0 || isProcessing}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-slate-500">
                      Página {page + 1} de {Math.ceil(totalCount / PAGE_SIZE)}
                    </span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={(page + 1) * PAGE_SIZE >= totalCount || isProcessing}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Pestaña Mi Selección */}
            {gridTab === 'selection' && (
              <>
                {selectedProspectos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <CheckCircle className="w-12 h-12 mb-2 opacity-50" />
                    <p className="font-medium">No hay prospectos seleccionados</p>
                    <p className="text-sm mt-1">Ve a la pestaña "Resultados" para seleccionar prospectos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedProspectos.map((prospecto, index) => (
                      <motion.div
                        key={prospecto.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`
                          p-4 rounded-xl border-2 transition-all
                          border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-md shadow-violet-500/10
                          ${isProcessing ? 'opacity-50' : ''}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          {/* Número de orden */}
                          <div className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {index + 1}
                          </div>

                          {/* Avatar */}
                          <Avatar
                            name={prospecto.nombre_completo || prospecto.nombre_whatsapp || '?'}
                            size="sm"
                          />

                          {/* Info principal */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Sin nombre'}
                            </p>
                            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-gray-400 mt-1">
                              {prospecto.whatsapp && (
                                <PhoneText 
                                  phone={prospecto.whatsapp} 
                                  prospecto={{ id: prospecto.id, id_dynamics: prospecto.id_dynamics }}
                                  className="text-sm"
                                />
                              )}
                              {prospecto.email && (
                                <span className="truncate max-w-[180px]">{prospecto.email}</span>
                              )}
                            </div>
                            {/* Fecha de creación */}
                            {prospecto.created_at && (
                              <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-gray-500 mt-1">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(prospecto.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              </div>
                            )}
                          </div>

                          {/* Asignación actual */}
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {prospecto.coordinacion_nombre && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md">
                                {prospecto.coordinacion_nombre}
                              </span>
                            )}
                            <p className="text-sm font-medium text-slate-700 dark:text-gray-200">
                              {prospecto.ejecutivo_nombre || (
                                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                  <UserX className="w-3.5 h-3.5" />
                                  Sin asignar
                                </span>
                              )}
                            </p>
                            {prospecto.etapa && (
                              <span className="text-xs text-slate-400 dark:text-gray-500">
                                {prospecto.etapa}
                              </span>
                            )}
                          </div>

                          {/* Botón quitar de selección */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectProspecto(prospecto.id, prospecto);
                            }}
                            disabled={isProcessing}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Acciones de Mi Selección */}
                {selectedProspectos.length > 0 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-gray-700">
                    <span className="text-sm text-slate-500 dark:text-gray-400">
                      {selectedProspectos.length} de {MAX_SELECTION} máximo
                    </span>
                    <button
                      onClick={handleClearSelection}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      Limpiar selección
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Panel derecho: Destino y Proceso */}
        <div className="w-[400px] flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
          
          {/* Selector de destino */}
          <div className="flex-shrink-0 p-5 border-b border-slate-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Destino de Reasignación</h3>
            </div>

            <div className="space-y-3">
              {/* Coordinación destino */}
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                  Coordinación
                </label>
                <select
                  value={targetCoordinacionId}
                  onChange={(e) => setTargetCoordinacionId(e.target.value)}
                  disabled={isProcessing}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50"
                >
                  <option value="">Seleccionar coordinación...</option>
                  {coordinaciones.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Ejecutivo destino */}
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                  Asignar a
                </label>
                <select
                  value={targetEjecutivoId}
                  onChange={(e) => setTargetEjecutivoId(e.target.value)}
                  disabled={isProcessing || !targetCoordinacionId}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50"
                >
                  <option value="">Seleccionar persona...</option>
                  
                  {/* Coordinadores primero (siempre habilitados) */}
                  {targetEjecutivos.filter(e => e.is_coordinator === true).length > 0 && (
                    <option disabled className="text-slate-500 font-semibold">── Coordinadores ──</option>
                  )}
                  {targetEjecutivos
                    .filter(e => e.is_coordinator === true)
                    .map(e => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} (Coord.)
                      </option>
                    ))}
                  
                  {/* Ejecutivos operativos */}
                  {targetEjecutivos.filter(e => !e.is_coordinator && e.is_operativo === true).length > 0 && (
                    <option disabled className="text-slate-500 font-semibold">── Ejecutivos ──</option>
                  )}
                  {targetEjecutivos
                    .filter(e => !e.is_coordinator && e.is_operativo === true)
                    .map(e => (
                      <option key={e.id} value={e.id}>
                        {e.full_name}
                      </option>
                    ))}
                  
                  {/* Ejecutivos no operativos (deshabilitados) */}
                  {targetEjecutivos.filter(e => !e.is_coordinator && e.is_operativo !== true).length > 0 && (
                    <option disabled className="text-slate-400">── No disponibles ──</option>
                  )}
                  {targetEjecutivos
                    .filter(e => !e.is_coordinator && e.is_operativo !== true)
                    .map(e => (
                      <option key={e.id} value={e.id} disabled className="text-slate-400">
                        {e.full_name} (No operativo)
                      </option>
                    ))}
                </select>
                {targetCoordinacionId && targetEjecutivos.length > 0 && (
                  <p className="mt-1 text-xs text-slate-400">
                    {targetEjecutivos.filter(e => e.is_coordinator === true).length} coordinadores, {targetEjecutivos.filter(e => !e.is_coordinator && e.is_operativo === true).length} ejecutivos operativos
                  </p>
                )}
              </div>

              {/* Botón iniciar */}
              {reassignmentState.status === 'idle' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startReassignment}
                  disabled={!targetCoordinacionId || !targetEjecutivoId || selectedIds.size === 0}
                  className="w-full mt-2 px-4 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  Iniciar Reasignación ({selectedIds.size})
                </motion.button>
              )}
            </div>
          </div>

          {/* Panel de progreso */}
          <AnimatePresence mode="wait">
            {(isProcessing || isPaused || showSummary) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Barra de progreso */}
                <div className="p-5 border-b border-slate-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
                      {reassignmentState.status === 'rolling_back' ? 'Revirtiendo cambios...' : 'Progreso'}
                    </span>
                    <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                      {progressPercent}%
                    </span>
                  </div>
                  
                  <div className="h-3 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.3 }}
                      className={`h-full rounded-full ${
                        reassignmentState.status === 'rolling_back'
                          ? 'bg-gradient-to-r from-orange-500 to-red-500'
                          : 'bg-gradient-to-r from-violet-500 to-purple-500'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-sm text-slate-500">
                    <span>{reassignmentState.currentIndex} / {reassignmentState.total}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                        {successCount}
                      </span>
                      <span className="flex items-center gap-1 text-red-500">
                        <XCircle className="w-4 h-4" />
                        {errorCount}
                      </span>
                    </div>
                  </div>

                  {/* Botones de control */}
                  {!showSummary && (
                    <div className="flex items-center gap-2 mt-4">
                      {reassignmentState.status === 'running' && (
                        <button
                          onClick={pauseReassignment}
                          className="flex-1 px-4 py-2 rounded-xl font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Pause className="w-4 h-4" />
                          Pausar
                        </button>
                      )}
                      {reassignmentState.status === 'paused' && (
                        <button
                          onClick={resumeReassignment}
                          className="flex-1 px-4 py-2 rounded-xl font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Continuar
                        </button>
                      )}
                      <button
                        onClick={cancelReassignment}
                        className="flex-1 px-4 py-2 rounded-xl font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

                {/* Resumen de resultados */}
                {showSummary && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-gray-700">
                      <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <ListChecks className="w-5 h-5 text-violet-500" />
                        Resumen de Cambios
                      </h4>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {reassignmentState.results.map((result, idx) => (
                        <div
                          key={result.prospecto_id}
                          className={`p-3 rounded-lg border ${
                            result.success 
                              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
                              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="font-medium text-sm text-slate-900 dark:text-white truncate">
                              {result.prospecto_nombre}
                            </span>
                          </div>
                          {result.error && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {result.error}
                            </p>
                          )}
                          {result.success && result.ejecutivo_anterior_nombre && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                              {result.ejecutivo_anterior_nombre} → Nuevo ejecutivo
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Acciones del resumen */}
                    <div className="p-4 border-t border-slate-200 dark:border-gray-700 space-y-2">
                      {successCount > 0 && reassignmentState.status !== 'rolling_back' && (
                        <button
                          onClick={rollbackReassignments}
                          className="w-full px-4 py-2.5 rounded-xl font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Revertir Cambios ({successCount})
                        </button>
                      )}
                      <button
                        onClick={resetProcess}
                        className="w-full px-4 py-2.5 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        Nueva Reasignación
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de procesamiento en tiempo real */}
                {!showSummary && reassignmentState.results.length > 0 && (
                  <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {reassignmentState.results.slice(-10).reverse().map((result, idx) => (
                      <motion.div
                        key={`${result.prospecto_id}-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-sm py-1"
                      >
                        {result.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                        <span className="truncate text-slate-600 dark:text-gray-400">
                          {result.prospecto_nombre}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Estado inicial: Instrucciones */}
          {reassignmentState.status === 'idle' && !showSummary && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center mb-4">
                <ArrowRight className="w-8 h-8 text-slate-400" />
              </div>
              <h4 className="font-semibold text-slate-700 dark:text-gray-300 mb-2">
                Flujo de Reasignación
              </h4>
              <ol className="text-sm text-slate-500 dark:text-gray-400 space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <span>Filtra y selecciona los prospectos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <span>Elige coordinación y ejecutivo destino</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <span>Inicia el proceso de reasignación</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                  <span>Revisa el resumen y revierte si es necesario</span>
                </li>
              </ol>

              <div className="mt-6 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">No interrumpir el proceso</span>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  Por seguridad, no cierres ni recargues la página durante la reasignación.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkReassignmentTab;

