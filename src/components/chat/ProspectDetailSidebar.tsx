// Golden Rules:
// 📚 Documentación: Ver src/components/chat/README.md para arquitectura del módulo Live Chat
// 📝 Cambios: Documentar en src/components/chat/CHANGELOG_LIVECHAT.md
// 📋 Verificación: Revisar CHANGELOG antes de modificar

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Star,
  AlertTriangle,
  FileText,
  Heart,
  Users,
  MessageSquare,
  PhoneCall,
  Clock,
  CheckCircle,
  XCircle,
  PhoneMissed,
} from 'lucide-react';
import { analysisSupabase } from '../../config/analysisSupabase';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
import { CallDetailModalSidebar } from './CallDetailModalSidebar';
import { createPortal } from 'react-dom';
import { AssignmentBadge } from '../analysis/AssignmentBadge';
import { coordinacionService } from '../../services/coordinacionService';
import { ScheduledCallsSection } from '../shared/ScheduledCallsSection';
import { Avatar } from '../shared/Avatar';
import toast from 'react-hot-toast';

interface CallHistory {
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
  audio_ruta_bucket?: string | null;
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
  type: 'call' | 'message' | 'created' | 'updated' | 'scheduled_call';
  date: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  callId?: string; // Para identificar llamadas y abrir el modal
  scheduledCallId?: string; // Para identificar llamadas programadas
  isPast?: boolean; // Si la llamada programada ya pasó
  hasRecording?: boolean; // Si la llamada tiene grabación
  callStatus?: string; // Estado de la llamada
}


interface ProspectData {
  id: string;
  nombre?: string;
  nombre_whatsapp?: string;
  whatsapp?: string;
  email?: string;
  telefono_principal?: string;
  edad?: number;
  estado_civil?: string;
  ciudad_residencia?: string;
  cumpleanos?: string;
  nombre_conyuge?: string;
  campana_origen?: string;
  etapa?: string;
  score?: string;
  ingresos?: string;
  interes_principal?: string;
  asesor_asignado?: string;
  requiere_atencion_humana?: boolean;
  motivo_handoff?: string | null;
  destino_preferencia?: string[];
  tamano_grupo?: number;
  cantidad_menores?: number;
  viaja_con?: string;
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
  coordinacion_id?: string;
  ejecutivo_id?: string;
  coordinacion_codigo?: string;
  coordinacion_nombre?: string;
  ejecutivo_nombre?: string;
  ejecutivo_email?: string;
}

interface ProspectDetailSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  prospectoId: string;
}

