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
  ArrowDownRight
} from 'lucide-react';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
import { analysisSupabase } from '../../config/analysisSupabase';
import { useAuth } from '../../contexts/AuthContext';
import { permissionsService } from '../../services/permissionsService';

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

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Aplicar filtros de permisos según el rol del usuario
      let prospectoIdsFilter: string[] | null = null;
      
      if (user?.id) {
        const coordinacionFilter = await permissionsService.getCoordinacionFilter(user.id);
        const ejecutivoFilter = await permissionsService.getEjecutivoFilter(user.id);
        
        if (ejecutivoFilter) {
          // Ejecutivo: solo prospectos asignados a él
          const { data: ejecutivoProspectos } = await analysisSupabase
            .from('prospectos')
            .select('id')
            .eq('ejecutivo_id', ejecutivoFilter);
          
          prospectoIdsFilter = ejecutivoProspectos?.map(p => p.id) || [];
        } else if (coordinacionFilter) {
          // Coordinador: todos los prospectos de su coordinación
          const { data: coordinacionProspectos } = await analysisSupabase
            .from('prospectos')
            .select('id')
            .eq('coordinacion_id', coordinacionFilter);
          
          prospectoIdsFilter = coordinacionProspectos?.map(p => p.id) || [];
        }
        // Admin: sin filtros (prospectoIdsFilter = null)
      }
      
      // 1. Cargar conversaciones_whatsapp (bloques de 24 horas con resumen)
      let conversationsQuery = analysisSupabase
        .from('conversaciones_whatsapp')
        .select('*')
        .gte('fecha_inicio', startDate.toISOString());
      
      // Aplicar filtro de prospectos si es necesario
      if (prospectoIdsFilter !== null) {
        if (prospectoIdsFilter.length === 0) {
          // Si no hay prospectos asignados, retornar métricas vacías
          setAnalytics({
            totalConversations: 0,
            activeConversations: 0,
            transferredConversations: 0,
            closedConversations: 0,
            handoffRate: 0,
            conversationTrends: [],
            messageDistribution: [],
            avgResponseTime: 0,
            avgResponseTimeBot: 0,
            avgResponseTimeAgent: 0,
            peakHours: [],
            priorityDistribution: [],
            readRate: 0,
            avgConversationDuration: 0,
            previousPeriod: {
              totalConversations: 0,
              activeConversations: 0,
              avgResponseTime: 0
            }
          });
          setLoading(false);
          return;
        }
        conversationsQuery = conversationsQuery.in('prospecto_id', prospectoIdsFilter);
      }
      
      const { data: conversations, error: convError } = await conversationsQuery
        .order('fecha_inicio', { ascending: false });

      if (convError) throw convError;

      // 2. Cargar mensajes_whatsapp (mensajes de las últimas 24 horas)
      let messagesQuery = analysisSupabase
        .from('mensajes_whatsapp')
        .select('*')
        .gte('fecha_hora', startDate.toISOString());
      
      // Aplicar filtro de prospectos si es necesario
      if (prospectoIdsFilter !== null && prospectoIdsFilter.length > 0) {
        messagesQuery = messagesQuery.in('prospecto_id', prospectoIdsFilter);
      }
      
      const { data: messages, error: msgError } = await messagesQuery
        .order('fecha_hora', { ascending: true });

      if (msgError) throw msgError;
      
      // 3. Cargar prospectos para información del lead
      const prospectoIds = [...new Set([
        ...(conversations?.map((c: any) => c.prospecto_id) || []),
        ...(messages?.map((m: any) => m.prospecto_id) || [])
      ].filter(Boolean))];
      
      if (prospectoIds.length === 0) {
        // Si no hay prospectos, retornar métricas vacías
        setAnalytics({
          totalConversations: 0,
          activeConversations: 0,
          transferredConversations: 0,
          closedConversations: 0,
          handoffRate: 0,
          conversationTrends: [],
          messageDistribution: [],
          avgResponseTime: 0,
          avgResponseTimeBot: 0,
          avgResponseTimeAgent: 0,
          peakHours: [],
          priorityDistribution: [],
          readRate: 0,
          avgConversationDuration: 0,
          previousPeriod: {
            totalConversations: 0,
            activeConversations: 0,
            avgResponseTime: 0
          }
        });
        setLoading(false);
        return;
      }
      
      const { data: prospectos, error: prospectosError } = await analysisSupabase
        .from('prospectos')
        .select('id, nombre_completo, nombre_whatsapp, whatsapp, etapa, created_at')
        .in('id', prospectoIds);

      if (prospectosError) throw prospectosError;
      
      // Crear mapa de prospectos para acceso rápido
      const prospectosMap = new Map(prospectos?.map((p: any) => [p.id, p]) || []);
      
      // Enriquecer conversaciones con datos de prospectos
      const enrichedConversations = conversations?.map((conv: any) => {
        const prospecto = prospectosMap.get(conv.prospecto_id);
        return {
          ...conv,
          customer_name: prospecto?.nombre_completo || prospecto?.nombre_whatsapp || conv.nombre_contacto,
          customer_phone: prospecto?.whatsapp || conv.numero_telefono,
          etapa: prospecto?.etapa || conv.estado_prospecto,
          prospecto_created_at: prospecto?.created_at
        };
      }) || [];

      // Calcular métricas desde conversaciones_whatsapp
      const totalConversations = enrichedConversations?.length || 0;
      const activeConversations = enrichedConversations?.filter(c => c.estado === 'activa').length || 0;
      const transferredConversations = enrichedConversations?.filter(c => c.estado === 'transferida').length || 0;
      const closedConversations = enrichedConversations?.filter(c => c.estado === 'finalizada').length || 0;
      
      // Tendencias por día (basado en fecha_inicio de los bloques)
      const conversationTrends = calculateTrends(enrichedConversations || [], days);
      
      // Distribución de mensajes
      const messageDistribution = calculateMessageDistribution(messages || []);
      
      // Tiempo de respuesta
      const responseTimes = calculateResponseTimes(messages || []);
      
      // Horas pico
      const peakHours = calculatePeakHours(messages || []);
      
      // Prioridades
      const priorityDistribution = calculatePriorityDistribution(conversations || []);
      
      // Tasa de lectura
      const readRate = calculateReadRate(messages || []);
      
      // Duración promedio de conversaciones (basado en fecha_inicio y fecha_fin de bloques)
      const avgConversationDuration = calculateAvgDuration(enrichedConversations || []);
      
      // Comparativa con período anterior
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - days);
      const previousEndDate = new Date(startDate);
      
      // Obtener conversaciones del período anterior (con filtros de permisos)
      let previousConversationsQuery = analysisSupabase
        .from('conversaciones_whatsapp')
        .select('*')
        .gte('fecha_inicio', previousStartDate.toISOString())
        .lt('fecha_inicio', previousEndDate.toISOString());
      
      if (prospectoIdsFilter !== null && prospectoIdsFilter.length > 0) {
        previousConversationsQuery = previousConversationsQuery.in('prospecto_id', prospectoIdsFilter);
      }
      
      const { data: previousConversations } = await previousConversationsQuery;
      
      const previousConversationsFormatted = previousConversations?.map((conv: any) => ({
        id: conv.id,
        estado: conv.estado,
        fecha_inicio: conv.fecha_inicio
      })) || [];
      
      // Obtener mensajes del período anterior (con filtros de permisos)
      let previousMessagesQuery = analysisSupabase
        .from('mensajes_whatsapp')
        .select('*')
        .gte('fecha_hora', previousStartDate.toISOString())
        .lt('fecha_hora', previousEndDate.toISOString());
      
      if (prospectoIdsFilter !== null && prospectoIdsFilter.length > 0) {
        previousMessagesQuery = previousMessagesQuery.in('prospecto_id', prospectoIdsFilter);
      }
      
      const { data: previousMessages } = await previousMessagesQuery;
      
      const previousResponseTimes = calculateResponseTimes(previousMessages || []);
      
      setAnalytics({
        totalConversations,
        activeConversations,
        transferredConversations,
        closedConversations,
        handoffRate: totalConversations > 0 ? (transferredConversations / totalConversations) * 100 : 0,
        conversationTrends,
        messageDistribution,
        avgResponseTime: responseTimes.overall,
        avgResponseTimeBot: responseTimes.bot,
        avgResponseTimeAgent: responseTimes.agent,
        peakHours,
        priorityDistribution,
        readRate,
        avgConversationDuration,
        previousPeriod: {
          totalConversations: previousConversationsFormatted?.length || 0,
          activeConversations: previousConversationsFormatted?.filter(c => c.estado === 'activa').length || 0,
          avgResponseTime: previousResponseTimes.overall
        }
      });
    } catch (error) {
      console.error('Error cargando analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrends = (conversations: any[], days: number) => {
    const trends: { [key: string]: number } = {};
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      trends[dateKey] = 0;
    }
    
    conversations.forEach(conv => {
      // conversaciones_whatsapp usa fecha_inicio para el bloque de 24h
      const convDate = conv.fecha_inicio || conv.created_at || conv.fecha_creacion_prospecto;
      if (convDate) {
        const dateKey = new Date(convDate).toISOString().split('T')[0];
        if (trends[dateKey] !== undefined) {
          trends[dateKey]++;
        }
      }
    });
    
    return Object.entries(trends)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        count
      }));
  };

  const calculateMessageDistribution = (messages: any[]) => {
    const distribution: { [key: string]: number } = {
      customer: 0,
      bot: 0,
      agent: 0
    };
    
    messages.forEach(msg => {
      // mensajes_whatsapp usa 'rol' con valores: 'Prospecto', 'AI', 'Asesor'
      const role = msg.rol;
      if (role === 'Prospecto') {
        distribution.customer++;
      } else if (role === 'AI') {
        distribution.bot++;
      } else if (role === 'Asesor') {
        distribution.agent++;
      }
    });
    
    return Object.entries(distribution).map(([sender_type, count]) => ({
      sender_type: sender_type === 'customer' ? 'Cliente' : sender_type === 'bot' ? 'Bot' : 'Agente',
      count
    }));
  };

  const calculateResponseTimes = (messages: any[]) => {
    let totalTime = 0;
    let count = 0;
    let botTime = 0;
    let botCount = 0;
    let agentTime = 0;
    let agentCount = 0;
    
    // Agrupar mensajes por conversacion_id (bloques de 24h) o prospecto_id
    const messagesByConversation: { [key: string]: any[] } = {};
    messages.forEach(msg => {
      const convId = msg.conversacion_id || msg.prospecto_id;
      if (convId) {
        if (!messagesByConversation[convId]) {
          messagesByConversation[convId] = [];
        }
        messagesByConversation[convId].push(msg);
      }
    });
    
    // Calcular tiempos de respuesta por conversación
    Object.values(messagesByConversation).forEach(convMessages => {
      const sortedMessages = convMessages.sort((a, b) => {
        const dateA = a.fecha_hora || a.created_at;
        const dateB = b.fecha_hora || b.created_at;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });
      
      for (let i = 0; i < sortedMessages.length - 1; i++) {
        const currentMsg = sortedMessages[i];
        const nextMsg = sortedMessages[i + 1];
        
        // mensajes_whatsapp usa 'rol' con valores: 'Prospecto', 'AI', 'Asesor'
        const currentRole = currentMsg.rol;
        const nextRole = nextMsg.rol;
        
        // Solo calcular si el mensaje actual es del prospecto y el siguiente no
        if (currentRole === 'Prospecto' && nextRole !== 'Prospecto') {
          const currentDate = currentMsg.fecha_hora;
          const nextDate = nextMsg.fecha_hora;
          const responseTime = new Date(nextDate).getTime() - new Date(currentDate).getTime();
          const minutes = responseTime / (1000 * 60);
          
          if (minutes > 0 && minutes < 1440) { // Menos de 24 horas
            totalTime += minutes;
            count++;
            
            if (nextRole === 'AI') {
              botTime += minutes;
              botCount++;
            } else if (nextRole === 'Asesor') {
              agentTime += minutes;
              agentCount++;
            }
          }
        }
      }
    });
    
    return {
      overall: count > 0 ? totalTime / count : 0,
      bot: botCount > 0 ? botTime / botCount : 0,
      agent: agentCount > 0 ? agentTime / agentCount : 0
    };
  };

  const calculatePeakHours = (messages: any[]) => {
    const hours: { [key: number]: number } = {};
    
    for (let i = 0; i < 24; i++) {
      hours[i] = 0;
    }
    
    messages.forEach(msg => {
      const date = msg.fecha_hora || msg.created_at;
      const hour = new Date(date).getHours();
      hours[hour]++;
    });
    
    return Object.entries(hours)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 horas
  };

  const calculatePriorityDistribution = (conversations: any[]) => {
    // conversaciones_whatsapp no tiene campo priority, usamos resultado o intencion
    // Agrupar por resultado o intencion para distribución
    const distribution: { [key: string]: number } = {};
    
    conversations.forEach(conv => {
      const key = conv.resultado || conv.intencion || 'Sin clasificar';
      distribution[key] = (distribution[key] || 0) + 1;
    });
    
    // Ordenar por count y tomar los top 4
    return Object.entries(distribution)
      .map(([priority, count]) => ({ priority, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map(item => ({
        priority: item.priority.charAt(0).toUpperCase() + item.priority.slice(1),
        count: item.count
      }));
  };

  const calculateReadRate = (messages: any[]) => {
    const totalMessages = messages.length;
    // mensajes_whatsapp usa 'leido' en lugar de 'is_read'
    const readMessages = messages.filter(msg => msg.leido || msg.is_read).length;
    return totalMessages > 0 ? (readMessages / totalMessages) * 100 : 0;
  };

  const calculateAvgDuration = (conversations: any[]) => {
    // conversaciones_whatsapp tiene fecha_inicio y fecha_fin (bloques de 24h)
    // También puede usar last_message_at para duración real
    const durations = conversations
      .filter(c => c.fecha_inicio && (c.fecha_fin || c.last_message_at))
      .map(c => {
        const start = new Date(c.fecha_inicio).getTime();
        const end = new Date(c.fecha_fin || c.last_message_at).getTime();
        return (end - start) / (1000 * 60); // minutos
      })
      .filter(d => d > 0 && d < 1440); // menos de 24 horas (duración del bloque)
    
    return durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
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
                'rgba(16, 185, 129, 0.8)',
                'rgba(59, 130, 246, 0.8)',
                'rgba(139, 92, 246, 0.8)'
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
      <div className="flex items-center justify-center h-96 text-slate-500">
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
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Analíticas</h2>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Métricas y estadísticas del sistema de chat</p>
        </div>
        <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-slate-900 dark:bg-gray-700 text-white'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
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
      className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-6"
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
      <div className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">
        {displayValue}
      </div>
      <div className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wide">
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
      className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-6"
    >
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-slate-100 dark:bg-gray-700 rounded-lg">
          <Icon className="w-5 h-5 text-slate-600 dark:text-gray-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-gray-400">{description}</p>
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
      className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-4"
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-slate-100 dark:bg-gray-700 rounded-lg">
          <Icon className="w-4 h-4 text-slate-600 dark:text-gray-300" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{value}</div>
          <div className="text-xs text-slate-500 dark:text-gray-400">{title}</div>
        </div>
      </div>
    </motion.div>
  );
};

export default LiveChatAnalytics;

