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
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import {
  Search, Filter, SortAsc, SortDesc, X, User, Users, Phone, Mail,
  Calendar, MapPin, Building, DollarSign, Clock, Tag,
  ChevronRight, Eye, Edit, Star, TrendingUp, Activity,
  FileText, MessageSquare, CheckCircle, AlertTriangle, Network,
  LayoutGrid, Table2, PhoneCall, Heart, Loader2
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
import { BulkAssignmentModal } from '../shared/BulkAssignmentModal';
import { AssignmentBadge } from '../analysis/AssignmentBadge';
import { ProspectoEtapaAsignacion } from '../shared/ProspectoEtapaAsignacion';
import { BackupBadgeWrapper } from '../shared/BackupBadgeWrapper';
import { coordinacionService } from '../../services/coordinacionService';
import { ScheduledCallsSection } from '../shared/ScheduledCallsSection';
import { Avatar } from '../shared/Avatar';
import { CallDetailModalSidebar } from '../chat/CallDetailModalSidebar';
import { getCoordinacionColor } from '../../utils/coordinacionColors';
import toast from 'react-hot-toast';

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
  coordinacion_id: string;
  ejecutivo_id: string;
  asignacion: 'todos' | 'asignados' | 'no_asignados';
}

interface SortState {
  field: keyof Prospecto;
  direction: 'asc' | 'desc';
}

/**
 * ============================================
 * PROPS DEL COMPONENTE - ProspectoSidebar
 * ============================================
 */
interface SidebarProps {
  prospecto: Prospecto | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToLiveChat?: (prospectoId: string) => void;
  onNavigateToNatalia?: (callId: string) => void;
  onOpenCallDetail?: (callId: string) => void;
  /**
   * Z-INDEX DEL BACKDROP
   * - Default: z-[180] (para módulos normales: Prospectos, Scheduled Calls, Chat)
   * - AI Call Monitor: z-[220] (para que quede encima de CallDetailModalSidebar)
   */
  zIndexBackdrop?: string;
  /**
   * Z-INDEX DEL SIDEBAR
   * - Default: z-[190] (para módulos normales: Prospectos, Scheduled Calls, Chat)
   * - AI Call Monitor: z-[230] (para que quede encima de CallDetailModalSidebar)
   * 
   * ORDEN DE Z-INDEX:
   * - Módulos normales: CallDetailModalSidebar (z-[250]) > ProspectoSidebar (z-[190])
   * - AI Call Monitor: ProspectoSidebar (z-[230]) > CallDetailModalSidebar (z-[210])
   */
  zIndexSidebar?: string;
}

// El componente CallDetailModalSidebar se importa desde '../chat/CallDetailModalSidebar'

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
  hasRecording?: boolean; // Si la llamada tiene grabación
  callStatus?: string; // Estado de la llamada
}

/**
 * ============================================
 * COMPONENTE: ProspectoSidebar
 * ============================================
 * 
 * Sidebar para mostrar información completa de un prospecto.
 * 
 * SISTEMA DE Z-INDEX:
 * ===================
 * Este componente utiliza props opcionales para controlar su z-index,
 * permitiendo diferentes comportamientos según el módulo:
 * 
 * 1. MÓDULOS NORMALES (Prospectos, Scheduled Calls, Chat):
 *    - Default: z-[180] (backdrop) / z-[190] (sidebar)
 *    - Comportamiento: CallDetailModalSidebar aparece ENCIMA de ProspectoSidebar
 * 
 * 2. AI CALL MONITOR (comportamiento especial):
 *    - Configurado: z-[220] (backdrop) / z-[230] (sidebar)
 *    - Comportamiento: ProspectoSidebar aparece ENCIMA de CallDetailModalSidebar
 * 
 * USO:
 * ====
 * // Módulo normal (default)
 * <ProspectoSidebar prospecto={p} isOpen={true} onClose={close} />
 * 
 * // AI Call Monitor (z-index más alto)
 * <ProspectoSidebar 
 *   prospecto={p} 
 *   isOpen={true} 
 *   onClose={close}
 *   zIndexBackdrop="z-[220]"
 *   zIndexSidebar="z-[230]"
 * />
 */
