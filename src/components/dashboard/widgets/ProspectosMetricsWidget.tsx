/**
 * ============================================
 * WIDGET: Métricas de Prospectos Nuevos
 * ============================================
 * 
 * Widget analítico con:
 * - Gráfico de línea de prospectos nuevos por período
 * - Selector de rango de tiempo integrado
 * - Vista expandida con métricas de BI:
 *   - Origen de prospectos (campaña, interés)
 *   - Horarios óptimos de contacto
 *   - Probabilidad de avance por hora
 *   - Distribución por destino/etapa
 * 
 * Versión: 1.0.0
 * Fecha: Enero 2025
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, AreaChart, Area, Legend
} from 'recharts';
import {
  UserPlus, Calendar, Clock, TrendingUp, Target, MapPin,
  Maximize2, X, RefreshCw, ArrowUpRight, ArrowDownRight,
  Users, Zap, Filter, Info
} from 'lucide-react';
import { analysisSupabase } from '../../../config/analysisSupabase';
import type { Coordinacion } from '../../../services/coordinacionService';

// ============================================
// TIPOS E INTERFACES
// ============================================

// Tipo del período global del Dashboard (debe coincidir con TimePeriod de DashboardModule)
export type GlobalTimePeriod = 'year' | '6months' | 'month' | 'week' | '24hours';

// Mapeo de período global a rango interno
const mapGlobalPeriodToRange = (globalPeriod: GlobalTimePeriod): { start: Date; end: Date; label: string } => {
  const end = new Date();
  const start = new Date();
  
  switch (globalPeriod) {
    case '24hours':
      start.setTime(start.getTime() - 24 * 60 * 60 * 1000);
      return { start, end, label: 'Últimas 24 horas' };
    case 'week':
      start.setDate(start.getDate() - 7);
      return { start, end, label: 'Última semana' };
    case 'month':
      start.setMonth(start.getMonth() - 1);
      return { start, end, label: 'Último mes' };
    case '6months':
      start.setMonth(start.getMonth() - 6);
      return { start, end, label: 'Últimos 6 meses' };
    case 'year':
    default:
      start.setFullYear(start.getFullYear() - 1);
      return { start, end, label: 'Último año' };
  }
};

interface ProspectDataPoint {
  date: string;
  label: string;
  count: number;
  cumulative?: number;
  advanceRate: number; // % que avanzaron de etapa en ese período
  advanced: number; // Cantidad que avanzaron
}

interface HourlyMetric {
  hour: number;
  label: string;
  count: number;
  advanceRate: number; // % que avanzan de etapa
  avgTimeToAdvance?: number; // horas promedio para avanzar
}

interface OriginMetric {
  origen: string;
  count: number;
  percentage: number;
  advanceRate: number;
  topDestino?: string;
}

interface DestinoMetric {
  destino: string;
  count: number;
  percentage: number;
  color: string;
}

interface EtapaDistribution {
  etapa: string;
  count: number;
  percentage: number;
  color: string;
}

interface ProspectosMetrics {
  total: number;
  byPeriod: ProspectDataPoint[];
  byHour: HourlyMetric[];
  byOrigin: OriginMetric[];
  byDestino: DestinoMetric[];
  byEtapa: EtapaDistribution[];
  bestHours: number[]; // Top 3 mejores horas
  growthRate: number; // % crecimiento vs período anterior
  avgDailyNew: number;
}

interface ProspectosMetricsWidgetProps {
  coordinacionIds: string[] | null;
  coordinaciones: Coordinacion[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLoading?: boolean;
  globalPeriod: GlobalTimePeriod; // Período del filtro global del Dashboard
}

// ============================================
// CONSTANTES
// ============================================

// Opciones de período para selector de vista expandida
const PERIOD_OPTIONS: { value: GlobalTimePeriod; label: string; shortLabel: string }[] = [
  { value: '24hours', label: 'Últimas 24 horas', shortLabel: '24h' },
  { value: 'week', label: 'Última semana', shortLabel: '7d' },
  { value: 'month', label: 'Último mes', shortLabel: '30d' },
  { value: '6months', label: 'Últimos 6 meses', shortLabel: '6m' },
  { value: 'year', label: 'Último año', shortLabel: '1a' },
];

const DESTINO_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

const ETAPA_COLORS: Record<string, string> = {
  'Nuevo prospecto': '#60A5FA',
  'Validando membresia': '#34D399',
  'Prospecto calificado': '#FBBF24',
  'Agendando cita': '#A78BFA',
  'En seguimiento': '#F87171',
  'Cita confirmada': '#2DD4BF',
  'Certificado': '#4ADE80',
  'default': '#9CA3AF'
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const ProspectosMetricsWidget: React.FC<ProspectosMetricsWidgetProps> = ({
  coordinacionIds,
  coordinaciones,
  isExpanded,
  onToggleExpand,
  isLoading: externalLoading = false,
  globalPeriod
}) => {
  const [metrics, setMetrics] = useState<ProspectosMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para la vista expandida
  const [expandedPeriod, setExpandedPeriod] = useState<GlobalTimePeriod>(globalPeriod);
  const [selectedEtapa, setSelectedEtapa] = useState<string>('todas');
  
  // Sincronizar período expandido cuando cambia el global
  useEffect(() => {
    if (!isExpanded) {
      setExpandedPeriod(globalPeriod);
    }
  }, [globalPeriod, isExpanded]);

  // Determinar qué período usar según si estamos expandidos o no
  const activePeriod = isExpanded ? expandedPeriod : globalPeriod;

  // Obtener etiqueta del período para mostrar en UI
  const periodInfo = useMemo(() => mapGlobalPeriodToRange(activePeriod), [activePeriod]);

  // Lista de etapas disponibles para filtrar
  const etapasDisponibles = useMemo(() => {
    if (!metrics) return ['todas'];
    const etapas = metrics.byEtapa.map(e => e.etapa).filter(e => e !== 'Sin etapa');
    return ['todas', ...etapas];
  }, [metrics]);

  // Formatear fecha para agrupación según el período
  const formatDateForGrouping = useCallback((date: Date, period: GlobalTimePeriod): string => {
    if (period === '24hours') {
      return `${date.getHours().toString().padStart(2, '0')}:00`;
    } else if (period === 'week') {
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      return `${days[date.getDay()]} ${date.getDate()}`;
    } else if (period === 'month') {
      return `${date.getDate()}/${date.getMonth() + 1}`;
    } else {
      // 6months o year - agrupar por mes
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${months[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
    }
  }, []);

  // Cargar datos
  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const { start, end } = mapGlobalPeriodToRange(activePeriod);
      
      // ============================================
      // PAGINACIÓN para evitar límite de 1000 de Supabase
      // ============================================
      const pageSize = 1000;
      let allProspectos: any[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        let query = analysisSupabase
          .from('prospectos')
          .select('id, created_at, etapa, campana_origen, interes_principal, destino_preferencia, coordinacion_id')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        // Filtrar por coordinaciones si se especifican
        if (coordinacionIds && coordinacionIds.length > 0) {
          query = query.in('coordinacion_id', coordinacionIds);
        }
        
        const { data: pageData, error } = await query;
        
        if (error) throw error;
        
        if (pageData && pageData.length > 0) {
          allProspectos = [...allProspectos, ...pageData];
          page++;
          hasMore = pageData.length === pageSize; // Si devolvió menos de pageSize, no hay más
        } else {
          hasMore = false;
        }
      }
      
      const prospectos = allProspectos;
      
      if (!prospectos || prospectos.length === 0) {
        setMetrics({
          total: 0,
          byPeriod: [],
          byHour: [],
          byOrigin: [],
          byDestino: [],
          byEtapa: [],
          bestHours: [],
          growthRate: 0,
          avgDailyNew: 0
        });
        return;
      }
      
      // Procesar datos por período
      const periodMap = new Map<string, { count: number; advanced: number }>();
      const hourCounts: Record<number, { count: number; advanced: number }> = {};
      const originCounts: Record<string, { count: number; advanced: number; destinos: Record<string, number> }> = {};
      const destinoCounts: Record<string, number> = {};
      const etapaCounts: Record<string, number> = {};
      
      // Etapas que indican "avance" por defecto (cuando se selecciona "todas")
      const defaultAdvancedEtapas = new Set([
        'Prospecto calificado', 'Agendando cita', 'Cita confirmada', 
        'Certificado', 'En seguimiento', 'Activo PQNC'
      ]);

      // Función para determinar si un prospecto "avanzó" según la etapa seleccionada
      // Si selectedEtapa === 'todas', usa las etapas de conversión por defecto
      // Si se selecciona una etapa específica, muestra % que llegaron a esa etapa
      const isProspectAdvanced = (etapa: string | null): boolean => {
        if (selectedEtapa === 'todas') {
          return defaultAdvancedEtapas.has(etapa || '');
        }
        return etapa === selectedEtapa;
      };
      
      // Procesar TODOS los prospectos (sin filtrar)
      prospectos.forEach(p => {
        const createdAt = new Date(p.created_at);
        const hour = createdAt.getHours();
        const isAdvanced = isProspectAdvanced(p.etapa);
        const isDefaultAdvanced = defaultAdvancedEtapas.has(p.etapa || '');
        
        // Agrupar por período (con conteo de avances según etapa seleccionada)
        const periodKey = formatDateForGrouping(createdAt, activePeriod);
        const current = periodMap.get(periodKey) || { count: 0, advanced: 0 };
        current.count++;
        if (isAdvanced) current.advanced++;
        periodMap.set(periodKey, current);
        
        // Contar por hora (siempre usa las etapas por defecto, no el selector)
        if (!hourCounts[hour]) {
          hourCounts[hour] = { count: 0, advanced: 0 };
        }
        hourCounts[hour].count++;
        if (isDefaultAdvanced) {
          hourCounts[hour].advanced++;
        }
        
        // Contar por origen (siempre usa las etapas por defecto)
        const origen = p.campana_origen || p.interes_principal || 'Sin origen';
        if (!originCounts[origen]) {
          originCounts[origen] = { count: 0, advanced: 0, destinos: {} };
        }
        originCounts[origen].count++;
        if (isDefaultAdvanced) {
          originCounts[origen].advanced++;
        }
        
        // Top destino por origen
        const destinos = p.destino_preferencia || [];
        if (Array.isArray(destinos)) {
          destinos.forEach((d: string) => {
            originCounts[origen].destinos[d] = (originCounts[origen].destinos[d] || 0) + 1;
            destinoCounts[d] = (destinoCounts[d] || 0) + 1;
          });
        }
        
        // Contar por etapa
        const etapa = p.etapa || 'Sin etapa';
        etapaCounts[etapa] = (etapaCounts[etapa] || 0) + 1;
      });
      
      // Convertir a arrays
      const byPeriod: ProspectDataPoint[] = Array.from(periodMap.entries()).map(([label, data]) => ({
        date: label,
        label,
        count: data.count,
        advanced: data.advanced,
        advanceRate: data.count > 0 ? (data.advanced / data.count) * 100 : 0
      }));
      
      // Ordenar por fecha
      if (activePeriod === 'month') {
        // Para período de mes, ordenar por día/mes
        byPeriod.sort((a, b) => {
          const [dayA, monthA] = a.label.split('/').map(Number);
          const [dayB, monthB] = b.label.split('/').map(Number);
          if (monthA !== monthB) return monthA - monthB;
          return dayA - dayB;
        });
      } else if (activePeriod === '6months' || activePeriod === 'year') {
        // Para períodos largos, ordenar por mes
        const monthOrder = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        byPeriod.sort((a, b) => {
          const [monthA, yearA] = a.label.split(' ');
          const [monthB, yearB] = b.label.split(' ');
          const dateA = new Date(2000 + parseInt(yearA || '0'), monthOrder.indexOf(monthA));
          const dateB = new Date(2000 + parseInt(yearB || '0'), monthOrder.indexOf(monthB));
          return dateA.getTime() - dateB.getTime();
        });
      }
      
      // Calcular acumulado
      let cumulative = 0;
      byPeriod.forEach(p => {
        cumulative += p.count;
        p.cumulative = cumulative;
      });
      
      // Métricas por hora
      const byHour: HourlyMetric[] = Array.from({ length: 24 }, (_, i) => {
        const data = hourCounts[i] || { count: 0, advanced: 0 };
        return {
          hour: i,
          label: `${i.toString().padStart(2, '0')}:00`,
          count: data.count,
          advanceRate: data.count > 0 ? (data.advanced / data.count) * 100 : 0
        };
      });
      
      // Mejores horas (top 3 por tasa de avance con mínimo 3 prospectos)
      const bestHours = byHour
        .filter(h => h.count >= 3)
        .sort((a, b) => b.advanceRate - a.advanceRate)
        .slice(0, 3)
        .map(h => h.hour);
      
      // Métricas por origen
      const total = prospectos.length;
      const byOrigin: OriginMetric[] = Object.entries(originCounts)
        .map(([origen, data]) => {
          const topDestino = Object.entries(data.destinos)
            .sort(([, a], [, b]) => b - a)[0];
          return {
            origen,
            count: data.count,
            percentage: (data.count / total) * 100,
            advanceRate: data.count > 0 ? (data.advanced / data.count) * 100 : 0,
            topDestino: topDestino?.[0]
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // Métricas por destino
      const byDestino: DestinoMetric[] = Object.entries(destinoCounts)
        .map(([destino, count], idx) => ({
          destino,
          count,
          percentage: (count / total) * 100,
          color: DESTINO_COLORS[idx % DESTINO_COLORS.length]
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      
      // Distribución por etapa
      const byEtapa: EtapaDistribution[] = Object.entries(etapaCounts)
        .map(([etapa, count]) => ({
          etapa,
          count,
          percentage: (count / total) * 100,
          color: ETAPA_COLORS[etapa] || ETAPA_COLORS.default
        }))
        .sort((a, b) => b.count - a.count);
      
      // Calcular tasa de crecimiento (comparar primera y segunda mitad del período)
      const midPoint = Math.floor(byPeriod.length / 2);
      const firstHalf = byPeriod.slice(0, midPoint).reduce((sum, p) => sum + p.count, 0);
      const secondHalf = byPeriod.slice(midPoint).reduce((sum, p) => sum + p.count, 0);
      const growthRate = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
      
      // Promedio diario
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const avgDailyNew = daysDiff > 0 ? total / daysDiff : total;
      
      setMetrics({
        total,
        byPeriod,
        byHour,
        byOrigin,
        byDestino,
        byEtapa,
        bestHours,
        growthRate,
        avgDailyNew
      });
      
    } catch (error) {
      console.error('Error loading prospect metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activePeriod, coordinacionIds, formatDateForGrouping, selectedEtapa]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Animaciones
  const backdropVariants = {
    hidden: { opacity: 0, backdropFilter: 'blur(0px)' },
    visible: { 
      opacity: 1, 
      backdropFilter: 'blur(12px)',
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    },
    exit: { 
      opacity: 0, 
      backdropFilter: 'blur(0px)',
      transition: { duration: 0.2 }
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.85, y: 40 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: 'spring', damping: 28, stiffness: 400, mass: 0.8 }
    },
    exit: { opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } }
  };

  // Contenido colapsado (vista compacta)
  const CollapsedContent = () => (
    <div className="flex flex-col">
      {/* Header con selector de tiempo */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics?.total.toLocaleString() || 0}
          </span>
          {metrics && metrics.growthRate !== 0 && (
            <span className={`flex items-center text-xs font-medium ${
              metrics.growthRate > 0 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {metrics.growthRate > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(metrics.growthRate).toFixed(1)}%
            </span>
          )}
        </div>
        
        {/* Indicador de período (sincronizado con filtro global) */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <Calendar className="w-3.5 h-3.5" />
          <span>{periodInfo.label}</span>
        </div>
      </div>
      
      {/* Mini stats en una fila */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-1.5">
          <p className="text-[9px] text-blue-600 dark:text-blue-400 font-medium">Promedio/día</p>
          <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
            {metrics?.avgDailyNew.toFixed(1) || 0}
          </p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-1.5">
          <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">Mejor hora</p>
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            {metrics?.bestHours[0] !== undefined ? `${metrics.bestHours[0]}:00` : 'N/A'}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-1.5">
          <p className="text-[9px] text-purple-600 dark:text-purple-400 font-medium">Top origen</p>
          <p className="text-sm font-bold text-purple-700 dark:text-purple-300 truncate">
            {metrics?.byOrigin[0]?.origen?.substring(0, 8) || 'N/A'}
          </p>
        </div>
      </div>
      
      {/* Gráfico de tendencia - ALTURA FIJA para que ResponsiveContainer funcione */}
      <div className="h-[150px] mt-2">
        {isLoading || externalLoading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
          </div>
        ) : metrics && metrics.byPeriod.length > 0 ? (
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={metrics.byPeriod} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorProspectosCollapsed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} vertical={false} />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 9, fill: '#9CA3AF' }} 
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 9, fill: '#9CA3AF' }} 
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: 'none', 
                  borderRadius: '8px',
                  fontSize: '11px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
                labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                itemStyle={{ color: '#60A5FA' }}
                formatter={(value: any) => [`${value} prospectos`, 'Nuevos']}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#3B82F6" 
                strokeWidth={2}
                fill="url(#colorProspectosCollapsed)"
                name="Prospectos"
                dot={false}
                activeDot={{ r: 4, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 text-xs gap-2">
            <TrendingUp className="w-8 h-8 opacity-30" />
            <span>Sin datos para el período</span>
          </div>
        )}
      </div>
      
      {/* Indicador de expansión */}
      <div className="text-center pt-1">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          Clic para ver análisis detallado →
        </span>
      </div>
    </div>
  );

  // Contenido expandido (vista completa con BI)
  const ExpandedContent = () => (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header con selector de tiempo expandido */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-4xl font-bold text-gray-900 dark:text-white">
              {metrics?.total.toLocaleString() || 0}
            </span>
            <span className="text-lg text-gray-500 dark:text-gray-400 ml-2">prospectos nuevos</span>
          </div>
          {metrics && metrics.growthRate !== 0 && (
            <span className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              metrics.growthRate > 0 
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}>
              {metrics.growthRate > 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
              {Math.abs(metrics.growthRate).toFixed(1)}% vs período anterior
            </span>
          )}
        </div>
        
        {/* Selectores de período y etapa */}
        <div className="flex items-center gap-3">
          {/* Selector de período */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {PERIOD_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setExpandedPeriod(option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  expandedPeriod === option.value
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {option.shortLabel}
              </button>
            ))}
          </div>
          
          {/* Selector de etapa para tasa de avance */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Tasa de avance hacia:</span>
            <div className="relative">
              <select
                value={selectedEtapa}
                onChange={(e) => setSelectedEtapa(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
              >
                {etapasDisponibles.map(etapa => (
                  <option key={etapa} value={etapa}>
                    {etapa === 'todas' ? 'Etapas de conversión' : etapa}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
        {/* Fila 1: Gráfico principal + KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de línea principal con tasa de avance */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Tendencia de Prospectos Nuevos
              <span className="ml-2 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs">
                + Tasa de Avance
              </span>
            </h4>
            <div className="h-[280px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : metrics && metrics.byPeriod.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.byPeriod} margin={{ top: 10, right: 50, left: 0, bottom: 10 }}>
                    <defs>
                      <linearGradient id="colorProspectosExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 11, fill: '#9CA3AF' }} 
                      tickLine={false}
                      axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: '#9CA3AF' }} 
                      tickLine={false}
                      axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#10B981' }} 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: 'none', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                      }}
                      labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'Tasa de Avance') return [`${value.toFixed(1)}%`, name];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3B82F6" 
                      strokeWidth={2.5}
                      fill="url(#colorProspectosExp)"
                      name="Prospectos"
                      dot={{ fill: '#3B82F6', strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="advanceRate" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="Tasa de Avance"
                      dot={{ fill: '#10B981', r: 3 }}
                      activeDot={{ r: 5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Sin datos para el período
                </div>
              )}
            </div>
          </div>
          
          {/* KPIs */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Promedio Diario</span>
              </div>
              <p className="text-3xl font-bold text-blue-800 dark:text-blue-300">
                {metrics?.avgDailyNew.toFixed(1) || 0}
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">prospectos/día</p>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/10 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Mejores Horas</span>
              </div>
              <div className="flex gap-2">
                {metrics?.bestHours.slice(0, 3).map((hour, idx) => (
                  <span 
                    key={hour}
                    className={`px-2 py-1 rounded-lg text-sm font-bold ${
                      idx === 0 
                        ? 'bg-emerald-200 dark:bg-emerald-700 text-emerald-800 dark:text-emerald-200'
                        : 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {hour}:00
                  </span>
                )) || <span className="text-gray-400 text-sm">N/A</span>}
              </div>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-2">Mayor tasa de avance</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Top Origen</span>
              </div>
              <p className="text-lg font-bold text-purple-800 dark:text-purple-300 truncate">
                {metrics?.byOrigin[0]?.origen || 'N/A'}
              </p>
              <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">
                {metrics?.byOrigin[0]?.count || 0} prospectos ({metrics?.byOrigin[0]?.percentage.toFixed(1)}%)
              </p>
            </div>
          </div>
        </div>
        
        {/* Fila 2: Horarios óptimos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            Distribución por Hora de Contacto
          </h4>
          <div className="h-[200px]">
            {metrics && metrics.byHour.some(h => h.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.byHour} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }} 
                    interval={1}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none', 
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#60A5FA" 
                    name="Prospectos"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Sin datos de horarios
              </div>
            )}
          </div>
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              ¿Cómo interpretar este gráfico?
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 ml-4">
              Las barras muestran cuántos prospectos contactaron a cada hora del día. 
              Las horas con más prospectos indican los horarios de mayor actividad.
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium ml-4">
              💡 Mejores horas para contacto: {metrics?.bestHours.slice(0, 3).map(h => `${h}:00`).join(', ') || 'N/A'}
            </p>
          </div>
        </div>
        
        {/* Fila 3: Origen y Destinos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Origen de prospectos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-500" />
              Origen de Prospectos
            </h4>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {metrics?.byOrigin.map((item, idx) => (
                <div 
                  key={item.origen}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.origen}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.count}
                    </span>
                    <span 
                      className={`text-xs px-1.5 py-0.5 rounded cursor-help relative group ${
                        item.advanceRate >= 30 
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                      title={`De ${item.count} prospectos de "${item.origen}", el ${item.advanceRate.toFixed(1)}% avanzaron a etapas de conversión (Prospecto calificado, Agendando cita, Cita confirmada, Certificado, etc.)`}
                    >
                      {item.advanceRate.toFixed(0)}% avance
                      {/* Tooltip explicativo */}
                      <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                        <p className="font-semibold mb-1">¿Cómo se calcula?</p>
                        <p className="text-gray-300">
                          De los <span className="text-blue-400 font-medium">{item.count}</span> prospectos 
                          que llegaron desde "<span className="text-purple-400">{item.origen}</span>", 
                          el <span className="text-emerald-400 font-medium">{item.advanceRate.toFixed(1)}%</span> avanzaron 
                          a etapas de conversión como: Prospecto calificado, Agendando cita, Cita confirmada o Certificado.
                        </p>
                        <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                      </div>
                    </span>
                  </div>
                </div>
              )) || (
                <p className="text-gray-400 text-sm text-center py-4">Sin datos de origen</p>
              )}
            </div>
          </div>
          
          {/* Distribución por destino - Gráfica de barras horizontal */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-500" />
              Destinos Preferidos
            </h4>
            <div className="h-[220px]">
              {metrics && metrics.byDestino.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={metrics.byDestino} 
                    layout="vertical" 
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} />
                    <YAxis 
                      type="category" 
                      dataKey="destino" 
                      tick={{ fontSize: 10, fill: '#9CA3AF' }} 
                      tickLine={false}
                      axisLine={false}
                      width={75}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: 'none', 
                        borderRadius: '8px',
                        color: '#F3F4F6',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                      }}
                      labelStyle={{ color: '#9CA3AF', fontWeight: 500, marginBottom: '4px' }}
                      itemStyle={{ color: '#F3F4F6' }}
                      formatter={(value: number) => [`${value} prospectos (${metrics.total > 0 ? ((value / metrics.total) * 100).toFixed(1) : 0}%)`, 'Cantidad']}
                      cursor={false}
                    />
                    <Bar 
                      dataKey="count" 
                      radius={[0, 4, 4, 0]}
                    >
                      {metrics.byDestino.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Sin datos de destinos
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Fila 4: Distribución por etapa */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Estado Actual de Prospectos Nuevos
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {metrics?.byEtapa.slice(0, 6).map((item) => (
              <div 
                key={item.etapa}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30"
              >
                <div 
                  className="w-2 h-2 rounded-full mb-2"
                  style={{ backgroundColor: item.color }}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.etapa}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{item.count}</p>
                <p className="text-xs text-gray-400">{item.percentage.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Modal expandido */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={onToggleExpand}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header del modal */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Métricas de Prospectos Nuevos
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Inteligencia de negocio y análisis de conversión
                    </p>
                  </div>
                </div>
                <button
                  onClick={onToggleExpand}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Contenido */}
              <div className="flex-1 p-6 overflow-hidden">
                <ExpandedContent />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget colapsado */}
      <div
        className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden ${
          isExpanded ? 'ring-2 ring-blue-500/50' : ''
        }`}
      >
        <div 
          className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
          onClick={onToggleExpand}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Prospectos Nuevos</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tendencias y análisis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isExpanded && (
              <span className="text-xs text-blue-500 font-medium">Expandido</span>
            )}
            <Maximize2 className={`w-4 h-4 transition-colors ${
              isExpanded ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-500'
            }`} />
          </div>
        </div>
        
        <div className="p-4">
          {isLoading || externalLoading ? (
            <div className="flex items-center justify-center h-[250px]">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <CollapsedContent />
          )}
        </div>
      </div>
    </>
  );
};

export default ProspectosMetricsWidget;
