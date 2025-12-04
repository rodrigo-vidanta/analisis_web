/**
 * ============================================
 * SIDEBAR DE DETALLE DE LLAMADA - CALL DETAIL MODAL SIDEBAR
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Este componente muestra el mismo contenido que el modal de detalle de llamada
 *    del AI Call Monitor (historial), pero adaptado para funcionar como sidebar.
 *
 * 2. Cualquier cambio realizado en este archivo debe ser consistente con el modal
 *    de historial en LiveMonitorKanban.tsx
 *
 * 3. Este sidebar se abre desde los sidebars de prospecto en varios módulos
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, BarChart3, Play, Pause, MessageSquare, Eye, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { analysisSupabase } from '../../config/analysisSupabase';
import Chart from 'chart.js/auto';
import { ProspectAvatar } from '../analysis/ProspectAvatar';
import ReactMarkdown from 'react-markdown';

interface CallDetailModalSidebarProps {
  callId: string | null;
  isOpen: boolean;
  onClose: () => void;
  allCallsWithAnalysis?: any[]; // Para historial de llamadas del prospecto
  onProspectClick?: (prospectId: string) => void; // Para abrir sidebar de prospecto
  onCallChange?: (newCallId: string) => void; // Para cambiar la llamada cuando se hace clic en el historial
}

export const CallDetailModalSidebar: React.FC<CallDetailModalSidebarProps> = ({ 
  callId, 
  isOpen, 
  onClose,
  allCallsWithAnalysis = [],
  onProspectClick,
  onCallChange
}) => {
  const [callDetail, setCallDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [modalTab, setModalTab] = useState<'details' | 'analysis'>('details');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [highlightedSegment, setHighlightedSegment] = useState<number | null>(null);
  const [selectedProspectoData, setSelectedProspectoData] = useState<any | null>(null);
  const [ejecutivosMap, setEjecutivosMap] = useState<Record<string, any>>({});
  const [coordinacionesMap, setCoordinacionesMap] = useState<Record<string, any>>({});

  // Refs
  const radarChartRef = useRef<Chart | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const lastSegmentRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  // Cargar datos de ejecutivos y coordinaciones
  useEffect(() => {
    const loadEjecutivosAndCoordinaciones = async () => {
      try {
        const [ejecutivosRes, coordinacionesRes] = await Promise.all([
          analysisSupabase.from('ejecutivos').select('*'),
          analysisSupabase.from('coordinaciones').select('*')
        ]);

        if (ejecutivosRes.data) {
          const map: Record<string, any> = {};
          ejecutivosRes.data.forEach((e: any) => {
            map[e.id] = e;
          });
          setEjecutivosMap(map);
        }

        if (coordinacionesRes.data) {
          const map: Record<string, any> = {};
          coordinacionesRes.data.forEach((c: any) => {
            map[c.id] = c;
          });
          setCoordinacionesMap(map);
        }
      } catch (error) {
        console.error('Error loading ejecutivos/coordinaciones:', error);
      }
    };

    if (isOpen) {
      loadEjecutivosAndCoordinaciones();
    }
  }, [isOpen]);

  // Cargar detalle de llamada
  useEffect(() => {
    if (callId && isOpen) {
      loadCallDetail(callId);
    }
  }, [callId, isOpen]);

  // Cargar transcripción cuando se carga el detalle
  useEffect(() => {
    if (callId && isOpen && callDetail?.call_id) {
      loadTranscript(callDetail.call_id, 1.04);
    }
  }, [callId, callDetail?.call_id, isOpen]);
  
  // Asegurar que loadTranscript esté en las dependencias si es necesario
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Crear gráfica radar cuando se cambia a pestaña de análisis
  useEffect(() => {
    if (isOpen && callDetail?.calificaciones && callDetail?.call_id && modalTab === 'analysis') {
      if (radarChartRef.current) {
        radarChartRef.current.destroy();
        radarChartRef.current = null;
      }
      
      const timer = setTimeout(() => {
        createRadarChart(callDetail.call_id, callDetail.calificaciones);
      }, 300);
      
      return () => {
        clearTimeout(timer);
        if (radarChartRef.current) {
          radarChartRef.current.destroy();
          radarChartRef.current = null;
        }
      };
    }
    
    if ((!isOpen || modalTab !== 'analysis') && radarChartRef.current) {
      radarChartRef.current.destroy();
      radarChartRef.current = null;
    }
  }, [isOpen, callDetail, modalTab]);

  // Limpiar audio cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsAudioPlaying(false);
      setCurrentAudioTime(0);
      setHighlightedSegment(null);
      lastSegmentRef.current = null;
      lastUpdateTimeRef.current = 0;
      if (scrollTimeoutRef.current !== null) {
        cancelAnimationFrame(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    }
  }, [isOpen]);

  const loadCallDetail = async (callId: string) => {
    try {
      setLoading(true);
      
      // Cargar datos de análisis
      const { data: analysisData, error: analysisError } = await analysisSupabase
        .from('call_analysis_summary')
        .select('*')
        .eq('call_id', callId)
        .maybeSingle();

      // Cargar datos complementarios de llamadas_ventas
      const { data: llamadaData, error: llamadaError } = await analysisSupabase
        .from('llamadas_ventas')
        .select('*')
        .eq('call_id', callId)
        .single();

      if (analysisError && llamadaError) {
        console.error('Error loading call details:', analysisError || llamadaError);
        return;
      }

      const combinedData = {
        ...llamadaData,
        ...analysisData
      };

      // Parsear datos_proceso y datos_llamada si son strings
      if (typeof combinedData.datos_proceso === 'string') {
        try {
          combinedData.datos_proceso = JSON.parse(combinedData.datos_proceso);
        } catch (e) {
          // Ignorar error de parsing
        }
      }
      if (typeof combinedData.datos_llamada === 'string') {
        try {
          combinedData.datos_llamada = JSON.parse(combinedData.datos_llamada);
        } catch (e) {
          // Ignorar error de parsing
        }
      }

      setCallDetail(combinedData);

      // Cargar datos del prospecto si están disponibles
      const prospectId = combinedData.prospecto || combinedData.prospecto_id;
      if (prospectId) {
        try {
          const { data: prospectoData } = await analysisSupabase
            .from('prospectos')
            .select('*')
            .eq('id', prospectId)
            .single();
          setSelectedProspectoData(prospectoData);
        } catch (err) {
          console.error('Error loading prospecto:', err);
        }
      }
    } catch (error) {
      console.error('Error loading call detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSpeechTime = (text: string, voiceSpeed: number = 1.04): number => {
    if (!text || text.length === 0) return 0;
    
    const charCount = text.length;
    const baseCharsPerSecond = 17.5 / voiceSpeed;
    
    const punctuationPause = (text.match(/[.!?]/g) || []).length * 0.1;
    const commaPause = (text.match(/[,;]/g) || []).length * 0.05;
    const longWords = text.split(/\s+/).filter(w => w.length > 6).length;
    const longWordPenalty = longWords * 0.03;
    const numberMatches = text.match(/\d+/g) || [];
    const numberCount = numberMatches.length;
    const numberPenalty = numberCount * 0.05;
    const isQuestion = text.includes('?');
    const questionPause = isQuestion ? 0.05 : 0;
    
    const baseTime = charCount / baseCharsPerSecond;
    const totalTime = baseTime + punctuationPause + commaPause + longWordPenalty + numberPenalty + questionPause;
    
    return Math.max(totalTime, 0.2);
  };

  const parseConversationToSegments = (conversacionData: any, callId: string, voiceSpeed: number = 1.04): any[] => {
    try {
      let conversationText = '';
      
      if (typeof conversacionData === 'string') {
        const parsed = JSON.parse(conversacionData);
        conversationText = parsed.conversacion || '';
      } else if (conversacionData?.conversacion) {
        conversationText = conversacionData.conversacion;
      }
      
      if (!conversationText) return [];
      
      const lines = conversationText.split('\n').filter((line: string) => line.trim());
      const segments: any[] = [];
      let accumulatedTime = 0;
      
      lines.forEach((line: string, index: number) => {
        const match = line.match(/^\[(.+?)\]\s+(\w+):\s+(.+)$/);
        if (match) {
          const [, timestamp, speaker, content] = match;
          const speechTime = calculateSpeechTime(content.trim(), voiceSpeed);
          const segmentStartTime = accumulatedTime;
          accumulatedTime += speechTime;
          
          segments.push({
            id: `${callId}-${index}`,
            call_id: callId,
            segment_index: index,
            speaker: speaker.toLowerCase(),
            content: content.trim(),
            timestamp: timestamp.trim(),
            confidence: 1.0,
            startTime: segmentStartTime,
            endTime: accumulatedTime,
            duration: speechTime
          });
        }
      });
      
      return segments;
    } catch (error) {
      console.error('Error parsing conversation:', error);
      return [];
    }
  };

  const loadTranscript = async (callId: string, voiceSpeed: number = 1.04) => {
    try {
      const { data, error } = await analysisSupabase
        .from('llamadas_ventas')
        .select('conversacion_completa')
        .eq('call_id', callId)
        .single();

      if (error) throw error;

      const segments = parseConversationToSegments(data?.conversacion_completa, callId, voiceSpeed);
      setTranscript(segments);
      lastSegmentRef.current = null;
      lastUpdateTimeRef.current = 0;
    } catch (err) {
      console.error('Error loading transcript:', err);
      setTranscript([]);
    }
  };

  const handleAudioTimeUpdate = useCallback(() => {
    if (!audioRef.current || transcript.length === 0) return;
    
    const now = performance.now();
    if (now - lastUpdateTimeRef.current < 100) return;
    lastUpdateTimeRef.current = now;
    
    const currentTime = audioRef.current.currentTime;
    setCurrentAudioTime(audioRef.current.volume * 100);
    
    let currentSegment = -1;
    const startIndex = lastSegmentRef.current !== null ? Math.max(0, lastSegmentRef.current - 1) : 0;
    
    for (let i = startIndex; i < transcript.length; i++) {
      const segment = transcript[i];
      if (segment.startTime !== undefined && segment.endTime !== undefined) {
        if (currentTime >= segment.startTime && currentTime <= segment.endTime) {
          currentSegment = i;
          break;
        }
        if (currentTime < segment.startTime) {
          if (i > 0) {
            const prevSegment = transcript[i - 1];
            if (prevSegment.endTime !== undefined && currentTime <= prevSegment.endTime) {
              currentSegment = i - 1;
            }
          }
          break;
        }
      }
    }
    
    if (currentSegment === -1 && transcript.length > 0) {
      const lastSegment = transcript[transcript.length - 1];
      const totalDuration = lastSegment.endTime || callDetail?.duracion_segundos || 1;
      currentSegment = Math.floor((currentTime / totalDuration) * transcript.length);
      currentSegment = Math.min(Math.max(0, currentSegment), transcript.length - 1);
    }
    
    if (currentSegment >= 0 && currentSegment !== lastSegmentRef.current) {
      lastSegmentRef.current = currentSegment;
      setHighlightedSegment(currentSegment);
      
      if (scrollTimeoutRef.current !== null) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = requestAnimationFrame(() => {
        if (transcriptContainerRef.current && currentSegment < transcript.length) {
          const segmentElement = transcriptContainerRef.current.children[currentSegment] as HTMLElement;
          if (segmentElement) {
            segmentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        scrollTimeoutRef.current = null;
      });
    }
  }, [transcript, callDetail]);

  const createRadarChart = (callId: string, calificaciones: Record<string, string>) => {
    setTimeout(() => {
      const canvas = document.getElementById(`radar-chart-sidebar-${callId}`) as HTMLCanvasElement;
      if (!canvas) {
        console.warn(`Canvas not found for radar chart: radar-chart-sidebar-${callId}`);
        return;
      }

      if (radarChartRef.current) {
        radarChartRef.current.destroy();
        radarChartRef.current = null;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const labelMap: Record<string, string> = {
        'continuidad_whatsapp': 'Continuidad WhatsApp',
        'tratamiento_formal': 'Tratamiento Formal',
        'control_narrativo': 'Control Narrativo',
        'discovery_familiar': 'Discovery Familiar',
        'deteccion_interes': 'Detección Interés',
        'manejo_objeciones': 'Manejo Objeciones',
        'cumplimiento_reglas': 'Cumplimiento Reglas'
      };
      
      const filteredEntries = Object.entries(calificaciones).filter(([key]) => key !== 'calidad_cierre');
      const labels = filteredEntries.map(([key]) => 
        labelMap[key] || key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      );
      
      const data = filteredEntries.map(([, value]) => {
        switch (value) {
          case 'PERFECTO': return 100;
          case 'BUENO': case 'BUENA': return 80;
          case 'DEFICIENTE': return 25;
          case 'NO_APLICABLE': return 50;
          case 'REGULAR': return 60;
          case 'CONTROLADO': return 90;
          case 'PARCIAL': return 60;
          case 'DESCONTROLADO': return 20;
          case 'COMPLETO': return 100;
          case 'INCOMPLETO': return 40;
          case 'NO_REALIZADO': return 10;
          case 'PRECISA': return 95;
          case 'TARDÍA': return 70;
          case 'TEMPRANA': return 80;
          case 'IMPRECISA': return 30;
          case 'EXCELENTE': return 100;
          case 'BÁSICO': return 50;
          case 'NO_HUBO': return 75;
          case 'MALO': return 20;
          default: return 50;
        }
      });

      radarChartRef.current = new Chart(ctx, {
        type: 'radar',
        data: {
          labels,
          datasets: [{
            label: 'Evaluación de Continuidad y Discovery',
            data,
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderColor: 'rgba(16, 185, 129, 0.8)',
            borderWidth: 3,
            pointBackgroundColor: 'rgba(16, 185, 129, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 7,
            pointHoverRadius: 10,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              min: 0,
              ticks: {
                stepSize: 25,
                color: 'rgba(148, 163, 184, 0.8)',
                font: {
                  size: 10
                }
              },
              grid: {
                color: 'rgba(148, 163, 184, 0.2)'
              },
              angleLines: {
                color: 'rgba(148, 163, 184, 0.2)'
              },
              pointLabels: {
                color: 'rgba(71, 85, 105, 1)',
                font: {
                  size: 11,
                  weight: 500
                }
              }
            }
          },
          elements: {
            point: {
              hoverRadius: 8
            }
          }
        }
      });
    }, 100);
  };

  if (!isOpen) return null;

  const prospectId = callDetail?.prospecto || callDetail?.prospecto_id;
  const prospectCalls = callDetail?.call_id ? allCallsWithAnalysis.filter((call: any) => {
    const callProspectId = call.prospecto_completo?.id || call.prospect_id || call.prospecto_id;
    return callProspectId === prospectId && call.call_id !== callDetail?.call_id;
  }).sort((a: any, b: any) => {
    const dateA = new Date(a.fecha_llamada || a.created_at || 0).getTime();
    const dateB = new Date(b.fecha_llamada || b.created_at || 0).getTime();
    return dateB - dateA;
  }) : [];

  const datosProceso = callDetail?.datos_proceso || {};
  const prospecto = selectedProspectoData || callDetail?.prospecto_completo || {};

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-[200] pointer-events-auto"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed right-0 top-0 h-full w-3/5 bg-white dark:bg-gray-900 shadow-2xl z-[210] overflow-hidden pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1 min-w-0">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      className="relative flex-shrink-0"
                    >
                      <button
                        onClick={() => {
                          if (prospectId && onProspectClick) {
                            onProspectClick(prospectId);
                          }
                        }}
                        className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${
                          callDetail?.call_status === 'activa' 
                            ? 'from-green-500 via-blue-500 to-purple-500' 
                            : 'from-gray-400 via-gray-500 to-gray-600'
                        } p-0.5 shadow-lg flex-shrink-0 group cursor-pointer`}
                        title="Ver información del prospecto"
                      >
                        <div className="w-full h-full rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                          <ProspectAvatar
                            nombreCompleto={callDetail?.nombre_completo || prospecto?.nombre_completo || ''}
                            nombreWhatsapp={callDetail?.nombre_whatsapp || prospecto?.nombre_whatsapp || ''}
                            size="xl"
                            className="w-full h-full rounded-2xl"
                          />
                        </div>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                          className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-gray-900 rounded-full shadow-lg border-2 border-blue-500"
                        >
                          <Eye size={12} className="text-blue-600 dark:text-blue-400" />
                        </motion.div>
                      </button>
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <motion.h2
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="text-2xl font-bold text-gray-900 dark:text-white mb-1 flex items-center flex-wrap gap-2"
                          >
                            <BarChart3 className="w-6 h-6 mr-3 text-emerald-500" />
                            <button
                              onClick={() => {
                                if (prospectId && onProspectClick) {
                                  onProspectClick(prospectId);
                                }
                              }}
                              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                            >
                              {callDetail?.nombre_completo || prospecto?.nombre_completo || callDetail?.nombre_whatsapp || prospecto?.nombre_whatsapp || 'Cargando...'}
                            </button>
                            {(() => {
                              if (!callDetail) return null;
                              const ejecutivoId = prospecto?.ejecutivo_id || callDetail?.ejecutivo_id;
                              const coordinacionId = prospecto?.coordinacion_id || callDetail?.coordinacion_id;
                              const ejecutivo = ejecutivoId ? ejecutivosMap[ejecutivoId] : null;
                              const coordinacion = coordinacionId ? coordinacionesMap[coordinacionId] : null;
                              
                              if (ejecutivo || coordinacion) {
                                return (
                                  <>
                                    <span className="text-gray-400 dark:text-gray-500">-</span>
                                    <span className="text-lg font-normal text-gray-600 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                                      {ejecutivo && (
                                        <span className="flex items-center gap-1">
                                          <User className="w-4 h-4" />
                                          <span className="font-medium">Ejecutivo:</span>
                                          {ejecutivo.full_name || ejecutivo.nombre_completo || ejecutivo.nombre || 'N/A'}
                                        </span>
                                      )}
                                      {coordinacion && (
                                        <>
                                          {ejecutivo && <span className="text-gray-400 dark:text-gray-500">/</span>}
                                          <span className="flex items-center gap-1">
                                            {coordinacion.nombre || coordinacion.codigo || 'N/A'}
                                          </span>
                                        </>
                                      )}
                                    </span>
                                  </>
                                );
                              }
                              return null;
                            })()}
                          </motion.h2>
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-sm text-gray-500 dark:text-gray-400"
                          >
                            {callDetail?.call_id || callId || 'N/A'} • {callDetail?.fecha_llamada ? new Date(callDetail.fecha_llamada).toLocaleDateString('es-MX') : 'Cargando...'}
                          </motion.p>
                          {callDetail?.resumen_llamada && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.25 }}
                              className="text-sm text-gray-700 dark:text-gray-300 mt-2 leading-relaxed"
                            >
                              {callDetail.resumen_llamada}
                            </motion.p>
                          )}
                        </div>
                        {callDetail && (
                          <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                            onClick={() => setModalTab(modalTab === 'details' ? 'analysis' : 'details')}
                            className="flex-shrink-0 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 rounded-lg flex items-center gap-2 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">
                              {modalTab === 'details' ? 'Análisis y Métricas' : 'Detalles de la Llamada'}
                            </span>
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                  <motion.button
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.25 }}
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group ml-4 flex-shrink-0"
                  >
                    <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                  </motion.button>
                </div>
              </div>
              
              {/* Content - Scroll invisible */}
              <div className="flex-1 overflow-y-auto px-8 py-6 min-h-0 scrollbar-hide">
                {loading || !callDetail ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-pulse">
                      <div className="rounded-full h-8 w-8 bg-blue-200 dark:bg-blue-800"></div>
                    </div>
                  </div>
                ) : modalTab === 'details' ? (
                  <div className="space-y-6">
                    {/* Información de Llamada */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-emerald-500" />
                          Detalles de Llamada
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Estado</label>
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            callDetail?.call_status === 'activa' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            callDetail?.call_status === 'transferida' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            callDetail?.call_status === 'finalizada' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' :
                            callDetail?.call_status === 'perdida' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}>
                            {callDetail?.call_status === 'transferida' ? 'Transferida a Ejecutivo' :
                             callDetail?.call_status === 'contestada_no_transferida' ? 'Contestada No Transferida' :
                             callDetail?.call_status === 'perdida' ? 'Perdida' :
                             callDetail?.call_status || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Duración</label>
                          <div className="text-gray-900 dark:text-white font-medium">
                            {callDetail?.duracion_segundos ? 
                              `${Math.floor(callDetail.duracion_segundos / 60)}:${(callDetail.duracion_segundos % 60).toString().padStart(2, '0')}` : 
                              'En curso'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Checkpoint</label>
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              (callDetail?.checkpoint_alcanzado || parseInt(callDetail?.checkpoint_venta_actual?.replace('checkpoint #', '') || '1')) >= 4 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                              (callDetail?.checkpoint_alcanzado || parseInt(callDetail?.checkpoint_venta_actual?.replace('checkpoint #', '') || '1')) >= 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {callDetail?.checkpoint_alcanzado || callDetail?.checkpoint_venta_actual?.replace('checkpoint #', '') || '1'}/5
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Nivel Interés</label>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            (callDetail?.nivel_interes_detectado || callDetail?.nivel_interes) === 'Alto' || (callDetail?.nivel_interes_detectado || callDetail?.nivel_interes) === 'MUY_ALTO' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            (callDetail?.nivel_interes_detectado || callDetail?.nivel_interes) === 'Medio' || (callDetail?.nivel_interes_detectado || callDetail?.nivel_interes) === 'MEDIO' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {callDetail?.nivel_interes_detectado || callDetail?.nivel_interes || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </motion.div>

                    {/* Detalles del Prospecto */}
                    {prospecto && Object.keys(prospecto).length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center">
                            <User className="w-4 h-4 mr-2 text-emerald-500" />
                            Detalles del Prospecto
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {prospecto.nombre_completo && (
                            <div>
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Nombre Completo</label>
                              <div className="text-gray-900 dark:text-white font-medium">
                                {prospecto.nombre_completo}
                              </div>
                            </div>
                          )}
                          {prospecto.whatsapp && (
                            <div>
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">WhatsApp</label>
                              <div className="text-gray-900 dark:text-white font-medium">
                                {prospecto.whatsapp}
                              </div>
                            </div>
                          )}
                          {(datosProceso?.numero_personas || prospecto.tamano_grupo) && (
                            <div>
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Composición Familiar</label>
                              <div className="text-gray-900 dark:text-white font-medium">
                                {datosProceso?.numero_personas || prospecto.tamano_grupo} {datosProceso?.numero_personas === 1 || prospecto.tamano_grupo === 1 ? 'persona' : 'personas'}
                              </div>
                            </div>
                          )}
                          {(datosProceso?.destino_preferencia || prospecto.destino_preferencia) && (
                            <div>
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Destino Preferencia</label>
                              <div className="text-gray-900 dark:text-white font-medium">
                                {Array.isArray(datosProceso?.destino_preferencia || prospecto.destino_preferencia) 
                                  ? (datosProceso?.destino_preferencia || prospecto.destino_preferencia).join(', ')
                                  : (datosProceso?.destino_preferencia || prospecto.destino_preferencia)}
                              </div>
                            </div>
                          )}
                          {prospecto.observaciones && (
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Observaciones</label>
                              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-900 dark:text-white leading-relaxed">
                                  <ReactMarkdown>
                                    {prospecto.observaciones?.replace(/\\n/g, '\n') || ''}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Historial de Llamadas del Prospecto */}
                    {prospectCalls.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Historial de Llamadas del Prospecto
                          </h3>
                          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                            {prospectCalls.length} {prospectCalls.length === 1 ? 'llamada' : 'llamadas'}
                          </span>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
                          {prospectCalls.map((call: any, index: number) => (
                            <button
                              key={call.call_id || index}
                              onClick={async () => {
                                if (onCallChange && call.call_id) {
                                  onCallChange(call.call_id);
                                } else if (call.call_id) {
                                  // Si no hay callback, recargar directamente
                                  await loadCallDetail(call.call_id);
                                  if (call.call_id) {
                                    await loadTranscript(call.call_id, 1.04);
                                  }
                                  if (audioRef.current) {
                                    audioRef.current.pause();
                                    audioRef.current.currentTime = 0;
                                  }
                                  setIsAudioPlaying(false);
                                  setHighlightedSegment(null);
                                }
                              }}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${
                                call.call_id === callDetail?.call_id
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                                      {call.fecha_llamada 
                                        ? new Date(call.fecha_llamada).toLocaleDateString('es-MX', { 
                                            day: '2-digit', 
                                            month: 'short', 
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })
                                        : 'Fecha no disponible'}
                                    </span>
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                      call.call_status === 'transferida' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                      call.call_status === 'contestada_no_transferida' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                      call.call_status === 'perdida' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                      'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                                    }`}>
                                      {call.call_status === 'transferida' ? 'Transferida' :
                                       call.call_status === 'contestada_no_transferida' ? 'Contestada' :
                                       call.call_status === 'perdida' ? 'Perdida' :
                                       call.call_status || 'Finalizada'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                                    {call.duracion_segundos && (
                                      <span>
                                        {Math.floor(call.duracion_segundos / 60)}:{(call.duracion_segundos % 60).toString().padStart(2, '0')}
                                      </span>
                                    )}
                                    {call.checkpoint_alcanzado && (
                                      <span>
                                        Checkpoint: {call.checkpoint_alcanzado}/5
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Transcripción con Audio Player */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Transcripción de Conversación
                          </h3>
                        </div>
                        {callDetail?.audio_ruta_bucket && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (audioRef.current) {
                                  if (isAudioPlaying) {
                                    audioRef.current.pause();
                                    setIsAudioPlaying(false);
                                  } else {
                                    audioRef.current.play();
                                    setIsAudioPlaying(true);
                                  }
                                }
                              }}
                              className="w-8 h-8 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                              {isAudioPlaying ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4 ml-0.5" />
                              )}
                            </button>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={currentAudioTime}
                              onChange={(e) => {
                                const volume = parseFloat(e.target.value) / 100;
                                if (audioRef.current) {
                                  audioRef.current.volume = volume;
                                }
                              }}
                              className="w-20 h-1 bg-slate-200 dark:bg-slate-600 rounded-full appearance-none cursor-pointer"
                            />
                          </div>
                        )}
                      </div>
                      <div 
                        ref={transcriptContainerRef}
                        className="h-[calc(100vh-600px)] min-h-[300px] max-h-[500px] overflow-y-auto scrollbar-hide space-y-3"
                      >
                        {transcript.length > 0 ? (
                          transcript.map((segment, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded-lg transition-all duration-300 ${
                                highlightedSegment === index
                                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/40'
                                  : segment.speaker === 'cliente' 
                                    ? 'bg-blue-100 dark:bg-blue-900/30 ml-8' 
                                    : 'bg-gray-100 dark:bg-slate-700 mr-8'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-medium ${
                                  segment.speaker === 'cliente' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'
                                }`}>
                                  {segment.speaker === 'cliente' ? 'Cliente' : 'Agente'}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {segment.timestamp}
                                </span>
                              </div>
                              <p className="text-sm text-slate-900 dark:text-white leading-relaxed">
                                {segment.content}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No hay transcripción disponible</p>
                          </div>
                        )}
                      </div>
                      {callDetail?.audio_ruta_bucket && (
                        <audio
                          ref={audioRef}
                          src={callDetail.audio_ruta_bucket}
                          onTimeUpdate={handleAudioTimeUpdate}
                          onEnded={() => {
                            setIsAudioPlaying(false);
                            setHighlightedSegment(null);
                            lastSegmentRef.current = null;
                            if (scrollTimeoutRef.current !== null) {
                              cancelAnimationFrame(scrollTimeoutRef.current);
                              scrollTimeoutRef.current = null;
                            }
                          }}
                          onPlay={() => setIsAudioPlaying(true)}
                          onPause={() => setIsAudioPlaying(false)}
                        />
                      )}
                    </motion.div>
                  </div>
                ) : (
                  /* Pestaña de Análisis y Métricas */
                  <div className="space-y-6">
                    {/* Retroalimentación IA */}
                    {(callDetail?.feedback_positivo?.length > 0 || callDetail?.feedback_constructivo?.length > 0) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Retroalimentación IA
                          </h3>
                        </div>
                        
                        {callDetail?.feedback_positivo?.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                              Aspectos Positivos
                            </h4>
                            <ul className="space-y-1">
                              {callDetail.feedback_positivo.map((item: string, index: number) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                  <CheckCircle size={16} className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {callDetail?.feedback_constructivo?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-2">
                              Áreas de Mejora
                            </h4>
                            <ul className="space-y-1">
                              {callDetail.feedback_constructivo.map((item: any, index: number) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                  <AlertTriangle size={16} className="text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                                  {typeof item === 'string' ? item : 
                                   typeof item === 'object' ? (item.problema || item.descripcion || JSON.stringify(item)) : 
                                   String(item)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Gráfica Radar de Evaluación */}
                    {callDetail?.calificaciones && Object.keys(callDetail.calificaciones).length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Evaluación de Continuidad y Discovery
                          </h3>
                        </div>
                        <div className="h-96 relative">
                          <canvas
                            key={`radar-chart-sidebar-${callDetail?.call_id}-${modalTab}`}
                            id={`radar-chart-sidebar-${callDetail?.call_id}`}
                            className="max-w-full max-h-full"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