export const ProspectDetailSidebar: React.FC<ProspectDetailSidebarProps> = ({
  isOpen,
  onClose,
  prospectoId
}) => {
  
  const [prospecto, setProspecto] = useState<ProspectData | null>(null);
  const [callHistory, setCallHistory] = useState<CallHistory[]>([]);
  const [whatsappConversations, setWhatsappConversations] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [scheduledCalls, setScheduledCalls] = useState<any[]>([]);
  
  // Nota: loadingCalls se usa en el componente pero el linter no lo detecta correctamente
  
  // Estados para el modal de detalle de llamada
  const [callDetailModalOpen, setCallDetailModalOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);


  useEffect(() => {
    if (isOpen && prospectoId) {
      // Resetear estados al abrir
      setProspecto(null);
      setCallHistory([]);
      setWhatsappConversations([]);
      setScheduledCalls([]);
      setLoading(true);
      setLoadingCalls(true);
      setLoadingConversations(true);
      
      // Cargar datos frescos
      loadProspectData();
      loadCallHistory();
      loadWhatsAppConversations();
      loadScheduledCalls();
    }
  }, [isOpen, prospectoId]);

  const loadProspectData = async () => {
    setLoading(true);
    try {
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .eq('id', prospectoId)
        .single();

      if (error) throw error;

      // Enriquecer con datos de coordinación y ejecutivo
      let coordinacionInfo = null;
      let ejecutivoInfo = null;

      if (data.coordinacion_id) {
        try {
          coordinacionInfo = await coordinacionService.getCoordinacionById(data.coordinacion_id);
        } catch (error) {
          console.warn('Error obteniendo coordinación:', error);
        }
      }

      // Obtener ejecutivo: primero desde asesor_asignado (campo directo), luego desde ejecutivo_id
      let ejecutivoNombre: string | undefined = undefined;
      
      // 1. Intentar desde asesor_asignado (campo directo de prospectos)
      if (data.asesor_asignado && typeof data.asesor_asignado === 'string' && data.asesor_asignado.trim() !== '') {
        ejecutivoNombre = data.asesor_asignado.trim();
      }
      // 2. Si no hay asesor_asignado, intentar desde ejecutivo_id
      else if (data.ejecutivo_id) {
        try {
          ejecutivoInfo = await coordinacionService.getEjecutivoById(data.ejecutivo_id);
          if (ejecutivoInfo) {
            ejecutivoNombre = ejecutivoInfo.full_name || ejecutivoInfo.nombre_completo || ejecutivoInfo.nombre;
          }
        } catch (error) {
          console.warn('Error obteniendo ejecutivo:', error);
        }
      }


      setProspecto({
        ...data,
        coordinacion_codigo: coordinacionInfo?.codigo,
        coordinacion_nombre: coordinacionInfo?.nombre,
        ejecutivo_nombre: ejecutivoNombre,
        ejecutivo_email: ejecutivoInfo?.email
      });
    } catch (error) {
      console.error('Error cargando datos del prospecto:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCallHistory = async () => {
    setLoadingCalls(true);
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
          audio_ruta_bucket
        `)
        .eq('prospecto', prospectoId) // ✅ CORRECTO: La columna se llama 'prospecto', NO 'prospecto_id'
        .order('fecha_llamada', { ascending: false });

      if (error) {
        console.error('❌ Error cargando historial de llamadas:', error);
        throw error;
      }
      
      
      setCallHistory(data || []);
    } catch (error) {
      console.error('Error cargando historial de llamadas:', error);
    } finally {
      setLoadingCalls(false);
    }
  };

  const loadWhatsAppConversations = async () => {
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

  const loadScheduledCalls = async () => {
    try {
      const { data, error } = await analysisSupabase
        .from('llamadas_programadas')
        .select('*')
        .eq('prospecto', prospectoId)
        .order('fecha_programada', { ascending: false });

      if (error) {
        console.error('Error cargando llamadas programadas:', error);
        return;
      }

      setScheduledCalls(data || []);
    } catch (error) {
      console.error('Error cargando llamadas programadas:', error);
    }
  };

  const buildTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Agregar eventos de llamadas ejecutadas (clickeables solo si tienen grabación y están finalizadas)
    callHistory.forEach(call => {
      const hasRecording = !!(call.audio_ruta_bucket && call.audio_ruta_bucket.length > 0);
      events.push({
        id: `call-${call.call_id}`,
        type: 'call',
        date: call.fecha_llamada,
        title: `Llamada ${call.call_status}`,
        description: `${formatDuration(call.duracion_segundos)} • ${call.nivel_interes || 'Sin interés'}`,
        icon: <PhoneCall className="w-4 h-4 text-blue-500" />,
        callId: call.call_id, // Agregar callId para poder abrir el modal
        hasRecording: hasRecording,
        callStatus: call.call_status
      } as TimelineEvent & { callId?: string; hasRecording?: boolean; callStatus?: string });
    });

    // Agregar eventos de llamadas programadas (pasadas y futuras)
    scheduledCalls.forEach(scheduledCall => {
      const fechaProgramada = new Date(scheduledCall.fecha_programada);
      const ahora = new Date();
      const isPast = fechaProgramada < ahora;
      const fechaFormateada = fechaProgramada.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      events.push({
        id: `scheduled-${scheduledCall.id}`,
        type: 'scheduled_call',
        date: scheduledCall.fecha_programada,
        title: isPast ? 'Llamada programada (Ejecutada)' : 'Llamada programada',
        description: `${fechaFormateada} • ${scheduledCall.motivo || scheduledCall.justificacion_llamada || 'Sin motivo'}`,
        icon: isPast ? (
          <PhoneCall className="w-4 h-4 text-gray-500" />
        ) : (
          <Calendar className="w-4 h-4 text-purple-500" />
        ),
        scheduledCallId: scheduledCall.id,
        isPast
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


  const handleOpenCallDetail = (callId: string) => {
    setSelectedCallId(callId);
    setCallDetailModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Nuevo': 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
      'En Conversación': 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
      'Interesado': 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
      'Caliente': 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
      'Ganado': 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
      'Perdido': 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
      'Pausado': 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300',
    };
    return colors[status] || colors['Nuevo'];
  };

  const getScoreColor = (score: string) => {
    const colors: Record<string, string> = {
      'Alto': 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
      'Medio': 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
      'Bajo': 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
    };
    return colors[score] || colors['Bajo'];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallStatusIcon = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('completada') || statusLower.includes('completed') || statusLower.includes('finalizada')) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (statusLower.includes('fallida') || statusLower.includes('failed') || statusLower.includes('no contest')) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    } else if (statusLower.includes('perdida') || statusLower.includes('missed')) {
      return <PhoneMissed className="w-4 h-4 text-orange-500" />;
    }
    return <Phone className="w-4 h-4 text-gray-500" />;
  };

  const getCallStatusColor = (status: string): string => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('completada') || statusLower.includes('completed') || statusLower.includes('finalizada')) {
      return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
    } else if (statusLower.includes('fallida') || statusLower.includes('failed')) {
      return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300';
    } else if (statusLower.includes('perdida') || statusLower.includes('missed')) {
      return 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300';
    }
    return 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300';
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="prospect-sidebar-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 pointer-events-none"
        >
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto z-[180]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-screen w-3/5 bg-white dark:bg-gray-900 shadow-2xl z-[190] flex flex-col pointer-events-auto"
            style={{ top: 0, margin: 0, padding: 0, height: '100vh' }}
          >
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
              className="flex items-center justify-between p-6 border-b border-white/10 plasma-gradient-header relative"
            >
              <div className="flex items-center gap-4 relative z-10">
                <Avatar
                  name={prospecto?.nombre || prospecto?.nombre_whatsapp || 'Prospecto'}
                  size="2xl"
                  showIcon={false}
                  className="bg-white/20 backdrop-blur-sm shadow-lg"
                />
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {prospecto?.nombre_completo || prospecto?.nombre || prospecto?.nombre_whatsapp || 'Cargando...'}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {prospecto?.id && (
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
                    {prospecto?.ciudad_residencia && (
                      <>
                        {prospecto?.id && <span className="text-white/50">•</span>}
                        <p className="text-sm text-white/80">
                          {prospecto.ciudad_residencia}
                        </p>
                      </>
                    )}
                    {!prospecto?.id && !prospecto?.ciudad_residencia && (
                      <p className="text-sm text-white/80">
                        Información del Prospecto
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 relative z-10">
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
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Cargando información...</p>
                </div>
              </div>
            ) : prospecto ? (
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
                {(prospecto.coordinacion_codigo || prospecto.ejecutivo_nombre || prospecto.asesor_asignado) && (
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
                        ejecutivo_nombre: prospecto.ejecutivo_nombre || prospecto.asesor_asignado,
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
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            <Users className="w-3 h-3 inline mr-1" />
                            Tamaño Grupo
                          </label>
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
                  prospectoId={prospectoId}
                  prospectoNombre={prospecto?.nombre || prospecto?.nombre_whatsapp}
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
                        const isCall = event.type === 'call' && (event as TimelineEvent & { callId?: string }).callId;
                        const isScheduledCall = event.type === 'scheduled_call';
                        const isPastScheduled = (event as TimelineEvent & { isPast?: boolean }).isPast;
                        return (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (isCall) {
                                const callEvent = event as TimelineEvent & { callId?: string; hasRecording?: boolean; callStatus?: string };
                                // Abrir modal si tiene callId (siempre que sea una llamada ejecutada)
                                if (callEvent.callId) {
                                  handleOpenCallDetail(callEvent.callId);
                                } else {
                                  console.warn('⚠️ [ProspectDetailSidebar] Llamada sin callId:', callEvent);
                                }
                              }
                            }}
                            className={`flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg border ${
                              isCall 
                                ? (() => {
                                    const callEvent = event as TimelineEvent & { callId?: string };
                                    // Todas las llamadas son clickeables si tienen callId
                                    return callEvent.callId
                                      ? 'border-blue-200 dark:border-blue-700 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all'
                                      : 'border-gray-200 dark:border-gray-600 cursor-default';
                                  })()
                                : isScheduledCall
                                  ? isPastScheduled
                                    ? 'border-gray-200 dark:border-gray-600'
                                    : 'border-purple-200 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10'
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
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No se pudo cargar la información del prospecto</p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Sidebar de Detalle de Llamada - Fuera del AnimatePresence para funcionar independientemente */}
    {/* 
      ============================================
      SIDEBAR DE DETALLE DE LLAMADA
      ============================================
      Z-INDEX: z-[240] (backdrop) / z-[250] (sidebar)
      - Configurado para aparecer ENCIMA del ProspectDetailSidebar (z-[190])
      - Comportamiento: CallDetailModalSidebar > ProspectDetailSidebar
      - Renderizado siempre con portal para evitar problemas de montaje
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
        allCallsWithAnalysis={callHistory.map(c => ({ ...c, prospecto_completo: prospecto }))}
        onProspectClick={(prospectId) => {
          // Ya estamos en el sidebar del prospecto, no hacer nada
        }}
        onCallChange={(newCallId) => {
          setSelectedCallId(newCallId);
          // El sidebar ya está abierto, solo cambiar el callId
        }}
        zIndexBackdrop="z-[240]"
        zIndexSidebar="z-[250]"
      />,
      document.body
    )}
  </>
  );
};

