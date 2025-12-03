/**
 * ============================================
 * GESTIÓN DE PROSPECTOS - MÓDULO PROSPECTOS
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/prospectos/README_PROSPECTOS.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/prospectos/README_PROSPECTOS.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/prospectos/CHANGELOG_PROSPECTOS.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Search, Filter, SortAsc, SortDesc, X, User, Users, Phone, Mail,
  Calendar, MapPin, Building, DollarSign, Clock, Tag,
  ChevronRight, Eye, Edit, Star, TrendingUp, Activity,
  FileText, MessageSquare, CheckCircle, AlertTriangle, Network,
  LayoutGrid, Table2, PhoneCall, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analysisSupabase } from '../../config/analysisSupabase';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
import Chart from 'chart.js/auto';
import { useAuth } from '../../contexts/AuthContext';
import { permissionsService } from '../../services/permissionsService';
import { prospectsViewPreferencesService } from '../../services/prospectsViewPreferencesService';
import type { ViewType } from '../../services/prospectsViewPreferencesService';
import ProspectosKanban from './ProspectosKanban';
import { AssignmentContextMenu } from '../shared/AssignmentContextMenu';
import { AssignmentBadge } from '../analysis/AssignmentBadge';
import { coordinacionService } from '../../services/coordinacionService';
import { ScheduledCallsSection } from '../shared/ScheduledCallsSection';

interface Prospecto {
  id: string;
  nombre_completo?: string;
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  nombre_whatsapp?: string;
  edad?: number;
  cumpleanos?: string;
  estado_civil?: string;
  nombre_conyuge?: string;
  ciudad_residencia?: string;
  requiere_atencion_humana?: boolean;
  motivo_handoff?: string | null;
  contactado_por_vendedor?: boolean;
  etapa?: string;
  ingresos?: string;
  score?: string;
  whatsapp?: string;
  telefono_principal?: string;
  telefono_adicional?: string;
  email?: string;
  observaciones?: string;
  id_uchat?: string;
  id_airtable?: string;
  created_at?: string;
  updated_at?: string;
  campana_origen?: string;
  interes_principal?: string;
  destino_preferencia?: string[];
  tamano_grupo?: number;
  cantidad_menores?: number;
  viaja_con?: string;
  asesor_asignado?: string;
  crm_data?: any[];
  id_dynamics?: string;
  coordinacion_id?: string;
  ejecutivo_id?: string;
  coordinacion_codigo?: string;
  coordinacion_nombre?: string;
  ejecutivo_nombre?: string;
  ejecutivo_email?: string;
}

interface FilterState {
  search: string;
  etapa: string;
  score: string;
  campana_origen: string;
  dateRange: string;
}

interface SortState {
  field: keyof Prospecto;
  direction: 'asc' | 'desc';
}

interface SidebarProps {
  prospecto: Prospecto | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToLiveChat?: (prospectoId: string) => void;
  onNavigateToNatalia?: (callId: string) => void;
  onOpenCallDetail?: (callId: string) => void;
}

// Interface para el modal de detalle de llamada
interface CallDetailModalProps {
  callId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// Modal de detalle de llamada dentro de Prospectos
const CallDetailModal: React.FC<CallDetailModalProps> = ({ callId, isOpen, onClose }) => {
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
      
      // Cargar datos de análisis (usar maybeSingle para evitar error 406 si no existe)
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
            className="fixed inset-0 bg-black bg-opacity-50 z-[110]"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-8 md:inset-16 lg:inset-24 xl:inset-32 bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-[110] overflow-hidden"
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

interface LlamadaVenta {
  call_id: string;
  fecha_llamada: string;
  duracion_segundos: number;
  es_venta_exitosa: boolean;
  call_status: string;
  tipo_llamada: string;
  nivel_interes: string;
  probabilidad_cierre: number;
  precio_ofertado: string;
  costo_total: string;
  tiene_feedback: boolean;
  feedback_resultado: string;
}

interface WhatsAppConversation {
  id: string;
  conversation_id: string;
  created_at: string;
  last_message_at?: string;
  status: string;
  message_count?: number;
  customer_name?: string;
}

interface TimelineEvent {
  id: string;
  type: 'call' | 'message' | 'created' | 'updated';
  date: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  callId?: string; // Para identificar llamadas y abrir el modal
}

// Sidebar con ficha completa del prospecto
const ProspectoSidebar: React.FC<SidebarProps> = ({ prospecto, isOpen, onClose, onNavigateToLiveChat, onNavigateToNatalia, onOpenCallDetail }) => {
  const [hasActiveChat, setHasActiveChat] = useState(false);
  const [llamadas, setLlamadas] = useState<LlamadaVenta[]>([]);
  const [whatsappConversations, setWhatsappConversations] = useState<WhatsAppConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Verificar si hay conversación activa en live chat y cargar llamadas
  useEffect(() => {
    if (isOpen && prospecto?.id) {
      // Resetear estados al abrir
      setHasActiveChat(false);
      setLlamadas([]);
      setWhatsappConversations([]);
      setLoadingConversations(false);
      
      // Cargar datos frescos
      checkActiveChat(prospecto.id);
      loadLlamadasProspecto(prospecto.id);
      loadWhatsAppConversations(prospecto.id);
    }
  }, [isOpen, prospecto]);

  const loadLlamadasProspecto = async (prospectoId: string) => {
    try {
      const { data, error } = await analysisSupabase
        .from('llamadas_ventas')
        .select(`
          call_id,
          fecha_llamada,
          duracion_segundos,
          es_venta_exitosa,
          call_status,
          tipo_llamada,
          nivel_interes,
          probabilidad_cierre,
          precio_ofertado,
          costo_total,
          tiene_feedback,
          feedback_resultado,
          datos_llamada,
          audio_ruta_bucket
        `)
        .eq('prospecto', prospectoId)
        .order('fecha_llamada', { ascending: false });

      if (error) {
        console.error('Error loading llamadas:', error);
        return;
      }

      // Filtrar llamadas "activas" que en realidad ya finalizaron
      const llamadasFiltradas = (data || []).map(llamada => {
        // Extraer razon_finalizacion de datos_llamada (JSONB)
        const razonFinalizacion = llamada.datos_llamada?.razon_finalizacion || 
                                  (typeof llamada.datos_llamada === 'string' 
                                    ? JSON.parse(llamada.datos_llamada)?.razon_finalizacion 
                                    : null);
        
        // Calcular antigüedad de la llamada (en horas)
        const fechaLlamada = llamada.fecha_llamada ? new Date(llamada.fecha_llamada) : null;
        const horasTranscurridas = fechaLlamada 
          ? (Date.now() - fechaLlamada.getTime()) / (1000 * 60 * 60)
          : 0;
        
        // Si tiene call_status 'activa' pero tiene razon_finalizacion o duracion_segundos > 0, 
        // entonces ya finalizó y debe mostrarse como 'finalizada'
        if (llamada.call_status === 'activa' && (razonFinalizacion || (llamada.duracion_segundos && llamada.duracion_segundos > 0))) {
          return {
            ...llamada,
            call_status: 'finalizada'
          };
        }
        
        // Si tiene call_status 'activa' pero es muy antigua (> 2 horas) y no tiene duración ni audio,
        // entonces probablemente falló y debe mostrarse como 'perdida'
        if (llamada.call_status === 'activa' && 
            horasTranscurridas > 2 && 
            (!llamada.duracion_segundos || llamada.duracion_segundos === 0) && 
            !llamada.audio_ruta_bucket) {
          return {
            ...llamada,
            call_status: 'perdida'
          };
        }
        
        return llamada;
      });

      setLlamadas(llamadasFiltradas);
    } catch (error) {
      console.error('Error loading llamadas:', error);
    }
  };

  const checkActiveChat = async (prospectoId: string) => {
    try {
      // Verificar si hay conversación activa en uchat_conversations usando múltiples métodos de vinculación
      
      // Método 1: Por prospect_id en metadata
      const { data: dataByProspectId, error: errorProspectId } = await supabaseSystemUI
        .from('uchat_conversations')
        .select('id, metadata')
        .eq('status', 'active');
      
      let hasActiveByProspectId = false;
      if (dataByProspectId && !errorProspectId) {
        hasActiveByProspectId = dataByProspectId.some(conv => 
          conv.metadata?.prospect_id === prospectoId
        );
      }
      
      // Método 2: Por customer_phone (whatsapp)
      let hasActiveByPhone = false;
      if (prospecto?.whatsapp && !hasActiveByProspectId) {
        const { data: dataByPhone, error: errorPhone } = await supabaseSystemUI
          .from('uchat_conversations')
          .select('id')
          .eq('customer_phone', prospecto.whatsapp)
          .eq('status', 'active')
          .limit(1);
        
        hasActiveByPhone = dataByPhone && dataByPhone.length > 0;
      }
      
      // Método 3: Por conversation_id (id_uchat)
      let hasActiveByUchatId = false;
      if (prospecto?.id_uchat && !hasActiveByProspectId && !hasActiveByPhone) {
        const { data: dataByUchatId, error: errorUchatId } = await supabaseSystemUI
          .from('uchat_conversations')
          .select('id')
          .eq('conversation_id', prospecto.id_uchat)
          .eq('status', 'active')
          .limit(1);
        
        hasActiveByUchatId = dataByUchatId && dataByUchatId.length > 0;
      }
      
      const hasActiveConversation = hasActiveByProspectId || hasActiveByPhone || hasActiveByUchatId;
      
      setHasActiveChat(hasActiveConversation);
    } catch (error) {
      console.error('Error checking active chat:', error);
      setHasActiveChat(false);
    }
  };

  const loadWhatsAppConversations = async (prospectoId: string) => {
    setLoadingConversations(true);
    try {
      let conversations: WhatsAppConversation[] = [];

      // Primero buscar todas las conversaciones activas y filtrar por metadata
      const { data: allActiveConversations, error: errorAll } = await supabaseSystemUI
        .from('uchat_conversations')
        .select('id, conversation_id, created_at, last_message_at, status, message_count, customer_name, metadata')
        .eq('status', 'active');

      if (allActiveConversations && !errorAll) {
        conversations = allActiveConversations.filter(conv => 
          conv.metadata && (conv.metadata as any).prospect_id === prospectoId
        );
      }

      // Si no hay conversaciones por metadata, buscar por customer_phone (whatsapp)
      if (conversations.length === 0 && prospecto?.whatsapp) {
        const { data: conversationsByPhone, error: errorPhone } = await supabaseSystemUI
          .from('uchat_conversations')
          .select('id, conversation_id, created_at, last_message_at, status, message_count, customer_name')
          .eq('customer_phone', prospecto.whatsapp)
          .order('last_message_at', { ascending: false });

        if (conversationsByPhone && !errorPhone) {
          conversations = conversationsByPhone;
        }
      }

      setWhatsappConversations(conversations || []);
    } catch (error) {
      console.error('Error cargando conversaciones WhatsApp:', error);
      setWhatsappConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const buildTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Agregar eventos de llamadas
    llamadas.forEach(call => {
      events.push({
        id: `call-${call.call_id}`,
        type: 'call',
        date: call.fecha_llamada,
        title: `Llamada ${call.call_status}`,
        description: `${Math.floor(call.duracion_segundos / 60)}:${(call.duracion_segundos % 60).toString().padStart(2, '0')} • ${call.nivel_interes || 'Sin interés'}`,
        callId: call.call_id, // Agregar callId para poder abrir el modal
        icon: <PhoneCall className="w-4 h-4 text-blue-500" />
      });
    });

    // Agregar eventos de conversaciones WhatsApp
    whatsappConversations.forEach(conv => {
      const convDate = conv.last_message_at || conv.created_at;
      events.push({
        id: `conv-${conv.id}`,
        type: 'message',
        date: convDate,
        title: `Conversación WhatsApp ${conv.status === 'active' ? '(Activa)' : ''}`,
        description: `${conv.message_count || 0} mensajes • ${conv.customer_name || 'Sin nombre'}`,
        icon: <MessageSquare className="w-4 h-4 text-green-500" />
      });
    });

    // Agregar eventos de creación y actualización
    if (prospecto?.created_at) {
      events.push({
        id: 'created',
        type: 'created',
        date: prospecto.created_at,
        title: 'Prospecto creado',
        icon: <CheckCircle className="w-4 h-4 text-green-500" />
      });
    }

    if (prospecto?.updated_at && prospecto.updated_at !== prospecto.created_at) {
      events.push({
        id: 'updated',
        type: 'updated',
        date: prospecto.updated_at,
        title: 'Última actualización',
        icon: <Clock className="w-4 h-4 text-gray-500" />
      });
    }

    // Ordenar por fecha descendente (más reciente primero)
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  if (!prospecto) return null;

  const getStatusColor = (etapa: string) => {
    if (!etapa) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    
    const etapaLower = etapa.toLowerCase().trim();
    
    // Nuevos estados al principio (mismos colores que kanban)
    if (etapaLower === 'es miembro' || etapaLower === 'es miembro activo') {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
    }
    if (etapaLower === 'activo pqnc' || etapaLower === 'activo en pqnc') {
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400';
    }
    
    // Estados existentes (mismos colores que kanban)
    if (etapaLower === 'validando membresia' || etapaLower === 'validando membresía') {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    }
    if (etapaLower === 'en seguimiento' || etapaLower === 'seguimiento') {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
    if (etapaLower === 'interesado' || etapaLower === 'interesada') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    }
    if (etapaLower === 'atendió llamada' || etapaLower === 'atendio llamada' || etapaLower === 'atendio la llamada') {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    }
    
    // Estados legacy
    switch (etapaLower) {
      case 'nuevo': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'contactado': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'calificado': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'propuesta': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'transferido': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
      case 'finalizado': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'perdido': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'Q Elite': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'Q Premium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Q Reto': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad?.toLowerCase()) {
      case 'alta': return 'text-red-600 dark:text-red-400';
      case 'media': return 'text-yellow-600 dark:text-yellow-400';
      case 'baja': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <motion.div 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed right-0 top-0 h-full w-[540px] bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
                className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-purple-600"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-bold text-white">
                      {prospecto.nombre_completo?.charAt(0).toUpperCase() || 
                       prospecto.nombre?.charAt(0).toUpperCase() || 
                       prospecto.nombre_whatsapp?.charAt(0).toUpperCase() || 
                       'P'}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {prospecto.nombre_completo || `${prospecto.nombre} ${prospecto.apellido_paterno} ${prospecto.apellido_materno}`.trim() || prospecto.nombre_whatsapp || 'Cargando...'}
                    </h2>
                    <p className="text-sm text-white/80">
                      {prospecto.ciudad_residencia && prospecto.interes_principal 
                        ? `${prospecto.ciudad_residencia} • ${prospecto.interes_principal}`
                        : prospecto.ciudad_residencia || prospecto.interes_principal || 'Información del Prospecto'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onNavigateToLiveChat && (
                    <button 
                      onClick={() => {
                        onNavigateToLiveChat(prospecto.id);
                      }}
                      className="p-2 rounded-full transition-colors shadow-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                      title="Ir a Live Chat (buscar o crear conversación)"
                    >
                      <MessageSquare size={20} />
                    </button>
                  )}
                  <button 
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X size={24} className="text-white" />
                  </button>
                </div>
              </motion.div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Etapa Destacada */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Etapa Actual</p>
                        <h3 className={`text-xl font-bold text-gray-900 dark:text-white`}>
                          {prospecto.etapa || 'Sin etapa'}
                        </h3>
                      </div>
                      {prospecto.score && (
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                          <Star className="text-yellow-500 dark:text-yellow-400" size={16} />
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {prospecto.score}
                          </span>
                        </div>
                      )}
                    </div>
                    {prospecto.requiere_atencion_humana && (
                      <div className="bg-orange-50 dark:bg-orange-900/20 px-4 py-3 rounded-lg border border-orange-200 dark:border-orange-800 w-full">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" size={16} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-orange-700 dark:text-orange-300 block mb-1">
                              Requiere atención
                            </span>
                            {prospecto.motivo_handoff && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 leading-relaxed break-words">
                                {prospecto.motivo_handoff}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Información Personal y Contacto */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
                  className="space-y-4"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <User size={18} />
                    Información Personal y Contacto
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <Mail className="w-3 h-3 inline mr-1" />
                        Email
                      </label>
                      <div className="text-gray-900 dark:text-white font-mono text-xs break-all">
                        {prospecto.email || 'No disponible'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <MessageSquare className="w-3 h-3 inline mr-1" />
                        WhatsApp
                      </label>
                      <div className="text-gray-900 dark:text-white font-mono text-xs">
                        {prospecto.whatsapp || 'No disponible'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <Phone className="w-3 h-3 inline mr-1" />
                        Teléfono
                      </label>
                      <div className="text-gray-900 dark:text-white font-mono text-xs">
                        {prospecto.telefono_principal || 'No disponible'}
                      </div>
                    </div>
                    
                    {prospecto.edad && (
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Edad</label>
                        <div className="text-gray-900 dark:text-white">{prospecto.edad} años</div>
                      </div>
                    )}
                    {prospecto.estado_civil && (
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Estado Civil</label>
                        <div className="text-gray-900 dark:text-white">{prospecto.estado_civil}</div>
                      </div>
                    )}
                    {prospecto.ciudad_residencia && (
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          Ciudad
                        </label>
                        <div className="text-gray-900 dark:text-white">{prospecto.ciudad_residencia}</div>
                      </div>
                    )}
                    
                    {prospecto.cumpleanos && (
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Cumpleaños
                        </label>
                        <div className="text-gray-900 dark:text-white">{prospecto.cumpleanos}</div>
                      </div>
                    )}
                    {prospecto.nombre_conyuge && (
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          <Heart className="w-3 h-3 inline mr-1" />
                          Cónyuge
                        </label>
                        <div className="text-gray-900 dark:text-white">{prospecto.nombre_conyuge}</div>
                      </div>
                    )}
                    {prospecto.campana_origen && (
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Campaña</label>
                        <div className="text-gray-900 dark:text-white">{prospecto.campana_origen}</div>
                      </div>
                    )}
                    {prospecto.ingresos && (
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          <DollarSign className="w-3 h-3 inline mr-1" />
                          Ingresos
                        </label>
                        <div className="text-gray-900 dark:text-white font-medium">
                          {prospecto.ingresos}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Información de Asignación */}
                {(prospecto.coordinacion_codigo || prospecto.ejecutivo_nombre) && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.35, ease: "easeOut" }}
                    className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 space-y-3 border border-purple-200 dark:border-purple-800"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Users size={18} className="text-purple-600 dark:text-purple-400" />
                      Asignación
                    </h3>
                    <AssignmentBadge
                      call={{
                        coordinacion_codigo: prospecto.coordinacion_codigo,
                        coordinacion_nombre: prospecto.coordinacion_nombre,
                        ejecutivo_nombre: prospecto.ejecutivo_nombre,
                        ejecutivo_email: prospecto.ejecutivo_email
                      } as any}
                      variant="inline"
                    />
                  </motion.div>
                )}

                {/* Información de Viaje (si aplica) */}
                {(prospecto.destino_preferencia || prospecto.tamano_grupo || prospecto.cantidad_menores || prospecto.viaja_con) && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.4, ease: "easeOut" }}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <MapPin size={18} />
                      Información de Viaje
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {prospecto.destino_preferencia && (
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Destinos Preferencia</label>
                          <div className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-3 py-2 rounded">
                            {Array.isArray(prospecto.destino_preferencia) ? 
                              prospecto.destino_preferencia.join(', ') : 
                              prospecto.destino_preferencia}
                          </div>
                        </div>
                      )}
                      {prospecto.tamano_grupo && (
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Tamaño Grupo</label>
                          <div className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-3 py-2 rounded">
                            {prospecto.tamano_grupo} personas
                          </div>
                        </div>
                      )}
                      {prospecto.cantidad_menores !== null && prospecto.cantidad_menores !== undefined && (
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Menores</label>
                          <div className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-3 py-2 rounded">
                            {prospecto.cantidad_menores} menores
                          </div>
                        </div>
                      )}
                      {prospecto.viaja_con && (
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Viaja Con</label>
                          <div className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-3 py-2 rounded">
                            {prospecto.viaja_con}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Llamadas Programadas */}
                <ScheduledCallsSection
                  prospectoId={prospecto.id}
                  prospectoNombre={prospecto.nombre_completo || `${prospecto.nombre} ${prospecto.apellido_paterno} ${prospecto.apellido_materno}`.trim()}
                  delay={0.45}
                />

                {/* Observaciones */}
                {prospecto.observaciones && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.5, ease: "easeOut" }}
                    className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 space-y-3 border border-yellow-200 dark:border-yellow-800"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <FileText size={18} className="text-yellow-600 dark:text-yellow-400" />
                      Observaciones
                    </h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-3 last:mb-0 whitespace-pre-wrap">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          br: () => <br />,
                        }}
                      >
                        {prospecto.observaciones.replace(/\\n/g, '\n')}
                      </ReactMarkdown>
                    </div>
                  </motion.div>
                )}

                {/* Timeline */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.55, ease: "easeOut" }}
                  className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar size={18} />
                    Timeline
                  </h3>
                  {loadingConversations ? (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Cargando timeline...</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {buildTimelineEvents().map((event, index) => {
                        const isCall = event.type === 'call' && event.callId;
                        return (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => {
                              if (isCall && event.callId && onOpenCallDetail) {
                                onOpenCallDetail(event.callId);
                              }
                            }}
                            className={`flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 ${
                              isCall ? 'cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all' : ''
                            }`}
                          >
                          <div className="mt-0.5">
                            {event.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                {event.title}
                              </h4>
                              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                                {new Date(event.date).toLocaleDateString('es-MX', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {event.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </motion.div>
                        );
                      })}
                      {buildTimelineEvents().length === 0 && (
                        <div className="text-center py-4">
                          <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            No hay eventos en el timeline
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>


              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Componente principal de Prospectos
interface ProspectosManagerProps {
  onNavigateToLiveChat?: (prospectoId: string) => void;
  onNavigateToNatalia?: (callId: string) => void;
}

const ProspectosManager: React.FC<ProspectosManagerProps> = ({ onNavigateToLiveChat, onNavigateToNatalia }) => {
  const { user } = useAuth();
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProspecto, setSelectedProspecto] = useState<Prospecto | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Estados para el modal de detalle de llamada
  const [callDetailModalOpen, setCallDetailModalOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  
  // Estado para vista (Kanban/Datagrid)
  const [viewType, setViewType] = useState<ViewType>('kanban');
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    etapa: '',
    score: '',
    campana_origen: '',
    dateRange: ''
  });
  
  const [sort, setSort] = useState<SortState>({
    field: 'created_at',
    direction: 'desc'
  });

  // Estado para menú contextual de asignación
  const [assignmentContextMenu, setAssignmentContextMenu] = useState<{
    prospectId: string;
    coordinacionId?: string;
    ejecutivoId?: string;
    prospectData?: {
      id_dynamics?: string | null;
      nombre_completo?: string | null;
      nombre_whatsapp?: string | null;
      email?: string | null;
      whatsapp?: string | null;
    };
    position: { x: number; y: number };
  } | null>(null);

  // Cargar preferencias de vista al inicio
  useEffect(() => {
    const preferences = prospectsViewPreferencesService.getUserPreferences(user?.id || null);
    setViewType(preferences.viewType);
    setCollapsedColumns(preferences.collapsedColumns || []);
  }, [user?.id]);

  // Cargar prospectos
  useEffect(() => {
    if (user?.id) {
      loadProspectos();
    }
  }, [user?.id]);

  const loadProspectos = async () => {
    try {
      setLoading(true);
      
      let query = analysisSupabase
        .from('prospectos')
        .select('*');

      // Aplicar filtros de permisos si hay usuario
      if (user?.id) {
        const ejecutivoFilter = await permissionsService.getEjecutivoFilter(user.id);
        const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(user.id);

        if (ejecutivoFilter) {
          // Ejecutivo: solo sus prospectos asignados
          query = query.eq('ejecutivo_id', ejecutivoFilter);
        } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
          // Coordinador: todos los prospectos de sus coordinaciones (múltiples)
          // Excluir prospectos sin coordinación asignada
          query = query.in('coordinacion_id', coordinacionesFilter).not('coordinacion_id', 'is', null);
        }
        // Admin: sin filtros
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading prospectos:', error);
        return;
      }

      // Enriquecer prospectos con datos de coordinación y ejecutivo
      const enrichedProspectos = await Promise.all(
        (data || []).map(async (prospecto: Prospecto) => {
          let coordinacionInfo = null;
          let ejecutivoInfo = null;

          if (prospecto.coordinacion_id) {
            try {
              coordinacionInfo = await coordinacionService.getCoordinacionById(prospecto.coordinacion_id);
            } catch (error) {
              console.warn('Error obteniendo coordinación:', error);
            }
          }

          if (prospecto.ejecutivo_id) {
            try {
              ejecutivoInfo = await coordinacionService.getEjecutivoById(prospecto.ejecutivo_id);
            } catch (error) {
              console.warn('Error obteniendo ejecutivo:', error);
            }
          }

          return {
            ...prospecto,
            coordinacion_codigo: coordinacionInfo?.codigo,
            coordinacion_nombre: coordinacionInfo?.nombre,
            ejecutivo_nombre: ejecutivoInfo?.full_name,
            ejecutivo_email: ejecutivoInfo?.email
          };
        })
      );

      setProspectos(enrichedProspectos);
    } catch (error) {
      console.error('❌ Error loading prospectos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y ordenar prospectos
  const filteredAndSortedProspectos = useMemo(() => {
    let filtered = prospectos;

    // Aplicar filtros
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.nombre_completo?.toLowerCase().includes(searchLower) ||
        p.nombre?.toLowerCase().includes(searchLower) ||
        p.apellido_paterno?.toLowerCase().includes(searchLower) ||
        p.apellido_materno?.toLowerCase().includes(searchLower) ||
        p.email?.toLowerCase().includes(searchLower) ||
        p.nombre_whatsapp?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.etapa) {
      filtered = filtered.filter(p => p.etapa === filters.etapa);
    }

    if (filters.score) {
      filtered = filtered.filter(p => p.score === filters.score);
    }

    if (filters.campana_origen) {
      filtered = filtered.filter(p => p.campana_origen === filters.campana_origen);
    }

    // Aplicar ordenamiento
    filtered.sort((a, b) => {
      const aValue = a[sort.field];
      const bValue = b[sort.field];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sort.direction === 'asc' ? 
          aValue.localeCompare(bValue) : 
          bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sort.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    return filtered;
  }, [prospectos, filters, sort]);

  // Emitir evento para actualizar contador en el header
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('prospect-count-update', {
      detail: {
        filtered: filteredAndSortedProspectos.length,
        total: prospectos.length
      }
    }));
  }, [filteredAndSortedProspectos.length, prospectos.length]);

  const handleSort = (field: keyof Prospecto) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleProspectoClick = (prospecto: Prospecto) => {
    setSelectedProspecto(prospecto);
    setSidebarOpen(true);
  };

  const handleOpenCallDetail = (callId: string) => {
    setSelectedCallId(callId);
    setCallDetailModalOpen(true);
  };

  // Manejar cambio de vista
  const handleViewTypeChange = (newViewType: ViewType) => {
    setViewType(newViewType);
    prospectsViewPreferencesService.updateViewType(user?.id || null, newViewType);
  };

  // Manejar colapso de columnas en Kanban
  const handleToggleColumnCollapse = (columnId: string) => {
    const newCollapsed = prospectsViewPreferencesService.toggleColumnCollapse(user?.id || null, columnId);
    setCollapsedColumns(newCollapsed);
  };

  const getUniqueValues = (field: keyof Prospecto) => {
    return [...new Set(prospectos.map(p => p[field]).filter(Boolean))];
  };

  const getStatusColor = (etapa: string) => {
    if (!etapa) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    
    const etapaLower = etapa.toLowerCase().trim();
    
    // Nuevos estados al principio (mismos colores que kanban)
    if (etapaLower === 'es miembro' || etapaLower === 'es miembro activo') {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
    }
    if (etapaLower === 'activo pqnc' || etapaLower === 'activo en pqnc') {
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400';
    }
    
    // Estados existentes (mismos colores que kanban)
    if (etapaLower === 'validando membresia' || etapaLower === 'validando membresía') {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    }
    if (etapaLower === 'en seguimiento' || etapaLower === 'seguimiento') {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
    if (etapaLower === 'interesado' || etapaLower === 'interesada') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    }
    if (etapaLower === 'atendió llamada' || etapaLower === 'atendio llamada' || etapaLower === 'atendio la llamada') {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    }
    
    // Estados legacy
    switch (etapaLower) {
      case 'nuevo': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'contactado': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'calificado': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'propuesta': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'transferido': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
      case 'finalizado': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'perdido': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'Q Elite': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'Q Premium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Q Reto': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse">
          <div className="rounded-full h-8 w-8 bg-blue-200 dark:bg-blue-800"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Filtros con Toggle de Vista */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 md:p-4"
      >
        <div className="flex flex-col md:flex-row gap-3 md:gap-2 items-stretch md:items-center">
          {/* Búsqueda - Ocupa más espacio */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar prospectos..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full h-9 pl-10 pr-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          
          {/* Filtros compactos */}
          <div className="flex flex-wrap md:flex-nowrap gap-2 items-center">
            <select
              value={filters.etapa}
              onChange={(e) => setFilters(prev => ({ ...prev, etapa: e.target.value }))}
              className="h-9 px-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-1 md:flex-none md:w-auto min-w-[120px]"
            >
              <option value="">Todas las etapas</option>
              {getUniqueValues('etapa').map(etapa => (
                <option key={etapa} value={etapa}>{etapa}</option>
              ))}
            </select>
            
            <select
              value={filters.score}
              onChange={(e) => setFilters(prev => ({ ...prev, score: e.target.value }))}
              className="h-9 px-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-1 md:flex-none md:w-auto min-w-[120px]"
            >
              <option value="">Todos los scores</option>
              <option value="Q Reto">Q Reto</option>
              <option value="Q Premium">Q Premium</option>
              <option value="Q Elite">Q Elite</option>
            </select>
            
            <select
              value={filters.campana_origen}
              onChange={(e) => setFilters(prev => ({ ...prev, campana_origen: e.target.value }))}
              className="h-9 px-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-1 md:flex-none md:w-auto min-w-[100px]"
            >
              <option value="">Todas las campañas</option>
              {getUniqueValues('campana_origen').map(campana => (
                <option key={campana} value={campana}>{campana}</option>
              ))}
            </select>
            
            <button 
              onClick={() => setFilters({ search: '', etapa: '', score: '', campana_origen: '', dateRange: '' })}
              className="h-9 flex items-center justify-center gap-1.5 px-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-xs whitespace-nowrap"
            >
              <Filter size={14} />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
            
            {/* Toggle de Vista al final */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-0.5 h-9">
              <button
                onClick={() => handleViewTypeChange('datagrid')}
                className={`h-full flex items-center gap-1.5 px-2 rounded-md transition-all duration-200 ${
                  viewType === 'datagrid'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title="Vista de tabla"
              >
                <Table2 size={16} />
                <span className="text-xs font-medium hidden sm:inline">Tabla</span>
              </button>
              <button
                onClick={() => handleViewTypeChange('kanban')}
                className={`h-full flex items-center gap-1.5 px-2 rounded-md transition-all duration-200 ${
                  viewType === 'kanban'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title="Vista Kanban"
              >
                <LayoutGrid size={16} />
                <span className="text-xs font-medium hidden sm:inline">Kanban</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Vista según preferencia */}
      {viewType === 'kanban' ? (
        /* Vista Kanban */
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
        >
          <ProspectosKanban
            prospectos={filteredAndSortedProspectos}
            onProspectoClick={handleProspectoClick}
            onProspectoContextMenu={(e, prospecto) => {
              if (user?.role_name === 'coordinador' || user?.role_name === 'admin') {
                setAssignmentContextMenu({
                  prospectId: prospecto.id,
                  coordinacionId: prospecto.coordinacion_id,
                  ejecutivoId: prospecto.ejecutivo_id,
                  prospectData: {
                    id_dynamics: prospecto.id_dynamics,
                    nombre_completo: prospecto.nombre_completo,
                    nombre_whatsapp: prospecto.nombre_whatsapp,
                    email: prospecto.email,
                    whatsapp: prospecto.whatsapp,
                  },
                  position: { x: e.clientX, y: e.clientY }
                });
              }
            }}
            collapsedColumns={collapsedColumns}
            onToggleColumnCollapse={handleToggleColumnCollapse}
            getStatusColor={getStatusColor}
            getScoreColor={getScoreColor}
          />
        </motion.div>
      ) : (
        /* Data Grid */
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {/* Vista móvil: Cards */}
          <div className="block md:hidden p-4 space-y-4">
            {filteredAndSortedProspectos.map((prospecto, index) => (
              <motion.div
                key={prospecto.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => handleProspectoClick(prospecto)}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                      <User size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {prospecto.nombre_completo || `${prospecto.nombre} ${prospecto.apellido_paterno} ${prospecto.apellido_materno}`.trim()}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {prospecto.ciudad_residencia}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">WhatsApp:</span>
                    <div className="text-gray-900 dark:text-white font-mono truncate">{prospecto.whatsapp || '-'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Email:</span>
                    <div className="text-gray-900 dark:text-white truncate">{prospecto.email || '-'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Etapa:</span>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(prospecto.etapa || '')}`}>
                      {prospecto.etapa}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Score:</span>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getScoreColor(prospecto.score || '')}`}>
                      {prospecto.score}
                    </span>
                  </div>
                </div>
                
                {(prospecto.coordinacion_codigo || prospecto.ejecutivo_nombre) && (
                  <div className="mt-2">
                    <AssignmentBadge
                      call={{
                        coordinacion_codigo: prospecto.coordinacion_codigo,
                        coordinacion_nombre: prospecto.coordinacion_nombre,
                        ejecutivo_nombre: prospecto.ejecutivo_nombre,
                        ejecutivo_email: prospecto.ejecutivo_email
                      } as any}
                      variant="compact"
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Vista desktop/tablet: Tabla con scroll horizontal mejorado */}
          <div className="block overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {[
                    { key: 'nombre_completo', label: 'Nombre', sortable: true, responsive: false },
                    { key: 'whatsapp', label: 'WhatsApp', sortable: true, responsive: false },
                    { key: 'email', label: 'Email', sortable: true, responsive: 'md' },
                    { key: 'etapa', label: 'Etapa', sortable: true, responsive: false },
                    { key: 'created_at', label: 'Creado', sortable: true, responsive: 'md' },
                    { key: 'actions', label: '', sortable: false, responsive: false }
                  ].map(column => (
                    <th 
                      key={column.key}
                      className={`px-3 md:px-4 lg:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                        column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                      } ${column.responsive === 'lg' ? 'hidden lg:table-cell' : column.responsive === 'md' ? 'hidden md:table-cell' : ''}`}
                      onClick={column.sortable ? () => handleSort(column.key as keyof Prospecto) : undefined}
                    >
                      <div className="flex items-center gap-2">
                        {column.label}
                        {column.sortable && sort.field === column.key && (
                          sort.direction === 'asc' ? 
                          <SortAsc size={14} className="text-blue-600 dark:text-blue-400" /> : 
                          <SortDesc size={14} className="text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                  {filteredAndSortedProspectos.map((prospecto, index) => (
                    <motion.tr
                      key={prospecto.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.01, ease: "easeOut" }}
                      onClick={() => handleProspectoClick(prospecto)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (user?.role_name === 'coordinador' || user?.role_name === 'admin') {
                          setAssignmentContextMenu({
                            prospectId: prospecto.id,
                            coordinacionId: prospecto.coordinacion_id,
                            ejecutivoId: prospecto.ejecutivo_id,
                            prospectData: {
                              id_dynamics: prospecto.id_dynamics,
                              nombre_completo: prospecto.nombre_completo,
                              nombre_whatsapp: prospecto.nombre_whatsapp,
                              email: prospecto.email,
                              whatsapp: prospecto.whatsapp,
                            },
                            position: { x: e.clientX, y: e.clientY }
                          });
                        }
                      }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-2 md:gap-3 min-w-[200px]">
                          <div className="p-1.5 md:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full flex-shrink-0">
                            <User size={14} className="md:w-4 md:h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs md:text-sm font-medium text-gray-900 dark:text-white truncate">
                              {prospecto.nombre_completo || `${prospecto.nombre} ${prospecto.apellido_paterno} ${prospecto.apellido_materno}`.trim()}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {prospecto.ciudad_residencia}
                            </div>
                            {/* Información de asignación */}
                            {(prospecto.coordinacion_codigo || prospecto.ejecutivo_nombre) && (
                              <div className="mt-1">
                                <AssignmentBadge
                                  call={{
                                    coordinacion_codigo: prospecto.coordinacion_codigo,
                                    coordinacion_nombre: prospecto.coordinacion_nombre,
                                    ejecutivo_nombre: prospecto.ejecutivo_nombre,
                                    ejecutivo_email: prospecto.ejecutivo_email
                                  } as any}
                                  variant="compact"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-900 dark:text-white font-mono">
                        <div className="min-w-[100px] md:min-w-[120px] truncate">{prospecto.whatsapp || '-'}</div>
                      </td>
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                        <div className="max-w-[150px] md:max-w-[200px] truncate">{prospecto.email || '-'}</div>
                      </td>
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(prospecto.etapa || '')}`}>
                          {prospecto.etapa}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                        <div className="min-w-[60px]">{prospecto.created_at ? new Date(prospecto.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' }) : 'N/A'}</div>
                      </td>
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 text-right">
                        <ChevronRight size={14} className="md:w-4 md:h-4 text-gray-400" />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          
          {filteredAndSortedProspectos.length === 0 && !loading && (
            <>
              {/* Mensaje vacío para vista móvil */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="block md:hidden text-center py-12 px-4"
              >
                <User size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No se encontraron prospectos con los filtros aplicados
                </p>
              </motion.div>
              
              {/* Mensaje vacío para vista desktop/tablet */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hidden md:block text-center py-12 px-4"
              >
                <User size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
                  No se encontraron prospectos con los filtros aplicados
                </p>
              </motion.div>
            </>
          )}
        </motion.div>
      )}

      {/* Menú contextual de asignación */}
      {assignmentContextMenu && (
        <AssignmentContextMenu
          prospectId={assignmentContextMenu.prospectId}
          coordinacionId={assignmentContextMenu.coordinacionId}
          ejecutivoId={assignmentContextMenu.ejecutivoId}
          prospectData={assignmentContextMenu.prospectData}
          isOpen={!!assignmentContextMenu}
          position={assignmentContextMenu.position}
          onClose={() => setAssignmentContextMenu(null)}
          onAssignmentComplete={() => {
            loadProspectos();
            setAssignmentContextMenu(null);
          }}
        />
      )}

      {/* Sidebar */}
      <ProspectoSidebar
        prospecto={selectedProspecto}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigateToLiveChat={onNavigateToLiveChat}
        onNavigateToNatalia={onNavigateToNatalia}
        onOpenCallDetail={handleOpenCallDetail}
      />

      {/* Modal de Detalle de Llamada */}
      <CallDetailModal
        callId={selectedCallId}
        isOpen={callDetailModalOpen}
        onClose={() => {
          setCallDetailModalOpen(false);
          setSelectedCallId(null);
        }}
      />
    </div>
  );
};

export default ProspectosManager;