const ProspectoSidebar: React.FC<SidebarProps> = ({ 
  prospecto, 
  isOpen, 
  onClose, 
  onNavigateToLiveChat, 
  onNavigateToNatalia, 
  onOpenCallDetail, 
  zIndexBackdrop = 'z-[180]', // Default para módulos normales
  zIndexSidebar = 'z-[190]'   // Default para módulos normales
}) => {
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

    // Agregar eventos de llamadas (clickeables solo si tienen grabación y están finalizadas)
    llamadas.forEach(call => {
      const hasRecording = !!(call.audio_ruta_bucket && call.audio_ruta_bucket.length > 0);
      // Estados que indican llamada finalizada (usando clasificador centralizado)
      const finalizedStatuses = ['transferida', 'atendida', 'no_contestada', 'buzon', 'perdida', 'finalizada', 'contestada_no_transferida'];
      const isFinalized = finalizedStatuses.includes(call.call_status || '');
      events.push({
        id: `call-${call.call_id}`,
        type: 'call',
        date: call.fecha_llamada,
        title: `Llamada ${call.call_status}`,
        description: `${Math.floor(call.duracion_segundos / 60)}:${(call.duracion_segundos % 60).toString().padStart(2, '0')} • ${call.nivel_interes || 'Sin interés'}`,
        callId: call.call_id, // Agregar callId para poder abrir el modal
        hasRecording: hasRecording,
        callStatus: call.call_status,
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
            className={`fixed inset-0 bg-black bg-opacity-50 ${zIndexBackdrop}`}
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <motion.div 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={`fixed right-0 top-0 h-screen w-3/5 bg-white dark:bg-gray-900 shadow-2xl ${zIndexSidebar} overflow-hidden`}
            style={{ top: 0, margin: 0, padding: 0 }}
          >
            <div className="flex flex-col h-full" style={{ height: '100vh' }}>
              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
                className="flex items-center justify-between p-6 border-b border-white/10 plasma-gradient-header relative"
              >
                <div className="flex items-center gap-4 relative z-10">
                  <Avatar
                    name={prospecto.nombre_completo || `${prospecto.nombre} ${prospecto.apellido_paterno} ${prospecto.apellido_materno}`.trim() || prospecto.nombre_whatsapp}
                    size="2xl"
                    showIcon={false}
                    className="bg-white/20 backdrop-blur-sm shadow-lg"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {prospecto.nombre_completo || `${prospecto.nombre} ${prospecto.apellido_paterno} ${prospecto.apellido_materno}`.trim() || prospecto.nombre_whatsapp || 'Cargando...'}
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      {prospecto.id && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (prospecto.id) {
                              try {
                                await navigator.clipboard.writeText(prospecto.id);
                                toast.success('ID del prospecto copiado al portapapeles');
                              } catch (error) {
                                toast.error('Error al copiar ID');
                              }
                            }
                          }}
                          className="text-xs text-white/70 font-mono hover:text-white hover:underline transition-colors cursor-pointer"
                          title="Click para copiar ID del prospecto"
                        >
                          ID: {prospecto.id}
                        </button>
                      )}
                      {prospecto.ciudad_residencia && (
                        <>
                          {prospecto.id && <span className="text-white/50">•</span>}
                          <p className="text-sm text-white/80">
                            {prospecto.ciudad_residencia}
                            {prospecto.interes_principal && ` • ${prospecto.interes_principal}`}
                          </p>
                        </>
                      )}
                      {!prospecto.id && !prospecto.ciudad_residencia && (
                        <p className="text-sm text-white/80">
                          {prospecto.interes_principal || 'Información del Prospecto'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                  {onNavigateToLiveChat && (
                    <button 
                      onClick={() => {
                        onNavigateToLiveChat(prospecto.id);
                      }}
                      className="p-2.5 rounded-full transition-all duration-200 shadow-xl bg-white/60 hover:bg-white/70 text-white cursor-pointer hover:scale-110 active:scale-95 backdrop-blur-lg border-2 border-white/40"
                      title="Ir a Live Chat (buscar o crear conversación)"
                    >
                      <MessageSquare size={20} className="text-white drop-shadow-lg" strokeWidth={2.5} />
                    </button>
                  )}
                  <button 
                    onClick={onClose}
                    className="p-2.5 rounded-full transition-all duration-200 bg-white/55 hover:bg-white/65 text-white hover:scale-110 active:scale-95 shadow-xl backdrop-blur-lg border-2 border-white/35"
                    title="Cerrar"
                  >
                    <X size={24} className="text-white drop-shadow-lg" strokeWidth={3} />
                  </button>
                </div>
              </motion.div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Etapa Destacada y Asignación - Componente Centralizado */}
                <ProspectoEtapaAsignacion prospecto={prospecto} />

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
                              if (isCall) {
                                const callEvent = event as TimelineEvent & { callId?: string; hasRecording?: boolean; callStatus?: string };
                                // Solo abrir modal si tiene grabación y está finalizada
                                if (callEvent.callId && callEvent.hasRecording && 
                                    (callEvent.callStatus === 'finalizada' || callEvent.callStatus === 'transferida' || callEvent.callStatus === 'contestada_no_transferida') &&
                                    onOpenCallDetail) {
                                  onOpenCallDetail(callEvent.callId);
                                }
                              }
                            }}
                            className={`flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg border ${
                              isCall 
                                ? (() => {
                                    const callEvent = event as TimelineEvent & { hasRecording?: boolean; callStatus?: string };
                                    const isClickable = callEvent.hasRecording && 
                                      (callEvent.callStatus === 'finalizada' || callEvent.callStatus === 'transferida' || callEvent.callStatus === 'contestada_no_transferida');
                                    return isClickable
                                      ? 'border-blue-200 dark:border-blue-700 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all'
                                      : 'border-gray-200 dark:border-gray-600 cursor-default';
                                  })()
                                : 'border-gray-200 dark:border-gray-600'
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
  const [allProspectos, setAllProspectos] = useState<Prospecto[]>([]); // Todos los prospectos cargados
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false); // Ya no hay más datos porque cargamos todo
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const scrollObserverRef = useRef<HTMLDivElement>(null);
  
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
    score: '', // Mantener en estado pero no mostrar en UI
    campana_origen: '',
    dateRange: '',
    coordinacion_id: '',
    ejecutivo_id: '',
    asignacion: 'todos'
  });
  
  // Estado para opciones de filtros (coordinaciones y ejecutivos)
  const [coordinacionesOptions, setCoordinacionesOptions] = useState<{id: string; nombre: string; codigo: string}[]>([]);
  const [ejecutivosOptions, setEjecutivosOptions] = useState<{id: string; full_name: string; coordinacion_id?: string}[]>([]);
  
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

  // Estado para selección múltiple (solo para admin/admin operativo en vista grid)
  const [selectedProspectIds, setSelectedProspectIds] = useState<Set<string>>(new Set());
  const [showBulkAssignmentModal, setShowBulkAssignmentModal] = useState(false);
  
  // Estado para coordinadores de Calidad (tienen acceso completo)
  const [isCoordinadorCalidad, setIsCoordinadorCalidad] = useState(false);

  // Cargar preferencias de vista al inicio
  useEffect(() => {
    const preferences = prospectsViewPreferencesService.getUserPreferences(user?.id || null);
    setViewType(preferences.viewType);
    setCollapsedColumns(preferences.collapsedColumns || []);
  }, [user?.id]);

  // Cargar opciones de filtros (coordinaciones y ejecutivos) para todos los usuarios con acceso al módulo
  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!user?.id) return;
      
      // Verificar si es coordinador de Calidad (acceso completo a datos)
      if (user.role_name === 'coordinador') {
        const isCalidad = await permissionsService.isCoordinadorCalidad(user.id);
        setIsCoordinadorCalidad(isCalidad);
      }
      
      // Cargar opciones de filtros para todos los usuarios con acceso al módulo
      try {
        // Cargar coordinaciones (todas, sin filtrar)
        const coordinaciones = await coordinacionService.getCoordinaciones();
        setCoordinacionesOptions(coordinaciones.map(c => ({
          id: c.id,
          nombre: c.nombre,
          codigo: c.codigo || c.nombre
        })));
        
        // Cargar ejecutivos
        const ejecutivos = await coordinacionService.getAllEjecutivos();
        setEjecutivosOptions(ejecutivos.filter(e => e.is_active).map(e => ({
          id: e.id,
          full_name: e.full_name,
          coordinacion_id: e.coordinacion_id
        })));
      } catch (error) {
        console.error('Error cargando opciones de filtros:', error);
      }
    };
    
    loadFilterOptions();
  }, [user?.id, user?.role_name]);

  // Cargar prospectos iniciales para todas las columnas (Kanban)
  useEffect(() => {
    if (user?.id && viewType === 'kanban') {
      // Inicializar estados de columnas
      const etapasIniciales = [
        'Es miembro',
        'Activo PQNC',
        'Validando membresia',
        'En seguimiento',
        'Interesado',
        'Atendió llamada'
      ];
      
      const initialStates: Record<string, { loading: boolean; page: number; hasMore: boolean }> = {};
      etapasIniciales.forEach(etapa => {
        initialStates[etapa] = { loading: false, page: -1, hasMore: true };
      });
      setColumnLoadingStates(initialStates);
      
      // Cargar todos los prospectos de una vez
      loadProspectos(true);
    } else if (user?.id && viewType === 'datagrid') {
      // Para datagrid, cargar todos los prospectos
      loadProspectos(true);
    }
  }, [user?.id, viewType]);

  // Los filtros ahora se aplican solo en memoria, no recargan desde la base de datos
  // Solo recargar cuando cambia el usuario o la vista

  // Infinite Scroll ya no es necesario - todos los prospectos se cargan de una vez
  // Se mantiene el useEffect vacío para evitar errores si hay referencias al scrollObserverRef

  // OPTIMIZACIÓN: Cargar todas las coordinaciones y ejecutivos de una vez
  const loadCoordinacionesAndEjecutivos = async () => {
    try {
      const [coordinaciones, ejecutivos] = await Promise.all([
        coordinacionService.getCoordinaciones(),
        coordinacionService.getAllEjecutivos()
      ]);

      // Crear mapas para búsqueda O(1)
      const coordinacionesMap = new Map(coordinaciones.map(c => [c.id, c]));
      const ejecutivosMap = new Map(ejecutivos.map(e => [e.id, e]));

      return { coordinacionesMap, ejecutivosMap };
    } catch (error) {
      console.error('❌ Error loading coordinaciones/ejecutivos:', error);
      return { coordinacionesMap: new Map(), ejecutivosMap: new Map() };
    }
  };

  // Enriquecer prospectos usando mapas (mucho más rápido)
  const enrichProspectos = (prospectosData: Prospecto[], coordinacionesMap: Map<string, any>, ejecutivosMap: Map<string, any>) => {
    return prospectosData.map((prospecto: Prospecto) => {
      const coordinacionInfo = prospecto.coordinacion_id ? coordinacionesMap.get(prospecto.coordinacion_id) : null;
      const ejecutivoInfo = prospecto.ejecutivo_id ? ejecutivosMap.get(prospecto.ejecutivo_id) : null;
      
      // Priorizar asesor_asignado si existe, de lo contrario usar ejecutivoInfo
      const ejecutivoNombre = prospecto.asesor_asignado && prospecto.asesor_asignado.trim() !== ''
        ? prospecto.asesor_asignado.trim()
        : ejecutivoInfo?.full_name || null;

      return {
        ...prospecto,
        coordinacion_codigo: coordinacionInfo?.codigo,
        coordinacion_nombre: coordinacionInfo?.nombre,
        ejecutivo_nombre: ejecutivoNombre,
        ejecutivo_email: ejecutivoInfo?.email
      };
    });
  };

  // Estados para infinite scroll por columna (Kanban)
  const [columnLoadingStates, setColumnLoadingStates] = useState<Record<string, { loading: boolean; page: number; hasMore: boolean }>>({});
  const [columnPages, setColumnPages] = useState<Record<string, number>>({});

  const loadProspectos = async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setAllProspectos([]);
        setHasMore(false);
        setColumnPages({});
        setColumnLoadingStates({});
      }

      // Construir query base - CARGAR TODOS LOS PROSPECTOS SIN LÍMITE
      let query = analysisSupabase
        .from('prospectos')
        .select('*', { count: 'exact' });

      // Aplicar filtros de permisos si hay usuario (incluye lógica de backup)
      let ejecutivosIdsParaFiltro: string[] | null = null;
      let coordinacionesIdsParaFiltro: string[] | null = null;
      
      if (user?.id) {
        try {
          const filteredQuery = await permissionsService.applyProspectFilters(query, user.id);
          // Si applyProspectFilters retorna algo, es válido (la función interna ya valida)
          if (filteredQuery && typeof filteredQuery === 'object') {
            query = filteredQuery;
            
            // Guardar los filtros aplicados para usar en fallback si es necesario
            const ejecutivoFilter = await permissionsService.getEjecutivoFilter(user.id);
            const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(user.id);
            
            if (ejecutivoFilter) {
              // Obtener IDs de ejecutivos donde es backup
              const { supabaseSystemUIAdmin } = await import('../../config/supabaseSystemUI');
              const { data: ejecutivosConBackup } = await supabaseSystemUIAdmin
                .from('auth_users')
                .select('id')
                .eq('backup_id', ejecutivoFilter)
                .eq('has_backup', true);
              
              ejecutivosIdsParaFiltro = [ejecutivoFilter];
              if (ejecutivosConBackup && ejecutivosConBackup.length > 0) {
                ejecutivosIdsParaFiltro.push(...ejecutivosConBackup.map(e => e.id));
              }
            } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
              coordinacionesIdsParaFiltro = coordinacionesFilter;
            }
          }
        } catch (error) {
          // Silenciar error, continuar con query original
        }
      }

      // NO aplicar paginación - cargar todos los prospectos
      // La query siempre debería tener .order() después de .select()
      let data, error, count;
      try {
        // Verificar que la query tiene .order() antes de usarlo
        if (typeof query.order === 'function') {
          const result = await query.order('created_at', { ascending: false });
          data = result.data;
          error = result.error;
          count = result.count;
        } else {
          // Si no tiene .order(), reconstruir la query con los filtros aplicados
          const { analysisSupabase } = await import('../../config/analysisSupabase');
          let fallbackQuery = analysisSupabase
            .from('prospectos')
            .select('*', { count: 'exact' });
          
          // Aplicar los mismos filtros que se aplicaron antes
          if (ejecutivosIdsParaFiltro && ejecutivosIdsParaFiltro.length > 0) {
            fallbackQuery = fallbackQuery.in('ejecutivo_id', ejecutivosIdsParaFiltro);
          } else if (coordinacionesIdsParaFiltro && coordinacionesIdsParaFiltro.length > 0) {
            fallbackQuery = fallbackQuery.in('coordinacion_id', coordinacionesIdsParaFiltro);
          }
          
          const fallbackResult = await fallbackQuery.order('created_at', { ascending: false });
          data = fallbackResult.data;
          error = fallbackResult.error;
          count = fallbackResult.count;
        }
      } catch (err) {
        // Si falla, reconstruir la query con los filtros aplicados (no sin filtros)
        const { analysisSupabase } = await import('../../config/analysisSupabase');
        let fallbackQuery = analysisSupabase
          .from('prospectos')
          .select('*', { count: 'exact' });
        
        // Aplicar los mismos filtros que se aplicaron antes
        if (ejecutivosIdsParaFiltro && ejecutivosIdsParaFiltro.length > 0) {
          fallbackQuery = fallbackQuery.in('ejecutivo_id', ejecutivosIdsParaFiltro);
        } else if (coordinacionIdParaFiltro) {
          fallbackQuery = fallbackQuery.eq('coordinacion_id', coordinacionIdParaFiltro);
        }
        
        const fallbackResult = await fallbackQuery.order('created_at', { ascending: false });
        data = fallbackResult.data;
        error = fallbackResult.error;
        count = fallbackResult.count;
      }

      if (error) {
        console.error('❌ Error loading prospectos:', error);
        return;
      }

      // Actualizar contador total
      if (count !== null) {
        setTotalCount(count);
      }

      // Cargar coordinaciones y ejecutivos una sola vez (optimización crítica)
      const { coordinacionesMap, ejecutivosMap } = await loadCoordinacionesAndEjecutivos();

      // Enriquecer prospectos usando mapas (instantáneo)
      let enrichedProspectos = enrichProspectos(data || [], coordinacionesMap, ejecutivosMap);

      // Para ejecutivos: verificación adicional usando canUserAccessProspect (verifica prospect_assignments)
      if (user?.id && ejecutivosIdsParaFiltro && ejecutivosIdsParaFiltro.length > 0) {
        // Filtrar prospectos usando el servicio de permisos (verifica prospect_assignments)
        const prospectosFiltrados = await Promise.all(
          enrichedProspectos.map(async (prospecto: Prospecto) => {
            // Verificar permisos usando el servicio (usa prospect_assignments como fuente de verdad)
            try {
              const permissionCheck = await permissionsService.canUserAccessProspect(user.id, prospecto.id);
              return permissionCheck.canAccess ? prospecto : null;
            } catch (error) {
              console.error(`❌ Error verificando permiso para prospecto ${prospecto.id}:`, error);
              return null; // En caso de error, excluir por seguridad
            }
          })
        );
        
        // Filtrar nulls
        enrichedProspectos = prospectosFiltrados.filter((p: Prospecto | null) => p !== null) as Prospecto[];
      }

      // Cargar todos los prospectos de una vez
      setAllProspectos(enrichedProspectos);
      setProspectos(enrichedProspectos);
      setHasMore(false); // Ya no hay más datos porque cargamos todo
      
    } catch (error) {
      console.error('❌ Error loading prospectos:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Función para cargar más prospectos de una columna específica (Kanban)
  // Ya no es necesaria porque cargamos todos los prospectos de una vez
  const loadMoreProspectosForColumn = async (etapa: string) => {
    // No hacer nada - todos los prospectos ya están cargados
    return;
  };

  // Cargar más prospectos cuando se hace scroll
  // Ya no es necesaria porque cargamos todos los prospectos de una vez
  const loadMoreProspectos = () => {
    // No hacer nada - todos los prospectos ya están cargados
    return;
  };

  // Filtrar y ordenar prospectos (usar allProspectos para filtros)
  const filteredAndSortedProspectos = useMemo(() => {
    // Aplicar filtros sobre todos los prospectos cargados
    let filtered = allProspectos;

    // Aplicar filtros
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        // Búsqueda por nombre del prospecto
        p.nombre_completo?.toLowerCase().includes(searchLower) ||
        p.nombre?.toLowerCase().includes(searchLower) ||
        p.apellido_paterno?.toLowerCase().includes(searchLower) ||
        p.apellido_materno?.toLowerCase().includes(searchLower) ||
        p.email?.toLowerCase().includes(searchLower) ||
        p.nombre_whatsapp?.toLowerCase().includes(searchLower) ||
        // Búsqueda por teléfono
        p.whatsapp?.toLowerCase().includes(searchLower) ||
        p.telefono_principal?.toLowerCase().includes(searchLower) ||
        // Búsqueda por ejecutivo asignado
        p.ejecutivo_nombre?.toLowerCase().includes(searchLower) ||
        // Búsqueda por coordinación
        p.coordinacion_codigo?.toLowerCase().includes(searchLower) ||
        p.coordinacion_nombre?.toLowerCase().includes(searchLower)
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

    // Filtro por coordinación (solo admin/admin operativo)
    if (filters.coordinacion_id) {
      filtered = filtered.filter(p => p.coordinacion_id === filters.coordinacion_id);
    }

    // Filtro por ejecutivo (solo admin/admin operativo)
    if (filters.ejecutivo_id) {
      filtered = filtered.filter(p => p.ejecutivo_id === filters.ejecutivo_id);
    }

    // Filtro por estado de asignación
    if (filters.asignacion === 'asignados') {
      filtered = filtered.filter(p => p.ejecutivo_id && p.ejecutivo_id.trim() !== '');
    } else if (filters.asignacion === 'no_asignados') {
      filtered = filtered.filter(p => !p.ejecutivo_id || p.ejecutivo_id.trim() === '');
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
  }, [allProspectos, filters, sort]);

  // Emitir evento para actualizar contador en el header
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('prospect-count-update', {
      detail: {
        filtered: filteredAndSortedProspectos.length,
        total: totalCount > 0 ? totalCount : allProspectos.length
      }
    }));
  }, [filteredAndSortedProspectos.length, totalCount, allProspectos.length]);

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
    // Limpiar selección al cambiar de vista
    if (newViewType !== 'datagrid') {
      setSelectedProspectIds(new Set());
    }
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
              placeholder="Buscar por nombre, teléfono, ejecutivo, coordinación..."
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
            
            {/* Filtros de coordinación, ejecutivo y asignación - disponibles en ambas vistas */}
            <select
              value={filters.coordinacion_id}
              onChange={(e) => {
                setFilters(prev => ({ 
                  ...prev, 
                  coordinacion_id: e.target.value,
                  // Limpiar ejecutivo si cambia la coordinación
                  ejecutivo_id: e.target.value ? prev.ejecutivo_id : ''
                }));
              }}
              className="h-9 px-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-1 md:flex-none md:w-auto min-w-[120px]"
            >
              <option value="">Todas las coordinaciones</option>
              {coordinacionesOptions.map(coord => (
                <option key={coord.id} value={coord.id}>{coord.codigo}</option>
              ))}
            </select>
            
            <select
              value={filters.ejecutivo_id}
              onChange={(e) => setFilters(prev => ({ ...prev, ejecutivo_id: e.target.value }))}
              className="h-9 px-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-1 md:flex-none md:w-auto min-w-[120px]"
            >
              <option value="">Todos los ejecutivos</option>
              {ejecutivosOptions
                .filter(e => !filters.coordinacion_id || e.coordinacion_id === filters.coordinacion_id)
                .map(ejecutivo => (
                  <option key={ejecutivo.id} value={ejecutivo.id}>{ejecutivo.full_name}</option>
                ))}
            </select>
            
            <select
              value={filters.asignacion}
              onChange={(e) => setFilters(prev => ({ ...prev, asignacion: e.target.value as 'todos' | 'asignados' | 'no_asignados' }))}
              className="h-9 px-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-1 md:flex-none md:w-auto min-w-[100px]"
            >
              <option value="todos">Todos</option>
              <option value="asignados">Asignados</option>
              <option value="no_asignados">Sin asignar</option>
            </select>
            
            <button 
              onClick={() => setFilters({ search: '', etapa: '', score: '', campana_origen: '', dateRange: '', coordinacion_id: '', ejecutivo_id: '', asignacion: 'todos' })}
              className="h-9 flex items-center justify-center gap-1.5 px-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-xs whitespace-nowrap"
            >
              <Filter size={14} />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
            
            {/* Botón de reasignación masiva (admin, admin operativo y coordinadores de Calidad en vista grid) */}
            {(user?.role_name === 'admin' || user?.role_name === 'administrador_operativo' || isCoordinadorCalidad) && viewType === 'datagrid' && selectedProspectIds.size > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setShowBulkAssignmentModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                <Users size={14} />
                <span>Reasignar {selectedProspectIds.size} prospecto{selectedProspectIds.size > 1 ? 's' : ''}</span>
              </motion.button>
            )}
            
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
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col p-6"
          style={{ height: 'calc(100vh - 280px)', maxHeight: 'calc(100vh - 280px)' }}
        >
          <ProspectosKanban
            prospectos={filteredAndSortedProspectos}
            onProspectoClick={handleProspectoClick}
            onProspectoContextMenu={(e, prospecto) => {
              if (user?.role_name === 'coordinador' || user?.role_name === 'admin' || user?.role_name === 'administrador_operativo') {
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
            onLoadMoreForColumn={loadMoreProspectosForColumn}
            columnLoadingStates={columnLoadingStates}
          />
          
          {/* Infinite Scroll ya no es necesario - todos los prospectos están cargados */}
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {prospecto.nombre_completo || `${prospecto.nombre} ${prospecto.apellido_paterno} ${prospecto.apellido_materno}`.trim()}
                        </div>
                        {user?.id && prospecto.ejecutivo_id && (
                          <BackupBadgeWrapper
                            currentUserId={user.id}
                            prospectoEjecutivoId={prospecto.ejecutivo_id}
                            variant="compact"
                          />
                        )}
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
                
                {(prospecto.coordinacion_codigo || prospecto.ejecutivo_nombre || prospecto.asesor_asignado) && (
                  <div className="mt-2">
                    <AssignmentBadge
                      call={{
                        coordinacion_codigo: prospecto.coordinacion_codigo,
                        coordinacion_nombre: prospecto.coordinacion_nombre,
                        ejecutivo_nombre: prospecto.ejecutivo_nombre || prospecto.asesor_asignado,
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
                  {/* Checkbox de selección múltiple (admin, admin operativo y coordinadores de Calidad) */}
                  {(user?.role_name === 'admin' || user?.role_name === 'administrador_operativo' || isCoordinadorCalidad) && (
                    <th className="px-3 md:px-4 lg:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => {
                            if (selectedProspectIds.size === filteredAndSortedProspectos.length) {
                              setSelectedProspectIds(new Set());
                            } else {
                              setSelectedProspectIds(new Set(filteredAndSortedProspectos.map(p => p.id)));
                            }
                          }}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                            selectedProspectIds.size > 0 && selectedProspectIds.size === filteredAndSortedProspectos.length
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : selectedProspectIds.size > 0
                                ? 'bg-blue-600/50 border-blue-600 text-white'
                                : 'bg-transparent border-gray-400 dark:border-gray-500 hover:border-blue-500 dark:hover:border-blue-400'
                          }`}
                        >
                          {selectedProspectIds.size > 0 && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              {selectedProspectIds.size === filteredAndSortedProspectos.length ? (
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              ) : (
                                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                              )}
                            </svg>
                          )}
                        </button>
                      </div>
                    </th>
                  )}
                  {[
                    { key: 'nombre_completo', label: 'Nombre', sortable: true, responsive: false },
                    { key: 'whatsapp', label: 'WhatsApp', sortable: true, responsive: false },
                    { key: 'etapa', label: 'Etapa', sortable: true, responsive: false },
                    { key: 'created_at', label: 'Creado', sortable: true, responsive: 'md' },
                    { key: 'coordinacion_codigo', label: 'Coordinación', sortable: true, responsive: false },
                    { key: 'ejecutivo_nombre', label: 'Asignación', sortable: true, responsive: false }
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
                        if (user?.role_name === 'coordinador' || user?.role_name === 'admin' || user?.role_name === 'administrador_operativo') {
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
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        selectedProspectIds.has(prospecto.id) 
                          ? 'bg-blue-50 dark:bg-blue-900/20' 
                          : 'cursor-pointer'
                      }`}
                    >
                      {/* Checkbox de selección (admin, admin operativo y coordinadores de Calidad) */}
                      {(user?.role_name === 'admin' || user?.role_name === 'administrador_operativo' || isCoordinadorCalidad) && (
                        <td 
                          className="px-3 md:px-4 lg:px-6 py-3 md:py-4 align-middle"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newSelected = new Set(selectedProspectIds);
                            if (newSelected.has(prospecto.id)) {
                              newSelected.delete(prospecto.id);
                            } else {
                              newSelected.add(prospecto.id);
                            }
                            setSelectedProspectIds(newSelected);
                          }}
                        >
                          <div className="flex items-center justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newSelected = new Set(selectedProspectIds);
                                if (newSelected.has(prospecto.id)) {
                                  newSelected.delete(prospecto.id);
                                } else {
                                  newSelected.add(prospecto.id);
                                }
                                setSelectedProspectIds(newSelected);
                              }}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                                selectedProspectIds.has(prospecto.id)
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'bg-transparent border-gray-400 dark:border-gray-500 hover:border-blue-500 dark:hover:border-blue-400'
                              }`}
                            >
                              {selectedProspectIds.has(prospecto.id) && (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-2 md:gap-3 min-w-[200px]">
                          <div className="p-1.5 md:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full flex-shrink-0">
                            <User size={14} className="md:w-4 md:h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="text-xs md:text-sm font-medium text-gray-900 dark:text-white truncate">
                                {prospecto.nombre_completo || `${prospecto.nombre} ${prospecto.apellido_paterno} ${prospecto.apellido_materno}`.trim()}
                              </div>
                              {user?.id && prospecto.ejecutivo_id && (
                                <BackupBadgeWrapper
                                  currentUserId={user.id}
                                  prospectoEjecutivoId={prospecto.ejecutivo_id}
                                  variant="compact"
                                />
                              )}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {prospecto.ciudad_residencia}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-900 dark:text-white font-mono">
                        <div className="min-w-[100px] md:min-w-[120px] truncate">{prospecto.whatsapp || '-'}</div>
                      </td>
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(prospecto.etapa || '')}`}>
                          {prospecto.etapa}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                        <div className="min-w-[60px]">{prospecto.created_at ? new Date(prospecto.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' }) : 'N/A'}</div>
                      </td>
                      {/* Columna de Coordinación */}
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4">
                        {prospecto.coordinacion_codigo ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCoordinacionColor(prospecto.coordinacion_codigo).bg} ${getCoordinacionColor(prospecto.coordinacion_codigo).text}`}>
                            <Users className="w-3 h-3 mr-1" />
                            {prospecto.coordinacion_codigo}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      {/* Columna de Asignación (Ejecutivo) */}
                      <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4">
                        {(() => {
                          const ejecutivoNombre = prospecto.ejecutivo_nombre || prospecto.asesor_asignado;
                          
                          if (!ejecutivoNombre) {
                            return <span className="text-xs text-gray-400 dark:text-gray-500">Sin asignar</span>;
                          }
                          
                          // Extraer primer nombre y primer apellido
                          const partes = ejecutivoNombre.trim().split(/\s+/);
                          const primerNombre = partes[0] || '';
                          const primerApellido = partes[1] || '';
                          const nombreMostrar = primerApellido ? `${primerNombre} ${primerApellido}` : primerNombre;
                          
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              <User className="w-3 h-3 mr-1" />
                              {nombreMostrar}
                            </span>
                          );
                        })()}
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
          
          {/* Infinite Scroll ya no es necesario - todos los prospectos están cargados */}
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
            loadProspectos(true);
            setAssignmentContextMenu(null);
          }}
        />
      )}

      {/* Modal de reasignación masiva */}
      <BulkAssignmentModal
        prospectIds={Array.from(selectedProspectIds)}
        isOpen={showBulkAssignmentModal}
        onClose={() => {
          setShowBulkAssignmentModal(false);
          setSelectedProspectIds(new Set());
        }}
        onAssignmentComplete={() => {
          loadProspectos(true);
          setSelectedProspectIds(new Set());
        }}
      />

      {/* Sidebar */}
      <ProspectoSidebar
        prospecto={selectedProspecto}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigateToLiveChat={onNavigateToLiveChat}
        onNavigateToNatalia={onNavigateToNatalia}
        onOpenCallDetail={handleOpenCallDetail}
      />

      {/* 
        ============================================
        SIDEBAR DE DETALLE DE LLAMADA
        ============================================
        Z-INDEX: z-[240] (backdrop) / z-[250] (sidebar)
        - Configurado para aparecer ENCIMA del ProspectoSidebar (z-[190])
        - Comportamiento: CallDetailModalSidebar > ProspectoSidebar
        ============================================
      */}
      {createPortal(
        <CallDetailModalSidebar
          callId={selectedCallId}
          isOpen={callDetailModalOpen}
          onClose={() => {
            setCallDetailModalOpen(false);
            setSelectedCallId(null);
          }}
          allCallsWithAnalysis={[]}
          onProspectClick={(prospectId) => {
            // Ya estamos en el sidebar del prospecto, no hacer nada
          }}
          zIndexBackdrop="z-[240]"
          zIndexSidebar="z-[250]"
        />,
        document.body
      )}
    </div>
  );
};

export { ProspectoSidebar };
export default ProspectosManager;
