/**
 * ============================================
 * WIDGET: Métricas de Ejecutivos
 * ============================================
 * 
 * Dashboard de rendimiento de ejecutivos con:
 * - Tiempo de respuesta promedio (post-handoff)
 * - Tiempo de handoff (para detectar prematuros)
 * - Cantidad de interacciones de mensajes
 * - Plantillas enviadas
 * - Llamadas atendidas
 * - Llamadas programadas
 * 
 * OPTIMIZADO: Usa función RPC get_ejecutivos_metricas
 * 
 * Versión: 1.2.0
 * Fecha: Enero 2025
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Users, Clock, MessageSquare, Phone,
  TrendingUp, Maximize2, RefreshCw, X,
  Timer, MessageCircle, PhoneCall, CalendarCheck, Send,
  AlertTriangle, ArrowRightLeft
} from 'lucide-react';
import { analysisSupabase } from '../../../config/analysisSupabase';
import type { Coordinacion } from '../../../services/coordinacionService';

// ============================================
// TIPOS E INTERFACES
// ============================================

type TimePeriod = '24hours' | 'week' | 'month' | '6months' | 'year';

interface EjecutivoMetrics {
  ejecutivo_id: string;
  nombre: string;
  email: string;
  coordinacion_id: string | null;
  coordinacion_nombre: string;
  mensajes_enviados: number;
  plantillas_enviadas: number;
  llamadas_atendidas: number;
  llamadas_programadas: number;
  prospectos_asignados: number;
  tiempo_respuesta_promedio: number; // minutos post-handoff
  tiempo_handoff_promedio: number; // minutos desde primer mensaje hasta handoff
  conversaciones_con_handoff: number;
}

interface EjecutivosData {
  ejecutivos: EjecutivoMetrics[];
  topRespondedores: EjecutivoMetrics[];
  topMensajes: EjecutivoMetrics[];
  topPlantillas: EjecutivoMetrics[];
  topLlamadas: EjecutivoMetrics[];
  topProgramadas: EjecutivoMetrics[];
  topHandoffRapido: EjecutivoMetrics[]; // Handoffs más rápidos (potencialmente prematuros)
  promedioGeneral: {
    tiempoRespuesta: number;
    tiempoHandoff: number;
    mensajesPorEjecutivo: number;
    llamadasPorEjecutivo: number;
  };
}

interface EjecutivosMetricsWidgetProps {
  coordinacionIds: string[] | null;
  coordinaciones: Coordinacion[];
  period: TimePeriod;
}

// ============================================
// CONSTANTES
// ============================================

const PERIOD_OPTIONS: { value: TimePeriod; label: string; shortLabel: string }[] = [
  { value: '24hours', label: 'Últimas 24 horas', shortLabel: '24h' },
  { value: 'week', label: 'Última semana', shortLabel: '7d' },
  { value: 'month', label: 'Último mes', shortLabel: '30d' },
  { value: '6months', label: 'Últimos 6 meses', shortLabel: '6m' },
  { value: 'year', label: 'Último año', shortLabel: '1a' },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const EjecutivosMetricsWidget: React.FC<EjecutivosMetricsWidgetProps> = ({
  coordinacionIds,
  coordinaciones,
  period: globalPeriod
}) => {
  const [data, setData] = useState<EjecutivosData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(globalPeriod);
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [selectedEjecutivo, setSelectedEjecutivo] = useState<EjecutivoMetrics | null>(null);

  // Obtener rango de fechas según período
  const getDateRange = useCallback((period: TimePeriod): { start: Date; end: Date } => {
    const end = new Date();
    const start = new Date();
    
    switch (period) {
      case '24hours': start.setHours(start.getHours() - 24); break;
      case 'week': start.setDate(start.getDate() - 7); break;
      case 'month': start.setMonth(start.getMonth() - 1); break;
      case '6months': start.setMonth(start.getMonth() - 6); break;
      case 'year': start.setFullYear(start.getFullYear() - 1); break;
    }
    
    return { start, end };
  }, []);

  // Cargar datos usando la función RPC optimizada
  const loadData = useCallback(async () => {
    if (!analysisSupabase) return;
    
    setIsLoading(true);
    try {
      const { start, end } = getDateRange(selectedPeriod);
      
      const coordIds = coordinacionIds && coordinacionIds.length > 0 ? coordinacionIds : null;
      
      const { data: rpcData, error } = await analysisSupabase.rpc('get_ejecutivos_metricas', {
        p_fecha_inicio: start.toISOString(),
        p_fecha_fin: end.toISOString(),
        p_coordinacion_ids: coordIds
      });

      if (error) {
        console.error('Error calling RPC:', error);
        throw error;
      }

      // Filtrar ejecutivos con al menos alguna actividad
      const ejecutivosConActividad = (rpcData || []).filter((e: EjecutivoMetrics) => 
        e.mensajes_enviados > 0 || 
        e.plantillas_enviadas > 0 || 
        e.llamadas_atendidas > 0 || 
        e.llamadas_programadas > 0
      );

      // Top respondedores (menor tiempo de respuesta = mejor)
      const topRespondedores = [...ejecutivosConActividad]
        .filter(e => e.tiempo_respuesta_promedio > 0)
        .sort((a, b) => a.tiempo_respuesta_promedio - b.tiempo_respuesta_promedio)
        .slice(0, 10);

      const topMensajes = [...ejecutivosConActividad]
        .sort((a, b) => b.mensajes_enviados - a.mensajes_enviados)
        .slice(0, 10);

      const topPlantillas = [...ejecutivosConActividad]
        .filter(e => e.plantillas_enviadas > 0)
        .sort((a, b) => b.plantillas_enviadas - a.plantillas_enviadas)
        .slice(0, 10);

      const topLlamadas = [...ejecutivosConActividad]
        .filter(e => e.llamadas_atendidas > 0)
        .sort((a, b) => b.llamadas_atendidas - a.llamadas_atendidas)
        .slice(0, 10);

      const topProgramadas = [...ejecutivosConActividad]
        .filter(e => e.llamadas_programadas > 0)
        .sort((a, b) => b.llamadas_programadas - a.llamadas_programadas)
        .slice(0, 10);

      // Handoffs más rápidos (potencialmente prematuros) - menor tiempo = más rápido
      const topHandoffRapido = [...ejecutivosConActividad]
        .filter(e => e.tiempo_handoff_promedio > 0 && e.conversaciones_con_handoff >= 3)
        .sort((a, b) => a.tiempo_handoff_promedio - b.tiempo_handoff_promedio)
        .slice(0, 10);

      // Calcular promedios generales
      const totalEjecutivos = ejecutivosConActividad.length || 1;
      const ejecutivosConTiempoRespuesta = ejecutivosConActividad.filter(e => e.tiempo_respuesta_promedio > 0);
      const ejecutivosConHandoff = ejecutivosConActividad.filter(e => e.tiempo_handoff_promedio > 0);
      
      const promedioGeneral = {
        tiempoRespuesta: ejecutivosConTiempoRespuesta.length > 0
          ? ejecutivosConTiempoRespuesta.reduce((sum, e) => sum + e.tiempo_respuesta_promedio, 0) / ejecutivosConTiempoRespuesta.length
          : 0,
        tiempoHandoff: ejecutivosConHandoff.length > 0
          ? ejecutivosConHandoff.reduce((sum, e) => sum + e.tiempo_handoff_promedio, 0) / ejecutivosConHandoff.length
          : 0,
        mensajesPorEjecutivo: ejecutivosConActividad.reduce((sum, e) => sum + e.mensajes_enviados, 0) / totalEjecutivos,
        llamadasPorEjecutivo: ejecutivosConActividad.reduce((sum, e) => sum + e.llamadas_atendidas, 0) / totalEjecutivos
      };

      setData({
        ejecutivos: ejecutivosConActividad,
        topRespondedores,
        topMensajes,
        topPlantillas,
        topLlamadas,
        topProgramadas,
        topHandoffRapido,
        promedioGeneral
      });

    } catch (error) {
      console.error('Error loading ejecutivos metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod, coordinacionIds, getDateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Formatear tiempo
  const formatTime = (minutes: number): string => {
    if (minutes <= 0) return 'N/A';
    if (minutes < 1) return '<1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    return `${hours}h ${mins}m`;
  };

  // Componente de Widget pequeño
  const MetricCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    data: EjecutivoMetrics[];
    valueKey: keyof EjecutivoMetrics;
    formatValue?: (v: number) => string;
    color: string;
    widgetKey: string;
    description?: string;
  }> = ({ title, icon, data, valueKey, formatValue = (v) => v.toString(), color, widgetKey, description }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${color}20` }}>
            <span style={{ color }}>{icon}</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h4>
            {description && (
              <p className="text-xs text-gray-400">{description}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpandedWidget(widgetKey)}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Maximize2 className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      
      {data.length > 0 ? (
        <div className="space-y-2">
          {data.slice(0, 3).map((ej, idx) => (
            <div 
              key={ej.ejecutivo_id}
              className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setSelectedEjecutivo(ej)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: idx === 0 ? color : idx === 1 ? `${color}CC` : `${color}99` }}
                >
                  {idx + 1}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                  {ej.nombre.split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
              <span className="text-sm font-bold" style={{ color }}>
                {formatValue(ej[valueKey] as number)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
      )}
    </div>
  );

  // Modal de detalle expandido
  const ExpandedModal: React.FC<{ widgetKey: string; onClose: () => void }> = ({ widgetKey, onClose }) => {
    const getModalData = () => {
      if (!data) return { title: '', description: '', datos: [], valueKey: 'mensajes_enviados' as keyof EjecutivoMetrics, formatValue: (v: number) => v.toString(), color: '#3B82F6', icon: null };
      
      switch (widgetKey) {
        case 'respuesta':
          return { 
            title: 'Tiempo de Respuesta más Rápido', 
            description: 'Tiempo promedio entre mensaje del prospecto y respuesta del ejecutivo (después del handoff)',
            datos: data.topRespondedores, 
            valueKey: 'tiempo_respuesta_promedio' as keyof EjecutivoMetrics, 
            formatValue: formatTime, 
            color: '#10B981',
            icon: <Timer className="w-5 h-5" />
          };
        case 'handoff':
          return { 
            title: 'Handoff más Rápido', 
            description: 'Ejecutivos que toman control de la conversación más rápido (potencial handoff prematuro)',
            datos: data.topHandoffRapido, 
            valueKey: 'tiempo_handoff_promedio' as keyof EjecutivoMetrics, 
            formatValue: formatTime, 
            color: '#F59E0B',
            icon: <AlertTriangle className="w-5 h-5" />
          };
        case 'mensajes':
          return { 
            title: 'Mayor Interacción de Mensajes', 
            description: 'Ejecutivos con más mensajes enviados',
            datos: data.topMensajes, 
            valueKey: 'mensajes_enviados' as keyof EjecutivoMetrics, 
            formatValue: (v: number) => v.toLocaleString(), 
            color: '#3B82F6',
            icon: <MessageCircle className="w-5 h-5" />
          };
        case 'plantillas':
          return { 
            title: 'Más Plantillas Enviadas', 
            description: 'Ejecutivos que más utilizan plantillas de WhatsApp',
            datos: data.topPlantillas, 
            valueKey: 'plantillas_enviadas' as keyof EjecutivoMetrics, 
            formatValue: (v: number) => v.toLocaleString(), 
            color: '#8B5CF6',
            icon: <Send className="w-5 h-5" />
          };
        case 'llamadas':
          return { 
            title: 'Más Llamadas Atendidas', 
            description: 'Ejecutivos con más llamadas atendidas',
            datos: data.topLlamadas, 
            valueKey: 'llamadas_atendidas' as keyof EjecutivoMetrics, 
            formatValue: (v: number) => v.toLocaleString(), 
            color: '#EF4444',
            icon: <PhoneCall className="w-5 h-5" />
          };
        case 'programadas':
          return { 
            title: 'Más Llamadas Programadas', 
            description: 'Ejecutivos que más programan llamadas',
            datos: data.topProgramadas, 
            valueKey: 'llamadas_programadas' as keyof EjecutivoMetrics, 
            formatValue: (v: number) => v.toLocaleString(), 
            color: '#EC4899',
            icon: <CalendarCheck className="w-5 h-5" />
          };
        default:
          return { title: '', description: '', datos: [], valueKey: 'mensajes_enviados' as keyof EjecutivoMetrics, formatValue: (v: number) => v.toString(), color: '#3B82F6', icon: null };
      }
    };

    const { title, description, datos, valueKey, formatValue, color, icon } = getModalData();

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                  <span style={{ color }}>{icon}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lista completa */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Top 10 Ejecutivos</h4>
                {datos.map((ej, idx) => (
                  <div 
                    key={ej.ejecutivo_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => setSelectedEjecutivo(ej)}
                  >
                    <div className="flex items-center gap-3">
                      <span 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{ej.nombre}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{ej.coordinacion_nombre || 'Sin coordinación'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold" style={{ color }}>
                        {formatValue(ej[valueKey] as number)}
                      </span>
                      <p className="text-xs text-gray-500">{ej.conversaciones_con_handoff} handoffs</p>
                    </div>
                  </div>
                ))}
                {datos.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">No hay datos para mostrar</p>
                )}
              </div>

              {/* Gráfico de barras */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Comparativa</h4>
                <div className="h-[350px]">
                  {datos.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={datos.slice(0, 10)} 
                        layout="vertical" 
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                        <YAxis 
                          type="category" 
                          dataKey="nombre" 
                          tick={{ fontSize: 11, fill: '#9CA3AF' }} 
                          width={95}
                          tickFormatter={(v) => v.split(' ').slice(0, 2).join(' ')}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: 'none', 
                            borderRadius: '8px',
                            color: '#F3F4F6'
                          }}
                          formatter={(value: number) => [formatValue(value), '']}
                        />
                        <Bar dataKey={valueKey} fill={color} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      Sin datos para graficar
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Modal de detalle de ejecutivo
  const EjecutivoDetailModal: React.FC<{ ejecutivo: EjecutivoMetrics; onClose: () => void }> = ({ ejecutivo, onClose }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{ejecutivo.nombre}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{ejecutivo.coordinacion_nombre || 'Sin coordinación'} • {ejecutivo.email}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)]">
          {/* KPIs principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-emerald-600 dark:text-emerald-400">Tiempo Respuesta</span>
              </div>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatTime(ejecutivo.tiempo_respuesta_promedio)}
              </p>
              <p className="text-xs text-emerald-500 mt-1">post-handoff</p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-1">
                <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-amber-600 dark:text-amber-400">Tiempo Handoff</span>
              </div>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                {formatTime(ejecutivo.tiempo_handoff_promedio)}
              </p>
              <p className="text-xs text-amber-500 mt-1">{ejecutivo.conversaciones_con_handoff} conv.</p>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-600 dark:text-blue-400">Mensajes</span>
              </div>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {ejecutivo.mensajes_enviados.toLocaleString()}
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-1">
                <Send className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-purple-600 dark:text-purple-400">Plantillas</span>
              </div>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                {ejecutivo.plantillas_enviadas.toLocaleString()}
              </p>
            </div>
          </div>

          {/* KPIs secundarios */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-1">
                <PhoneCall className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-600 dark:text-red-400">Llamadas Atendidas</span>
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {ejecutivo.llamadas_atendidas.toLocaleString()}
              </p>
            </div>

            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-xl p-4 border border-pink-200 dark:border-pink-800">
              <div className="flex items-center gap-2 mb-1">
                <CalendarCheck className="w-4 h-4 text-pink-500" />
                <span className="text-xs text-pink-600 dark:text-pink-400">Llamadas Programadas</span>
              </div>
              <p className="text-2xl font-bold text-pink-700 dark:text-pink-300">
                {ejecutivo.llamadas_programadas.toLocaleString()}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Prospectos</span>
              </div>
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                {ejecutivo.prospectos_asignados.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Resumen visual */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Resumen de Actividad
            </h4>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={[
                    { metric: 'Mensajes', value: ejecutivo.mensajes_enviados, fill: '#3B82F6' },
                    { metric: 'Plantillas', value: ejecutivo.plantillas_enviadas, fill: '#8B5CF6' },
                    { metric: 'Llamadas', value: ejecutivo.llamadas_atendidas, fill: '#EF4444' },
                    { metric: 'Programadas', value: ejecutivo.llamadas_programadas, fill: '#EC4899' }
                  ]}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
                  <XAxis dataKey="metric" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data || data.ejecutivos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
        <Users className="w-12 h-12 mb-3" />
        <p>No hay datos de ejecutivos para el período seleccionado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con selector de período */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Métricas de Ejecutivos</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data.ejecutivos.length} ejecutivos con actividad
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {PERIOD_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setSelectedPeriod(option.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                selectedPeriod === option.value
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {option.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs generales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/10 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Tiempo Respuesta Prom.</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {formatTime(data.promedioGeneral.tiempoRespuesta)}
          </p>
          <p className="text-xs text-emerald-500 mt-1">post-handoff</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/10 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRightLeft className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-amber-600 dark:text-amber-400">Tiempo Handoff Prom.</span>
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {formatTime(data.promedioGeneral.tiempoHandoff)}
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-blue-600 dark:text-blue-400">Mensajes por Ejecutivo</span>
          </div>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {data.promedioGeneral.mensajesPorEjecutivo.toFixed(0)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/10 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="w-4 h-4 text-red-500" />
            <span className="text-xs text-red-600 dark:text-red-400">Llamadas por Ejecutivo</span>
          </div>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">
            {data.promedioGeneral.llamadasPorEjecutivo.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Grid de widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Respuesta más Rápida"
          description="Post-handoff"
          icon={<Timer className="w-4 h-4" />}
          data={data.topRespondedores}
          valueKey="tiempo_respuesta_promedio"
          formatValue={formatTime}
          color="#10B981"
          widgetKey="respuesta"
        />

        <MetricCard
          title="Handoff más Rápido"
          description="Posible prematuro"
          icon={<AlertTriangle className="w-4 h-4" />}
          data={data.topHandoffRapido}
          valueKey="tiempo_handoff_promedio"
          formatValue={formatTime}
          color="#F59E0B"
          widgetKey="handoff"
        />
        
        <MetricCard
          title="Mayor Interacción"
          icon={<MessageCircle className="w-4 h-4" />}
          data={data.topMensajes}
          valueKey="mensajes_enviados"
          formatValue={(v) => v.toLocaleString()}
          color="#3B82F6"
          widgetKey="mensajes"
        />

        <MetricCard
          title="Más Plantillas"
          icon={<Send className="w-4 h-4" />}
          data={data.topPlantillas}
          valueKey="plantillas_enviadas"
          formatValue={(v) => v.toLocaleString()}
          color="#8B5CF6"
          widgetKey="plantillas"
        />

        <MetricCard
          title="Más Llamadas Atendidas"
          icon={<PhoneCall className="w-4 h-4" />}
          data={data.topLlamadas}
          valueKey="llamadas_atendidas"
          formatValue={(v) => v.toLocaleString()}
          color="#EF4444"
          widgetKey="llamadas"
        />

        <MetricCard
          title="Más Llamadas Programadas"
          icon={<CalendarCheck className="w-4 h-4" />}
          data={data.topProgramadas}
          valueKey="llamadas_programadas"
          formatValue={(v) => v.toLocaleString()}
          color="#EC4899"
          widgetKey="programadas"
        />
      </div>

      {/* Modales */}
      <AnimatePresence>
        {expandedWidget && (
          <ExpandedModal widgetKey={expandedWidget} onClose={() => setExpandedWidget(null)} />
        )}
        {selectedEjecutivo && (
          <EjecutivoDetailModal ejecutivo={selectedEjecutivo} onClose={() => setSelectedEjecutivo(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EjecutivosMetricsWidget;
