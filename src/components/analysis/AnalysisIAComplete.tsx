/**
 * ============================================
 * COMPONENTE PRINCIPAL DE ANÁLISIS IA - MÓDULO ANÁLISIS IA
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/analysis/README_ANALISIS_IA.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/analysis/README_ANALISIS_IA.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/analysis/CHANGELOG_ANALISIS_IA.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Search, Filter, Calendar, BarChart3, TrendingUp,
  Phone, User, Clock, Star, MessageSquare, Volume2,
  X, ChevronRight, Play, Pause, Download, Eye,
  CheckCircle, AlertTriangle, FileText, Activity, DollarSign,
  Square, PhoneCall, MapPin, Heart, Users, Mail
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNinjaAwarePermissions } from '../../hooks/useNinjaAwarePermissions';
import { permissionsService } from '../../services/permissionsService';
import { analysisSupabase } from '../../config/analysisSupabase';
import Chart from 'chart.js/auto';
// import DetailedCallView from './DetailedCallView'; // Comentado por incompatibilidad
import { motion, AnimatePresence } from 'framer-motion';
import { convertUTCToMexicoTime } from '../../utils/timezoneHelper';

// Importar el sidebar original del módulo Prospectos
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
import { ScheduledCallsSection } from '../shared/ScheduledCallsSection';
import { AssignmentBadge } from './AssignmentBadge';
import { ProspectoEtapaAsignacion } from '../shared/ProspectoEtapaAsignacion';
import { coordinacionService } from '../../services/coordinacionService';
import { classifyCallStatus, CALL_STATUS_CONFIG, type CallStatusGranular } from '../../services/callStatusClassifier';

// Sidebar del Prospecto - VERSIÓN COMPLETA como en ProspectosManager
interface ProspectoSidebarProps {
  prospecto: any;
  isOpen: boolean;
  onClose: () => void;
}

const ProspectoSidebar: React.FC<ProspectoSidebarProps> = ({ prospecto, isOpen, onClose }) => {
  const [hasActiveChat, setHasActiveChat] = useState(false);
  const [llamadas, setLlamadas] = useState<any[]>([]);
  const [whatsappConversations, setWhatsappConversations] = useState<any[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [coordinacionInfo, setCoordinacionInfo] = useState<any>(null);
  const [ejecutivoInfo, setEjecutivoInfo] = useState<any>(null);

  // Verificar si hay conversación activa y cargar llamadas
  useEffect(() => {
    if (isOpen && prospecto?.id) {
      // Resetear estados al abrir
      setHasActiveChat(false);
      setLlamadas([]);
      setWhatsappConversations([]);
      setLoadingConversations(false);
      setCoordinacionInfo(null);
      setEjecutivoInfo(null);
      
      // Cargar datos frescos
      checkActiveChat(prospecto.id);
      loadLlamadasProspecto(prospecto.id);
      loadWhatsAppConversations(prospecto.id);
      loadCoordinacionInfo();
    }
  }, [isOpen, prospecto]);

  const loadCoordinacionInfo = async () => {
    try {
      if (prospecto?.coordinacion_id) {
        const coordinacion = await coordinacionService.getCoordinacionById(prospecto.coordinacion_id);
        setCoordinacionInfo(coordinacion);
      }
      if (prospecto?.ejecutivo_id) {
        const ejecutivo = await coordinacionService.getEjecutivoById(prospecto.ejecutivo_id);
        setEjecutivoInfo(ejecutivo);
      }
    } catch (error) {
      console.error('Error loading coordinacion info:', error);
    }
  };

  const loadWhatsAppConversations = async (prospectoId: string) => {
    setLoadingConversations(true);
    try {
      let conversations: any[] = [];

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

  const buildTimelineEvents = (): any[] => {
    const events: any[] = [];

    // Agregar eventos de llamadas (clickeables)
    llamadas.forEach(call => {
      events.push({
        id: `call-${call.call_id}`,
        type: 'call',
        date: call.fecha_llamada,
        title: `Llamada ${call.call_status}`,
        description: `${formatDuration(call.duracion_segundos || 0)} • ${call.nivel_interes || 'Sin interés'}`,
        icon: <PhoneCall className="w-4 h-4 text-blue-500" />,
        callId: call.call_id
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

      // Usar clasificador centralizado para determinar el estado correcto de cada llamada
      const llamadasClasificadas = (data || []).map(llamada => {
        const statusClasificado = classifyCallStatus({
          call_id: llamada.call_id,
          call_status: llamada.call_status,
          fecha_llamada: llamada.fecha_llamada,
          duracion_segundos: llamada.duracion_segundos,
          audio_ruta_bucket: llamada.audio_ruta_bucket,
          monitor_url: llamada.monitor_url,
          datos_llamada: llamada.datos_llamada
        });
        
        return {
          ...llamada,
          call_status: statusClasificado
        };
      });

      setLlamadas(llamadasClasificadas);
    } catch (error) {
      console.error('Error loading llamadas:', error);
    }
  };

  const checkActiveChat = async (prospectoId: string) => {
    try {
      // Verificar conversación activa usando los mismos métodos que ProspectosManager
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
      
      setHasActiveChat(hasActiveByProspectId || hasActiveByPhone);
    } catch (error) {
      console.error('Error checking active chat:', error);
      setHasActiveChat(false);
    }
  };

  if (!prospecto) return null;

  const getStatusColor = (etapa: string) => {
    switch (etapa?.toLowerCase()) {
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed right-0 top-0 h-full w-[540px] bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex flex-col h-full">
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
                  <button 
                    onClick={() => {
                      if (hasActiveChat) {
                        window.dispatchEvent(new CustomEvent('navigate-to-livechat', { detail: prospecto.id }));
                      }
                    }}
                    disabled={!hasActiveChat}
                    className={`p-2 rounded-full transition-colors shadow-lg ${
                      hasActiveChat 
                        ? 'bg-white/40 hover:bg-white/50 text-white cursor-pointer hover:scale-110 active:scale-95 backdrop-blur-sm border border-white/30' 
                        : 'bg-white/25 text-white/60 cursor-not-allowed opacity-60 backdrop-blur-sm border border-white/20'
                    }`}
                    title={hasActiveChat ? "Ir a conversación activa" : "No hay conversación activa"}
                  >
                    <MessageSquare size={20} />
                  </button>
                  <button 
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X size={24} className="text-white" />
                  </button>
                </div>
              </motion.div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Etapa Destacada y Asignación - Componente Centralizado */}
                <ProspectoEtapaAsignacion 
                  prospecto={{
                    etapa: prospecto.etapa,
                    score: prospecto.score,
                    coordinacion_codigo: coordinacionInfo?.codigo,
                    coordinacion_nombre: coordinacionInfo?.nombre,
                    ejecutivo_nombre: ejecutivoInfo?.full_name || ejecutivoInfo?.nombre_completo || ejecutivoInfo?.nombre,
                    asesor_asignado: prospecto.asesor_asignado,
                    ejecutivo_email: ejecutivoInfo?.email,
                    requiere_atencion_humana: prospecto.requiere_atencion_humana,
                    motivo_handoff: prospecto.motivo_handoff
                  }} 
                />

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
                  prospectoId={prospecto.id}
                  prospectoNombre={prospecto.nombre_completo || prospecto.nombre_whatsapp}
                  delay={0.45}
                  etapaId={prospecto.etapa_id}
                  etapaLegacy={prospecto.etapa}
                  userRole={user?.role_name}
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
                        {prospecto.observaciones?.replace(/\\n/g, '\n') || ''}
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


