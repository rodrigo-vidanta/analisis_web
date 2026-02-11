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
  ChevronRight, Eye, EyeOff, Edit, Star, TrendingUp, Activity,
  FileText, MessageSquare, CheckCircle, AlertTriangle, Network,
  LayoutGrid, Table2, PhoneCall, Heart, Loader2, Shuffle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analysisSupabase } from '../../config/analysisSupabase';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
import { realtimeHub } from '../../services/realtimeHub';
import Chart from 'chart.js/auto';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectivePermissions } from '../../hooks/useEffectivePermissions';
import { useNinjaAwarePermissions } from '../../hooks/useNinjaAwarePermissions';
import { permissionsService } from '../../services/permissionsService';
import { etapasService } from '../../services/etapasService';
import { prospectsViewPreferencesService } from '../../services/prospectsViewPreferencesService';
import type { ViewType } from '../../services/prospectsViewPreferencesService';
import ProspectosKanban from './ProspectosKanban';
import { BulkReassignmentTab } from './BulkReassignmentTab';
import { ManualImportTab } from './ManualImportTab';
import { AssignmentContextMenu } from '../shared/AssignmentContextMenu';
import { BulkAssignmentModal } from '../shared/BulkAssignmentModal';
import { AssignmentBadge } from '../analysis/AssignmentBadge';
import { ProspectoEtapaAsignacion } from '../shared/ProspectoEtapaAsignacion';
import { EtapaBadge } from '../shared/EtapaBadge';
import { BackupBadgeWrapper } from '../shared/BackupBadgeWrapper';
import { coordinacionService } from '../../services/coordinacionService';
import { ScheduledCallsSection } from '../shared/ScheduledCallsSection';
import { Avatar } from '../shared/Avatar';
import { CallDetailModalSidebar } from '../chat/CallDetailModalSidebar';
import { getCoordinacionColor } from '../../utils/coordinacionColors';
import { PhoneDisplay } from '../shared/PhoneDisplay';
import toast from 'react-hot-toast';

/**
 * Normaliza texto para búsqueda: remueve acentos, convierte a minúsculas
 * Esto permite buscar "Sanchez" y encontrar "Sánchez"
 */
const normalizeForSearch = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD') // Descompone caracteres con acentos (é -> e + ́)
    .replace(/[\u0300-\u036f]/g, '') // Remueve marcas diacríticas
    .replace(/ñ/g, 'n') // Caso especial para ñ
    .replace(/[^\w\s@.]/g, '') // Mantiene letras, números, espacios, @ y .
    .trim();
};

/**
 * Normaliza número de teléfono para búsqueda: solo dígitos
 * Esto permite buscar "55 8129 9678" y encontrar "5215581299678"
 */
