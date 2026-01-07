/**
 * ============================================
 * DASHBOARD EJECUTIVO - MÓDULO PRINCIPAL v3.0
 * ============================================
 * 
 * Dashboard analítico con 4 widgets principales:
 * 1. Estados de Llamadas (Barras Horizontales)
 * 2. Métricas de Comunicación (4 métricas clave - CORREGIDO)
 * 3. Pipeline de Prospectos (Funnel VERTICAL con CSS animado)
 * 4. Ventas CRM Data (desde tabla crm_data.transactions)
 * 
 * Características:
 * - Filtros globales por coordinación y período
 * - Cada widget expandible a fullscreen
 * - Gráficos con Recharts + CSS animado (funnel vertical)
 * - Solo accesible para: admin y coordinadores de la coordinación CALIDAD
 *   (NO admin_operativo, NO coordinadores de otras coordinaciones)
 * 
 * Versión: 3.0.0
 * Fecha: Enero 2025
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, LabelList, AreaChart, Area
} from 'recharts';
import Plot from 'react-plotly.js';
import {
  Phone, MessageSquare, Clock, Users, TrendingUp,
  Calendar, Building2, ChevronDown, Maximize2, Minimize2,
  RefreshCw, AlertCircle, CheckCircle2,
  DollarSign, UserCheck, UserX, Hourglass, PhoneCall,
  ArrowRightLeft, BarChart3, Activity, Layers, Award,
  X, Package
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectivePermissions } from '../../hooks/useEffectivePermissions';
import { analysisSupabase } from '../../config/analysisSupabase';
import { permissionsService } from '../../services/permissionsService';
// supabaseSystemUI removido - ahora usamos coordinacion_id directamente en analysisSupabase
import { classifyCallStatus } from '../../services/callStatusClassifier';
import type { CallStatusGranular } from '../../services/callStatusClassifier';
import { coordinacionService } from '../../services/coordinacionService';
import type { Coordinacion } from '../../services/coordinacionService';
import toast from 'react-hot-toast';

// ============================================
// CONTEXT PARA VISTA EXPANDIDA
// ============================================
// Este context permite que los widgets hijos sepan si están siendo
// renderizados en el modal expandido o en la vista colapsada

interface WidgetViewContextType {
  isExpandedView: boolean;
}

const WidgetViewContext = React.createContext<WidgetViewContextType>({ isExpandedView: false });

const useWidgetView = () => React.useContext(WidgetViewContext);

// Componente helper que lee el Context y renderiza según la vista
const WidgetContent: React.FC<{
  collapsedContent: React.ReactNode;
  expandedContent: React.ReactNode;
}> = ({ collapsedContent, expandedContent }) => {
  const { isExpandedView } = useWidgetView();
  return <>{isExpandedView ? expandedContent : collapsedContent}</>;
};

// ============================================
// TIPOS E INTERFACES
// ============================================

type TimePeriod = 'year' | '6months' | 'month' | 'week' | '24hours';
type CoordinacionFilter = 'global' | string[];

interface DashboardFilters {
  period: TimePeriod;
  coordinaciones: CoordinacionFilter;
}

interface CallStatusData {
  status: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface CommunicationMetrics {
  avgCallDuration: number;
  avgMessagesPerProspect: number;
  totalCalls: number;
  totalMessages: number;
  totalProspects: number;
  transferRate: number;
  responseRate: number;
  // Datos históricos por mes para gráficas
  monthlyData: {
    month: string; // "Ene 2025"
    avgCallDuration: number;
    avgMessagesPerProspect: number;
    totalCalls: number;
    totalMessages: number;
    transferRate: number;
    responseRate: number;
  }[];
}

interface PipelineStage {
  name: string;
  shortName: string;
  count: number;
  percentage: number;
  fill: string;
  conversionFromPrevious?: number;
}

interface CRMCategoryData {
  count: number;           // Número de clientes con ventas
  certificados: number;    // Número total de certificados vendidos
  monto: number;           // Monto total
  reservaciones: number;   // Total de reservaciones
  paquetes: { numero: string; monto: number; fecha: string; coordinacion: string }[]; // Detalle
}

// Interfaz para detalle individual de venta
interface SaleDetail {
  id: string;
  numeroPaquete: string;
  monto: number;
  fecha: string;
  coordinacion: string;
  statusCRM: string;
  ejecutivo: string;
  cliente?: string;
}

interface CRMSalesData {
  activosPQNC: CRMCategoryData;
  inactivosPQNC: CRMCategoryData;
  enProceso: CRMCategoryData;
  otros: CRMCategoryData;
  total: CRMCategoryData;
  byCoordinacion: Record<string, { count: number; certificados: number; monto: number }>;
  byPeriod: { period: string; count: number; monto: number }[];
  allSalesDetails: SaleDetail[]; // Todos los detalles para el modal
}

// Datos del funnel por coordinación
interface FunnelCoordData {
  coordinacionId: string;
  coordinacionNombre: string;
  color: string;
  stages: { stage: string; count: number }[];
}

// ============================================
// CONSTANTES
// ============================================

const COORDINACIONES_CALIDAD = ['CALIDAD', 'VEN', 'I360', 'COBACA', 'MVP'];

// Colores para coordinaciones en el funnel
const COORD_COLORS: Record<string, string> = {
  'CALIDAD': '#3B82F6',
  'VEN': '#F59E0B',
  'I360': '#10B981',
  'COBACA': '#8B5CF6',
  'MVP': '#EC4899'
};

const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: 'year', label: 'Último Año' },
  { value: '6months', label: 'Últimos 6 Meses' },
  { value: 'month', label: 'Último Mes' },
  { value: 'week', label: 'Última Semana' },
  { value: '24hours', label: 'Últimas 24h' }
];

// Etapas del FUNNEL DE CONVERSIÓN (flujo principal)
// Orden: Validando → En Seguimiento → Interesado → Atendió Llamada → Ejecutivo → Certificado
const FUNNEL_CONVERSION_STAGES = [
  { key: 'validando_membresia', name: 'Validando Membresía', shortName: 'Validando', description: 'Entrada de todas las conversaciones' },
  { key: 'en_seguimiento', name: 'En Seguimiento', shortName: 'Seguimiento', description: 'En proceso de seguimiento' },
  { key: 'interesado', name: 'Interesado', shortName: 'Interesado', description: 'Ya proporcionó datos de discovery' },
  { key: 'atendio_llamada', name: 'Atendió Llamada', shortName: 'Atendió', description: 'Atendió la llamada' },
  { key: 'con_ejecutivo', name: 'Con Ejecutivo', shortName: 'Ejecutivo', description: 'Siendo atendido por ejecutivo' },
  { key: 'certificado_adquirido', name: 'Certificado Adquirido', shortName: 'Certificado', description: 'Adquirió certificado vacacional' }
];

// Etapas FUERA DEL FUNNEL (prospectos descartados que también cuentan para el total)
const OUT_OF_FUNNEL_STAGES = [
  { key: 'activo_pqnc', name: 'Activo PQNC', shortName: 'Activo PQNC', description: 'Ya era cliente activo' },
  { key: 'es_miembro', name: 'Es Miembro', shortName: 'Miembro', description: 'Ya estaba siendo atendido' }
];

// Todas las etapas para clasificación (el TOTAL incluye todas)
const ALL_STAGES = [...FUNNEL_CONVERSION_STAGES, ...OUT_OF_FUNNEL_STAGES];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  transferida: { label: 'Transferidas', color: '#10B981' },
  atendida: { label: 'Atendidas (No Transfer.)', color: '#F59E0B' },
  no_contestada: { label: 'No Contestadas', color: '#F97316' },
  buzon: { label: 'Buzón de Voz', color: '#8B5CF6' },
  perdida: { label: 'Fallidas', color: '#EF4444' },
  activa: { label: 'En Llamada', color: '#3B82F6' }
};

// ============================================
// COMPONENTE DE WIDGET EXPANDIBLE
// ============================================

interface ExpandableWidgetProps {
  title: string;
  renderContent: (isExpandedView: boolean) => React.ReactNode;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLoading?: boolean;
  subtitle?: string;
  icon?: React.ReactNode;
}

const ExpandableWidget: React.FC<ExpandableWidgetProps> = ({
  title,
  renderContent,
  isExpanded,
  onToggleExpand,
  isLoading = false,
  subtitle,
  icon
}) => {
  // Animaciones sofisticadas para el modal
  const backdropVariants = {
    hidden: { 
      opacity: 0,
      backdropFilter: 'blur(0px)'
    },
    visible: { 
      opacity: 1,
      backdropFilter: 'blur(12px)',
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: { 
      opacity: 0,
      backdropFilter: 'blur(0px)',
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 1, 1]
      }
    }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.85,
      y: 40,
      rotateX: 10
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: 'spring',
        damping: 28,
        stiffness: 400,
        mass: 0.8,
        delay: 0.05
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.9,
      y: 20,
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 1, 1]
      }
    }
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { delay: 0.1, duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { delay: 0.15, duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    }
  };

  return (
    <>
      {/* Modal expandido - siempre como overlay */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="expanded-overlay"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
            style={{ perspective: '1200px' }}
            onClick={(e) => e.target === e.currentTarget && onToggleExpand()}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.div 
                variants={headerVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/80 dark:to-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  {icon && (
                    <motion.div 
                      className="text-blue-500"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', delay: 0.2, stiffness: 300 }}
                    >
                      {icon}
                    </motion.div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                    {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
                  </div>
                </div>
                <motion.button
                  onClick={onToggleExpand}
                  className="p-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <Minimize2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </motion.button>
              </motion.div>
              <motion.div 
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                className="flex-1 p-6 overflow-auto"
              >
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="h-full min-h-[500px]">{renderContent(true)}</div>
              )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget colapsado - siempre visible con tamaño fijo */}
      <div
        className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden h-full flex flex-col ${isExpanded ? 'ring-2 ring-blue-500/50' : ''}`}
      >
        <div 
          className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
          onClick={onToggleExpand}
        >
          <div className="flex items-center gap-2.5">
            {icon && <div className="text-blue-500">{icon}</div>}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
              {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isExpanded && (
              <span className="text-xs text-blue-500 font-medium">Expandido</span>
            )}
            <Maximize2 className={`w-4 h-4 transition-colors ${isExpanded ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-500'}`} />
          </div>
        </div>
        {/* Contenido colapsado - siempre con isExpandedView=false */}
        <div 
          className="flex-1 p-4 overflow-hidden transition-opacity duration-200"
          style={{ 
            opacity: isExpanded ? 0.3 : 1,
            pointerEvents: isExpanded ? 'none' : 'auto'
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full min-h-[180px]">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : (
            renderContent(false)
          )}
        </div>
      </div>
    </>
  );
};

// ============================================
// SELECTOR DE FILTROS
// ============================================

interface FilterSelectorProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  coordinaciones: Coordinacion[];
  isLoading: boolean;
}