// Interfaces adaptadas para Análisis IA
interface AnalysisRecord {
  analysis_id: string;
  call_id: string;
  created_at: string;
  score_general: number;
  categoria_desempeno: string;
  checkpoint_alcanzado: number;
  nivel_interes_detectado: string;
  resultado_llamada: string;
  feedback_positivo: string[];
  feedback_constructivo: any[];
  total_puntos_positivos: number;
  total_areas_mejora: number;
  calificaciones: Record<string, string>;
  
  // Datos enriquecidos de llamadas_ventas
  fecha_llamada?: string;
  duracion_segundos?: number;
  es_venta_exitosa?: boolean;
  call_status?: string;
  tipo_llamada?: string;
  precio_ofertado?: string;
  conversacion_completa?: any;
  resumen_llamada?: string;
  audio_ruta_bucket?: string;
  prospecto?: string;
  nivel_interes?: string;
  datos_llamada?: any;
  datos_proceso?: any;
  principales_objeciones?: any;
  
  // Datos del prospecto
  prospecto_nombre?: string;
  prospecto_whatsapp?: string;
  prospecto_ciudad?: string;
  
  // Datos de asignación (para AssignmentBadge)
  coordinacion_id?: string;
  coordinacion_codigo?: string;
  coordinacion_nombre?: string;
  ejecutivo_id?: string;
  ejecutivo_nombre?: string;
  
  // Propiedades para agrupamiento
  isGroupMain?: boolean;
  isGroupSub?: boolean;
  groupSize?: number;
}

interface CallSegment {
  id: string;
  call_id: string;
  segment_index: number;
  speaker: string;
  content: string;
  timestamp: string;
  confidence: number;
}

// Reproductor de audio inline con diseño profesional (sin firmar URL)
interface AudioPlayerInlineProps {
  audioUrl: string;
  customerName: string;
}

