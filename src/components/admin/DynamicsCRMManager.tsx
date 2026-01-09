/**
 * ============================================
 * MÓDULO DYNAMICS CRM MANAGER
 * ============================================
 *
 * Gestión de comparación y sincronización entre
 * prospectos locales y Dynamics CRM.
 *
 * Funcionalidades:
 * - Búsqueda de prospectos por nombre/email/teléfono
 * - Comparación lado a lado con Dynamics
 * - Detección de discrepancias
 * - Reasignación de ejecutivos
 *
 * Versión: 1.0.0
 * Fecha: Diciembre 2025
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Star,
  Loader2,
  ChevronDown,
  Filter,
  Eye,
  GitCompare,
  Zap,
  Database,
  CloudOff,
  ArrowRight,
  UserCog,
  Shield,
  Construction,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { analysisSupabase } from '../../config/analysisSupabase';
import { coordinacionService, type Coordinacion, type Ejecutivo } from '../../services/coordinacionService';
import { dynamicsLeadService, type DynamicsLeadInfo, type LeadComparisonResult, type LeadDiscrepancy, type LeadFieldComparison } from '../../services/dynamicsLeadService';
import { dynamicsReasignacionService } from '../../services/dynamicsReasignacionService';
import { permissionsService } from '../../services/permissionsService';
import { useAuth } from '../../contexts/AuthContext';

// ============================================
// INTERFACES
// ============================================

interface Prospecto {
  id: string;
  nombre_completo?: string;
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  nombre_whatsapp?: string;
  whatsapp?: string;
  email?: string;
  telefono_principal?: string;
  telefono_adicional?: string;
  ciudad_residencia?: string;
  estado_civil?: string;
  etapa?: string;
  score?: string;
  id_dynamics?: string;
  coordinacion_id?: string;
  ejecutivo_id?: string;
  coordinacion_nombre?: string;
  coordinacion_codigo?: string;
  ejecutivo_nombre?: string;
  ejecutivo_id_dynamics?: string; // ID de Dynamics del ejecutivo asignado
  created_at?: string;
  updated_at?: string;
}

interface SearchFilters {
  query: string;
  coordinacion: string;
  hasIdDynamics: 'all' | 'with' | 'without';
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const DynamicsCRMManager: React.FC = () => {
  const { user } = useAuth();

  // Estado de permisos
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isCoordinadorCalidad, setIsCoordinadorCalidad] = useState(false);

  // Estado principal
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDynamics, setIsLoadingDynamics] = useState(false);
  const [selectedProspecto, setSelectedProspecto] = useState<Prospecto | null>(null);
  const [dynamicsData, setDynamicsData] = useState<DynamicsLeadInfo | null>(null);
  const [comparisonResult, setComparisonResult] = useState<LeadComparisonResult | null>(null);

  // Estado de filtros
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    coordinacion: 'all',
    hasIdDynamics: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Estado de coordinaciones y ejecutivos
  const [coordinaciones, setCoordinaciones] = useState<Coordinacion[]>([]);
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [ejecutivosFiltered, setEjecutivosFiltered] = useState<Ejecutivo[]>([]);

  // Estado de reasignación
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedCoordinacion, setSelectedCoordinacion] = useState<string>('');
  const [selectedEjecutivo, setSelectedEjecutivo] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignProgress, setReassignProgress] = useState(0);

  // Estado de status_crm desde tabla crm_data
  const [statusCrm, setStatusCrm] = useState<string | null>(null);

  // Determinar si el usuario tiene acceso al módulo
  const isAdmin = user?.role_name === 'admin';
  const isAdminOperativo = user?.role_name === 'administrador_operativo';

  // ============================================
  // EFECTOS
  // ============================================

  // Verificar permisos de acceso al módulo
  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.id) {
        setHasAccess(false);
        setIsCheckingAccess(false);
        return;
      }

      setIsCheckingAccess(true);

      try {
        // Admin y Admin Operativo siempre tienen acceso
        if (isAdmin || isAdminOperativo) {
          setHasAccess(true);
          setIsCheckingAccess(false);
          return;
        }

        // Verificar si es Coordinador de Calidad
        const esCoordCalidad = await permissionsService.isCoordinadorCalidad(user.id);
        setIsCoordinadorCalidad(esCoordCalidad);
        setHasAccess(esCoordCalidad);
      } catch (error) {
        console.error('Error verificando acceso al módulo Dynamics:', error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [user?.id, isAdmin, isAdminOperativo]);

  // Cargar coordinaciones al inicio (solo si tiene acceso)
  useEffect(() => {
    if (!hasAccess) return;

    const loadCoordinaciones = async () => {
      try {
        const data = await coordinacionService.getCoordinaciones();
        setCoordinaciones(data);
      } catch (error) {
        console.error('Error cargando coordinaciones:', error);
      }
    };
    loadCoordinaciones();
  }, [hasAccess]);

  // Cargar ejecutivos cuando cambia la coordinación seleccionada
  useEffect(() => {
    const loadEjecutivos = async () => {
      if (!selectedCoordinacion) {
        setEjecutivosFiltered([]);
        return;
      }
      try {
        const data = await coordinacionService.getEjecutivosByCoordinacion(selectedCoordinacion);
        setEjecutivosFiltered(data);
      } catch (error) {
        console.error('Error cargando ejecutivos:', error);
        setEjecutivosFiltered([]);
      }
    };
    loadEjecutivos();
  }, [selectedCoordinacion]);

  // ============================================
  // FUNCIONES DE BÚSQUEDA
  // ============================================

  const searchProspectos = useCallback(async () => {
    if (!filters.query.trim() && filters.coordinacion === 'all' && filters.hasIdDynamics === 'all') {
      setProspectos([]);
      return;
    }

    setIsLoading(true);
    try {
      let query = analysisSupabase
        .from('prospectos')
        .select(`
          id,
          nombre_completo,
          nombre,
          apellido_paterno,
          apellido_materno,
          nombre_whatsapp,
          whatsapp,
          email,
          telefono_principal,
          telefono_adicional,
          ciudad_residencia,
          estado_civil,
          etapa,
          score,
          id_dynamics,
          coordinacion_id,
          ejecutivo_id,
          created_at,
          updated_at
        `)
        .order('updated_at', { ascending: false })
        .limit(50);

      // Filtro por texto
      if (filters.query.trim()) {
        const searchTerm = `%${filters.query.trim()}%`;
        query = query.or(`nombre_completo.ilike.${searchTerm},email.ilike.${searchTerm},whatsapp.ilike.${searchTerm},telefono_principal.ilike.${searchTerm}`);
      }

      // Filtro por ID de Dynamics
      if (filters.hasIdDynamics === 'with') {
        query = query.not('id_dynamics', 'is', null);
      } else if (filters.hasIdDynamics === 'without') {
        query = query.is('id_dynamics', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enriquecer con datos de coordinación/ejecutivo
      const enrichedData = await Promise.all(
        (data || []).map(async (prospecto) => {
          let coordinacion_nombre = '';
          let coordinacion_codigo = '';
          let ejecutivo_nombre = '';
          let ejecutivo_id_dynamics = ''; // ID de Dynamics del ejecutivo

          if (prospecto.coordinacion_id) {
            const coord = await coordinacionService.getCoordinacionById(prospecto.coordinacion_id);
            if (coord) {
              coordinacion_nombre = coord.nombre;
              coordinacion_codigo = coord.codigo;
            }
          }

          if (prospecto.ejecutivo_id) {
            const ejec = await coordinacionService.getEjecutivoById(prospecto.ejecutivo_id);
            if (ejec) {
              ejecutivo_nombre = ejec.full_name;
              // IMPORTANTE: Obtener el id_dynamics del ejecutivo para comparar con OwnerID de Dynamics
              ejecutivo_id_dynamics = ejec.id_dynamics || '';
            }
          }

          return {
            ...prospecto,
            coordinacion_nombre,
            coordinacion_codigo,
            ejecutivo_nombre,
            ejecutivo_id_dynamics,
          };
        })
      );

      // Filtro adicional por coordinación si está seleccionada
      let finalData = enrichedData;
      if (filters.coordinacion !== 'all') {
        finalData = enrichedData.filter(p => p.coordinacion_id === filters.coordinacion);
      }

      setProspectos(finalData);
    } catch (error) {
      console.error('Error buscando prospectos:', error);
      toast.error('Error al buscar prospectos');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Buscar cuando cambian los filtros (con debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.query.length >= 2 || filters.coordinacion !== 'all' || filters.hasIdDynamics !== 'all') {
        searchProspectos();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, searchProspectos]);

  // ============================================
  // COMPARACIÓN CON DYNAMICS
  // ============================================

  const fetchDynamicsData = useCallback(async (prospecto: Prospecto) => {
    setSelectedProspecto(prospecto);
    setIsLoadingDynamics(true);
    setDynamicsData(null);
    setComparisonResult(null);
    setStatusCrm(null);

    try {
      // ============================================
      // 1. OBTENER DATOS DEL EJECUTIVO DESDE SYSTEM_UI
      // ============================================
      // El id_dynamics del ejecutivo está en la tabla auth_users de system_ui,
      // no en pqnc_ai. Debemos obtenerlo para comparar correctamente.
      let ejecutivoData: Ejecutivo | null = null;
      if (prospecto.ejecutivo_id) {
        ejecutivoData = await coordinacionService.getEjecutivoById(prospecto.ejecutivo_id);
      }

      // ============================================
      // 2. BUSCAR EN DYNAMICS CRM
      // ============================================
      let searchResult;
      
      // Siempre incluir id_prospecto en la búsqueda
      const baseRequest = { id_prospecto: prospecto.id };

      if (prospecto.id_dynamics) {
        searchResult = await dynamicsLeadService.searchLead({ ...baseRequest, id_dynamics: prospecto.id_dynamics });
      } else if (prospecto.email) {
        searchResult = await dynamicsLeadService.searchLead({ ...baseRequest, email: prospecto.email });
      } else if (prospecto.telefono_principal || prospecto.whatsapp) {
        const phone = prospecto.telefono_principal || prospecto.whatsapp;
        searchResult = await dynamicsLeadService.searchLead({ ...baseRequest, phone: phone! });
      } else {
        toast.error('El prospecto no tiene ID de Dynamics, email ni teléfono para buscar');
        setIsLoadingDynamics(false);
        return;
      }

      // ============================================
      // 3. PREPARAR DATOS LOCALES CON INFO DEL EJECUTIVO
      // ============================================
      // Enriquecer los datos locales con el id_dynamics del ejecutivo
      const localDataEnriched = {
        ...prospecto,
        // ID de Dynamics del ejecutivo (desde system_ui)
        ejecutivo_id_dynamics: ejecutivoData?.id_dynamics || null,
        // Nombre del ejecutivo para mostrar visualmente
        ejecutivo_nombre: ejecutivoData?.full_name || prospecto.ejecutivo_nombre || 'Sin asignar',
        // Nombre de coordinación
        coordinacion_nombre: ejecutivoData?.coordinacion_nombre || prospecto.coordinacion_nombre || '',
      };

      // ============================================
      // 4. PROCESAR RESULTADO Y COMPARAR
      // ============================================
      if (!searchResult.success) {
        toast.error(searchResult.error || 'Error al consultar Dynamics');
        setComparisonResult({
          hasDiscrepancies: false,
          discrepancies: [],
          allFields: [],
          localData: localDataEnriched,
          dynamicsData: null,
          syncStatus: 'error',
        });
      } else if (!searchResult.data) {
        toast('Lead no encontrado en Dynamics', {
          icon: '⚠️',
          style: { background: '#F59E0B', color: 'white' },
        });
        setComparisonResult({
          hasDiscrepancies: false,
          discrepancies: [],
          allFields: [],
          localData: localDataEnriched,
          dynamicsData: null,
          syncStatus: 'not_found',
        });
      } else {
        setDynamicsData(searchResult.data);

        // ============================================
        // 5. BUSCAR STATUS_CRM EN TABLA CRM_DATA
        // ============================================
        // Usar el LeadID de Dynamics para buscar el status_crm
        try {
          const { data: crmDataResult } = await analysisSupabase
            .from('crm_data')
            .select('status_crm')
            .eq('id_dynamics', searchResult.data.LeadID)
            .maybeSingle();
          
          if (crmDataResult?.status_crm) {
            setStatusCrm(crmDataResult.status_crm);
          }
        } catch (crmError) {
          console.warn('No se pudo obtener status_crm:', crmError);
        }

        // Comparar datos (ahora con el id_dynamics del ejecutivo)
        const comparison = dynamicsLeadService.compareLeadData(localDataEnriched, searchResult.data);
        setComparisonResult(comparison);

        if (comparison.hasDiscrepancies) {
          toast(`Se encontraron ${comparison.discrepancies.length} discrepancias`, {
            icon: '⚠️',
            style: { background: '#F59E0B', color: 'white' },
          });
        } else {
          toast.success('Los datos están sincronizados');
        }
      }
    } catch (error) {
      console.error('Error consultando Dynamics:', error);
      toast.error('Error al consultar Dynamics CRM');
    } finally {
      setIsLoadingDynamics(false);
    }
  }, []);

  // ============================================
  // REASIGNACIÓN
  // ============================================

  const handleReassign = useCallback(async () => {
    if (!selectedProspecto || !selectedEjecutivo || !selectedCoordinacion || !user) {
      toast.error('Selecciona un ejecutivo para reasignar');
      return;
    }

    setIsReassigning(true);
    setReassignProgress(10);

    try {
      // Enriquecer datos para la reasignación
      setReassignProgress(30);
      const enrichedRequest = await dynamicsReasignacionService.enriquecerDatosReasignacion(
        selectedProspecto.id,
        selectedEjecutivo,
        selectedCoordinacion,
        user.id,
        'Reasignación desde módulo Dynamics CRM'
      );

      setReassignProgress(50);

      // Ejecutar reasignación
      const result = await dynamicsReasignacionService.reasignarProspecto(enrichedRequest);

      setReassignProgress(90);

      if (result.success) {
        toast.success('Prospecto reasignado exitosamente');
        setShowReassignModal(false);
        setSelectedCoordinacion('');
        setSelectedEjecutivo('');

        // Refrescar datos del prospecto
        const updatedProspecto = {
          ...selectedProspecto,
          ejecutivo_id: selectedEjecutivo,
          coordinacion_id: selectedCoordinacion,
        };
        setSelectedProspecto(updatedProspecto);

        // Actualizar lista
        setProspectos(prev =>
          prev.map(p => (p.id === selectedProspecto.id ? updatedProspecto : p))
        );

        // Re-consultar Dynamics para ver si se actualizó
        setTimeout(() => {
          fetchDynamicsData(updatedProspecto);
        }, 2000);
      } else {
        toast.error(result.error || 'Error al reasignar');
      }
    } catch (error) {
      console.error('Error en reasignación:', error);
      toast.error('Error al reasignar prospecto');
    } finally {
      setIsReassigning(false);
      setReassignProgress(100);
      setTimeout(() => setReassignProgress(0), 500);
    }
  }, [selectedProspecto, selectedEjecutivo, selectedCoordinacion, user, fetchDynamicsData]);

  // ============================================
  // HELPERS DE RENDER
  // ============================================

  const getSyncStatusIcon = (status: LeadComparisonResult['syncStatus']) => {
    switch (status) {
      case 'synced':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'out_of_sync':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'not_found':
        return <CloudOff className="w-5 h-5 text-gray-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getSyncStatusLabel = (status: LeadComparisonResult['syncStatus']) => {
    switch (status) {
      case 'synced':
        return 'Sincronizado';
      case 'out_of_sync':
        return 'Desincronizado';
      case 'not_found':
        return 'No encontrado en CRM';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  };

  const getDiscrepancySeverityColor = (severity: LeadDiscrepancy['severity']) => {
    switch (severity) {
      case 'error':
        return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
      case 'warning':
        return 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700';
      case 'info':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700';
    }
  };

  // ============================================
  // RENDER
  // ============================================

  // Estado de carga de permisos
  if (isCheckingAccess) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Sin acceso al módulo
  if (!hasAccess) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center p-8"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/25">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Acceso Restringido
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            No tienes permisos para acceder al módulo de Dynamics CRM.
            Este módulo está disponible para:
          </p>
          <div className="space-y-2 text-left bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Administradores</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Administradores Operativos</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Coordinadores de Calidad</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 p-0.5 shadow-lg shadow-purple-500/25">
              <div className="w-full h-full rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center">
                <GitCompare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Dynamics CRM Manager
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Compara y sincroniza prospectos con Microsoft Dynamics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                showFilters
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filtros</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </motion.button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              className="w-full pl-12 pr-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
          </div>
        </div>

        {/* Filtros expandibles */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Filtro por coordinación */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Coordinación
                  </label>
                  <select
                    value={filters.coordinacion}
                    onChange={(e) => setFilters({ ...filters, coordinacion: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="all">Todas las coordinaciones</option>
                    {coordinaciones.map((coord) => (
                      <option key={coord.id} value={coord.id}>
                        {coord.codigo} - {coord.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por ID Dynamics */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Estado Dynamics
                  </label>
                  <select
                    value={filters.hasIdDynamics}
                    onChange={(e) => setFilters({ ...filters, hasIdDynamics: e.target.value as SearchFilters['hasIdDynamics'] })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="all">Todos</option>
                    <option value="with">Con ID Dynamics</option>
                    <option value="without">Sin ID Dynamics</option>
                  </select>
                </div>

                {/* Botón de limpiar */}
                <div className="flex items-end">
                  <button
                    onClick={() => setFilters({ query: '', coordinacion: 'all', hasIdDynamics: 'all' })}
                    className="w-full px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lista de prospectos */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Base de Datos Local
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {prospectos.length} resultados
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : prospectos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Search className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Busca un prospecto para comenzar</p>
                <p className="text-xs mt-1">Ingresa al menos 2 caracteres</p>
              </div>
            ) : (
              prospectos.map((prospecto) => (
                <motion.div
                  key={prospecto.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => fetchDynamicsData(prospecto)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedProspecto?.id === prospecto.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg shadow-purple-500/10'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Sin nombre'}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {prospecto.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {prospecto.email}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {prospecto.id_dynamics ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            <Zap className="w-3 h-3" />
                            Dynamics
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            <CloudOff className="w-3 h-3" />
                            Sin CRM
                          </span>
                        )}
                        {prospecto.coordinacion_codigo && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            <Building2 className="w-3 h-3" />
                            {prospecto.coordinacion_codigo}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchDynamicsData(prospecto);
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Panel de comparación */}
        <div className="w-1/2 flex flex-col bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Comparación con Dynamics CRM
                </span>
              </div>
              {comparisonResult && (
                <div className="flex items-center gap-2">
                  {getSyncStatusIcon(comparisonResult.syncStatus)}
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {getSyncStatusLabel(comparisonResult.syncStatus)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {isLoadingDynamics ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-purple-200 dark:border-purple-900"></div>
                  <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
                </div>
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  Consultando Dynamics CRM...
                </p>
              </div>
            ) : !selectedProspecto ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ArrowRightLeft className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-sm font-medium">Selecciona un prospecto</p>
                <p className="text-xs mt-1">Para ver la comparación con Dynamics</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Datos de Dynamics */}
                {dynamicsData && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {dynamicsData.Nombre}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ID Dynamics: {dynamicsData.LeadID}
                        </p>
                      </div>
                      <div className="ml-auto">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${dynamicsLeadService.getCalificacionColor(dynamicsData.Calificacion)} text-white`}>
                          {dynamicsData.Calificacion}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Coordinación Dynamics</span>
                        <p className="font-medium text-gray-900 dark:text-white">{dynamicsData.Coordinacion}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Propietario Dynamics</span>
                        <p className="font-medium text-gray-900 dark:text-white">{dynamicsData.Propietario}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Última Llamada</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {dynamicsLeadService.formatFechaUltimaLlamada(dynamicsData.FechaUltimaLlamada)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">País</span>
                        <p className="font-medium text-gray-900 dark:text-white">{dynamicsData.Pais}</p>
                      </div>
                      {/* Status CRM desde tabla crm_data */}
                      {statusCrm && (
                        <>
                          <div className="col-span-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Status CRM</span>
                            <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                {statusCrm}
                              </span>
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Comparación de campos (todos los campos) */}
                {comparisonResult && comparisonResult.allFields && comparisonResult.allFields.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-purple-500" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Comparación de Campos
                        </h3>
                      </div>
                      {comparisonResult.hasDiscrepancies ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {comparisonResult.discrepancies.length} discrepancia{comparisonResult.discrepancies.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Sincronizado
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {comparisonResult.allFields.map((field, index) => (
                        <motion.div
                          key={field.field}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`p-3 rounded-xl border transition-all ${
                            field.isSynced
                              ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10'
                              : field.severity === 'error'
                              ? 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10'
                              : field.severity === 'warning'
                              ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10'
                              : 'border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                              {field.fieldLabel}
                            </p>
                            {field.isSynced ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : field.severity === 'error' ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : field.severity === 'warning' ? (
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 p-2 rounded-lg bg-white/70 dark:bg-gray-800/70">
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Local</p>
                              <p className={`text-sm font-medium ${
                                field.isSynced 
                                  ? 'text-gray-900 dark:text-white' 
                                  : 'text-red-700 dark:text-red-300'
                              }`}>
                                {field.localValue || '—'}
                              </p>
                            </div>
                            <ArrowRight className={`w-4 h-4 flex-shrink-0 ${
                              field.isSynced ? 'text-emerald-400' : 'text-gray-400'
                            }`} />
                            <div className="flex-1 p-2 rounded-lg bg-white/70 dark:bg-gray-800/70">
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Dynamics</p>
                              <p className={`text-sm font-medium ${
                                field.isSynced 
                                  ? 'text-gray-900 dark:text-white' 
                                  : 'text-blue-700 dark:text-blue-300'
                              }`}>
                                {field.dynamicsValue || '—'}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Acciones */}
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {/* Botón de Sincronizar (en construcción) */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    disabled
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                  >
                    <Construction className="w-5 h-5" />
                    <span className="font-medium">Sincronizar con CRM</span>
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      En construcción
                    </span>
                  </motion.button>

                  {/* Botón de Reasignar */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setShowReassignModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium shadow-lg shadow-purple-500/25 hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    <UserCog className="w-5 h-5" />
                    <span>Reasignar Ejecutivo</span>
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Reasignación */}
      <AnimatePresence>
        {showReassignModal && selectedProspecto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => !isReassigning && setShowReassignModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              {/* Header del modal */}
              <div className="px-6 py-5 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <UserCog className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Reasignar Prospecto
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedProspecto.nombre_completo || selectedProspecto.nombre_whatsapp}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contenido del modal */}
              <div className="p-6 space-y-5">
                {/* Barra de progreso */}
                {isReassigning && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Procesando reasignación...</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">{reassignProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${reassignProgress}%` }}
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Selector de Coordinación */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span>Coordinación</span>
                  </label>
                  <select
                    value={selectedCoordinacion}
                    onChange={(e) => {
                      setSelectedCoordinacion(e.target.value);
                      setSelectedEjecutivo('');
                    }}
                    disabled={isReassigning}
                    className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:opacity-50"
                  >
                    <option value="">Selecciona una coordinación</option>
                    {coordinaciones.map((coord) => (
                      <option key={coord.id} value={coord.id}>
                        {coord.codigo} - {coord.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector de Ejecutivo */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>Ejecutivo</span>
                  </label>
                  <select
                    value={selectedEjecutivo}
                    onChange={(e) => setSelectedEjecutivo(e.target.value)}
                    disabled={isReassigning || !selectedCoordinacion}
                    className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:opacity-50"
                  >
                    <option value="">
                      {selectedCoordinacion ? 'Selecciona un ejecutivo' : 'Primero selecciona coordinación'}
                    </option>
                    {ejecutivosFiltered.map((ejec) => (
                      <option key={ejec.id} value={ejec.id}>
                        {ejec.full_name} {ejec.is_operativo === false ? '(No operativo)' : ''}
                      </option>
                    ))}
                  </select>
                  {selectedCoordinacion && ejecutivosFiltered.length === 0 && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      No hay ejecutivos activos en esta coordinación
                    </p>
                  )}
                </div>

                {/* Aviso */}
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium">Sincronización con Dynamics</p>
                      <p className="mt-1 text-blue-600 dark:text-blue-400">
                        La reasignación se sincronizará automáticamente con Microsoft Dynamics CRM.
                        Este proceso puede tardar hasta 80 segundos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer del modal */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowReassignModal(false)}
                  disabled={isReassigning}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-all"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleReassign}
                  disabled={isReassigning || !selectedEjecutivo}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 transition-all flex items-center gap-2"
                >
                  {isReassigning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Reasignar</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DynamicsCRMManager;