const FilterSelector: React.FC<FilterSelectorProps> = ({
  filters,
  onFiltersChange,
  coordinaciones,
  isLoading
}) => {
  const [showCoordDropdown, setShowCoordDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCoordDropdown(false);
      }
    };

    if (showCoordDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCoordDropdown]);
  
  const coordsCalidad = useMemo(() => 
    coordinaciones.filter(c => COORDINACIONES_CALIDAD.includes(c.codigo?.toUpperCase())),
    [coordinaciones]
  );

  const selectedCoordNames = useMemo(() => {
    if (filters.coordinaciones === 'global') return 'Global (Todas)';
    if (Array.isArray(filters.coordinaciones)) {
      const names = filters.coordinaciones.map(id => 
        coordinaciones.find(c => c.id === id)?.codigo || id
      );
      if (names.length === 1) return names[0];
      if (names.length === coordsCalidad.length) return 'Comparativa (Todas)';
      return `Comparativa (${names.length})`;
    }
    return 'Global';
  }, [filters.coordinaciones, coordinaciones, coordsCalidad]);

  const toggleCoordinacion = (coordId: string) => {
    if (filters.coordinaciones === 'global') {
      onFiltersChange({ ...filters, coordinaciones: [coordId] });
    } else if (Array.isArray(filters.coordinaciones)) {
      if (filters.coordinaciones.includes(coordId)) {
        const newCoords = filters.coordinaciones.filter(id => id !== coordId);
        onFiltersChange({ 
          ...filters, 
          coordinaciones: newCoords.length === 0 ? 'global' : newCoords 
        });
      } else {
        onFiltersChange({ 
          ...filters, 
          coordinaciones: [...filters.coordinaciones, coordId] 
        });
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl mb-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-blue-500" />
        <select
          value={filters.period}
          onChange={(e) => onFiltersChange({ ...filters, period: e.target.value as TimePeriod })}
          className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium text-gray-700 dark:text-gray-200"
          disabled={isLoading}
        >
          {TIME_PERIODS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowCoordDropdown(!showCoordDropdown)}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 transition-all font-medium"
        >
          <Building2 className="w-4 h-4 text-blue-500" />
          <span className="text-gray-700 dark:text-gray-200">{selectedCoordNames}</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCoordDropdown ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showCoordDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => { onFiltersChange({ ...filters, coordinaciones: 'global' }); setShowCoordDropdown(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    filters.coordinaciones === 'global'
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      filters.coordinaciones === 'global' ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-500'
                    }`}>
                      {filters.coordinaciones === 'global' && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span>Global (Sin comparativa)</span>
                  </div>
                </button>
              </div>

              <div className="p-3 max-h-64 overflow-y-auto scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-1">Selecciona para comparar:</p>
                {coordsCalidad.map(coord => {
                  const isSelected = Array.isArray(filters.coordinaciones) && 
                    filters.coordinaciones.includes(coord.id);
                  return (
                    <button
                      key={coord.id}
                      onClick={() => toggleCoordinacion(coord.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors mb-1 ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-500'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span>{coord.nombre}</span>
                        <span className="text-xs text-gray-400 ml-auto">{coord.codigo}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 ml-auto">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Actualizando...</span>
        </div>
      )}
    </div>
  );
};

// ============================================
// WIDGET 1: ESTADOS DE LLAMADAS
// ============================================

interface CallStatusWidgetProps {
  data: CallStatusData[];
  coordData: {
    coordId: string;
    coordName: string;
    coordColor: string;
    noContestadas: number;
    atendidas: number;
    transferidas: number;
    total: number;
  }[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLoading: boolean;
  totalCalls: number;
  isComparative: boolean;
  onToggleCoord?: (coordId: string) => void;
}

// Componente interno para el contenido del widget de llamadas
const CallStatusContent: React.FC<{
  data: CallStatusData[];
  coordData: CoordCallData[];
  totalCalls: number;
  isComparative: boolean;
  isExpandedView: boolean;
}> = ({ data, coordData, totalCalls, isComparative, isExpandedView }) => {
  
  // Estado para coordinaciones visibles en el gráfico
  const [visibleCoords, setVisibleCoords] = useState<Set<string>>(new Set(coordData.map(c => c.coordId)));
  
  // Actualizar visibleCoords cuando cambia coordData
  useEffect(() => {
    setVisibleCoords(new Set(coordData.map(c => c.coordId)));
  }, [coordData]);

  // Toggle de visibilidad de coordinación
  const handleLegendClick = (coordName: string) => {
    const coord = coordData.find(c => c.coordName === coordName);
    if (!coord) return;
    
    setVisibleCoords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(coord.coordId)) {
        // No permitir desmarcar si solo queda una
        if (newSet.size > 1) {
          newSet.delete(coord.coordId);
        }
      } else {
        newSet.add(coord.coordId);
      }
      return newSet;
    });
  };

  // Filtrar coordData según visibilidad
  const filteredCoordData = useMemo(() => {
    return coordData.filter(c => visibleCoords.has(c.coordId));
  }, [coordData, visibleCoords]);

  // Datos para vista global (sin selección de coordinación)
  const globalChartData = useMemo(() => {
    const noContestadas = data.filter(d => ['no_contestada', 'buzon', 'perdida'].includes(d.status));
    const atendidas = data.find(d => d.status === 'atendida');
    const transferidas = data.find(d => d.status === 'transferida');

    return [
      {
        name: 'No Contestadas',
        count: noContestadas.reduce((sum, d) => sum + d.count, 0),
        fill: '#F97316',
        detail: `Buzón: ${data.find(d => d.status === 'buzon')?.count || 0} | No contestó: ${data.find(d => d.status === 'no_contestada')?.count || 0} | Fallidas: ${data.find(d => d.status === 'perdida')?.count || 0}`
      },
      {
        name: 'Atendidas (No Transfer.)',
        count: atendidas?.count || 0,
        fill: '#F59E0B',
        detail: 'Hubo conversación pero no se transfirió a ejecutivo'
      },
      {
        name: 'Transferidas',
        count: transferidas?.count || 0,
        fill: '#10B981',
        detail: 'Transferidas exitosamente a ejecutivo humano'
      }
    ].filter(d => d.count > 0);
  }, [data]);

  // Datos para vista comparativa por coordinación (solo las visibles)
  const comparativeChartData = useMemo(() => {
    if (filteredCoordData.length === 0) return [];
    
    return [
      { name: 'No Contestadas', ...Object.fromEntries(filteredCoordData.map(c => [c.coordName, c.noContestadas])), _separator: true },
      { name: 'Atendidas', ...Object.fromEntries(filteredCoordData.map(c => [c.coordName, c.atendidas])), _separator: true },
      { name: 'Transferidas', ...Object.fromEntries(filteredCoordData.map(c => [c.coordName, c.transferidas])), _separator: false }
    ];
  }, [filteredCoordData]);

  const showComparative = isComparative && coordData.length > 0;

  // Calcular totales visibles
  const visibleTotalCalls = useMemo(() => {
    if (!showComparative) return totalCalls;
    return filteredCoordData.reduce((sum, c) => sum + c.total, 0);
  }, [showComparative, filteredCoordData, totalCalls]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      if (showComparative) {
        return (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
            <p className="font-bold text-gray-900 dark:text-white mb-2">{payload[0]?.payload?.name}</p>
            {payload.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: p.fill }} />
                <span className="text-sm text-gray-600 dark:text-gray-300">{p.name}:</span>
                <span className="font-bold" style={{ color: p.fill }}>{p.value?.toLocaleString()}</span>
              </div>
            ))}
          </div>
        );
      }
      const item = payload[0].payload;
      const pct = totalCalls > 0 ? ((item.count / totalCalls) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: item.fill }}>{item.count.toLocaleString()}</p>
          <p className="text-sm text-gray-500">{pct}% del total</p>
          <p className="text-xs text-gray-400 mt-2 max-w-xs">{item.detail}</p>
        </div>
      );
    }
    return null;
  };

  // Leyenda personalizada con toggle
  const CustomLegend = () => {
    if (!showComparative) return null;
    
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        {coordData.map(coord => {
          const isVisible = visibleCoords.has(coord.coordId);
          return (
            <button
              key={coord.coordId}
              onClick={() => handleLegendClick(coord.coordName)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                isVisible 
                  ? 'bg-gray-100 dark:bg-gray-700' 
                  : 'bg-gray-50 dark:bg-gray-800 opacity-50'
              } hover:opacity-100`}
            >
              <div 
                className={`w-3 h-3 rounded ${isVisible ? '' : 'opacity-30'}`}
                style={{ backgroundColor: coord.coordColor }}
              />
              <span className={`text-sm font-medium ${isVisible ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 line-through'}`}>
                {coord.coordName}
              </span>
              <span className={`text-xs ${isVisible ? 'text-gray-500' : 'text-gray-400'}`}>
                ({coord.total.toLocaleString()})
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  // Indicadores sin "activa" y sin colores (solo grises)
  const displayData = useMemo(() => {
    return data.filter(d => d.status !== 'activa'); // Quitar "en llamada"
  }, [data]);

  return (
    <div className="h-full flex flex-col">
        <ResponsiveContainer width="100%" height={isExpandedView ? 525 : 270}>
          {showComparative ? (
            // Vista comparativa: barras agrupadas por coordinación
            <BarChart data={comparativeChartData} layout="vertical" margin={{ top: 10, right: 40, left: 10, bottom: 10 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
              <YAxis type="category" dataKey="name" width={isExpandedView ? 140 : 110} tick={{ fill: '#9CA3AF', fontSize: isExpandedView ? 13 : 11 }} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              {filteredCoordData.map((coord) => (
                <Bar 
                  key={coord.coordId} 
                  dataKey={coord.coordName} 
                  fill={coord.coordColor} 
                  radius={[0, 6, 6, 0]}
                  animationDuration={2000}
                  barSize={isExpandedView ? 28 : 22}
                >
                  <LabelList 
                    dataKey={coord.coordName} 
                    position="insideRight" 
                    fill="white" 
                    fontSize={isExpandedView ? 12 : 10}
                    fontWeight="bold"
                    formatter={(v: number) => v > 0 ? v.toLocaleString() : ''}
                  />
                </Bar>
              ))}
            </BarChart>
          ) : (
            // Vista global: barras simples
            <BarChart data={globalChartData} layout="vertical" margin={{ top: 10, right: 40, left: 10, bottom: 10 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} />
              <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
              <YAxis type="category" dataKey="name" width={isExpandedView ? 160 : 110} tick={{ fill: '#9CA3AF', fontSize: isExpandedView ? 13 : 11 }} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} animationDuration={2000} barSize={isExpandedView ? 50 : 40}>
                {globalChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList 
                  dataKey="count" 
                  position="insideRight" 
                  fill="white" 
                  fontSize={isExpandedView ? 14 : 12}
                  fontWeight="bold"
                  formatter={(v: number) => {
                    const pct = totalCalls > 0 ? ((v / totalCalls) * 100).toFixed(1) : 0;
                    return `${v.toLocaleString()} (${pct}%)`;
                  }}
                />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>

        {/* Leyenda interactiva para coordinaciones */}
        <CustomLegend />

        {/* Indicadores detallados (sin colores, sin "activa") - solo en vista expandida */}
        {isExpandedView && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Desglose por estado</p>
            <div className="grid grid-cols-5 gap-3">
              {displayData.map(item => (
                <div 
                  key={item.status}
                  className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
                >
                  <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">{item.label}</span>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{item.count.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
  );
};

// Wrapper del widget de llamadas
const CallStatusWidget: React.FC<CallStatusWidgetProps> = ({
  data,
  coordData,
  isExpanded,
  onToggleExpand,
  isLoading,
  totalCalls,
  isComparative,
  onToggleCoord
}) => {
  return (
    <ExpandableWidget
      title="Estados de Llamadas"
      subtitle={`${totalCalls.toLocaleString()} llamadas${isComparative ? ` · ${coordData.length} coordinaciones` : ''}`}
      icon={<Phone className="w-5 h-5" />}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      isLoading={isLoading}
      renderContent={(isExpandedView) => (
        <CallStatusContent
          data={data}
          coordData={coordData}
          totalCalls={totalCalls}
          isComparative={isComparative}
          isExpandedView={isExpandedView}
        />
      )}
    />
  );
};

// ============================================
// WIDGET 2: MÉTRICAS DE COMUNICACIÓN (CON GRÁFICAS HISTÓRICAS)
// ============================================

interface CommunicationWidgetProps {
  metrics: CommunicationMetrics;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLoading: boolean;
}

const CommunicationWidget: React.FC<CommunicationWidgetProps> = ({
  metrics,
  isExpanded,
  onToggleExpand,
  isLoading
}) => {
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const cards = [
    {
      key: 'avgCallDuration',
      label: 'Tiempo Prom. Llamada',
      value: formatDuration(metrics.avgCallDuration),
      subLabel: `De ${metrics.totalCalls.toLocaleString()} llamadas`,
      icon: <Clock className="w-5 h-5" />,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20',
      color: '#3B82F6',
      formatValue: (v: number) => formatDuration(v),
      dataKey: 'avgCallDuration'
    },
    {
      key: 'avgMessagesPerProspect',
      label: 'Mensajes Prom./Prospecto',
      value: metrics.avgMessagesPerProspect.toFixed(1),
      subLabel: `En ${metrics.totalProspects.toLocaleString()} prospectos`,
      icon: <MessageSquare className="w-5 h-5" />,
      gradient: 'from-emerald-500 to-emerald-600',
      bgGradient: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20',
      color: '#10B981',
      formatValue: (v: number) => v.toFixed(1),
      dataKey: 'avgMessagesPerProspect'
    },
    {
      key: 'transferRate',
      label: 'Tasa de Transferencia',
      value: `${metrics.transferRate.toFixed(1)}%`,
      subLabel: 'Llamadas → Ejecutivo',
      icon: <ArrowRightLeft className="w-5 h-5" />,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20',
      color: '#8B5CF6',
      formatValue: (v: number) => `${v.toFixed(1)}%`,
      dataKey: 'transferRate'
    },
    {
      key: 'responseRate',
      label: 'Tasa de Respuesta',
      value: `${metrics.responseRate.toFixed(1)}%`,
      subLabel: 'Llamadas contestadas',
      icon: <PhoneCall className="w-5 h-5" />,
      gradient: 'from-amber-500 to-amber-600',
      bgGradient: 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20',
      color: '#F59E0B',
      formatValue: (v: number) => `${v.toFixed(1)}%`,
      dataKey: 'responseRate'
    }
  ];

  // Contenido colapsado
  const collapsedContent = (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(card => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-xl bg-gradient-to-br ${card.bgGradient} border border-gray-100 dark:border-gray-700/50`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${card.gradient} text-white`}>
              {card.icon}
            </div>
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{card.label}</span>
          <p className="font-bold text-gray-900 dark:text-white text-xl mt-1">{card.value}</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs">{card.subLabel}</p>
        </motion.div>
      ))}
    </div>
  );

  // Contenido expandido
  const expandedContent = (
    <div className="space-y-6">
          {/* Cards resumen arriba */}
          <div className="grid grid-cols-4 gap-4">
            {cards.map(card => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl bg-gradient-to-br ${card.bgGradient} border border-gray-100 dark:border-gray-700/50`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg bg-gradient-to-br ${card.gradient} text-white`}>
                    {card.icon}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{card.label}</span>
                </div>
                <p className="font-bold text-gray-900 dark:text-white text-2xl">{card.value}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{card.subLabel}</p>
              </motion.div>
            ))}
          </div>

          {/* Gráficas lineales por mes */}
          {metrics.monthlyData.length > 0 && (
            <div className="grid grid-cols-2 gap-6">
              {cards.map(card => (
                <div key={card.key} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{card.label}</h4>
                  </div>
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={metrics.monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id={`gradient-${card.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={card.color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={card.color} stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: '#9CA3AF', fontSize: 10 }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fill: '#9CA3AF', fontSize: 10 }} 
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        tickFormatter={(v) => card.key.includes('Rate') ? `${v.toFixed(0)}%` : v.toFixed(0)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                        }}
                        labelStyle={{ color: '#F9FAFB', fontWeight: 'bold' }}
                        formatter={(value: number) => [card.formatValue(value), card.label]}
                      />
                      <Area
                        type="monotone"
                        dataKey={card.dataKey}
                        stroke={card.color}
                        strokeWidth={2}
                        fill={`url(#gradient-${card.key})`}
                        animationDuration={1600}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          )}

          {metrics.monthlyData.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No hay datos históricos disponibles para el período seleccionado
            </div>
          )}
        </div>
  );

  return (
    <ExpandableWidget
      title="Métricas de Comunicación"
      subtitle={`${metrics.totalMessages.toLocaleString()} mensajes totales`}
      icon={<Activity className="w-5 h-5" />}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      isLoading={isLoading}
      renderContent={(isExpandedView) => isExpandedView ? expandedContent : collapsedContent}
    />
  );
};

// ============================================
// WIDGET 3: FUNNEL DE CONVERSIÓN (PLOTLY)
// ============================================

interface CoordAssignment {
  coordName: string;
  coordCode: string;
  count: number;
  color: string;
}

interface FunnelWidgetProps {
  funnelData: FunnelCoordData[];
  globalStages: PipelineStage[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLoading: boolean;
  isGlobal: boolean;
  totalProspects: number;
  trackingStages?: PipelineStage[];
  assignmentByCoord?: CoordAssignment[];
}

// Componente interno para contenido del funnel
const FunnelContent: React.FC<{
  funnelData: FunnelCoordData[];
  globalStages: PipelineStage[];
  isGlobal: boolean;
  totalProspects: number;
  trackingStages: PipelineStage[];
  assignmentByCoord: CoordAssignment[];
  isExpandedView: boolean;
}> = ({
  funnelData,
  globalStages,
  isGlobal,
  totalProspects,
  trackingStages,
  assignmentByCoord,
  isExpandedView
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Colores del funnel de conversión (6 etapas)
  const FUNNEL_COLORS = [
    '#3B82F6', // Azul - Validando (entrada)
    '#6366F1', // Indigo - En Seguimiento
    '#8B5CF6', // Púrpura - Interesado
    '#F59E0B', // Naranja - Atendió Llamada
    '#EC4899', // Rosa - Ejecutivo
    '#10B981'  // Verde - Certificado (meta)
  ];

  // Construir datos para Plotly Funnel
  const plotlyData = useMemo(() => {
    if (isGlobal || funnelData.length === 0) {
      // Vista global: un solo funnel
      const stageNames = globalStages.map(s => s.name);
      const values = globalStages.map(s => s.count);
      
      // El TOTAL incluye prospectos del funnel + fuera del funnel
      const grandTotal = totalProspects || 1;
      
      // Crear etiquetas con valor, porcentaje del TOTAL y conversión
      // Formato: NÚMERO grande | % del total | ↓% conversión
      const textLabels = globalStages.map((s, i) => {
        const pctOfTotal = ((s.count / grandTotal) * 100).toFixed(1);
        const prevCount = i > 0 ? globalStages[i - 1].count : s.count;
        const convPct = i > 0 && prevCount > 0 ? ((s.count / prevCount) * 100).toFixed(0) : null;
        
        // Primera etapa: mostrar solo total y porcentaje
        if (i === 0) {
          return `<b style="font-size:1.3em">${s.count.toLocaleString()}</b>  <span style="opacity:0.9">(${pctOfTotal}%)</span>`;
        }
        // Otras etapas: mostrar total, porcentaje y conversión desde anterior
        return `<b style="font-size:1.3em">${s.count.toLocaleString()}</b>  <span style="opacity:0.9">(${pctOfTotal}%)</span>  <b style="color:#4ADE80">↓${convPct}%</b>`;
      });
      
      return [{
        type: 'funnel' as const,
        name: 'Conversión',
        y: stageNames,
        x: values,
        text: textLabels,
        textposition: 'inside' as const,
        textfont: { 
          size: isExpandedView ? 15 : 13, // Texto más grande
          color: 'white',
          family: 'Inter, system-ui, sans-serif'
        },
        marker: { 
          color: FUNNEL_COLORS.slice(0, globalStages.length),
          line: { width: 2, color: 'rgba(255,255,255,0.4)' },
          cornerradius: 8 // Esquinas redondeadas
        } as any,
        connector: { 
          line: { color: 'rgba(99,102,241,0.4)', width: 2 },
          fillcolor: 'rgba(99,102,241,0.15)'
        },
        hovertemplate: '<b>%{y}</b><br>Cantidad: %{x:,}<br>%{text}<extra></extra>',
        opacity: 0.95
      }];
    }
    
    // Vista comparativa: Stacked por coordinación
    return funnelData.map((coord) => {
      const stageNames = FUNNEL_CONVERSION_STAGES.map(s => s.name);
      const values = FUNNEL_CONVERSION_STAGES.map(s => {
        const found = coord.stages.find(cs => cs.stage === s.name);
        return found?.count || 0;
      });
      
      return {
        type: 'funnel' as const,
        name: coord.coordinacionNombre,
        y: stageNames,
        x: values,
        textposition: 'inside' as const,
        textinfo: 'value+percent previous' as const,
        textfont: { size: isExpandedView ? 13 : 11, color: 'white' }, // Texto más grande
        marker: { 
          color: coord.color || COORD_COLORS[coord.coordinacionNombre.toUpperCase()] || '#6B7280',
          line: { width: 1, color: 'rgba(255,255,255,0.3)' },
          cornerradius: 6 // Esquinas redondeadas
        } as any,
        hovertemplate: `<b>${coord.coordinacionNombre} - %{y}</b><br>Cantidad: %{x:,}<br>Conversión: %{percentPrevious:.1%}<extra></extra>`
      };
    });
  }, [funnelData, globalStages, isGlobal, isExpandedView]);

  const layout = useMemo(() => ({
    margin: { l: isExpandedView ? 180 : 140, r: 50, t: 20, b: 20 }, // Mayor margen izquierdo para etiquetas
    funnelmode: 'stack' as const,
    funnelgap: 0.25, // Más separación entre barras para mejor efecto visual
    showlegend: !isGlobal && funnelData.length > 1,
    legend: { 
      orientation: 'h' as const, 
      y: -0.12,
      x: 0.5,
      xanchor: 'center' as const,
      font: { size: 11 }
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { 
      family: 'Inter, system-ui, sans-serif', 
      size: isExpandedView ? 12 : 10,
      color: '#9CA3AF'
    },
    hoverlabel: {
      bgcolor: '#1F2937',
      bordercolor: '#374151',
      font: { color: '#F9FAFB', size: 12, family: 'Inter, system-ui, sans-serif' }
    },
    // Animaciones del funnel
    transition: {
      duration: 1500,
      easing: 'cubic-in-out'
    }
  }), [isExpandedView, isGlobal, funnelData.length]);

  const config = {
    displayModeBar: false,
    responsive: true
  };
  
  // Frame de animación para Plotly
  const [animationKey, setAnimationKey] = useState(0);
  
  // Resetear animación cuando cambian los datos
  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [globalStages, funnelData]);

  // Calcular conversión total (respecto al total global incluyendo fuera del funnel)
  const totalConversionRate = useMemo(() => {
    if (globalStages.length < 2) return 0;
    const grandTotal = totalProspects || 0;
    const last = globalStages[globalStages.length - 1]?.count || 0;
    return grandTotal > 0 ? (last / grandTotal * 100) : 0;
  }, [globalStages, totalProspects]);

  return (
    <div ref={containerRef} className="h-full w-full flex flex-col">
        {/* Gráfico Plotly con animación de entrada */}
        <motion.div 
          key={animationKey}
          className="flex-1"
          initial={{ opacity: 0, scaleY: 0.3, originY: 1 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ 
            duration: 1.2, 
            ease: [0.34, 1.56, 0.64, 1],
            opacity: { duration: 0.6 }
          }}
        >
          <Plot
            data={plotlyData as any}
            layout={{
              ...layout,
              width: undefined,
              height: isExpandedView ? 550 : 420,
              autosize: true
            } as any}
            config={config}
            style={{ width: '100%', height: isExpandedView ? '550px' : '420px' }}
            useResizeHandler={true}
          />
        </motion.div>
        
        {/* Información adicional (solo expandido) */}
        {isExpandedView && (
          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resumen de conversión */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/10 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                  Flujo de Conversión
                </h4>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {totalConversionRate.toFixed(2)}%
                  </span>
                  <span className="text-sm text-emerald-600/70 dark:text-emerald-400/70">
                    llegaron a Certificado (de {totalProspects.toLocaleString()} totales)
                  </span>
                </div>
                <div className="text-xs text-emerald-600/60 dark:text-emerald-400/60 space-y-1">
                  {globalStages.map((stage, i) => {
                    const pctOfTotal = totalProspects > 0 ? ((stage.count / totalProspects) * 100).toFixed(1) : '0';
                    return (
                      <div key={stage.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: FUNNEL_COLORS[i] }} />
                        <span>{stage.shortName}:</span>
                        <span className="font-medium">{stage.count.toLocaleString()}</span>
                        <span className="text-gray-400">({pctOfTotal}%)</span>
                        {i > 0 && globalStages[i-1].count > 0 && (
                          <span className="ml-auto text-emerald-500">
                            ↓{((stage.count / globalStages[i-1].count) * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Etapas de seguimiento/descarte */}
              {trackingStages.length > 0 && trackingStages.some(s => s.count > 0) && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Prospectos Fuera del Funnel
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">No forman parte del proceso de conversión</p>
                  <div className="grid grid-cols-2 gap-2">
                    {trackingStages.filter(s => s.count > 0).map((stage) => (
                      <div key={stage.name} className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{stage.shortName}</span>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-auto">
                          {stage.count.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Asignación total por coordinación - Ancho completo */}
            {assignmentByCoord.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800/50 mt-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Asignación por Coordinación
                </h4>
                <p className="text-xs text-gray-500 mb-4">Total de prospectos en el periodo seleccionado</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {assignmentByCoord.map((coord) => {
                    const totalAssigned = assignmentByCoord.reduce((sum, c) => sum + c.count, 0);
                    const percentage = totalAssigned > 0 ? (coord.count / totalAssigned) * 100 : 0;
                    return (
                      <div key={coord.coordCode} className="bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: coord.color }}
                          />
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {coord.coordCode}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {coord.count.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">{coord.coordName}</p>
                        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="h-1.5 rounded-full"
                            style={{ backgroundColor: coord.color }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{percentage.toFixed(1)}% del total</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
};

// Wrapper del FunnelWidget
const FunnelWidget: React.FC<FunnelWidgetProps> = ({
  funnelData,
  globalStages,
  isExpanded,
  onToggleExpand,
  isLoading,
  isGlobal,
  totalProspects,
  trackingStages = [],
  assignmentByCoord = []
}) => {
  // Calcular conversión total para el subtítulo
  const totalConversionRate = useMemo(() => {
    if (globalStages.length < 2) return 0;
    const grandTotal = totalProspects || 0;
    const last = globalStages[globalStages.length - 1]?.count || 0;
    return grandTotal > 0 ? (last / grandTotal * 100) : 0;
  }, [globalStages, totalProspects]);

  return (
    <ExpandableWidget
      title="Funnel de Conversión"
      subtitle={`${totalProspects.toLocaleString()} prospectos | ${totalConversionRate.toFixed(2)}% conversión total`}
      icon={<Layers className="w-5 h-5" />}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      isLoading={isLoading}
      renderContent={(isExpandedView) => (
        <FunnelContent
          funnelData={funnelData}
          globalStages={globalStages}
          isGlobal={isGlobal}
          totalProspects={totalProspects}
          trackingStages={trackingStages}
          assignmentByCoord={assignmentByCoord}
          isExpandedView={isExpandedView}
        />
      )}
    />
  );
};

// ============================================
// WIDGET 4: VENTAS CRM DATA (CORREGIDO)
// ============================================

interface CRMSalesWidgetProps {
  data: CRMSalesData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLoading: boolean;
  period: TimePeriod;
}

const CRMSalesWidget: React.FC<CRMSalesWidgetProps> = ({
  data,
  isExpanded,
  onToggleExpand,
  isLoading,
  period
}) => {
  // Estado para modal de detalle por coordinación
  const [selectedCoord, setSelectedCoord] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const formatMoney = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toLocaleString()}`;
  };

  const monthNames: Record<string, string> = {
    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
    '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
  };

  // Cards principales: énfasis en número de certificados
  const cards = [
    {
      label: 'Activos PQNC',
      certificados: data.activosPQNC?.certificados || 0,
      clientes: data.activosPQNC?.count || 0,
      monto: data.activosPQNC?.monto || 0,
      icon: <UserCheck className="w-5 h-5" />,
      gradient: 'from-emerald-500 to-emerald-600',
      bgGradient: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20',
      color: '#10B981',
      description: 'Miembros activos'
    },
    {
      label: 'Inactivos PQNC',
      certificados: data.inactivosPQNC?.certificados || 0,
      clientes: data.inactivosPQNC?.count || 0,
      monto: data.inactivosPQNC?.monto || 0,
      icon: <UserX className="w-5 h-5" />,
      gradient: 'from-amber-500 to-amber-600',
      bgGradient: 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20',
      color: '#F59E0B',
      description: 'Miembros inactivos'
    },
    {
      label: 'En Proceso',
      certificados: data.enProceso?.certificados || 0,
      clientes: data.enProceso?.count || 0,
      monto: data.enProceso?.monto || 0,
      icon: <Hourglass className="w-5 h-5" />,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20',
      color: '#3B82F6',
      description: 'Canal WhatsApp'
    }
  ];

  // Datos para gráfica de barras por categoría
  const barData = cards.map(c => ({
    name: c.label.replace(' PQNC', ''),
    certificados: c.certificados,
    monto: c.monto / 1000, // En miles
    fill: c.color
  })).filter(d => d.certificados > 0);

  // Etiqueta del timeline según periodo
  const getTimelineLabel = () => {
    switch (period) {
      case '24hours': return 'Por Hora';
      case 'week': return 'Por Día';
      case 'month': return 'Por Semana';
      default: return 'Por Mes';
    }
  };

  // Datos para timeline según periodo
  const timelineData = (data.byPeriod || []).map(m => ({
    period: m.period,
    certificados: m.count,
    monto: m.monto / 1000
  }));

  // Datos por coordinación
  const coordData = Object.entries(data.byCoordinacion || {})
    .map(([coord, d]) => ({
      name: coord,
      certificados: d.certificados,
      monto: d.monto
    }))
    .sort((a, b) => b.certificados - a.certificados)
    .slice(0, 6);

  const totalCertificados = data.total?.certificados || 0;
  const totalMonto = data.total?.monto || 0;
  const totalClientes = data.total?.count || 0;

  // Obtener ventas filtradas por coordinación para el modal
  const filteredSales = useMemo(() => {
    if (!selectedCoord || !data.allSalesDetails) return [];
    return data.allSalesDetails.filter(sale => sale.coordinacion === selectedCoord);
  }, [selectedCoord, data.allSalesDetails]);

  // Formatear fecha para mostrar
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Modal de detalle por coordinación
  const DetailModal = () => (
    <AnimatePresence>
      {isDetailModalOpen && selectedCoord && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700"
          >
            {/* Header del modal */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500 text-white">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Ventas de {selectedCoord}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {filteredSales.length} certificados · {formatMoney(filteredSales.reduce((sum, s) => sum + s.monto, 0))} total
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </motion.button>
              </div>
            </div>

            {/* DataGrid de ventas */}
            <div className="flex-1 overflow-auto p-4">
              {filteredSales.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-tl-lg">
                          # Paquete
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                          Ejecutivo
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                          Cliente
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                          Fecha
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                          Status
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-tr-lg">
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.map((sale, index) => (
                        <motion.tr
                          key={sale.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                              {sale.numeroPaquete}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                {sale.ejecutivo.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-gray-700 dark:text-gray-300 text-xs font-medium truncate max-w-[120px]" title={sale.ejecutivo}>
                                {sale.ejecutivo}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs truncate max-w-[150px]" title={sale.cliente || '-'}>
                            {sale.cliente || '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs">
                            {formatDate(sale.fecha)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              sale.statusCRM.toLowerCase().includes('activo') 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : sale.statusCRM.toLowerCase().includes('inactivo')
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {sale.statusCRM.replace(' PQNC', '')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {formatMoney(sale.monto)}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Package className="w-12 h-12 mb-3 opacity-50" />
                  <p>No hay ventas registradas para esta coordinación</p>
                </div>
              )}
            </div>

            {/* Footer con resumen */}
            {filteredSales.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex justify-between items-center">
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xs text-gray-500">Total Certificados</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{filteredSales.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Monto Total</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(filteredSales.reduce((sum, s) => sum + s.monto, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Ticket Promedio</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatMoney(filteredSales.reduce((sum, s) => sum + s.monto, 0) / filteredSales.length)}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cerrar
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Función para renderizar contenido con isExpandedView
  const renderWidgetContent = (isExpandedView: boolean) => (
    <div className={isExpandedView ? 'space-y-6' : 'space-y-3'}>
        {/* Cards principales */}
        <div className={`grid ${isExpandedView ? 'grid-cols-3 gap-4' : 'grid-cols-3 gap-2'}`}>
          {cards.map(card => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`${isExpandedView ? 'p-4' : 'p-3'} rounded-xl bg-gradient-to-br ${card.bgGradient} border border-gray-100 dark:border-gray-700/50`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${card.gradient} text-white`}>
                  {card.icon}
                </div>
                <span className={`text-gray-600 dark:text-gray-400 ${isExpandedView ? 'text-sm' : 'text-xs'} font-medium`}>
                  {card.label}
                </span>
              </div>
              {/* Número de certificados como métrica principal */}
              <p className={`font-bold text-gray-900 dark:text-white ${isExpandedView ? 'text-3xl' : 'text-xl'}`}>
                {card.certificados}
              </p>
              <p className={`text-gray-500 ${isExpandedView ? 'text-sm' : 'text-xs'}`}>
                certificados
              </p>
              {isExpandedView && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600/50 space-y-1">
                  <p className="text-xs text-gray-500 flex justify-between">
                    <span>Monto total:</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{formatMoney(card.monto)}</span>
                  </p>
                  <p className="text-xs text-gray-500 flex justify-between">
                    <span>Clientes:</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{card.clientes}</span>
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Resumen total - solo en vista compacta */}
        {!isExpandedView && (
          <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-100 dark:border-purple-800/30">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{totalCertificados}</span>
              <span className="text-xs text-gray-500 ml-1">· {formatMoney(totalMonto)}</span>
            </div>
          </div>
        )}

        {/* Vista expandida: más gráficas */}
        {isExpandedView && (
          <div className="grid grid-cols-2 gap-6">
            {/* Timeline de ventas */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Evolución {getTimelineLabel()}
              </h4>
              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="colorCerts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="period" 
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'certificados' ? value : `$${(value * 1000).toLocaleString()}`,
                        name === 'certificados' ? 'Certificados' : 'Monto'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="certificados" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      fill="url(#colorCerts)"
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                  Sin datos de timeline
                </div>
              )}
            </div>

            {/* Distribución por coordinación - CLICKEABLE */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                Por Coordinación
                <span className="text-xs text-gray-400 font-normal ml-2">(clic para ver detalle)</span>
              </h4>
              {coordData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={coordData} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      width={80}
                    />
                    <Tooltip 
                      formatter={(value: number) => [value, 'Certificados']}
                      cursor={{ fill: 'rgba(16, 185, 129, 0.15)' }}
                    />
                    <Bar 
                      dataKey="certificados" 
                      radius={[0, 4, 4, 0]}
                      animationDuration={2000}
                      style={{ cursor: 'pointer' }}
                      onClick={(barData: any) => {
                        if (barData && barData.name) {
                          setSelectedCoord(barData.name);
                          setIsDetailModalOpen(true);
                        }
                      }}
                    >
                      {coordData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill="#10B981"
                          style={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                  Sin datos por coordinación
                </div>
              )}
            </div>

            {/* Resumen total expandido */}
            <div className="col-span-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-5 text-white">
              <div className="grid grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{totalCertificados}</p>
                  <p className="text-purple-200 text-sm">Certificados Vendidos</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{formatMoney(totalMonto)}</p>
                  <p className="text-purple-200 text-sm">Monto Total</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{totalClientes}</p>
                  <p className="text-purple-200 text-sm">Clientes Únicos</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {totalCertificados > 0 ? formatMoney(totalMonto / totalCertificados) : '$0'}
                  </p>
                  <p className="text-purple-200 text-sm">Ticket Promedio</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );

  return (
    <>
      <ExpandableWidget
        title="Ventas de Certificados"
        subtitle={`${totalCertificados} certificados vendidos · ${totalClientes} clientes`}
        icon={<Award className="w-5 h-5" />}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        isLoading={isLoading}
        renderContent={renderWidgetContent}
      />
      <DetailModal />
    </>
  );
};

// ============================================
// COMPONENTE PRINCIPAL DEL DASHBOARD
// ============================================

const DashboardModule: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin } = useEffectivePermissions();
  
  // Estado de acceso - verificación asíncrona para coordinadores de CALIDAD
  // ACCESO PERMITIDO SOLO: admin o coordinador de la coordinación de CALIDAD
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isCoordinadorCalidad, setIsCoordinadorCalidad] = useState(false);
  
  // Clave para localStorage
  const STORAGE_KEY = 'pqnc_dashboard_filters';
  
  // Coordinaciones por defecto (códigos)
  const DEFAULT_COORD_CODES = ['VEN', 'I360', 'COBACA', 'MVP'];
  
  // Cargar filtros desde localStorage o usar valores por defecto
  const getInitialFilters = (): DashboardFilters => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validar estructura
        if (parsed.period && parsed.coordinaciones) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error loading dashboard filters from cache:', e);
    }
    // Valor por defecto: 1 año, sin coordinaciones seleccionadas inicialmente
    // Se seleccionarán las coordinaciones después de cargarlas
    return { period: 'year', coordinaciones: 'pending_default' as any };
  };
  
  const [filters, setFilters] = useState<DashboardFilters>(getInitialFilters);
  const [coordinaciones, setCoordinaciones] = useState<Coordinacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  
  // Guardar filtros en localStorage cuando cambien
  useEffect(() => {
    if (filters.coordinaciones !== 'pending_default') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      } catch (e) {
        console.warn('Error saving dashboard filters to cache:', e);
      }
    }
  }, [filters]);
  
  // Datos
  const [callStatusData, setCallStatusData] = useState<CallStatusData[]>([]);
  const [callStatusByCoord, setCallStatusByCoord] = useState<{
    coordId: string;
    coordName: string;
    coordColor: string;
    noContestadas: number;
    atendidas: number;
    transferidas: number;
    total: number;
  }[]>([]);
  const [totalCalls, setTotalCalls] = useState(0);
  const [communicationMetrics, setCommunicationMetrics] = useState<CommunicationMetrics>({
    avgCallDuration: 0, avgMessagesPerProspect: 0, totalCalls: 0, totalMessages: 0, totalProspects: 0, transferRate: 0, responseRate: 0, monthlyData: []
  });
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [trackingStagesData, setTrackingStagesData] = useState<PipelineStage[]>([]);
  const [funnelCoordData, setFunnelCoordData] = useState<FunnelCoordData[]>([]);
  const [assignmentByCoord, setAssignmentByCoord] = useState<CoordAssignment[]>([]);
  const [totalProspectsReal, setTotalProspectsReal] = useState(0);
  const [crmSalesData, setCrmSalesData] = useState<CRMSalesData>({
    activosPQNC: { count: 0, monto: 0, certificados: 0, reservaciones: 0, paquetes: [] },
    inactivosPQNC: { count: 0, monto: 0, certificados: 0, reservaciones: 0, paquetes: [] },
    enProceso: { count: 0, monto: 0, certificados: 0, reservaciones: 0, paquetes: [] },
    otros: { count: 0, monto: 0, certificados: 0, reservaciones: 0, paquetes: [] },
    total: { count: 0, monto: 0, certificados: 0, reservaciones: 0, paquetes: [] },
    byCoordinacion: {},
    byPeriod: [],
    allSalesDetails: []
  });

  // Verificar permisos de acceso al Dashboard
  // SOLO: admin o coordinador de la coordinación de CALIDAD
  // NINGÚN otro rol tiene acceso (ni admin operativo, ni coordinadores de otras coordinaciones)
  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.id) {
        setHasAccess(false);
        setIsCheckingAccess(false);
        return;
      }

      setIsCheckingAccess(true);

      try {
        // Solo Admin tiene acceso automático
        if (isAdmin) {
          setHasAccess(true);
          setIsCheckingAccess(false);
          return;
        }

        // Verificar si es Coordinador de la coordinación de CALIDAD
        const esCoordCalidad = await permissionsService.isCoordinadorCalidad(user.id);
        setIsCoordinadorCalidad(esCoordCalidad);
        setHasAccess(esCoordCalidad);
      } catch (error) {
        console.error('Error verificando acceso al Dashboard:', error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [user?.id, isAdmin]);

  const isGlobalView = filters.coordinaciones === 'global' || filters.coordinaciones === 'pending_default';

  const getStartDate = useCallback((period: TimePeriod): Date => {
    const now = new Date();
    switch (period) {
      case 'year': return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      case '6months': return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      case 'month': return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      case 'week': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '24hours': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      default: return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }
  }, []);

  // Obtener los IDs de coordinación seleccionados (para filtrar por coordinacion_id)
  const getSelectedCoordinacionIds = useCallback((): string[] | null => {
    if (filters.coordinaciones === 'global' || filters.coordinaciones === 'pending_default') return null;
    return filters.coordinaciones as string[];
  }, [filters.coordinaciones]);

  useEffect(() => {
    const loadCoords = async () => {
      try {
        const data = await coordinacionService.getCoordinaciones();
        setCoordinaciones(data);
        
        // Aplicar coordinaciones por defecto si es la primera vez
        if (filters.coordinaciones === 'pending_default' && !defaultsApplied) {
          // Buscar IDs de las coordinaciones por defecto
          const defaultCoordIds = data
            .filter(c => DEFAULT_COORD_CODES.includes(c.codigo?.toUpperCase() || ''))
            .map(c => c.id);
          
          if (defaultCoordIds.length > 0) {
            setFilters(prev => ({
              ...prev,
              coordinaciones: defaultCoordIds
            }));
          } else {
            // Si no se encuentran, usar global
            setFilters(prev => ({
              ...prev,
              coordinaciones: 'global'
            }));
          }
          setDefaultsApplied(true);
        }
      } catch (error) {
        console.error('Error loading coordinaciones:', error);
      }
    };
    if (hasAccess) loadCoords();
  }, [hasAccess, filters.coordinaciones, defaultsApplied]);

  // Cargar estados de llamadas
  const loadCallStatusData = useCallback(async () => {
    try {
      const startDate = getStartDate(filters.period);
      const coordIds = getSelectedCoordinacionIds();
      
      let query = analysisSupabase
        .from('llamadas_ventas')
        .select('call_id, call_status, duracion_segundos, audio_ruta_bucket, datos_llamada, fecha_llamada, prospecto, coordinacion_id')
        .gte('fecha_llamada', startDate.toISOString())
        .range(0, 9999); // Evitar límite de 1000 de Supabase

      // Filtrar por coordinacion_id directamente en llamadas_ventas
      if (coordIds && coordIds.length > 0) {
        query = query.in('coordinacion_id', coordIds);
      }

      const { data: llamadas, error } = await query;
      if (error) throw error;

      // Conteos globales
      const statusCounts: Record<CallStatusGranular, number> = {
        activa: 0, transferida: 0, atendida: 0, no_contestada: 0, buzon: 0, perdida: 0
      };

      // Conteos por coordinación
      const coordStatusCounts: Record<string, {
        noContestadas: number;
        atendidas: number;
        transferidas: number;
        total: number;
      }> = {};

      (llamadas || []).forEach(llamada => {
        const status = classifyCallStatus({
          call_id: llamada.call_id,
          call_status: llamada.call_status,
          fecha_llamada: llamada.fecha_llamada,
          duracion_segundos: llamada.duracion_segundos,
          audio_ruta_bucket: llamada.audio_ruta_bucket,
          datos_llamada: llamada.datos_llamada
        });
        statusCounts[status]++;

        // Agrupar por coordinación
        const coordId = llamada.coordinacion_id || 'sin_coord';
        if (!coordStatusCounts[coordId]) {
          coordStatusCounts[coordId] = { noContestadas: 0, atendidas: 0, transferidas: 0, total: 0 };
        }
        coordStatusCounts[coordId].total++;
        
        if (['no_contestada', 'buzon', 'perdida'].includes(status)) {
          coordStatusCounts[coordId].noContestadas++;
        } else if (status === 'atendida') {
          coordStatusCounts[coordId].atendidas++;
        } else if (status === 'transferida') {
          coordStatusCounts[coordId].transferidas++;
        }
      });

      const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
      setTotalCalls(total);

      const statusData: CallStatusData[] = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        label: STATUS_CONFIG[status]?.label || status,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        color: STATUS_CONFIG[status]?.color || '#6B7280'
      }));

      setCallStatusData(statusData);

      // Preparar datos por coordinación para gráfica comparativa
      if (coordIds && coordIds.length > 0) {
        const coordData = coordIds.map(coordId => {
          const coord = coordinaciones.find(c => c.id === coordId);
          const counts = coordStatusCounts[coordId] || { noContestadas: 0, atendidas: 0, transferidas: 0, total: 0 };
          return {
            coordId,
            coordName: coord?.codigo || coord?.nombre || 'N/A',
            coordColor: COORD_COLORS[(coord?.codigo || '').toUpperCase()] || '#6B7280',
            ...counts
          };
        }).filter(c => c.total > 0);
        
        setCallStatusByCoord(coordData);
      } else {
        setCallStatusByCoord([]);
      }
    } catch (error) {
      console.error('Error loading call status:', error);
    }
  }, [filters, getStartDate, getSelectedCoordinacionIds, coordinaciones]);

  // Cargar métricas de comunicación
  const loadCommunicationMetrics = useCallback(async () => {
    try {
      const startDate = getStartDate(filters.period);
      const coordIds = getSelectedCoordinacionIds();
      
      // Usar paginación para obtener TODAS las llamadas (sin límite de 1000)
      let allCalls: { 
        call_id: string;
        call_status: string;
        duracion_segundos: number; 
        audio_ruta_bucket: string;
        prospecto: string; 
        datos_llamada: any; 
        coordinacion_id: string; 
        fecha_llamada: string 
      }[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMoreCalls = true;

      while (hasMoreCalls) {
        let callsQuery = analysisSupabase
          .from('llamadas_ventas')
          .select('call_id, call_status, duracion_segundos, audio_ruta_bucket, prospecto, datos_llamada, coordinacion_id, fecha_llamada')
          .gte('fecha_llamada', startDate.toISOString())
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (coordIds && coordIds.length > 0) {
          callsQuery = callsQuery.in('coordinacion_id', coordIds);
        }

        const { data: pageData, error } = await callsQuery;
        if (error) throw error;

        if (pageData && pageData.length > 0) {
          allCalls = [...allCalls, ...pageData];
          page++;
          hasMoreCalls = pageData.length === pageSize;
        } else {
          hasMoreCalls = false;
        }
      }

      const calls = allCalls;
      const prospectosUnicos = [...new Set(calls.map(c => c.prospecto).filter(Boolean))];

      // Usar paginación para obtener TODOS los mensajes (sin límite)
      let allMessages: { id: string; prospecto_id: string; fecha_hora: string }[] = [];
      page = 0;
      let hasMoreMessages = true;

      while (hasMoreMessages) {
        let messagesQuery = analysisSupabase
          .from('mensajes_whatsapp')
          .select('id, prospecto_id, fecha_hora')
          .gte('fecha_hora', startDate.toISOString())
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (coordIds && coordIds.length > 0 && prospectosUnicos.length > 0) {
          // Filtrar por prospectos en lotes para evitar URL muy larga
          const prospectBatch = prospectosUnicos.slice(0, 200);
          messagesQuery = messagesQuery.in('prospecto_id', prospectBatch);
        }

        const { data: pageData, error } = await messagesQuery;
        if (error) throw error;

        if (pageData && pageData.length > 0) {
          allMessages = [...allMessages, ...pageData];
          page++;
          hasMoreMessages = pageData.length === pageSize;
        } else {
          hasMoreMessages = false;
        }
      }

      const messages = allMessages;

      // Métricas globales
      // Usar el clasificador oficial para determinar el estado de cada llamada
      const getCallStatus = (c: typeof calls[0]) => {
        return classifyCallStatus({
          call_id: c.call_id,
          call_status: c.call_status,
          fecha_llamada: c.fecha_llamada,
          duracion_segundos: c.duracion_segundos,
          audio_ruta_bucket: c.audio_ruta_bucket,
          datos_llamada: c.datos_llamada
        });
      };

      // Clasificar todas las llamadas
      const callsWithStatus = calls.map(c => ({
        ...c,
        statusClasificado: getCallStatus(c)
      }));

      // Llamadas contestadas = duración > 0 (para tasa de respuesta)
      const contestadas = callsWithStatus.filter(c => (c.duracion_segundos || 0) > 0);
      
      // Para el tiempo promedio: SOLO atendidas y transferidas (excluir buzón, no contestadas, perdidas)
      const llamadasConConversacion = callsWithStatus.filter(c => 
        c.statusClasificado === 'atendida' || c.statusClasificado === 'transferida'
      );
      
      const totalDuration = llamadasConConversacion.reduce((sum, c) => sum + (c.duracion_segundos || 0), 0);
      const avgDuration = llamadasConConversacion.length > 0 ? totalDuration / llamadasConConversacion.length : 0;

      const transferidas = callsWithStatus.filter(c => c.statusClasificado === 'transferida').length;

      const prospectsWithMessages = new Set(messages.map(m => m.prospecto_id));
      const avgMessages = prospectsWithMessages.size > 0 ? messages.length / prospectsWithMessages.size : 0;
      const transferRate = calls.length > 0 ? (transferidas / calls.length) * 100 : 0;
      const responseRate = calls.length > 0 ? (contestadas.length / calls.length) * 100 : 0;

      // Calcular datos históricos según el período seleccionado
      // - Año/6 meses → por mes
      // - Mes → por semana
      // - Semana → por día
      // - 24 horas → por hora
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      
      // Función para obtener la clave de agrupación según el período
      const getGroupKey = (date: Date): string => {
        switch (filters.period) {
          case '24hours':
            // Por hora: "14:00"
            return `${date.getHours().toString().padStart(2, '0')}:00`;
          case 'week':
            // Por día: "Lun 23"
            return `${dayNames[date.getDay()]} ${date.getDate()}`;
          case 'month':
            // Por semana: "Sem 1", "Sem 2", etc.
            const weekNum = Math.ceil(date.getDate() / 7);
            return `Semana ${weekNum}`;
          case '6months':
          case 'year':
          default:
            // Por mes: "Ene 2025"
            return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        }
      };

      // Función para ordenar las claves según el período
      const sortGroupKeys = (keys: string[]): string[] => {
        switch (filters.period) {
          case '24hours':
            // Ordenar por hora
            return keys.sort((a, b) => parseInt(a) - parseInt(b));
          case 'week':
            // Ordenar por fecha
            return keys.sort((a, b) => {
              const dayA = parseInt(a.split(' ')[1]);
              const dayB = parseInt(b.split(' ')[1]);
              return dayA - dayB;
            });
          case 'month':
            // Ordenar por número de semana
            return keys.sort((a, b) => {
              const weekA = parseInt(a.replace('Semana ', ''));
              const weekB = parseInt(b.replace('Semana ', ''));
              return weekA - weekB;
            });
          default:
            // Ordenar por mes/año
            return keys.sort((a, b) => {
              const [monthA, yearA] = a.split(' ');
              const [monthB, yearB] = b.split(' ');
              const dateA = new Date(parseInt(yearA), monthNames.indexOf(monthA));
              const dateB = new Date(parseInt(yearB), monthNames.indexOf(monthB));
              return dateA.getTime() - dateB.getTime();
            });
        }
      };

      const periodDataMap: Record<string, {
        calls: typeof calls;
        messages: typeof messages;
      }> = {};

      // Agrupar llamadas según período
      calls.forEach(call => {
        const date = new Date(call.fecha_llamada);
        const key = getGroupKey(date);
        if (!periodDataMap[key]) {
          periodDataMap[key] = { calls: [], messages: [] };
        }
        periodDataMap[key].calls.push(call);
      });

      // Agrupar mensajes según período
      messages.forEach(msg => {
        const date = new Date(msg.fecha_hora);
        const key = getGroupKey(date);
        if (!periodDataMap[key]) {
          periodDataMap[key] = { calls: [], messages: [] };
        }
        periodDataMap[key].messages.push(msg);
      });

      // Generar todas las claves del período (incluso vacías) para gráfica completa
      const generateAllPeriodKeys = (): string[] => {
        const now = new Date();
        const keys: string[] = [];
        
        switch (filters.period) {
          case '24hours':
            // Generar las últimas 24 horas
            for (let i = 23; i >= 0; i--) {
              const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
              keys.push(`${hour.getHours().toString().padStart(2, '0')}:00`);
            }
            break;
          case 'week':
            // Generar los últimos 7 días
            for (let i = 6; i >= 0; i--) {
              const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
              keys.push(`${dayNames[day.getDay()]} ${day.getDate()}`);
            }
            break;
          case 'month':
            // Generar las 4-5 semanas del mes
            for (let i = 1; i <= 5; i++) {
              keys.push(`Semana ${i}`);
            }
            break;
          default:
            // Para año/6 meses, usar las claves que ya tenemos
            return sortGroupKeys(Object.keys(periodDataMap));
        }
        return keys;
      };

      const allKeys = generateAllPeriodKeys();

      // Calcular métricas para cada período
      const monthlyData = allKeys.map(periodKey => {
        const data = periodDataMap[periodKey] || { calls: [], messages: [] };
        const mCalls = data.calls;
        const mMessages = data.messages;
        
        // Clasificar llamadas del período usando el clasificador oficial
        const mCallsWithStatus = mCalls.map(c => ({
          ...c,
          statusClasificado: getCallStatus(c)
        }));
        
        // Solo atendidas y transferidas para el tiempo promedio
        const mConversaciones = mCallsWithStatus.filter(c => 
          c.statusClasificado === 'atendida' || c.statusClasificado === 'transferida'
        );
        const mTotalDuration = mConversaciones.reduce((sum, c) => sum + (c.duracion_segundos || 0), 0);
        const mAvgDuration = mConversaciones.length > 0 ? mTotalDuration / mConversaciones.length : 0;
        
        const mTransferidas = mCallsWithStatus.filter(c => c.statusClasificado === 'transferida').length;
        
        // Contestadas = duración > 0 (para tasa de respuesta)
        const mContestadas = mCalls.filter(c => (c.duracion_segundos || 0) > 0);
        
        const mProspectsWithMessages = new Set(mMessages.map(m => m.prospecto_id));
        const mAvgMessages = mProspectsWithMessages.size > 0 ? mMessages.length / mProspectsWithMessages.size : 0;
        const mTransferRate = mCalls.length > 0 ? (mTransferidas / mCalls.length) * 100 : 0;
        const mResponseRate = mCalls.length > 0 ? (mContestadas.length / mCalls.length) * 100 : 0;

        return {
          month: periodKey,
          avgCallDuration: mAvgDuration,
          avgMessagesPerProspect: mAvgMessages,
          totalCalls: mConversaciones.length, // Solo atendidas y transferidas
          totalMessages: mMessages.length,
          transferRate: mTransferRate,
          responseRate: mResponseRate
        };
      });

      setCommunicationMetrics({
        avgCallDuration: avgDuration,
        avgMessagesPerProspect: avgMessages,
        totalCalls: contestadas.length,
        totalMessages: messages.length,
        totalProspects: prospectsWithMessages.size,
        transferRate,
        responseRate,
        monthlyData
      });
    } catch (error) {
      console.error('Error loading communication metrics:', error);
    }
  }, [filters, getStartDate, getSelectedCoordinacionIds]);

  // Cargar pipeline de prospectos (funnel de conversión + etapas de seguimiento)
  const loadPipelineData = useCallback(async () => {
    try {
      const coordIds = getSelectedCoordinacionIds();
      const startDate = getStartDate(filters.period); // Aplicar filtro de tiempo
      
      // Función para clasificar etapas según el flujo de conversión
      // Flujo: Validando → En Seguimiento → Interesado → Atendió → Ejecutivo → Certificado
      const classifyEtapa = (etapa: string): { category: 'conversion' | 'out_of_funnel'; name: string } => {
        const e = (etapa || '').toLowerCase().trim();
        
        // Etapas de CONVERSIÓN (flujo principal - 6 etapas)
        if (e.includes('validando')) return { category: 'conversion', name: 'Validando Membresía' };
        if (e.includes('seguimiento')) return { category: 'conversion', name: 'En Seguimiento' };
        if (e.includes('interesado') || e.includes('interesada')) return { category: 'conversion', name: 'Interesado' };
        if (e.includes('atendi')) return { category: 'conversion', name: 'Atendió Llamada' };
        if (e.includes('ejecutiv')) return { category: 'conversion', name: 'Con Ejecutivo' };
        if (e.includes('certificado')) return { category: 'conversion', name: 'Certificado Adquirido' };
        
        // Etapas FUERA DEL FUNNEL (descartados pero cuentan para el total)
        if (e.includes('activo pqnc') || e === 'activo pqnc') return { category: 'out_of_funnel', name: 'Activo PQNC' };
        if (e.includes('miembro')) return { category: 'out_of_funnel', name: 'Es Miembro' };
        
        // Por defecto, va a Validando (entrada del funnel)
        return { category: 'conversion', name: 'Validando Membresía' };
      };

      // Cargar prospectos - con filtro de coordinación y tiempo
      // Usar paginación para evitar límite de 1000 de Supabase
      let allProspectos: { id: string; etapa: string; coordinacion_id: string; created_at: string }[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        let query = analysisSupabase
          .from('prospectos')
          .select('id, etapa, coordinacion_id, created_at')
          .gte('created_at', startDate.toISOString()) // Filtro de tiempo
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (coordIds && coordIds.length > 0) {
          query = query.in('coordinacion_id', coordIds);
        }

        const { data: pageData, error: pageError } = await query;
        if (pageError) throw pageError;

        if (pageData && pageData.length > 0) {
          allProspectos = [...allProspectos, ...pageData];
          page++;
          hasMore = pageData.length === pageSize; // Si devolvió menos de pageSize, no hay más
        } else {
          hasMore = false;
        }
      }

      const filteredProspectos = allProspectos;

      // Procesar conteos por etapa - SEPARANDO conversión y fuera del funnel
      const conversionCounts: Record<string, number> = {};
      const outOfFunnelCounts: Record<string, number> = {};
      
      FUNNEL_CONVERSION_STAGES.forEach(s => { conversionCounts[s.name] = 0; });
      OUT_OF_FUNNEL_STAGES.forEach(s => { outOfFunnelCounts[s.name] = 0; });

      filteredProspectos.forEach(p => {
        const { category, name } = classifyEtapa(p.etapa);
        if (category === 'conversion' && conversionCounts[name] !== undefined) {
          conversionCounts[name]++;
        } else if (category === 'out_of_funnel' && outOfFunnelCounts[name] !== undefined) {
          outOfFunnelCounts[name]++;
        }
      });

      // ⭐ TOTAL = TODOS los prospectos (conversión + fuera del funnel)
      // Esto incluye Activo PQNC, Es Miembro, En Seguimiento
      const conversionTotal = Object.values(conversionCounts).reduce((sum, c) => sum + c, 0);
      const outOfFunnelTotal = Object.values(outOfFunnelCounts).reduce((sum, c) => sum + c, 0);
      const grandTotal = conversionTotal + outOfFunnelTotal;
      
      // Guardar el total real de prospectos
      setTotalProspectsReal(grandTotal);

      // Crear etapas de conversión para el funnel
      // IMPORTANTE: Cada etapa muestra el ACUMULADO (esa etapa + todas las siguientes)
      // Esto representa cuántos "llegaron" a cada punto del funnel
      
      // Primero calculamos los acumulados de atrás hacia adelante
      const stageNames = FUNNEL_CONVERSION_STAGES.map(s => s.name);
      const rawCounts = stageNames.map(name => conversionCounts[name] || 0);
      
      // Calcular acumulados: cada etapa = su count + suma de todas las siguientes
      const cumulativeCounts: number[] = [];
      let cumSum = 0;
      for (let i = rawCounts.length - 1; i >= 0; i--) {
        cumSum += rawCounts[i];
        cumulativeCounts[i] = cumSum;
      }
      
      const conversionStages: PipelineStage[] = FUNNEL_CONVERSION_STAGES.map((stage, idx) => {
        const count = cumulativeCounts[idx]; // Valor acumulado
        const prevCount = idx > 0 ? cumulativeCounts[idx - 1] : count;
        const conversionFromPrevious = prevCount > 0 && idx > 0 ? (count / prevCount) * 100 : undefined;

        return {
          name: stage.name,
          shortName: stage.shortName,
          count,
          percentage: grandTotal > 0 ? (count / grandTotal) * 100 : 0, // % del total global
          fill: '#3B82F6',
          conversionFromPrevious
        };
      });

      // Crear etapas fuera del funnel (para mostrar aparte)
      const outOfFunnelStages: PipelineStage[] = OUT_OF_FUNNEL_STAGES.map(stage => ({
        name: stage.name,
        shortName: stage.shortName,
        count: outOfFunnelCounts[stage.name],
        percentage: grandTotal > 0 ? (outOfFunnelCounts[stage.name] / grandTotal) * 100 : 0, // % del total global
        fill: '#6B7280'
      }));

      setPipelineStages(conversionStages);
      setTrackingStagesData(outOfFunnelStages);

      // Calcular asignación total por coordinación (para la vista expandida)
      // Excluir: CALIDAD, BOOM, Sin Coordinación
      const EXCLUDED_COORDS = ['CALIDAD', 'BOOM', 'N/A'];
      
      const coordAssignmentMap: Record<string, number> = {};
      filteredProspectos.forEach(p => {
        if (p.coordinacion_id) { // Solo prospectos con coordinación asignada
          coordAssignmentMap[p.coordinacion_id] = (coordAssignmentMap[p.coordinacion_id] || 0) + 1;
        }
      });

      const assignments: CoordAssignment[] = Object.entries(coordAssignmentMap)
        .map(([coordId, count]) => {
          const coord = coordinaciones.find(c => c.id === coordId);
          return {
            coordName: coord?.nombre || 'Desconocida',
            coordCode: coord?.codigo || 'N/A',
            count,
            color: COORD_COLORS[coord?.codigo?.toUpperCase() || ''] || '#6B7280'
          };
        })
        .filter(a => !EXCLUDED_COORDS.includes(a.coordCode.toUpperCase())) // Filtrar excluidas
        .sort((a, b) => b.count - a.count); // Ordenar por cantidad descendente

      setAssignmentByCoord(assignments);

      // Si no es vista global, preparar datos por coordinación para el funnel
      if (!isGlobalView && coordIds && coordIds.length > 0) {
        const coordDataMap: Record<string, FunnelCoordData> = {};
        
        for (const coordId of coordIds) {
          const coord = coordinaciones.find(c => c.id === coordId);
          if (!coord) continue;

          // Filtrar prospectos de esta coordinación
          const prospectosCoord = filteredProspectos.filter(p => p.coordinacion_id === coordId);

          // Solo etapas de conversión para el funnel comparativo
          // Calcular counts raw por etapa
          const rawCoordCounts = FUNNEL_CONVERSION_STAGES.map(s => {
            return prospectosCoord.filter(p => {
              const { category, name } = classifyEtapa(p.etapa);
              return category === 'conversion' && name === s.name;
            }).length;
          });
          
          // Calcular acumulados (cada etapa = su count + siguientes)
          const cumulativeCoordCounts: number[] = [];
          let coordCumSum = 0;
          for (let i = rawCoordCounts.length - 1; i >= 0; i--) {
            coordCumSum += rawCoordCounts[i];
            cumulativeCoordCounts[i] = coordCumSum;
          }
          
          const coordStages = FUNNEL_CONVERSION_STAGES.map((s, idx) => ({
            stage: s.name,
            count: cumulativeCoordCounts[idx]
          }));

          coordDataMap[coordId] = {
            coordinacionId: coordId,
            coordinacionNombre: coord.codigo || coord.nombre,
            color: COORD_COLORS[coord.codigo?.toUpperCase()] || '#6B7280',
            stages: coordStages
          };
        }

        setFunnelCoordData(Object.values(coordDataMap));
      } else {
        setFunnelCoordData([]);
      }

    } catch (error) {
      console.error('Error loading pipeline:', error);
    }
  }, [filters, isGlobalView, coordinaciones, getSelectedCoordinacionIds, getStartDate]);

  // Cargar ventas CRM - CORREGIDO: Usando tabla crm_data con transactions
  const loadCRMData = useCallback(async () => {
    try {
      // Fecha de inicio: 27 de noviembre de 2025 (lanzamiento del canal)
      const CRM_START_DATE = '2025-11-27T00:00:00Z';
      
      // Consultar crm_data donde transactions no sea null ni vacío
      const { data: crmRecords, error } = await analysisSupabase
        .from('crm_data')
        .select('status_crm, transactions, coordinacion, created_at, propietario, nombre')
        .not('transactions', 'is', null)
        .gte('created_at', CRM_START_DATE)
        .range(0, 9999);

      if (error) throw error;

      const createEmptyCategory = (): CRMCategoryData => ({
        count: 0,
        certificados: 0,
        monto: 0,
        reservaciones: 0,
        paquetes: []
      });

      let activosPQNC = createEmptyCategory();
      let inactivosPQNC = createEmptyCategory();
      let enProceso = createEmptyCategory();
      let otros = createEmptyCategory();
      const byCoordinacion: Record<string, { count: number; certificados: number; monto: number }> = {};
      const periodData: Record<string, { count: number; monto: number }> = {};
      const allSalesDetails: SaleDetail[] = [];
      
      // Helper para agrupar según el periodo seleccionado
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const monthNamesFull = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      const getPeriodKey = (date: Date): string => {
        switch (filters.period) {
          case '24hours':
            return `${date.getHours().toString().padStart(2, '0')}:00`;
          case 'week':
            return `${dayNames[date.getDay()]} ${date.getDate()}`;
          case 'month':
            const weekNum = Math.ceil(date.getDate() / 7);
            return `Sem ${weekNum}`;
          case '6months':
          case 'year':
          default:
            return `${monthNamesFull[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
        }
      };
      
      const sortPeriodKeys = (keys: string[]): string[] => {
        switch (filters.period) {
          case '24hours':
            return keys.sort((a, b) => parseInt(a) - parseInt(b));
          case 'week':
            return keys.sort((a, b) => {
              const dayA = parseInt(a.split(' ')[1]);
              const dayB = parseInt(b.split(' ')[1]);
              return dayA - dayB;
            });
          case 'month':
            return keys.sort((a, b) => parseInt(a.replace('Sem ', '')) - parseInt(b.replace('Sem ', '')));
          default:
            return keys.sort((a, b) => {
              const [monthA, yearA] = a.split(' ');
              const [monthB, yearB] = b.split(' ');
              const idxA = monthNamesFull.indexOf(monthA);
              const idxB = monthNamesFull.indexOf(monthB);
              const dateA = new Date(2000 + parseInt(yearA), idxA);
              const dateB = new Date(2000 + parseInt(yearB), idxB);
              return dateA.getTime() - dateB.getTime();
            });
        }
      };

      (crmRecords || []).forEach(record => {
        // Parsear transactions - estructura: [{ paquetes_vacacionales: [...], reservaciones: [...], total_paquetes, total_reservaciones }]
        let transactions: any[] = [];
        try {
          if (typeof record.transactions === 'string') {
            const parsed = JSON.parse(record.transactions);
            transactions = Array.isArray(parsed) ? parsed : [parsed];
          } else if (Array.isArray(record.transactions)) {
            transactions = record.transactions;
          } else if (record.transactions && typeof record.transactions === 'object') {
            transactions = [record.transactions];
          }
        } catch (e) {
          return; // Skip si no se puede parsear
        }

        // Verificar que tiene transacciones válidas con paquetes
        if (!transactions || transactions.length === 0) return;
        
        // Verificar si hay paquetes vacacionales
        let totalCertificados = 0;
        let totalMonto = 0;
        let totalReservaciones = 0;
        const paquetesDetalle: { numero: string; monto: number; fecha: string; coordinacion: string }[] = [];

        transactions.forEach((tx: any) => {
          // Contar paquetes vacacionales - solo desde 27 nov 2025
          const paquetes = tx?.paquetes_vacacionales || [];
          if (Array.isArray(paquetes)) {
            paquetes.forEach((paq: any) => {
              const fechaCreacion = paq?.FechaCreacion || '';
              // Filtrar: solo paquetes creados desde 27 nov 2025
              if (fechaCreacion && new Date(fechaCreacion) >= new Date(CRM_START_DATE)) {
                const monto = parseFloat(paq?.MontoTotal || 0);
                const coordName = record.coordinacion || 'Venta Asistida por IA';
                totalCertificados++;
                totalMonto += monto;
                paquetesDetalle.push({
                  numero: paq?.NumeroPaquete || 'N/A',
                  monto: monto,
                  fecha: fechaCreacion,
                  coordinacion: coordName
                });
                // Agregar a detalles para el modal
                allSalesDetails.push({
                  id: `${paq?.NumeroPaquete || 'N/A'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  numeroPaquete: paq?.NumeroPaquete || 'N/A',
                  monto: monto,
                  fecha: fechaCreacion,
                  coordinacion: coordName,
                  statusCRM: record.status_crm || 'N/A',
                  ejecutivo: record.propietario || 'Sin asignar',
                  cliente: record.nombre || undefined
                });
              }
            });
          }
          
          // Contar reservaciones
          const reservas = tx?.reservaciones || [];
          if (Array.isArray(reservas)) {
            totalReservaciones += reservas.length;
          }
        });

        // Skip si no hay certificados vendidos
        if (totalCertificados === 0) return;

        // Datos para acumular
        const dataToAdd = {
          count: 1,
          certificados: totalCertificados,
          monto: totalMonto,
          reservaciones: totalReservaciones,
          paquetes: paquetesDetalle
        };

        // Clasificar por status_crm
        const statusCrm = (record.status_crm || '').toLowerCase().trim();
        
        if (statusCrm.includes('activo') && statusCrm.includes('pqnc')) {
          activosPQNC.count += dataToAdd.count;
          activosPQNC.certificados += dataToAdd.certificados;
          activosPQNC.monto += dataToAdd.monto;
          activosPQNC.reservaciones += dataToAdd.reservaciones;
          activosPQNC.paquetes.push(...dataToAdd.paquetes);
        } else if (statusCrm.includes('inactivo') && statusCrm.includes('pqnc')) {
          inactivosPQNC.count += dataToAdd.count;
          inactivosPQNC.certificados += dataToAdd.certificados;
          inactivosPQNC.monto += dataToAdd.monto;
          inactivosPQNC.reservaciones += dataToAdd.reservaciones;
          inactivosPQNC.paquetes.push(...dataToAdd.paquetes);
        } else if (statusCrm.includes('proceso') || statusCrm.includes('en proceso')) {
          enProceso.count += dataToAdd.count;
          enProceso.certificados += dataToAdd.certificados;
          enProceso.monto += dataToAdd.monto;
          enProceso.reservaciones += dataToAdd.reservaciones;
          enProceso.paquetes.push(...dataToAdd.paquetes);
        } else {
          otros.count += dataToAdd.count;
          otros.certificados += dataToAdd.certificados;
          otros.monto += dataToAdd.monto;
          otros.reservaciones += dataToAdd.reservaciones;
          otros.paquetes.push(...dataToAdd.paquetes);
        }

        // Agrupar por coordinación
        const coord = record.coordinacion || 'Venta Asistida por IA';
        if (!byCoordinacion[coord]) {
          byCoordinacion[coord] = { count: 0, certificados: 0, monto: 0 };
        }
        byCoordinacion[coord].count++;
        byCoordinacion[coord].certificados += totalCertificados;
        byCoordinacion[coord].monto += totalMonto;

        // Agrupar por periodo dinámico (usando fecha del paquete)
        paquetesDetalle.forEach(paq => {
          if (paq.fecha) {
            const date = new Date(paq.fecha);
            const periodKey = getPeriodKey(date);
            if (!periodData[periodKey]) {
              periodData[periodKey] = { count: 0, monto: 0 };
            }
            periodData[periodKey].count++;
            periodData[periodKey].monto += paq.monto;
          }
        });
      });

      // Convertir periodData a array ordenado
      const sortedKeys = sortPeriodKeys(Object.keys(periodData));
      const byPeriod = sortedKeys.map(key => ({
        period: key,
        count: periodData[key].count,
        monto: periodData[key].monto
      }));

      setCrmSalesData({
        activosPQNC,
        inactivosPQNC,
        enProceso,
        otros,
        total: {
          count: activosPQNC.count + inactivosPQNC.count + enProceso.count + otros.count,
          certificados: activosPQNC.certificados + inactivosPQNC.certificados + enProceso.certificados + otros.certificados,
          monto: activosPQNC.monto + inactivosPQNC.monto + enProceso.monto + otros.monto,
          reservaciones: activosPQNC.reservaciones + inactivosPQNC.reservaciones + enProceso.reservaciones + otros.reservaciones,
          paquetes: [...activosPQNC.paquetes, ...inactivosPQNC.paquetes, ...enProceso.paquetes, ...otros.paquetes]
        },
        byCoordinacion,
        byPeriod,
        allSalesDetails: allSalesDetails.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      });
    } catch (error) {
      console.error('Error loading CRM data:', error);
    }
  }, [filters.period]);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadCallStatusData(), loadCommunicationMetrics(), loadPipelineData(), loadCRMData()]);
    } finally {
      setIsLoading(false);
    }
  }, [loadCallStatusData, loadCommunicationMetrics, loadPipelineData, loadCRMData]);

  useEffect(() => {
    if (hasAccess) loadAllData();
  }, [hasAccess, filters, loadAllData]);

  // Mostrar loading mientras se verifican permisos
  if (isCheckingAccess || hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Acceso Denegado</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Solo administradores y coordinadores de la <strong>coordinación de Calidad</strong> pueden acceder a este dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-6">
      <FilterSelector filters={filters} onFiltersChange={setFilters} coordinaciones={coordinaciones} isLoading={isLoading} />

      {/* Fila 1: Funnel de Conversión - Ancho completo, ARRIBA */}
      <div className="mb-6">
        <FunnelWidget
          funnelData={funnelCoordData}
          globalStages={pipelineStages}
          trackingStages={trackingStagesData}
          isExpanded={expandedWidget === 'pipeline'}
          onToggleExpand={() => setExpandedWidget(expandedWidget === 'pipeline' ? null : 'pipeline')}
          isLoading={isLoading}
          isGlobal={isGlobalView}
          totalProspects={totalProspectsReal}
          assignmentByCoord={assignmentByCoord}
        />
      </div>

      {/* Fila 2: Estado de Llamadas - Ancho completo */}
      <div className="mb-6">
        <CallStatusWidget
          data={callStatusData}
          coordData={callStatusByCoord}
          isExpanded={expandedWidget === 'callStatus'}
          onToggleExpand={() => setExpandedWidget(expandedWidget === 'callStatus' ? null : 'callStatus')}
          isLoading={isLoading}
          totalCalls={totalCalls}
          isComparative={!isGlobalView}
        />
      </div>

      {/* Fila 3: Métricas de Comunicación y Ventas por Origen - 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CommunicationWidget
          metrics={communicationMetrics}
          isExpanded={expandedWidget === 'communication'}
          onToggleExpand={() => setExpandedWidget(expandedWidget === 'communication' ? null : 'communication')}
          isLoading={isLoading}
        />

        <CRMSalesWidget
          data={crmSalesData}
          isExpanded={expandedWidget === 'crm'}
          onToggleExpand={() => setExpandedWidget(expandedWidget === 'crm' ? null : 'crm')}
          isLoading={isLoading}
          period={filters.period}
        />
      </div>
    </div>
  );
};

export default DashboardModule;

