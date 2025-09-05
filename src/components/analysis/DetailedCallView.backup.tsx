import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';
import { calcularQualityScorePonderado, calcularProbabilidadConversion, type PonderacionConfig } from './ponderacionConfig';

interface CallRecord {
  id: string;
  agent_name: string;
  customer_name: string;
  call_type: string;
  call_result: string;
  duration: string;
  quality_score: number;
  customer_quality: string | null;
  organization: string;
  direction: string;
  start_time: string;
  agent_performance: any;
  call_evaluation: any;
  comunicacion_data: any;
}

interface CallSegment {
  id: string;
  call_id: string;
  segment_index: number;
  text: string;
  context_text: string;
  etapa_script: string;
  elementos_obligatorios: string[] | null;
  tipos_discovery: string[] | null;
  tipos_objeciones: string[] | null;
  tecnicas_cierre: string[] | null;
  tecnicas_persuasion: string[] | null;
  tono_cliente: string;
  tono_agente: string;
  temas_personales: string[] | null;
  tecnicas_rapport: string[] | null;
  efectividad_rapport: number;
  training_quality: number;
  importance_score: number;
  quality_score: number;
}

interface DashboardWidget {
  id: string;
  title: string;
  type: 'chart' | 'metric' | 'table' | 'heatmap';
  enabled: boolean;
  size: 'small' | 'medium' | 'large';
}

interface DetailedCallViewProps {
  call: CallRecord;
  transcript: CallSegment[];
  ponderacionConfig: PonderacionConfig;
  enabledWidgets: DashboardWidget[];
  onClose: () => void;
}

type TabType = 'summary' | 'transcript' | 'performance' | 'script' | 'compliance' | 'customer' | 'raw-data';

