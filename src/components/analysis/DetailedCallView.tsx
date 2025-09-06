import React, { useRef, useEffect, useState } from 'react';
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

  // Effect para crear gráfica de barras en Performance
  useEffect(() => {
    if (performanceCanvasRef.current && activeTab === 'performance') {
      const ctx = performanceCanvasRef.current.getContext('2d');
      if (ctx) {
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
        
        chartRefs.current['performance'] = new Chart(ctx, {
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
      }
    }
  }, [call, activeTab]);

  // Effect para crear gráfica de radar en Summary
  useEffect(() => {
    if (summaryCanvasRef.current && activeTab === 'summary') {
      const ctx = summaryCanvasRef.current.getContext('2d');
      if (ctx) {
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
      }
    }
  }, [call, activeTab]);

  // Función para obtener color por etapa
  const getStageColor = (etapa: string) => {
    const colors: { [key: string]: string } = {
      'saludo': 'from-blue-500 to-blue-600',
      'presentacion': 'from-indigo-500 to-indigo-600',
      'discovery': 'from-green-500 to-green-600',
      'small_talk': 'from-purple-500 to-purple-600',
      'presentacion_costos': 'from-orange-500 to-orange-600',
      'manejo_objeciones': 'from-red-500 to-red-600',
      'cierre': 'from-emerald-500 to-emerald-600',
      'despedida': 'from-slate-500 to-slate-600'
    };
    return colors[etapa.toLowerCase()] || 'from-gray-500 to-gray-600';
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

  // Función para resaltar momentos clave
  const highlightKeyMoments = (text: string, segment: SegmentRecord) => {
    let highlightedText = text;

    if (segment.elementos_obligatorios) {
      segment.elementos_obligatorios.forEach(elemento => {
        const regex = new RegExp(`(${elemento.replace('_', ' ')})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="bg-blue-200 dark:bg-blue-800">$1</mark>');
      });
    }

    if (segment.tecnicas_rapport) {
      segment.tecnicas_rapport.forEach(tecnica => {
        const regex = new RegExp(`(${tecnica.replace('_', ' ')})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="bg-green-200 dark:bg-green-800">$1</mark>');
      });
    }

    if (segment.tipos_objeciones) {
      segment.tipos_objeciones.forEach(objecion => {
        const regex = new RegExp(`(${objecion.replace('_', ' ')})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="bg-red-200 dark:bg-red-800">$1</mark>');
      });
    }

    return highlightedText;
  };

  const renderPerformanceChart = () => {
    return (
      <div className="relative h-64">
        <canvas ref={performanceCanvasRef} className="w-full h-full"></canvas>
      </div>
    );
  };

  const renderSummaryChart = () => {
    return (
      <div className="relative h-64">
        <canvas ref={summaryCanvasRef} className="w-full h-full"></canvas>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <div className="flex h-full">
              {/* Left Sidebar - Conversation */}
              <div className="w-1/2 p-6 border-r border-slate-200 dark:border-slate-700 overflow-y-auto analysis-scroll">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                Conversación por Turnos
              </h3>
              <div className="space-y-4">
                {transcript.map((segment) => {
                  const conversations = parseConversationByRoles(segment.text);
                  const isCollapsed = collapsedSegments.has(segment.id);
                  const stageColor = getStageColor(segment.etapa_script);
                  
                  return (
                    <div key={segment.id} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                      {/* Header del segmento con código de color */}
                      <div 
                        className={`bg-gradient-to-r ${stageColor} px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity`}
                        onClick={() => toggleSegment(segment.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <svg 
                              className={`w-4 h-4 text-white transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-90'}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-sm font-medium text-white">
                              Segmento {segment.segment_index} • {segment.etapa_script.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs px-2 py-1 bg-white bg-opacity-20 text-white rounded-full">
                            Q: {segment.quality_score}
                          </span>
                        </div>
                        
                        {/* Contexto cuando está colapsado */}
                        {isCollapsed && (
                          <div className="mt-2 text-xs text-white opacity-90">
                            <div className="bg-white bg-opacity-10 rounded p-2">
                              {segment.context_text || 'Resumen del contexto del segmento'}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Contenido expandido */}
                      {!isCollapsed && (
                        <>
                          {/* Badges */}
                          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
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
                          <div className="p-4 space-y-3 bg-white dark:bg-slate-800">
                            {conversations.map((conv, convIndex) => (
                              <div key={convIndex} className={`flex ${conv.isAgent ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg ${
                                  conv.isAgent 
                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-none'
                                }`}>
                                  <div className="text-xs font-medium mb-1 opacity-75">
                                    {conv.isAgent ? 'Agente' : 'Cliente'}
                                  </div>
                                  <div 
                                    className="text-sm leading-relaxed"
                                    dangerouslySetInnerHTML={{ 
                                      __html: highlightKeyMoments(conv.content, segment) 
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Sidebar - Analytics */}
            <div className="w-1/2 p-6 overflow-y-auto analysis-scroll">
              {/* Resumen de la llamada */}
              {call.call_evaluation?.analisisGeneral && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    Resumen de la Llamada
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
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

              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                Análisis y Métricas
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Calidad</h4>
                    <p className="text-2xl font-bold text-blue-600">{call.quality_score}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Score Ponderado</h4>
                    <p className="text-2xl font-bold text-green-600">{scorePonderado.toFixed(1)}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Performance del Agente</h4>
                  {renderSummaryChart()}
                </div>
              </div>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="p-6 space-y-6">
            
            {/* PERFORMANCE COMPLETO DEL AGENTE */}
            <UniversalDataView
              data={call.agent_performance || {}}
              title="Performance Completo del Agente"
              icon={
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            
            {/* Gráfico principal */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                Gráfica de Performance
              </h3>
              {renderPerformanceChart()}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score General */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Score General
                </h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {call.agent_performance?.score_ponderado || 0}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Score Ponderado del Agente</div>
                </div>
              </div>

              {/* Fortalezas */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  Fortalezas
                </h3>
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
              </div>

              {/* Debilidades */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Áreas de Mejora
                </h3>
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
              </div>
            </div>

            {/* Datos Originales del Performance - Ajustado para mejor espacio */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-2">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                Evaluación Detallada
              </h3>
              
              {call.agent_performance?.datos_originales && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto analysis-scroll">
                  {Object.entries(call.agent_performance.datos_originales)
                    .filter(([key]) => key !== 'nombreAgente' && key !== 'supervisorInterviene')
                    .map(([category, data]: [string, any]) => (
                    <div key={category} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm capitalize">
                        {category.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <div className="space-y-1 text-xs">
                        {Object.entries(data)
                          .filter(([subKey]) => subKey !== 'justificacion' && subKey !== 'confianzaEvaluacion')
                          .slice(0, 4) // Limitar a 4 items para mejor espacio
                          .map(([subKey, subValue]: [string, any]) => (
                          <div key={subKey} className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400 capitalize truncate mr-2">
                              {subKey.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>
                            <span className={`font-medium ${
                              typeof subValue === 'boolean' 
                                ? (subValue ? 'text-green-600' : 'text-red-600')
                                : 'text-slate-900 dark:text-white'
                            }`}>
                              {typeof subValue === 'boolean' 
                                ? (subValue ? 'Sí' : 'No') 
                                : String(subValue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'script':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Análisis de Script
              </h3>
              
              <div className="space-y-6">
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

                {/* Balance FODA */}
                {call.call_evaluation?.metricas_foda && (
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Balance FODA</h4>
                    <div className="flex justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-indigo-600">{call.call_evaluation.metricas_foda.balance_foda}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Score Balance</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Nueva Gráfica de Compliance de Alto Impacto en Performance */}
            {(call as any).compliance_data && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  Cumplimiento Normativo
                </h3>
                
                <ComplianceChart 
                  complianceData={(call as any).compliance_data}
                />
              </div>
            )}
          </div>
        );

      case 'compliance':
        return (
          <div className="p-6 space-y-6">
            
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
            
            {/* EVALUACIÓN GENERAL DE LA LLAMADA */}
            <UniversalDataView
              data={call.call_evaluation || {}}
              title="Evaluación General de la Llamada"
              icon={
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />
            
            {/* ANÁLISIS DEL SCRIPT */}
            <UniversalDataView
              data={call.script_analysis || {}}
              title="Análisis del Script"
              icon={
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
            
          </div>
        );

      case 'customer':
        return (
          <div className="p-6 space-y-6">
            
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
            
            {/* DATOS DE COMUNICACIÓN */}
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

      case 'raw-data':
        return (
          <div className="p-6 space-y-6">
            
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
            
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-slate-500 to-slate-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                Datos Técnicos Completos
              </h3>
              
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
                    <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap text-slate-700 dark:text-slate-300 analysis-scroll">
                      {JSON.stringify(call, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-7xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Análisis Detallado - {call.customer_name}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Agente: {call.agent_name} • {call.call_type} • {call.direction}
            </p>
          </div>
          
          {/* RETROALIMENTACIÓN: Botones del header */}
          <div className="flex items-center gap-3">
            {/* Botón de Retroalimentación */}
            <button
              onClick={handleOpenFeedbackModal}
              disabled={feedbackLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
                ${feedbackData 
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              title={feedbackData ? 'Editar retroalimentación existente' : 'Agregar retroalimentación'}
            >
              {feedbackLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm">Cargando...</span>
                </>
              ) : feedbackData ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="text-sm">Editar Retro</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm">Retroalimentación</span>
                </>
              )}
            </button>
            
            {/* Botón de Cerrar */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Cerrar análisis detallado"
            >
              <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto analysis-scroll">
          {renderTabContent()}
        </div>
      </div>
      
      {/* RETROALIMENTACIÓN: Modal de feedback */}
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
    </div>
  );
};

export default DetailedCallView;