const AudioPlayerInline: React.FC<AudioPlayerInlineProps> = ({ audioUrl, customerName }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handleLoadedMetadata = () => setDuration(audio.duration);

    const handleError = () => {
      setAudioError(true);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error al reproducir el audio:', error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
  };

  const formatTime = (time: number): string => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Header minimalista */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M9 9a3 3 0 000 6h3v5a1 1 0 102 0v-5h3a3 3 0 000-6H9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Audio de la Llamada
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {customerName}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {duration > 0 ? formatTime(duration) : '--:--'}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="p-4">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />

        {audioError ? (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-red-700 dark:text-red-300">No se pudo cargar el audio. Verifique su conexion a internet.</span>
            <button
              onClick={() => {
                setAudioError(false);
                if (audioRef.current) {
                  audioRef.current.load();
                }
              }}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline flex-shrink-0"
            >
              Reintentar
            </button>
          </div>
        ) : (
        /* Controles principales minimalistas */
        <div className="space-y-3">
          {/* Barra de progreso principal */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer audio-progress"
              style={{
                background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${(currentTime / (duration || 1)) * 100}%, rgb(226 232 240) ${(currentTime / (duration || 1)) * 100}%, rgb(226 232 240) 100%)`
              }}
            />
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controles centrales */}
          <div className="flex items-center justify-between">
            {/* Botón play/pause minimalista */}
            <button
              onClick={togglePlayPause}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {isPlaying ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                </svg>
              ) : (
                <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Información del archivo */}
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Grabación de Audio
              </div>
            </div>

            {/* Control de volumen minimalista */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {volume > 0.5 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M9 9a3 3 0 000 6h3v5a1 1 0 102 0v-5h3a3 3 0 000-6H9z" />
                ) : volume > 0 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M9 9a3 3 0 000 6h3v5a1 1 0 102 0v-5h3a3 3 0 000-6H9z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                )}
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer audio-volume"
              />
            </div>
          </div>
        </div>
        )}
      </div>
    </motion.div>
  );
};

const AnalysisIAComplete: React.FC = () => {
  const { user } = useAuth();
  
  // ============================================
  // MODO NINJA: Usar usuario efectivo para filtros de historial
  // ============================================
  const { isNinjaMode, effectiveUser } = useNinjaAwarePermissions();
  const queryUserId = isNinjaMode && effectiveUser ? effectiveUser.id : user?.id;
  
  // Estados principales (replicando PQNC Humans)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calls, setCalls] = useState<AnalysisRecord[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<AnalysisRecord[]>([]);
  const [selectedCall, setSelectedCall] = useState<AnalysisRecord | null>(null);
  const [transcript, setTranscript] = useState<CallSegment[]>([]);
  
  // Estados de paginación y sincronización (como PQNC)
  const [totalRecords, setTotalRecords] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(120);
  
  // Estados de filtros (replicando PQNC)
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Estados de filtros específicos
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [qualityFilter, setQualityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [interestFilter, setInterestFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  
  // Estados de sorting (como PQNC)
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Estados de vista detallada
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [selectedCallForDetail, setSelectedCallForDetail] = useState<AnalysisRecord | null>(null);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  
  // Estados para agrupamiento colapsado
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [groupedCalls, setGroupedCalls] = useState<Record<string, AnalysisRecord[]>>({});
  
  // Estados del sidebar del prospecto
  const [showProspectoSidebar, setShowProspectoSidebar] = useState(false);
  const [selectedProspecto, setSelectedProspecto] = useState<any>(null);
  
  // Ref para gráfica radar
  const radarChartRef = useRef<Chart | null>(null);
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Estados para reproductor de audio
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioErrorId, setAudioErrorId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Función helper para detener audio (memoizada para evitar recreaciones)
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingAudioId(null);
  }, []);
  
  // Limpiar audio cuando el componente se desmonte
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);
  
  // Detener audio cuando se abre la vista detallada
  useEffect(() => {
    if (showDetailedView) {
      stopAudio();
    }
  }, [showDetailedView, stopAudio]);
  
  // Métricas globales (estilo PQNC)
  const [globalMetrics, setGlobalMetrics] = useState({
    totalCalls: 0,
    avgQuality: 0,
    avgScore: 0,
    successRate: 0,
    avgDuration: 0,
    avgCheckpoint: 0
  });

  // Valores únicos para filtros
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [uniqueInterests, setUniqueInterests] = useState<string[]>([]);
  const [uniqueResults, setUniqueResults] = useState<string[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    loadCalls();
    loadGlobalMetrics();
    
    // Capturar call_id desde localStorage (navegación desde Prospectos)
    const savedCallId = localStorage.getItem('natalia-search-call-id');
    if (savedCallId) {
      setSearchQuery(savedCallId);
      localStorage.removeItem('natalia-search-call-id');
      setTimeout(() => searchByCallId(savedCallId), 500);
    }
    
    // Auto-sync como PQNC
    if (autoSyncEnabled) {
      const interval = setInterval(loadCalls, syncInterval * 1000);
      return () => {
        clearInterval(interval);
        // Detener audio al desmontar componente (cambio de módulo)
        stopAudio();
      };
    }
    
    // Cleanup: detener audio al desmontar componente
    return () => {
      stopAudio();
    };
  }, [autoSyncEnabled, syncInterval]);
  
  // Detener audio cuando se detecta navegación a otro módulo
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Detener audio si la página pierde visibilidad (usuario cambió de pestaña o módulo)
      if (document.hidden) {
        stopAudio();
      }
    };
    
    const handleBeforeUnload = () => {
      // Detener audio antes de cerrar/navegar
      stopAudio();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopAudio();
    };
  }, [stopAudio]);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    applyFilters();
  }, [calls, searchQuery, dateFrom, dateTo, qualityFilter, categoryFilter, interestFilter, resultFilter, collapsedGroups]);

  // Inicializar grupos colapsados cuando cambien las llamadas
  useEffect(() => {
    if (calls.length > 0) {
      const groups = groupCallsByProspect(calls);
      const groupsWithMultipleCalls = Object.keys(groups).filter(key => groups[key].length > 1);
      
      // Colapsar automáticamente grupos con múltiples llamadas
      setCollapsedGroups(new Set(groupsWithMultipleCalls));
    }
  }, [calls]);

  const loadCalls = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ============================================
      // FIX 2026-01-24: Paginación para superar límite de 1000 registros de Supabase
      // ============================================
      const PAGE_SIZE = 1000;
      
      // Función helper para cargar datos con paginación
      const loadAllWithPagination = async (table: string, selectQuery: string, orderBy?: string): Promise<any[]> => {
        const results: any[] = [];
        let from = 0;
        let hasMore = true;
        
        while (hasMore) {
          let query = analysisSupabase
            .from(table)
            .select(selectQuery)
            .range(from, from + PAGE_SIZE - 1);
          
          if (orderBy) {
            query = query.order(orderBy, { ascending: false });
          }
          
          const { data, error } = await query;
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            results.push(...data);
            from += PAGE_SIZE;
            hasMore = data.length === PAGE_SIZE;
          } else {
            hasMore = false;
          }
        }
        
        return results;
      };
      
      // Cargar análisis básicos CON PAGINACIÓN
      const analysisData = await loadAllWithPagination('call_analysis_summary', '*', 'created_at');

      // Cargar datos complementarios de llamadas_ventas
      const callIds = analysisData?.map(a => a.call_id) || [];
      let enrichedData = analysisData || [];
      
      if (callIds.length > 0) {
        // ✅ OPTIMIZACIÓN: Cargar en batches PARALELOS para mejor rendimiento
        const BATCH_SIZE = 200;
        
        const loadInParallelBatches = async (
          table: string,
          selectQuery: string,
          filterColumn: string,
          ids: string[]
        ): Promise<any[]> => {
          const uniqueIds = [...new Set(ids)];
          const batches: string[][] = [];
          for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
            batches.push(uniqueIds.slice(i, i + BATCH_SIZE));
          }
          
          const batchResults = await Promise.all(
            batches.map(batch =>
              analysisSupabase
                .from(table)
                .select(selectQuery)
                .in(filterColumn, batch)
                .then(({ data }) => data || [])
            )
          );
          
          return batchResults.flat();
        };
        
        // Cargar llamadas en paralelo
        const llamadasData = await loadInParallelBatches('llamadas_ventas', '*', 'call_id', callIds);
        
        // ✅ OPTIMIZACIÓN: Crear Map para búsqueda O(1)
        const llamadasMap = new Map(llamadasData.map(l => [l.call_id, l]));

        if (llamadasData.length > 0) {
          // Obtener IDs de prospectos únicos
          const prospectoIds = [...new Set(llamadasData.map(l => l.prospecto).filter(Boolean))];
          
          // Cargar prospectos en paralelo
          let prospectosData = await loadInParallelBatches(
            'prospectos',
            'id, nombre_completo, nombre, apellido_paterno, apellido_materno, whatsapp, ciudad_residencia, coordinacion_id, ejecutivo_id, asesor_asignado',
            'id',
            prospectoIds
          );
          
          // Aplicar filtros de permisos en memoria
          // ⚠️ MODO NINJA: Usar queryUserId para filtrar como el usuario suplantado
          if (queryUserId) {
            const ejecutivoFilter = await permissionsService.getEjecutivoFilter(queryUserId);
            const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(queryUserId);
            const isAdmin = await permissionsService.isAdmin(queryUserId);
            const isCalidad = await permissionsService.isCoordinadorCalidad(queryUserId);
            
            // Admin y Coordinadores de Calidad tienen acceso completo (sin filtros)
            if (!isAdmin && !isCalidad) {
              if (ejecutivoFilter) {
                // Ejecutivo: solo prospectos asignados a él
                prospectosData = prospectosData.filter(p => p.ejecutivo_id === ejecutivoFilter);
              } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
                // Coordinador normal: solo prospectos de sus coordinaciones
                prospectosData = prospectosData.filter(p => p.coordinacion_id && coordinacionesFilter.includes(p.coordinacion_id));
              }
            }
          }
          
          // Filtrar análisis para incluir solo los que tienen prospectos permitidos
          const allowedProspectoIds = new Set(prospectosData.map(p => p.id));
          
          // ✅ FIX 2026-01-24: Obtener ejecutivo_id tanto de llamadas_ventas como de prospectos
          // llamadas_ventas tiene ejecutivo_id y coordinacion_id que representan la asignación
          // EN EL MOMENTO de la llamada, que es más preciso para el historial
          const ejecutivoIdsFromLlamadas = llamadasData.map(l => l.ejecutivo_id).filter(Boolean);
          const ejecutivoIdsFromProspectos = prospectosData.map(p => p.ejecutivo_id).filter(Boolean);
          const allEjecutivoIds = [...new Set([...ejecutivoIdsFromLlamadas, ...ejecutivoIdsFromProspectos])];
          
          // Cargar TODAS las coordinaciones y ejecutivos en batch
          const [coordinaciones, ejecutivosMap] = await Promise.all([
            coordinacionService.getCoordinaciones(),
            coordinacionService.getEjecutivosByIds(allEjecutivoIds)
          ]);
          
          // ✅ OPTIMIZACIÓN: Crear Maps para búsqueda O(1) en lugar de .find() O(n)
          const coordinacionesMap = new Map(coordinaciones.map(c => [c.id, c]));
          const prospectosMap = new Map(prospectosData.map(p => [p.id, p]));
          
          enrichedData = (analysisData || []).map(analysis => {
            // ✅ OPTIMIZACIÓN: Usar Maps para O(1) lookup
            const llamada = llamadasMap.get(analysis.call_id);
            const prospecto = llamada?.prospecto ? prospectosMap.get(llamada.prospecto) : null;
            
            // Si el prospecto no está en la lista permitida, excluir este análisis
            if (llamada?.prospecto && !allowedProspectoIds.has(llamada.prospecto)) {
              return null;
            }
            
            // ✅ FIX 2026-01-24: Usar ejecutivo_id de llamadas_ventas como fuente primaria
            // porque representa la asignación EN EL MOMENTO de la llamada
            const efectivoEjecutivoId = llamada?.ejecutivo_id || prospecto?.ejecutivo_id;
            const efectivoCoordinacionId = llamada?.coordinacion_id || prospecto?.coordinacion_id;
            
            // Obtener info de coordinación y ejecutivo desde los maps
            const coordinacion = efectivoCoordinacionId ? coordinacionesMap.get(efectivoCoordinacionId) : null;
            const ejecutivo = efectivoEjecutivoId ? ejecutivosMap.get(efectivoEjecutivoId) : null;
            
            // Prioridad de nombre del ejecutivo:
            // 1) Datos del mapa de ejecutivos (user_profiles_v2)
            // 2) Campo legacy asesor_asignado del prospecto
            const ejecutivoNombre = ejecutivo?.full_name || ejecutivo?.nombre_completo || ejecutivo?.nombre ||
              (prospecto?.asesor_asignado && prospecto.asesor_asignado.trim() !== '' ? prospecto.asesor_asignado.trim() : null);
            
            return {
              ...analysis,
              ...llamada,
              prospecto_nombre: prospecto?.nombre_completo || 
                               `${prospecto?.nombre || ''} ${prospecto?.apellido_paterno || ''} ${prospecto?.apellido_materno || ''}`.trim() ||
                               'Prospecto sin nombre',
              prospecto_whatsapp: prospecto?.whatsapp,
              prospecto_ciudad: prospecto?.ciudad_residencia,
              // Usar IDs efectivos (de llamada o prospecto)
              coordinacion_id: efectivoCoordinacionId,
              coordinacion_codigo: coordinacion?.codigo,
              coordinacion_nombre: coordinacion?.nombre,
              ejecutivo_id: efectivoEjecutivoId,
              ejecutivo_nombre: ejecutivoNombre
            };
          }).filter((item): item is NonNullable<typeof item> => item !== null);
        }
      }

      setCalls(enrichedData);
      setLastSyncTime(new Date().toISOString());
      
      // Extraer valores únicos para filtros
      const categories = [...new Set(enrichedData.map(c => c.categoria_desempeno).filter(Boolean))];
      const interests = [...new Set(enrichedData.map(c => c.nivel_interes_detectado || c.nivel_interes).filter(Boolean))];
      const results = [...new Set(enrichedData.map(c => c.resultado_llamada).filter(Boolean))];
      
      setUniqueCategories(categories);
      setUniqueInterests(interests);
      setUniqueResults(results);
      
    } catch (err: any) {
      setError(`Error al cargar llamadas: ${err.message}`);
      console.error('Error loading calls:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalMetrics = async () => {
    try {
      const { count, error: countError } = await analysisSupabase
        .from('call_analysis_summary')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // Cargar métricas de análisis
      const { data: analysisData, error: analysisError } = await analysisSupabase
        .from('call_analysis_summary')
        .select('score_general, checkpoint_alcanzado, call_id')
        .not('score_general', 'is', null);

      // Cargar datos de duración desde llamadas_ventas
      const { data: duracionData, error: duracionError } = await analysisSupabase
        .from('llamadas_ventas')
        .select('duracion_segundos, es_venta_exitosa')
        .not('duracion_segundos', 'is', null);

      if (analysisError || duracionError) {
        console.error('Error loading metrics:', analysisError || duracionError);
        return;
      }

      // Calcular métricas
      const totalCalls = count || 0;
      const avgScore = analysisData?.reduce((acc, call) => acc + call.score_general, 0) / (analysisData?.length || 1) || 0;
      const avgCheckpoint = analysisData?.reduce((acc, call) => acc + call.checkpoint_alcanzado, 0) / (analysisData?.length || 1) || 0;
      
      // Duración promedio en segundos
      const avgDurationSeconds = duracionData?.reduce((acc, call) => acc + (call.duracion_segundos || 0), 0) / (duracionData?.length || 1) || 0;
      
      // Tasa de éxito
      const successRate = duracionData ? (duracionData.filter(c => c.es_venta_exitosa).length / duracionData.length) * 100 : 0;

      setGlobalMetrics({
        totalCalls,
        avgQuality: avgScore, // Ya está en escala 100
        avgScore,
        successRate,
        avgDuration: avgDurationSeconds,
        avgCheckpoint // Mantener escala original (máximo 5)
      });

    } catch (err) {
      console.error('Error loading global metrics:', err);
    }
  };

  // Función para agrupar llamadas por prospecto
  const groupCallsByProspect = (callsToGroup: AnalysisRecord[]) => {
    const groups: Record<string, AnalysisRecord[]> = {};
    
    callsToGroup.forEach(call => {
      const prospectKey = call.prospecto_nombre || call.prospecto_id || 'Sin prospecto';
      
      if (!groups[prospectKey]) {
        groups[prospectKey] = [];
      }
      groups[prospectKey].push(call);
    });
    
    // Ordenar llamadas dentro de cada grupo (más reciente primero)
    Object.keys(groups).forEach(prospectKey => {
      groups[prospectKey].sort((a, b) => {
        const dateA = new Date(a.created_at || a.fecha_llamada);
        const dateB = new Date(b.created_at || b.fecha_llamada);
        return dateB.getTime() - dateA.getTime(); // Más reciente primero
      });
    });
    
    setGroupedCalls(groups);
    return groups;
  };

  // Función para obtener llamadas expandidas para mostrar en el grid
  const getExpandedCalls = (groups: Record<string, AnalysisRecord[]>) => {
    const expandedCalls: AnalysisRecord[] = [];
    
    Object.entries(groups).forEach(([prospectKey, callsInGroup]) => {
      if (callsInGroup.length === 0) return;
      
      // Siempre mostrar la llamada más reciente (primera en el array ordenado)
      const mainCall = { ...callsInGroup[0], isGroupMain: true, groupSize: callsInGroup.length };
      expandedCalls.push(mainCall);
      
      // Si el grupo NO está colapsado, mostrar el resto de llamadas
      if (!collapsedGroups.has(prospectKey)) {
        callsInGroup.slice(1).forEach(call => {
          const subCall = { ...call, isGroupSub: true, groupSize: callsInGroup.length };
          expandedCalls.push(subCall);
        });
      }
    });
    
    return expandedCalls;
  };

  const applyFilters = () => {
    let filtered = [...calls];

    // Búsqueda por texto
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(call =>
        call.call_id.toLowerCase().includes(query) ||
        call.categoria_desempeno?.toLowerCase().includes(query) ||
        call.nivel_interes_detectado?.toLowerCase().includes(query) ||
        call.resultado_llamada?.toLowerCase().includes(query) ||
        call.prospecto_nombre?.toLowerCase().includes(query)
      );
    }

    // Filtros de fecha
    if (dateFrom) {
      filtered = filtered.filter(call => 
        new Date(call.fecha_llamada || call.created_at) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      filtered = filtered.filter(call => 
        new Date(call.fecha_llamada || call.created_at) <= new Date(dateTo)
      );
    }

    // Filtros específicos
    if (qualityFilter) {
      const [min, max] = qualityFilter.split('-').map(Number);
      filtered = filtered.filter(call => {
        const score = call.score_general * 10; // Convertir a escala 100
        return score >= min && score <= max;
      });
    }

    if (categoryFilter) {
      filtered = filtered.filter(call => call.categoria_desempeno === categoryFilter);
    }

    if (interestFilter) {
      filtered = filtered.filter(call => 
        call.nivel_interes_detectado === interestFilter || call.nivel_interes === interestFilter
      );
    }

    if (resultFilter) {
      filtered = filtered.filter(call => call.resultado_llamada === resultFilter);
    }

    // Aplicar ordenamiento ANTES de agrupar
    filtered.sort((a, b) => {
      const aValue = a[sortField as keyof AnalysisRecord];
      const bValue = b[sortField as keyof AnalysisRecord];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? 
          aValue.localeCompare(bValue) : 
          bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    // Agrupar por prospecto y obtener lista expandida
    const groups = groupCallsByProspect(filtered);
    const expandedCalls = getExpandedCalls(groups);
    
    setFilteredCalls(expandedCalls);
  };

  const searchByCallId = async (callId: string) => {
    if (!callId) return;
    
    setLoading(true);
    try {
      const { data, error } = await analysisSupabase
        .from('call_analysis_summary')
        .select('*')
        .eq('call_id', callId);

      if (error) throw error;

      if (data && data.length > 0) {
        // Enriquecer con datos de llamadas_ventas
        const { data: llamadaData } = await analysisSupabase
          .from('llamadas_ventas')
          .select('*')
          .eq('call_id', callId)
          .single();

        const enrichedRecord = {
          ...data[0],
          ...llamadaData
        };

        setCalls([enrichedRecord]);
        setFilteredCalls([enrichedRecord]);
        
        // Abrir vista detallada automáticamente
        setTimeout(() => {
          openDetailedView(enrichedRecord);
        }, 300);
      } else {
        setError('No se encontró ningún registro con ese Call ID');
      }
    } catch (err: any) {
      setError(`Error al buscar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openDetailedView = async (call: AnalysisRecord) => {
    // Detener audio si está reproduciendo
    stopAudio();
    // Adaptar datos para que sean compatibles con DetailedCallView
    const adaptedCall = {
      ...call,
      id: call.call_id,
      agent_name: 'Natalia IA',
      customer_name: call.prospecto_nombre || 'Cliente',
      call_type: call.tipo_llamada || 'Llamada IA',
      call_result: call.resultado_llamada || (call.es_venta_exitosa ? 'Venta Exitosa' : 'Seguimiento'),
      duration: call.duracion_segundos ? 
        `${Math.floor(call.duracion_segundos / 3600)}:${Math.floor((call.duracion_segundos % 3600) / 60).toString().padStart(2, '0')}:${(call.duracion_segundos % 60).toString().padStart(2, '0')}` : 
        '00:00:00',
      quality_score: call.score_general * 10, // Convertir a escala 100
      customer_quality: call.nivel_interes_detectado || call.nivel_interes || 'Medio',
      organization: 'Vida Vacations',
      direction: 'outbound',
      start_time: call.fecha_llamada || call.created_at,
      audio_file_url: call.audio_ruta_bucket,
      audio_file_name: call.audio_ruta_bucket ? `audio_${call.call_id}.wav` : undefined,
      // Datos adicionales para compatibilidad
      agent_performance: {
        score_ponderado: call.score_general * 10,
        rapport_score: call.checkpoint_alcanzado * 20,
        discovery_score: call.total_puntos_positivos * 10,
        objection_handling: (5 - call.total_areas_mejora) * 20
      },
      call_evaluation: {
        nivel_interes: call.nivel_interes_detectado || call.nivel_interes,
        categoria: call.categoria_desempeno,
        checkpoint: call.checkpoint_alcanzado
      }
    };
    
    setSelectedCallForDetail(adaptedCall as any);
    setShowDetailedView(true);
    await loadTranscript(call.call_id);
  };

  const loadTranscript = async (callId: string) => {
    try {
      // Cargar transcripción desde llamadas_ventas
      const { data, error } = await analysisSupabase
        .from('llamadas_ventas')
        .select('conversacion_completa')
        .eq('call_id', callId)
        .single();

      if (error) throw error;

      // Parsear conversación a segmentos
      const segments = parseConversationToSegments(data?.conversacion_completa, callId);
      setTranscript(segments);
    } catch (err) {
      console.error('Error loading transcript:', err);
      setTranscript([]);
    }
  };

  const parseConversationToSegments = (conversacionData: any, callId: string): CallSegment[] => {
    try {
      let conversationText = '';
      
      if (typeof conversacionData === 'string') {
        const parsed = JSON.parse(conversacionData);
        conversationText = parsed.conversacion || '';
      } else if (conversacionData?.conversacion) {
        conversationText = conversacionData.conversacion;
      }
      
      if (!conversationText) return [];
      
      const lines = conversationText.split('\n').filter(line => line.trim());
      const segments: CallSegment[] = [];
      
      lines.forEach((line, index) => {
        const match = line.match(/^\[(.+?)\]\s+(\w+):\s+(.+)$/);
        if (match) {
          const [, timestamp, speaker, content] = match;
          // Convertir timestamp de UTC a hora de México (UTC-6)
          const mexicoTimestamp = convertUTCToMexicoTime(timestamp.trim());
          segments.push({
            id: `${callId}-${index}`,
            call_id: callId,
            segment_index: index,
            speaker: speaker.toLowerCase(),
            content: content.trim(),
            timestamp: mexicoTimestamp,
            confidence: 1.0
          });
        }
      });
      
      return segments;
    } catch (error) {
      console.error('Error parsing conversation:', error);
      return [];
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Función para toggle de grupos colapsados
  const toggleGroup = (prospectKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(prospectKey)) {
        newSet.delete(prospectKey);
      } else {
        newSet.add(prospectKey);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setQualityFilter('');
    setCategoryFilter('');
    setInterestFilter('');
    setResultFilter('');
  };

  const createRadarChart = (callId: string, calificaciones: Record<string, string>) => {
    const canvas = document.getElementById(`radar-chart-${callId}`) as HTMLCanvasElement;
    if (!canvas) return;

    // Destruir gráfica anterior si existe
    if (radarChartRef.current) {
      radarChartRef.current.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Convertir calificaciones a scores numéricos según los nuevos enums
    const labelMap: Record<string, string> = {
      'continuidad_whatsapp': 'Continuidad WhatsApp',
      'tratamiento_formal': 'Tratamiento Formal',
      'control_narrativo': 'Control Narrativo',
      'discovery_familiar': 'Discovery Familiar',
      'deteccion_interes': 'Detección Interés',
      'manejo_objeciones': 'Manejo Objeciones',
      'cumplimiento_reglas': 'Cumplimiento Reglas'
    };
    
    // Filtrar y mapear labels (excluir calidad_cierre del enfoque anterior)
    const filteredEntries = Object.entries(calificaciones).filter(([key]) => key !== 'calidad_cierre');
    
    const labels = filteredEntries.map(([key]) => 
      labelMap[key] || key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    );
    
    const data = filteredEntries.map(([, value]) => {
      // Mapeo específico para los nuevos enums
      switch (value) {
        // Continuidad WhatsApp
        case 'PERFECTO': return 100;
        case 'BUENO': case 'BUENA': return 80;
        case 'DEFICIENTE': return 25;
        case 'NO_APLICABLE': return 50;
        
        // Tratamiento Formal
        case 'REGULAR': return 60;
        
        // Control Narrativo
        case 'CONTROLADO': return 90;
        case 'PARCIAL': return 60;
        case 'DESCONTROLADO': return 20;
        
        // Discovery Familiar
        case 'COMPLETO': return 100;
        case 'INCOMPLETO': return 40;
        case 'NO_REALIZADO': return 10;
        
        // Detección Interés
        case 'PRECISA': return 95;
        case 'TARDÍA': return 70;
        case 'TEMPRANA': return 80;
        case 'IMPRECISA': return 30;
        
        // Manejo Objeciones
        case 'EXCELENTE': return 100;
        case 'BÁSICO': return 50;
        case 'NO_HUBO': return 75; // No es malo si no hubo objeciones
        
        // Cumplimiento Reglas
        case 'MALO': return 20;
        
        // Fallbacks
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
          backgroundColor: 'rgba(16, 185, 129, 0.15)', // Verde esmeralda transparente
          borderColor: 'rgba(16, 185, 129, 0.8)', // Verde esmeralda
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
                weight: '500'
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
  };

  // Efecto para crear gráfica cuando se abre el modal
  useEffect(() => {
    if (showDetailedView && selectedCallForDetail?.calificaciones) {
      const timer = setTimeout(() => {
        createRadarChart(selectedCallForDetail.call_id, selectedCallForDetail.calificaciones);
      }, 300);
      
      return () => clearTimeout(timer);
    }
    
    // Limpiar gráfica cuando se cierra el modal
    if (!showDetailedView && radarChartRef.current) {
      radarChartRef.current.destroy();
      radarChartRef.current = null;
    }
  }, [showDetailedView, selectedCallForDetail]);

  const handleProspectoClick = async (prospectoId: string) => {
    if (!prospectoId) return;
    
    try {
      
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .eq('id', prospectoId)
        .single();

      if (error) {
        console.error('❌ Error loading prospecto:', error);
        return;
      }

      // Enriquecer con datos de coordinación y ejecutivo
      let coordinacionInfo: { codigo?: string; nombre?: string } | null = null;
      let ejecutivoInfo: { full_name?: string; nombre_completo?: string; nombre?: string; email?: string } | null = null;

      if (data.coordinacion_id) {
        try {
          coordinacionInfo = await coordinacionService.getCoordinacionById(data.coordinacion_id);
        } catch (err) {
          console.warn('Error obteniendo coordinación:', err);
        }
      }

      // Obtener ejecutivo
      let ejecutivoNombre: string | undefined = undefined;
      if (data.asesor_asignado && typeof data.asesor_asignado === 'string' && data.asesor_asignado.trim() !== '') {
        ejecutivoNombre = data.asesor_asignado.trim();
      } else if (data.ejecutivo_id) {
        try {
          ejecutivoInfo = await coordinacionService.getEjecutivoById(data.ejecutivo_id);
          if (ejecutivoInfo) {
            ejecutivoNombre = ejecutivoInfo.full_name || ejecutivoInfo.nombre_completo || ejecutivoInfo.nombre;
          }
        } catch (err) {
          console.warn('Error obteniendo ejecutivo:', err);
        }
      }

      // Establecer prospecto enriquecido
      setSelectedProspecto({
        ...data,
        coordinacion_codigo: coordinacionInfo?.codigo,
        coordinacion_nombre: coordinacionInfo?.nombre,
        ejecutivo_nombre: ejecutivoNombre,
        ejecutivo_email: ejecutivoInfo?.email
      });
      setShowProspectoSidebar(true);
    } catch (error) {
      console.error('❌ Error loading prospecto:', error);
    }
  };

  // Calcular índices de paginación
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCalls = filteredCalls.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredCalls.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-full mx-auto pl-6 pr-6 py-8">
        
        {/* Header estilo PQNC Humans */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Análisis IA - Continuidad y Discovery
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Evaluación de continuidad WhatsApp, discovery familiar y transferencias • {filteredCalls.length} de {totalRecords} registros
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Auto-sync indicator */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className={`w-2 h-2 rounded-full ${autoSyncEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span>Auto-sync {autoSyncEnabled ? 'activo' : 'inactivo'}</span>
              </div>
              
              {lastSyncTime && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Última actualización: {new Date(lastSyncTime).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Métricas Globales estilo PQNC */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Llamadas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {globalMetrics.totalCalls.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Score Promedio</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {globalMetrics.avgScore.toFixed(1)}/100
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Checkpoint Promedio</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {globalMetrics.avgCheckpoint.toFixed(1)}/5
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Duración Promedio</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.floor((globalMetrics.avgDuration || 0) / 60)}:{((globalMetrics.avgDuration || 0) % 60).toFixed(0).padStart(2, '0')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Continuidad WhatsApp</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {((filteredCalls.filter(c => c.calificaciones?.continuidad_whatsapp === 'PERFECTO').length / filteredCalls.length) * 100 || 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-violet-100 dark:bg-violet-900/30">
                <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Discovery Completo</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {((filteredCalls.filter(c => c.calificaciones?.discovery_familiar === 'COMPLETO').length / filteredCalls.length) * 100 || 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Búsqueda y Filtros estilo PQNC */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Búsqueda y Filtros
              </h2>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
              >
                {showAdvancedFilters ? 'Ocultar' : 'Mostrar'} filtros avanzados
              </button>
            </div>

            {/* Búsqueda principal */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="md:col-span-2">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar por Call ID, categoría, interés..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-200"
                  />
                </div>
              </div>
              
              <button
                onClick={() => searchByCallId(searchQuery)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Buscar
              </button>
              
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Limpiar
              </button>
            </div>

            {/* Filtros Avanzados */}
            <AnimatePresence>
              {showAdvancedFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fecha Desde
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fecha Hasta
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Categoría
                      </label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todas las categorías</option>
                        {uniqueCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nivel Interés
                      </label>
                      <select
                        value={interestFilter}
                        onChange={(e) => setInterestFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos los niveles</option>
                        {uniqueInterests.map(interest => (
                          <option key={interest} value={interest}>{interest}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Tabla Principal estilo PQNC Humans */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando análisis...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 dark:text-red-400 mb-2">{error}</div>
              <button
                onClick={loadCalls}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Prospecto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Asignaciones
                      </th>
                      <th 
                        onClick={() => handleSort('created_at')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Duración
                      </th>
                      <th 
                        onClick={() => handleSort('score_general')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        Score IA
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Checkpoint
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Nivel Interés
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedCalls.map((call, index) => {
                      const prospectKey = call.prospecto_nombre || call.prospecto_id || 'Sin prospecto';
                      const isGroupMain = call.isGroupMain;
                      const isGroupSub = call.isGroupSub;
                      const groupSize = call.groupSize || 1;
                      const isCollapsed = collapsedGroups.has(prospectKey);
                      
                      return (
                        <motion.tr
                          key={call.analysis_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02, ease: "easeOut" }}
                          onClick={() => openDetailedView(call)}
                          className={`cursor-pointer transition-colors ${
                            isGroupMain 
                              ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-blue-500' 
                              : isGroupSub 
                                ? 'hover:bg-gray-50 dark:hover:bg-gray-800/30 bg-gray-50 dark:bg-gray-800/20 border-l-4 border-gray-300' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {/* Botón de expansión/colapso para grupos */}
                              {isGroupMain && groupSize > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGroup(prospectKey);
                                  }}
                                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                                  title={isCollapsed ? `Expandir ${groupSize - 1} llamadas más` : `Colapsar grupo`}
                                >
                                  <svg 
                                    className={`w-4 h-4 text-blue-600 dark:text-blue-400 transition-transform ${
                                      isCollapsed ? 'rotate-0' : 'rotate-90'
                                    }`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              )}
                              
                              {/* Indicador visual para sub-llamadas */}
                              {isGroupSub && (
                                <div className="w-4 h-4 flex items-center justify-center">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                </div>
                              )}
                              
                              <div className={`p-2 rounded-full ${
                                isGroupMain 
                                  ? 'bg-blue-50 dark:bg-blue-900/20' 
                                  : 'bg-gray-50 dark:bg-gray-800/50'
                              }`}>
                                <User size={16} className={
                                  isGroupMain 
                                    ? 'text-blue-600 dark:text-blue-400' 
                                    : 'text-gray-500 dark:text-gray-400'
                                } />
                              </div>
                              <div>
                                <div className={`text-sm font-medium ${
                                  isGroupMain 
                                    ? 'text-gray-900 dark:text-white' 
                                    : 'text-gray-600 dark:text-gray-300'
                                }`}>
                                  {call.prospecto_nombre || 'Prospecto sin nombre'}
                                  {isGroupMain && groupSize > 1 && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                      {groupSize} llamadas
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                  {call.call_id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <AssignmentBadge call={call as any} variant="compact" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <div>
                            {new Date(call.fecha_llamada || call.created_at).toLocaleDateString('es-MX')}
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(call.fecha_llamada || call.created_at).toLocaleTimeString('es-MX', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {call.duracion_segundos ? 
                            `${Math.floor(call.duracion_segundos / 60)}:${(call.duracion_segundos % 60).toString().padStart(2, '0')}` : 
                            'N/A'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            <div className={`w-12 h-2 rounded-full mr-3 ${
                              call.score_general >= 80 ? 'bg-green-200 dark:bg-green-800' :
                              call.score_general >= 60 ? 'bg-yellow-200 dark:bg-yellow-800' :
                              call.score_general >= 40 ? 'bg-orange-200 dark:bg-orange-800' : 'bg-red-200 dark:bg-red-800'
                            }`}>
                              <div className={`h-2 rounded-full ${
                                call.score_general >= 80 ? 'bg-green-500' :
                                call.score_general >= 60 ? 'bg-yellow-500' :
                                call.score_general >= 40 ? 'bg-orange-500' : 'bg-red-500'
                              }`} style={{ width: `${call.score_general}%` }}></div>
                            </div>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {call.score_general.toFixed(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              call.checkpoint_alcanzado >= 4 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                              call.checkpoint_alcanzado >= 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {call.checkpoint_alcanzado}/5
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            call.nivel_interes_detectado === 'Alto' || call.nivel_interes === 'Alto' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            call.nivel_interes_detectado === 'Medio' || call.nivel_interes === 'Medio' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {call.nivel_interes_detectado || call.nivel_interes || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {/* Botón de play/stop para audio si existe */}
                            {call.audio_ruta_bucket && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const isCurrentlyPlaying = playingAudioId === call.analysis_id;
                                  
                                  if (isCurrentlyPlaying) {
                                    // Detener reproducción actual
                                    if (audioRef.current) {
                                      audioRef.current.pause();
                                      audioRef.current.currentTime = 0;
                                      audioRef.current = null;
                                    }
                                    setPlayingAudioId(null);
                                  } else {
                                    // Detener cualquier audio anterior
                                    if (audioRef.current && playingAudioId) {
                                      audioRef.current.pause();
                                      audioRef.current.currentTime = 0;
                                      audioRef.current = null;
                                    }
                                    
                                    // Iniciar nuevo audio
                                    const audio = new Audio(call.audio_ruta_bucket);
                                    audioRef.current = audio;
                                    setPlayingAudioId(call.analysis_id);
                                    
                                    // Limpiar cuando termine
                                    audio.addEventListener('ended', () => {
                                      setPlayingAudioId(null);
                                      audioRef.current = null;
                                    });
                                    
                                    audio.addEventListener('error', () => {
                                      setPlayingAudioId(null);
                                      setAudioErrorId(call.analysis_id);
                                      audioRef.current = null;
                                    });

                                    // Reproducir
                                    audio.play().catch(() => {
                                      setPlayingAudioId(null);
                                      setAudioErrorId(call.analysis_id);
                                      audioRef.current = null;
                                    });
                                  }
                                }}
                                className={`p-2 rounded-lg transition-colors ${
                                  playingAudioId === call.analysis_id
                                    ? 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                                    : 'text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                                }`}
                                title={playingAudioId === call.analysis_id ? 'Detener audio' : 'Reproducir audio'}
                              >
                                {playingAudioId === call.analysis_id ? (
                                  <Square className="w-4 h-4" fill="currentColor" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            {audioErrorId === call.analysis_id && (
                              <span className="text-xs text-red-500" title="No se pudo cargar el audio. Verifique su conexion a internet.">
                                Error audio
                              </span>
                            )}
                            {/* Botón de lupa para ver detalles */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetailedView(call);
                              }}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="Ver detalles"
                            >
                              <Search className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación estilo PQNC */}
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Mostrando {startIndex + 1}-{Math.min(endIndex, filteredCalls.length)} de {filteredCalls.length} llamadas
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Por página:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-2 py-1"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Vista Detallada Personalizada para Análisis IA */}
      <AnimatePresence>
        {showDetailedView && selectedCallForDetail && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => {
                setShowDetailedView(false);
                setSelectedCallForDetail(null);
                setTranscript([]);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-0 flex items-center justify-center z-50 p-4 lg:p-6 pointer-events-none"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl lg:max-w-[85rem] xl:max-w-[90rem] h-[92vh] max-h-[92vh] flex flex-col border border-gray-100 dark:border-gray-800 overflow-hidden pointer-events-auto"
              >
                <div className="flex flex-col h-full overflow-hidden">
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
                            onClick={() => selectedCallForDetail.prospecto && handleProspectoClick(selectedCallForDetail.prospecto)}
                            className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-0.5 shadow-lg group cursor-pointer"
                            title="Ver información del prospecto"
                          >
                            <div className="w-full h-full rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                              <span className="text-white font-bold text-xl">
                                {(selectedCallForDetail.prospecto_nombre || 'P').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </button>
                          {/* Lupa con animación heartbeat */}
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-gray-900 rounded-full shadow-lg border-2 border-blue-500"
                          >
                            <Eye size={12} className="text-blue-600 dark:text-blue-400" />
                          </motion.div>
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <motion.h2
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="text-2xl font-bold text-gray-900 dark:text-white mb-1 flex items-center"
                          >
                            <BarChart3 className="w-6 h-6 mr-3 text-emerald-500" />
                            {selectedCallForDetail.prospecto_nombre || 'Análisis de Llamada'}
                          </motion.h2>
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed"
                          >
                            {selectedCallForDetail.call_id} • {new Date(selectedCallForDetail.fecha_llamada || selectedCallForDetail.created_at).toLocaleDateString()}
                          </motion.p>
                        </div>
                      </div>
                      <motion.button
                        initial={{ opacity: 0, rotate: -90 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        transition={{ delay: 0.25 }}
                        onClick={() => {
                          setShowDetailedView(false);
                          setSelectedCallForDetail(null);
                          setTranscript([]);
                        }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group ml-4 flex-shrink-0"
                      >
                        <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                      </motion.button>
                    </div>
                  </div>
                  
                  {/* Content - Scroll invisible */}
                  <div className="flex-1 overflow-y-auto px-8 py-6 min-h-0 scrollbar-hide">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Panel Izquierdo - Métricas */}
                    <div className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Métricas de Análisis
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {selectedCallForDetail.score_general.toFixed(1)}/100
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Score General</div>
                          </div>
                          <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              {selectedCallForDetail.checkpoint_alcanzado}/5
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Checkpoint</div>
                          </div>
                          <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {selectedCallForDetail.total_puntos_positivos}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Puntos Positivos</div>
                          </div>
                          <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              {selectedCallForDetail.total_areas_mejora}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Áreas Mejora</div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Calificaciones Detalladas */}
                      {selectedCallForDetail.calificaciones && (
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
                          <div className="space-y-3">
                            {Object.entries(selectedCallForDetail.calificaciones)
                              .filter(([key]) => key !== 'calidad_cierre') // Filtrar métrica del enfoque anterior
                              .map(([key, value]) => {
                                // Mapear nombres a español y enfoque actual
                                const labelMap: Record<string, string> = {
                                  'continuidad_whatsapp': 'CONTINUIDAD WHATSAPP',
                                  'tratamiento_formal': 'TRATAMIENTO FORMAL',
                                  'control_narrativo': 'CONTROL NARRATIVO',
                                  'discovery_familiar': 'DISCOVERY FAMILIAR',
                                  'deteccion_interes': 'DETECCIÓN INTERÉS',
                                  'manejo_objeciones': 'MANEJO OBJECIONES',
                                  'cumplimiento_reglas': 'CUMPLIMIENTO REGLAS'
                                };
                                
                                const displayLabel = labelMap[key] || key.replace(/_/g, ' ').toUpperCase();
                                
                                return (
                                  <div key={key} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      {displayLabel}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      // VERDE: Excelente (90-100%)
                                      value === 'PERFECTO' || value === 'EXCELENTE' || value === 'COMPLETO' || value === 'PRECISA' ? 
                                        'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                      // AZUL: Muy Bueno (75-89%)
                                      value === 'BUENO' || value === 'BUENA' || value === 'CONTROLADO' || value === 'TEMPRANA' ? 
                                        'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                                      // AMARILLO: Regular (50-74%)
                                      value === 'REGULAR' || value === 'PARCIAL' || value === 'BÁSICO' || value === 'NO_HUBO' ? 
                                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                      // NARANJA: Necesita Mejora (25-49%)
                                      value === 'INCOMPLETO' || value === 'TARDÍA' || value === 'DEFICIENTE' ? 
                                        'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                                      // ROJO: Crítico (0-24%)
                                      value === 'NO_REALIZADO' || value === 'DESCONTROLADO' || value === 'IMPRECISA' || value === 'MALO' || value === 'FALLIDO' ? 
                                        'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                      // GRIS: No aplicable o neutro
                                      'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                    }`}>
                                      {value}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </motion.div>
                      )}

                      {/* Audio Player - Diseño profesional como en PQNC */}
                      {selectedCallForDetail.audio_ruta_bucket && (
                        <AudioPlayerInline
                          audioUrl={selectedCallForDetail.audio_ruta_bucket}
                          customerName={selectedCallForDetail.prospecto_nombre || 'Cliente'}
                        />
                      )}
                    </div>

                    {/* Panel Derecho - Conversación */}
                    <div className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Transcripción de Conversación
                          </h3>
                        </div>
                        <div className="max-h-96 overflow-y-auto scrollbar-hide space-y-3">
                          {transcript.length > 0 ? (
                            transcript.map((segment, index) => (
                              <div
                                key={index}
                                className={`p-3 rounded-lg ${
                                  segment.speaker === 'cliente' 
                                    ? 'bg-blue-100 dark:bg-blue-900/30 ml-8' 
                                    : 'bg-gray-100 dark:bg-gray-700 mr-8'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-medium ${
                                    segment.speaker === 'cliente' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {segment.speaker === 'cliente' ? 'Cliente' : 'Agente'}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {segment.timestamp}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
                                  {segment.content}
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
                      </motion.div>

                      {/* Resumen de la Llamada */}
                      {selectedCallForDetail.resumen_llamada && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center space-x-2 mb-4">
                            <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              Resumen de la Llamada
                            </h3>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {selectedCallForDetail.resumen_llamada}
                          </p>
                        </motion.div>
                      )}

                      {/* Feedback */}
                      {(selectedCallForDetail.feedback_positivo?.length > 0 || selectedCallForDetail.feedback_constructivo?.length > 0) && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center space-x-2 mb-4">
                            <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              Retroalimentación IA
                            </h3>
                          </div>
                          
                          {selectedCallForDetail.feedback_positivo?.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                                Aspectos Positivos
                              </h4>
                              <ul className="space-y-1">
                                {selectedCallForDetail.feedback_positivo.map((item, index) => (
                                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                    <CheckCircle size={16} className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selectedCallForDetail.feedback_constructivo?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-2">
                                Áreas de Mejora
                              </h4>
                              <ul className="space-y-1">
                                {selectedCallForDetail.feedback_constructivo.map((item, index) => (
                                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
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
                      {selectedCallForDetail.calificaciones && Object.keys(selectedCallForDetail.calificaciones).length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center space-x-2 mb-4">
                            <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              Análisis Visual de Continuidad y Discovery
                            </h3>
                          </div>
                          <div className="relative h-80 flex items-center justify-center">
                            <canvas 
                              id={`radar-chart-${selectedCallForDetail.call_id}`}
                              className="max-w-full max-h-full"
                            />
                          </div>
                          
                          {/* Leyenda de valores con código de colores universal */}
                          <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span><span className="font-medium text-green-700 dark:text-green-400">VERDE:</span> Excelente (90-100%)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <span><span className="font-medium text-blue-700 dark:text-blue-400">AZUL:</span> Muy Bueno (75-89%)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <span><span className="font-medium text-yellow-700 dark:text-yellow-400">AMARILLO:</span> Regular (50-74%)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                <span><span className="font-medium text-orange-700 dark:text-orange-400">NARANJA:</span> Necesita Mejora (25-49%)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <span><span className="font-medium text-red-700 dark:text-red-400">ROJO:</span> Crítico (0-24%)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                                <span><span className="font-medium text-gray-700 dark:text-gray-400">GRIS:</span> No Aplicable</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar del Prospecto */}
      <ProspectoSidebar
        prospecto={selectedProspecto}
        isOpen={showProspectoSidebar}
        onClose={() => setShowProspectoSidebar(false)}
      />
    </div>
  );
};

export default AnalysisIAComplete;