const normalizePhoneForSearch = (phone: string | null | undefined): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, ''); // Solo dígitos
};

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
  etapa_id?: string; // ✅ AGREGADO: FK a tabla etapas
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
  etapa_id: string; // ✅ Migrado de 'etapa' (TEXT) a 'etapa_id' (UUID FK)
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
  // ✅ Hook de autenticación para restricciones
  const { user } = useAuth();
  
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

  /**
   * Obtener color de etapa desde servicio (migración 2026-01-26)
   * @deprecated Usar componente EtapaBadge directamente
   */
  const getStatusColor = (etapaIdOrNombre: string | undefined) => {
    if (!etapaIdOrNombre) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    
    const color = etapasService.getColor(etapaIdOrNombre);
    // Convertir hex a clases Tailwind (aproximación)
    return `bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`;
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
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm ${zIndexBackdrop}`}
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
                      className="p-2.5 rounded-full transition-all duration-200 shadow-xl bg-white/60 hover:bg-white/70 text-white cursor-pointer hover:scale-110 active:scale-95 backdrop-blur-sm border-2 border-white/40"
                      title="Ir a Live Chat (buscar o crear conversación)"
                    >
                      <MessageSquare size={20} className="text-white drop-shadow-lg" strokeWidth={2.5} />
                    </button>
                  )}
                  <button 
                    onClick={onClose}
                    className="p-2.5 rounded-full transition-all duration-200 bg-white/55 hover:bg-white/65 text-white hover:scale-110 active:scale-95 shadow-xl backdrop-blur-sm border-2 border-white/35"
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
                      <PhoneDisplay
                        phone={prospecto.whatsapp}
                        prospecto={prospecto}
                        label="WhatsApp"
                        showLabel
                        showIcon
                        size="xs"
                        copyable
                      />
                    </div>
                    <div>
                      <PhoneDisplay
                        phone={prospecto.telefono_principal}
                        prospecto={prospecto}
                        label="Teléfono"
                        showLabel
                        showIcon
                        size="xs"
                        copyable
                      />
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
                {user && (
                  <ScheduledCallsSection
                    prospectoId={prospecto.id}
                    prospectoNombre={prospecto.nombre_completo || `${prospecto.nombre} ${prospecto.apellido_paterno} ${prospecto.apellido_materno}`.trim()}
                    delay={0.45}
                    etapaId={prospecto.etapa_id}
                    etapaLegacy={prospecto.etapa}
                    userRole={user.role_name}
                  />
                )}

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
  const { isAdmin, isAdminOperativo, isCoordinador } = useEffectivePermissions();
  
  // ============================================
  // MODO NINJA: Usar usuario efectivo para filtros
  // ============================================
  const { 
    isNinjaMode, 
    effectiveUser,
    isEffectiveAdmin,
    isEffectiveCoordinador 
  } = useNinjaAwarePermissions();
  
  // Usuario efectivo para consultas (ninja o real)
  const queryUserId = isNinjaMode && effectiveUser ? effectiveUser.id : user?.id;
  const queryRoleName = isNinjaMode && effectiveUser ? effectiveUser.role_name : user?.role_name;
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [allProspectos, setAllProspectos] = useState<Prospecto[]>([]); // Todos los prospectos cargados
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true); // Hay más datos para cargar
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const scrollObserverRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const BATCH_SIZE = 400; // Tamaño del batch para infinite scrolling (DataGrid y Kanban)
  
  const [selectedProspecto, setSelectedProspecto] = useState<Prospecto | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Estados para el modal de detalle de llamada
  const [callDetailModalOpen, setCallDetailModalOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  
  // Estado para vista (Kanban/Datagrid) - con lazy initialization
  const [viewType, setViewType] = useState<ViewType>(() => {
    if (user?.id) {
      const prefs = prospectsViewPreferencesService.getUserPreferences(user.id);
      return prefs.viewType;
    }
    return 'kanban';
  });
  
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>(() => {
    if (user?.id) {
      const prefs = prospectsViewPreferencesService.getUserPreferences(user.id);
      return prefs.collapsedColumns || [];
    }
    return [];
  });
  
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
    const defaults = [
      'checkpoint-importado_manual',
      'checkpoint-activo_pqnc', 
      'checkpoint-es_miembro',
      'checkpoint-no_interesado'
    ];
    
    if (user?.id) {
      const prefs = prospectsViewPreferencesService.getUserPreferences(user.id);
      return prefs.hiddenColumns || defaults;
    }
    return defaults;
  });
  
  // Estado para pestaña activa (solo admin/admin_operativo/coordinador_calidad pueden ver reasignación)
  const [activeTab, setActiveTab] = useState<'prospectos' | 'reassignment' | 'import'>('prospectos');
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    etapa_id: '', // ✅ Migrado de 'etapa' a 'etapa_id'
    score: '', // Mantener en estado pero no mostrar en UI
    campana_origen: '',
    dateRange: '',
    coordinacion_id: '',
    ejecutivo_id: '',
    asignacion: 'todos'
  });
  
  // Estado para búsqueda en servidor (debounced)
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearchingServer, setIsSearchingServer] = useState(false);
  const [serverSearchResults, setServerSearchResults] = useState<Prospecto[] | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
  
  // Estado para totales por etapa (conteo real desde BD, independiente del batch cargado)
  const [etapaTotals, setEtapaTotals] = useState<Record<string, number>>({});

  // Cargar preferencias de vista al inicio
  useEffect(() => {
    const preferences = prospectsViewPreferencesService.getUserPreferences(user?.id || null);
    setViewType(preferences.viewType);
    setCollapsedColumns(preferences.collapsedColumns || []);
    setHiddenColumns(preferences.hiddenColumns || []);
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
        
        // ✅ FIX 2026-01-24: Solo mostrar usuarios que tengan prospectos asignados
        // Primero obtener los ejecutivo_id únicos de la tabla prospectos
        const { data: prospectosEjecutivos, error: prospectosError } = await analysisSupabase
          .from('prospectos')
          .select('ejecutivo_id')
          .not('ejecutivo_id', 'is', null);
        
        if (prospectosError) {
          console.error('Error obteniendo ejecutivos de prospectos:', prospectosError);
          return;
        }
        
        // Obtener IDs únicos de ejecutivos que tienen prospectos
        const ejecutivoIdsConProspectos = [...new Set(
          (prospectosEjecutivos || [])
            .map(p => p.ejecutivo_id)
            .filter(Boolean)
        )];
        
        if (ejecutivoIdsConProspectos.length === 0) {
          setEjecutivosOptions([]);
          return;
        }
        
        // Obtener datos de esos usuarios (sin filtrar por rol ni estado activo)
        const { data: usuariosData, error: usuariosError } = await supabaseSystemUI
          .from('user_profiles_v2')
          .select('id, full_name, coordinacion_id, role_name, is_active')
          .in('id', ejecutivoIdsConProspectos)
          .order('full_name');
        
        if (usuariosError) {
          console.error('Error obteniendo datos de usuarios:', usuariosError);
          return;
        }
        
        // Aplicar filtros según nivel de permisos del usuario
        let filteredUsuarios = usuariosData || [];
        const userRole = user?.role_name;
        const isCalidad = await permissionsService.isCoordinadorCalidad(user?.id || '');
        
        if (userRole === 'admin' || userRole === 'administrador_operativo' || isCalidad) {
          // Admin, Admin Operativo, Coordinador Calidad: ver todos
          // No se aplican filtros adicionales
        } else if (userRole === 'coordinador') {
          // Coordinador: solo usuarios de su coordinación
          const userCoordinacionId = user?.coordinacion_id;
          if (userCoordinacionId) {
            filteredUsuarios = filteredUsuarios.filter(u => u.coordinacion_id === userCoordinacionId);
          }
        } else if (userRole === 'supervisor') {
          // Supervisor: solo usuarios de su coordinación
          const userCoordinacionId = user?.coordinacion_id;
          if (userCoordinacionId) {
            filteredUsuarios = filteredUsuarios.filter(u => u.coordinacion_id === userCoordinacionId);
          }
        } else if (userRole === 'ejecutivo') {
          // Ejecutivo: solo puede ver sus propios prospectos (mostrar solo su nombre)
          filteredUsuarios = filteredUsuarios.filter(u => u.id === user?.id);
        }
        
        setEjecutivosOptions(filteredUsuarios.map(e => ({
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

  // Ref para prevenir cargas iniciales duplicadas (React Strict Mode)
  const hasInitialLoadRef = useRef(false);

  // Cargar prospectos iniciales para todas las columnas (Kanban)
  useEffect(() => {
    // Prevenir cargas duplicadas en React Strict Mode
    if (hasInitialLoadRef.current) {
      return;
    }

    if (user?.id && viewType === 'kanban') {
      hasInitialLoadRef.current = true;
      
      // ✅ ORDEN CORRECTO: Primero cargar totales, luego inicializar estados
      (async () => {
        const counts = await loadEtapaTotals(); // ← Obtener counts directamente
        
        // ✅ Inicializar estados de columnas con etapa_id (UUIDs) dinámicamente
        const etapasActivas = etapasService.getAllActive();
        
        const initialStates: Record<string, { loading: boolean; page: number; hasMore: boolean }> = {};
        etapasActivas.forEach(etapa => {
          // Verificar si hay prospectos en esta columna usando counts retornados
          const totalEnColumna = counts[etapa.id] || 0;
          initialStates[etapa.id] = { 
            loading: false, 
            page: -1,  // ← -1 = página 0 no cargada aún
            hasMore: totalEnColumna > 0  // ← Solo hasMore si hay al menos 1
          };
        });
        setColumnLoadingStates(initialStates);
        
        // Cargar prospectos globales (para otras vistas/widgets), pasando counts
        await loadProspectos(true, counts);
      })();
    } else if (user?.id && viewType === 'datagrid') {
      hasInitialLoadRef.current = true;
      // Para datagrid, cargar todos los prospectos
      loadProspectos(true);
      // Cargar totales por etapa (también para datagrid stats)
      loadEtapaTotals();
    }
    // NO resetear hasInitialLoadRef en cleanup - causa cargas duplicadas en Strict Mode
  }, [user?.id, viewType]);

  // ============================================
  // 🥷 MODO NINJA: Recargar cuando cambia el usuario efectivo
  // ============================================
  const prevQueryUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    // Solo recargar si queryUserId CAMBIÓ (no en la carga inicial)
    if (queryUserId && prevQueryUserIdRef.current !== null && prevQueryUserIdRef.current !== queryUserId) {
      console.log('🥷 Modo Ninja: recargando con usuario', queryUserId);
      loadProspectos(true);
      loadEtapaTotals();
    }
    prevQueryUserIdRef.current = queryUserId;
  }, [queryUserId, isNinjaMode]);

  // ✅ REALTIME: Suscripción via RealtimeHub para detectar cambios en id_dynamics y etapa (PhoneDisplay)
  useEffect(() => {
    if (!user?.id) return;

    const unsub = realtimeHub.subscribe('prospectos', 'UPDATE', (payload) => {
          const updatedProspecto = payload.new as Record<string, unknown>;
          const oldProspecto = payload.old as Record<string, unknown>;

          // Detectar cambios en id_dynamics o etapa para actualizar PhoneDisplay en tiempo real
          const idDynamicsChanged = oldProspecto?.id_dynamics !== updatedProspecto.id_dynamics;
          const etapaChanged = oldProspecto?.etapa !== updatedProspecto.etapa;

          if (idDynamicsChanged || etapaChanged) {
            setAllProspectos(prev => {
              const index = prev.findIndex(p => p.id === updatedProspecto.id);
              if (index !== -1) {
                const updated = [...prev];
                updated[index] = {
                  ...updated[index],
                  id_dynamics: updatedProspecto.id_dynamics as string,
                  etapa: updatedProspecto.etapa as string
                };
                return updated;
              }
              return prev;
            });

            // También actualizar el sidebar si está abierto con este prospecto
            setSelectedProspecto(prev => {
              if (prev && prev.id === updatedProspecto.id) {
                return {
                  ...prev,
                  id_dynamics: updatedProspecto.id_dynamics as string,
                  etapa: updatedProspecto.etapa as string
                };
              }
              return prev;
            });
          }
    });

    return () => {
      unsub();
    };
  }, [user?.id]);

  // Los filtros ahora se aplican solo en memoria, no recargan desde la base de datos
  // Solo recargar cuando cambia el usuario o la vista

  // ============================================
  // BÚSQUEDA EN SERVIDOR (para encontrar prospectos no cargados)
  // ============================================
  
  // Debounce de búsqueda: esperar 400ms después de que el usuario deje de escribir
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Solo buscar en servidor si hay término de búsqueda de más de 3 caracteres
    if (filters.search.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        setDebouncedSearch(filters.search.trim());
      }, 400);
    } else {
      setDebouncedSearch('');
      setServerSearchResults(null);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters.search]);
  
  // Ejecutar búsqueda en servidor cuando cambia debouncedSearch
  // ⚠️ MODO NINJA: Usar queryUserId para filtrar como el usuario suplantado
  useEffect(() => {
    if (!debouncedSearch || !queryUserId || !analysisSupabase) {
      setServerSearchResults(null);
      return;
    }
    
    const searchInServer = async () => {
      setIsSearchingServer(true);
      try {
        // Normalizar búsqueda para teléfono
        const searchDigits = normalizePhoneForSearch(debouncedSearch);
        const isPhoneSearch = searchDigits.length >= 6;
        
        // Construir query de búsqueda
        let query = analysisSupabase
          .from('prospectos')
          .select('*');
        
        // Aplicar filtros de permisos (usa queryUserId para modo ninja)
        if (queryUserId) {
          const filteredQuery = await permissionsService.applyProspectFilters(query, queryUserId);
          // Verificar que filteredQuery es un PostgrestFilterBuilder válido (tiene método .or)
          if (filteredQuery && typeof filteredQuery === 'object' && typeof filteredQuery.or === 'function') {
            query = filteredQuery;
          }
          // Si filteredQuery no es válido, mantener la query original
        }
        
        // Buscar por teléfono (búsqueda exacta con LIKE)
        if (isPhoneSearch) {
          query = query.or(`whatsapp.ilike.%${searchDigits}%,telefono_principal.ilike.%${searchDigits}%`);
        } else {
          // Buscar por nombre (ILIKE para ignorar mayúsculas, pero sensible a acentos)
          // Nota: PostgreSQL es sensible a acentos por defecto con ILIKE
          query = query.or(
            `nombre_completo.ilike.%${debouncedSearch}%,` +
            `nombre.ilike.%${debouncedSearch}%,` +
            `apellido_paterno.ilike.%${debouncedSearch}%,` +
            `apellido_materno.ilike.%${debouncedSearch}%,` +
            `email.ilike.%${debouncedSearch}%,` +
            `nombre_whatsapp.ilike.%${debouncedSearch}%`
          );
        }
        
        // Ordenar y limitar resultados
        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) {
          console.error('❌ Error en búsqueda de servidor:', error);
          setServerSearchResults(null);
          return;
        }
        
        if (data && data.length > 0) {
          // Enriquecer con datos de coordinación/ejecutivo
          const coordinaciones = await coordinacionService.getCoordinaciones();
          const ejecutivos = await coordinacionService.getAllEjecutivos();
          const coordinacionesMap = new Map(coordinaciones.map(c => [c.id, c]));
          const ejecutivosMap = new Map(ejecutivos.map(e => [e.id, e]));
          
          const enrichedResults = data.map((p: any) => {
            const coordinacion = p.coordinacion_id ? coordinacionesMap.get(p.coordinacion_id) : null;
            const ejecutivo = p.ejecutivo_id ? ejecutivosMap.get(p.ejecutivo_id) : null;
            return {
              ...p,
              coordinacion_codigo: coordinacion?.codigo || null,
              coordinacion_nombre: coordinacion?.nombre || null,
              ejecutivo_nombre: ejecutivo?.full_name || null,
              ejecutivo_email: ejecutivo?.email || null,
            };
          });
          
          setServerSearchResults(enrichedResults);
        } else {
          setServerSearchResults([]);
        }
      } catch (error) {
        console.error('❌ Error en búsqueda de servidor:', error);
        setServerSearchResults(null);
      } finally {
        setIsSearchingServer(false);
      }
    };
    
    searchInServer();
  }, [debouncedSearch, queryUserId]);

  // Infinite Scroll para DataGrid - cargar más prospectos cuando se hace scroll
  // NOTA: Este useEffect debe estar después de la definición de filteredAndSortedProspectos
  // Por ahora usamos allProspectos.length en lugar de filteredAndSortedProspectos.length

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
  
  // Ref para prevenir cargas duplicadas de etapaTotals
  const isLoadingEtapaTotalsRef = useRef(false);
  
  // Cargar totales por etapa (conteos reales desde BD, independiente del batch cargado)
  // ⚠️ MODO NINJA: Usar queryUserId para filtrar como el usuario suplantado
  const loadEtapaTotals = async (): Promise<Record<string, number>> => {
    if (!queryUserId) return {};
    
    // Prevenir cargas duplicadas
    if (isLoadingEtapaTotalsRef.current) {
      return {};
    }
    isLoadingEtapaTotalsRef.current = true;
    
    try {
      // ✅ SOLUCIÓN: Contar por etapa_id en múltiples batches para superar límite de 1000
      const MAX_BATCH = 1000;
      let allData: { etapa_id?: string }[] = [];
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        // Construir query base con paginación
        let query = analysisSupabase
          .from('prospectos')
          .select('etapa_id')
          .range(offset, offset + MAX_BATCH - 1);
        
        // Aplicar filtros de permisos (usa queryUserId para modo ninja)
        if (queryUserId) {
          try {
            const filteredQuery = await permissionsService.applyProspectFilters(query, queryUserId);
            if (filteredQuery && typeof filteredQuery === 'object' && typeof filteredQuery.select === 'function') {
              query = filteredQuery;
            }
          } catch {
            // Error aplicando filtros - continuar con query original
          }
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('❌ Error en batch de loadEtapaTotals:', error);
          break;
        }
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          offset += MAX_BATCH;
          hasMore = data.length === MAX_BATCH;
        } else {
          hasMore = false;
        }
      }
      
      // Agrupar por etapa_id y contar (nueva arquitectura)
      const counts: Record<string, number> = {};
      allData.forEach((row: { etapa_id?: string }) => {
        const etapaId = row.etapa_id || 'sin-etapa';
        counts[etapaId] = (counts[etapaId] || 0) + 1;
      });
      
      // Totales de etapas cargados - silencioso
      
      setEtapaTotals(counts);
      return counts;
    } catch (error) {
      console.error('❌ Error cargando totales por etapa:', error);
      return {};
    } finally {
      isLoadingEtapaTotalsRef.current = false;
    }
  };
  
  // Ref para prevenir ejecuciones simultáneas de loadProspectos
  const isLoadingProspectosRef = useRef(false);

  const loadProspectos = async (reset: boolean = false, etapaCountsOverride?: Record<string, number>) => {
    // Prevenir ejecuciones simultáneas
    if (isLoadingProspectosRef.current) {
      // Silenciar retorno - el ref previene ejecuciones duplicadas correctamente
      // (React Strict Mode puede ejecutar efectos dos veces, esto es normal)
      return;
    }
    
    isLoadingProspectosRef.current = true;
    
    try {
      if (reset) {
        setLoading(true);
        setAllProspectos([]);
        setHasMore(true);
        setCurrentPage(0);
        setColumnPages({});
        setColumnLoadingStates({});
      }

      // Construir query base con paginación usando .range()
      const from = reset ? 0 : currentPage * BATCH_SIZE;
      const to = from + BATCH_SIZE - 1;
      
      // ✅ USAR VISTA OPTIMIZADA con etapas, ejecutivo y coordinación
      let query = analysisSupabase
        .from('prospectos_con_ejecutivo_y_coordinacion')  // ← Vista con JOINs
        .select('*', { count: 'exact' })
        .range(from, to);

      // Aplicar filtros de permisos si hay usuario (incluye lógica de backup)
      // ⚠️ MODO NINJA: Usar queryUserId para filtrar como el usuario suplantado
      let ejecutivosIdsParaFiltro: string[] | null = null;
      let coordinacionesIdsParaFiltro: string[] | null = null;
      
      if (queryUserId) {
        try {
          const filteredQuery = await permissionsService.applyProspectFilters(query, queryUserId);
          // Verificar que filteredQuery es un PostgrestFilterBuilder válido
          if (filteredQuery && typeof filteredQuery === 'object' && typeof filteredQuery.select === 'function') {
            query = filteredQuery;
            
            // Guardar los filtros aplicados para usar en fallback si es necesario
            const ejecutivoFilter = await permissionsService.getEjecutivoFilter(queryUserId);
            const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(queryUserId);
            
            if (ejecutivoFilter) {
              // Obtener IDs de ejecutivos donde es backup usando el servicio optimizado
              const ejecutivosConBackup = await permissionsService.getEjecutivosWhereIsBackup(ejecutivoFilter);
              
              ejecutivosIdsParaFiltro = [ejecutivoFilter];
              if (ejecutivosConBackup && ejecutivosConBackup.length > 0) {
                ejecutivosIdsParaFiltro.push(...ejecutivosConBackup);
              }
            } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
              coordinacionesIdsParaFiltro = coordinacionesFilter;
            }
          }
        } catch (error) {
          // Silenciar error, continuar con query original
        }
      }

      // Aplicar ordenamiento y paginación con .range()
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
            .from('prospectos_con_ejecutivo_y_coordinacion')  // ← Vista optimizada
            .select('*', { count: 'exact' })
            .range(from, to);
          
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
        // Si falla, reconstruir la query con los filtros aplicados
        const { analysisSupabase } = await import('../../config/analysisSupabase');
        let fallbackQuery = analysisSupabase
          .from('prospectos_con_ejecutivo_y_coordinacion')  // ← Vista optimizada
          .select('*', { count: 'exact' })
          .range(from, to);
        
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

      if (error) {
        console.error('❌ Error loading prospectos:', error);
        return;
      }

      // Actualizar contador total (solo en reset)
      if (reset && count !== null) {
        setTotalCount(count);
      }

      // Verificar si hay más datos para cargar
      if (reset) {
        // En reset, verificar contra el total
        if (count !== null) {
          setHasMore((data?.length || 0) < count);
        } else {
          // Si no hay count, verificar si se cargaron menos que el batch size
          setHasMore((data?.length || 0) === BATCH_SIZE);
        }
      } else {
        // Al agregar más datos, verificar si hay más disponibles
        const totalLoaded = allProspectos.length + (data?.length || 0);
        if (count !== null) {
          setHasMore(totalLoaded < count);
        } else {
          // Si no hay count, verificar si se cargaron menos que el batch size
          setHasMore((data?.length || 0) === BATCH_SIZE);
        }
      }

      // ✅ NO NECESITA ENRICHMENT - La vista ya trae ejecutivo y coordinación enriquecidos
      const enrichedProspectos = data || [];

      // ⚡ OPTIMIZACIÓN CRÍTICA: Pre-cargar datos de backup SIEMPRE antes de verificar permisos
      // Esto evita múltiples requests simultáneas que causan ERR_INSUFFICIENT_RESOURCES
      // ⚠️ MODO NINJA: Usar queryUserId para filtrar como el usuario suplantado
      if (queryUserId) {
        // Pre-cargar datos del USUARIO ACTUAL primero (para BackupBadgeWrapper)
        await permissionsService.preloadBackupData([queryUserId]);
        
        // Luego pre-cargar datos de ejecutivos de los prospectos
        const ejecutivosUnicos = [...new Set(enrichedProspectos.map((p: Prospecto) => p.ejecutivo_id).filter(Boolean))] as string[];
        if (ejecutivosUnicos.length > 0) {
          await permissionsService.preloadBackupData(ejecutivosUnicos);
        }
      }

      // Para ejecutivos: verificación adicional usando canUserAccessProspect (verifica prospect_assignments)
      // ⚠️ MODO NINJA: Usar queryUserId para verificar permisos como el usuario suplantado
      let prospectosFiltrados: Prospecto[] = enrichedProspectos; // Por defecto, usar todos los prospectos
      
      if (queryUserId && ejecutivosIdsParaFiltro && ejecutivosIdsParaFiltro.length > 0) {
        // Filtrar prospectos usando el servicio de permisos (verifica prospect_assignments)
        // Los datos de backup ya están pre-cargados arriba
        // Procesar en batches pequeños para evitar saturar el navegador
        const BATCH_SIZE = 50; // Procesar 50 prospectos a la vez
        const filtradosTemp: Prospecto[] = [];
        
        for (let i = 0; i < enrichedProspectos.length; i += BATCH_SIZE) {
          const batch = enrichedProspectos.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map(async (prospecto: Prospecto) => {
              // Verificar permisos usando el servicio (usa prospect_assignments como fuente de verdad)
              try {
                const permissionCheck = await permissionsService.canUserAccessProspect(queryUserId, prospecto.id);
                return permissionCheck.canAccess ? prospecto : null;
              } catch (error) {
                console.error(`❌ Error verificando permiso para prospecto ${prospecto.id}:`, error);
                return null; // En caso de error, excluir por seguridad
              }
            })
          );
          
          // Filtrar nulls y agregar al resultado
          const validResults = batchResults.filter((p: Prospecto | null) => p !== null) as Prospecto[];
          filtradosTemp.push(...validResults);
        }
        
        // Asignar el resultado filtrado
        prospectosFiltrados = filtradosTemp;
      }

      // Agregar nuevos prospectos a los existentes (o reemplazar si es reset)
      if (reset) {
        // Usar el array filtrado (que puede ser igual a enrichedProspectos si no hubo filtrado)
        setAllProspectos(prospectosFiltrados);
        setProspectos(prospectosFiltrados);
        setCurrentPage(1); // Siguiente página será 1
        
        // Actualizar estados de columnas para Kanban
        if (viewType === 'kanban') {
          // ✅ Usar etapas dinámicas con UUIDs (no hardcodear nombres)
          const etapasActivas = etapasService.getAllActive();
          
          const newColumnStates: Record<string, { loading: boolean; page: number; hasMore: boolean }> = {};
          
          // ✅ Para cada columna, calcular hasMore basado en el total de esa etapa
          etapasActivas.forEach(etapa => {
            const counts = etapaCountsOverride || etapaTotals;  // ← Usar override si existe
            const totalEnColumna = counts[etapa.id] || 0;
            const COLUMN_BATCH_SIZE = 100;
            
            newColumnStates[etapa.id] = {
              loading: false, 
              page: -1,  // ← -1 indica que NO se ha cargado la página 0 aún
              hasMore: totalEnColumna > 0  // ← Si hay al menos 1, hay que cargar
            };
          });
          setColumnLoadingStates(newColumnStates);
        }
      } else {
        // Agregar a los existentes
        setAllProspectos(prev => [...prev, ...enrichedProspectos]);
        setProspectos(prev => [...prev, ...enrichedProspectos]);
        setCurrentPage(prev => prev + 1);
        
        // Actualizar estados de columnas para Kanban cuando se cargan más datos
        if (viewType === 'kanban') {
          setColumnLoadingStates(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(etapa => {
              updated[etapa] = {
                ...updated[etapa],
                hasMore: hasMore // Actualizar hasMore para todas las columnas
              };
            });
            return updated;
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error loading prospectos:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingProspectosRef.current = false;
    }
  };

  // ✅ CARGA INICIAL EN BATCH: Cargar todas las columnas en paralelo y actualizar estado una sola vez
  const loadAllColumnsInitial = async (etapaIds: string[]) => {
    if (etapaIds.length === 0) return;
    
    console.log(`🚀 Carga inicial en batch para ${etapaIds.length} columnas`);
    
    // Marcar todas como cargando
    setColumnLoadingStates(prev => {
      const updated = { ...prev };
      etapaIds.forEach(etapaId => {
        if (updated[etapaId]) {
          updated[etapaId] = { ...updated[etapaId], loading: true };
        }
      });
      return updated;
    });
    
    try {
      const COLUMN_BATCH_SIZE = 100;
      
      // Crear todas las queries en paralelo
      const queries = etapaIds.map(async (etapaId) => {
        try {
          let query = analysisSupabase
            .from('prospectos_con_ejecutivo_y_coordinacion')
            .select('*', { count: 'exact' })
            .eq('etapa_id', etapaId)
            .range(0, COLUMN_BATCH_SIZE - 1)
            .order('created_at', { ascending: false });
          
          // Aplicar filtros de permisos
          if (queryUserId) {
            try {
              const filteredQuery = await permissionsService.applyProspectFilters(query, queryUserId);
              if (filteredQuery && typeof filteredQuery === 'object' && typeof filteredQuery.order === 'function') {
                query = filteredQuery;
              }
            } catch {
              // Continuar con query original
            }
          }
          
          const { data, error, count } = await query;
          
          if (error) {
            console.error(`❌ Error en columna ${etapaId}:`, error);
            return { etapaId, data: [], count: 0, error: true };
          }
          
          return { etapaId, data: data || [], count: count || 0, error: false };
        } catch (error) {
          console.error(`❌ Error en columna ${etapaId}:`, error);
          return { etapaId, data: [], count: 0, error: true };
        }
      });
      
      // Esperar a TODAS las queries
      const results = await Promise.all(queries);
      
      // Combinar todos los prospectos nuevos
      const allNewProspectos: Prospecto[] = [];
      const newColumnStates: Record<string, { loading: boolean; page: number; hasMore: boolean }> = {};
      
      results.forEach(({ etapaId, data, count, error }) => {
        if (!error && data.length > 0) {
          allNewProspectos.push(...data);
        }
        
        const hasMore = count ? data.length < count : data.length === COLUMN_BATCH_SIZE;
        newColumnStates[etapaId] = {
          loading: false,
          page: 0,
          hasMore
        };
        
        console.log(`✅ Columna ${etapaId} cargada:`, {
          nuevos: data.length,
          totalEnBD: count,
          hasMore
        });
      });
      
      // ✅ ACTUALIZAR ESTADO UNA SOLA VEZ (evita múltiples re-renders)
      setAllProspectos(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNew = allNewProspectos.filter(p => !existingIds.has(p.id));
        return [...prev, ...uniqueNew];
      });
      
      setColumnLoadingStates(prev => ({
        ...prev,
        ...newColumnStates
      }));
      
      console.log(`✅ Carga inicial completada: ${allNewProspectos.length} prospectos de ${etapaIds.length} columnas`);
      
    } catch (error) {
      console.error('❌ Error en loadAllColumnsInitial:', error);
      // Resetear estados de loading
      setColumnLoadingStates(prev => {
        const updated = { ...prev };
        etapaIds.forEach(etapaId => {
          if (updated[etapaId]) {
            updated[etapaId] = { ...updated[etapaId], loading: false };
          }
        });
        return updated;
      });
    }
  };

  // Función para cargar más prospectos de una columna específica (Kanban)
  // Implementa infinite scrolling para Kanban también
  const loadMoreProspectosForColumn = async (etapaId: string) => {
    // Verificar que no se está cargando ya
    const currentState = columnLoadingStates[etapaId];
    if (!currentState || currentState.loading || !currentState.hasMore) {
      return;
    }

    // Marcar como cargando
    setColumnLoadingStates(prev => ({
      ...prev,
      [etapaId]: { ...prev[etapaId], loading: true }
    }));

    try {
      const COLUMN_BATCH_SIZE = 100; // 100 prospectos por columna
      const currentPage = currentState.page + 1;
      const from = currentPage * COLUMN_BATCH_SIZE;
      const to = from + COLUMN_BATCH_SIZE - 1;

      console.log(`🔄 Cargando más prospectos para columna ${etapaId}:`, {
        page: currentPage,
        from,
        to,
        batchSize: COLUMN_BATCH_SIZE
      });

      // ✅ USAR VISTA OPTIMIZADA (elimina 3 queries + enrichment)
      let query = analysisSupabase
        .from('prospectos_con_ejecutivo_y_coordinacion')  // ← Vista con JOINs
        .select('*', { count: 'exact' })
        .eq('etapa_id', etapaId)
        .range(from, to)
        .order('created_at', { ascending: false });

      // Aplicar filtros de permisos si es necesario
      if (queryUserId) {
        try {
          const filteredQuery = await permissionsService.applyProspectFilters(query, queryUserId);
          if (filteredQuery && typeof filteredQuery === 'object' && typeof filteredQuery.order === 'function') {
            query = filteredQuery;
          }
        } catch {
          // Continuar con query original
        }
      }

      const { data, error, count } = await query;

      if (error) {
        // Error 416: Range Not Satisfiable - No hay más datos
        if (error.code === 'PGRST103') {
          console.log(`ℹ️ No hay más datos para columna ${etapaId} (OFFSET fuera de rango)`);
          setColumnLoadingStates(prev => ({
            ...prev,
            [etapaId]: {
              loading: false,
              page: currentPage,
              hasMore: false
            }
          }));
          return;
        }

        console.error(`❌ Error cargando columna ${etapaId}:`, error);
        setColumnLoadingStates(prev => ({
          ...prev,
          [etapaId]: { ...prev[etapaId], loading: false }
        }));
        return;
      }

      if (data && data.length > 0) {
        // ✅ NO NECESITA ENRICHMENT - La vista ya trae todo enriquecido
        // Solo agregar a allProspectos (evitando duplicados)
        setAllProspectos(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newProspectos = data.filter((p: Prospecto) => !existingIds.has(p.id));
          return [...prev, ...newProspectos];
        });

        // Actualizar estado de la columna
        // Calcular si hay más datos: 
        // 1. Si count existe, verificar si quedan más registros (from + data.length < count)
        // 2. Si no existe count, verificar si se cargó el batch completo
        const totalCargados = from + data.length;
        const hasMore = count ? totalCargados < count : data.length === COLUMN_BATCH_SIZE;
        
        setColumnLoadingStates(prev => ({
          ...prev,
          [etapaId]: {
            loading: false,
            page: currentPage,
            hasMore
          }
        }));

        console.log(`✅ Columna ${etapaId} cargada:`, {
          nuevos: data.length,
          totalCargados,
          totalEnBD: count || 'desconocido',
          hasMore
        });
      } else {
        // No hay más datos
        setColumnLoadingStates(prev => ({
          ...prev,
          [etapaId]: {
            loading: false,
            page: currentPage,
            hasMore: false
          }
        }));
      }
    } catch (error) {
      console.error(`❌ Error en loadMoreProspectosForColumn:`, error);
      setColumnLoadingStates(prev => ({
        ...prev,
        [etapaId]: { ...prev[etapaId], loading: false }
      }));
    }
  };

  // Cargar más prospectos cuando se hace scroll (infinite scrolling)
  const loadMoreProspectos = () => {
    if (!loadingMore && hasMore && !isLoadingProspectosRef.current) {
      setLoadingMore(true);
      loadProspectos(false); // No reset, agregar a los existentes
    }
  };

  // Filtrar y ordenar prospectos (usar allProspectos para filtros o serverSearchResults si hay búsqueda)
  const filteredAndSortedProspectos = useMemo(() => {
    // ============================================
    // PRIORIDAD DE FUENTE DE DATOS:
    // 1. Si hay búsqueda activa Y resultados del servidor → usar resultados del servidor
    // 2. Si hay búsqueda pero sin resultados del servidor → buscar en memoria (prospectos cargados)
    // 3. Sin búsqueda → usar todos los prospectos cargados
    // ============================================
    
    let filtered: Prospecto[];
    
    // Si hay búsqueda de 3+ caracteres y tenemos resultados del servidor, usarlos como base
    if (filters.search.trim().length >= 3 && serverSearchResults !== null) {
      // Usar resultados del servidor directamente
      // Ya vienen filtrados por permisos y coincidencia de búsqueda
      filtered = serverSearchResults;
      
      // Aplicar filtros adicionales en memoria (etapa, coordinación, etc.)
      // pero NO volver a filtrar por búsqueda (ya está aplicada en servidor)
    } else {
      // Búsqueda corta o sin resultados del servidor: filtrar en memoria
      filtered = allProspectos;
      
      if (filters.search) {
        // Normalizar búsqueda (sin acentos, minúsculas)
        const searchNormalized = normalizeForSearch(filters.search);
        const searchDigits = normalizePhoneForSearch(filters.search);
        
        filtered = filtered.filter(p => {
          // Búsqueda por nombre del prospecto (normalizada, ignora acentos)
          const matchName = 
            normalizeForSearch(p.nombre_completo).includes(searchNormalized) ||
            normalizeForSearch(p.nombre).includes(searchNormalized) ||
            normalizeForSearch(p.apellido_paterno).includes(searchNormalized) ||
            normalizeForSearch(p.apellido_materno).includes(searchNormalized) ||
            normalizeForSearch(p.nombre_whatsapp).includes(searchNormalized);
          
          // Búsqueda por email (case insensitive, pero exacta)
          const matchEmail = p.email?.toLowerCase().includes(filters.search.toLowerCase());
          
          // Búsqueda por teléfono (solo dígitos para flexibilidad)
          const matchPhone = searchDigits.length >= 4 && (
            normalizePhoneForSearch(p.whatsapp).includes(searchDigits) ||
            normalizePhoneForSearch(p.telefono_principal).includes(searchDigits)
          );
          
          // Búsqueda por ejecutivo asignado (normalizada)
          const matchEjecutivo = normalizeForSearch(p.ejecutivo_nombre).includes(searchNormalized);
          
          // Búsqueda por coordinación (normalizada)
          const matchCoordinacion = 
            normalizeForSearch(p.coordinacion_codigo).includes(searchNormalized) ||
            normalizeForSearch(p.coordinacion_nombre).includes(searchNormalized);
          
          return matchName || matchEmail || matchPhone || matchEjecutivo || matchCoordinacion;
        });
      }
    }

    if (filters.etapa_id) {
      filtered = filtered.filter(p => p.etapa_id === filters.etapa_id);
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
  }, [allProspectos, filters, sort, serverSearchResults]);

  // Infinite Scroll para DataGrid - cargar más prospectos cuando se hace scroll
  useEffect(() => {
    if (viewType !== 'datagrid' || !hasMore || loading || loadingMore) {
      return;
    }

    const scrollContainer = scrollObserverRef.current;
    const sentinel = sentinelRef.current;
    
    if (!scrollContainer || !sentinel) {
      return;
    }

    // Función para verificar si debemos cargar más
    const checkShouldLoad = () => {
      const containerHeight = scrollContainer.clientHeight;
      const scrollTop = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight;
      
      // Calcular porcentaje de scroll (0 = inicio, 100 = final)
      const scrollPercentage = (scrollTop + containerHeight) / scrollHeight * 100;
      
      // Cargar cuando el usuario está al 75% del scroll (25% antes del final)
      if (scrollPercentage >= 75 && hasMore && !loadingMore && !isLoadingProspectosRef.current) {
        loadMoreProspectos();
      }
    };

    // Escuchar eventos de scroll
    scrollContainer.addEventListener('scroll', checkShouldLoad);
    
    // También verificar inmediatamente por si el contenido es pequeño
    checkShouldLoad();

    return () => {
      scrollContainer.removeEventListener('scroll', checkShouldLoad);
    };
  }, [viewType, hasMore, loading, loadingMore, allProspectos.length]);

  // Emitir evento para actualizar contador en el header
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('prospect-count-update', {
      detail: {
        filtered: filteredAndSortedProspectos.length,
        total: totalCount > 0 ? totalCount : allProspectos.length,
        loaded: allProspectos.length, // Prospectos cargados actualmente
        hasMore: hasMore // Si hay más prospectos por cargar
      }
    }));
  }, [filteredAndSortedProspectos.length, totalCount, allProspectos.length, hasMore]);

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

  // Manejar visibilidad de columnas en Kanban
  const handleToggleColumnVisibility = (columnId: string) => {
    const newHidden = prospectsViewPreferencesService.toggleColumnVisibility(user?.id || null, columnId);
    setHiddenColumns(newHidden);
  };

  // Definir todas las columnas disponibles del Kanban (dinámico desde etapasService)
  const kanbanColumns = useMemo(() => {
    const etapas = etapasService.getAllActive();
    return etapas.map(etapa => ({
      id: `checkpoint-${etapa.codigo}`,
      label: etapa.nombre
    }));
  }, []);

  // Estado para mostrar/ocultar el dropdown de filtrado
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const columnFilterRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnFilterRef.current && !columnFilterRef.current.contains(event.target as Node)) {
        setShowColumnFilter(false);
      }
    };

    if (showColumnFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnFilter]);

  const getUniqueValues = (field: keyof Prospecto) => {
    return [...new Set(prospectos.map(p => p[field]).filter(Boolean))];
  };

  /**
   * Obtener color de etapa desde servicio (migración 2026-01-26)
   * @deprecated Usar componente EtapaBadge directamente
   */
  const getStatusColor = (etapaIdOrNombre: string | undefined) => {
    if (!etapaIdOrNombre) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    
    const color = etapasService.getColor(etapaIdOrNombre);
    // Convertir hex a clases Tailwind (aproximación)
    return `bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`;
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
    <div className="h-full flex flex-col">
      {/* Pestañas principales - solo visible para admin/admin_operativo/coordinador_calidad */}
      {(isAdmin || isAdminOperativo || isCoordinadorCalidad) && (
        <div className="flex-shrink-0 px-6 pt-4 pb-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('prospectos')}
              className={`relative px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === 'prospectos'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-t border-l border-r border-gray-200 dark:border-gray-700 -mb-px'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>Prospectos</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('reassignment')}
              className={`relative px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === 'reassignment'
                  ? 'bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 border-t border-l border-r border-gray-200 dark:border-gray-700 -mb-px'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Shuffle size={16} />
                <span>Reasignación Masiva</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`relative px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === 'import'
                  ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 border-t border-l border-r border-gray-200 dark:border-gray-700 -mb-px'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Phone size={16} />
                <span>Importación</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Contenido según pestaña activa */}
      {activeTab === 'reassignment' && (isAdmin || isAdminOperativo || isCoordinadorCalidad) ? (
        <div className="flex-1 overflow-hidden">
          <BulkReassignmentTab />
        </div>
      ) : activeTab === 'import' && (isAdmin || isAdminOperativo || isCoordinadorCalidad) ? (
        <div className="flex-1 overflow-hidden">
          <ManualImportTab />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
      {/* Toolbar de filtros unificado */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/80 dark:border-gray-700/80 px-3 py-2.5"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Búsqueda */}
          <div className="relative min-w-[120px] max-w-[200px] flex-shrink">
            {isSearchingServer ? (
              <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={14} />
            ) : (
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            )}
            <input
              type="text"
              placeholder="Buscar nombre, teléfono, ejecutivo..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className={`w-full h-8 pl-8 pr-3 rounded-lg text-xs transition-all ${
                serverSearchResults !== null && filters.search.length >= 3
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-600 text-blue-900 dark:text-blue-100 placeholder-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700/50 border border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-400 dark:focus:border-blue-500'
              } focus:ring-1 focus:ring-blue-500 outline-none`}
            />
            {serverSearchResults !== null && filters.search.length >= 3 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                {serverSearchResults.length} en BD
              </span>
            )}
          </div>

          {/* Separador visual */}
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0 hidden sm:block" />

          {/* Filtros inline */}
          <select
            value={filters.etapa_id}
            onChange={(e) => setFilters(prev => ({ ...prev, etapa_id: e.target.value }))}
            className={`h-8 px-2 rounded-lg text-xs outline-none cursor-pointer transition-all min-w-0 ${
              filters.etapa_id
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-transparent hover:bg-gray-150 dark:hover:bg-gray-600/50'
            }`}
          >
            <option value="">Etapa</option>
            {etapasService.getAllActive().map(etapa => (
              <option key={etapa.id} value={etapa.id}>{etapa.nombre}</option>
            ))}
          </select>

          <select
            value={filters.coordinacion_id}
            onChange={(e) => {
              setFilters(prev => ({
                ...prev,
                coordinacion_id: e.target.value,
                ejecutivo_id: e.target.value ? prev.ejecutivo_id : ''
              }));
            }}
            className={`h-8 px-2 rounded-lg text-xs outline-none cursor-pointer transition-all min-w-0 ${
              filters.coordinacion_id
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-transparent hover:bg-gray-150 dark:hover:bg-gray-600/50'
            }`}
          >
            <option value="">Coordinación</option>
            {coordinacionesOptions.map(coord => (
              <option key={coord.id} value={coord.id}>{coord.codigo}</option>
            ))}
          </select>

          <select
            value={filters.ejecutivo_id}
            onChange={(e) => setFilters(prev => ({ ...prev, ejecutivo_id: e.target.value }))}
            className={`h-8 px-2 rounded-lg text-xs outline-none cursor-pointer transition-all min-w-0 ${
              filters.ejecutivo_id
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-transparent hover:bg-gray-150 dark:hover:bg-gray-600/50'
            }`}
          >
            <option value="">Ejecutivo</option>
            {ejecutivosOptions
              .filter(e => !filters.coordinacion_id || e.coordinacion_id === filters.coordinacion_id)
              .map(ejecutivo => (
                <option key={ejecutivo.id} value={ejecutivo.id}>{ejecutivo.full_name}</option>
              ))}
          </select>

          <select
            value={filters.asignacion}
            onChange={(e) => setFilters(prev => ({ ...prev, asignacion: e.target.value as 'todos' | 'asignados' | 'no_asignados' }))}
            className={`h-8 px-2 rounded-lg text-xs outline-none cursor-pointer transition-all min-w-0 ${
              filters.asignacion !== 'todos'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-transparent hover:bg-gray-150 dark:hover:bg-gray-600/50'
            }`}
          >
            <option value="todos">Asignación</option>
            <option value="asignados">Asignados</option>
            <option value="no_asignados">Sin asignar</option>
          </select>

          {/* Separador visual */}
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0 hidden sm:block" />

          {/* Acciones */}
          {(filters.etapa_id || filters.coordinacion_id || filters.ejecutivo_id || filters.asignacion !== 'todos' || filters.search) && (
            <button
              onClick={() => setFilters({ search: '', etapa_id: '', score: '', campana_origen: '', dateRange: '', coordinacion_id: '', ejecutivo_id: '', asignacion: 'todos' })}
              className="h-8 flex items-center gap-1 px-2 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0"
              title="Limpiar todos los filtros"
            >
              <Filter size={12} />
              <span>Limpiar</span>
            </button>
          )}

          {/* Filtro de columnas Kanban */}
          {viewType === 'kanban' && (
            <div className="relative flex-shrink-0" ref={columnFilterRef}>
              <button
                onClick={() => setShowColumnFilter(!showColumnFilter)}
                className={`h-8 flex items-center gap-1 px-2 rounded-lg text-xs transition-colors ${
                  hiddenColumns.length > 0
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 border border-transparent'
                }`}
                title="Filtrar columnas"
              >
                {hiddenColumns.length > 0 ? <EyeOff size={12} /> : <Eye size={12} />}
                <span className="hidden sm:inline">{hiddenColumns.length > 0 ? `${hiddenColumns.length} ocultas` : 'Columnas'}</span>
              </button>

              {/* Dropdown de filtrado */}
              <AnimatePresence>
                {showColumnFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 p-2"
                  >
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 px-2">
                      Mostrar/Ocultar Columnas
                    </div>
                    <div className="space-y-0.5 max-h-64 overflow-y-auto">
                      {kanbanColumns.map((column) => {
                        const isHidden = hiddenColumns.includes(column.id);
                        return (
                          <label
                            key={column.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={!isHidden}
                              onChange={() => handleToggleColumnVisibility(column.id)}
                              className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">
                              {column.label}
                            </span>
                            {isHidden && (
                              <EyeOff size={12} className="text-gray-400" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                    {hiddenColumns.length > 0 && (
                      <button
                        onClick={() => {
                          kanbanColumns.forEach(col => {
                            if (hiddenColumns.includes(col.id)) {
                              handleToggleColumnVisibility(col.id);
                            }
                          });
                        }}
                        className="mt-1.5 w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        Mostrar todas
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Botón de reasignación masiva */}
          {(isAdmin || isAdminOperativo || isCoordinadorCalidad) && viewType === 'datagrid' && selectedProspectIds.size > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setShowBulkAssignmentModal(true)}
              className="h-8 flex items-center gap-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm flex-shrink-0"
            >
              <Users size={12} />
              <span>Reasignar {selectedProspectIds.size}</span>
            </motion.button>
          )}

          {/* Toggle de Vista */}
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-0.5 h-8 flex-shrink-0 ml-auto">
            <button
              onClick={() => handleViewTypeChange('datagrid')}
              className={`h-full flex items-center px-2 rounded-md transition-all duration-200 ${
                viewType === 'datagrid'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title="Vista de tabla"
            >
              <Table2 size={14} />
            </button>
            <button
              onClick={() => handleViewTypeChange('kanban')}
              className={`h-full flex items-center px-2 rounded-md transition-all duration-200 ${
                viewType === 'kanban'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title="Vista Kanban"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>

        {/* Indicador contextual: solo visible cuando hay filtros activos */}
        {(filteredAndSortedProspectos.length < allProspectos.length || (serverSearchResults !== null && filters.search.length >= 3)) && (
          <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700/50">
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {serverSearchResults !== null && filters.search.length >= 3
                ? `${serverSearchResults.length} encontrados en toda la BD`
                : `${filteredAndSortedProspectos.length.toLocaleString()} de ${(totalCount > 0 ? totalCount : allProspectos.length).toLocaleString()} prospectos`
              }
            </span>
          </div>
        )}
      </motion.div>

      {/* Vista según preferencia */}
      {viewType === 'kanban' ? (
        /* Vista Kanban */
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col p-4 md:p-6 scrollbar-hide"
          style={{ 
            height: 'calc(100vh - 280px)', 
            maxHeight: 'calc(100vh - 280px)',
            width: '100%',
            maxWidth: '100%'
          }}
        >
          <ProspectosKanban
            prospectos={filteredAndSortedProspectos}
            onProspectoClick={handleProspectoClick}
            onProspectoContextMenu={(e, prospecto) => {
              if (isCoordinador || isAdmin || isAdminOperativo) {
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
            hiddenColumns={hiddenColumns}
            onToggleColumnCollapse={handleToggleColumnCollapse}
            getStatusColor={getStatusColor}
            getScoreColor={getScoreColor}
            onLoadMoreForColumn={loadMoreProspectosForColumn}
            onLoadAllColumnsInitial={loadAllColumnsInitial}
            columnLoadingStates={columnLoadingStates}
            etapaTotals={etapaTotals}
          />
          
          {/* Infinite Scroll ya no es necesario - todos los prospectos están cargados */}
        </motion.div>
      ) : (
        /* Data Grid */
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col"
          style={{ height: 'calc(100vh - 280px)', maxHeight: 'calc(100vh - 280px)' }}
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
                    <EtapaBadge prospecto={prospecto} size="sm" />
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

          {/* Vista desktop/tablet: Tabla con scroll horizontal y vertical */}
          <div 
            ref={scrollObserverRef}
            className="block overflow-x-auto overflow-y-auto flex-1 scrollbar-hide"
            style={{ maxHeight: '100%' }}
          >
            <table className="w-full min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {/* Checkbox de selección múltiple (admin, admin operativo y coordinadores de Calidad) */}
                  {(isAdmin || isAdminOperativo || isCoordinadorCalidad) && (
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
                        if (isCoordinador || isAdmin || isAdminOperativo) {
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
                      {(isAdmin || isAdminOperativo || isCoordinadorCalidad) && (
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
                        <EtapaBadge prospecto={prospecto} size="sm" />
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
            
            {/* Elemento sentinel para infinite scrolling */}
            {viewType === 'datagrid' && (
              <div 
                ref={sentinelRef}
                className="h-20 flex items-center justify-center py-4"
              >
                {loadingMore && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cargando más prospectos...</span>
                  </div>
                )}
                {!hasMore && allProspectos.length > 0 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
                    Todos los prospectos cargados ({allProspectos.length} de {totalCount > 0 ? totalCount : allProspectos.length})
                  </div>
                )}
              </div>
            )}
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
        </div>
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
          onAssignmentComplete={(newEjecutivoId?: string, newEjecutivoName?: string, ejecutivoData?: {
            coordinacion_id?: string;
            coordinacion_codigo?: string;
            coordinacion_nombre?: string;
            ejecutivo_email?: string;
          }) => {
            // Si hay nuevo ejecutivo, actualizar silenciosamente
            if (newEjecutivoId && assignmentContextMenu.prospectId) {
              const updateProspecto = (prospecto: Prospecto) => {
                if (prospecto.id === assignmentContextMenu.prospectId) {
                  return {
                    ...prospecto,
                    ejecutivo_id: newEjecutivoId,
                    ejecutivo_nombre: newEjecutivoName || prospecto.ejecutivo_nombre,
                    ejecutivo_email: ejecutivoData?.ejecutivo_email || prospecto.ejecutivo_email,
                    asesor_asignado: newEjecutivoName || prospecto.asesor_asignado,
                    coordinacion_id: ejecutivoData?.coordinacion_id || prospecto.coordinacion_id,
                    coordinacion_codigo: ejecutivoData?.coordinacion_codigo || prospecto.coordinacion_codigo,
                    coordinacion_nombre: ejecutivoData?.coordinacion_nombre || prospecto.coordinacion_nombre,
                  };
                }
                return prospecto;
              };
              
              setProspectos(prev => prev.map(updateProspecto));
              setAllProspectos(prev => prev.map(updateProspecto));
              
              // También actualizar el prospecto seleccionado si está abierto
              if (selectedProspecto?.id === assignmentContextMenu.prospectId) {
                setSelectedProspecto(prev => prev ? updateProspecto(prev) : prev);
              }
            } else if (!newEjecutivoId && assignmentContextMenu.prospectId) {
              // Desasignación: actualizar silenciosamente removiendo el ejecutivo
              const updateProspecto = (prospecto: Prospecto) => {
                if (prospecto.id === assignmentContextMenu.prospectId) {
                  return {
                    ...prospecto,
                    ejecutivo_id: undefined,
                    ejecutivo_nombre: undefined,
                    ejecutivo_email: undefined,
                    asesor_asignado: undefined,
                  };
                }
                return prospecto;
              };
              
              setProspectos(prev => prev.map(updateProspecto));
              setAllProspectos(prev => prev.map(updateProspecto));
              
              if (selectedProspecto?.id === assignmentContextMenu.prospectId) {
                setSelectedProspecto(prev => prev ? updateProspecto(prev) : prev);
              }
            }
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
