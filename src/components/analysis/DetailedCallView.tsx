/**
 * ============================================
 * VISTA DETALLADA DE LLAMADAS - MÓDULO ANÁLISIS IA
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/analysis/README_ANALISIS_IA.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/analysis/README_ANALISIS_IA.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/analysis/CHANGELOG_ANALISIS_IA.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chart, registerables } from 'chart.js/auto';
// RETROALIMENTACIÓN: Importaciones para el sistema de feedback
import FeedbackModal from './FeedbackModal';
import { feedbackService, type FeedbackData } from '../../services/feedbackService';
import { useAuth } from '../../contexts/AuthContext';
// NUEVAS VISTAS: Componentes para mostrar información completa
import ComplianceDataView from './ComplianceDataView';
import CustomerDataView from './CustomerDataView';
import ComplianceChart from './ComplianceChart';
import UniversalDataView from './UniversalDataView';
// REPRODUCTOR DE AUDIO: Componente para reproducir archivos WAV
import AudioPlayer from './AudioPlayer';
// Iconos
import { X, MessageSquare, Edit2, Plus } from 'lucide-react';

Chart.register(...registerables);

interface SegmentRecord {
  id: string;
  segment_index: number;
  text: string;
  etapa_script: string;
  quality_score: number;
  elementos_obligatorios?: string[];
  tecnicas_rapport?: string[];
  tipos_objeciones?: string[];
  context_text?: string;
}

interface CallRecord {
  id: string;
  agent_name: string;
  customer_name: string;
  call_type: string;
  call_result: string;
  duration: string;
  quality_score: number;
  customer_quality: string;
  organization: string;
  direction: string;
  start_time: string;
  audio_file_url?: string;
  audio_file_name?: string;
  agent_performance?: any;
  call_evaluation?: any;
  comunicacion_data?: any;
  customer_data?: any;
  service_offered?: any;
  script_analysis?: any;
  compliance_data?: any;
}

interface DashboardWidget {
  id: string;
  label: string;
  enabled: boolean;
}

interface PonderacionConfig {
  qualityScore: { weight: number };
  agentPerformance: { weight: number };
  scriptCompliance: { weight: number };
  customerSatisfaction: { weight: number };
  callOutcome: { weight: number };
}

interface DetailedCallViewProps {
  call: CallRecord;
  transcript: SegmentRecord[];
  ponderacionConfig: PonderacionConfig;
  enabledWidgets: DashboardWidget[];
  onClose: () => void;
  // RETROALIMENTACIÓN: Callback para notificar cambios al componente padre
  onFeedbackChange?: (callId: string, feedbackData: FeedbackData | null) => void;
}

type TabType = 'summary' | 'performance' | 'script' | 'compliance' | 'customer' | 'raw-data';

const DetailedCallView: React.FC<DetailedCallViewProps> = ({
  call,
  transcript,
  onClose,
  onFeedbackChange
}) => {
  const chartRefs = useRef<{ [key: string]: Chart | null }>({});
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [collapsedSegments, setCollapsedSegments] = useState<Set<string>>(new Set());
  
  // RETROALIMENTACIÓN: Estados para el sistema de feedback
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const { user } = useAuth();

  // Canvas refs para las gráficas
  const performanceCanvasRef = useRef<HTMLCanvasElement>(null);
  const summaryCanvasRef = useRef<HTMLCanvasElement>(null);

  // Inicializar todos los segmentos como colapsados
  useEffect(() => {
    setCollapsedSegments(new Set(transcript.map(segment => segment.id)));
  }, [transcript]);
  
  // RETROALIMENTACIÓN: Cargar feedback existente al abrir el componente
  useEffect(() => {
    const loadExistingFeedback = async () => {
      if (!call.id) return;
      
      try {
        setFeedbackLoading(true);
        const existingFeedback = await feedbackService.getFeedback(call.id);
        setFeedbackData(existingFeedback);
      } catch (error) {
        console.error('Error cargando retroalimentación existente:', error);
      } finally {
        setFeedbackLoading(false);
      }
    };
    
    loadExistingFeedback();
  }, [call.id]);

  const scorePonderado = call.quality_score; // Simplified for now
  
  // Removed debugging logs for security

  // Función para crear el chart (extraída para reutilización)
  const createPerformanceChartIfNeeded = useCallback(() => {
    if (activeTab !== 'performance' || !performanceCanvasRef.current) {
      return;
    }

    // Si ya existe un chart, no crear otro
    if (chartRefs.current['performance']) {
      return;
    }

    const canvas = performanceCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    
    // Destruir chart anterior si existe
    if (chartRefs.current['performance']) {
      chartRefs.current['performance']?.destroy();
    }

    const agentPerf = call.agent_performance?.datos_originales || {};
    
    // Calcular scores desde datos booleanos
    const calculateScore = (category: any) => {
      if (!category) return 0;
      const booleans = Object.values(category).filter(v => typeof v === 'boolean');
      const trueCount = booleans.filter(Boolean).length;
      return booleans.length > 0 ? (trueCount / booleans.length) * 100 : 0;
    };

    const performanceScores = {
      cierre: calculateScore(agentPerf.cierreEfectivo),
      proactividad: calculateScore(agentPerf.proactividad),
      escucha: calculateScore(agentPerf.escuchaActiva),
      informacion: calculateScore(agentPerf.manejoInformacion),
      amabilidad: calculateScore(agentPerf.amabilidadYTono)
    };
    
    try {
      const chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Cierre Efectivo', 'Proactividad', 'Escucha Activa', 'Manejo Info', 'Amabilidad'],
          datasets: [{
            label: 'Performance del Agente',
            data: [
              performanceScores.cierre,
              performanceScores.proactividad,
              performanceScores.escucha,
              performanceScores.informacion,
              performanceScores.amabilidad
            ],
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 2000,
            easing: 'easeInOutQuart'
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: {
                color: 'rgba(148, 163, 184, 0.3)'
              },
              ticks: {
                color: 'rgba(51, 65, 85, 1)'
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: 'rgba(51, 65, 85, 1)',
                font: {
                  size: 11
                }
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
      
      chartRefs.current['performance'] = chartInstance;
    } catch (error) {
      console.error('Error creando gráfica de performance:', error);
    }
  }, [activeTab, call]);

  // Callback ref para detectar cuando el canvas se monta
  const performanceCanvasCallbackRef = useCallback((node: HTMLCanvasElement | null) => {
    if (node) {
      performanceCanvasRef.current = node;
      // Si estamos en el tab de performance, crear el chart inmediatamente
      if (activeTab === 'performance') {
        setTimeout(() => {
          createPerformanceChartIfNeeded();
        }, 100);
      }
    }
  }, [activeTab, createPerformanceChartIfNeeded]);

  // Effect para crear gráfica de barras en Performance
  useEffect(() => {
    // Cleanup: destruir chart si existe cuando cambia el tab o se desmonta
    if (activeTab !== 'performance') {
      if (chartRefs.current['performance']) {
        chartRefs.current['performance']?.destroy();
        chartRefs.current['performance'] = null;
      }
      return;
    }

    // Intentar crear el chart después de un pequeño delay para asegurar que el canvas esté renderizado
    const timer = setTimeout(() => {
      createPerformanceChartIfNeeded();
    }, 300);
    
    return () => {
      clearTimeout(timer);
      if (chartRefs.current['performance']) {
        chartRefs.current['performance']?.destroy();
        chartRefs.current['performance'] = null;
      }
    };
  }, [call, activeTab, createPerformanceChartIfNeeded]);

  // Effect para crear gráfica de radar en Summary
  useEffect(() => {
    // Cleanup: destruir chart si existe cuando cambia el tab o se desmonta
    if (activeTab !== 'summary') {
      if (chartRefs.current['summary']) {
        chartRefs.current['summary']?.destroy();
        chartRefs.current['summary'] = null;
      }
      return;
    }

    if (!summaryCanvasRef.current) {
      return;
    }

    // Función para crear el chart
    const createSummaryChart = (ctx: CanvasRenderingContext2D) => {
      // Destruir chart anterior si existe
      if (chartRefs.current['summary']) {
        chartRefs.current['summary']?.destroy();
      }

      const agentPerf = call.agent_performance?.datos_originales || {};
      
      // Calcular scores desde datos booleanos
      const calculateScore = (category: any) => {
        if (!category) return 0;
        const booleans = Object.values(category).filter(v => typeof v === 'boolean');
        const trueCount = booleans.filter(Boolean).length;
        return booleans.length > 0 ? (trueCount / booleans.length) * 100 : 0;
      };

      const performanceScores = {
        cierre: calculateScore(agentPerf.cierreEfectivo),
        proactividad: calculateScore(agentPerf.proactividad),
        escucha: calculateScore(agentPerf.escuchaActiva),
        informacion: calculateScore(agentPerf.manejoInformacion),
        amabilidad: calculateScore(agentPerf.amabilidadYTono)
      };
      
      try {
        chartRefs.current['summary'] = new Chart(ctx, {
          type: 'radar',
          data: {
            labels: ['Cierre Efectivo', 'Proactividad', 'Escucha Activa', 'Manejo Info', 'Amabilidad'],
            datasets: [{
              label: 'Performance del Agente',
              data: [
                performanceScores.cierre,
                performanceScores.proactividad,
                performanceScores.escucha,
                performanceScores.informacion,
                performanceScores.amabilidad
              ],
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              borderColor: 'rgba(34, 197, 94, 1)',
              borderWidth: 2,
              pointBackgroundColor: 'rgba(34, 197, 94, 1)',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgba(34, 197, 94, 1)'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 2000,
              easing: 'easeInOutQuart'
            },
            scales: {
              r: {
                beginAtZero: true,
                max: 100,
                grid: {
                  color: 'rgba(148, 163, 184, 0.3)'
                },
                angleLines: {
                  color: 'rgba(148, 163, 184, 0.3)'
                },
                pointLabels: {
                  color: 'rgba(51, 65, 85, 1)',
                  font: {
                    size: 12,
                    weight: 500
                  }
                }
              }
            },
            plugins: {
              legend: {
                display: false
              }
            }
          }
        });
      } catch (error) {
        console.error('Error creando gráfica de summary:', error);
      }
    };

    // Esperar a que el canvas esté completamente renderizado y visible
    const timer = setTimeout(() => {
      const canvas = summaryCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Verificar que el canvas tenga dimensiones válidas
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.warn('Canvas summary tiene dimensiones cero, reintentando...');
        setTimeout(() => {
          if (summaryCanvasRef.current && activeTab === 'summary') {
            const retryCtx = summaryCanvasRef.current.getContext('2d');
            if (retryCtx) {
              createSummaryChart(retryCtx);
            }
          }
        }, 200);
        return;
      }

      createSummaryChart(ctx);
    }, 300);
    
    return () => {
      clearTimeout(timer);
      if (chartRefs.current['summary']) {
        chartRefs.current['summary']?.destroy();
        chartRefs.current['summary'] = null;
      }
    };
  }, [call, activeTab]);

  // Función para obtener color por etapa - COLORES BALANCEADOS PARA AMBOS MODOS
  const getStageColor = (etapa: string) => {
    const colors: { [key: string]: string } = {
      'saludo': 'from-blue-200 to-blue-300 dark:from-blue-600 dark:to-blue-700',
      'presentacion': 'from-indigo-200 to-indigo-300 dark:from-indigo-600 dark:to-indigo-700',
      'discovery': 'from-green-200 to-green-300 dark:from-green-600 dark:to-green-700',
      'small_talk': 'from-purple-200 to-purple-300 dark:from-purple-600 dark:to-purple-700',
      'presentacion_costos': 'from-orange-200 to-orange-300 dark:from-orange-600 dark:to-orange-700',
      'manejo_objeciones': 'from-red-200 to-red-300 dark:from-red-600 dark:to-red-700',
      'cierre': 'from-emerald-200 to-emerald-300 dark:from-emerald-600 dark:to-emerald-700',
      'despedida': 'from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700'
    };
    return colors[etapa.toLowerCase()] || 'from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700';
  };

  // Función para toggle de segmentos
  const toggleSegment = (segmentId: string) => {
    const newCollapsed = new Set(collapsedSegments);
    if (newCollapsed.has(segmentId)) {
      newCollapsed.delete(segmentId);
    } else {
      newCollapsed.add(segmentId);
    }
    setCollapsedSegments(newCollapsed);
  };

  // Función para separar conversación por roles
  const parseConversationByRoles = (text: string) => {
    const parts = text.split(/(Cliente:|Agente:)/);
    const conversations = [];
    
    for (let i = 1; i < parts.length; i += 2) {
      const role = parts[i];
      const content = parts[i + 1] || '';
      
      if (content.trim()) {
        conversations.push({
          isAgent: role === 'Agente:',
          content: content.trim()
        });
      }
    }
    
    return conversations;
  };

  // RETROALIMENTACIÓN: Funciones para manejar el feedback
  const handleOpenFeedbackModal = () => {
    setShowFeedbackModal(true);
  };
  
  const handleCloseFeedbackModal = () => {
    setShowFeedbackModal(false);
  };
  
  const handleSaveFeedback = async (newFeedbackData: FeedbackData) => {
    try {
      if (!user) {
        throw new Error('Usuario no autenticado');
      }
      
      // Guardar en la base de datos
      const savedFeedback = await feedbackService.upsertFeedback(
        call.id,
        newFeedbackData.feedback_text,
        user.id
      );
      
      // Actualizar el estado local
      setFeedbackData(savedFeedback);
      
      // RETROALIMENTACIÓN: Notificar al componente padre sobre el cambio
      if (onFeedbackChange) {
        onFeedbackChange(call.id, savedFeedback);
      }
      
      console.log('✅ Retroalimentación guardada exitosamente');
      
    } catch (error) {
      console.error('❌ Error guardando retroalimentación:', error);
      throw error; // Re-throw para que el modal pueda manejarlo
    }
  };

  /**
   * Función segura para resaltar momentos clave (XSS-safe)
   * 🔒 SEGURIDAD (Actualizado 2025-12-23): Usa React nodes en lugar de innerHTML
   */
  const escapeRegexChars = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const highlightKeyMomentsSecure = (text: string, segment: SegmentRecord): React.ReactNode => {
    // Recopilar todos los términos a resaltar con sus clases
    const highlights: Array<{ term: string; className: string }> = [];

    if (segment.elementos_obligatorios) {
      segment.elementos_obligatorios.forEach(elemento => {
        highlights.push({ 
          term: elemento.replace(/_/g, ' '), 
          className: 'bg-blue-200 dark:bg-blue-800 px-0.5 rounded' 
        });
      });
    }

    if (segment.tecnicas_rapport) {
      segment.tecnicas_rapport.forEach(tecnica => {
        highlights.push({ 
          term: tecnica.replace(/_/g, ' '), 
          className: 'bg-green-200 dark:bg-green-800 px-0.5 rounded' 
        });
      });
    }

    if (segment.tipos_objeciones) {
      segment.tipos_objeciones.forEach(objecion => {
        highlights.push({ 
          term: objecion.replace(/_/g, ' '), 
          className: 'bg-red-200 dark:bg-red-800 px-0.5 rounded' 
        });
      });
    }

    // Si no hay nada que resaltar, retornar texto plano
    if (highlights.length === 0) {
      return text;
    }

    // Crear patrón combinado para todos los términos
    const pattern = highlights
      .map(h => `(${escapeRegexChars(h.term)})`)
      .join('|');
    
    const regex = new RegExp(pattern, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;
      
      // Buscar si esta parte coincide con algún highlight
      const matchedHighlight = highlights.find(h => 
        h.term.toLowerCase() === part.toLowerCase()
      );

      if (matchedHighlight) {
        return (
          <mark key={index} className={matchedHighlight.className}>
            {part}
          </mark>
        );
      }
      
      return <span key={index}>{part}</span>;
    });
  };

  const renderPerformanceChart = () => {
    return (
      <div className="relative w-full" style={{ minHeight: '256px', height: '256px' }}>
        <canvas 
          ref={performanceCanvasCallbackRef} 
          width={800}
          height={256}
          className="w-full"
          style={{ height: '256px', display: 'block', maxWidth: '100%' }}
        ></canvas>
      </div>
    );
  };

  const renderSummaryChart = () => {
    return (
      <div className="relative h-64 w-full" style={{ minHeight: '256px' }}>
        <canvas 
          ref={summaryCanvasRef} 
          width={800}
          height={256}
          className="w-full"
          style={{ maxHeight: '256px', display: 'block' }}
        ></canvas>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <div className="flex h-full">
              {/* Left Sidebar - Conversation */}
              <div className="w-1/2 px-8 py-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto scrollbar-hide">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2 text-blue-500" />
                  Conversación por Turnos
                </h3>
              </div>
              <div className="space-y-4">
                {transcript.map((segment) => {
                  const conversations = parseConversationByRoles(segment.text);
                  const isCollapsed = collapsedSegments.has(segment.id);
                  const stageColor = getStageColor(segment.etapa_script);
                  
                  return (
                    <motion.div
                      key={segment.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * segment.segment_index }}
                      className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Header del segmento con código de color */}
                      <div 
                        className={`bg-gradient-to-r ${stageColor} px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity`}
                        onClick={() => toggleSegment(segment.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <svg 
                              className={`w-4 h-4 text-gray-900 dark:text-white transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-90'}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              Segmento {segment.segment_index} • {segment.etapa_script.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs px-2 py-1 bg-gray-900 bg-opacity-20 dark:bg-white dark:bg-opacity-20 text-gray-900 dark:text-white rounded-full">
                            Q: {segment.quality_score}
                          </span>
                        </div>
                        
                        {/* Contexto cuando está colapsado */}
                        {isCollapsed && (
                          <div className="mt-2 text-xs text-gray-900 dark:text-white opacity-90">
                            <div className="bg-gray-900 bg-opacity-10 dark:bg-white dark:bg-opacity-10 rounded p-2">
                              {segment.context_text || 'Resumen del contexto del segmento'}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Contenido expandido */}
                      {!isCollapsed && (
                        <>
                          {/* Badges */}
                          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex flex-wrap gap-1">
                              {segment.elementos_obligatorios?.map(elemento => (
                                <span key={elemento} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                                  {elemento.replace('_', ' ')}
                                </span>
                              ))}
                              {segment.tecnicas_rapport?.map(tecnica => (
                                <span key={tecnica} className="text-xs px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                                  {tecnica.replace('_', ' ')}
                                </span>
                              ))}
                              {segment.tipos_objeciones?.map(objecion => (
                                <span key={objecion} className="text-xs px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                                  {objecion.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Conversaciones */}
                          <div className="p-4 space-y-3 bg-white dark:bg-gray-800">
                            {conversations.map((conv, convIndex) => (
                              <div key={convIndex} className={`flex ${conv.isAgent ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg ${
                                  conv.isAgent 
                                    ? 'bg-blue-400 dark:bg-blue-500 text-white rounded-br-none' 
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-none'
                                }`}>
                                  <div className="text-xs font-medium mb-1 opacity-75">
                                    {conv.isAgent ? 'Agente' : 'Cliente'}
                                  </div>
                                  <div className="text-sm leading-relaxed">
                                    {highlightKeyMomentsSecure(conv.content, segment)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Right Sidebar - Analytics */}
            <div className="w-1/2 px-8 py-6 overflow-y-auto scrollbar-hide">
              {/* Resumen de la llamada */}
              {call.call_evaluation?.analisisGeneral && (
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Resumen de la Llamada
                    </h3>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                    {call.call_evaluation.analisisGeneral.descripcion && (
                      <div className="mb-3">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {call.call_evaluation.analisisGeneral.descripcion}
                        </p>
                      </div>
                    )}
                    {call.call_evaluation.analisisGeneral.puntosClave && (
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">Puntos Clave:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {call.call_evaluation.analisisGeneral.puntosClave.map((punto: string, index: number) => (
                            <li key={index} className="text-xs text-slate-600 dark:text-slate-400">{punto}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* REPRODUCTOR DE AUDIO - Posicionado entre resumen y métricas */}
              <div className="mb-6">
                {call.audio_file_url ? (
                  <AudioPlayer
                    audioFileUrl={call.audio_file_url}
                    callId={call.id}
                    customerName={call.customer_name}
                  />
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M9 9a3 3 0 000 6h3v5a1 1 0 102 0v-5h3a3 3 0 000-6H9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Audio no disponible para esta llamada
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Análisis y Métricas
                </h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-5 rounded-xl border border-blue-200 dark:border-blue-800"
                  >
                    <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Calidad</h4>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{call.quality_score}</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-5 rounded-xl border border-emerald-200 dark:border-emerald-800"
                  >
                    <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Score Ponderado</h4>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{scorePonderado.toFixed(1)}</p>
                  </motion.div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Performance del Agente</h4>
                  {renderSummaryChart()}
                </div>
              </div>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="px-8 py-6 space-y-6">
            
            {/* Gráfico principal - MOVIDO AL TOP */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Gráfica de Performance
                </h3>
              </div>
              {renderPerformanceChart()}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score General */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Score General
                  </h3>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {call.agent_performance?.score_ponderado || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score Ponderado del Agente</div>
                </div>
              </motion.div>

              {/* Fortalezas */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Fortalezas
                  </h3>
                </div>
                <div className="space-y-2">
                  {call.agent_performance?.areas_performance?.fortalezas?.length > 0 ? (
                    call.agent_performance.areas_performance.fortalezas.map((fortaleza: string, index: number) => (
                      <div key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                        <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">
                          {fortaleza.replace('_', ' ')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500 dark:text-slate-400">No se identificaron fortalezas específicas</span>
                  )}
                </div>
              </motion.div>

              {/* Debilidades */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-red-500 to-pink-500 rounded-full"></div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Áreas de Mejora
                  </h3>
                </div>
                <div className="space-y-2">
                  {call.agent_performance?.areas_performance?.debilidades?.map((debilidad: string, index: number) => (
                    <div key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                      <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">
                        {debilidad.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* PERFORMANCE COMPLETO DEL AGENTE - MOVIDO AL FINAL Y EXPANDIDO POR DEFECTO */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center space-x-2">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Performance Completo del Agente
                </h3>
              </div>
              <UniversalDataView
                data={call.agent_performance || {}}
                title=""
                icon={null}
                className=""
              />
            </motion.div>

          </div>
        );

      case 'script':
        return (
          <div className="px-8 py-6 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Análisis de Script
                </h3>
              </div>
              
              <div className="space-y-6">
                {/* Balance FODA - MOVIDO ANTES DE ETAPAS */}
                {call.call_evaluation?.metricas_foda && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 p-5 rounded-xl border border-indigo-200 dark:border-indigo-800"
                  >
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Balance FODA</h4>
                    <div className="flex justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-indigo-600">{call.call_evaluation.metricas_foda.balance_foda}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Score Balance</div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Métricas de etapas de comunicacion_data */}
                {call.comunicacion_data?.metricas_chunks?.conteo_etapas && (
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Etapas de Conversación</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(call.comunicacion_data.metricas_chunks.conteo_etapas).map(([etapa, count]) => (
                        <div key={etapa} className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-blue-600">{String(count)}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                            {etapa.replace('_', ' ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FODA de call_evaluation */}
                {call.call_evaluation?.FODA && (
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Análisis FODA</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <h5 className="font-semibold text-green-800 dark:text-green-300 mb-2">Fortalezas</h5>
                        {call.call_evaluation.FODA.fortalezas?.length > 0 ? (
                          <ul className="space-y-1">
                            {call.call_evaluation.FODA.fortalezas.map((item: string, index: number) => (
                              <li key={index} className="text-sm text-green-700 dark:text-green-300">• {item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-green-600 dark:text-green-400">No se identificaron fortalezas</p>
                        )}
                      </div>
                      
                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                        <h5 className="font-semibold text-red-800 dark:text-red-300 mb-2">Debilidades</h5>
                        {call.call_evaluation.FODA.debilidades?.length > 0 ? (
                          <ul className="space-y-1">
                            {call.call_evaluation.FODA.debilidades.map((item: string, index: number) => (
                              <li key={index} className="text-sm text-red-700 dark:text-red-300">• {item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-red-600 dark:text-red-400">No se identificaron debilidades</p>
                        )}
                      </div>
                      
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Oportunidades</h5>
                        {call.call_evaluation.FODA.oportunidades?.length > 0 ? (
                          <ul className="space-y-1">
                            {call.call_evaluation.FODA.oportunidades.map((item: string, index: number) => (
                              <li key={index} className="text-sm text-blue-700 dark:text-blue-300">• {item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-blue-600 dark:text-blue-400">No se identificaron oportunidades</p>
                        )}
                      </div>
                      
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                        <h5 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Amenazas</h5>
                        {call.call_evaluation.FODA.amenazas?.length > 0 ? (
                          <ul className="space-y-1">
                            {call.call_evaluation.FODA.amenazas.map((item: string, index: number) => (
                              <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300">• {item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-yellow-600 dark:text-yellow-400">No se identificaron amenazas</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* SECCIONES MOVIDAS DESDE COMPLIANCE */}
            <div className="space-y-6">
              
              {/* Resumen de Objeciones - EXPANDIDO POR DEFECTO */}
              {call.call_evaluation?.objeciones_resumen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-1 h-5 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Resumen de Objeciones
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(call.call_evaluation.objeciones_resumen).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:
                        </span>
                        <span className="text-sm text-slate-900 dark:text-white ml-4">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Problemas Detectados - EXPANDIDO POR DEFECTO */}
              {call.call_evaluation?.problemas_detectados && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-1 h-5 bg-gradient-to-b from-red-500 to-pink-500 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Problemas Detectados
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(call.call_evaluation.problemas_detectados).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:
                        </span>
                        <span className="text-sm text-slate-900 dark:text-white ml-4">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              
            </div>

            {/* PATRONES DE COMUNICACIÓN - MOVIDO DESDE CUSTOMER */}
            <UniversalDataView
              data={call.comunicacion_data || {}}
              title="Datos de Comunicación"
              icon={
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
            />

          </div>
        );

      case 'compliance':
        return (
          <div className="px-8 py-6 space-y-6">
            
            {/* Gráfica de Cumplimiento Normativo - MOVIDA DESDE SCRIPT */}
            {(call as any).compliance_data && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Cumplimiento Normativo
                  </h3>
                </div>
                
                <ComplianceChart 
                  complianceData={(call as any).compliance_data}
                />
              </motion.div>
            )}

            {/* DATOS DE COMPLIANCE */}
            <UniversalDataView
              data={call.compliance_data || {}}
              title="Datos de Compliance"
              icon={
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
            />
            
            
            {/* SECCIONES ESPECÍFICAS MOVIDAS DESDE SCRIPT */}
            <div className="space-y-6">

              {/* Problemas Detectados - EXPANDIDO POR DEFECTO */}
              {call.call_evaluation?.problemas_detectados && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-1 h-5 bg-gradient-to-b from-red-500 to-pink-500 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Problemas Detectados
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(call.call_evaluation.problemas_detectados).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:
                        </span>
                        <span className="text-sm text-slate-900 dark:text-white ml-4">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              
            </div>
            
          </div>
        );

      case 'customer':
        return (
          <div className="px-8 py-6 space-y-6">
            
            {/* DATOS DEL CLIENTE */}
            <UniversalDataView
              data={call.customer_data || {}}
              title="Información del Cliente"
              icon={
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            
            {/* SERVICIO OFRECIDO */}
            <UniversalDataView
              data={call.service_offered || {}}
              title="Servicio Ofrecido"
              icon={
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
            />
            
            
          </div>
        );

      case 'raw-data':
        return (
          <div className="px-8 py-6 space-y-6">
            
            {/* TODOS LOS DATOS ESTRUCTURADOS */}
            <UniversalDataView
              data={{
                informacion_basica: {
                  id: call.id,
                  verint_id: call.verint_id,
                  crm_id: call.crm_id,
                  agent_id: call.agent_id,
                  agent_name: call.agent_name,
                  customer_name: call.customer_name,
                  phone_numbers: call.phone_numbers,
                  call_type: call.call_type,
                  call_result: call.call_result,
                  requires_followup: call.requires_followup,
                  start_time: call.start_time,
                  end_time: call.end_time,
                  duration: call.duration,
                  quality_score: call.quality_score,
                  organization: call.organization,
                  direction: call.direction
                },
                datos_jsonb: {
                  customer_quality: call.customer_quality,
                  comunicacion_data: call.comunicacion_data,
                  customer_data: call.customer_data,
                  service_offered: call.service_offered,
                  agent_performance: call.agent_performance,
                  script_analysis: call.script_analysis,
                  call_evaluation: call.call_evaluation,
                  compliance_data: call.compliance_data
                },
                metadatos: {
                  call_summary: call.call_summary,
                  schema_version: call.schema_version,
                  created_at: call.created_at,
                  updated_at: call.updated_at,
                  audio_file_name: call.audio_file_name,
                  audio_file_url: call.audio_file_url
                }
              }}
              title="Todos los Datos Técnicos"
              icon={
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              }
            />
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-1 h-5 bg-gradient-to-b from-gray-500 to-gray-600 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Datos Técnicos Completos
                </h3>
              </div>
              
              <div className="space-y-6">
                {/* Metadatos principales */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-300">ID</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 truncate">{call.id}</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                    <div className="text-sm font-medium text-green-800 dark:text-green-300">Duración</div>
                    <div className="text-xs text-green-600 dark:text-green-400">{call.duration}</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
                    <div className="text-sm font-medium text-purple-800 dark:text-purple-300">Calidad</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">{call.quality_score}</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg text-center">
                    <div className="text-sm font-medium text-orange-800 dark:text-orange-300">Dirección</div>
                    <div className="text-xs text-orange-600 dark:text-orange-400">{call.direction}</div>
                  </div>
                  <div className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-lg text-center">
                    <div className="text-sm font-medium text-teal-800 dark:text-teal-300">Resultado</div>
                    <div className="text-xs text-teal-600 dark:text-teal-400">{call.call_result}</div>
                  </div>
                </div>

                {/* JSON completo */}
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                    <div className="w-3 h-3 bg-slate-500 rounded-full mr-2"></div>
                    Datos Completos (JSON)
                  </h4>
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                    <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap text-slate-700 dark:text-slate-300 scrollbar-hide">
                      {JSON.stringify(call, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        );

      default:
        return (
          <div className="p-6">
            <div className="text-center text-slate-500 dark:text-slate-400">
              Contenido de la pestaña en desarrollo
            </div>
          </div>
        );
    }
  };

  const tabs = [
    { id: 'summary', label: 'Análisis Completo' },
    { id: 'performance', label: 'Performance Detallado' },
    { id: 'script', label: 'Análisis de Script' },
    { id: 'compliance', label: 'Datos de Compliance' },
    { id: 'customer', label: 'Información del Cliente' },
    { id: 'raw-data', label: 'Datos Técnicos' }
  ];

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key="detailed-call-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4 lg:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl lg:max-w-[85rem] xl:max-w-[90rem] h-full max-h-[92vh] flex flex-col border border-gray-100 dark:border-gray-800 overflow-hidden"
          >
          {/* Header */}
          <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <motion.h2
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl font-bold text-gray-900 dark:text-white mb-1"
                >
                  Análisis Detallado
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed"
                >
                  <span className="font-medium text-gray-700 dark:text-gray-300">{call.customer_name}</span> • Agente: {call.agent_name} • {call.call_type} • {call.direction}
                </motion.p>
              </div>
              
              {/* RETROALIMENTACIÓN: Botones del header */}
              <div className="flex items-center gap-3 ml-4">
                {/* Botón de Retroalimentación */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleOpenFeedbackModal}
                  disabled={feedbackLoading}
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 shadow-lg ${
                    feedbackData 
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white' 
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  title={feedbackData ? 'Editar retroalimentación existente' : 'Agregar retroalimentación'}
                >
                  {feedbackLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Cargando...</span>
                    </>
                  ) : feedbackData ? (
                    <>
                      <Edit2 className="w-4 h-4" />
                      <span className="text-sm">Editar Retro</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span className="text-sm">Retroalimentación</span>
                    </>
                  )}
                </motion.button>
                
                {/* Botón de Cerrar */}
                <motion.button
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.25 }}
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group"
                  title="Cerrar análisis detallado"
                >
                  <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <nav className="flex space-x-1 px-8 overflow-x-auto scrollbar-hide">
              {tabs.map((tab, index) => (
                <motion.button
                  key={tab.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`relative py-4 px-4 font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-full"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ minHeight: '100%' }}
                onAnimationComplete={() => {
                  // Forzar creación del chart después de la animación
                  if (activeTab === 'performance') {
                    setTimeout(() => {
                      createPerformanceChartIfNeeded();
                    }, 100);
                  }
                }}
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
      
      {/* RETROALIMENTACIÓN: Modal de feedback - Fuera del AnimatePresence */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={handleCloseFeedbackModal}
        callId={call.id}
        callInfo={{
          customer_name: call.customer_name,
          agent_name: call.agent_name,
          call_type: call.call_type,
          start_time: call.start_time
        }}
        existingFeedback={feedbackData}
        onSave={handleSaveFeedback}
      />
    </>
  );
};

export default DetailedCallView;
