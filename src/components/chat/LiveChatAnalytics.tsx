/**
 * ============================================
 * COMPONENTE DE ANALÍTICAS - LIVE CHAT
 * ============================================
 * 
 * Analytics avanzado con gráficos modernos y métricas de valor
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Chart from 'chart.js/auto';
import {
  TrendingUp,
  Clock,
  MessageSquare,
  Users,
  Activity,
  Clock as ClockIcon,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck
} from 'lucide-react';
import { analysisSupabase } from '../../config/analysisSupabase';
import { useAuth } from '../../contexts/AuthContext';

interface AnalyticsData {
  // Métricas básicas
  totalConversations: number;
  activeConversations: number;
  transferredConversations: number;
  closedConversations: number;
  handoffRate: number;
  
  // Tendencias temporales
  conversationTrends: { date: string; count: number }[];
  
  // Distribución de mensajes
  messageDistribution: { sender_type: string; count: number }[];
  
  // Tiempo de respuesta
  avgResponseTime: number;
  avgResponseTimeBot: number;
  avgResponseTimeAgent: number;
  
  // Horas pico
  peakHours: { hour: number; count: number }[];
  
  // Prioridades
  priorityDistribution: { priority: string; count: number }[];
  
  // Tasa de lectura
  readRate: number;
  
  // Duración promedio
  avgConversationDuration: number;
  
  // Comparativas
  previousPeriod: {
    totalConversations: number;
    activeConversations: number;
    avgResponseTime: number;
  };
}

const LiveChatAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  
  const trendChartRef = useRef<HTMLCanvasElement>(null);
  const messageChartRef = useRef<HTMLCanvasElement>(null);
  const hourChartRef = useRef<HTMLCanvasElement>(null);
  const priorityChartRef = useRef<HTMLCanvasElement>(null);
  
  const trendChartInstance = useRef<Chart | null>(null);
  const messageChartInstance = useRef<Chart | null>(null);
  const hourChartInstance = useRef<Chart | null>(null);
  const priorityChartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  useEffect(() => {
    if (analytics) {
      renderCharts();
    }
    
    return () => {
      // Cleanup charts
      [trendChartInstance, messageChartInstance, hourChartInstance, priorityChartInstance].forEach(chart => {
        if (chart.current) {
          chart.current.destroy();
          chart.current = null;
        }
      });
    };
  }, [analytics]);

  // Metadata del servidor (rol, filtros aplicados)
  const [meta, setMeta] = useState<{ role: string; filtered: boolean; prospecto_count: number } | null>(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        console.error('[LiveChatAnalytics] No user ID available');
        return;
      }

      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

      // Una sola llamada RPC: permisos + métricas + comparativas server-side
      const { data, error } = await analysisSupabase.rpc('get_whatsapp_analytics', {
        p_user_id: user.id,
        p_days: days
      });

      if (error) throw error;

      if (!data || data.error) {
        console.error('[LiveChatAnalytics] Server error:', data?.error);
        return;
      }

      // Guardar metadata del servidor
      if (data._meta) {
        setMeta({
          role: data._meta.role,
          filtered: data._meta.filtered,
          prospecto_count: data._meta.prospecto_count
        });
      }

      // Mapeo directo: la función SQL retorna exactamente la interfaz AnalyticsData
      setAnalytics({
        totalConversations: data.totalConversations ?? 0,
        activeConversations: data.activeConversations ?? 0,
        transferredConversations: data.transferredConversations ?? 0,
        closedConversations: data.closedConversations ?? 0,
        handoffRate: data.handoffRate ?? 0,
        conversationTrends: data.conversationTrends ?? [],
        messageDistribution: data.messageDistribution ?? [],
        avgResponseTime: data.avgResponseTime ?? 0,
        avgResponseTimeBot: data.avgResponseTimeBot ?? 0,
        avgResponseTimeAgent: data.avgResponseTimeAgent ?? 0,
        peakHours: data.peakHours ?? [],
        priorityDistribution: data.priorityDistribution ?? [],
        readRate: data.readRate ?? 0,
        avgConversationDuration: data.avgConversationDuration ?? 0,
        previousPeriod: {
          totalConversations: data.previousPeriod?.totalConversations ?? 0,
          activeConversations: data.previousPeriod?.activeConversations ?? 0,
          avgResponseTime: data.previousPeriod?.avgResponseTime ?? 0
        }
      });
    } catch (error) {
      console.error('[LiveChatAnalytics] Error cargando analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCharts = () => {
    if (!analytics) return;

    // Destruir charts anteriores
    [trendChartInstance, messageChartInstance, hourChartInstance, priorityChartInstance].forEach(chart => {
      if (chart.current) {
        chart.current.destroy();
        chart.current = null;
      }
    });

    // Chart 1: Tendencias de conversaciones
    if (trendChartRef.current) {
      const ctx = trendChartRef.current.getContext('2d');
      if (ctx) {
        trendChartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: analytics.conversationTrends.map(t => t.date),
            datasets: [{
              label: 'Conversaciones',
              data: analytics.conversationTrends.map(t => t.count),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: 'rgb(59, 130, 246)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: { size: 12 },
                bodyFont: { size: 11 },
                displayColors: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                  precision: 0
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            },
            animation: {
              duration: 1000,
              easing: 'easeOutQuart'
            }
          }
        });
      }
    }

    // Chart 2: Distribución de mensajes
    if (messageChartRef.current) {
      const ctx = messageChartRef.current.getContext('2d');
      if (ctx) {
        messageChartInstance.current = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: analytics.messageDistribution.map(m => m.sender_type),
            datasets: [{
              data: analytics.messageDistribution.map(m => m.count),
              backgroundColor: [
                'rgba(16, 185, 129, 0.8)',  // Cliente
                'rgba(59, 130, 246, 0.8)',  // Bot
                'rgba(139, 92, 246, 0.8)',  // Vendedor
                'rgba(245, 158, 11, 0.8)'   // Plantilla
              ],
              borderWidth: 0,
              hoverOffset: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  padding: 12,
                  font: { size: 11 },
                  usePointStyle: true
                }
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12
              }
            },
            animation: {
              animateRotate: true,
              duration: 1000
            }
          }
        });
      }
    }

    // Chart 3: Horas pico
    if (hourChartRef.current) {
      const ctx = hourChartRef.current.getContext('2d');
      if (ctx) {
        hourChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: analytics.peakHours.map(h => `${h.hour}:00`),
            datasets: [{
              label: 'Mensajes',
              data: analytics.peakHours.map(h => h.count),
              backgroundColor: 'rgba(139, 92, 246, 0.8)',
              borderRadius: 6,
              borderSkipped: false
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(0, 0, 0, 0.05)'
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            },
            animation: {
              duration: 1000
            }
          }
        });
      }
    }

    // Chart 4: Prioridades
    if (priorityChartRef.current) {
      const ctx = priorityChartRef.current.getContext('2d');
      if (ctx) {
        priorityChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: analytics.priorityDistribution.map(p => p.priority),
            datasets: [{
              label: 'Conversaciones',
              data: analytics.priorityDistribution.map(p => p.count),
              backgroundColor: [
                'rgba(34, 197, 94, 0.8)',
                'rgba(59, 130, 246, 0.8)',
                'rgba(249, 115, 22, 0.8)',
                'rgba(239, 68, 68, 0.8)'
              ],
              borderRadius: 6,
              borderSkipped: false
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                  precision: 0
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            },
            animation: {
              duration: 1000
            }
          }
        });
      }
    }
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        No hay datos disponibles
      </div>
    );
  }

  const convChange = calculateChange(analytics.totalConversations, analytics.previousPeriod.totalConversations);
  const responseChange = calculateChange(analytics.previousPeriod.avgResponseTime, analytics.avgResponseTime);

  return (
    <div className="space-y-6">
      {/* Filtro de tiempo */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Analíticas</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Métricas y estadísticas del sistema de chat
            {meta && (
              <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-3 h-3" />
                {meta.filtered
                  ? `${meta.role} · ${meta.prospecto_count} prospectos`
                  : 'Admin · Todos los datos'
                }
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-gray-900 dark:bg-gray-700 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Conversaciones"
          value={analytics.totalConversations}
          previous={analytics.previousPeriod.totalConversations}
          icon={MessageSquare}
          color="blue"
        />
        <MetricCard
          title="Activas"
          value={analytics.activeConversations}
          previous={analytics.previousPeriod.activeConversations}
          icon={Activity}
          color="emerald"
        />
        <MetricCard
          title="Tiempo Respuesta"
          value={analytics.avgResponseTime}
          previous={analytics.previousPeriod.avgResponseTime}
          icon={Clock}
          color="purple"
          isTime={true}
          formatValue={formatMinutes}
        />
        <MetricCard
          title="Tasa Handoff"
          value={`${analytics.handoffRate.toFixed(1)}%`}
          previous={0}
          icon={Users}
          color="amber"
        />
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencias de conversaciones */}
        <ChartCard
          title="Tendencias de Conversaciones"
          icon={TrendingUp}
          description="Evolución diaria de conversaciones"
        >
          <div className="h-64">
            <canvas ref={trendChartRef}></canvas>
          </div>
        </ChartCard>

        {/* Distribución de mensajes */}
        <ChartCard
          title="Distribución de Mensajes"
          icon={MessageSquare}
          description="Por tipo de remitente"
        >
          <div className="h-64">
            <canvas ref={messageChartRef}></canvas>
          </div>
        </ChartCard>
      </div>

      {/* Gráficos secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Horas pico */}
        <ChartCard
          title="Horas Pico de Actividad"
          icon={ClockIcon}
          description="Top 8 horas con mayor actividad"
        >
          <div className="h-64">
            <canvas ref={hourChartRef}></canvas>
          </div>
        </ChartCard>

        {/* Prioridades */}
        <ChartCard
          title="Distribución por Prioridad"
          icon={Activity}
          description="Conversaciones según prioridad asignada"
        >
          <div className="h-64">
            <canvas ref={priorityChartRef}></canvas>
          </div>
        </ChartCard>
      </div>

      {/* Métricas detalladas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DetailCard
          title="Tiempo Respuesta Bot"
          value={formatMinutes(analytics.avgResponseTimeBot)}
          icon={Clock}
        />
        <DetailCard
          title="Tiempo Respuesta Agente"
          value={formatMinutes(analytics.avgResponseTimeAgent)}
          icon={Clock}
        />
        <DetailCard
          title="Tasa de Lectura"
          value={`${analytics.readRate.toFixed(1)}%`}
          icon={MessageSquare}
        />
        <DetailCard
          title="Duración Promedio"
          value={formatMinutes(analytics.avgConversationDuration)}
          icon={ClockIcon}
        />
        <DetailCard
          title="Transferidas"
          value={analytics.transferredConversations}
          icon={Users}
        />
        <DetailCard
          title="Cerradas"
          value={analytics.closedConversations}
          icon={MessageSquare}
        />
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  previous: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'emerald' | 'purple' | 'amber';
  isTime?: boolean;
  formatValue?: (value: number) => string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, previous, icon: Icon, color, isTime = false, formatValue }) => {
  let change = 0;
  let isPositive = false;
  const numericValue = typeof value === 'number' ? value : 0;
  
  if (previous > 0) {
    if (isTime) {
      // Para tiempo, menor es mejor
      change = ((previous - numericValue) / previous) * 100;
      isPositive = change > 0; // Positivo si el tiempo disminuyó
    } else {
      // Para números, mayor es mejor
      change = ((numericValue - previous) / previous) * 100;
      isPositive = change > 0;
    }
  }
  
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
  };

  const displayValue = formatValue && typeof value === 'number' ? formatValue(value) : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {previous > 0 && (
          <div className={`flex items-center space-x-1 text-xs font-medium ${
            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
        {displayValue}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {title}
      </div>
    </motion.div>
  );
};

interface ChartCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  children: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, icon: Icon, description, children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
    >
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
};

interface DetailCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}

const DetailCard: React.FC<DetailCardProps> = ({ title, value, icon: Icon }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{title}</div>
        </div>
      </div>
    </motion.div>
  );
};

export default LiveChatAnalytics;

