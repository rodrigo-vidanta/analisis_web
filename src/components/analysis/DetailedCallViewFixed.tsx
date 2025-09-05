import React, { useRef, useEffect, useState } from 'react';
import { Chart, registerables } from 'chart.js/auto';
import { calcularQualityScorePonderado, calcularProbabilidadConversion } from './ponderacionConfig';

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
  agent_performance?: any;
  call_evaluation?: any;
  comunicacion_data?: any;
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
}

type TabType = 'summary' | 'performance' | 'script' | 'compliance' | 'customer' | 'raw-data';

const DetailedCallView: React.FC<DetailedCallViewProps> = ({
  call,
  transcript,
  ponderacionConfig,
  enabledWidgets,
  onClose
}) => {
  const chartRefs = useRef<{ [key: string]: Chart | null }>({});
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [collapsedSegments, setCollapsedSegments] = useState<Set<string>>(new Set());

  // Canvas refs para las gráficas
  const performanceCanvasRef = useRef<HTMLCanvasElement>(null);

  // Inicializar todos los segmentos como colapsados
  useEffect(() => {
    setCollapsedSegments(new Set(transcript.map(segment => segment.id)));
  }, [transcript]);

  const scorePonderado = calcularQualityScorePonderado(call, ponderacionConfig);
  const probConversion = calcularProbabilidadConversion(call, ponderacionConfig);

  // Effect para crear gráfica de performance
  useEffect(() => {
    if (performanceCanvasRef.current && (activeTab === 'performance' || activeTab === 'summary')) {
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
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 2,
              pointBackgroundColor: 'rgba(59, 130, 246, 1)',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
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

  const renderTabContent = () => {
    // Declarar todas las variables que se usan en diferentes casos
    const callDataSections = [
      { key: 'call_evaluation', label: 'Evaluación de Llamada', color: 'blue' },
      { key: 'agent_performance', label: 'Performance del Agente', color: 'green' },
      { key: 'comunicacion_data', label: 'Datos de Comunicación', color: 'purple' }
    ];

    switch (activeTab) {
      case 'summary':
        return (
          <div className="flex h-full">
            {/* Left Sidebar - Conversation */}
            <div className="w-1/2 p-6 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
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
            <div className="w-1/2 p-6 overflow-y-auto">
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
                  {renderPerformanceChart()}
                </div>
              </div>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="p-6 space-y-6">
            {/* Gráfico principal */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                Performance del Agente
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

            {/* Datos Originales del Performance */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                Evaluación Detallada
              </h3>
              
              {call.agent_performance?.datos_originales && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(call.agent_performance.datos_originales)
                    .filter(([key]) => key !== 'nombreAgente' && key !== 'supervisorInterviene')
                    .map(([category, data]: [string, any]) => (
                    <div key={category} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2 capitalize">
                        {category.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <div className="space-y-1 text-sm">
                        {Object.entries(data)
                          .filter(([subKey]) => subKey !== 'justificacion' && subKey !== 'confianzaEvaluacion')
                          .map(([subKey, subValue]: [string, any]) => (
                          <div key={subKey} className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400 capitalize">
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
    { id: 'performance', label: 'Performance Detallado' }
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
        <div className="flex-1 overflow-hidden">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default DetailedCallView;
