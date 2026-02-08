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
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
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

// Estado de cada prospecto en el proceso paralelo
interface ProspectoSlotState {
  prospecto: Prospecto;
  status: 'pending' | 'in_flight' | 'success' | 'error';
  startTime?: number;
  error?: string;
}

// ============================================
// CONSTANTES
// ============================================

const MAX_SELECTION = 100; // Máximo de prospectos que se pueden seleccionar para reasignación
const PAGE_SIZE = 100; // Registros por página
const MAX_PARALLEL_SLOTS = 10; // Máximo de ejecuciones paralelas que soporta el webhook

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
  
  // Estados para ejecución paralela
  const [slotsInFlight, setSlotsInFlight] = useState<Map<string, ProspectoSlotState>>(new Map());
  const [pendingQueue, setPendingQueue] = useState<Prospecto[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [activeSlots, setActiveSlots] = useState(0);
  
  // Referencias
  const abortControllerRef = useRef<AbortController | null>(null);
  const pauseRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const slotsInFlightRef = useRef<Map<string, ProspectoSlotState>>(new Map()); // Ref para mantener slots sincronizados
  
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
          // Cargar TODOS los usuarios de la coordinación (incluye ejecutivos, coordinadores y supervisores)
          const allUsers = await coordinacionService.getEjecutivosByCoordinacion(targetCoordinacionId);
          
          // Obtener IDs de coordinadores desde auth_user_coordinaciones
          const { data: coordRelations } = await supabaseSystemUI
            .from('auth_user_coordinaciones')
            .select('user_id')
            .eq('coordinacion_id', targetCoordinacionId);
          
          const coordinadorIds = new Set(
            (coordRelations || []).map(r => r.user_id).filter(Boolean)
          );
          
          // Marcar cada usuario según su rol
          const usersWithFlags = allUsers.map(user => ({
            ...user,
            is_coordinator: coordinadorIds.has(user.id) || user.role_name === 'coordinador',
            is_supervisor: user.role_name === 'supervisor'
          }));
          
          setTargetEjecutivos(usersWithFlags);
          setTargetEjecutivoId('');
        } catch (error) {
          console.error('Error cargando usuarios de coordinación:', error);
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

  // Seleccionar todos los de la página actual
  const handleSelectPage = useCallback(() => {
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

  // Seleccionar TODOS los resultados de la búsqueda (hasta MAX_SELECTION)
  const [isLoadingAllResults, setIsLoadingAllResults] = useState(false);
  
  const handleSelectAllResults = useCallback(async () => {
    if (!user?.id || !analysisSupabase || totalCount === 0) return;
    
    const maxToSelect = Math.min(totalCount, MAX_SELECTION - selectedIds.size);
    if (maxToSelect <= 0) {
      toast.error(`Ya tienes ${selectedIds.size} seleccionados (máximo ${MAX_SELECTION})`);
      return;
    }
    
    setIsLoadingAllResults(true);
    try {
      // Crear query base
      let query = analysisSupabase
        .from('prospectos')
        .select('*');

      // Aplicar permisos
      try {
        const filteredQuery = await permissionsService.applyProspectFilters(query, user.id);
        if (filteredQuery && typeof filteredQuery.eq === 'function') {
          query = filteredQuery;
        }
      } catch {
        // Error aplicando filtros
      }

      // Aplicar los mismos filtros que la búsqueda actual
      if (query && typeof query.or === 'function') {
        if (debouncedSearch) {
          const searchTerms = debouncedSearch
            .split(/[,\n]/)
            .map(t => t.trim())
            .filter(t => t.length > 0);
          
          if (searchTerms.length > 1) {
            const orConditions = searchTerms.map(term => {
              const escapedTerm = term.replace(/[%_]/g, '\\$&');
              return `nombre_completo.ilike.%${escapedTerm}%,nombre_whatsapp.ilike.%${escapedTerm}%`;
            }).join(',');
            query = query.or(orConditions);
          } else {
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

      // Obtener hasta MAX_SELECTION resultados
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(maxToSelect);

      if (error) throw error;
      
      // Enriquecer datos
      const enrichedData = await enrichProspectosWithNames(data || []);
      
      // Agregar a la selección (evitando duplicados)
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        enrichedData.forEach(p => newSet.add(p.id));
        return newSet;
      });
      
      setSelectedProspectos(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newProspectos = enrichedData.filter(p => !existingIds.has(p.id));
        return [...prev, ...newProspectos];
      });
      
      toast.success(`✓ ${enrichedData.length} prospectos seleccionados`);
      
    } catch (error) {
      toast.error('Error al seleccionar todos los resultados');
      console.error(error);
    } finally {
      setIsLoadingAllResults(false);
    }
  }, [user?.id, totalCount, selectedIds.size, debouncedSearch, filterCoordinacion, filterEjecutivo, filterEtapa, filterSinAsignar, enrichProspectosWithNames]);

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
  // FUNCIONES DE REASIGNACIÓN (PARALELA)
  // ============================================

  /**
   * Procesa un solo prospecto - utilizado por el pool paralelo
   */
  const processOneProspecto = useCallback(async (
    prospecto: Prospecto,
    ejecutivoDestino: string,
    coordinacionDestino: string,
    userId: string
  ): Promise<ReassignmentResult> => {
    const result: ReassignmentResult = {
      prospecto_id: prospecto.id,
      prospecto_nombre: prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Sin nombre',
      success: false,
      ejecutivo_anterior_id: prospecto.ejecutivo_id || null,
      ejecutivo_anterior_nombre: prospecto.ejecutivo_nombre || null,
      coordinacion_anterior_id: prospecto.coordinacion_id || null,
      coordinacion_anterior_nombre: prospecto.coordinacion_nombre || null
    };

    try {
      const requestData = await dynamicsReasignacionService.enriquecerDatosReasignacion(
        prospecto.id,
        ejecutivoDestino,
        coordinacionDestino,
        userId,
        'Reasignación masiva desde panel'
      );

      const response = await dynamicsReasignacionService.reasignarProspecto(requestData);
      result.success = response.success;
      if (!response.success) result.error = response.error;
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Error desconocido';
    }

    return result;
  }, []);

  /**
   * Sistema de ejecución paralela con sliding window
   * Procesa hasta MAX_PARALLEL_SLOTS (10) prospectos simultáneamente
   */
  const startReassignment = useCallback(async () => {
    if (!targetCoordinacionId || !targetEjecutivoId || selectedIds.size === 0) {
      toast.error('Selecciona coordinación, ejecutivo y al menos un prospecto');
      return;
    }

    if (selectedProspectos.length === 0) {
      toast.error('No hay prospectos seleccionados con datos completos');
      return;
    }

    // Capturar valores al inicio para evitar problemas de closures
    const ejecutivoDestino = targetEjecutivoId;
    const coordinacionDestino = targetCoordinacionId;
    const prospectosAReasignar = [...selectedProspectos];
    const userId = user?.id || '';
    
    abortControllerRef.current = new AbortController();
    pauseRef.current = false;

    // Inicializar estado
    const total = prospectosAReasignar.length;
    setReassignmentState({
      status: 'running',
      currentIndex: 0,
      total,
      results: [],
      startTime: new Date()
    });
    
    // Inicializar cola de pendientes y slots
    setPendingQueue([...prospectosAReasignar]);
    setSlotsInFlight(new Map());
    setCompletedCount(0);
    setActiveSlots(0);

    // Cola mutable para el procesamiento
    const queue = [...prospectosAReasignar];
    const inFlightMap = new Map<string, Promise<ReassignmentResult>>();
    const allResults: ReassignmentResult[] = [];
    let completed = 0;

    // Inicializar ref de slots
    slotsInFlightRef.current = new Map();

    // Función para actualizar UI con estado actual de slots (usando ref)
    const updateSlotsUI = () => {
      setSlotsInFlight(new Map(slotsInFlightRef.current));
      setActiveSlots(slotsInFlightRef.current.size);
    };

    // Función para llenar slots disponibles
    const fillSlots = () => {
      while (
        queue.length > 0 && 
        inFlightMap.size < MAX_PARALLEL_SLOTS && 
        !pauseRef.current && 
        !abortControllerRef.current?.signal.aborted
      ) {
        const prospecto = queue.shift()!;
        
        // Crear estado visual del slot
        const slotState: ProspectoSlotState = {
          prospecto,
          status: 'in_flight',
          startTime: Date.now()
        };
        
        // Actualizar ref de slots en vuelo
        slotsInFlightRef.current.set(prospecto.id, slotState);
        updateSlotsUI();
        
        // Crear promesa para este prospecto
        const promise = processOneProspecto(prospecto, ejecutivoDestino, coordinacionDestino, userId)
          .then(result => {
            // Remover del mapa de en-vuelo
            inFlightMap.delete(prospecto.id);
            
            // Actualizar ref de slots
            slotsInFlightRef.current.delete(prospecto.id);
            updateSlotsUI();
            
            // Agregar resultado
            allResults.push(result);
            completed++;
            setCompletedCount(completed);
            
            // Actualizar estado general
            setReassignmentState(prev => ({
              ...prev,
              currentIndex: completed,
              results: [...allResults]
            }));
            
            // Actualizar cola pendiente en UI
            setPendingQueue([...queue]);
            
            return result;
          });
        
        inFlightMap.set(prospecto.id, promise);
      }
    };

    // Loop principal: llenar slots y esperar que uno termine
    while (completed < total) {
      // Verificar cancelación
      if (abortControllerRef.current?.signal.aborted) {
        // Esperar a que terminen los en vuelo
        if (inFlightMap.size > 0) {
          await Promise.all(inFlightMap.values());
        }
        setReassignmentState(prev => ({ ...prev, status: 'cancelled' }));
        setShowSummary(true);
        return;
      }
      
      // Verificar pausa
      if (pauseRef.current) {
        // Esperar a que terminen los en vuelo actuales
        if (inFlightMap.size > 0) {
          await Promise.all(inFlightMap.values());
        }
        setReassignmentState(prev => ({ 
          ...prev, 
          status: 'paused', 
          pausedAt: new Date(),
          results: [...allResults]
        }));
        // Guardar la cola restante para resume
        setPendingQueue([...queue]);
        return;
      }
      
      // Llenar slots disponibles
      fillSlots();
      
      // Si no hay nada en vuelo y la cola está vacía, terminamos
      if (inFlightMap.size === 0 && queue.length === 0) {
        break;
      }
      
      // Esperar a que al menos uno termine (Promise.race)
      if (inFlightMap.size > 0) {
        await Promise.race(inFlightMap.values());
      }
    }

    // Proceso completado
    slotsInFlightRef.current = new Map();
    setSlotsInFlight(new Map());
    setActiveSlots(0);
    setPendingQueue([]);
    
    setReassignmentState(prev => ({ 
      ...prev, 
      status: 'completed', 
      currentIndex: total,
      results: allResults
    }));
    setShowSummary(true);
    
    // Limpiar selección
    setSelectedIds(new Set());
    setSelectedProspectos([]);
    
    // Recargar prospectos para mostrar nueva asignación
    await loadProspectos();
  }, [targetCoordinacionId, targetEjecutivoId, selectedIds, selectedProspectos, user?.id, loadProspectos, processOneProspecto]);

  const pauseReassignment = useCallback(() => {
    pauseRef.current = true;
    // El sistema paralelo esperará a que terminen los en-vuelo y luego pausará
    toast('⏸️ Pausando... esperando que terminen los en vuelo', {
      icon: '⏳',
      duration: 3000
    });
  }, []);

  /**
   * Resume la reasignación desde donde quedó (con soporte paralelo)
   */
  const resumeReassignment = useCallback(async () => {
    if (reassignmentState.status !== 'paused') return;
    
    pauseRef.current = false;
    abortControllerRef.current = new AbortController();
    
    // Usar la cola pendiente guardada
    const queue = [...pendingQueue];
    const total = reassignmentState.total;
    const ejecutivoDestino = targetEjecutivoId;
    const coordinacionDestino = targetCoordinacionId;
    const userId = user?.id || '';
    
    // Mantener resultados existentes
    const allResults = [...reassignmentState.results];
    let completed = allResults.length;

    setReassignmentState(prev => ({ ...prev, status: 'running', pausedAt: undefined }));
    slotsInFlightRef.current = new Map();
    setSlotsInFlight(new Map());
    setActiveSlots(0);

    const inFlightMap = new Map<string, Promise<ReassignmentResult>>();

    // Función para actualizar UI con estado actual de slots (usando ref)
    const updateSlotsUI = () => {
      setSlotsInFlight(new Map(slotsInFlightRef.current));
      setActiveSlots(slotsInFlightRef.current.size);
    };

    // Función para llenar slots disponibles
    const fillSlots = () => {
      while (
        queue.length > 0 && 
        inFlightMap.size < MAX_PARALLEL_SLOTS && 
        !pauseRef.current && 
        !abortControllerRef.current?.signal.aborted
      ) {
        const prospecto = queue.shift()!;
        
        const slotState: ProspectoSlotState = {
          prospecto,
          status: 'in_flight',
          startTime: Date.now()
        };
        
        slotsInFlightRef.current.set(prospecto.id, slotState);
        updateSlotsUI();
        
        const promise = processOneProspecto(prospecto, ejecutivoDestino, coordinacionDestino, userId)
          .then(result => {
            inFlightMap.delete(prospecto.id);
            
            slotsInFlightRef.current.delete(prospecto.id);
            updateSlotsUI();
            
            allResults.push(result);
            completed++;
            setCompletedCount(completed);
            
            setReassignmentState(prev => ({
              ...prev,
              currentIndex: completed,
              results: [...allResults]
            }));
            
            setPendingQueue([...queue]);
            
            return result;
          });
        
        inFlightMap.set(prospecto.id, promise);
      }
    };

    // Loop principal
    while (completed < total) {
      if (abortControllerRef.current?.signal.aborted) {
        if (inFlightMap.size > 0) {
          await Promise.all(inFlightMap.values());
        }
        setReassignmentState(prev => ({ ...prev, status: 'cancelled' }));
        setShowSummary(true);
        return;
      }
      
      if (pauseRef.current) {
        if (inFlightMap.size > 0) {
          await Promise.all(inFlightMap.values());
        }
        setReassignmentState(prev => ({ 
          ...prev, 
          status: 'paused', 
          pausedAt: new Date(),
          results: [...allResults]
        }));
        setPendingQueue([...queue]);
        return;
      }
      
      fillSlots();
      
      if (inFlightMap.size === 0 && queue.length === 0) {
        break;
      }
      
      if (inFlightMap.size > 0) {
        await Promise.race(inFlightMap.values());
      }
    }

    // Proceso completado
    slotsInFlightRef.current = new Map();
    setSlotsInFlight(new Map());
    setActiveSlots(0);
    setPendingQueue([]);
    
    setReassignmentState(prev => ({ 
      ...prev, 
      status: 'completed', 
      currentIndex: total,
      results: allResults
    }));
    setShowSummary(true);
    setSelectedIds(new Set());
    setSelectedProspectos([]);
    loadProspectos();
  }, [reassignmentState, pendingQueue, targetEjecutivoId, targetCoordinacionId, user?.id, loadProspectos, processOneProspecto]);

  const cancelReassignment = useCallback(() => {
    abortControllerRef.current?.abort();
    pauseRef.current = false;
    // Detener progreso simulado
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setSimulatedProgress(0);
    toast('🛑 Cancelando... esperando que terminen los en vuelo', {
      icon: '⏳',
      duration: 3000
    });
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
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      
      {/* Modal de Progreso Paralelo - Bloquea toda la UI */}
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
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              {/* Header del modal */}
              <div className="px-6 py-4 bg-gradient-to-r from-violet-500 to-purple-600">
                <div className="flex items-center justify-between">
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
                        {reassignmentState.status === 'paused' ? 'Reasignación Pausada' : 'Reasignación Paralela'}
                      </h3>
                      <p className="text-sm text-white/80">
                        {reassignmentState.status === 'paused' 
                          ? 'El proceso está en pausa' 
                          : `Procesando ${activeSlots} de ${MAX_PARALLEL_SLOTS} slots`}
                      </p>
                    </div>
                  </div>
                  {/* Badge de modo paralelo */}
                  <div className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {MAX_PARALLEL_SLOTS}x Paralelo
                  </div>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6">
                {/* Barra de progreso general */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progreso General
                    </span>
                    <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                      {completedCount} de {reassignmentState.total} completados
                    </span>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                    {progressPercent}% completado
                  </p>
                </div>

                {/* Grid de slots activos (procesando ahora) */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                      <span>Slots Activos ({activeSlots}/{MAX_PARALLEL_SLOTS})</span>
                    </div>
                  </div>
                  
                  {activeSlots > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {Array.from(slotsInFlight.values()).map((slot, idx) => {
                        const elapsed = slot.startTime ? Date.now() - slot.startTime : 0;
                        const estimatedProgress = Math.min(95, (elapsed / ESTIMATED_TIME_PER_ITEM) * 100);
                        
                        return (
                          <motion.div
                            key={slot.prospecto.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {slot.prospecto.nombre_completo || slot.prospecto.nombre_whatsapp || 'Sin nombre'}
                                </p>
                              </div>
                              <Loader2 className="w-4 h-4 text-violet-500 animate-spin flex-shrink-0" />
                            </div>
                            <div className="h-1.5 bg-violet-200 dark:bg-violet-800 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-violet-500 rounded-full"
                                animate={{ width: `${estimatedProgress}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-20 text-gray-400 dark:text-gray-500">
                      <p className="text-sm">
                        {reassignmentState.status === 'paused' ? 'Proceso en pausa' : 'Iniciando slots...'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Estadísticas en tiempo real */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {successCount}
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">Exitosos</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {errorCount}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">Fallidos</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20">
                    <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                      {activeSlots}
                    </p>
                    <p className="text-xs text-violet-700 dark:text-violet-300">En vuelo</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-gray-100 dark:bg-gray-700">
                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                      {pendingQueue.length}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pendientes</p>
                  </div>
                </div>

                {/* Información de rendimiento */}
                <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Zap className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">
                      Modo paralelo: {MAX_PARALLEL_SLOTS}x más rápido que secuencial
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1 ml-6">
                    {activeSlots > 0 && `Procesando ${activeSlots} prospectos simultáneamente`}
                    {activeSlots === 0 && reassignmentState.status === 'paused' && 'Todos los slots en vuelo han terminado'}
                  </p>
                </div>

                {/* Advertencia */}
                <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">
                      {reassignmentState.status === 'paused' 
                        ? 'Continúa cuando estés listo'
                        : 'No cierres esta ventana'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {reassignmentState.startTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Iniciado: {reassignmentState.startTime.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
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
                        Continuar ({pendingQueue.length} pendientes)
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header con estadísticas */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Reasignación Masiva
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Selecciona hasta {MAX_SELECTION} prospectos para reasignar
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Badge de selección */}
            <div className={`px-4 py-2 rounded-xl font-medium transition-all ${
              selectedIds.size > 0 
                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              <span className="text-lg font-bold">{selectedIds.size}</span>
              <span className="text-sm ml-1">/ {MAX_SELECTION}</span>
            </div>
            
            {selectedIds.size > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleClearSelection}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200 dark:border-gray-700">
          
          {/* Barra de filtros */}
          <div className="flex-shrink-0 p-4 space-y-3 bg-white/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            
            {/* Búsqueda - Soporta múltiples nombres separados por comas o saltos de línea */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar nombre, teléfono o email (soporta lista)"
                rows={searchTerm.includes('\n') || searchTerm.includes(',') ? 4 : 1}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none scrollbar-none"
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
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
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
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
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
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="">Todas las etapas</option>
                {etapasDisponibles.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>

              {/* Sin asignar toggle */}
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="checkbox"
                  checked={filterSinAsignar}
                  onChange={(e) => { setFilterSinAsignar(e.target.checked); setPage(0); }}
                  className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Sin asignar</span>
              </label>
            </div>

            {/* Acciones de selección */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Botón para seleccionar TODOS los resultados de la búsqueda */}
                <button
                  onClick={handleSelectAllResults}
                  disabled={isProcessing || isLoadingAllResults || totalCount === 0 || gridTab === 'selection' || selectedIds.size >= MAX_SELECTION}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isLoadingAllResults ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  Seleccionar todos ({Math.min(totalCount, MAX_SELECTION - selectedIds.size)})
                </button>
                {/* Botón para seleccionar solo la página actual */}
                <button
                  onClick={handleSelectPage}
                  disabled={isProcessing || prospectos.length === 0 || gridTab === 'selection'}
                  className="px-3 py-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  Seleccionar página ({prospectos.length})
                </button>
                <button
                  onClick={handleClearFilters}
                  disabled={gridTab === 'selection'}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Limpiar filtros
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  {gridTab === 'results' 
                    ? `${totalCount.toLocaleString()} encontrados`
                    : `${selectedProspectos.length} seleccionados`
                  }
                </span>
                <button
                  onClick={loadProspectos}
                  disabled={isLoading || gridTab === 'selection'}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Pestañas del Grid */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mt-2">
              <button
                onClick={() => setGridTab('results')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  gridTab === 'results'
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400">
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
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-300 dark:hover:border-violet-600'
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
                                : 'border-gray-300 dark:border-gray-600'
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
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Sin nombre'}
                              </p>
                              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
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
                                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
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
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                {prospecto.ejecutivo_nombre || (
                                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                    <UserX className="w-3.5 h-3.5" />
                                    Sin asignar
                                  </span>
                                )}
                              </p>
                              {/* Etapa si existe */}
                              {prospecto.etapa && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
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
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0 || isProcessing}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-500">
                      Página {page + 1} de {Math.ceil(totalCount / PAGE_SIZE)}
                    </span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={(page + 1) * PAGE_SIZE >= totalCount || isProcessing}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
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
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400">
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
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Sin nombre'}
                            </p>
                            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
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
                              <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
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
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                              {prospecto.ejecutivo_nombre || (
                                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                  <UserX className="w-3.5 h-3.5" />
                                  Sin asignar
                                </span>
                              )}
                            </p>
                            {prospecto.etapa && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
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
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
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
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
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
          <div className="flex-shrink-0 p-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Destino de Reasignación</h3>
            </div>

            <div className="space-y-3">
              {/* Coordinación destino */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Coordinación
                </label>
                <select
                  value={targetCoordinacionId}
                  onChange={(e) => setTargetCoordinacionId(e.target.value)}
                  disabled={isProcessing}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50"
                >
                  <option value="">Seleccionar coordinación...</option>
                  {coordinaciones.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Ejecutivo destino */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Asignar a
                </label>
                <select
                  value={targetEjecutivoId}
                  onChange={(e) => setTargetEjecutivoId(e.target.value)}
                  disabled={isProcessing || !targetCoordinacionId}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50"
                >
                  <option value="">Seleccionar persona...</option>
                  
                  {/* Coordinadores primero (siempre habilitados) */}
                  {targetEjecutivos.filter(e => e.is_coordinator === true).length > 0 && (
                    <option disabled className="text-gray-500 font-semibold">── Coordinadores ──</option>
                  )}
                  {targetEjecutivos
                    .filter(e => e.is_coordinator === true)
                    .map(e => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} (Coord.)
                      </option>
                    ))}
                  
                  {/* Supervisores activos */}
                  {targetEjecutivos.filter(e => !e.is_coordinator && e.role_name === 'supervisor' && e.is_active === true).length > 0 && (
                    <option disabled className="text-gray-500 font-semibold">── Supervisores ──</option>
                  )}
                  {targetEjecutivos
                    .filter(e => !e.is_coordinator && e.role_name === 'supervisor' && e.is_active === true)
                    .map(e => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} (Sup.)
                      </option>
                    ))}
                  
                  {/* Ejecutivos activos */}
                  {targetEjecutivos.filter(e => !e.is_coordinator && e.role_name === 'ejecutivo' && e.is_active === true).length > 0 && (
                    <option disabled className="text-gray-500 font-semibold">── Ejecutivos ──</option>
                  )}
                  {targetEjecutivos
                    .filter(e => !e.is_coordinator && e.role_name === 'ejecutivo' && e.is_active === true)
                    .map(e => (
                      <option key={e.id} value={e.id}>
                        {e.full_name}
                      </option>
                    ))}
                  
                  {/* Usuarios inactivos (deshabilitados) */}
                  {targetEjecutivos.filter(e => !e.is_coordinator && e.is_active !== true).length > 0 && (
                    <option disabled className="text-gray-400">── No disponibles ──</option>
                  )}
                  {targetEjecutivos
                    .filter(e => !e.is_coordinator && e.is_active !== true)
                    .map(e => (
                      <option key={e.id} value={e.id} disabled className="text-gray-400">
                        {e.full_name} (Inactivo)
                      </option>
                    ))}
                </select>
                {targetCoordinacionId && targetEjecutivos.length > 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    {targetEjecutivos.filter(e => e.is_coordinator === true).length} coordinadores, {targetEjecutivos.filter(e => !e.is_coordinator && e.role_name === 'supervisor' && e.is_active === true).length} supervisores, {targetEjecutivos.filter(e => !e.is_coordinator && e.role_name === 'ejecutivo' && e.is_active === true).length} ejecutivos activos
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
                <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {reassignmentState.status === 'rolling_back' ? 'Revirtiendo cambios...' : 'Progreso'}
                    </span>
                    <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                      {progressPercent}%
                    </span>
                  </div>
                  
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
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

                  <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
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
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
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
                            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {result.prospecto_nombre}
                            </span>
                          </div>
                          {result.error && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {result.error}
                            </p>
                          )}
                          {result.success && result.ejecutivo_anterior_nombre && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {result.ejecutivo_anterior_nombre} → Nuevo ejecutivo
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Acciones del resumen */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
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
                        className="w-full px-4 py-2.5 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
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
                        <span className="truncate text-gray-600 dark:text-gray-400">
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center mb-4">
                <ArrowRight className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Flujo de Reasignación
              </h4>
              <ol className="text-sm text-gray-500 dark:text-gray-400 space-y-2 text-left">
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