const DetailedCallView: React.FC<DetailedCallViewProps> = ({
  call,
  transcript,
  ponderacionConfig,
  enabledWidgets,
  onClose
}) => {
  const chartRefs = useRef<{ [key: string]: Chart | null }>({});
  const [activeTab, setActiveTab] = React.useState<TabType>('summary');
  const [collapsedSegments, setCollapsedSegments] = React.useState<Set<string>>(
    new Set()
  );

  // Inicializar todos los segmentos como colapsados
  React.useEffect(() => {
    setCollapsedSegments(new Set(transcript.map(segment => segment.id)));
  }, [transcript]);

  const scorePonderado = calcularQualityScorePonderado(call, ponderacionConfig);
  const probConversion = calcularProbabilidadConversion(call, ponderacionConfig);

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
    // Separar por "Cliente:" y "Agente:"
    const parts = text.split(/(Cliente:|Agente:)/);
    const conversations = [];
    
    for (let i = 1; i < parts.length; i += 2) {
      const role = parts[i].replace(':', '').trim();
      const content = parts[i + 1]?.trim() || '';
      
      if (content) {
        conversations.push({
          role: role.toLowerCase(),
          content,
          isAgent: role.toLowerCase() === 'agente'
        });
      }
    }
    
    return conversations;
  };

  // Función para resaltar hitos clave en la transcripción
  const highlightKeyMoments = (text: string, segment: CallSegment) => {
    let highlightedText = text;
    
    // Resaltar elementos obligatorios
    if (segment.elementos_obligatorios) {
      segment.elementos_obligatorios.forEach(elemento => {
        const regex = new RegExp(`(${elemento.replace('_', ' ')})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="bg-blue-200 dark:bg-blue-800">$1</mark>');
      });
    }

    // Resaltar técnicas de cierre
    if (segment.tecnicas_cierre) {
      segment.tecnicas_cierre.forEach(tecnica => {
        const regex = new RegExp(`(${tecnica.replace('_', ' ')})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="bg-green-200 dark:bg-green-800">$1</mark>');
      });
    }

    // Resaltar objeciones
    if (segment.tipos_objeciones) {
      segment.tipos_objeciones.forEach(objecion => {
        const regex = new RegExp(`(${objecion.replace('_', ' ')})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="bg-red-200 dark:bg-red-800">$1</mark>');
      });
    }

    return highlightedText;
  };

  // Render de gráficas según widgets habilitados
  const renderChart = (widgetId: string) => {
    if (!enabledWidgets.find(w => w.id === widgetId && w.enabled)) return null;

    switch (widgetId) {
      case 'performance-overview':
        return renderPerformanceChart();
      case 'quality-distribution':
        return renderQualityChart();
      case 'rapport-analysis':
        return renderRapportChart();
      case 'script-analysis':
        return renderScriptChart();
      default:
        return null;
    }
  };

  const renderPerformanceChart = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          if (chartRefs.current['performance']) {
            chartRefs.current['performance']?.destroy();
          }

          const agentPerf = call.agent_performance?.metricas_calculadas || {};
          
          chartRefs.current['performance'] = new Chart(ctx, {
            type: 'radar',
            data: {
              labels: ['Cierre', 'Proactividad', 'Escucha', 'Información', 'Amabilidad'],
              datasets: [{
                label: 'Performance del Agente',
                data: [
                  agentPerf.cierreEfectivo_score || 0,
                  agentPerf.proactividad_score || 0,
                  agentPerf.escuchaActiva_score || 0,
                  agentPerf.manejoInformacion_score || 0,
                  agentPerf.amabilidadYTono_score || 0
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
    }, [call]);

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Performance del Agente</h3>
        <div className="h-64">
          <canvas ref={canvasRef}></canvas>
        </div>
      </div>
    );
  };

  const renderQualityChart = () => {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Análisis de Calidad</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Calidad Estándar:</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{call.quality_score}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">🎯 Score Ponderado:</span>
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{scorePonderado.toFixed(1)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">📈 Prob. Conversión:</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{probConversion.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  };

  const renderRapportChart = () => {
    const rapportData = call.comunicacion_data?.rapport_metricas;
    if (!rapportData) return null;

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Análisis de Rapport</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Empatía:</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">{rapportData.empatia || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Escucha Activa:</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">{rapportData.escucha_activa || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Personalización:</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">{rapportData.personalizacion || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Score Ponderado:</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{rapportData.score_ponderado || 0}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderScriptChart = () => {
    const scriptData = call.call_evaluation?.script_analysis;
    if (!scriptData) return null;

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Análisis del Script</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Etapas Completadas:</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {scriptData.metricas_script?.etapas?.completadas || 0} / {scriptData.metricas_script?.etapas?.total || 7}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">% Completitud:</span>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {scriptData.metricas_script?.etapas?.porcentaje_completitud || 0}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Factor Entrenamiento:</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {scriptData.metricas_script?.factor_entrenamiento || 0}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Función para renderizar el contenido de cada pestaña
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
            {/* Left Sidebar - Transcript */}
            <div className="w-1/2 p-6 overflow-y-auto border-r border-slate-200 dark:border-slate-700">

              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
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
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  Resumen de la Llamada
                </h3>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {call.call_evaluation?.analisisGeneral?.descripcion || 'No hay resumen disponible para esta llamada.'}
                </p>
                {call.call_evaluation?.analisisGeneral?.puntosClave && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Puntos Clave:</h4>
                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      {call.call_evaluation.analisisGeneral.puntosClave.map((punto: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {punto}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                Análisis y Métricas
              </h3>
              
              {/* Métricas principales */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg p-4">
                  <div className="text-sm opacity-90">Score Ponderado</div>
                  <div className="text-2xl font-bold">{scorePonderado.toFixed(1)}</div>
                </div>
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg p-4">
                  <div className="text-sm opacity-90">Prob. Conversión</div>
                  <div className="text-2xl font-bold">{probConversion.toFixed(1)}%</div>
                </div>
              </div>

              {/* Información básica */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-6 shadow-lg border border-slate-200 dark:border-slate-700">
                <h4 className="text-md font-semibold text-slate-900 dark:text-white mb-4">Información General</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div><span className="font-medium text-slate-600 dark:text-slate-400">Duración:</span> <span className="text-slate-900 dark:text-white">{call.duration}</span></div>
                    <div><span className="font-medium text-slate-600 dark:text-slate-400">Tipo:</span> <span className="text-slate-900 dark:text-white">{call.call_type.replace('_', ' ')}</span></div>
                    <div><span className="font-medium text-slate-600 dark:text-slate-400">Resultado:</span> <span className="text-slate-900 dark:text-white">{call.call_result.replace('_', ' ')}</span></div>
                  </div>
                  <div className="space-y-3">
                    <div><span className="font-medium text-slate-600 dark:text-slate-400">Calidad:</span> <span className="text-slate-900 dark:text-white">{call.quality_score}/100</span></div>
                    <div><span className="font-medium text-slate-600 dark:text-slate-400">Dirección:</span> <span className="text-slate-900 dark:text-white">{call.direction}</span></div>
                    <div><span className="font-medium text-slate-600 dark:text-slate-400">Organización:</span> <span className="text-slate-900 dark:text-white">{call.organization}</span></div>
                  </div>
                </div>
              </div>

              {/* Gráficas según widgets habilitados */}
              <div className="space-y-6">
                {renderChart('performance-overview')}
                {renderChart('quality-distribution')}
                {renderChart('rapport-analysis')}
                {renderChart('script-analysis')}
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
              {renderChart('performance-overview')}
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
          </div>
        );

      case 'compliance':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                Análisis de Compliance
              </h3>
              
              <div className="space-y-6">
                {/* Información básica de la llamada */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Agente</h4>
                    <p className="text-slate-600 dark:text-slate-400">{call.agent_name}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Dirección</h4>
                    <p className="text-slate-600 dark:text-slate-400">{call.direction}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Duración</h4>
                    <p className="text-slate-600 dark:text-slate-400">{call.duration}</p>
                  </div>
                </div>

                {/* Problemas detectados */}
                {call.call_evaluation?.problemasDetectados && (
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Problemas Detectados</h4>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                      {call.call_evaluation.problemasDetectados.length > 0 ? (
                        <ul className="space-y-2">
                          {call.call_evaluation.problemasDetectados.map((problema: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                              <span className="text-sm text-red-700 dark:text-red-300">{problema}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-green-600 dark:text-green-400">✓ No se detectaron problemas de compliance</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Calidad de la llamada */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Calidad General</h4>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{call.quality_score}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Score de Calidad</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Resultado</h4>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-slate-900 dark:text-white capitalize">
                        {call.call_result.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Resultado de la Llamada</div>
                    </div>
                  </div>
                </div>

                {/* Datos adicionales si existen */}
                {call.call_evaluation && Object.keys(call.call_evaluation).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Datos Técnicos de Evaluación</h4>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                      <pre className="text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                        {JSON.stringify(call.call_evaluation, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'customer':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                Información del Cliente
              </h3>
              
              <div className="space-y-6">
                {/* Datos básicos del cliente */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Nombre</h4>
                    <p className="text-lg text-slate-600 dark:text-slate-400">{call.customer_name}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Calidad</h4>
                    <p className="text-lg text-slate-600 dark:text-slate-400">{call.customer_quality || 'No especificada'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Organización</h4>
                    <p className="text-lg text-slate-600 dark:text-slate-400">{call.organization}</p>
                  </div>
                </div>

                {/* Métricas de rapport del cliente */}
                {call.comunicacion_data?.rapport_metricas && (
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Métricas de Rapport</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{call.comunicacion_data.rapport_metricas.empatia}</div>
                        <div className="text-sm text-blue-700 dark:text-blue-300">Empatía</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">{call.comunicacion_data.rapport_metricas.escucha_activa}</div>
                        <div className="text-sm text-green-700 dark:text-green-300">Escucha Activa</div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-purple-600">{call.comunicacion_data.rapport_metricas.personalizacion}</div>
                        <div className="text-sm text-purple-700 dark:text-purple-300">Personalización</div>
                      </div>
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-indigo-600">{call.comunicacion_data.rapport_metricas.score_ponderado}</div>
                        <div className="text-sm text-indigo-700 dark:text-indigo-300">Score Ponderado</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Patrones de comunicación */}
                {call.comunicacion_data?.patrones && (
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Patrones de Comunicación</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                        <h5 className="font-semibold text-slate-900 dark:text-white mb-2">Tonos del Cliente</h5>
                        {call.comunicacion_data.patrones.tonos_cliente?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {call.comunicacion_data.patrones.tonos_cliente.map((tono: string, index: number) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs">
                                {tono}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-600 dark:text-slate-400">No se detectaron tonos específicos</p>
                        )}
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                        <h5 className="font-semibold text-slate-900 dark:text-white mb-2">Temas Personales</h5>
                        {call.comunicacion_data.patrones.temas_personales?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {call.comunicacion_data.patrones.temas_personales.map((tema: string, index: number) => (
                              <span key={index} className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs">
                                {tema}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-600 dark:text-slate-400">No se detectaron temas personales</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'raw-data':

        return (
          <div className="p-6 space-y-6">
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

                {/* Secciones de datos estructurados */}
                {callDataSections.map(({ key, label, color }) => {
                  const data = (call as any)[key];
                  if (!data) return null;
                  
                  return (
                    <div key={key} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                      <h4 className={`font-semibold text-slate-900 dark:text-white mb-3 flex items-center`}>
                        <div className={`w-3 h-3 bg-${color}-500 rounded-full mr-2`}></div>
                        {label}
                      </h4>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                        <pre className="text-xs overflow-auto max-h-64 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                          {JSON.stringify(data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  );
                })}

                {/* JSON completo como fallback */}
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                    <div className="w-3 h-3 bg-slate-500 rounded-full mr-2"></div>
                    Datos Completos (JSON)
                  </h4>
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                    <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                      {JSON.stringify(call, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Análisis Detallado - {call.agent_name}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Cliente: {call.customer_name} • {new Date(call.start_time).toLocaleDateString('es-ES')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(90vh-200px)] overflow-y-auto">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default DetailedCallView;
