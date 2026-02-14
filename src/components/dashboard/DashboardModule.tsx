/**
 * ============================================
 * DASHBOARD EJECUTIVO - MÓDULO PRINCIPAL v3.0
 * ============================================
 * 
 * Dashboard analítico con 4 widgets principales:
 * 1. Estados de Llamadas (Barras Horizontales)
 * 2. Métricas de Comunicación (4 métricas clave - CORREGIDO)
 * 3. Pipeline de Prospectos (Funnel VERTICAL con CSS animado)
 * 4. Ventas CRM Data (desde tabla crm_data.transactions)
 * 
 * Características:
 * - Filtros globales por coordinación y período
 * - Cada widget expandible a fullscreen
 * - Gráficos con Recharts + CSS animado (funnel vertical)
 * - Solo accesible para: admin y coordinadores de la coordinación CALIDAD
 *   (NO admin_operativo, NO coordinadores de otras coordinaciones)
 * 
 * Versión: 3.0.0
 * Fecha: Enero 2025
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, LabelList, AreaChart, Area
} from 'recharts';
import Plot from 'react-plotly.js';
import {
  Phone, MessageSquare, Clock, Users, TrendingUp,
  Calendar, Building2, ChevronDown, Maximize2, Minimize2,
  RefreshCw, AlertCircle, CheckCircle2,
  DollarSign, UserCheck, UserX, Hourglass, PhoneCall,
  ArrowRightLeft, BarChart3, Activity, Layers, Award,
  X, Package
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectivePermissions } from '../../hooks/useEffectivePermissions';
import { useNinjaAwarePermissions } from '../../hooks/useNinjaAwarePermissions';
import { analysisSupabase } from '../../config/analysisSupabase';
import { permissionsService } from '../../services/permissionsService';
// supabaseSystemUI removido - ahora usamos coordinacion_id directamente en analysisSupabase
import { classifyCallStatus } from '../../services/callStatusClassifier';
import type { CallStatusGranular } from '../../services/callStatusClassifier';
import { coordinacionService } from '../../services/coordinacionService';
import type { Coordinacion } from '../../services/coordinacionService';
import toast from 'react-hot-toast';
import { ProspectosMetricsWidget, type GlobalTimePeriod } from './widgets/ProspectosMetricsWidget';
import { EjecutivosMetricsWidget } from './widgets/EjecutivosMetricsWidget';
import { getSignedGcsUrl } from '../../services/gcsUrlService';
import { etapasService } from '../../services/etapasService';
import type { Etapa } from '../../types/etapas';

// ============================================
// CONTEXT PARA VISTA EXPANDIDA
// ============================================
// Este context permite que los widgets hijos sepan si están siendo
// renderizados en el modal expandido o en la vista colapsada

interface WidgetViewContextType {
  isExpandedView: boolean;
}

const WidgetViewContext = React.createContext<WidgetViewContextType>({ isExpandedView: false });

const useWidgetView = () => React.useContext(WidgetViewContext);

// Componente helper que lee el Context y renderiza según la vista
const WidgetContent: React.FC<{
  collapsedContent: React.ReactNode;
  expandedContent: React.ReactNode;
}> = ({ collapsedContent, expandedContent }) => {
  const { isExpandedView } = useWidgetView();
  return <>{isExpandedView ? expandedContent : collapsedContent}</>;
};

// ============================================
// TIPOS E INTERFACES
// ============================================

type TimePeriod = 'year' | '6months' | 'month' | 'week' | '24hours';
type CoordinacionFilter = 'global' | string[];

interface DashboardFilters {
  period: TimePeriod;
  coordinaciones: CoordinacionFilter;
}

interface CallStatusData {
  status: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface CommunicationMetrics {
  avgCallDuration: number;
  avgMessagesPerProspect: number;
  totalCalls: number;
  totalMessages: number;
  totalProspects: number;
  transferRate: number;
  responseRate: number;
  // Datos históricos por mes para gráficas
  monthlyData: {
    month: string; // "Ene 2025"
    avgCallDuration: number;
    avgMessagesPerProspect: number;
    totalCalls: number;
    totalMessages: number;
    transferRate: number;
    responseRate: number;
  }[];
}

interface PipelineStage {
  name: string;
  shortName: string;
  count: number;
  percentage: number;
  fill: string;
  conversionFromPrevious?: number;
}

interface CRMCategoryData {
  count: number;           // Número de clientes con ventas
  certificados: number;    // Número total de certificados vendidos
  monto: number;           // Monto total
  reservaciones: number;   // Total de reservaciones
  paquetes: { numero: string; monto: number; fecha: string; coordinacion: string }[]; // Detalle
}

// Tipo de clasificación de venta (nueva lógica de atribución)
type SaleType = 'ASISTIDA_IA' | 'ASISTIDA_WHATSAPP' | 'SIN_ASISTENCIA';

// Interfaz para detalle individual de venta
interface SaleDetail {
  id: string;
  numeroPaquete: string;
  monto: number;
  fecha: string;
  coordinacion: string;
  statusCRM: string;
  ejecutivo: string;
  cliente?: string;
  prospectoId?: string;
  saleType: SaleType;
  origen?: string;
  iaAntes?: number;
  prospectoAntes?: number;
  vendedorAntes?: number;
}

interface SalesClassification {
  asistidaIA: number;
  asistidaWhatsApp: number;
  sinAsistencia: number;
  totalContabilizable: number;
  montoContabilizable: number;
}

interface CRMSalesData {
  activosPQNC: CRMCategoryData;
  inactivosPQNC: CRMCategoryData;
  enProceso: CRMCategoryData;
  otros: CRMCategoryData;
  total: CRMCategoryData;
  byCoordinacion: Record<string, { count: number; certificados: number; monto: number; asistidaIA: number; asistidaWhatsApp: number }>;
  byPeriod: { period: string; count: number; monto: number }[];
  allSalesDetails: SaleDetail[]; // Todos los detalles para el modal
  classification?: SalesClassification;
}

// ============================================
// MODAL DE VISTA PREVIA DE CONVERSACIÓN
// ============================================

interface ConversationMessage {
  id: string;
  mensaje: string;
  rol: 'Prospecto' | 'Bot' | 'Agente';
  fecha_hora: string;
  adjuntos?: any;
}

interface ConversationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospectoId: string;
  clienteName: string;
  onNavigateToWhatsApp: () => void;
}

// Cache para URLs de multimedia
const getMediaFromCache = (key: string): string | null => {
  const cachedData = localStorage.getItem(`media_${key}`);
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      const now = Date.now();
      if (parsed.url && parsed.timestamp && (now - parsed.timestamp) < 25 * 60 * 1000) {
        return parsed.url;
      } else {
        localStorage.removeItem(`media_${key}`);
      }
    } catch {
      localStorage.removeItem(`media_${key}`);
    }
  }
  return null;
};

const saveMediaToCache = (key: string, url: string): void => {
  try {
    localStorage.setItem(`media_${key}`, JSON.stringify({
      url,
      timestamp: Date.now()
    }));
  } catch {
    // Ignorar errores de localStorage lleno
  }
};

const ConversationPreviewModal: React.FC<ConversationPreviewModalProps> = ({
  isOpen,
  onClose,
  prospectoId,
  clienteName,
  onNavigateToWhatsApp
}) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && prospectoId) {
      loadMessages();
    }
  }, [isOpen, prospectoId]);

  useEffect(() => {
    // Scroll al final cuando se cargan los mensajes
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await analysisSupabase
        .from('mensajes_whatsapp')
        .select('id, mensaje, rol, fecha_hora, adjuntos')
        .eq('prospecto_id', prospectoId)
        .order('fecha_hora', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      toast.error('Error al cargar la conversación');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', { 
      weekday: 'short',
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  // Función para generar URL firmada (con autenticación JWT)
  const generateMediaUrl = async (filename: string, bucket: string = 'whatsapp-media'): Promise<string | null> => {
    // Usar servicio centralizado con autenticación JWT
    // El servicio ya maneja cache internamente
    return getSignedGcsUrl(filename, bucket, 30);
  };

  // Cargar URLs de adjuntos cuando hay mensajes
  useEffect(() => {
    const loadMediaUrls = async () => {
      const urlsToLoad: { key: string; filename: string; bucket: string }[] = [];
      
      messages.forEach((msg) => {
        if (!msg.adjuntos) return;
        try {
          const adjuntos = typeof msg.adjuntos === 'string' ? JSON.parse(msg.adjuntos) : msg.adjuntos;
          if (!Array.isArray(adjuntos)) return;
          
          adjuntos.forEach((adj: any, adjIdx: number) => {
            const filename = adj.filename || adj.archivo;
            if (filename) {
              const key = `${msg.id}-${adjIdx}`;
              const bucket = adj.bucket || 'whatsapp-media';
              // Solo cargar si no está ya en el estado
              if (!mediaUrls[key]) {
                urlsToLoad.push({ key, filename, bucket });
              }
            }
          });
        } catch {
          // Ignorar errores de parsing
        }
      });

      // Cargar URLs en paralelo (máximo 5 a la vez)
      for (let i = 0; i < urlsToLoad.length; i += 5) {
        const batch = urlsToLoad.slice(i, i + 5);
        const results = await Promise.all(
          batch.map(async ({ key, filename, bucket }) => {
            const url = await generateMediaUrl(filename, bucket);
            return { key, url };
          })
        );
        
        const newUrls: Record<string, string> = {};
        results.forEach(({ key, url }) => {
          if (url) newUrls[key] = url;
        });
        
        if (Object.keys(newUrls).length > 0) {
          setMediaUrls(prev => ({ ...prev, ...newUrls }));
        }
      }
    };

    if (messages.length > 0) {
      loadMediaUrls();
    }
  }, [messages]);

  const renderAdjuntos = (adjuntosData: any, messageId: string) => {
    if (!adjuntosData) return null;
    try {
      const adjuntos = typeof adjuntosData === 'string' ? JSON.parse(adjuntosData) : adjuntosData;
      if (!Array.isArray(adjuntos) || adjuntos.length === 0) return null;

      // Separar imágenes de otros adjuntos
      const images = adjuntos.filter((adj: any) => {
        const filename = adj.filename || adj.archivo || '';
        const tipoLower = (adj.tipo || '').toLowerCase();
        return filename.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) || 
               tipoLower.includes('imagen') || tipoLower.includes('image');
      });
      const otherFiles = adjuntos.filter((adj: any) => {
        const filename = adj.filename || adj.archivo || '';
        const tipoLower = (adj.tipo || '').toLowerCase();
        return !(filename.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) || 
                 tipoLower.includes('imagen') || tipoLower.includes('image'));
      });

      return (
        <div className="mt-1.5">
          {/* Grilla de imágenes - horizontal y compacta */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {images.map((adjunto: any, adjIdx: number) => {
                const filename = adjunto.filename || adjunto.archivo || '';
                const directUrl = adjunto.url || adjunto.media_url || '';
                const mediaKey = `${messageId}-${adjIdx}`;
                const loadedUrl = mediaUrls[mediaKey] || directUrl;

                if (loadedUrl) {
                  return (
                    <img 
                      key={adjIdx}
                      src={loadedUrl} 
                      alt="Imagen" 
                      className="w-[50px] h-[50px] rounded object-cover cursor-pointer hover:opacity-80 hover:scale-105 transition-all border border-white/30"
                      onClick={() => window.open(loadedUrl, '_blank')}
                      loading="lazy"
                    />
                  );
                } else {
                  return (
                    <div key={adjIdx} className="w-[50px] h-[50px] bg-white/20 rounded flex items-center justify-center">
                      <RefreshCw className="w-3 h-3 text-white/60 animate-spin" />
                    </div>
                  );
                }
              })}
            </div>
          )}

          {/* Otros archivos */}
          {otherFiles.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {otherFiles.map((adjunto: any, adjIdx: number) => {
                const filename = adjunto.filename || adjunto.archivo || '';
                const directUrl = adjunto.url || adjunto.media_url || '';
                const mediaKey = `${messageId}-${images.length + adjIdx}`;
                const loadedUrl = mediaUrls[mediaKey] || directUrl;

                return (
                  <a 
                    key={adjIdx}
                    href={loadedUrl || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] opacity-80 hover:opacity-100"
                  >
                    📎 <span className="truncate max-w-[80px]">{filename || 'Archivo'}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      );
    } catch {
      return null;
    }
  };

  // Agrupar mensajes por día
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: ConversationMessage[] }[] = [];
    let currentDate = '';

    messages.forEach(msg => {
      const msgDate = formatDate(msg.fecha_hora);
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  }, [messages]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-500 to-emerald-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{clienteName}</h3>
                  <p className="text-sm text-white/80">
                    {messages.length} mensajes
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onClose();
                    onNavigateToWhatsApp();
                  }}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Ir a WhatsApp
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500">Cargando conversación...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay mensajes en esta conversación</p>
                </div>
              </div>
            ) : (
              groupedMessages.map((group, groupIdx) => (
                <div key={groupIdx}>
                  {/* Separador de fecha */}
                  <div className="flex justify-center mb-4">
                    <span className="px-3 py-1 text-xs text-gray-500 bg-white dark:bg-gray-700 rounded-full shadow-sm">
                      {group.date}
                    </span>
                  </div>

                  {/* Mensajes del día */}
                  {group.messages.map((message, msgIdx) => {
                    const isCustomer = message.rol === 'Prospecto';
                    const isBot = message.rol === 'Bot';

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: msgIdx * 0.02 }}
                        className={`flex mb-3 ${isCustomer ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className={`max-w-[80%] ${isCustomer ? 'order-1' : 'order-2'}`}>
                          {/* Burbuja del mensaje */}
                          <div className={`relative px-3 py-2 rounded-2xl shadow-sm ${
                            isCustomer 
                              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                              : isBot
                                ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-br-md'
                                : 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white rounded-br-md'
                          }`}>
                            {/* Etiqueta de remitente */}
                            {!isCustomer && (
                              <div className="text-[10px] font-medium opacity-80 mb-1">
                                {isBot ? '🤖 Bot' : '👤 Agente'}
                              </div>
                            )}

                            {/* Contenido */}
                            {message.mensaje && (
                              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                {message.mensaje.replace(/\\n/g, '\n')}
                              </div>
                            )}

                            {/* Adjuntos */}
                            {renderAdjuntos(message.adjuntos, message.id)}

                            {/* Hora */}
                            <div className={`text-[10px] mt-1 ${
                              isCustomer ? 'text-gray-400' : 'text-white/70'
                            } text-right`}>
                              {formatTime(message.fecha_hora)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Vista previa de solo lectura
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onClose();
                  onNavigateToWhatsApp();
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Abrir en WhatsApp
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Datos del funnel por coordinación
interface FunnelCoordData {
  coordinacionId: string;
  coordinacionNombre: string;
  color: string;
  stages: { stage: string; count: number }[];
}

// ============================================
// CONSTANTES
// ============================================

// Función helper para obtener colores de coordinaciones dinámicamente
// Usa el código de la coordinación para mantener consistencia visual
// IMPORTANTE: Esta función debe retornar siempre un color válido (no undefined/null)
const getCoordColorGlobal = (codigo: string | null | undefined): string => {
  // Mapa de colores por código de coordinación
  const colorMap: Record<string, string> = {
    // Coordinaciones principales del sistema
    'CALIDAD': '#3B82F6',
    'VEN': '#F59E0B',
    'I360': '#10B981',
    'APEX': '#10B981', // I360 renombrado a APEX
    'COBACA': '#8B5CF6',
    'COB ACA': '#8B5CF6', // Variante con espacio
    'MVP': '#EC4899',
    'BOOM': '#EF4444',
    'AI-AGENT': '#6366F1'
  };
  
  // Si no hay código, retornar color fallback
  if (!codigo) return '#6B7280';
  
  const normalizedCode = codigo.toUpperCase().trim();
  const color = colorMap[normalizedCode];
  
  // Si no está en el mapa, generar un color basado en el hash del código
  // para garantizar consistencia y evitar grises
  if (!color) {
    const hashCode = normalizedCode.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const hue = Math.abs(hashCode) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }
  
  return color;
};

const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: 'year', label: 'Último Año' },
  { value: '6months', label: 'Últimos 6 Meses' },
  { value: 'month', label: 'Último Mes' },
  { value: 'week', label: 'Última Semana' },
  { value: '24hours', label: 'Últimas 24h' }
];

// ============================================
// ETAPAS DINÁMICAS DESDE BASE DE DATOS
// ============================================
// Las etapas ahora se cargan dinámicamente desde la tabla `etapas`
// usando etapasService (cache en memoria cargado al iniciar la app)
//
// IMPORTANTE: Las etapas con 0 prospectos NO se mostrarán en el funnel
// ACTUALIZACIÓN 2026-01-27: Eliminadas constantes hardcodeadas
// ============================================

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  transferida: { label: 'Transferidas', color: '#10B981' },
  atendida: { label: 'Atendidas (No Transfer.)', color: '#F59E0B' },
  no_contestada: { label: 'No Contestadas', color: '#F97316' },
  buzon: { label: 'Buzón de Voz', color: '#8B5CF6' },
  perdida: { label: 'Fallidas', color: '#EF4444' },
  activa: { label: 'En Llamada', color: '#3B82F6' }
};

// ============================================
// COMPONENTE DE WIDGET EXPANDIBLE
// ============================================

interface ExpandableWidgetProps {
  title: string;
  renderContent: (isExpandedView: boolean) => React.ReactNode;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLoading?: boolean;
  subtitle?: string;
  icon?: React.ReactNode;
}

const ExpandableWidget: React.FC<ExpandableWidgetProps> = ({
  title,
  renderContent,
  isExpanded,
  onToggleExpand,
  isLoading = false,
  subtitle,
  icon
}) => {
  // Animaciones sofisticadas para el modal
  const backdropVariants = {
    hidden: { 
      opacity: 0,
      backdropFilter: 'blur(0px)'
    },
    visible: { 
      opacity: 1,
      backdropFilter: 'blur(12px)',
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: { 
      opacity: 0,
      backdropFilter: 'blur(0px)',
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 1, 1]
      }
    }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.85,
      y: 40,
      rotateX: 10
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: 'spring',
        damping: 28,
        stiffness: 400,
        mass: 0.8,
        delay: 0.05
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.9,
      y: 20,
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 1, 1]
      }
    }
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { delay: 0.1, duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { delay: 0.15, duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    }
  };

  return (
    <>
      {/* Modal expandido - siempre como overlay */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="expanded-overlay"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
            style={{ perspective: '1200px' }}
            onClick={(e) => e.target === e.currentTarget && onToggleExpand()}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.div 
                variants={headerVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/80 dark:to-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  {icon && (
                    <motion.div 
                      className="text-blue-500"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', delay: 0.2, stiffness: 300 }}
                    >
                      {icon}
                    </motion.div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                    {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
                  </div>
                </div>
                <motion.button
                  onClick={onToggleExpand}
                  className="p-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <Minimize2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </motion.button>
              </motion.div>
              <motion.div 
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                className="flex-1 p-6 overflow-auto"
              >
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="h-full min-h-[500px]">{renderContent(true)}</div>
              )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget colapsado - siempre visible con tamaño fijo */}
      <div
        className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden h-full flex flex-col ${isExpanded ? 'ring-2 ring-blue-500/50' : ''}`}
      >
        <div 
          className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
          onClick={onToggleExpand}
        >
          <div className="flex items-center gap-2.5">
            {icon && <div className="text-blue-500">{icon}</div>}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
              {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isExpanded && (
              <span className="text-xs text-blue-500 font-medium">Expandido</span>
            )}
            <Maximize2 className={`w-4 h-4 transition-colors ${isExpanded ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-500'}`} />
          </div>
        </div>
        {/* Contenido colapsado - siempre con isExpandedView=false */}
        <div 
          className="flex-1 p-4 overflow-hidden transition-opacity duration-200"
          style={{ 
            opacity: isExpanded ? 0.3 : 1,
            pointerEvents: isExpanded ? 'none' : 'auto'
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full min-h-[180px]">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : (
            renderContent(false)
          )}
        </div>
      </div>
    </>
  );
};

// ============================================
// SELECTOR DE FILTROS
// ============================================

interface FilterSelectorProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  coordinaciones: Coordinacion[];
  isLoading: boolean;
}

const FilterSelector: React.FC<FilterSelectorProps> = ({
  filters,
  onFiltersChange,
  coordinaciones,
  isLoading
}) => {
  const [showCoordDropdown, setShowCoordDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCoordDropdown(false);
      }
    };

    if (showCoordDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCoordDropdown]);
  
  // Obtener coordinaciones operativas (excluyendo CALIDAD) dinámicamente
  // Esto permite que los cambios de nombre/código se reflejen automáticamente
  const coordsCalidad = useMemo(() => 
    coordinaciones.filter(c => {
      const codigo = c.codigo?.toUpperCase() || '';
      // Incluir todas las coordinaciones operativas excepto CALIDAD
      return codigo !== 'CALIDAD' && c.is_operativo !== false && !c.archivado;
    }),
    [coordinaciones]
  );

  const selectedCoordNames = useMemo(() => {
    if (filters.coordinaciones === 'global') return 'Global (Todas)';
    if (Array.isArray(filters.coordinaciones)) {
      // Usar nombre primero, luego código como fallback, luego ID
      const names = filters.coordinaciones.map(id => {
        const coord = coordinaciones.find(c => c.id === id);
        return coord?.nombre || coord?.codigo || id;
      });
      if (names.length === 1) return names[0];
      if (names.length === coordsCalidad.length) return 'Comparativa (Todas)';
      return `Comparativa (${names.length})`;
    }
    return 'Global';
  }, [filters.coordinaciones, coordinaciones, coordsCalidad]);

  const toggleCoordinacion = (coordId: string) => {
    if (filters.coordinaciones === 'global') {
      onFiltersChange({ ...filters, coordinaciones: [coordId] });
    } else if (Array.isArray(filters.coordinaciones)) {
      if (filters.coordinaciones.includes(coordId)) {
        const newCoords = filters.coordinaciones.filter(id => id !== coordId);
        onFiltersChange({ 
          ...filters, 
          coordinaciones: newCoords.length === 0 ? 'global' : newCoords 
        });
      } else {
        onFiltersChange({ 
          ...filters, 
          coordinaciones: [...filters.coordinaciones, coordId] 
        });
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl mb-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-blue-500" />
        <select
          value={filters.period}
          onChange={(e) => onFiltersChange({ ...filters, period: e.target.value as TimePeriod })}
          className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium text-gray-700 dark:text-gray-200"
          disabled={isLoading}
        >
          {TIME_PERIODS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowCoordDropdown(!showCoordDropdown)}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 transition-all font-medium"
        >
          <Building2 className="w-4 h-4 text-blue-500" />
          <span className="text-gray-700 dark:text-gray-200">{selectedCoordNames}</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCoordDropdown ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showCoordDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => { onFiltersChange({ ...filters, coordinaciones: 'global' }); setShowCoordDropdown(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    filters.coordinaciones === 'global'
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      filters.coordinaciones === 'global' ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-500'
                    }`}>
                      {filters.coordinaciones === 'global' && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span>Global (Sin comparativa)</span>
                  </div>
                </button>
              </div>

              <div className="p-3 max-h-64 overflow-y-auto scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-1">Selecciona para comparar:</p>
                {coordsCalidad.map(coord => {
                  const isSelected = Array.isArray(filters.coordinaciones) && 
                    filters.coordinaciones.includes(coord.id);
                  return (
                    <button
                      key={coord.id}
                      onClick={() => toggleCoordinacion(coord.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors mb-1 ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-500'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span>{coord.nombre}</span>
                        <span className="text-xs text-gray-400 ml-auto">{coord.codigo}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 ml-auto">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Actualizando...</span>
        </div>
      )}
    </div>
  );
};

// ============================================
// WIDGET 1: ESTADOS DE LLAMADAS
// ============================================

interface CallStatusWidgetProps {
  data: CallStatusData[];
  coordData: {
    coordId: string;
    coordName: string;
    coordColor: string;
    noContestadas: number;
    atendidas: number;
    transferidas: number;
    total: number;
  }[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLoading: boolean;
  totalCalls: number;
  isComparative: boolean;
  onToggleCoord?: (coordId: string) => void;
}

// Componente interno para el contenido del widget de llamadas
const CallStatusContent: React.FC<{
  data: CallStatusData[];
  coordData: CoordCallData[];
  totalCalls: number;
  isComparative: boolean;
  isExpandedView: boolean;
}> = ({ data, coordData, totalCalls, isComparative, isExpandedView }) => {
  
  // Estado para coordinaciones visibles en el gráfico
  const [visibleCoords, setVisibleCoords] = useState<Set<string>>(new Set(coordData.map(c => c.coordId)));
  
  // Actualizar visibleCoords cuando cambia coordData
  useEffect(() => {
    setVisibleCoords(new Set(coordData.map(c => c.coordId)));
  }, [coordData]);

  // Toggle de visibilidad de coordinación
  const handleLegendClick = (coordName: string) => {
    const coord = coordData.find(c => c.coordName === coordName);
    if (!coord) return;
    
    setVisibleCoords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(coord.coordId)) {
        // No permitir desmarcar si solo queda una
        if (newSet.size > 1) {
          newSet.delete(coord.coordId);
        }
      } else {
        newSet.add(coord.coordId);
      }
      return newSet;
    });
  };

  // Filtrar coordData según visibilidad
  const filteredCoordData = useMemo(() => {
    return coordData.filter(c => visibleCoords.has(c.coordId));
  }, [coordData, visibleCoords]);

  // Datos para vista global (sin selección de coordinación)
  const globalChartData = useMemo(() => {
    const noContestadas = data.filter(d => ['no_contestada', 'buzon', 'perdida'].includes(d.status));
    const atendidas = data.find(d => d.status === 'atendida');
    const transferidas = data.find(d => d.status === 'transferida');

    return [
      {
        name: 'No Contestadas',
        count: noContestadas.reduce((sum, d) => sum + d.count, 0),
        fill: '#F97316',
        detail: `Buzón: ${data.find(d => d.status === 'buzon')?.count || 0} | No contestó: ${data.find(d => d.status === 'no_contestada')?.count || 0} | Fallidas: ${data.find(d => d.status === 'perdida')?.count || 0}`
      },
      {
        name: 'Atendidas (No Transfer.)',
        count: atendidas?.count || 0,
        fill: '#F59E0B',
        detail: 'Hubo conversación pero no se transfirió a ejecutivo'
      },
      {
        name: 'Transferidas',
        count: transferidas?.count || 0,
        fill: '#10B981',
        detail: 'Transferidas exitosamente a ejecutivo humano'
      }
    ].filter(d => d.count > 0);
  }, [data]);

  // Datos para vista comparativa por coordinación (solo las visibles)
  const comparativeChartData = useMemo(() => {
    if (filteredCoordData.length === 0) return [];
    
    return [
      { name: 'No Contestadas', ...Object.fromEntries(filteredCoordData.map(c => [c.coordName, c.noContestadas])), _separator: true },
      { name: 'Atendidas', ...Object.fromEntries(filteredCoordData.map(c => [c.coordName, c.atendidas])), _separator: true },
      { name: 'Transferidas', ...Object.fromEntries(filteredCoordData.map(c => [c.coordName, c.transferidas])), _separator: false }
    ];
  }, [filteredCoordData]);

  const showComparative = isComparative && coordData.length > 0;

  // Calcular totales visibles
  const visibleTotalCalls = useMemo(() => {
    if (!showComparative) return totalCalls;
    return filteredCoordData.reduce((sum, c) => sum + c.total, 0);
  }, [showComparative, filteredCoordData, totalCalls]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      if (showComparative) {
        return (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
            <p className="font-bold text-gray-900 dark:text-white mb-2">{payload[0]?.payload?.name}</p>
            {payload.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: p.fill }} />
                <span className="text-sm text-gray-600 dark:text-gray-300">{p.name}:</span>
                <span className="font-bold" style={{ color: p.fill }}>{p.value?.toLocaleString()}</span>
              </div>
            ))}
          </div>
        );
      }
      const item = payload[0].payload;
      const pct = totalCalls > 0 ? ((item.count / totalCalls) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: item.fill }}>{item.count.toLocaleString()}</p>
          <p className="text-sm text-gray-500">{pct}% del total</p>
          <p className="text-xs text-gray-400 mt-2 max-w-xs">{item.detail}</p>
        </div>
      );
    }
    return null;
  };

  // Leyenda personalizada con toggle
  const CustomLegend = () => {
    if (!showComparative) return null;
    
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        {coordData.map(coord => {
          const isVisible = visibleCoords.has(coord.coordId);
          return (
            <button
              key={coord.coordId}
              onClick={() => handleLegendClick(coord.coordName)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                isVisible 
                  ? 'bg-gray-100 dark:bg-gray-700' 
                  : 'bg-gray-50 dark:bg-gray-800 opacity-50'
              } hover:opacity-100`}
            >
              <div 
                className={`w-3 h-3 rounded ${isVisible ? '' : 'opacity-30'}`}
                style={{ backgroundColor: coord.coordColor }}
              />
              <span className={`text-sm font-medium ${isVisible ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 line-through'}`}>
                {coord.coordName}
              </span>
              <span className={`text-xs ${isVisible ? 'text-gray-500' : 'text-gray-400'}`}>
                ({coord.total.toLocaleString()})
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  // Indicadores sin "activa" y sin colores (solo grises)
  const displayData = useMemo(() => {
    return data.filter(d => d.status !== 'activa'); // Quitar "en llamada"
  }, [data]);

  return (
    <div className="h-full flex flex-col">
        <ResponsiveContainer width="100%" height={isExpandedView ? 525 : 270} minHeight={270}>
          {showComparative ? (
            // Vista comparativa: barras agrupadas por coordinación
            <BarChart data={comparativeChartData} layout="vertical" margin={{ top: 10, right: 40, left: 10, bottom: 10 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
              <YAxis type="category" dataKey="name" width={isExpandedView ? 140 : 110} tick={{ fill: '#9CA3AF', fontSize: isExpandedView ? 13 : 11 }} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              {filteredCoordData.map((coord, coordIdx) => {
                // Forzar color con fallback - usar colores de un array para garantizar visibilidad
                const FALLBACK_COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#EF4444', '#6366F1', '#14B8A6', '#F97316'];
                const barColor = coord.coordColor && coord.coordColor !== '#6B7280' 
                  ? coord.coordColor 
                  : FALLBACK_COLORS[coordIdx % FALLBACK_COLORS.length];
                return (
                  <Bar 
                    key={coord.coordId} 
                    dataKey={coord.coordName} 
                    fill={barColor}
                    radius={[0, 6, 6, 0]}
                    animationDuration={2000}
                    barSize={isExpandedView ? 28 : 22}
                    style={{ fill: barColor }}
                  >
                    {/* Cell explícito con style para forzar fill en producción */}
                    {comparativeChartData.map((_, idx) => (
                      <Cell 
                        key={`cell-${coord.coordId}-${idx}`} 
                        fill={barColor}
                        style={{ fill: barColor }}
                      />
                    ))}
                    <LabelList 
                      dataKey={coord.coordName} 
                      position="insideRight" 
                      fill="white" 
                      fontSize={isExpandedView ? 12 : 10}
                      fontWeight="bold"
                      formatter={(v: number) => v > 0 ? v.toLocaleString() : ''}
                    />
                  </Bar>
                );
              })}
            </BarChart>
          ) : (
            // Vista global: barras simples
            <BarChart data={globalChartData} layout="vertical" margin={{ top: 10, right: 40, left: 10, bottom: 10 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} />
              <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
              <YAxis type="category" dataKey="name" width={isExpandedView ? 160 : 110} tick={{ fill: '#9CA3AF', fontSize: isExpandedView ? 13 : 11 }} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} animationDuration={2000} barSize={isExpandedView ? 50 : 40}>
                {globalChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList 
                  dataKey="count" 
                  position="insideRight" 
                  fill="white" 
                  fontSize={isExpandedView ? 14 : 12}
                  fontWeight="bold"
                  formatter={(v: number) => {
                    const pct = totalCalls > 0 ? ((v / totalCalls) * 100).toFixed(1) : 0;
                    return `${v.toLocaleString()} (${pct}%)`;
                  }}
                />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>

        {/* Leyenda interactiva para coordinaciones */}
        <CustomLegend />

        {/* Indicadores detallados (sin colores, sin "activa") - solo en vista expandida */}
        {isExpandedView && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Desglose por estado</p>
            <div className="grid grid-cols-5 gap-3">
              {displayData.map(item => (
                <div 
                  key={item.status}
                  className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
                >
                  <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">{item.label}</span>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{item.count.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
  );
};

// Wrapper del widget de llamadas
const CallStatusWidget: React.FC<CallStatusWidgetProps> = ({
  data,
  coordData,
  isExpanded,
  onToggleExpand,
  isLoading,
  totalCalls,
  isComparative,
  onToggleCoord
}) => {
  return (
    <ExpandableWidget
      title="Estados de Llamadas"
      subtitle={`${totalCalls.toLocaleString()} llamadas${isComparative ? ` · ${coordData.length} coordinaciones` : ''}`}
      icon={<Phone className="w-5 h-5" />}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      isLoading={isLoading}
      renderContent={(isExpandedView) => (
        <CallStatusContent
          data={data}
          coordData={coordData}
          totalCalls={totalCalls}
          isComparative={isComparative}
          isExpandedView={isExpandedView}
        />
      )}
    />
  );
};

// ============================================
// WIDGET 2: MÉTRICAS DE COMUNICACIÓN (CON GRÁFICAS HISTÓRICAS)
// ============================================

interface CommunicationWidgetProps {
  metrics: CommunicationMetrics;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLoading: boolean;
}

const CommunicationWidget: React.FC<CommunicationWidgetProps> = ({
  metrics,
  isExpanded,
  onToggleExpand,
  isLoading
}) => {
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const cards = [
    {
      key: 'avgCallDuration',
      label: 'Tiempo Prom. Llamada',
      value: formatDuration(metrics.avgCallDuration),
      subLabel: `De ${metrics.totalCalls.toLocaleString()} llamadas`,
      icon: <Clock className="w-5 h-5" />,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20',
      color: '#3B82F6',
      formatValue: (v: number) => formatDuration(v),
      dataKey: 'avgCallDuration'
    },
    {
      key: 'avgMessagesPerProspect',
      label: 'Mensajes Prom./Prospecto',
      value: metrics.avgMessagesPerProspect.toFixed(1),
      subLabel: `En ${metrics.totalProspects.toLocaleString()} prospectos`,
      icon: <MessageSquare className="w-5 h-5" />,
      gradient: 'from-emerald-500 to-emerald-600',
      bgGradient: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20',
      color: '#10B981',
      formatValue: (v: number) => v.toFixed(1),
      dataKey: 'avgMessagesPerProspect'
    },
    {
      key: 'transferRate',
      label: 'Tasa de Transferencia',
      value: `${metrics.transferRate.toFixed(1)}%`,
      subLabel: 'Llamadas → Ejecutivo',
      icon: <ArrowRightLeft className="w-5 h-5" />,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20',
      color: '#8B5CF6',
      formatValue: (v: number) => `${v.toFixed(1)}%`,
      dataKey: 'transferRate'
    },
    {
      key: 'responseRate',
      label: 'Tasa de Respuesta',
      value: `${metrics.responseRate.toFixed(1)}%`,
      subLabel: 'Llamadas contestadas',
      icon: <PhoneCall className="w-5 h-5" />,
      gradient: 'from-amber-500 to-amber-600',
      bgGradient: 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20',
      color: '#F59E0B',
      formatValue: (v: number) => `${v.toFixed(1)}%`,
      dataKey: 'responseRate'
    }
  ];

  // Contenido colapsado
  const collapsedContent = (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(card => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-xl bg-gradient-to-br ${card.bgGradient} border border-gray-100 dark:border-gray-700/50`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${card.gradient} text-white`}>
              {card.icon}
            </div>
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{card.label}</span>
          <p className="font-bold text-gray-900 dark:text-white text-xl mt-1">{card.value}</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs">{card.subLabel}</p>
        </motion.div>
      ))}
    </div>
  );

  // Contenido expandido
  const expandedContent = (
    <div className="space-y-6">
          {/* Cards resumen arriba */}
          <div className="grid grid-cols-4 gap-4">
            {cards.map(card => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl bg-gradient-to-br ${card.bgGradient} border border-gray-100 dark:border-gray-700/50`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg bg-gradient-to-br ${card.gradient} text-white`}>
                    {card.icon}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{card.label}</span>
                </div>
                <p className="font-bold text-gray-900 dark:text-white text-2xl">{card.value}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{card.subLabel}</p>
              </motion.div>
            ))}
          </div>

          {/* Gráficas lineales por mes */}
          {metrics.monthlyData.length > 0 && (
            <div className="grid grid-cols-2 gap-6">
              {cards.map(card => (
                <div key={card.key} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{card.label}</h4>
                  </div>
                  <ResponsiveContainer width="100%" height={150} minHeight={150}>
                    <AreaChart data={metrics.monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id={`gradient-${card.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={card.color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={card.color} stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: '#9CA3AF', fontSize: 10 }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fill: '#9CA3AF', fontSize: 10 }} 
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        tickFormatter={(v) => card.key.includes('Rate') ? `${v.toFixed(0)}%` : v.toFixed(0)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                        }}
                        labelStyle={{ color: '#F9FAFB', fontWeight: 'bold' }}
                        formatter={(value: number) => [card.formatValue(value), card.label]}
                      />
                      <Area
                        type="monotone"
                        dataKey={card.dataKey}
                        stroke={card.color}
                        strokeWidth={2}
                        fill={`url(#gradient-${card.key})`}
                        animationDuration={1600}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          )}

          {metrics.monthlyData.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No hay datos históricos disponibles para el período seleccionado
            </div>
          )}
        </div>
  );

  return (
    <ExpandableWidget
      title="Métricas de Comunicación"
      subtitle={`${metrics.totalMessages.toLocaleString()} mensajes totales`}
      icon={<Activity className="w-5 h-5" />}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      isLoading={isLoading}
      renderContent={(isExpandedView) => isExpandedView ? expandedContent : collapsedContent}
    />
  );
};

// ============================================
// WIDGET 3: FUNNEL DE CONVERSIÓN (PLOTLY)
// ============================================

interface CoordAssignment {
  coordName: string;
  coordCode: string;
  count: number;
  color: string;
}

interface FunnelWidgetProps {
  funnelData: FunnelCoordData[];
  globalStages: PipelineStage[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLoading: boolean;
  isGlobal: boolean;
  totalProspects: number;
  trackingStages?: PipelineStage[];
  assignmentByCoord?: CoordAssignment[];
}

// Tipo para períodos del funnel expandido
type FunnelPeriod = 'week' | 'month' | '6months' | 'year';

// Opciones de período para el selector del funnel
const FUNNEL_PERIOD_OPTIONS: { value: FunnelPeriod; label: string; shortLabel: string }[] = [
  { value: 'week', label: 'Última semana', shortLabel: '7d' },
  { value: 'month', label: 'Último mes', shortLabel: '30d' },
  { value: '6months', label: 'Últimos 6 meses', shortLabel: '6m' },
  { value: 'year', label: 'Último año', shortLabel: '1a' },
];

// Componente interno para contenido del funnel
const FunnelContent: React.FC<{
  funnelData: FunnelCoordData[];
  globalStages: PipelineStage[];
  isGlobal: boolean;
  totalProspects: number;
  trackingStages: PipelineStage[];
  assignmentByCoord: CoordAssignment[];
  isExpandedView: boolean;
}> = ({
  funnelData,
  globalStages,
  isGlobal,
  totalProspects,
  trackingStages,
  assignmentByCoord,
  isExpandedView
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Estados para la vista expandida
  const [viewType, setViewType] = useState<'funnel' | 'trends'>('trends'); // 'trends' por default
  const [funnelPeriod, setFunnelPeriod] = useState<FunnelPeriod>('month');
  const [conversionTrends, setConversionTrends] = useState<{
    stage: string;
    data: { date: string; rate: number; count: number }[];
  }[]>([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);

  // Cargar datos de tendencias de conversión cuando se expande
  useEffect(() => {
    if (!isExpandedView || viewType !== 'trends') return;
    
    const loadConversionTrends = async () => {
      setIsLoadingTrends(true);
      try {
        const end = new Date();
        const start = new Date();
        
        switch (funnelPeriod) {
          case 'week': start.setDate(start.getDate() - 7); break;
          case 'month': start.setMonth(start.getMonth() - 1); break;
          case '6months': start.setMonth(start.getMonth() - 6); break;
          case 'year': start.setFullYear(start.getFullYear() - 1); break;
        }

        // Obtener prospectos con fecha de creación y etapa
        if (!analysisSupabase) {
          console.error('analysisSupabase not initialized');
          return;
        }
        
        const { data: prospectos, error } = await analysisSupabase
          .from('prospectos')
          .select('id, created_at, etapa')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (!prospectos || prospectos.length === 0) {
          setConversionTrends([]);
          return;
        }

        // Definir etapas del funnel en orden
        const funnelStagesOrder = [
          'Validando membresia',
          'Prospecto calificado',
          'Agendando cita',
          'Cita confirmada',
          'En seguimiento',
          'Certificado'
        ];

        // Función para formatear fecha según período
        const formatDate = (date: Date): string => {
          if (funnelPeriod === 'week') {
            const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            return `${days[date.getDay()]} ${date.getDate()}`;
          } else if (funnelPeriod === 'month') {
            return `${date.getDate()}/${date.getMonth() + 1}`;
          } else {
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            return `${months[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
          }
        };

        // Agrupar prospectos por fecha
        const byDate = new Map<string, { total: number; byStage: Record<string, number> }>();
        
        prospectos.forEach(p => {
          const dateKey = formatDate(new Date(p.created_at));
          const current = byDate.get(dateKey) || { total: 0, byStage: {} };
          current.total++;
          const etapa = p.etapa || 'Nuevo prospecto';
          current.byStage[etapa] = (current.byStage[etapa] || 0) + 1;
          byDate.set(dateKey, current);
        });

        // Calcular acumulados para cada etapa
        // Para cada etapa, el % de conversión es: (prospectos en esa etapa + etapas posteriores) / (prospectos desde etapa anterior + posteriores)
        const getStageIndex = (etapa: string): number => {
          const idx = funnelStagesOrder.indexOf(etapa);
          return idx >= 0 ? idx : -1;
        };

        // Calcular tendencias por etapa
        const trends = funnelStagesOrder.map((stageName, stageIdx) => {
          const data: { date: string; rate: number; count: number }[] = [];
          
          // Acumular datos
          let runningTotal = 0;
          let runningInStageOrLater = 0;
          let runningInPrevStageOrLater = 0;
          
          Array.from(byDate.entries()).forEach(([dateKey, dayData]) => {
            // Contar prospectos en esta etapa o posteriores
            let inStageOrLater = 0;
            let inPrevStageOrLater = 0;
            
            Object.entries(dayData.byStage).forEach(([etapa, count]) => {
              const etapaIdx = getStageIndex(etapa);
              if (etapaIdx >= stageIdx) inStageOrLater += count;
              if (stageIdx > 0 && etapaIdx >= stageIdx - 1) inPrevStageOrLater += count;
            });
            
            runningTotal += dayData.total;
            runningInStageOrLater += inStageOrLater;
            runningInPrevStageOrLater += inPrevStageOrLater;
            
            // Para la primera etapa, el % es vs total
            // Para las demás, el % es vs etapa anterior
            let rate = 0;
            if (stageIdx === 0) {
              rate = runningTotal > 0 ? (runningInStageOrLater / runningTotal) * 100 : 0;
            } else {
              rate = runningInPrevStageOrLater > 0 ? (runningInStageOrLater / runningInPrevStageOrLater) * 100 : 0;
            }
            
            data.push({ date: dateKey, rate, count: inStageOrLater });
          });
          
          return { stage: stageName, data };
        });

        setConversionTrends(trends);
      } catch (err) {
        console.error('Error loading conversion trends:', err);
      } finally {
        setIsLoadingTrends(false);
      }
    };

    loadConversionTrends();
  }, [isExpandedView, viewType, funnelPeriod]);
  
  // Colores del funnel de conversión (6 etapas)
  const FUNNEL_COLORS = [
    '#3B82F6', // Azul - Validando (entrada)
    '#6366F1', // Indigo - En Seguimiento
    '#8B5CF6', // Púrpura - Interesado
    '#F59E0B', // Naranja - Atendió Llamada
    '#EC4899', // Rosa - Ejecutivo
    '#10B981'  // Verde - Certificado (meta)
  ];

  // Construir datos para Plotly Funnel
  const plotlyData = useMemo(() => {
    if (isGlobal || funnelData.length === 0) {
      // Vista global: un solo funnel
      const stageNames = globalStages.map(s => s.name);
      const values = globalStages.map(s => s.count);
      
      // El TOTAL incluye prospectos del funnel + fuera del funnel
      const grandTotal = totalProspects || 1;
      
      // Crear etiquetas con valor, porcentaje del TOTAL y conversión
      // Formato: NÚMERO grande | % del total | ↓% conversión
      const textLabels = globalStages.map((s, i) => {
        const pctOfTotal = ((s.count / grandTotal) * 100).toFixed(1);
        const prevCount = i > 0 ? globalStages[i - 1].count : s.count;
        const convPct = i > 0 && prevCount > 0 ? ((s.count / prevCount) * 100).toFixed(0) : null;
        
        // Primera etapa: mostrar solo total y porcentaje
        if (i === 0) {
          return `<b style="font-size:1.3em">${s.count.toLocaleString()}</b>  <span style="opacity:0.9">(${pctOfTotal}%)</span>`;
        }
        // Otras etapas: mostrar total, porcentaje y conversión desde anterior
        return `<b style="font-size:1.3em">${s.count.toLocaleString()}</b>  <span style="opacity:0.9">(${pctOfTotal}%)</span>  <b style="color:#4ADE80">↓${convPct}%</b>`;
      });
      
      return [{
        type: 'funnel' as const,
        name: 'Conversión',
        y: stageNames,
        x: values,
        text: textLabels,
        textposition: 'inside' as const,
        textfont: { 
          size: isExpandedView ? 15 : 13, // Texto más grande
          color: 'white',
          family: 'Inter, system-ui, sans-serif'
        },
        marker: { 
          color: FUNNEL_COLORS.slice(0, globalStages.length),
          line: { width: 2, color: 'rgba(255,255,255,0.4)' },
          cornerradius: 8 // Esquinas redondeadas
        } as any,
        connector: { 
          line: { color: 'rgba(99,102,241,0.4)', width: 2 },
          fillcolor: 'rgba(99,102,241,0.15)'
        },
        hovertemplate: '<b>%{y}</b><br>Cantidad: %{x:,}<br>%{text}<extra></extra>',
        opacity: 0.95
      }];
    }
    
    // Vista comparativa: Stacked por coordinación
    return funnelData.map((coord) => {
      // Usar las etapas dinámicas desde coord.stages
      const stageNames = coord.stages.map(s => s.stage);
      const values = coord.stages.map(s => s.count);
      
      return {
        type: 'funnel' as const,
        name: coord.coordinacionNombre,
        y: stageNames,
        x: values,
        textposition: 'inside' as const,
        textinfo: 'value+percent previous' as const,
        textfont: { size: isExpandedView ? 13 : 11, color: 'white' }, // Texto más grande
        marker: { 
          color: coord.color || getCoordColorGlobal(coord.coordinacionNombre) || '#6B7280',
          line: { width: 1, color: 'rgba(255,255,255,0.3)' },
          cornerradius: 6 // Esquinas redondeadas
        } as any,
        hovertemplate: `<b>${coord.coordinacionNombre} - %{y}</b><br>Cantidad: %{x:,}<br>Conversión: %{percentPrevious:.1%}<extra></extra>`
      };
    });
  }, [funnelData, globalStages, isGlobal, isExpandedView]);

  const layout = useMemo(() => ({
    margin: { l: isExpandedView ? 180 : 140, r: 50, t: 20, b: 20 }, // Mayor margen izquierdo para etiquetas
    funnelmode: 'stack' as const,
    funnelgap: 0.25, // Más separación entre barras para mejor efecto visual
    showlegend: !isGlobal && funnelData.length > 1,
    legend: { 
      orientation: 'h' as const, 
      y: -0.12,
      x: 0.5,
      xanchor: 'center' as const,
      font: { size: 11 }
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { 
      family: 'Inter, system-ui, sans-serif', 
      size: isExpandedView ? 12 : 10,
      color: '#9CA3AF'
    },
    hoverlabel: {
      bgcolor: '#1F2937',
      bordercolor: '#374151',
      font: { color: '#F9FAFB', size: 12, family: 'Inter, system-ui, sans-serif' }
    },
    // Animaciones del funnel
    transition: {
      duration: 1500,
      easing: 'cubic-in-out'
    }
  }), [isExpandedView, isGlobal, funnelData.length]);

  const config = {
    displayModeBar: false,
    responsive: true
  };
  
  // Frame de animación para Plotly
  const [animationKey, setAnimationKey] = useState(0);
  
  // Resetear animación cuando cambian los datos
  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [globalStages, funnelData]);

  // Calcular conversión total (respecto al total global incluyendo fuera del funnel)
  const totalConversionRate = useMemo(() => {
    if (globalStages.length < 2) return 0;
    const grandTotal = totalProspects || 0;
    const last = globalStages[globalStages.length - 1]?.count || 0;
    return grandTotal > 0 ? (last / grandTotal * 100) : 0;
  }, [globalStages, totalProspects]);

  // Colores para cada etapa en los gráficos de tendencia
  const TREND_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981'];

  return (
    <div ref={containerRef} className="h-full w-full flex flex-col">
        {/* Header con selectores (solo vista expandida) */}
        {isExpandedView && (
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            {/* Toggle de vista (carrusel) */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <button
                onClick={() => setViewType('trends')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  viewType === 'trends'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Tendencias
              </button>
              <button
                onClick={() => setViewType('funnel')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  viewType === 'funnel'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Funnel
              </button>
            </div>

            {/* Selector de período (solo para vista de tendencias) */}
            {viewType === 'trends' && (
              <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                {FUNNEL_PERIOD_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setFunnelPeriod(option.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      funnelPeriod === option.value
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {option.shortLabel}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Vista de Tendencias de Conversión (6 gráficos de línea) */}
        {isExpandedView && viewType === 'trends' ? (
          <div className="flex-1 overflow-y-auto">
            {isLoadingTrends ? (
              <div className="flex items-center justify-center h-[400px]">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : conversionTrends.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {conversionTrends.map((trend, idx) => (
                  <div 
                    key={trend.stage}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                        {trend.stage}
                      </h4>
                      <span 
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ 
                          backgroundColor: `${TREND_COLORS[idx]}20`,
                          color: TREND_COLORS[idx]
                        }}
                      >
                        {trend.data.length > 0 ? `${trend.data[trend.data.length - 1].rate.toFixed(1)}%` : '0%'}
                      </span>
                    </div>
                    <div className="h-[120px]">
                      <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                        <AreaChart data={trend.data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id={`colorTrend${idx}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={TREND_COLORS[idx]} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={TREND_COLORS[idx]} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 9, fill: '#9CA3AF' }} 
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis 
                            tick={{ fontSize: 9, fill: '#9CA3AF' }} 
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                            width={35}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1F2937', 
                              border: 'none', 
                              borderRadius: '8px',
                              fontSize: '11px',
                              color: '#F3F4F6'
                            }}
                            labelStyle={{ color: '#9CA3AF' }}
                            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Conversión']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="rate" 
                            stroke={TREND_COLORS[idx]} 
                            strokeWidth={2}
                            fill={`url(#colorTrend${idx})`}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">
                      {idx === 0 
                        ? '% del total que llegó a esta etapa'
                        : `% desde ${conversionTrends[idx - 1]?.stage || 'etapa anterior'}`
                      }
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-gray-400">
                Sin datos de tendencias para el período seleccionado
              </div>
            )}
          </div>
        ) : (
          /* Vista de Funnel (Plotly) */
          <motion.div 
            key={animationKey}
            className="flex-1"
            initial={{ opacity: 0, scaleY: 0.3, originY: 1 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ 
              duration: 1.2, 
              ease: [0.34, 1.56, 0.64, 1],
              opacity: { duration: 0.6 }
            }}
          >
            <Plot
              data={plotlyData as any}
              layout={{
                ...layout,
                width: undefined,
                height: isExpandedView ? 550 : 420,
                autosize: true
              } as any}
              config={config}
              style={{ width: '100%', height: isExpandedView ? '550px' : '420px' }}
              useResizeHandler={true}
            />
          </motion.div>
        )}
        
        {/* Información adicional (solo expandido, en ambas vistas) */}
        {isExpandedView && (
          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resumen de conversión */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/10 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                  Flujo de Conversión
                </h4>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {totalConversionRate.toFixed(2)}%
                  </span>
                  <span className="text-sm text-emerald-600/70 dark:text-emerald-400/70">
                    llegaron a Certificado (de {totalProspects.toLocaleString()} totales)
                  </span>
                </div>
                <div className="text-xs text-emerald-600/60 dark:text-emerald-400/60 space-y-1">
                  {globalStages.map((stage, i) => {
                    const pctOfTotal = totalProspects > 0 ? ((stage.count / totalProspects) * 100).toFixed(1) : '0';
                    return (
                      <div key={stage.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: FUNNEL_COLORS[i] }} />
                        <span>{stage.shortName}:</span>
                        <span className="font-medium">{stage.count.toLocaleString()}</span>
                        <span className="text-gray-400">({pctOfTotal}%)</span>
                        {i > 0 && globalStages[i-1].count > 0 && (
                          <span className="ml-auto text-emerald-500">
                            ↓{((stage.count / globalStages[i-1].count) * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Etapas de seguimiento/descarte */}
              {trackingStages.length > 0 && trackingStages.some(s => s.count > 0) && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Prospectos Fuera del Funnel
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">No forman parte del proceso de conversión</p>
                  <div className="grid grid-cols-2 gap-2">
                    {trackingStages.filter(s => s.count > 0).map((stage) => (
                      <div key={stage.name} className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{stage.shortName}</span>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-auto">
                          {stage.count.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Asignación total por coordinación - Ancho completo */}
            {assignmentByCoord.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800/50 mt-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Asignación por Coordinación
                </h4>
                <p className="text-xs text-gray-500 mb-4">Total de prospectos en el periodo seleccionado</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {assignmentByCoord.map((coord) => {
                    const totalAssigned = assignmentByCoord.reduce((sum, c) => sum + c.count, 0);
                    const percentage = totalAssigned > 0 ? (coord.count / totalAssigned) * 100 : 0;
                    return (
                      <div key={coord.coordCode} className="bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: coord.color }}
                          />
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {coord.coordCode}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {coord.count.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">{coord.coordName}</p>
                        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="h-1.5 rounded-full"
                            style={{ backgroundColor: coord.color }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{percentage.toFixed(1)}% del total</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
};

// Wrapper del FunnelWidget
const FunnelWidget: React.FC<FunnelWidgetProps> = ({
  funnelData,
  globalStages,
  isExpanded,
  onToggleExpand,
  isLoading,
  isGlobal,
  totalProspects,
  trackingStages = [],
  assignmentByCoord = []
}) => {
  // Calcular conversión total para el subtítulo
  const totalConversionRate = useMemo(() => {
    if (globalStages.length < 2) return 0;
    const grandTotal = totalProspects || 0;
    const last = globalStages[globalStages.length - 1]?.count || 0;
    return grandTotal > 0 ? (last / grandTotal * 100) : 0;
  }, [globalStages, totalProspects]);

  return (
    <ExpandableWidget
      title="Funnel de Conversión"
      subtitle={`${totalProspects.toLocaleString()} prospectos | ${totalConversionRate.toFixed(2)}% conversión total`}
      icon={<Layers className="w-5 h-5" />}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      isLoading={isLoading}
      renderContent={(isExpandedView) => (
        <FunnelContent
          funnelData={funnelData}
          globalStages={globalStages}
          isGlobal={isGlobal}
          totalProspects={totalProspects}
          trackingStages={trackingStages}
          assignmentByCoord={assignmentByCoord}
          isExpandedView={isExpandedView}
        />
      )}
    />
  );
};

// ============================================
// WIDGET 4: VENTAS CRM DATA (CORREGIDO)
// ============================================

interface CRMSalesWidgetProps {
  data: CRMSalesData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLoading: boolean;
  period: TimePeriod;
}

const CRMSalesWidget: React.FC<CRMSalesWidgetProps> = ({
  data,
  isExpanded,
  onToggleExpand,
  isLoading,
  period
}) => {
  // Estado para modal de detalle por coordinación
  const [selectedCoord, setSelectedCoord] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Estado para modal de vista previa de conversación
  const [conversationPreview, setConversationPreview] = useState<{
    isOpen: boolean;
    prospectoId: string;
    clienteName: string;
  }>({ isOpen: false, prospectoId: '', clienteName: '' });
  
  const formatMoney = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toLocaleString()}`;
  };

  const monthNames: Record<string, string> = {
    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
    '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
  };

  const totalCertificados = data.total?.certificados || 0;
  const totalMonto = data.total?.monto || 0;
  const totalClientes = data.total?.count || 0;
  const cls = data.classification;

  // Métricas contabilizables (excluyendo falsos positivos)
  const contabilizables = cls?.totalContabilizable || totalCertificados;
  const montoContabilizable = cls?.montoContabilizable || totalMonto;
  const ticketPromedio = contabilizables > 0 ? montoContabilizable / contabilizables : 0;

  // Ventas del mes actual y mes anterior (solo contabilizables)
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const contabilizableSales = (data.allSalesDetails || []).filter(s => s.saleType === 'ASISTIDA_IA' || s.saleType === 'ASISTIDA_WHATSAPP');
  const thisMonthSales = contabilizableSales.filter(s => new Date(s.fecha) >= thisMonthStart);
  const lastMonthSales = contabilizableSales.filter(s => {
    const d = new Date(s.fecha);
    return d >= lastMonthStart && d < thisMonthStart;
  });

  const thisMonthCount = thisMonthSales.length;
  const lastMonthCount = lastMonthSales.length;
  const thisMonthMonto = thisMonthSales.reduce((sum, s) => sum + s.monto, 0);
  const monthTrend = lastMonthCount > 0 ? ((thisMonthCount - lastMonthCount) / lastMonthCount * 100) : 0;

  // Cards principales: métricas de negocio relevantes
  const cards = [
    {
      label: 'Ventas Contabilizables',
      mainValue: contabilizables,
      mainUnit: 'certificados',
      subLabel: 'Monto contabilizable',
      subValue: formatMoney(montoContabilizable),
      extraLabel: 'Clasificación',
      extraValue: cls ? `IA: ${cls.asistidaIA} · WA: ${cls.asistidaWhatsApp}` : '-',
      icon: <Award className="w-5 h-5" />,
      gradient: 'from-purple-500 to-indigo-600',
      bgGradient: 'from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-800/20',
      color: '#8B5CF6',
    },
    {
      label: 'Ticket Promedio',
      mainValue: formatMoney(ticketPromedio),
      mainUnit: '',
      subLabel: 'Por certificado',
      subValue: `${totalClientes} clientes`,
      extraLabel: 'Sin asistencia',
      extraValue: cls ? `${cls.sinAsistencia} sin interacción digital` : '-',
      icon: <TrendingUp className="w-5 h-5" />,
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-800/20',
      color: '#10B981',
    },
    {
      label: 'Este Mes',
      mainValue: thisMonthCount,
      mainUnit: 'contabilizables',
      subLabel: 'Monto',
      subValue: formatMoney(thisMonthMonto),
      extraLabel: 'vs mes anterior',
      extraValue: lastMonthCount > 0
        ? `${monthTrend >= 0 ? '+' : ''}${monthTrend.toFixed(0)}% (${lastMonthCount})`
        : `Anterior: ${lastMonthCount}`,
      icon: <Calendar className="w-5 h-5" />,
      gradient: 'from-blue-500 to-cyan-600',
      bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-800/20',
      color: '#3B82F6',
    }
  ];

  // Datos para gráfica de barras por categoría (no se usa en la nueva vista)
  const barData: { name: string; certificados: number; monto: number; fill: string }[] = [];

  // Etiqueta del timeline según periodo
  const getTimelineLabel = () => {
    switch (period) {
      case '24hours': return 'Por Hora';
      case 'week': return 'Por Día';
      case 'month': return 'Por Semana';
      default: return 'Por Mes';
    }
  };

  // Datos para timeline según periodo
  const timelineData = (data.byPeriod || []).map(m => ({
    period: m.period,
    certificados: m.count,
    monto: m.monto / 1000
  }));

  // Datos por coordinación con desglose IA / Asistida
  const coordData = Object.entries(data.byCoordinacion || {})
    .map(([coord, d]) => ({
      name: coord,
      certificados: d.certificados,
      ventaIA: d.asistidaIA || 0,
      ventaAsistida: d.asistidaWhatsApp || 0,
      monto: d.monto
    }))
    .sort((a, b) => b.certificados - a.certificados)
    .slice(0, 8);

  // Obtener ventas filtradas por coordinación para el modal (solo contabilizables)
  const filteredSales = useMemo(() => {
    if (!selectedCoord || !data.allSalesDetails) return [];
    return data.allSalesDetails.filter(sale =>
      sale.coordinacion === selectedCoord &&
      (sale.saleType === 'ASISTIDA_IA' || sale.saleType === 'ASISTIDA_WHATSAPP')
    );
  }, [selectedCoord, data.allSalesDetails]);

  // Formatear fecha para mostrar
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Modal de detalle por coordinación
  const DetailModal = () => (
    <AnimatePresence>
      {isDetailModalOpen && selectedCoord && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700"
          >
            {/* Header del modal */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500 text-white">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Ventas de {selectedCoord}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {filteredSales.length} certificados · {formatMoney(filteredSales.reduce((sum, s) => sum + s.monto, 0))} total
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </motion.button>
              </div>
            </div>

            {/* DataGrid de ventas */}
            <div className="flex-1 overflow-auto p-4">
              {filteredSales.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-tl-lg">
                          # Paquete
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                          Ejecutivo
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                          Cliente
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                          Fecha
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                          Tipo
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-tr-lg">
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.map((sale, index) => (
                        <motion.tr
                          key={sale.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                              {sale.numeroPaquete}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                {sale.ejecutivo.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-gray-700 dark:text-gray-300 text-xs font-medium truncate max-w-[120px]" title={sale.ejecutivo}>
                                {sale.ejecutivo}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {sale.cliente && sale.prospectoId ? (
                              <button
                                onClick={() => {
                                  // Abrir modal de vista previa de conversación
                                  setConversationPreview({
                                    isOpen: true,
                                    prospectoId: sale.prospectoId!,
                                    clienteName: sale.cliente!
                                  });
                                }}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium truncate max-w-[150px] hover:underline cursor-pointer transition-colors flex items-center gap-1"
                                title={`Ver conversación de ${sale.cliente}`}
                              >
                                <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{sale.cliente}</span>
                              </button>
                            ) : (
                              <span className="text-gray-600 dark:text-gray-400 text-xs truncate max-w-[150px]" title={sale.cliente || '-'}>
                                {sale.cliente || '-'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs">
                            {formatDate(sale.fecha)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              sale.statusCRM.toLowerCase().includes('activo') 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : sale.statusCRM.toLowerCase().includes('inactivo')
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {sale.statusCRM.replace(' PQNC', '')}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              sale.saleType === 'ASISTIDA_IA'
                                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                                : sale.saleType === 'ASISTIDA_WHATSAPP'
                                ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {sale.saleType === 'ASISTIDA_IA' ? 'Venta IA' : sale.saleType === 'ASISTIDA_WHATSAPP' ? 'Asistida WA' : 'Sin asistencia'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {formatMoney(sale.monto)}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Package className="w-12 h-12 mb-3 opacity-50" />
                  <p>No hay ventas registradas para esta coordinación</p>
                </div>
              )}
            </div>

            {/* Footer con resumen */}
            {filteredSales.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex justify-between items-center">
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xs text-gray-500">Total Certificados</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{filteredSales.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Monto Total</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(filteredSales.reduce((sum, s) => sum + s.monto, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Ticket Promedio</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatMoney(filteredSales.reduce((sum, s) => sum + s.monto, 0) / filteredSales.length)}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cerrar
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Función para renderizar contenido con isExpandedView
  const renderWidgetContent = (isExpandedView: boolean) => (
    <div className={isExpandedView ? 'space-y-6' : 'space-y-3'}>
        {/* Cards principales - métricas de negocio */}
        <div className={`grid ${isExpandedView ? 'grid-cols-3 gap-4' : 'grid-cols-3 gap-2'}`}>
          {cards.map(card => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`${isExpandedView ? 'p-4' : 'p-3'} rounded-xl bg-gradient-to-br ${card.bgGradient} border border-gray-100 dark:border-gray-700/50`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${card.gradient} text-white`}>
                  {card.icon}
                </div>
                <span className={`text-gray-600 dark:text-gray-400 ${isExpandedView ? 'text-sm' : 'text-xs'} font-medium`}>
                  {card.label}
                </span>
              </div>
              <p className={`font-bold text-gray-900 dark:text-white ${isExpandedView ? 'text-3xl' : 'text-xl'}`}>
                {card.mainValue}
              </p>
              {card.mainUnit && (
                <p className={`text-gray-500 ${isExpandedView ? 'text-sm' : 'text-xs'}`}>
                  {card.mainUnit}
                </p>
              )}
              {isExpandedView && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600/50 space-y-1">
                  <p className="text-xs text-gray-500 flex justify-between">
                    <span>{card.subLabel}:</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{card.subValue}</span>
                  </p>
                  <p className="text-xs text-gray-500 flex justify-between">
                    <span>{card.extraLabel}:</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{card.extraValue}</span>
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Vista compacta: gráfica de ventas por coordinación */}
        {!isExpandedView && coordData.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              Ventas por Coordinación
            </h4>
            <div className="space-y-1.5">
              {coordData.map(coord => {
                const maxVal = Math.max(...coordData.map(c => c.certificados), 1);
                const pctTotal = (coord.certificados / maxVal) * 100;
                const pctIA = coord.certificados > 0 ? (coord.ventaIA / coord.certificados) * pctTotal : 0;
                const pctAsistida = coord.certificados > 0 ? (coord.ventaAsistida / coord.certificados) * pctTotal : 0;
                return (
                  <button
                    key={coord.name}
                    onClick={() => { setSelectedCoord(coord.name); setIsDetailModalOpen(true); }}
                    className="w-full flex items-center gap-2 group hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg px-1.5 py-1 transition-colors"
                  >
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-20 text-left truncate">{coord.name}</span>
                    <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                      {coord.ventaIA > 0 && (
                        <div className="h-full bg-violet-500 transition-all" style={{ width: `${pctIA}%` }} />
                      )}
                      {coord.ventaAsistida > 0 && (
                        <div className="h-full bg-cyan-500 transition-all" style={{ width: `${pctAsistida}%` }} />
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-6 text-right">{coord.certificados}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-violet-500" />
                <span className="text-[10px] text-gray-500">Venta IA</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />
                <span className="text-[10px] text-gray-500">Asistida WA</span>
              </div>
            </div>
          </div>
        )}

        {/* Vista expandida: más gráficas */}
        {isExpandedView && (
          <div className="grid grid-cols-2 gap-6">
            {/* Timeline de ventas */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Evolución {getTimelineLabel()}
              </h4>
              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200} minHeight={200}>
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="colorCerts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="period" 
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'certificados' ? value : `$${(value * 1000).toLocaleString()}`,
                        name === 'certificados' ? 'Certificados' : 'Monto'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="certificados" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      fill="url(#colorCerts)"
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                  Sin datos de timeline
                </div>
              )}
            </div>

            {/* Distribución por coordinación - Barras agrupadas IA / Asistida */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                Ventas por Coordinación
                <span className="text-xs text-gray-400 font-normal ml-2">(clic para ver detalle)</span>
              </h4>
              {/* Leyenda */}
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-violet-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Venta IA</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-cyan-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Asistida</span>
                </div>
              </div>
              {coordData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(200, coordData.length * 40)} minHeight={200}>
                  <BarChart
                    data={coordData}
                    layout="vertical"
                    barGap={2}
                    barSize={12}
                  >
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        value,
                        name === 'ventaIA' ? 'Venta IA' : 'Asistida WA'
                      ]}
                      cursor={{ fill: 'rgba(139, 92, 246, 0.08)' }}
                    />
                    <Bar
                      dataKey="ventaIA"
                      name="ventaIA"
                      fill="#8B5CF6"
                      radius={[0, 4, 4, 0]}
                      animationDuration={1500}
                      style={{ cursor: 'pointer' }}
                      onClick={(_data: Record<string, unknown>, index: number) => {
                        const coord = coordData[index];
                        if (coord) {
                          setSelectedCoord(coord.name);
                          setIsDetailModalOpen(true);
                        }
                      }}
                    />
                    <Bar
                      dataKey="ventaAsistida"
                      name="ventaAsistida"
                      fill="#06B6D4"
                      radius={[0, 4, 4, 0]}
                      animationDuration={1500}
                      animationBegin={300}
                      style={{ cursor: 'pointer' }}
                      onClick={(_data: Record<string, unknown>, index: number) => {
                        const coord = coordData[index];
                        if (coord) {
                          setSelectedCoord(coord.name);
                          setIsDetailModalOpen(true);
                        }
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                  Sin datos por coordinación
                </div>
              )}
            </div>

            {/* Resumen total expandido */}
            <div className="col-span-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-5 text-white">
              <div className="grid grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{contabilizables}</p>
                  <p className="text-purple-200 text-sm">Contabilizables</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-violet-200">{cls?.asistidaIA || 0}</p>
                  <p className="text-purple-200 text-sm">Ventas IA</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-cyan-200">{cls?.asistidaWhatsApp || 0}</p>
                  <p className="text-purple-200 text-sm">Asistidas WA</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{formatMoney(montoContabilizable)}</p>
                  <p className="text-purple-200 text-sm">Monto Total</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {contabilizables > 0 ? formatMoney(montoContabilizable / contabilizables) : '$0'}
                  </p>
                  <p className="text-purple-200 text-sm">Ticket Promedio</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );

  return (
    <>
      <ExpandableWidget
        title="Ventas de Certificados"
        subtitle={`${totalCertificados} certificados vendidos · ${totalClientes} clientes`}
        icon={<Award className="w-5 h-5" />}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        isLoading={isLoading}
        renderContent={renderWidgetContent}
      />
      <DetailModal />
      
      {/* Modal de vista previa de conversación */}
      <ConversationPreviewModal
        isOpen={conversationPreview.isOpen}
        onClose={() => setConversationPreview({ isOpen: false, prospectoId: '', clienteName: '' })}
        prospectoId={conversationPreview.prospectoId}
        clienteName={conversationPreview.clienteName}
        onNavigateToWhatsApp={() => {
          // Navegar al módulo de WhatsApp
          localStorage.setItem('livechat-prospect-id', conversationPreview.prospectoId);
          window.dispatchEvent(new CustomEvent('navigate-to-livechat', { detail: conversationPreview.prospectoId }));
          setIsDetailModalOpen(false);
        }}
      />
    </>
  );
};

// ============================================
// COMPONENTE PRINCIPAL DEL DASHBOARD
// ============================================

const DashboardModule: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin } = useEffectivePermissions();
  
  // ============================================
  // MODO NINJA: Usar usuario efectivo para filtros
  // ============================================
  const { 
    isNinjaMode, 
    effectiveUser,
    isEffectiveAdmin 
  } = useNinjaAwarePermissions();
  
  // Usuario efectivo para consultas (ninja o real)
  const queryUserId = isNinjaMode && effectiveUser ? effectiveUser.id : user?.id;
  
  // Estado de acceso - verificación asíncrona para coordinadores de CALIDAD
  // ACCESO PERMITIDO SOLO: admin o coordinador de la coordinación de CALIDAD
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isCoordinadorCalidad, setIsCoordinadorCalidad] = useState(false);
  
  // Clave para localStorage
  const STORAGE_KEY = 'pqnc_dashboard_filters';
  
  // Función para obtener IDs de coordinaciones operativas por defecto
  // Se calcula dinámicamente cuando se cargan las coordinaciones
  const getDefaultCoordinacionIds = (coords: Coordinacion[]): string[] => {
    // Obtener coordinaciones operativas (excluyendo CALIDAD) y retornar sus IDs
    return coords
      .filter(c => {
        const codigo = c.codigo?.toUpperCase() || '';
        return codigo !== 'CALIDAD' && c.is_operativo !== false && !c.archivado;
      })
      .map(c => c.id);
  };
  
  // Cargar filtros desde localStorage o usar valores por defecto
  const getInitialFilters = (): DashboardFilters => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validar estructura
        if (parsed.period && parsed.coordinaciones) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error loading dashboard filters from cache:', e);
    }
    // Valor por defecto: 1 año, sin coordinaciones seleccionadas inicialmente
    // Se seleccionarán las coordinaciones después de cargarlas
    return { period: 'year', coordinaciones: 'pending_default' as any };
  };
  
  const [filters, setFilters] = useState<DashboardFilters>(getInitialFilters);
  const [coordinaciones, setCoordinaciones] = useState<Coordinacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  const [activeTab, setActiveTab] = useState<'metricas' | 'ejecutivos'>('metricas');
  
  // Guardar filtros en localStorage cuando cambien
  useEffect(() => {
    if (filters.coordinaciones !== 'pending_default') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      } catch (e) {
        console.warn('Error saving dashboard filters to cache:', e);
      }
    }
  }, [filters]);
  
  // Datos
  const [callStatusData, setCallStatusData] = useState<CallStatusData[]>([]);
  const [callStatusByCoord, setCallStatusByCoord] = useState<{
    coordId: string;
    coordName: string;
    coordColor: string;
    noContestadas: number;
    atendidas: number;
    transferidas: number;
    total: number;
  }[]>([]);
  const [totalCalls, setTotalCalls] = useState(0);
  const [communicationMetrics, setCommunicationMetrics] = useState<CommunicationMetrics>({
    avgCallDuration: 0, avgMessagesPerProspect: 0, totalCalls: 0, totalMessages: 0, totalProspects: 0, transferRate: 0, responseRate: 0, monthlyData: []
  });
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [trackingStagesData, setTrackingStagesData] = useState<PipelineStage[]>([]);
  const [funnelCoordData, setFunnelCoordData] = useState<FunnelCoordData[]>([]);
  const [etapasDisponibles, setEtapasDisponibles] = useState<Etapa[]>([]);
  const [assignmentByCoord, setAssignmentByCoord] = useState<CoordAssignment[]>([]);
  const [totalProspectsReal, setTotalProspectsReal] = useState(0);
  const [crmSalesData, setCrmSalesData] = useState<CRMSalesData>({
    activosPQNC: { count: 0, monto: 0, certificados: 0, reservaciones: 0, paquetes: [] },
    inactivosPQNC: { count: 0, monto: 0, certificados: 0, reservaciones: 0, paquetes: [] },
    enProceso: { count: 0, monto: 0, certificados: 0, reservaciones: 0, paquetes: [] },
    otros: { count: 0, monto: 0, certificados: 0, reservaciones: 0, paquetes: [] },
    total: { count: 0, monto: 0, certificados: 0, reservaciones: 0, paquetes: [] },
    byCoordinacion: {},
    byPeriod: [],
    allSalesDetails: []
  });

  // Verificar permisos de acceso al Dashboard
  // SOLO: admin o coordinador de la coordinación de CALIDAD
  // NINGÚN otro rol tiene acceso (ni admin operativo, ni coordinadores de otras coordinaciones)
  // ⚠️ MODO NINJA: Usar queryUserId para verificar permisos como el usuario suplantado
  useEffect(() => {
    const checkAccess = async () => {
      if (!queryUserId) {
        setHasAccess(false);
        setIsCheckingAccess(false);
        return;
      }

      setIsCheckingAccess(true);

      try {
        // En modo ninja, usar permisos del usuario efectivo
        const effectiveIsAdmin = isNinjaMode ? isEffectiveAdmin : isAdmin;
        
        // Solo Admin tiene acceso automático
        if (effectiveIsAdmin) {
          setHasAccess(true);
          setIsCheckingAccess(false);
          return;
        }

        // Verificar si es Coordinador de la coordinación de CALIDAD
        const esCoordCalidad = await permissionsService.isCoordinadorCalidad(queryUserId);
        setIsCoordinadorCalidad(esCoordCalidad);
        setHasAccess(esCoordCalidad);
      } catch (error) {
        console.error('Error verificando acceso al Dashboard:', error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [queryUserId, isAdmin, isNinjaMode, isEffectiveAdmin]);

  const isGlobalView = filters.coordinaciones === 'global' || filters.coordinaciones === 'pending_default';

  const getStartDate = useCallback((period: TimePeriod): Date => {
    const now = new Date();
    switch (period) {
      case 'year': return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      case '6months': return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      case 'month': return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      case 'week': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '24hours': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      default: return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }
  }, []);

  // Obtener los IDs de coordinación seleccionados (para filtrar por coordinacion_id)
  const getSelectedCoordinacionIds = useCallback((): string[] | null => {
    if (filters.coordinaciones === 'global' || filters.coordinaciones === 'pending_default') return null;
    return filters.coordinaciones as string[];
  }, [filters.coordinaciones]);

  useEffect(() => {
    const loadCoords = async () => {
      try {
        const data = await coordinacionService.getCoordinaciones();
        setCoordinaciones(data);
        
        // Aplicar coordinaciones por defecto si es la primera vez
        if (filters.coordinaciones === 'pending_default' && !defaultsApplied) {
          // Obtener IDs de coordinaciones operativas dinámicamente
          const defaultCoordIds = getDefaultCoordinacionIds(data);
          
          if (defaultCoordIds.length > 0) {
            setFilters(prev => ({
              ...prev,
              coordinaciones: defaultCoordIds
            }));
          } else {
            // Si no se encuentran, usar global
            setFilters(prev => ({
              ...prev,
              coordinaciones: 'global'
            }));
          }
          setDefaultsApplied(true);
        }
      } catch (error) {
        console.error('Error loading coordinaciones:', error);
      }
    };
    if (hasAccess) loadCoords();
  }, [hasAccess, filters.coordinaciones, defaultsApplied]);

  // ============================================
  // FUNCIONES OPTIMIZADAS CON RPCs
  // Reemplazan las funciones de carga originales
  // Mejora ~70% en tiempo de carga
  // ============================================

  // Cargar métricas de llamadas usando RPC optimizado
  const loadCallMetricsOptimized = useCallback(async () => {
    try {
      const startDate = getStartDate(filters.period);
      const coordIds = getSelectedCoordinacionIds();
      
      const { data, error } = await analysisSupabase.rpc('get_dashboard_call_metrics', {
        p_fecha_inicio: startDate.toISOString(),
        p_fecha_fin: new Date().toISOString(),
        p_coordinacion_ids: coordIds,
        p_period_type: filters.period
      });

      if (error) throw error;

      // Procesar conteos de status
      const statusCounts = data?.call_status_counts || {};
      const total = Object.values(statusCounts).reduce((sum: number, c) => sum + (c as number), 0);
      
      const STATUS_LABELS: Record<string, { label: string; color: string }> = {
        activa: { label: 'En llamada', color: '#10B981' },
        transferida: { label: 'Transferidas', color: '#3B82F6' },
        atendida: { label: 'Atendidas', color: '#F59E0B' },
        no_contestada: { label: 'No contestadas', color: '#F97316' },
        buzon: { label: 'Buzón', color: '#8B5CF6' },
        perdida: { label: 'Perdidas', color: '#EF4444' }
      };

      const statusData = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        label: STATUS_LABELS[status]?.label || status,
        count: count as number,
        percentage: total > 0 ? ((count as number) / total) * 100 : 0,
        color: STATUS_LABELS[status]?.color || '#6B7280'
      }));

      setCallStatusData(statusData);
      setTotalCalls(total);

      // Procesar métricas de comunicación
      const metrics = data?.metrics || {};
      const byPeriod = data?.by_period || [];

      setCommunicationMetrics({
        avgCallDuration: metrics.avg_duration || 0,
        avgMessagesPerProspect: 0, // Se calcula en otra función si es necesario
        totalCalls: metrics.calls_with_conversation || 0,
        totalMessages: 0,
        totalProspects: 0,
        transferRate: metrics.transfer_rate || 0,
        responseRate: metrics.response_rate || 0,
        monthlyData: byPeriod.map((p: any) => ({
          month: p.period,
          avgCallDuration: p.avg_duration || 0,
          avgMessagesPerProspect: 0,
          totalCalls: p.calls_with_conversation || 0,
          totalMessages: 0,
          transferRate: p.transfer_rate || 0,
          responseRate: p.response_rate || 0
        }))
      });

      // Procesar datos por coordinación
      const byCoord = data?.by_coordinacion || [];
      setCallStatusByCoord(byCoord.map((c: any) => ({
        coordId: c.coordinacion_id || '',
        coordName: c.coordinacion_nombre || 'Sin nombre',
        noContestadas: c.no_contestadas || 0,
        atendidas: c.atendidas || 0,
        transferidas: c.transferidas || 0,
        total: c.total || 0
      })));

    } catch (error) {
      console.error('Error loading call metrics (RPC):', error);
    }
  }, [filters, getStartDate, getSelectedCoordinacionIds]);

  // Cargar pipeline usando RPC optimizado
  // ============================================
  // CARGAR PIPELINE DINÁMICO DESDE BD
  // Actualizado: 2026-01-27
  // - Carga etapas dinámicamente desde tabla `etapas`
  // - Filtra automáticamente etapas con count = 0
  // - Usa color_ui desde BD en lugar de hardcoded
  // ============================================
  const loadPipelineOptimized = useCallback(async () => {
    try {
      const startDate = getStartDate(filters.period);
      const coordIds = getSelectedCoordinacionIds();

      // Query con JOIN a tabla etapas para obtener datos dinámicos
      const { data: prospectos, error } = await analysisSupabase
        .from('prospectos')
        .select(`
          id,
          etapa,
          etapa_id,
          coordinacion_id,
          created_at,
          etapa_info:etapa_id (
            id,
            codigo,
            nombre,
            color_ui,
            icono,
            orden_funnel,
            es_terminal
          )
        `)
        .gte('created_at', startDate.toISOString())
        .not('etapa_id', 'is', null); // Solo prospectos con etapa definida

      if (error) throw error;

      // Filtrar por coordinación si aplica
      const prospectosFiltrados = coordIds && coordIds.length > 0
        ? prospectos?.filter(p => coordIds.includes(p.coordinacion_id)) || []
        : prospectos || [];

      // Agrupar prospectos por etapa usando etapa_info
      const etapaCounts = new Map<string, {
        id: string;
        nombre: string;
        codigo: string;
        color: string;
        orden: number;
        count: number;
        esTerminal: boolean;
      }>();

      prospectosFiltrados.forEach(p => {
        if (!p.etapa_info) return; // Skip si no tiene etapa_info

        const key = p.etapa_info.id;
        const existing = etapaCounts.get(key);

        if (existing) {
          existing.count++;
        } else {
          etapaCounts.set(key, {
            id: p.etapa_info.id,
            nombre: p.etapa_info.nombre,
            codigo: p.etapa_info.codigo,
            color: p.etapa_info.color_ui,
            orden: p.etapa_info.orden_funnel,
            count: 1,
            esTerminal: p.etapa_info.es_terminal || false
          });
        }
      });

      // Convertir a array y ordenar por orden_funnel
      const etapasArray = Array.from(etapaCounts.values())
        .sort((a, b) => a.orden - b.orden);

      // Separar etapas de conversión (no terminales) y fuera del funnel (terminales)
      // ⚠️ IMPORTANTE: Solo mostrar etapas con count > 0
      const conversionStages = etapasArray.filter(e => !e.esTerminal && e.count > 0);
      const outOfFunnelStages = etapasArray.filter(e => e.esTerminal && e.count > 0);

      // Total de prospectos
      const totalProspectos = prospectosFiltrados.length;
      setTotalProspectsReal(totalProspectos);

      // Calcular acumulados para funnel (cada etapa incluye siguientes)
      const conversionData: PipelineStage[] = [];

      conversionStages.forEach((etapa, idx) => {
        // Para el funnel, mostrar acumulado (esta etapa + todas las siguientes)
        const etapasSiguientes = conversionStages.slice(idx);
        const countAcumulado = etapasSiguientes.reduce((sum, e) => sum + e.count, 0);

        conversionData.push({
          name: etapa.nombre,
          shortName: etapa.nombre.split(' ').slice(0, 2).join(' '),
          count: countAcumulado,
          percentage: totalProspectos > 0 ? (countAcumulado / totalProspectos) * 100 : 0,
          fill: etapa.color,
          conversionFromPrevious: idx > 0 && conversionData[idx - 1].count > 0
            ? (countAcumulado / conversionData[idx - 1].count) * 100
            : 100
        });
      });

      setPipelineStages(conversionData);

      // Etapas fuera del funnel (solo las que tienen count > 0)
      const trackingData: PipelineStage[] = outOfFunnelStages.map(etapa => ({
        name: etapa.nombre,
        shortName: etapa.nombre.split(' ').slice(0, 2).join(' '),
        count: etapa.count,
        percentage: totalProspectos > 0 ? (etapa.count / totalProspectos) * 100 : 0,
        fill: etapa.color,
        conversionFromPrevious: 0
      }));

      setTrackingStagesData(trackingData);

      // Procesar asignación por coordinación
      const coordAssignmentMap = new Map<string, { name: string; code: string; count: number }>();
      
      prospectosFiltrados.forEach(p => {
        if (!p.coordinacion_id) return;
        const existing = coordAssignmentMap.get(p.coordinacion_id);
        if (existing) {
          existing.count++;
        } else {
          const coord = coordinaciones.find(c => c.id === p.coordinacion_id);
          coordAssignmentMap.set(p.coordinacion_id, {
            name: coord?.nombre || 'Sin nombre',
            code: coord?.codigo || 'N/A',
            count: 1
          });
        }
      });

      setAssignmentByCoord(
        Array.from(coordAssignmentMap.values()).map(c => ({
          coordName: c.name,
          coordCode: c.code,
          count: c.count,
          color: getCoordColorGlobal(c.code)
        }))
      );

      // Calcular datos por coordinación para funnel comparativo
      if (!isGlobalView && coordIds && coordIds.length > 0) {
        const coordData: FunnelCoordData[] = [];

        coordIds.forEach(coordId => {
          const prospectsCoord = prospectosFiltrados.filter(p => p.coordinacion_id === coordId);
          const coord = coordinaciones.find(c => c.id === coordId);
          
          if (!coord || prospectsCoord.length === 0) return;

          // Agrupar por etapa para esta coordinación
          const coordEtapaCounts = new Map<string, number>();
          prospectsCoord.forEach(p => {
            if (!p.etapa_info || p.etapa_info.es_terminal) return; // Solo etapas de conversión
            const key = p.etapa_info.nombre;
            coordEtapaCounts.set(key, (coordEtapaCounts.get(key) || 0) + 1);
          });

          // Crear stages para esta coordinación (solo etapas con count > 0)
          const coordStages = conversionStages
            .map(e => ({
              stage: e.nombre,
              count: coordEtapaCounts.get(e.nombre) || 0
            }))
            .filter(s => s.count > 0); // ⚠️ FILTRAR etapas con 0 prospectos

          if (coordStages.length > 0) {
            coordData.push({
              coordinacionId: coordId,
              coordinacionNombre: coord.nombre,
              color: getCoordColorGlobal(coord.codigo),
              stages: coordStages
            });
          }
        });

        setFunnelCoordData(coordData);
      } else {
        setFunnelCoordData([]);
      }

    } catch (error) {
      console.error('Error loading pipeline (optimized + dynamic):', error);
    }
  }, [filters, getStartDate, getSelectedCoordinacionIds, isGlobalView, coordinaciones]);

  // ============================================
  // FUNCIONES ORIGINALES (mantenidas como fallback)
  // ============================================

  // Cargar estados de llamadas
  const loadCallStatusData = useCallback(async () => {
    try {
      const startDate = getStartDate(filters.period);
      const coordIds = getSelectedCoordinacionIds();
      
      let query = analysisSupabase
        .from('llamadas_ventas')
        .select('call_id, call_status, duracion_segundos, audio_ruta_bucket, datos_llamada, fecha_llamada, prospecto, coordinacion_id')
        .gte('fecha_llamada', startDate.toISOString())
        .range(0, 9999); // Evitar límite de 1000 de Supabase

      // Filtrar por coordinacion_id directamente en llamadas_ventas
      if (coordIds && coordIds.length > 0) {
        query = query.in('coordinacion_id', coordIds);
      }

      const { data: llamadas, error } = await query;
      if (error) throw error;

      // Conteos globales
      const statusCounts: Record<CallStatusGranular, number> = {
        activa: 0, transferida: 0, atendida: 0, no_contestada: 0, buzon: 0, perdida: 0
      };

      // Conteos por coordinación
      const coordStatusCounts: Record<string, {
        noContestadas: number;
        atendidas: number;
        transferidas: number;
        total: number;
      }> = {};

      (llamadas || []).forEach(llamada => {
        const status = classifyCallStatus({
          call_id: llamada.call_id,
          call_status: llamada.call_status,
          fecha_llamada: llamada.fecha_llamada,
          duracion_segundos: llamada.duracion_segundos,
          audio_ruta_bucket: llamada.audio_ruta_bucket,
          datos_llamada: llamada.datos_llamada
        });
        statusCounts[status]++;

        // Agrupar por coordinación
        const coordId = llamada.coordinacion_id || 'sin_coord';
        if (!coordStatusCounts[coordId]) {
          coordStatusCounts[coordId] = { noContestadas: 0, atendidas: 0, transferidas: 0, total: 0 };
        }
        coordStatusCounts[coordId].total++;
        
        if (['no_contestada', 'buzon', 'perdida'].includes(status)) {
          coordStatusCounts[coordId].noContestadas++;
        } else if (status === 'atendida') {
          coordStatusCounts[coordId].atendidas++;
        } else if (status === 'transferida') {
          coordStatusCounts[coordId].transferidas++;
        }
      });

      const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
      setTotalCalls(total);

      const statusData: CallStatusData[] = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        label: STATUS_CONFIG[status]?.label || status,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        color: STATUS_CONFIG[status]?.color || '#6B7280'
      }));

      setCallStatusData(statusData);

      // Preparar datos por coordinación para gráfica comparativa
      if (coordIds && coordIds.length > 0) {
        const coordData = coordIds.map(coordId => {
          const coord = coordinaciones.find(c => c.id === coordId);
          const counts = coordStatusCounts[coordId] || { noContestadas: 0, atendidas: 0, transferidas: 0, total: 0 };
          return {
            coordId,
            coordName: coord?.nombre || coord?.codigo || 'N/A',
            coordColor: getCoordColorGlobal(coord?.codigo),
            ...counts
          };
        }).filter(c => c.total > 0);
        
        setCallStatusByCoord(coordData);
      } else {
        setCallStatusByCoord([]);
      }
    } catch (error) {
      console.error('Error loading call status:', error);
    }
  }, [filters, getStartDate, getSelectedCoordinacionIds, coordinaciones]);

  // Cargar métricas de comunicación
  const loadCommunicationMetrics = useCallback(async () => {
    try {
      const startDate = getStartDate(filters.period);
      const coordIds = getSelectedCoordinacionIds();
      
      // Usar paginación para obtener TODAS las llamadas (sin límite de 1000)
      let allCalls: { 
        call_id: string;
        call_status: string;
        duracion_segundos: number; 
        audio_ruta_bucket: string;
        prospecto: string; 
        datos_llamada: any; 
        coordinacion_id: string; 
        fecha_llamada: string 
      }[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMoreCalls = true;

      while (hasMoreCalls) {
        let callsQuery = analysisSupabase
          .from('llamadas_ventas')
          .select('call_id, call_status, duracion_segundos, audio_ruta_bucket, prospecto, datos_llamada, coordinacion_id, fecha_llamada')
          .gte('fecha_llamada', startDate.toISOString())
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (coordIds && coordIds.length > 0) {
          callsQuery = callsQuery.in('coordinacion_id', coordIds);
        }

        const { data: pageData, error } = await callsQuery;
        if (error) throw error;

        if (pageData && pageData.length > 0) {
          allCalls = [...allCalls, ...pageData];
          page++;
          hasMoreCalls = pageData.length === pageSize;
        } else {
          hasMoreCalls = false;
        }
      }

      const calls = allCalls;
      const prospectosUnicos = [...new Set(calls.map(c => c.prospecto).filter(Boolean))];

      // Usar paginación para obtener TODOS los mensajes (sin límite)
      let allMessages: { id: string; prospecto_id: string; fecha_hora: string }[] = [];
      page = 0;
      let hasMoreMessages = true;

      while (hasMoreMessages) {
        let messagesQuery = analysisSupabase
          .from('mensajes_whatsapp')
          .select('id, prospecto_id, fecha_hora')
          .gte('fecha_hora', startDate.toISOString())
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (coordIds && coordIds.length > 0 && prospectosUnicos.length > 0) {
          // Filtrar por prospectos en lotes para evitar URL muy larga
          const prospectBatch = prospectosUnicos.slice(0, 200);
          messagesQuery = messagesQuery.in('prospecto_id', prospectBatch);
        }

        const { data: pageData, error } = await messagesQuery;
        if (error) throw error;

        if (pageData && pageData.length > 0) {
          allMessages = [...allMessages, ...pageData];
          page++;
          hasMoreMessages = pageData.length === pageSize;
        } else {
          hasMoreMessages = false;
        }
      }

      const messages = allMessages;

      // Métricas globales
      // Usar el clasificador oficial para determinar el estado de cada llamada
      const getCallStatus = (c: typeof calls[0]) => {
        return classifyCallStatus({
          call_id: c.call_id,
          call_status: c.call_status,
          fecha_llamada: c.fecha_llamada,
          duracion_segundos: c.duracion_segundos,
          audio_ruta_bucket: c.audio_ruta_bucket,
          datos_llamada: c.datos_llamada
        });
      };

      // Clasificar todas las llamadas
      const callsWithStatus = calls.map(c => ({
        ...c,
        statusClasificado: getCallStatus(c)
      }));

      // Llamadas contestadas = duración > 0 (para tasa de respuesta)
      const contestadas = callsWithStatus.filter(c => (c.duracion_segundos || 0) > 0);
      
      // Para el tiempo promedio: SOLO atendidas y transferidas (excluir buzón, no contestadas, perdidas)
      const llamadasConConversacion = callsWithStatus.filter(c => 
        c.statusClasificado === 'atendida' || c.statusClasificado === 'transferida'
      );
      
      const totalDuration = llamadasConConversacion.reduce((sum, c) => sum + (c.duracion_segundos || 0), 0);
      const avgDuration = llamadasConConversacion.length > 0 ? totalDuration / llamadasConConversacion.length : 0;

      const transferidas = callsWithStatus.filter(c => c.statusClasificado === 'transferida').length;

      const prospectsWithMessages = new Set(messages.map(m => m.prospecto_id));
      const avgMessages = prospectsWithMessages.size > 0 ? messages.length / prospectsWithMessages.size : 0;
      const transferRate = calls.length > 0 ? (transferidas / calls.length) * 100 : 0;
      const responseRate = calls.length > 0 ? (contestadas.length / calls.length) * 100 : 0;

      // Calcular datos históricos según el período seleccionado
      // - Año/6 meses → por mes
      // - Mes → por semana
      // - Semana → por día
      // - 24 horas → por hora
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      
      // Función para obtener la clave de agrupación según el período
      const getGroupKey = (date: Date): string => {
        switch (filters.period) {
          case '24hours':
            // Por hora: "14:00"
            return `${date.getHours().toString().padStart(2, '0')}:00`;
          case 'week':
            // Por día: "Lun 23"
            return `${dayNames[date.getDay()]} ${date.getDate()}`;
          case 'month':
            // Por semana: "Sem 1", "Sem 2", etc.
            const weekNum = Math.ceil(date.getDate() / 7);
            return `Semana ${weekNum}`;
          case '6months':
          case 'year':
          default:
            // Por mes: "Ene 2025"
            return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        }
      };

      // Función para ordenar las claves según el período
      const sortGroupKeys = (keys: string[]): string[] => {
        switch (filters.period) {
          case '24hours':
            // Ordenar por hora
            return keys.sort((a, b) => parseInt(a) - parseInt(b));
          case 'week':
            // Ordenar por fecha
            return keys.sort((a, b) => {
              const dayA = parseInt(a.split(' ')[1]);
              const dayB = parseInt(b.split(' ')[1]);
              return dayA - dayB;
            });
          case 'month':
            // Ordenar por número de semana
            return keys.sort((a, b) => {
              const weekA = parseInt(a.replace('Semana ', ''));
              const weekB = parseInt(b.replace('Semana ', ''));
              return weekA - weekB;
            });
          default:
            // Ordenar por mes/año
            return keys.sort((a, b) => {
              const [monthA, yearA] = a.split(' ');
              const [monthB, yearB] = b.split(' ');
              const dateA = new Date(parseInt(yearA), monthNames.indexOf(monthA));
              const dateB = new Date(parseInt(yearB), monthNames.indexOf(monthB));
              return dateA.getTime() - dateB.getTime();
            });
        }
      };

      const periodDataMap: Record<string, {
        calls: typeof calls;
        messages: typeof messages;
      }> = {};

      // Agrupar llamadas según período
      calls.forEach(call => {
        const date = new Date(call.fecha_llamada);
        const key = getGroupKey(date);
        if (!periodDataMap[key]) {
          periodDataMap[key] = { calls: [], messages: [] };
        }
        periodDataMap[key].calls.push(call);
      });

      // Agrupar mensajes según período
      messages.forEach(msg => {
        const date = new Date(msg.fecha_hora);
        const key = getGroupKey(date);
        if (!periodDataMap[key]) {
          periodDataMap[key] = { calls: [], messages: [] };
        }
        periodDataMap[key].messages.push(msg);
      });

      // Generar todas las claves del período (incluso vacías) para gráfica completa
      const generateAllPeriodKeys = (): string[] => {
        const now = new Date();
        const keys: string[] = [];
        
        switch (filters.period) {
          case '24hours':
            // Generar las últimas 24 horas
            for (let i = 23; i >= 0; i--) {
              const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
              keys.push(`${hour.getHours().toString().padStart(2, '0')}:00`);
            }
            break;
          case 'week':
            // Generar los últimos 7 días
            for (let i = 6; i >= 0; i--) {
              const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
              keys.push(`${dayNames[day.getDay()]} ${day.getDate()}`);
            }
            break;
          case 'month':
            // Generar las 4-5 semanas del mes
            for (let i = 1; i <= 5; i++) {
              keys.push(`Semana ${i}`);
            }
            break;
          default:
            // Para año/6 meses, usar las claves que ya tenemos
            return sortGroupKeys(Object.keys(periodDataMap));
        }
        return keys;
      };

      const allKeys = generateAllPeriodKeys();

      // Calcular métricas para cada período
      const monthlyData = allKeys.map(periodKey => {
        const data = periodDataMap[periodKey] || { calls: [], messages: [] };
        const mCalls = data.calls;
        const mMessages = data.messages;
        
        // Clasificar llamadas del período usando el clasificador oficial
        const mCallsWithStatus = mCalls.map(c => ({
          ...c,
          statusClasificado: getCallStatus(c)
        }));
        
        // Solo atendidas y transferidas para el tiempo promedio
        const mConversaciones = mCallsWithStatus.filter(c => 
          c.statusClasificado === 'atendida' || c.statusClasificado === 'transferida'
        );
        const mTotalDuration = mConversaciones.reduce((sum, c) => sum + (c.duracion_segundos || 0), 0);
        const mAvgDuration = mConversaciones.length > 0 ? mTotalDuration / mConversaciones.length : 0;
        
        const mTransferidas = mCallsWithStatus.filter(c => c.statusClasificado === 'transferida').length;
        
        // Contestadas = duración > 0 (para tasa de respuesta)
        const mContestadas = mCalls.filter(c => (c.duracion_segundos || 0) > 0);
        
        const mProspectsWithMessages = new Set(mMessages.map(m => m.prospecto_id));
        const mAvgMessages = mProspectsWithMessages.size > 0 ? mMessages.length / mProspectsWithMessages.size : 0;
        const mTransferRate = mCalls.length > 0 ? (mTransferidas / mCalls.length) * 100 : 0;
        const mResponseRate = mCalls.length > 0 ? (mContestadas.length / mCalls.length) * 100 : 0;

        return {
          month: periodKey,
          avgCallDuration: mAvgDuration,
          avgMessagesPerProspect: mAvgMessages,
          totalCalls: mConversaciones.length, // Solo atendidas y transferidas
          totalMessages: mMessages.length,
          transferRate: mTransferRate,
          responseRate: mResponseRate
        };
      });

      setCommunicationMetrics({
        avgCallDuration: avgDuration,
        avgMessagesPerProspect: avgMessages,
        totalCalls: contestadas.length,
        totalMessages: messages.length,
        totalProspects: prospectsWithMessages.size,
        transferRate,
        responseRate,
        monthlyData
      });
    } catch (error) {
      console.error('Error loading communication metrics:', error);
    }
  }, [filters, getStartDate, getSelectedCoordinacionIds]);

  // ============================================
  // FUNCIÓN LEGACY ELIMINADA: loadPipelineData
  // ============================================
  // Esta función fue reemplazada por loadPipelineOptimized el 2026-01-27
  // La nueva función usa etapas dinámicas desde BD en lugar de constantes hardcodeadas
  // Ver: .cursor/handovers/2026-01-27-dashboard-etapas-dinamicas.md
  // Eliminada completamente para evitar referencias a FUNNEL_CONVERSION_STAGES (no definida)
  // ============================================

  // LEGACY: const loadPipelineData = useCallback(async () => {
  // }, [filters, isGlobalView, coordinaciones, getSelectedCoordinacionIds, getStartDate]);
  // ============================================

  // Cargar ventas CRM - v2: Usa RPC get_ventas_atribucion (lógica de atribución en SQL)
  const loadCRMData = useCallback(async () => {
    try {
      const { data: rows, error } = await analysisSupabase
        .rpc('get_ventas_atribucion', { fecha_inicio: '2025-11-27' });

      if (error) throw error;
      if (!rows || rows.length === 0) {
        setCrmSalesData(null);
        return;
      }

      const createEmptyCategory = (): CRMCategoryData => ({
        count: 0, certificados: 0, monto: 0, reservaciones: 0, paquetes: []
      });

      let activosPQNC = createEmptyCategory();
      let inactivosPQNC = createEmptyCategory();
      let enProceso = createEmptyCategory();
      let otros = createEmptyCategory();
      const byCoordinacion: Record<string, { count: number; certificados: number; monto: number; asistidaIA: number; asistidaWhatsApp: number }> = {};
      const periodData: Record<string, { count: number; monto: number }> = {};
      const allSalesDetails: SaleDetail[] = [];

      // Helpers para periodo
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const monthNamesFull = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

      const getPeriodKey = (date: Date): string => {
        switch (filters.period) {
          case '24hours':
            return `${date.getHours().toString().padStart(2, '0')}:00`;
          case 'week':
            return `${dayNames[date.getDay()]} ${date.getDate()}`;
          case 'month': {
            const weekNum = Math.ceil(date.getDate() / 7);
            return `Sem ${weekNum}`;
          }
          case '6months':
          case 'year':
          default:
            return `${monthNamesFull[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
        }
      };

      const sortPeriodKeys = (keys: string[]): string[] => {
        switch (filters.period) {
          case '24hours':
            return keys.sort((a, b) => parseInt(a) - parseInt(b));
          case 'week':
            return keys.sort((a, b) => parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]));
          case 'month':
            return keys.sort((a, b) => parseInt(a.replace('Sem ', '')) - parseInt(b.replace('Sem ', '')));
          default:
            return keys.sort((a, b) => {
              const [monthA, yearA] = a.split(' ');
              const [monthB, yearB] = b.split(' ');
              const dateA = new Date(2000 + parseInt(yearA), monthNamesFull.indexOf(monthA));
              const dateB = new Date(2000 + parseInt(yearB), monthNamesFull.indexOf(monthB));
              return dateA.getTime() - dateB.getTime();
            });
        }
      };

      // Iterar filas del RPC (1 fila = 1 comprador con su clasificación)
      (rows as { prospecto_id: string; nombre: string; origen: string; num_certificados: number; monto_total: number; primera_compra: string; coordinacion: string; propietario: string; status_crm: string; ia_antes: number; prospecto_antes: number; vendedor_antes: number; categoria: string }[]).forEach(row => {
        const saleType = row.categoria as SaleType;
        const esContabilizable = saleType === 'ASISTIDA_IA' || saleType === 'ASISTIDA_WHATSAPP';
        const monto = Number(row.monto_total) || 0;
        const certs = Number(row.num_certificados) || 0;
        const coord = row.coordinacion || 'Sin coordinación';
        const fecha = row.primera_compra || '';

        // Crear detalle de venta
        allSalesDetails.push({
          id: `${row.prospecto_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          numeroPaquete: `${certs} cert.`,
          monto,
          fecha,
          coordinacion: coord,
          statusCRM: row.status_crm || 'N/A',
          ejecutivo: row.propietario || 'Sin asignar',
          cliente: row.nombre || undefined,
          prospectoId: row.prospecto_id || undefined,
          saleType,
          origen: row.origen,
          iaAntes: row.ia_antes,
          prospectoAntes: row.prospecto_antes,
          vendedorAntes: row.vendedor_antes,
        });

        if (esContabilizable) {
          // Clasificar por status_crm
          const statusCrm = (row.status_crm || '').toLowerCase().trim();
          const dataToAdd = { count: 1, certificados: certs, monto, reservaciones: 0, paquetes: [{ numero: `${certs} cert.`, monto, fecha, coordinacion: coord }] };

          if (statusCrm.includes('activo') && statusCrm.includes('pqnc')) {
            activosPQNC.count += dataToAdd.count; activosPQNC.certificados += dataToAdd.certificados;
            activosPQNC.monto += dataToAdd.monto; activosPQNC.paquetes.push(...dataToAdd.paquetes);
          } else if (statusCrm.includes('inactivo') && statusCrm.includes('pqnc')) {
            inactivosPQNC.count += dataToAdd.count; inactivosPQNC.certificados += dataToAdd.certificados;
            inactivosPQNC.monto += dataToAdd.monto; inactivosPQNC.paquetes.push(...dataToAdd.paquetes);
          } else if (statusCrm.includes('proceso') || statusCrm.includes('en proceso')) {
            enProceso.count += dataToAdd.count; enProceso.certificados += dataToAdd.certificados;
            enProceso.monto += dataToAdd.monto; enProceso.paquetes.push(...dataToAdd.paquetes);
          } else {
            otros.count += dataToAdd.count; otros.certificados += dataToAdd.certificados;
            otros.monto += dataToAdd.monto; otros.paquetes.push(...dataToAdd.paquetes);
          }

          // Agrupar por coordinación
          if (!byCoordinacion[coord]) {
            byCoordinacion[coord] = { count: 0, certificados: 0, monto: 0, asistidaIA: 0, asistidaWhatsApp: 0 };
          }
          byCoordinacion[coord].count++;
          byCoordinacion[coord].certificados += certs;
          byCoordinacion[coord].monto += monto;
          if (saleType === 'ASISTIDA_IA') {
            byCoordinacion[coord].asistidaIA += certs;
          } else {
            byCoordinacion[coord].asistidaWhatsApp += certs;
          }

          // Agrupar por periodo
          if (fecha) {
            const date = new Date(fecha);
            const periodKey = getPeriodKey(date);
            if (!periodData[periodKey]) periodData[periodKey] = { count: 0, monto: 0 };
            periodData[periodKey].count += certs;
            periodData[periodKey].monto += monto;
          }
        }
      });

      // Convertir periodData a array ordenado
      const sortedKeys = sortPeriodKeys(Object.keys(periodData));
      const byPeriod = sortedKeys.map(key => ({ period: key, count: periodData[key].count, monto: periodData[key].monto }));

      // Calcular clasificación
      const asistidaIA = allSalesDetails.filter(s => s.saleType === 'ASISTIDA_IA').length;
      const asistidaWhatsApp = allSalesDetails.filter(s => s.saleType === 'ASISTIDA_WHATSAPP').length;
      const sinAsistencia = allSalesDetails.filter(s => s.saleType === 'SIN_ASISTENCIA').length;
      const contabilizables = allSalesDetails.filter(s => s.saleType === 'ASISTIDA_IA' || s.saleType === 'ASISTIDA_WHATSAPP');

      setCrmSalesData({
        activosPQNC, inactivosPQNC, enProceso, otros,
        total: {
          count: activosPQNC.count + inactivosPQNC.count + enProceso.count + otros.count,
          certificados: activosPQNC.certificados + inactivosPQNC.certificados + enProceso.certificados + otros.certificados,
          monto: activosPQNC.monto + inactivosPQNC.monto + enProceso.monto + otros.monto,
          reservaciones: 0,
          paquetes: [...activosPQNC.paquetes, ...inactivosPQNC.paquetes, ...enProceso.paquetes, ...otros.paquetes]
        },
        byCoordinacion,
        byPeriod,
        allSalesDetails: allSalesDetails.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
        classification: {
          asistidaIA,
          asistidaWhatsApp,
          sinAsistencia,
          totalContabilizable: contabilizables.length,
          montoContabilizable: contabilizables.reduce((sum, s) => sum + s.monto, 0)
        }
      });
    } catch (error) {
      console.error('Error loading CRM data:', error);
    }
  }, [filters.period]);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Usar funciones optimizadas con RPCs para mejor rendimiento
      // Las RPCs combinan múltiples queries en 1 llamada a BD
      await Promise.all([
        loadCallMetricsOptimized(),  // Reemplaza loadCallStatusData + loadCommunicationMetrics
        loadPipelineOptimized(),      // Reemplaza loadPipelineData
        loadCRMData()                 // CRM se mantiene igual (estructura diferente)
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [loadCallMetricsOptimized, loadPipelineOptimized, loadCRMData]);

  useEffect(() => {
    if (hasAccess) loadAllData();
  }, [hasAccess, filters, loadAllData]);

  // Mostrar loading mientras se verifican permisos
  if (isCheckingAccess || hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Acceso Denegado</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Solo administradores y coordinadores de la <strong>coordinación de Calidad</strong> pueden acceder a este dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-6">
      <FilterSelector filters={filters} onFiltersChange={setFilters} coordinaciones={coordinaciones} isLoading={isLoading} />

      {/* Pestañas de navegación */}
      <div className="mb-6 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('metricas')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'metricas'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span>Métricas Generales</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('ejecutivos')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'ejecutivos'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Ejecutivos</span>
          </div>
        </button>
      </div>

      {/* Contenido según pestaña activa */}
      {activeTab === 'metricas' && (
        <>
          {/* Fila 0: Widget de Métricas de Prospectos Nuevos - AL INICIO */}
          <div className="mb-6">
            <ProspectosMetricsWidget
              coordinacionIds={getSelectedCoordinacionIds()}
              coordinaciones={coordinaciones}
              isExpanded={expandedWidget === 'prospectosMetrics'}
              onToggleExpand={() => setExpandedWidget(expandedWidget === 'prospectosMetrics' ? null : 'prospectosMetrics')}
              isLoading={isLoading}
              globalPeriod={filters.period as GlobalTimePeriod}
            />
          </div>

          {/* Fila 1: Funnel de Conversión - Ancho completo */}
          <div className="mb-6">
            <FunnelWidget
              funnelData={funnelCoordData}
              globalStages={pipelineStages}
              trackingStages={trackingStagesData}
              isExpanded={expandedWidget === 'pipeline'}
              onToggleExpand={() => setExpandedWidget(expandedWidget === 'pipeline' ? null : 'pipeline')}
              isLoading={isLoading}
              isGlobal={isGlobalView}
              totalProspects={totalProspectsReal}
              assignmentByCoord={assignmentByCoord}
            />
          </div>

          {/* Fila 2: Estado de Llamadas - Ancho completo */}
          <div className="mb-6">
            <CallStatusWidget
              data={callStatusData}
              coordData={callStatusByCoord}
              isExpanded={expandedWidget === 'callStatus'}
              onToggleExpand={() => setExpandedWidget(expandedWidget === 'callStatus' ? null : 'callStatus')}
              isLoading={isLoading}
              totalCalls={totalCalls}
              isComparative={!isGlobalView}
            />
          </div>

          {/* Fila 3: Métricas de Comunicación y Ventas por Origen - 2 columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CommunicationWidget
              metrics={communicationMetrics}
              isExpanded={expandedWidget === 'communication'}
              onToggleExpand={() => setExpandedWidget(expandedWidget === 'communication' ? null : 'communication')}
              isLoading={isLoading}
            />

            <CRMSalesWidget
              data={crmSalesData}
              isExpanded={expandedWidget === 'crm'}
              onToggleExpand={() => setExpandedWidget(expandedWidget === 'crm' ? null : 'crm')}
              isLoading={isLoading}
              period={filters.period}
            />
          </div>
        </>
      )}

      {activeTab === 'ejecutivos' && (
        <EjecutivosMetricsWidget
          coordinacionIds={getSelectedCoordinacionIds()}
          coordinaciones={coordinaciones}
          period={filters.period as GlobalTimePeriod}
        />
      )}
    </div>
  );
};

export default DashboardModule;

