/**
 * ============================================
 * MODAL DE DETALLE DE LLAMADA - LIVE CHAT
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/chat/README.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/chat/README.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/chat/CHANGELOG_LIVECHAT.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, MessageSquare } from 'lucide-react';
import { analysisSupabase } from '../../config/analysisSupabase';
import Chart from 'chart.js/auto';

interface CallDetailModalProps {
  callId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CallDetailModal: React.FC<CallDetailModalProps> = ({ callId, isOpen, onClose }) => {
  const [callDetail, setCallDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<any[]>([]);
  const radarChartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (callId && isOpen) {
      loadCallDetail(callId);
    }
  }, [callId, isOpen]);

  // Efecto para crear gráfica cuando se carga el detalle
  useEffect(() => {
    if (callDetail?.calificaciones && isOpen) {
      const timer = setTimeout(() => {
        createRadarChart(callDetail.call_id, callDetail.calificaciones);
      }, 300);
      
      return () => clearTimeout(timer);
    }
    
    // Limpiar gráfica cuando se cierra
    if (!isOpen && radarChartRef.current) {
      radarChartRef.current.destroy();
      radarChartRef.current = null;
    }
  }, [callDetail, isOpen]);

  const createRadarChart = (callId: string, calificaciones: Record<string, string>) => {
    const canvas = document.getElementById(`radar-chart-call-${callId}`) as HTMLCanvasElement;
    if (!canvas) return;

    // Destruir gráfica anterior si existe
    if (radarChartRef.current) {
      radarChartRef.current.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Convertir calificaciones a scores numéricos
    const labels = Object.keys(calificaciones).map(key => 
      key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    );
    const data = Object.values(calificaciones).map(value => {
      switch (value) {
        case 'EXCELENTE': return 100;
        case 'BUENO': return 75;
        case 'REGULAR': return 50;
        case 'DEFICIENTE': return 25;
        default: return 0;
      }
    });

    radarChartRef.current = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: 'Performance',
          data,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(59, 130, 246, 0.8)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
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
                weight: '500'
              }
            }
          }
        }
      }
    });
  };

  const loadCallDetail = async (callId: string) => {
    try {
      setLoading(true);
      
      // Cargar datos de análisis
      const { data: analysisData, error: analysisError } = await analysisSupabase
        .from('call_analysis_summary')
        .select('*')
        .eq('call_id', callId)
        .single();

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
        ...analysisData,
        ...llamadaData
      };

      setCallDetail(combinedData);

      // Parsear conversación
      if (llamadaData?.conversacion_completa) {
        parseConversation(llamadaData.conversacion_completa);
      }

    } catch (error) {
      console.error('Error loading call detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseConversation = (conversacionData: any) => {
    try {
      let conversationText = '';
      
      if (typeof conversacionData === 'string') {
        const parsed = JSON.parse(conversacionData);
        conversationText = parsed.conversacion || '';
      } else if (conversacionData?.conversacion) {
        conversationText = conversacionData.conversacion;
      }
      
      if (!conversationText) return;
      
      const lines = conversationText.split('\n').filter(line => line.trim());
      const messages: any[] = [];
      
      for (const line of lines) {
        const match = line.match(/^\[(.+?)\]\s+(\w+):\s+(.+)$/);
        if (match) {
          const [, timestamp, speaker, message] = match;
          messages.push({
            speaker: speaker.toLowerCase(),
            message: message.trim(),
            timestamp: timestamp.trim()
          });
        }
      }
      
      setConversation(messages);
    } catch (error) {
      console.error('Error parsing conversation:', error);
    }
  };

  if (!isOpen || !callDetail) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[200]"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-8 md:inset-16 lg:inset-24 xl:inset-32 bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-[200] overflow-hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg">
                    <Phone className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Detalle de Llamada
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {callDetail.call_id} • {new Date(callDetail.fecha_llamada || callDetail.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X size={24} className="text-gray-400" />
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-pulse">
                      <div className="rounded-full h-8 w-8 bg-blue-200 dark:bg-blue-800"></div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Panel Izquierdo - Métricas */}
                    <div className="space-y-6">
                      {/* Métricas de Análisis */}
                      {callDetail.score_general && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Métricas de Análisis IA
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {callDetail.score_general.toFixed(1)}/100
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">Score General</div>
                            </div>
                            <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg">
                              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {callDetail.checkpoint_alcanzado}/5
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">Checkpoint</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Información de la Llamada */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Información de la Llamada
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Duración</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {callDetail.duracion_segundos ? 
                                `${Math.floor(callDetail.duracion_segundos / 60)}:${(callDetail.duracion_segundos % 60).toString().padStart(2, '0')}` : 
                                'N/A'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Nivel Interés</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {callDetail.nivel_interes || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Precio Ofertado</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {callDetail.precio_ofertado ? `$${parseFloat(callDetail.precio_ofertado).toLocaleString()}` : 'No ofertado'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Resultado</span>
                            <span className={`text-sm font-medium ${
                              callDetail.es_venta_exitosa ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                            }`}>
                              {callDetail.es_venta_exitosa ? 'Venta Exitosa' : 'Seguimiento'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Audio Player */}
                      {callDetail.audio_ruta_bucket && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Grabación de Audio
                          </h3>
                          <audio 
                            controls 
                            className="w-full"
                            preload="metadata"
                          >
                            <source src={callDetail.audio_ruta_bucket} type="audio/wav" />
                            Tu navegador no soporta el elemento de audio.
                          </audio>
                        </div>
                      )}
                    </div>

                    {/* Panel Derecho - Conversación */}
                    <div className="space-y-6">
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Transcripción de Conversación
                        </h3>
                        <div className="max-h-96 overflow-y-auto space-y-3">
                          {conversation.length > 0 ? (
                            conversation.map((msg, index) => (
                              <div
                                key={index}
                                className={`p-3 rounded-lg ${
                                  msg.speaker === 'cliente' 
                                    ? 'bg-blue-100 dark:bg-blue-900/30 ml-8' 
                                    : 'bg-gray-100 dark:bg-gray-700 mr-8'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-medium ${
                                    msg.speaker === 'cliente' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {msg.speaker === 'cliente' ? 'Cliente' : 'Agente'}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {msg.timestamp}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
                                  {msg.message}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                              <p>No hay transcripción disponible</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Resumen de la Llamada */}
                      {callDetail.resumen_llamada && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Resumen de la Llamada
                          </h3>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {callDetail.resumen_llamada}
                          </p>
                        </div>
                      )}

                      {/* Gráfica Radar de Calificaciones */}
                      {callDetail.calificaciones && Object.keys(callDetail.calificaciones).length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Análisis Visual de Performance
                          </h3>
                          <div className="relative h-80 flex items-center justify-center">
                            <canvas 
                              id={`radar-chart-call-${callDetail.call_id}`}
                              className="max-w-full max-h-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>
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

